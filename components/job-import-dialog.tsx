/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown, FileImage, FileSpreadsheet, Link2, Loader2, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationRecord, STATUSES, emptyApplication } from "@/lib/application";
import { ImportRow, blankImportRow, mergeGroupedRows, parseJobText, parseLinkLines } from "@/lib/job-import";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
  saveOne: (record: ApplicationRecord, keepOpen?: boolean) => Promise<boolean>;
};

type ImageSource = { name: string; dataUrl: string; groupKey: string };
type SheetData = { headers: string[]; rows: unknown[][] };
const mapFields = [
  ["company", "公司名称"], ["position", "岗位名称"], ["category", "岗位类别"], ["location", "工作地点"],
  ["description", "岗位描述"], ["requirements", "任职要求"], ["jobUrl", "岗位链接"], ["source", "信息来源"],
  ["sourceJobId", "岗位 ID"], ["publishedDate", "发布时间"], ["deadline", "截止日期"], ["status", "当前进度"],
  ["appliedDate", "投递日期"], ["channel", "投递渠道"], ["tags", "标签"],
] as const;
const headerAliases: Record<string, string[]> = {
  company: ["公司名称", "公司", "企业"], position: ["岗位名称", "岗位", "职位名称", "职位"], category: ["岗位类别", "类别", "方向"],
  location: ["工作地点", "地点", "城市"], description: ["岗位描述", "职位描述", "JD"], requirements: ["任职要求", "职位要求", "要求"],
  jobUrl: ["岗位链接", "招聘链接", "链接"], source: ["信息来源", "来源"], sourceJobId: ["岗位ID", "职位ID"],
  publishedDate: ["发布时间", "发布日期"], deadline: ["截止日期", "截止时间"], status: ["当前进度", "状态"],
  appliedDate: ["投递日期", "申请日期"], channel: ["投递渠道", "渠道"], tags: ["标签"],
};

async function json(url: string, options?: RequestInit): Promise<any> {
  const response = await fetch(url, options), body: any = await response.json();
  if (!response.ok) throw new Error(body.error || "操作失败");
  return body;
}
const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });

export function JobImportDialog({ open, onOpenChange, onSaved, saveOne }: Props) {
  const [quick, setQuick] = useState<ApplicationRecord>(emptyApplication());
  const [text, setText] = useState(""), [links, setLinks] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]), [images, setImages] = useState<ImageSource[]>([]);
  const [sheet, setSheet] = useState<SheetData | null>(null), [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"source" | "confirm" | "done">("source"), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""), [batchId, setBatchId] = useState(""), [result, setResult] = useState<{ imported: number; failed: number } | null>(null);
  const [bulk, setBulk] = useState({ status: "", appliedDate: "", channel: "", tags: "" });
  const [expanded, setExpanded] = useState(""), [clientToken, setClientToken] = useState(() => crypto.randomUUID());
  const fileRef = useRef<HTMLInputElement>(null);
  const selectedCount = rows.filter((row) => row.selected).length;
  const progress = step === "source" ? 20 : step === "confirm" ? 65 : 100;

  const reset = () => { setQuick(emptyApplication()); setText(""); setLinks(""); setRows([]); setImages([]); setSheet(null); setStep("source"); setMessage(""); setBatchId(""); setResult(null); setClientToken(crypto.randomUUID()); };
  const updateRow = (id: string, key: keyof ImportRow, value: string | boolean) => setRows((old) => old.map((row) => row.tempId === id ? { ...row, [key]: value } : row));
  const addRows = async (next: ImportRow[]) => {
    if (!next.length) { setMessage("没有识别到可确认的资料"); return; }
    setBusy(true);
    try {
      const preview = await json("/api/imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", rows: mergeGroupedRows(next) }) });
      setRows(preview.rows); setStep("confirm"); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "重复检测失败"); }
    finally { setBusy(false); }
  };
  const extractText = () => addRows([...parseJobText(text), ...parseLinkLines(links)]);
  const extractImages = async (onlyNames?: string[]) => {
    const targets = onlyNames ? images.filter((image) => onlyNames.includes(image.name)) : images;
    if (!targets.length) return setMessage("请先选择招聘截图");
    setBusy(true); setMessage("正在提取截图中的岗位信息…");
    try {
      const data = await json("/api/ai/extract-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images: targets }) });
      const extracted = (data.jobs || []).map((job: Record<string, unknown>) => blankImportRow({ ...job, rawText: `来自截图：${(job.sourceNames as string[] || targets.map((x) => x.name)).join("、")}`, originalName: (job.sourceNames as string[] || targets.map((x) => x.name)).join("、"), error: Array.isArray(job.uncertainFields) && job.uncertainFields.length ? `待确认：${job.uncertainFields.join("、")}` : "" }));
      if (onlyNames) {
        const preview = await json("/api/imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", rows: mergeGroupedRows(extracted) }) });
        setRows((old) => [...old.filter((row) => !onlyNames.includes(row.originalName)), ...preview.rows]); setMessage("失败截图已重新提取");
      } else await addRows(extracted);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "截图读取失败";
      if (onlyNames) setMessage(errorText);
      else await addRows(targets.map((image) => blankImportRow({ selected: false, originalName: image.name, groupKey: image.groupKey, rawText: image.dataUrl, error: `读取失败：${errorText}` })));
    } finally { setBusy(false); }
  };
  const loadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files);
    const pictures = selected.filter((file) => file.type.startsWith("image/"));
    if (pictures.length) {
      const offset = images.length;
      const additions = await Promise.all(pictures.map(async (file, index) => ({ name: file.name, dataUrl: await fileToDataUrl(file), groupKey: `岗位-${offset + index + 1}` })));
      setImages((old) => [...old, ...additions]);
    }
    const workbookFile = selected.find((file) => /\.(csv|xlsx|xls)$/i.test(file.name));
    if (workbookFile) {
      try {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(await workbookFile.arrayBuffer(), { type: "array" });
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: false, defval: "" });
        const headers = (matrix[0] || []).map(String), guessed: Record<string, string> = {};
        for (const [field] of mapFields) guessed[field] = headers.find((header) => (headerAliases[field] || []).includes(header.trim())) || "__none";
        setSheet({ headers, rows: matrix.slice(1) }); setMapping(guessed); setMessage(`已读取 ${workbookFile.name}，请确认列名对应关系`);
      } catch { setMessage("表格读取失败，请确认文件未加密且格式为 CSV、XLSX 或 XLS"); }
    }
  };
  const mapSheet = () => {
    if (!sheet) return;
    const converted = sheet.rows.filter((values) => values.some((value) => String(value).trim())).map((values, index) => {
      const data: Record<string, string> = {};
      for (const [field] of mapFields) { const header = mapping[field]; data[field] = header && header !== "__none" ? String(values[sheet.headers.indexOf(header)] ?? "") : ""; }
      return blankImportRow({ ...data, originalName: `表格第 ${index + 2} 行`, rawText: JSON.stringify(data), error: !data.company || !data.position ? "公司或岗位名称待确认，可作为草稿保存" : "" });
    });
    addRows(converted);
  };
  const applyBulk = () => setRows((old) => old.map((row) => row.selected ? { ...row, ...Object.fromEntries(Object.entries(bulk).filter(([, value]) => value)) } : row));
  const commit = async () => {
    if (!selectedCount || busy) return;
    setBusy(true); setMessage("正在逐条保存…");
    try {
      const data = await json("/api/imports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "commit", rows, clientToken, label: `导入 ${selectedCount} 个岗位` }) });
      setBatchId(data.batchId); setResult({ imported: data.imported, failed: data.failed }); setStep("done"); await onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : "批量保存失败"); }
    finally { setBusy(false); }
  };
  const undo = async () => {
    if (!batchId || busy) return;
    setBusy(true);
    try { await json(`/api/imports?batchId=${encodeURIComponent(batchId)}`, { method: "DELETE" }); await onSaved(); setMessage("本次导入已撤销"); setBatchId(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "撤销失败"); }
    finally { setBusy(false); }
  };
  const saveQuick = async (keepOpen: boolean) => {
    const ok = await saveOne(quick, keepOpen);
    if (ok) { setQuick(emptyApplication()); if (!keepOpen) onOpenChange(false); else setMessage("已保存，可以继续新增下一个岗位"); }
  };
  const downloadTemplate = () => {
    const headers = mapFields.map(([, label]) => label).join(",");
    const sample = ["示例公司", "用户运营", "用户运营", "上海", "负责用户增长与数据复盘", "具备数据分析与沟通能力", "https://example.com/job/123", "公司官网", "123", "", "", "待投递", "", "", "运营方向"].map((value) => `"${value}"`).join(",");
    const url = URL.createObjectURL(new Blob([`\uFEFF${headers}\n${sample}\n`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "岗位批量导入模板.csv"; anchor.click(); URL.revokeObjectURL(url);
  };

  return <Dialog open={open} onOpenChange={(value) => { onOpenChange(value); if (!value) reset(); }}><DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-[1100px]">
    <DialogHeader><DialogTitle>新增岗位</DialogTitle><DialogDescription>先保存岗位，再决定是否投递。AI 提取结果只进入确认表，不会直接入库。</DialogDescription></DialogHeader>
    <Progress value={progress} className="h-1.5" />
    {message && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</div>}
    {step === "source" && <Tabs defaultValue="quick"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="quick">快速新增</TabsTrigger><TabsTrigger value="batch">批量导入</TabsTrigger></TabsList>
      <TabsContent value="quick" className="space-y-5 pt-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="公司名称 *" value={quick.company} onChange={(v) => setQuick({ ...quick, company: v })}/><Field label="岗位名称 *" value={quick.position} onChange={(v) => setQuick({ ...quick, position: v })}/><Field label="地点" value={quick.location} onChange={(v) => setQuick({ ...quick, location: v })}/><div><Label>状态</Label><Select value={quick.status} onValueChange={(v) => setQuick({ ...quick, status: v, appliedDate: v === "待投递" ? "" : quick.appliedDate })}><SelectTrigger className="mt-1.5 w-full"><SelectValue/></SelectTrigger><SelectContent>{STATUSES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div></div>
        <details className="rounded-xl border p-4"><summary className="flex cursor-pointer items-center gap-2 font-medium">补充更多信息 <ChevronDown size={16}/></summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="岗位链接" value={quick.jobUrl} onChange={(v) => setQuick({ ...quick, jobUrl: v })}/><Field label="信息来源" value={quick.source} onChange={(v) => setQuick({ ...quick, source: v })}/><Field label="投递日期（可留空）" type="date" value={quick.appliedDate} onChange={(v) => setQuick({ ...quick, appliedDate: v })}/><Field label="投递渠道" value={quick.channel} onChange={(v) => setQuick({ ...quick, channel: v })}/><div className="sm:col-span-2"><Label>岗位 JD</Label><Textarea className="mt-1.5 min-h-28" value={quick.description} onChange={(e) => setQuick({ ...quick, description: e.target.value })}/></div></div></details>
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={!quick.company.trim() || !quick.position.trim()} onClick={() => saveQuick(true)}>保存并继续新增</Button><Button disabled={!quick.company.trim() || !quick.position.trim()} onClick={() => saveQuick(false)}>保存岗位</Button></div>
      </TabsContent>
      <TabsContent value="batch" className="space-y-5 pt-4"><div className="grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border p-4"><div className="flex items-center gap-2 font-semibold"><FileImage size={18}/>截图与表格</div><p className="mt-1 text-sm text-slate-500">支持多张截图，以及 CSV、XLSX、XLS。相同岗位的截图请填写相同合并组。</p><input ref={fileRef} type="file" multiple accept="image/*,.csv,.xlsx,.xls" className="hidden" onChange={(e) => loadFiles(e.target.files)}/><div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={() => fileRef.current?.click()}><Upload/>选择文件</Button><Button variant="ghost" onClick={downloadTemplate}><FileSpreadsheet/>下载 CSV 模板</Button></div>{images.length > 0 && <div className="mt-4 space-y-2">{images.map((image) => <div key={image.name} className="grid grid-cols-[1fr_140px_auto] items-center gap-2 text-sm"><span className="truncate">{image.name}</span><Input value={image.groupKey} aria-label={`${image.name} 合并组`} onChange={(e) => setImages((old) => old.map((x) => x.name === image.name ? { ...x, groupKey: e.target.value } : x))}/><Button size="icon" variant="ghost" onClick={() => setImages((old) => old.filter((x) => x.name !== image.name))}><Trash2 size={15}/></Button></div>)}<p className="text-xs text-amber-700">提取截图会把图片发送给你配置的 AI 服务；请先遮住不需要分析的个人信息。</p><Button disabled={busy} onClick={() => extractImages()}>{busy ? <Loader2 className="animate-spin"/> : <FileImage/>}提取截图</Button></div>}</section>
        <section className="rounded-2xl border p-4"><div className="flex items-center gap-2 font-semibold"><Link2 size={18}/>文字与链接</div><Label className="mt-3 block">岗位文字（岗位之间用 --- 分隔）</Label><Textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-1.5 min-h-28" placeholder={'公司：示例公司\n岗位：用户运营\n地点：上海\n---\n公司：另一家公司…'}/><Label className="mt-3 block">招聘链接（每行一个）</Label><Textarea value={links} onChange={(e) => setLinks(e.target.value)} className="mt-1.5 min-h-20" placeholder="https://…"/><p className="mt-2 text-xs text-slate-500">链接不会绕过登录或验证码读取；无法读取时会保留为草稿，并提示补充截图或文字。</p><Button className="mt-3" disabled={busy || (!text.trim() && !links.trim())} onClick={extractText}><Plus/>生成确认表</Button></section></div>
        {sheet && <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4"><div className="flex items-center gap-2 font-semibold"><FileSpreadsheet size={18}/>确认列名对应关系</div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{mapFields.map(([field, label]) => <div key={field}><Label>{label}</Label><Select value={mapping[field] || "__none"} onValueChange={(value) => setMapping({ ...mapping, [field]: value })}><SelectTrigger className="mt-1 w-full bg-white"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="__none">不导入此列</SelectItem>{sheet.headers.filter(Boolean).map((header) => <SelectItem key={header} value={header}>{header}</SelectItem>)}</SelectContent></Select></div>)}</div><Button className="mt-4" onClick={mapSheet}>进入确认表</Button></section>}
      </TabsContent></Tabs>}
    {step === "confirm" && <div className="space-y-4"><div className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-3"><div><Label>统一状态</Label><Select value={bulk.status || "__keep"} onValueChange={(v) => setBulk({ ...bulk, status: v === "__keep" ? "" : v })}><SelectTrigger className="mt-1 w-32 bg-white"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="__keep">保持原值</SelectItem>{STATUSES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><Field label="统一投递日期" type="date" value={bulk.appliedDate} onChange={(v) => setBulk({ ...bulk, appliedDate: v })}/><Field label="统一渠道" value={bulk.channel} onChange={(v) => setBulk({ ...bulk, channel: v })}/><Field label="统一标签" value={bulk.tags} onChange={(v) => setBulk({ ...bulk, tags: v })}/><Button variant="outline" onClick={applyBulk}>应用到已选 {selectedCount} 行</Button>{rows.some((row) => row.error.startsWith("读取失败") && images.some((image) => image.name === row.originalName)) && <Button variant="outline" disabled={busy} onClick={() => extractImages(rows.filter((row) => row.error.startsWith("读取失败")).map((row) => row.originalName))}><RotateCcw/>只重试失败截图</Button>}</div>
      <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[1000px] text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr>{["选择","公司","岗位","地点","状态","投递日期","渠道","来源","重复处理","资料"].map((x) => <th key={x} className="px-3 py-2 font-medium">{x}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.tempId} className={`border-t align-top ${row.error ? "bg-amber-50/40" : ""}`}><td className="px-3 py-3"><Checkbox checked={row.selected} onCheckedChange={(v) => updateRow(row.tempId, "selected", Boolean(v))}/></td>{(["company","position","location"] as const).map((key) => <td key={key} className="px-2 py-2"><Input value={row[key]} placeholder="待确认" className="min-w-28" onChange={(e) => updateRow(row.tempId, key, e.target.value)}/></td>)}<td className="px-2 py-2"><select value={row.status} className="h-9 rounded-md border bg-white px-2" onChange={(e) => updateRow(row.tempId, "status", e.target.value)}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select></td><td className="px-2 py-2"><Input type="date" value={row.appliedDate} className="min-w-32" onChange={(e) => updateRow(row.tempId, "appliedDate", e.target.value)}/></td><td className="px-2 py-2"><Input value={row.channel} className="min-w-24" onChange={(e) => updateRow(row.tempId, "channel", e.target.value)}/></td><td className="px-2 py-2"><Input value={row.source} className="min-w-24" onChange={(e) => updateRow(row.tempId, "source", e.target.value)}/></td><td className="px-2 py-2">{row.duplicateId ? <div className="min-w-32"><p className="mb-1 text-xs text-amber-700">{row.duplicateReason}</p><select value={row.duplicateAction} className="h-8 rounded-md border bg-white px-2" onChange={(e) => updateRow(row.tempId, "duplicateAction", e.target.value)}><option value="skip">跳过</option><option value="merge">补充已有信息</option><option value="keep">独立保留</option></select></div> : <span className="text-xs text-emerald-700">未发现重复</span>}</td><td className="px-2 py-2"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === row.tempId ? "" : row.tempId)}>对照</Button><Button size="icon" variant="ghost" onClick={() => setRows((old) => old.filter((x) => x.tempId !== row.tempId))}><Trash2 size={14}/></Button></div>{row.error && <p className="mt-1 max-w-48 text-xs text-amber-700">{row.error}</p>}</td></tr>)} </tbody></table></div>
      {expanded && (() => { const row = rows.find((x) => x.tempId === expanded); return row ? <div className="rounded-xl border bg-slate-50 p-4"><p className="font-medium">原始资料 · {row.originalName || "未命名"}</p>{row.rawText.startsWith("data:image/") ? <><span className="sr-only">招聘截图预览</span><img src={row.rawText} alt="招聘截图" className="mt-3 max-h-80 rounded-lg object-contain"/></> : <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-sm text-slate-600">{row.rawText || "无原始文字"}</pre>}</div> : null; })()}
      <div className="flex flex-wrap justify-between gap-3"><Button variant="outline" onClick={() => setStep("source")}>返回补充资料</Button><div className="flex gap-2"><Button variant="ghost" onClick={() => setRows((old) => old.map((x) => ({ ...x, selected: true })))}>全选</Button><Button disabled={!selectedCount || busy} onClick={commit}>{busy ? <Loader2 className="animate-spin"/> : <Check/>}批量保存 {selectedCount} 项</Button></div></div>
    </div>}
    {step === "done" && result && <div className="py-8 text-center"><div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={28}/></div><h3 className="mt-4 text-xl font-semibold">本次导入已完成</h3><p className="mt-2 text-slate-600">成功保存 {result.imported} 项，失败 {result.failed} 项。失败项仍保留在确认表中，可返回后单独重试。</p><div className="mt-6 flex justify-center gap-3">{batchId && <Button variant="outline" disabled={busy} onClick={undo}><RotateCcw/>撤销本次导入</Button>}<Button onClick={() => { reset(); onOpenChange(false); }}>完成</Button></div></div>}
  </DialogContent></Dialog>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <div><Label>{label}</Label><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5"/></div>;
}
