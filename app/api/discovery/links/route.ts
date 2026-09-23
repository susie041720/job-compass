import { NextRequest, NextResponse } from "next/server";
import { fetchOfficialJob } from "@/lib/discovery-sources";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { urls?: unknown };
    const urls = Array.isArray(body.urls)
      ? [...new Set(body.urls.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, 30)
      : [];
    if (!urls.length) return NextResponse.json({ error: "请至少粘贴一个官方岗位链接" }, { status: 400 });
    const rows = [], failures: Array<{ url: string; error: string }> = [];
    for (const url of urls) {
      try {
        const result = await fetchOfficialJob(url);
        if (result.status === "closed") failures.push({ url, error: "岗位可能已关闭，官网没有返回有效详情" });
        else rows.push(result.job);
      } catch (error) {
        failures.push({ url, error: error instanceof Error ? error.message : "读取失败" });
      }
    }
    return NextResponse.json({ rows, failures });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "官方链接读取失败，已有数据未改变" }, { status: 400 });
  }
}
