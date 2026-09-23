import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { importBatches, importItems, jobApplications, jobs } from "@/db/schema";
import { ImportRow, jobFingerprint, normalizeUrl } from "@/lib/job-import";
import { STATUSES } from "@/lib/application";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");

function duplicateFor(row: ImportRow, existing: (typeof jobs.$inferSelect)[]) {
  const sourceId = clean(row.sourceJobId);
  if (sourceId && row.source) {
    const match = existing.find((job) => norm(job.source) === norm(row.source) && norm(job.sourceJobId) === norm(sourceId));
    if (match) return { job: match, reason: "来源网站和岗位 ID 相同" };
  }
  const url = normalizeUrl(row.jobUrl || "");
  if (url) {
    const match = existing.find((job) => job.normalizedUrl === url);
    if (match) return { job: match, reason: "规范化招聘链接相同" };
  }
  if (row.company && row.position) {
    const match = existing.find((job) => norm(job.company) === norm(row.company) && norm(job.position) === norm(row.position) && norm(job.location) === norm(row.location || ""));
    if (match) return { job: match, reason: "公司、岗位和地点相同" };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { action?: string; rows?: ImportRow[]; clientToken?: string; label?: string };
    const rows = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [];
    const db = getDb();
    const existing = await db.select().from(jobs);
    if (body.action === "preview") {
      const seen = new Map<string, string>();
      return NextResponse.json({ rows: rows.map((row) => {
        const duplicate = duplicateFor(row, existing);
        if (duplicate) return { ...row, duplicateId: duplicate.job.id, duplicateReason: duplicate.reason, duplicateAction: row.duplicateAction || "skip" };
        const fingerprint = jobFingerprint(row), earlier = seen.get(fingerprint);
        if (fingerprint !== "identity:||" && earlier) return { ...row, duplicateId: `batch:${earlier}`, duplicateReason: "与本批次较早的一行疑似重复", duplicateAction: row.duplicateAction || "skip" };
        seen.set(fingerprint, row.tempId);
        return row;
      }) });
    }
    if (body.action !== "commit") return NextResponse.json({ error: "不支持的导入操作" }, { status: 400 });
    const clientToken = clean(body.clientToken);
    if (!clientToken) return NextResponse.json({ error: "缺少导入批次标识" }, { status: 400 });
    const previous = await db.select().from(importBatches).where(eq(importBatches.clientToken, clientToken)).limit(1);
    if (previous[0]) return NextResponse.json({ batchId: previous[0].id, imported: previous[0].savedCount, failed: previous[0].failedCount, repeated: true });

    const selected = rows.filter((row) => row.selected !== false);
    const batchId = crypto.randomUUID(), now = new Date().toISOString();
    await db.insert(importBatches).values({ id: batchId, clientToken, label: clean(body.label) || "批量导入", status: "processing", totalCount: selected.length, savedCount: 0, failedCount: 0, createdAt: now, undoneAt: null });
    let imported = 0, failed = 0;
    const failures: { tempId: string; error: string }[] = [];
    const currentJobs = [...existing];

    for (const row of selected) {
      const itemId = crypto.randomUUID(), duplicate = duplicateFor(row, currentJobs);
      try {
        if (duplicate && (row.duplicateAction || "skip") === "skip") {
          await db.insert(importItems).values({ id: itemId, batchId, jobId: duplicate.job.id, result: "skipped", error: "疑似重复，已按选择跳过", originalName: row.originalName || "", fingerprint: jobFingerprint(row), previousSnapshot: "", createdAt: now });
          continue;
        }
        if ((!clean(row.company) || !clean(row.position)) && row.error && !row.company && !row.position) {
          // Incomplete items are valid drafts; an explicit extraction failure remains retryable.
          if (/读取失败|解析失败|格式无效/.test(row.error)) throw new Error(row.error);
        }
        const status = STATUSES.includes(row.status as typeof STATUSES[number]) ? row.status : "待投递";
        const jobValues = {
          company: clean(row.company), position: clean(row.position), department: "", category: clean(row.category) || "其他",
          location: clean(row.location), recruitmentType: clean(row.recruitmentType) || "校招",
          description: clean(row.description), requirements: clean(row.requirements), jobUrl: clean(row.jobUrl),
          normalizedUrl: normalizeUrl(clean(row.jobUrl)), source: clean(row.source), sourceJobId: clean(row.sourceJobId),
          publishedDate: clean(row.publishedDate), deadline: clean(row.deadline), tags: clean(row.tags),
          rawText: clean(row.rawText), companyIntro: "", interviewExperience: "", writtenTestMaterials: "",
          commonQuestions: "", preparationNotes: "", isDraft: !clean(row.company) || !clean(row.position), updatedAt: now,
        };
        let jobId = "", result = "created", previousSnapshot = "";
        if (duplicate && row.duplicateAction === "merge") {
          jobId = duplicate.job.id;
          const oldApplication = await db.select().from(jobApplications).where(eq(jobApplications.jobId, jobId)).limit(1);
          previousSnapshot = JSON.stringify({ job: duplicate.job, application: oldApplication[0] || null });
          const patch: Record<string, unknown> = { updatedAt: now };
          for (const [key, value] of Object.entries(jobValues)) {
            if (key === "updatedAt" || key === "isDraft") continue;
            const old = duplicate.job[key as keyof typeof duplicate.job];
            if ((!old || String(old).trim() === "") && value) patch[key] = value;
          }
          patch.isDraft = !(clean(patch.company ?? duplicate.job.company) && clean(patch.position ?? duplicate.job.position));
          await db.update(jobs).set(patch).where(eq(jobs.id, jobId));
          if (status !== "待投递" && !oldApplication[0]) await db.insert(jobApplications).values({ id: crypto.randomUUID(), jobId, appliedDate: clean(row.appliedDate), channel: clean(row.channel), status, resumeVersionId: null, legacyResumeLabel: "", notes: "", createdAt: now, updatedAt: now });
          result = "merged";
        } else {
          jobId = crypto.randomUUID();
          const created = { ...jobValues, id: jobId, importBatchId: batchId, createdAt: now };
          await db.insert(jobs).values(created);
          currentJobs.push(created);
          if (status !== "待投递") await db.insert(jobApplications).values({ id: crypto.randomUUID(), jobId, appliedDate: clean(row.appliedDate), channel: clean(row.channel), status, resumeVersionId: null, legacyResumeLabel: "", notes: "", createdAt: now, updatedAt: now });
        }
        await db.insert(importItems).values({ id: itemId, batchId, jobId, result, error: "", originalName: row.originalName || "", fingerprint: jobFingerprint(row), previousSnapshot, createdAt: now });
        imported++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : "保存失败";
        failures.push({ tempId: row.tempId, error: message });
        await db.insert(importItems).values({ id: itemId, batchId, jobId: null, result: "failed", error: message, originalName: row.originalName || "", fingerprint: jobFingerprint(row), previousSnapshot: "", createdAt: now });
      }
    }
    await db.update(importBatches).set({ status: failed ? "partial" : "completed", savedCount: imported, failedCount: failed }).where(eq(importBatches.id, batchId));
    return NextResponse.json({ batchId, imported, failed, failures }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "批量导入失败" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const batchId = new URL(request.url).searchParams.get("batchId");
  if (!batchId) return NextResponse.json({ error: "缺少导入批次编号" }, { status: 400 });
  try {
    const db = getDb();
    const batch = await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
    if (!batch[0]) return NextResponse.json({ error: "没有找到该导入批次" }, { status: 404 });
    if (batch[0].undoneAt) return NextResponse.json({ ok: true, repeated: true });
    const items = await db.select().from(importItems).where(eq(importItems.batchId, batchId));
    for (const item of items.reverse()) {
      if (!item.jobId) continue;
      if (item.result === "created") await db.delete(jobs).where(eq(jobs.id, item.jobId));
      if (item.result === "merged" && item.previousSnapshot) {
        const snapshot = JSON.parse(item.previousSnapshot) as { job: typeof jobs.$inferSelect; application: typeof jobApplications.$inferSelect | null };
        const { id, ...job } = snapshot.job;
        await db.update(jobs).set(job).where(eq(jobs.id, id));
        await db.delete(jobApplications).where(eq(jobApplications.jobId, id));
        if (snapshot.application) await db.insert(jobApplications).values(snapshot.application);
      }
    }
    await db.update(importBatches).set({ status: "undone", undoneAt: new Date().toISOString() }).where(eq(importBatches.id, batchId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "撤销失败，已保留现有数据" }, { status: 500 });
  }
}
