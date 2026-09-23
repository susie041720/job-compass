import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { baseResumes, jobs, resumeVersions } from "@/db/schema";

export async function GET() {
  try {
    const db = getDb();
    const [bases, versions, allJobs] = await Promise.all([
      db.select({ id: baseResumes.id, name: baseResumes.name, originalFileName: baseResumes.originalFileName, language: baseResumes.language, updatedAt: baseResumes.updatedAt })
        .from(baseResumes).orderBy(desc(baseResumes.updatedAt)),
      db.select({ id: resumeVersions.id, title: resumeVersions.title, jobId: resumeVersions.jobId, language: resumeVersions.language, updatedAt: resumeVersions.updatedAt })
        .from(resumeVersions).orderBy(desc(resumeVersions.updatedAt)),
      db.select({ id: jobs.id, company: jobs.company, position: jobs.position }).from(jobs),
    ]);
    const jobById = new Map(allJobs.map((job) => [job.id, job]));
    return NextResponse.json([
      ...bases.map((resume) => ({
        id: resume.id, type: "base", label: resume.name,
        detail: `基础简历 · ${resume.originalFileName || resume.language}`,
        updatedAt: resume.updatedAt,
      })),
      ...versions.map((version) => {
        const job = version.jobId ? jobById.get(version.jobId) : undefined;
        return {
          id: version.id, type: "version", label: version.title,
          detail: job ? `岗位定制 · ${job.company} · ${job.position}` : `岗位定制 · ${version.language}`,
          updatedAt: version.updatedAt,
        };
      }),
    ]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "无法读取可选简历" }, { status: 503 });
  }
}
