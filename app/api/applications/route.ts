import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { applications as legacyApplications, jobApplications, jobs } from "@/db/schema";
import { STATUSES } from "@/lib/application";
import { normalizeUrl } from "@/lib/job-import";

const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

function normalize(body: Record<string, unknown>) {
  const status = clean(body.status) || "待投递";
  if (!STATUSES.includes(status as typeof STATUSES[number])) throw new Error("请选择有效的投递进度");
  const company = clean(body.company), position = clean(body.position);
  return {
    job: {
      company, position, department: clean(body.department), category: clean(body.category) || "其他", location: clean(body.location),
      recruitmentType: clean(body.recruitmentType) || "校招", description: clean(body.description),
      requirements: clean(body.requirements), jobUrl: clean(body.jobUrl), normalizedUrl: normalizeUrl(clean(body.jobUrl)),
      source: clean(body.source), sourceJobId: clean(body.sourceJobId), publishedDate: clean(body.publishedDate),
      deadline: clean(body.deadline), tags: clean(body.tags), rawText: clean(body.rawText),
      companyIntro: clean(body.companyIntro), interviewExperience: clean(body.interviewExperience),
      writtenTestMaterials: clean(body.writtenTestMaterials), commonQuestions: clean(body.commonQuestions),
      preparationNotes: clean(body.preparationNotes), isDraft: Boolean(body.isDraft) || !company || !position,
    },
    application: {
      appliedDate: clean(body.appliedDate), channel: clean(body.channel), status,
      legacyResumeLabel: clean(body.resumeVersion), resumeVersionId: clean(body.resumeVersionId) || null,
      notes: clean(body.notes),
    },
  };
}

type Joined = { job: typeof jobs.$inferSelect; application: typeof jobApplications.$inferSelect | null };
function combine({ job: j, application: a }: Joined) {
  return {
    id: j.id, applicationId: a?.id, company: j.company, position: j.position, department: j.department, category: j.category,
    location: j.location, recruitmentType: j.recruitmentType, description: j.description,
    requirements: j.requirements, jobUrl: j.jobUrl, source: j.source, sourceJobId: j.sourceJobId,
    publishedDate: j.publishedDate, appliedDate: a?.appliedDate || "", deadline: j.deadline,
    channel: a?.channel || "", status: a?.status || "待投递", resumeVersion: a?.legacyResumeLabel || "",
    resumeVersionId: a?.resumeVersionId || "", notes: a?.notes || "", tags: j.tags, rawText: j.rawText,
    companyIntro: j.companyIntro, interviewExperience: j.interviewExperience,
    writtenTestMaterials: j.writtenTestMaterials, commonQuestions: j.commonQuestions,
    preparationNotes: j.preparationNotes, isDraft: j.isDraft, createdAt: j.createdAt, updatedAt: j.updatedAt,
  };
}

async function ensureLegacyData() {
  const db = getDb();
  const current = await db.select({ id: jobs.id }).from(jobs).limit(1);
  if (current.length) return;
  const legacy = await db.select().from(legacyApplications);
  for (const item of legacy) {
    const jobId = `legacy-job-${item.id}`;
    await db.insert(jobs).values({ id: jobId, company: item.company, position: item.position, department: "", category: item.category,
      location: item.location, recruitmentType: item.recruitmentType, description: item.description, requirements: item.requirements,
      jobUrl: item.jobUrl, normalizedUrl: normalizeUrl(item.jobUrl), source: item.source, sourceJobId: "", publishedDate: "",
      deadline: item.deadline, tags: "", rawText: "", companyIntro: item.companyIntro, interviewExperience: item.interviewExperience,
      writtenTestMaterials: item.writtenTestMaterials, commonQuestions: item.commonQuestions, preparationNotes: item.preparationNotes,
      isDraft: false, importBatchId: null, createdAt: item.createdAt, updatedAt: item.updatedAt }).onConflictDoNothing();
    if (item.status !== "准备投递" || item.appliedDate || item.channel || item.resumeVersion) {
      await db.insert(jobApplications).values({ id: `legacy-app-${item.id}`, jobId, appliedDate: item.appliedDate,
        channel: item.channel, status: item.status === "准备投递" ? "已投递" : item.status, resumeVersionId: null,
        legacyResumeLabel: item.resumeVersion, notes: item.notes, createdAt: item.createdAt, updatedAt: item.updatedAt }).onConflictDoNothing();
    }
  }
}

export async function GET() {
  try {
    await ensureLegacyData();
    const rows = await getDb().select({ job: jobs, application: jobApplications }).from(jobs)
      .leftJoin(jobApplications, eq(jobApplications.jobId, jobs.id)).orderBy(desc(jobs.updatedAt));
    return NextResponse.json(rows.map(combine));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "暂时无法读取数据，请确认本地数据库已完成升级" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = normalize(await request.json() as Record<string, unknown>);
    if ((!data.job.company || !data.job.position) && !data.job.isDraft) return badRequest("请填写公司名称和岗位名称");
    const db = getDb(), now = new Date().toISOString();
    const job = { ...data.job, id: crypto.randomUUID(), importBatchId: null, createdAt: now, updatedAt: now };
    await db.insert(jobs).values(job);
    let application: typeof jobApplications.$inferSelect | null = null;
    if (data.application.status !== "待投递") {
      application = { ...data.application, id: crypto.randomUUID(), jobId: job.id, createdAt: now, updatedAt: now };
      await db.insert(jobApplications).values(application);
    }
    return NextResponse.json(combine({ job, application }), { status: 201 });
  } catch (error) {
    console.error(error);
    return badRequest(error instanceof Error ? error.message : "保存失败");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>, id = clean(body.id);
    if (!id) return badRequest("缺少岗位编号");
    const data = normalize(body);
    if ((!data.job.company || !data.job.position) && !data.job.isDraft) return badRequest("请填写公司名称和岗位名称");
    const db = getDb(), now = new Date().toISOString();
    await db.update(jobs).set({ ...data.job, updatedAt: now }).where(eq(jobs.id, id));
    const existing = await db.select().from(jobApplications).where(eq(jobApplications.jobId, id)).limit(1);
    let application: typeof jobApplications.$inferSelect | null = null;
    if (data.application.status === "待投递") {
      if (existing[0]) await db.delete(jobApplications).where(eq(jobApplications.id, existing[0].id));
    } else if (existing[0]) {
      application = { ...existing[0], ...data.application, updatedAt: now };
      await db.update(jobApplications).set({ ...data.application, updatedAt: now }).where(eq(jobApplications.id, existing[0].id));
    } else {
      application = { ...data.application, id: crypto.randomUUID(), jobId: id, createdAt: now, updatedAt: now };
      await db.insert(jobApplications).values(application);
    }
    const updated = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return NextResponse.json(combine({ job: updated[0], application }));
  } catch (error) {
    console.error(error);
    return badRequest(error instanceof Error ? error.message : "更新失败");
  }
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return badRequest("缺少岗位编号");
  try {
    await getDb().delete(jobs).where(eq(jobs.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 503 });
  }
}
