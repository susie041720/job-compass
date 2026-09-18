import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { STATUSES } from "@/lib/application";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function normalize(body: Record<string, unknown>) {
  const now = new Date().toISOString();
  const status = clean(body.status) || "准备投递";
  if (!STATUSES.includes(status as typeof STATUSES[number])) throw new Error("请选择有效的投递进度");
  return {
    company: clean(body.company), position: clean(body.position), category: clean(body.category) || "其他",
    location: clean(body.location), recruitmentType: clean(body.recruitmentType) || "校招",
    description: clean(body.description), requirements: clean(body.requirements), jobUrl: clean(body.jobUrl),
    source: clean(body.source), appliedDate: clean(body.appliedDate), deadline: clean(body.deadline),
    channel: clean(body.channel), status, resumeVersion: clean(body.resumeVersion), notes: clean(body.notes),
    companyIntro: clean(body.companyIntro), interviewExperience: clean(body.interviewExperience),
    writtenTestMaterials: clean(body.writtenTestMaterials), commonQuestions: clean(body.commonQuestions),
    preparationNotes: clean(body.preparationNotes), updatedAt: now,
  };
}

export async function GET() {
  try { return NextResponse.json(await getDb().select().from(applications).orderBy(desc(applications.updatedAt))); }
  catch (error) { console.error(error); return NextResponse.json({ error: "暂时无法读取数据，请稍后重试" }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const data = normalize(body);
    if (!data.company || !data.position) return badRequest("请填写公司名称和岗位名称");
    const record = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    await getDb().insert(applications).values(record);
    return NextResponse.json(record, { status: 201 });
  } catch (error) { return badRequest(error instanceof Error ? error.message : "保存失败"); }
}
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = clean(body.id); if (!id) return badRequest("缺少记录编号");
    const data = normalize(body); if (!data.company || !data.position) return badRequest("请填写公司名称和岗位名称");
    await getDb().update(applications).set(data).where(eq(applications.id, id));
    return NextResponse.json({ ...body, ...data, id });
  } catch (error) { return badRequest(error instanceof Error ? error.message : "更新失败"); }
}
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return badRequest("缺少记录编号");
  try { await getDb().delete(applications).where(eq(applications.id, id)); return NextResponse.json({ ok: true }); }
  catch (error) { console.error(error); return NextResponse.json({ error: "删除失败，请稍后重试" }, { status: 503 }); }
}
