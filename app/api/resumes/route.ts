import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { baseResumes } from "@/db/schema";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function GET() {
  try {
    const rows = await getDb().select({ id: baseResumes.id, name: baseResumes.name, language: baseResumes.language,
      originalFileName: baseResumes.originalFileName, originalMime: baseResumes.originalMime,
      extractedText: baseResumes.extractedText, confirmedContent: baseResumes.confirmedContent,
      createdAt: baseResumes.createdAt, updatedAt: baseResumes.updatedAt }).from(baseResumes).orderBy(desc(baseResumes.updatedAt));
    return NextResponse.json(rows);
  } catch (error) { console.error(error); return NextResponse.json({ error: "无法读取基础简历" }, { status: 503 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = clean(body.name), extractedText = clean(body.extractedText);
    if (!name || !extractedText) return NextResponse.json({ error: "请填写简历名称并确认已提取到正文" }, { status: 400 });
    const originalData = clean(body.originalData);
    if (originalData.length > 8_000_000) return NextResponse.json({ error: "文件过大，请使用 5MB 以内的 PDF 或 DOCX" }, { status: 400 });
    const now = new Date().toISOString();
    const record = { id: crypto.randomUUID(), name, language: clean(body.language) || "中文", originalFileName: clean(body.originalFileName),
      originalMime: clean(body.originalMime), originalData, extractedText, confirmedContent: clean(body.confirmedContent) || extractedText,
      createdAt: now, updatedAt: now };
    await getDb().insert(baseResumes).values(record);
    return NextResponse.json({ id: record.id, name: record.name, language: record.language, originalFileName: record.originalFileName,
      originalMime: record.originalMime, extractedText: record.extractedText, confirmedContent: record.confirmedContent,
      createdAt: record.createdAt, updatedAt: record.updatedAt }, { status: 201 });
  } catch (error) { console.error(error); return NextResponse.json({ error: "保存基础简历失败" }, { status: 400 }); }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>, id = clean(body.id);
    if (!id) return NextResponse.json({ error: "缺少简历编号" }, { status: 400 });
    const patch = { name: clean(body.name), language: clean(body.language) || "中文", confirmedContent: clean(body.confirmedContent), updatedAt: new Date().toISOString() };
    if (!patch.name || !patch.confirmedContent) return NextResponse.json({ error: "简历名称和确认后的内容不能为空" }, { status: 400 });
    await getDb().update(baseResumes).set(patch).where(eq(baseResumes.id, id));
    return NextResponse.json({ ...body, ...patch, id });
  } catch (error) { console.error(error); return NextResponse.json({ error: "更新基础简历失败" }, { status: 400 }); }
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少简历编号" }, { status: 400 });
  try { await getDb().delete(baseResumes).where(eq(baseResumes.id, id)); return NextResponse.json({ ok: true }); }
  catch (error) { console.error(error); return NextResponse.json({ error: "删除基础简历失败" }, { status: 400 }); }
}
