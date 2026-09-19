import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { resumeVersions } from "@/db/schema";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function GET(request: NextRequest) {
  try {
    const jobId = new URL(request.url).searchParams.get("jobId");
    const query = getDb().select().from(resumeVersions);
    const rows = jobId ? await query.where(eq(resumeVersions.jobId, jobId)).orderBy(desc(resumeVersions.updatedAt)) : await query.orderBy(desc(resumeVersions.updatedAt));
    return NextResponse.json(rows.map((row) => ({ ...row, suggestions: JSON.parse(row.suggestions || "[]") })));
  } catch (error) { console.error(error); return NextResponse.json({ error: "无法读取简历版本" }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const baseResumeId = clean(body.baseResumeId), content = clean(body.content), title = clean(body.title);
    if (!baseResumeId || !content || !title) return NextResponse.json({ error: "缺少基础简历、标题或草稿内容" }, { status: 400 });
    const now = new Date().toISOString();
    const record = { id: crypto.randomUUID(), baseResumeId, jobId: clean(body.jobId) || null, title,
      language: clean(body.language) || "中文", intensity: clean(body.intensity) || "轻度润色", content,
      suggestions: JSON.stringify(body.suggestions || []), jdSnapshot: clean(body.jdSnapshot), status: "草稿", createdAt: now, updatedAt: now };
    await getDb().insert(resumeVersions).values(record);
    return NextResponse.json({ ...record, suggestions: body.suggestions || [] }, { status: 201 });
  } catch (error) { console.error(error); return NextResponse.json({ error: "保存定制简历失败" }, { status: 400 }); }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>, id = clean(body.id);
    if (!id) return NextResponse.json({ error: "缺少版本编号" }, { status: 400 });
    const patch = { title: clean(body.title), content: clean(body.content), status: clean(body.status) || "草稿", suggestions: JSON.stringify(body.suggestions || []), updatedAt: new Date().toISOString() };
    await getDb().update(resumeVersions).set(patch).where(eq(resumeVersions.id, id));
    return NextResponse.json({ ...body, ...patch, suggestions: body.suggestions || [], id });
  } catch (error) { console.error(error); return NextResponse.json({ error: "更新简历版本失败" }, { status: 400 }); }
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少版本编号" }, { status: 400 });
  try { await getDb().delete(resumeVersions).where(eq(resumeVersions.id, id)); return NextResponse.json({ ok: true }); }
  catch (error) { console.error(error); return NextResponse.json({ error: "删除简历版本失败" }, { status: 400 }); }
}
