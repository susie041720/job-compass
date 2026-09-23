import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { baseResumes, discoveryPreferences, jobApplications, resumeVersions } from "@/db/schema";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

function originalFileResponse(row: typeof baseResumes.$inferSelect) {
  if (!row.originalData) return NextResponse.json({ error: "这份简历没有保留可打开的原文件" }, { status: 404 });
  try {
    const binary = atob(row.originalData), bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    const filename = row.originalFileName || `${row.name}.${row.originalMime.includes("pdf") ? "pdf" : "docx"}`;
    return new NextResponse(bytes, { headers: {
      "Content-Type": row.originalMime || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    } });
  } catch {
    return NextResponse.json({ error: "原始简历文件已损坏，仍可查看解析后的文字" }, { status: 422 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url), id = url.searchParams.get("id"), file = url.searchParams.get("file");
    if (id && file === "original") {
      const found = await getDb().select().from(baseResumes).where(eq(baseResumes.id, id)).limit(1);
      if (!found[0]) return NextResponse.json({ error: "找不到这份基础简历" }, { status: 404 });
      return originalFileResponse(found[0]);
    }
    const db = getDb();
    const rows = await getDb().select({ id: baseResumes.id, name: baseResumes.name, language: baseResumes.language,
      originalFileName: baseResumes.originalFileName, originalMime: baseResumes.originalMime,
      extractedText: baseResumes.extractedText, confirmedContent: baseResumes.confirmedContent,
      createdAt: baseResumes.createdAt, updatedAt: baseResumes.updatedAt }).from(baseResumes).orderBy(desc(baseResumes.updatedAt));
    const [versions, applications] = await Promise.all([
      db.select({ id: resumeVersions.id, baseResumeId: resumeVersions.baseResumeId }).from(resumeVersions),
      db.select({ resumeVersionId: jobApplications.resumeVersionId }).from(jobApplications),
    ]);
    return NextResponse.json(rows.map((row) => {
      const childIds = versions.filter((version) => version.baseResumeId === row.id).map((version) => version.id);
      const relatedIds = new Set([row.id, ...childIds]);
      return { ...row, versionCount: childIds.length, applicationCount: applications.filter((item) => item.resumeVersionId && relatedIds.has(item.resumeVersionId)).length };
    }));
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
  try {
    const db = getDb();
    const [found, versions, applications] = await Promise.all([
      db.select({ id: baseResumes.id }).from(baseResumes).where(eq(baseResumes.id, id)).limit(1),
      db.select({ id: resumeVersions.id }).from(resumeVersions).where(eq(resumeVersions.baseResumeId, id)),
      db.select({ resumeVersionId: jobApplications.resumeVersionId }).from(jobApplications),
    ]);
    if (!found[0]) return NextResponse.json({ error: "找不到这份基础简历" }, { status: 404 });
    const relatedIds = new Set([id, ...versions.map((version) => version.id)]);
    const usageCount = applications.filter((item) => item.resumeVersionId && relatedIds.has(item.resumeVersionId)).length;
    if (usageCount) return NextResponse.json({ error: `这份简历或它的定制版本正被 ${usageCount} 条投递记录使用。请先在投递编辑中更换简历，再删除。`, usageCount }, { status: 409 });
    await db.update(discoveryPreferences).set({ baseResumeId: null, updatedAt: new Date().toISOString() }).where(eq(discoveryPreferences.baseResumeId, id));
    await db.delete(baseResumes).where(eq(baseResumes.id, id));
    return NextResponse.json({ ok: true, deletedVersionCount: versions.length });
  }
  catch (error) { console.error(error); return NextResponse.json({ error: "删除基础简历失败" }, { status: 400 }); }
}
