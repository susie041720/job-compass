import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { STATUSES } from "@/lib/application";
import { blockPublicDemoMutation } from "@/lib/public-demo";

export async function POST(request: NextRequest) {
  const blocked = blockPublicDemoMutation();
  if (blocked) return blocked;
  try {
    const rows = await request.json() as Record<string, string>[];
    if (!Array.isArray(rows) || rows.length > 500) return NextResponse.json({ error: "一次最多导入 500 条记录" }, { status: 400 });
    const now = new Date().toISOString();
    const records = rows.filter(x=>x.company?.trim()&&x.position?.trim()).map(x=>({
      id: crypto.randomUUID(), company:x.company.trim(), position:x.position.trim(), category:x.category||"其他",
      location:x.location||"", recruitmentType:x.recruitmentType||"校招", description:x.description||"",
      requirements:x.requirements||"", jobUrl:x.jobUrl||"", source:x.source||"", appliedDate:x.appliedDate||"",
      deadline:x.deadline||"", channel:x.channel||"", status:STATUSES.includes(x.status as never)?x.status:"准备投递",
      resumeVersion:x.resumeVersion||"", notes:x.notes||"", companyIntro:x.companyIntro||"",
      interviewExperience:x.interviewExperience||"", writtenTestMaterials:x.writtenTestMaterials||"",
      commonQuestions:x.commonQuestions||"", preparationNotes:x.preparationNotes||"", createdAt:now, updatedAt:now,
    }));
    if (!records.length) return NextResponse.json({ error: "没有找到有效记录，请检查公司名称和岗位名称" }, { status: 400 });
    await getDb().insert(applications).values(records);
    return NextResponse.json({ imported: records.length }, { status: 201 });
  } catch (error) { console.error(error); return NextResponse.json({ error: "导入失败，请检查 CSV 格式" }, { status: 400 }); }
}
