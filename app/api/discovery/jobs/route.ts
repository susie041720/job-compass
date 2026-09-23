import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { baseResumes, discoveredJobs, discoveryPreferences, discoveryStates, jobApplications, jobs } from "@/db/schema";
import { calculateDiscoveryMatch, defaultDiscoveryPreferences, DiscoveryJobInput, DiscoveryPreferences, discoveryFingerprint } from "@/lib/job-discovery";
import { normalizeUrl } from "@/lib/job-import";
import { blockPublicDemoMutation } from "@/lib/public-demo";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const list = (value: string) => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };

function preferenceFromRow(row?: typeof discoveryPreferences.$inferSelect): DiscoveryPreferences {
  if (!row) return defaultDiscoveryPreferences();
  return { ...row, baseResumeId: row.baseResumeId || "", preferredCities: list(row.preferredCities), priorityCities: list(row.priorityCities),
    recruitmentTypes: list(row.recruitmentTypes), targetDirections: list(row.targetDirections), companyPreferences: list(row.companyPreferences), extraKeywords: list(row.extraKeywords) };
}

function sameJob(a: DiscoveryJobInput, b: { company: string; position: string; location: string; normalizedUrl: string; source: string; sourceJobId: string }) {
  const norm = (value = "") => value.trim().toLowerCase().replace(/\s+/g, "");
  if (a.source && a.sourceJobId && norm(a.source) === norm(b.source) && norm(a.sourceJobId) === norm(b.sourceJobId)) return true;
  const url = normalizeUrl(a.jobUrl || "");
  if (url && url === b.normalizedUrl) return true;
  return Boolean(a.company && a.position && norm(a.company) === norm(b.company) && norm(a.position) === norm(b.position) && norm(a.location || "") === norm(b.location));
}

export async function GET() {
  try {
    const db = getDb();
    const [rows, preferenceRows, canonicalJobs, applications] = await Promise.all([
      db.select({ job: discoveredJobs, state: discoveryStates }).from(discoveredJobs)
        .leftJoin(discoveryStates, eq(discoveryStates.jobId, discoveredJobs.id)).orderBy(desc(discoveredJobs.publishedDate), desc(discoveredJobs.updatedAt)),
      db.select().from(discoveryPreferences).where(eq(discoveryPreferences.id, "default")).limit(1),
      db.select().from(jobs),
      db.select().from(jobApplications),
    ]);
    const preferences = preferenceFromRow(preferenceRows[0]);
    const resume = preferences.baseResumeId
      ? await db.select({ text: baseResumes.confirmedContent }).from(baseResumes).where(eq(baseResumes.id, preferences.baseResumeId)).limit(1)
      : await db.select({ text: baseResumes.confirmedContent }).from(baseResumes).orderBy(desc(baseResumes.updatedAt)).limit(1);
    const appliedIds = new Set(applications.map((item) => item.jobId));
    const historyText = canonicalJobs.filter((job) => appliedIds.has(job.id)).map((job) => `${job.position} ${job.category} ${job.description}`).join(" ");
    const output = rows.map(({ job, state }) => {
      const existing = canonicalJobs.find((item) => sameJob(job, item));
      const isApplied = Boolean((state?.appliedJobId && appliedIds.has(state.appliedJobId)) || (existing && appliedIds.has(existing.id)));
      return { ...job, isFavorite: state?.isFavorite || false, isDismissed: state?.isDismissed || false,
        dismissReason: state?.dismissReason || "", viewCount: state?.viewCount || 0, outboundCount: state?.outboundCount || 0,
        lastViewedAt: state?.lastViewedAt || "", lastOutboundAt: state?.lastOutboundAt || "", isApplied,
        canonicalJobId: existing?.id || state?.appliedJobId || "",
        match: calculateDiscoveryMatch(job, preferences, resume[0]?.text || "", historyText) };
    });
    return NextResponse.json({ jobs: output, preferences, resumeConfigured: Boolean(resume[0]?.text) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "无法读取发现岗位，请确认本地数据库已完成升级" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const blocked = blockPublicDemoMutation();
  if (blocked) return blocked;
  try {
    const body = await request.json() as { rows?: DiscoveryJobInput[] } & DiscoveryJobInput;
    const incoming = (Array.isArray(body.rows) ? body.rows : [body]).slice(0, 200);
    if (!incoming.length) return NextResponse.json({ error: "没有可导入的岗位" }, { status: 400 });
    const db = getDb(), existing = await db.select().from(discoveredJobs), now = new Date().toISOString();
    const fingerprints = new Set(existing.map((item) => discoveryFingerprint(item)));
    let imported = 0, skipped = 0, failed = 0;
    const failures: { index: number; error: string }[] = [];
    for (const [index, row] of incoming.entries()) {
      try {
        const company = clean(row.company), position = clean(row.position);
        if (!company || !position) throw new Error("公司和岗位名称不能为空");
        const fingerprint = discoveryFingerprint(row);
        if (fingerprint !== "identity:||" && fingerprints.has(fingerprint)) { skipped++; continue; }
        const jobUrl = clean(row.jobUrl), source = clean(row.source) || (() => { try { return new URL(jobUrl).hostname.replace(/^www\./, ""); } catch { return "手动导入"; } })();
        const record = { id: crypto.randomUUID(), company, position, department: clean(row.department), category: clean(row.category) || "其他",
          location: clean(row.location), recruitmentType: clean(row.recruitmentType), description: clean(row.description), requirements: clean(row.requirements),
          jobUrl, normalizedUrl: normalizeUrl(jobUrl), source, sourceKind: clean(row.sourceKind) || "manual", sourceJobId: clean(row.sourceJobId),
          publishedDate: clean(row.publishedDate), deadline: clean(row.deadline), graduationRequirement: clean(row.graduationRequirement), startDate: clean(row.startDate),
          rawText: clean(row.rawText), availabilityStatus: clean(row.availabilityStatus) || "active", firstSeenAt: now, lastSeenAt: now, fetchedAt: now,
          sourceUpdatedAt: clean(row.sourceUpdatedAt), createdAt: now, updatedAt: now };
        await db.insert(discoveredJobs).values(record);
        fingerprints.add(fingerprint); imported++;
      } catch (error) {
        failed++; failures.push({ index, error: error instanceof Error ? error.message : "保存失败" });
      }
    }
    return NextResponse.json({ imported, skipped, failed, failures }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "导入发现岗位失败，已有数据未改变" }, { status: 400 });
  }
}
