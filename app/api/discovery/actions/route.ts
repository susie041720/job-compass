import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { discoveredJobs, discoveryStates, jobApplications, jobs } from "@/db/schema";
import { normalizeUrl } from "@/lib/job-import";
import { blockPublicDemoMutation } from "@/lib/public-demo";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const norm = (value = "") => value.trim().toLowerCase().replace(/\s+/g, "");

function sameJob(discovered: typeof discoveredJobs.$inferSelect, existing: typeof jobs.$inferSelect) {
  if (discovered.source && discovered.sourceJobId && norm(discovered.source) === norm(existing.source) && norm(discovered.sourceJobId) === norm(existing.sourceJobId)) return true;
  if (discovered.normalizedUrl && discovered.normalizedUrl === existing.normalizedUrl) return true;
  return norm(discovered.company) === norm(existing.company) && norm(discovered.position) === norm(existing.position) && norm(discovered.location) === norm(existing.location);
}

export async function POST(request: NextRequest) {
  const blocked = blockPublicDemoMutation();
  if (blocked) return blocked;
  try {
    const body = await request.json() as Record<string, unknown>, jobId = clean(body.jobId), action = clean(body.action);
    if (!jobId || !action) return NextResponse.json({ error: "缺少岗位或操作类型" }, { status: 400 });
    const db = getDb(), now = new Date().toISOString();
    const found = await db.select().from(discoveredJobs).where(eq(discoveredJobs.id, jobId)).limit(1);
    if (!found[0]) return NextResponse.json({ error: "没有找到该发现岗位" }, { status: 404 });
    const currentRows = await db.select().from(discoveryStates).where(eq(discoveryStates.jobId, jobId)).limit(1);
    const current = currentRows[0] || { jobId, isFavorite: false, isDismissed: false, dismissReason: "", viewCount: 0, outboundCount: 0,
      lastViewedAt: "", lastOutboundAt: "", appliedJobId: null, createdAt: now, updatedAt: now };
    let patch: Partial<typeof discoveryStates.$inferInsert> = { updatedAt: now };

    if (action === "view") patch = { ...patch, viewCount: current.viewCount + 1, lastViewedAt: now };
    else if (action === "outbound") patch = { ...patch, outboundCount: current.outboundCount + 1, lastOutboundAt: now };
    else if (action === "favorite") patch = { ...patch, isFavorite: Boolean(body.value) };
    else if (action === "dismiss") patch = { ...patch, isDismissed: true, dismissReason: clean(body.reason) || "其他原因" };
    else if (action === "restore") patch = { ...patch, isDismissed: false, dismissReason: "" };
    else if (action === "confirm_application") {
      const allJobs = await db.select().from(jobs);
      const matching = allJobs.find((item) => sameJob(found[0], item));
      const canonicalJobId = matching?.id || `discovery-job-${found[0].id}`;
      if (!matching) {
        await db.insert(jobs).values({ id: canonicalJobId, company: found[0].company, position: found[0].position, department: found[0].department,
          category: found[0].category, location: found[0].location, recruitmentType: found[0].recruitmentType || "实习",
          description: found[0].description, requirements: found[0].requirements, jobUrl: found[0].jobUrl,
          normalizedUrl: normalizeUrl(found[0].jobUrl), source: found[0].source, sourceJobId: found[0].sourceJobId,
          publishedDate: found[0].publishedDate, deadline: found[0].deadline, tags: "岗位发现", rawText: found[0].rawText,
          companyIntro: "", interviewExperience: "", writtenTestMaterials: "", commonQuestions: "", preparationNotes: "",
          isDraft: false, importBatchId: null, createdAt: now, updatedAt: now }).onConflictDoNothing();
      }
      const existingApplication = await db.select().from(jobApplications).where(eq(jobApplications.jobId, canonicalJobId)).limit(1);
      if (!existingApplication[0]) {
        await db.insert(jobApplications).values({ id: `discovery-app-${found[0].id}`, jobId: canonicalJobId,
          appliedDate: clean(body.appliedDate), channel: clean(body.channel), status: "已投递",
          resumeVersionId: clean(body.resumeVersionId) || null, legacyResumeLabel: "", notes: clean(body.notes),
          createdAt: now, updatedAt: now }).onConflictDoNothing();
      }
      patch = { ...patch, appliedJobId: canonicalJobId, isDismissed: false, dismissReason: "" };
    } else return NextResponse.json({ error: "不支持的岗位操作" }, { status: 400 });

    if (currentRows[0]) await db.update(discoveryStates).set(patch).where(eq(discoveryStates.jobId, jobId));
    else await db.insert(discoveryStates).values({ ...current, ...patch });
    const saved = await db.select().from(discoveryStates).where(eq(discoveryStates.jobId, jobId)).limit(1);
    return NextResponse.json({ ok: true, state: saved[0], applicationCreated: action === "confirm_application" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "操作失败，已有岗位和投递数据未改变" }, { status: 400 });
  }
}
