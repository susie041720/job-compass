import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { baseResumes, discoveryPreferences } from "@/db/schema";
import { defaultDiscoveryPreferences, DiscoveryPreferences } from "@/lib/job-discovery";
import { blockPublicDemoMutation } from "@/lib/public-demo";

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";
const cleanList = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.map((item) => clean(item)).filter(Boolean))].slice(0, 30)
  : [];

function parseList(value: string) {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

function serialize(row: typeof discoveryPreferences.$inferSelect): DiscoveryPreferences {
  return {
    ...row,
    baseResumeId: row.baseResumeId || "",
    preferredCities: parseList(row.preferredCities),
    priorityCities: parseList(row.priorityCities),
    recruitmentTypes: parseList(row.recruitmentTypes),
    targetDirections: parseList(row.targetDirections),
    companyPreferences: parseList(row.companyPreferences),
    extraKeywords: parseList(row.extraKeywords),
  };
}

export async function GET() {
  try {
    const db = getDb();
    const [stored, resumes] = await Promise.all([
      db.select().from(discoveryPreferences).where(eq(discoveryPreferences.id, "default")).limit(1),
      db.select({ id: baseResumes.id, name: baseResumes.name, updatedAt: baseResumes.updatedAt }).from(baseResumes).orderBy(desc(baseResumes.updatedAt)),
    ]);
    return NextResponse.json({ preferences: stored[0] ? serialize(stored[0]) : defaultDiscoveryPreferences(), resumes });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "无法读取求职偏好，请确认本地数据库已完成升级" }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const blocked = blockPublicDemoMutation();
  if (blocked) return blocked;
  try {
    const body = await request.json() as Record<string, unknown>, now = new Date().toISOString();
    const preferredCities = cleanList(body.preferredCities), priorityCities = cleanList(body.priorityCities);
    if (!preferredCities.length) return NextResponse.json({ error: "请至少保留一个目标城市" }, { status: 400 });
    const record = {
      id: "default", baseResumeId: clean(body.baseResumeId) || null,
      preferredCities: JSON.stringify(preferredCities),
      priorityCities: JSON.stringify(priorityCities.filter((city) => preferredCities.includes(city))),
      recruitmentTypes: JSON.stringify(cleanList(body.recruitmentTypes)),
      targetDirections: JSON.stringify(cleanList(body.targetDirections)),
      graduationDate: clean(body.graduationDate), availableFrom: clean(body.availableFrom),
      searchStage: clean(body.searchStage) || "实习",
      companyPreferences: JSON.stringify(cleanList(body.companyPreferences)),
      extraKeywords: JSON.stringify(cleanList(body.extraKeywords)), updatedAt: now,
    };
    const db = getDb(), existing = await db.select({ id: discoveryPreferences.id }).from(discoveryPreferences).where(eq(discoveryPreferences.id, "default")).limit(1);
    if (existing[0]) await db.update(discoveryPreferences).set(record).where(eq(discoveryPreferences.id, "default"));
    else await db.insert(discoveryPreferences).values({ ...record, createdAt: now });
    const saved = await db.select().from(discoveryPreferences).where(eq(discoveryPreferences.id, "default")).limit(1);
    return NextResponse.json(serialize(saved[0]));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "保存求职偏好失败，原有设置未改变" }, { status: 400 });
  }
}
