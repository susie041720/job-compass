/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Eye, FileText, Loader2, ShieldCheck, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationRecord } from "@/lib/application";

type BaseResume = { id: string; name: string; language: string; originalFileName: string; originalMime: string; extractedText: string; confirmedContent: string; createdAt: string; updatedAt: string; versionCount: number; applicationCount: number };
type Suggestion = { id?: string; original?: string; revised?: string; why?: string; requirement?: string; evidence?: string; accepted?: boolean };
type Evidence = { requirement: string; level: "有经历支撑" | "相关但需补充" | "暂无证据"; resumeEvidence: string };
type Version = { id: string; baseResumeId: string; jobId?: string; title: string; language: string; intensity: string; content: string; suggestions: Suggestion[]; jdSnapshot: string; status: string; createdAt: string; updatedAt: string; usageCount: number };
type Analysis = { responsibilities: string[]; mustHave: string[]; niceToHave: string[]; keywords: string[]; evidence: Evidence[]; suggestions: Suggestion[]; draft: string };

async function json(url: string, options?: RequestInit): Promise<any> { const response = await fetch(url, options), body: any = await response.json(); if (!response.ok) throw new Error(body.error || "操作失败"); return body; }
const bufferToBase64 = (buffer: ArrayBuffer) => { let value = ""; const bytes = new Uint8Array(buffer); for (let i = 0; i < bytes.length; i += 8192) value += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(value); };

async function extractFile(file: File) {
  const buffer = await file.arrayBuffer();
  // PDF.js transfers the ArrayBuffer passed to its worker, which detaches that
  // buffer in the browser. Preserve the original file before handing a copy to
  // any parser so the source document can still be saved after extraction.
  const originalData = bufferToBase64(buffer);
  if (/\.docx$/i.test(file.name)) {
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({ arrayBuffer: buffer.slice(0) });
    return { text: result.value.trim(), data: originalData };
  }
  if (/\.pdf$/i.test(file.name)) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const document = await pdfjs.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber), content = await page.getTextContent();
      pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
    }
    return { text: pages.join("\n\n").trim(), data: originalData };
  }
  throw new Error("仅支持 PDF 或 DOCX 基础简历");
}

export function ResumeStudio({ jobs, initialJob, onInitialJobHandled, onUseVersion, onCatalogChanged, readOnly = false }: { jobs: ApplicationRecord[]; initialJob: ApplicationRecord | null; onInitialJobHandled: () => void; onUseVersion: (job: ApplicationRecord, version: Version) => Promise<void>; onCatalogChanged: () => Promise<void>; readOnly?: boolean }) {
  const [bases, setBases] = useState<BaseResume[]>([]), [versions, setVersions] = useState<Version[]>([]);
  const [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [review, setReview] = useState<{ file: File; text: string; data: string; name: string; language: string } | null>(null);
  const [optimizer, setOptimizer] = useState(false), [jobId, setJobId] = useState(""), [baseId, setBaseId] = useState(""), [language, setLanguage] = useState("中文"), [intensity, setIntensity] = useState("轻度润色"), [consent, setConsent] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null), [draft, setDraft] = useState("");
  const [previewBase, setPreviewBase] = useState<BaseResume | null>(null), [previewVersion, setPreviewVersion] = useState<Version | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "base" | "version"; id: string; title: string; usageCount: number; versionCount: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = async () => { try { const [baseData, versionData] = await Promise.all([json("/api/resumes"), json("/api/resume-versions")]); setBases(baseData); setVersions(versionData); } catch (error) { setNotice(error instanceof Error ? error.message : "读取简历失败"); } };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (initialJob) { setJobId(initialJob.id); setOptimizer(true); setAnalysis(null); setDraft(""); onInitialJobHandled(); } }, [initialJob, onInitialJobHandled]);
  useEffect(() => { if (!baseId && bases[0]) setBaseId(bases[0].id); }, [bases, baseId]);
  const job = useMemo(() => jobs.find((item) => item.id === jobId), [jobs, jobId]);
  const base = useMemo(() => bases.find((item) => item.id === baseId), [bases, baseId]);

  const selectFile = async (file?: File) => {
    if (!file) return; setBusy(true); setNotice("正在本地解析简历…");
    try { const extracted = await extractFile(file); if (!extracted.text) throw new Error("没有读取到文字，请换用可选择文字的 PDF 或 DOCX"); setReview({ file, text: extracted.text, data: extracted.data, name: file.name.replace(/\.(pdf|docx)$/i, ""), language: "中文" }); setNotice(""); }
    catch (error) { setNotice(error instanceof Error ? error.message : "简历解析失败"); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const saveBase = async () => {
    if (!review) return; setBusy(true);
    try { await json("/api/resumes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: review.name, language: review.language, originalFileName: review.file.name, originalMime: review.file.type, originalData: review.data, extractedText: review.text, confirmedContent: review.text }) }); setReview(null); await load(); await onCatalogChanged(); setNotice("基础简历已保存，原文件与确认内容均已保留"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "保存失败"); } finally { setBusy(false); }
  };
  const optimize = async () => {
    if (!job || !base || !consent) return; setBusy(true); setNotice("AI 正在分析岗位要求和真实经历…"); setAnalysis(null);
    try {
      const result = await json("/api/ai/optimize-resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resume: base.confirmedContent, jd: [job.description, job.requirements].filter(Boolean).join("\n\n"), company: job.company, position: job.position, language, intensity }) });
      setAnalysis({ ...result, suggestions: (result.suggestions || []).map((item: Suggestion, index: number) => ({ ...item, id: item.id || String(index), accepted: true })) }); setDraft(result.draft || base.confirmedContent); setNotice("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "AI 分析失败"); setDraft(base.confirmedContent); }
    finally { setBusy(false); }
  };
  const saveVersion = async () => {
    if (!job || !base || !draft.trim()) return; setBusy(true);
    try { await json("/api/resume-versions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseResumeId: base.id, jobId: job.id, title: `${job.company}-${job.position}-${language}`, language, intensity, content: draft, suggestions: analysis?.suggestions || [], jdSnapshot: [job.description, job.requirements].filter(Boolean).join("\n\n") }) }); await load(); await onCatalogChanged(); setOptimizer(false); setAnalysis(null); setDraft(""); setConsent(false); setNotice("岗位专属简历已保存为新版本，尚未自动关联为已投递版本"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "版本保存失败"); } finally { setBusy(false); }
  };
  const exportDocx = async (version: Version) => {
    const { Document, Packer, Paragraph, TextRun } = await import("docx");
    const document = new Document({ sections: [{ properties: {}, children: version.content.split(/\n/).map((line) => new Paragraph({ children: [new TextRun({ text: line || " ", size: 21 })], spacing: { after: 80 } })) }] });
    const blob = await Packer.toBlob(document), url = URL.createObjectURL(blob), anchor = documentWindowAnchor(url, `${version.title}.docx`); anchor.click(); URL.revokeObjectURL(url);
  };
  const exportPdf = (version: Version) => {
    const popup = window.open("", "_blank"); if (!popup) return setNotice("浏览器阻止了预览窗口，请允许弹窗后重试");
    popup.document.write(`<title>${escapeHtml(version.title)}</title><style>@page{size:A4;margin:16mm}body{font:11pt/1.5 Arial,'Microsoft YaHei',sans-serif;color:#172033;white-space:pre-wrap}h1{font-size:16pt}</style><h1>${escapeHtml(version.title)}</h1><div>${escapeHtml(version.content)}</div><script>window.onload=()=>window.print()<\/script>`); popup.document.close();
  };
  const openOriginal = (resume: BaseResume) => {
    const url = `/api/resumes?id=${encodeURIComponent(resume.id)}&file=original`;
    if (resume.originalMime.includes("pdf")) {
      const popup = window.open(url, "_blank", "noopener,noreferrer");
      if (!popup) setNotice("浏览器阻止了原文件窗口，请允许弹窗后重试");
      return;
    }
    const anchor = documentWindowAnchor(url, resume.originalFileName || `${resume.name}.docx`); anchor.click();
  };
  const removeResume = async () => {
    if (!deleting || deleting.usageCount) return;
    setBusy(true);
    try {
      await json(`${deleting.kind === "base" ? "/api/resumes" : "/api/resume-versions"}?id=${encodeURIComponent(deleting.id)}`, { method: "DELETE" });
      setDeleting(null); await load(); await onCatalogChanged();
      setNotice(deleting.kind === "base" ? `基础简历已删除${deleting.versionCount ? `，同时移除 ${deleting.versionCount} 个未使用的定制版本` : ""}` : "定制简历版本已删除");
    } catch (error) { setNotice(error instanceof Error ? error.message : "删除失败"); }
    finally { setBusy(false); }
  };

  return <div><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-[.16em] text-[#0f8b7c]">RESUME STUDIO</p><h1 className="mt-1 text-3xl font-bold tracking-tight">简历工作台</h1><p className="mt-1 text-sm text-slate-500">基础简历保留真实经历，岗位版本独立保存并可回溯</p></div><div><input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(event) => selectFile(event.target.files?.[0])}/><Button variant="outline" disabled={readOnly} onClick={() => fileRef.current?.click()}><Upload/>{readOnly?"展示版不接收文件":"上传基础简历"}</Button></div></div>
    {notice && <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{notice}</div>}
    <Tabs defaultValue="bases"><TabsList><TabsTrigger value="bases">基础简历 / 真实经历库</TabsTrigger><TabsTrigger value="versions">岗位定制版本</TabsTrigger></TabsList><TabsContent value="bases" className="pt-4"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{bases.map((item) => <article key={item.id} className="flex flex-col rounded-2xl border bg-white p-5"><div className="flex items-start justify-between"><FileText className="text-[#08796b]"/><span className="text-xs text-slate-400">{item.language}</span></div><h2 className="mt-4 font-semibold">{item.name}</h2><p className="mt-1 text-sm text-slate-500">原文件：{item.originalFileName||"公开示例文本"}</p><p className="mt-2 text-xs text-slate-400">{item.versionCount} 个定制版本 · {item.applicationCount} 条投递正在使用</p><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.confirmedContent}</p><div className="mt-auto flex flex-wrap gap-2 pt-4"><Button size="sm" variant="outline" onClick={() => setPreviewBase(item)}><Eye/>查看</Button>{item.originalFileName&&<Button size="sm" variant="outline" onClick={() => openOriginal(item)}><Download/>{item.originalMime.includes("pdf")?"原文件":"下载原文件"}</Button>}{!readOnly&&<Button size="sm" variant="ghost" onClick={() => setDeleting({ kind: "base", id: item.id, title: item.name, usageCount: item.applicationCount, versionCount: item.versionCount })}><Trash2 className="text-rose-500"/>删除</Button>}</div></article>)}{!bases.length && <Empty text="先上传 PDF 或 DOCX，并检查解析结果。没有基础简历时，AI 不会自行生成经历。"/>}</div></TabsContent>
      <TabsContent value="versions" className="pt-4"><div className="mb-4 flex justify-end"><Button disabled={readOnly || !bases.length || !jobs.length} onClick={() => { setOptimizer(true); setJobId(jobs[0]?.id || ""); }}><Sparkles/>{readOnly?"展示版不调用 AI":"针对岗位创建版本"}</Button></div><div className="grid gap-4 lg:grid-cols-2">{versions.map((version) => { const target = jobs.find((item) => item.id === version.jobId); return <article key={version.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{version.title}</h2><p className="text-sm text-slate-500">{target ? `${target.company} · ${target.position}` : "通用方向版本"} · {version.intensity}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">{version.status}</span></div><p className="mt-4 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{version.content}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setPreviewVersion(version)}><Eye/>查看</Button><Button size="sm" variant="outline" onClick={() => exportDocx(version)}><Download/>DOCX</Button><Button size="sm" variant="outline" onClick={() => exportPdf(version)}><Download/>PDF</Button>{!readOnly&&target?.applicationId && <Button size="sm" onClick={() => onUseVersion(target, version)}><Check/>设为本次投递版本</Button>}{!readOnly&&<Button size="sm" variant="ghost" onClick={() => setDeleting({ kind: "version", id: version.id, title: version.title, usageCount: version.usageCount, versionCount: 0 })}><Trash2 className="text-rose-500"/>删除</Button>}</div></article>; })}{!versions.length && <Empty text="选择一条岗位，生成或手动整理一份独立版本。生成后不会自动标记为已投递。"/>}</div></TabsContent></Tabs>
    <Dialog open={!!previewBase} onOpenChange={(open) => !open && setPreviewBase(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>{previewBase?.name}</DialogTitle><DialogDescription>{previewBase?.originalFileName || "基础简历"} · {previewBase?.language} · 更新于 {previewBase?.updatedAt.slice(0,10)}</DialogDescription></DialogHeader><pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-2xl border bg-slate-50 p-5 text-sm leading-7">{previewBase?.confirmedContent}</pre>{previewBase?.originalFileName&&<div className="flex justify-end"><Button variant="outline" onClick={() => previewBase && openOriginal(previewBase)}><Download/>{previewBase.originalMime.includes("pdf")?"打开 PDF 原文件":"下载 DOCX 原文件"}</Button></div>}</DialogContent></Dialog>
    <Dialog open={!!previewVersion} onOpenChange={(open) => !open && setPreviewVersion(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>{previewVersion?.title}</DialogTitle><DialogDescription>{previewVersion?.intensity} · {previewVersion?.language} · 更新于 {previewVersion?.updatedAt.slice(0,10)}</DialogDescription></DialogHeader><pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-2xl border bg-slate-50 p-5 text-sm leading-7">{previewVersion?.content}</pre></DialogContent></Dialog>
    <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{deleting?.usageCount ? "暂时不能删除这份简历" : "删除这份简历？"}</AlertDialogTitle><AlertDialogDescription>{deleting?.usageCount ? `“${deleting.title}”正被 ${deleting.usageCount} 条投递记录使用。请先在对应投递记录中更换或取消关联，再回来删除。` : deleting?.kind === "base" && deleting.versionCount ? `删除“${deleting.title}”也会删除由它生成的 ${deleting.versionCount} 个未使用定制版本。此操作无法撤销。` : `“${deleting?.title}”将被永久删除，此操作无法撤销。`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{deleting?.usageCount ? "知道了" : "取消"}</AlertDialogCancel>{!deleting?.usageCount&&<AlertDialogAction disabled={busy} onClick={removeResume} className="bg-rose-600 hover:bg-rose-700">{busy?"删除中…":"确认删除"}</AlertDialogAction>}</AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={!!review} onOpenChange={(value) => !value && setReview(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>检查基础简历解析结果</DialogTitle><DialogDescription>原文件会保留；请先修正解析错位，再确认进入真实经历库。</DialogDescription></DialogHeader>{review && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><Label>版本名称</Label><Input className="mt-1.5" value={review.name} onChange={(event) => setReview({ ...review, name: event.target.value })}/></div><div><Label>语言</Label><Select value={review.language} onValueChange={(value) => setReview({ ...review, language: value })}><SelectTrigger className="mt-1.5 w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="中文">中文</SelectItem><SelectItem value="英文">英文</SelectItem></SelectContent></Select></div></div><Textarea value={review.text} onChange={(event) => setReview({ ...review, text: event.target.value })} className="min-h-[420px] font-mono text-sm"/><div className="flex justify-end"><Button disabled={busy || !review.text.trim()} onClick={saveBase}>{busy ? <Loader2 className="animate-spin"/> : <ShieldCheck/>}确认并保存基础简历</Button></div></div>}</DialogContent></Dialog>
    <Dialog open={optimizer} onOpenChange={setOptimizer}><DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-[1100px]"><DialogHeader><DialogTitle>针对岗位优化简历</DialogTitle><DialogDescription>AI 建议与原简历分开显示。所有改动都需要你审核后才会保存。</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><Label>基础简历</Label><Select value={baseId} onValueChange={setBaseId}><SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="选择基础简历"/></SelectTrigger><SelectContent>{bases.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><Label>目标岗位</Label><Select value={jobId} onValueChange={setJobId}><SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="选择岗位"/></SelectTrigger><SelectContent>{jobs.filter((item) => !item.isDraft).map((item) => <SelectItem key={item.id} value={item.id}>{item.company} · {item.position}</SelectItem>)}</SelectContent></Select></div><div><Label>调整程度</Label><Select value={intensity} onValueChange={setIntensity}><SelectTrigger className="mt-1.5 w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="轻度润色">轻度润色</SelectItem><SelectItem value="结构调整">结构调整</SelectItem></SelectContent></Select></div><div><Label>输出语言</Label><Select value={language} onValueChange={setLanguage}><SelectTrigger className="mt-1.5 w-full"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="中文">中文</SelectItem><SelectItem value="英文">英文</SelectItem></SelectContent></Select></div></div>
      <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><Checkbox checked={consent} onCheckedChange={(value) => setConsent(Boolean(value))}/><span>我同意把去除手机号、邮箱和住址后的简历正文，以及目标岗位 JD，发送给已配置的外部 AI 服务。本次点击只调用一次，失败时不会自动重复扣费。</span></label><div className="flex justify-end"><Button disabled={busy || !job || !base || !consent || !(job.description || job.requirements)} onClick={optimize}>{busy ? <Loader2 className="animate-spin"/> : <Sparkles/>}开始分析</Button></div>
      {(analysis || draft) && <div className="space-y-5"><section className="rounded-2xl border p-4"><h3 className="font-semibold">匹配依据清单</h3>{analysis ? <div className="mt-3 grid gap-2">{analysis.evidence.map((item, index) => <div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm md:grid-cols-[180px_130px_1fr]"><b>{item.requirement}</b><span className={item.level === "有经历支撑" ? "text-emerald-700" : item.level === "暂无证据" ? "text-rose-700" : "text-amber-700"}>{item.level}</span><span className="text-slate-600">{item.resumeEvidence || "未找到依据"}</span></div>)}</div> : <p className="mt-2 text-sm text-amber-700">AI 暂不可用，你仍可在右侧基于真实内容手动调整。</p>}</section>
        {analysis?.suggestions?.length ? <section><h3 className="mb-3 font-semibold">逐条审核建议</h3><div className="space-y-3">{analysis.suggestions.map((suggestion, index) => <article key={suggestion.id || index} className="rounded-2xl border p-4"><div className="grid gap-4 md:grid-cols-2"><div><p className="text-xs font-medium text-slate-400">原文</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{suggestion.original}</p></div><div><p className="text-xs font-medium text-[#08796b]">修改稿</p><Textarea value={suggestion.revised || ""} onChange={(event) => setAnalysis({ ...analysis, suggestions: analysis.suggestions.map((item, i) => i === index ? { ...item, revised: event.target.value } : item) })}/></div></div><div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-900">为什么改：{suggestion.why || "—"}<br/>对应要求：{suggestion.requirement || "—"}<br/>真实依据：{suggestion.evidence || "—"}</div><label className="mt-3 flex items-center gap-2 text-sm"><Checkbox checked={suggestion.accepted !== false} onCheckedChange={(value) => setAnalysis({ ...analysis, suggestions: analysis.suggestions.map((item, i) => i === index ? { ...item, accepted: Boolean(value) } : item) })}/>{suggestion.accepted !== false ? "接受此建议" : "拒绝此建议"}</label></article>)}</div></section> : null}
        <section className="grid gap-4 lg:grid-cols-2"><div><h3 className="mb-2 font-semibold">基础简历原文</h3><pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-2xl border bg-slate-50 p-4 text-sm leading-6">{base?.confirmedContent}</pre></div><div><h3 className="mb-2 font-semibold">岗位定制草稿</h3><Textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-[520px] text-sm leading-6"/></div></section><div className="flex justify-end"><Button disabled={busy || !draft.trim()} onClick={saveVersion}>审核完成，保存为新版本</Button></div>
      </div>}
    </DialogContent></Dialog>
  </div>;
}

function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">{text}</div>; }
function documentWindowAnchor(url: string, filename: string) { const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; return anchor; }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char] || char)); }
