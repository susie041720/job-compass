export type ImportRow = {
  tempId: string;
  selected: boolean;
  company: string;
  position: string;
  category: string;
  location: string;
  recruitmentType: string;
  description: string;
  requirements: string;
  jobUrl: string;
  source: string;
  sourceJobId: string;
  publishedDate: string;
  deadline: string;
  status: string;
  appliedDate: string;
  channel: string;
  tags: string;
  rawText: string;
  originalName: string;
  groupKey: string;
  error: string;
  duplicateId?: string;
  duplicateReason?: string;
  duplicateAction?: "skip" | "merge" | "keep";
};

const FIELD_ALIASES: Record<string, keyof ImportRow> = {
  公司: "company", 公司名称: "company", 企业: "company",
  岗位: "position", 职位: "position", 岗位名称: "position", 职位名称: "position",
  地点: "location", 工作地点: "location", 城市: "location",
  岗位类别: "category", 方向: "category", 职位类别: "category",
  招聘类型: "recruitmentType", 类型: "recruitmentType",
  岗位描述: "description", 工作职责: "description", 职位描述: "description", JD: "description",
  任职要求: "requirements", 职位要求: "requirements", 要求: "requirements",
  链接: "jobUrl", 岗位链接: "jobUrl", 招聘链接: "jobUrl",
  来源: "source", 信息来源: "source",
  岗位ID: "sourceJobId", 职位ID: "sourceJobId",
  发布时间: "publishedDate", 发布日期: "publishedDate",
  截止日期: "deadline", 截止时间: "deadline",
  状态: "status", 当前进度: "status",
  投递日期: "appliedDate", 申请日期: "appliedDate",
  渠道: "channel", 投递渠道: "channel",
  标签: "tags",
};

export function normalizeUrl(value: string) {
  const input = value.trim();
  if (!input) return "";
  try {
    const url = new URL(input);
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "spm", "from"].forEach((key) => url.searchParams.delete(key));
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString().replace(/\?$/, "");
  } catch {
    return input.toLowerCase().replace(/\/$/, "");
  }
}

export function jobFingerprint(row: Partial<ImportRow>) {
  if (row.source?.trim() && row.sourceJobId?.trim()) return `source:${row.source.trim().toLowerCase()}:${row.sourceJobId.trim().toLowerCase()}`;
  const url = normalizeUrl(row.jobUrl || "");
  if (url) return `url:${url}`;
  return `identity:${[row.company, row.position, row.location].map((x) => (x || "").trim().toLowerCase().replace(/\s+/g, "")).join("|")}`;
}

export function blankImportRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    tempId: crypto.randomUUID(), selected: true, company: "", position: "", category: "其他",
    location: "", recruitmentType: "校招", description: "", requirements: "", jobUrl: "",
    source: "", sourceJobId: "", publishedDate: "", deadline: "", status: "待投递",
    appliedDate: "", channel: "", tags: "", rawText: "", originalName: "", groupKey: "",
    error: "", duplicateAction: "skip", ...overrides,
  };
}

export function splitJobText(input: string) {
  const cleaned = input.trim();
  if (!cleaned) return [];
  const explicit = cleaned.split(/\n\s*(?:---+|===+|#{3,}\s*新岗位)\s*\n/g).map((x) => x.trim()).filter(Boolean);
  if (explicit.length > 1) return explicit;
  const numbered = cleaned.split(/\n(?=(?:岗位|职位)\s*[一二三四五六七八九十\d]+\s*[：:、])/g).map((x) => x.trim()).filter(Boolean);
  return numbered.length > 1 ? numbered : [cleaned];
}

function inferCategory(position: string, text: string) {
  const value = `${position} ${text}`;
  if (/用户运营/.test(value)) return "用户运营";
  if (/内容|新媒体|编辑/.test(value)) return "内容运营";
  if (/策略运营/.test(value)) return "策略运营";
  if (/商业分析|经营分析|业务分析/.test(value)) return "商业分析";
  if (/数据分析|BI|SQL/.test(value)) return "数据分析";
  if (/运营/.test(value)) return "运营";
  return "其他";
}

export function parseJobText(input: string): ImportRow[] {
  return splitJobText(input).map((block) => {
    const row = blankImportRow({ rawText: block, originalName: "粘贴文字" });
    const lines = block.split(/\r?\n/);
    let activeLongField: "description" | "requirements" | null = null;
    for (const sourceLine of lines) {
      const line = sourceLine.trim();
      if (!line) continue;
      const match = line.match(/^([^：:]{1,12})[：:]\s*(.*)$/);
      if (match) {
        const key = FIELD_ALIASES[match[1].replace(/\s/g, "")];
        if (key) {
          const value = match[2].trim();
          (row as unknown as Record<string, unknown>)[key] = value;
          activeLongField = key === "description" || key === "requirements" ? key : null;
          continue;
        }
      }
      const url = line.match(/https?:\/\/\S+/)?.[0];
      if (url && !row.jobUrl) row.jobUrl = url.replace(/[),，。]+$/, "");
      else if (activeLongField) row[activeLongField] = [row[activeLongField], line].filter(Boolean).join("\n");
    }
    if (!row.source && row.jobUrl) {
      try { row.source = new URL(row.jobUrl).hostname.replace(/^www\./, ""); } catch { /* keep blank */ }
    }
    row.category = inferCategory(row.position, block);
    if (!row.company || !row.position) row.error = "公司或岗位名称待确认，可作为草稿保存";
    return row;
  });
}

export function parseLinkLines(input: string): ImportRow[] {
  return input.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).map((jobUrl) => {
    let source = "";
    let error = "链接内容未自动读取，请补充截图或岗位文字";
    try { source = new URL(jobUrl).hostname.replace(/^www\./, ""); }
    catch { error = "链接格式无效"; }
    return blankImportRow({ jobUrl, source, originalName: "链接", error });
  });
}

export function mergeGroupedRows(rows: ImportRow[]) {
  const result: ImportRow[] = [];
  const groups = new Map<string, ImportRow>();
  for (const row of rows) {
    if (!row.groupKey) { result.push(row); continue; }
    const current = groups.get(row.groupKey);
    if (!current) { groups.set(row.groupKey, { ...row }); continue; }
    const merged = { ...current };
    for (const key of Object.keys(row) as (keyof ImportRow)[]) {
      if (["tempId", "selected", "groupKey", "duplicateAction"].includes(key)) continue;
      const incoming = row[key];
      const existing = merged[key];
      if (typeof incoming === "string" && incoming.trim()) {
        if ((key === "rawText" || key === "description" || key === "requirements") && typeof existing === "string" && existing.trim() && !existing.includes(incoming)) {
          (merged as unknown as Record<string, unknown>)[key] = `${existing}\n\n${incoming}`;
        } else if (!existing) (merged as unknown as Record<string, unknown>)[key] = incoming;
      }
    }
    groups.set(row.groupKey, merged);
  }
  return [...result, ...groups.values()];
}
