import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { discoveredJobs } from "@/db/schema";
import { fetchOfficialJob, parseOfficialJobUrl } from "@/lib/discovery-sources";
import { normalizeUrl } from "@/lib/job-import";

export async function POST() {
  try {
    const db = getDb();
    const candidates = (await db.select().from(discoveredJobs))
      .filter((job) => job.sourceKind === "official" && parseOfficialJobUrl(job.jobUrl))
      .slice(0, 100);
    let updated = 0, closed = 0, failed = 0;
    const failures: Array<{ id: string; error: string }> = [];
    for (const existing of candidates) {
      try {
        const now = new Date().toISOString(), result = await fetchOfficialJob(existing.jobUrl);
        if (result.status === "closed") {
          await db.update(discoveredJobs).set({ availabilityStatus: "possibly_closed", fetchedAt: now, updatedAt: now }).where(eq(discoveredJobs.id, existing.id));
          closed++;
          continue;
        }
        const job = result.job;
        await db.update(discoveredJobs).set({
          company: job.company || existing.company, position: job.position || existing.position, department: job.department || "",
          category: job.category || "其他", location: job.location || "", recruitmentType: job.recruitmentType || "",
          description: job.description || "", requirements: job.requirements || "", jobUrl: job.jobUrl || existing.jobUrl,
          normalizedUrl: normalizeUrl(job.jobUrl || existing.jobUrl), source: job.source || existing.source, sourceKind: "official",
          sourceJobId: job.sourceJobId || existing.sourceJobId, publishedDate: job.publishedDate || "", deadline: job.deadline || "",
          graduationRequirement: job.graduationRequirement || "", startDate: job.startDate || "", rawText: job.rawText || "",
          availabilityStatus: job.availabilityStatus || "active", lastSeenAt: now, fetchedAt: now,
          sourceUpdatedAt: job.sourceUpdatedAt || "", updatedAt: now,
        }).where(eq(discoveredJobs.id, existing.id));
        updated++;
      } catch (error) {
        failed++; failures.push({ id: existing.id, error: error instanceof Error ? error.message : "更新失败" });
      }
    }
    return NextResponse.json({ checked: candidates.length, updated, closed, failed, failures });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "官网状态更新失败，已有岗位资料未改变" }, { status: 503 });
  }
}
