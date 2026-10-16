import { STATUSES, emptyApplication, type ApplicationRecord } from "./application.ts";
import { jobFingerprint, mergeGroupedRows, type ImportRow } from "./job-import.ts";

export const PUBLIC_DEMO_STORAGE_KEY = "job-compass-public-demo-applications-v2";

const seed = (
  id: string,
  company: string,
  position: string,
  category: string,
  location: string,
  status: string,
  appliedDate: string,
  updatedAt: string,
  extra: Partial<ApplicationRecord> = {},
): ApplicationRecord => ({
  ...emptyApplication(),
  id,
  company,
  position,
  category,
  location,
  recruitmentType: "实习",
  status,
  appliedDate,
  source: "公开演示数据",
  channel: appliedDate ? "公司官网" : "",
  jobUrl: `https://example.com/job-compass/${id}`,
  createdAt: updatedAt,
  updatedAt,
  ...extra,
});

export const PUBLIC_DEMO_APPLICATIONS: ApplicationRecord[] = [
  seed("demo-job-1", "星河数据工作室（虚构）", "商业分析实习生", "商业分析", "深圳", "已投递", "2026-10-08", "2026-10-15T09:30:00.000Z", {
    department: "增长策略组",
    description: "协助整理经营数据，搭建周报并支持用户增长专题分析。",
    requirements: "在读本科或硕士；熟悉 Excel 和 SQL；能清晰表达分析结论。",
    companyIntro: "面向生活服务行业提供数据产品的虚构团队。",
    resumeVersion: "商业分析方向一页版（虚构）",
    notes: "演示记录：三天后跟进申请状态。",
  }),
  seed("demo-job-2", "岭南生活科技（虚构）", "用户运营实习生", "用户运营", "深圳", "面试", "2026-10-02", "2026-10-14T07:20:00.000Z", {
    department: "用户增长部",
    description: "参与用户活动策划、社群反馈整理和活动数据复盘。",
    requirements: "每周到岗三天及以上；有内容或社群项目经验；具备基础数据意识。",
    interviewExperience: "示例：围绕一次活动复盘说明目标、动作与改进方向。",
    preparationNotes: "准备一个用户分层方案，并梳理校园活动案例。",
    resumeVersion: "运营方向基础简历（虚构）",
  }),
  seed("demo-job-3", "维港品牌顾问（虚构）", "商业策略实习生", "策略运营", "香港", "等待结果", "2026-09-28", "2026-10-13T11:00:00.000Z", {
    description: "支持市场研究、竞品分析和中英文客户材料整理。",
    requirements: "商业相关专业；中英文沟通良好；能够使用 Excel 整理和解释数据。",
    writtenTestMaterials: "示例图表分析与结构化案例题。",
    commonQuestions: "如何快速了解一个陌生行业？",
  }),
  seed("demo-job-4", "远帆内容实验室（虚构）", "内容策略实习生", "内容运营", "上海", "笔试", "2026-10-05", "2026-10-12T08:40:00.000Z", {
    description: "协助选题研究、内容排期和阅读数据分析，形成每周复盘。",
    requirements: "关注内容趋势；文字表达清晰；能使用表格完成基础分析。",
    notes: "演示记录：线上测评截止 10 月 20 日。",
  }),
  seed("demo-job-5", "北辰研究社（虚构）", "行业研究实习生", "咨询与研究", "北京", "获得Offer", "2026-09-20", "2026-10-10T03:15:00.000Z", {
    description: "收集公开资料、整理专家访谈纪要并协助制作研究简报。",
    requirements: "逻辑清晰，重视事实核查，能够完成中英文资料检索。",
    notes: "演示记录：Offer 仅用于展示统计变化。",
  }),
  seed("demo-job-6", "云桥零售科技（虚构）", "数据分析实习生", "数据分析", "深圳", "待投递", "", "2026-10-09T06:00:00.000Z", {
    description: "分析门店与用户行为数据，协助建立周报和异常监控。",
    requirements: "在校生；熟悉 Excel 或 SQL；每周到岗三天。",
    deadline: "2026-10-31",
  }),
  seed("demo-job-7", "海风产品工作室（虚构）", "产品运营实习生", "产品运营", "香港", "已拒绝", "2026-09-18", "2026-10-08T04:35:00.000Z", {
    description: "整理用户反馈，支持功能上线沟通与数据复盘。",
    requirements: "沟通细致，能够拆解问题并跟进执行。",
  }),
  seed("demo-job-8", "拾光社区（虚构）", "社区运营实习生", "用户运营", "广州", "已结束", "2026-09-10", "2026-10-06T02:10:00.000Z", {
    description: "参与社区活动、用户反馈整理和留存分析。",
    requirements: "有活动或内容经验，具备基础数据意识。",
  }),
];

export const PUBLIC_DEMO_RESUMES = [{
  id: "demo-resume",
  name: "公开演示基础简历（虚构）",
  language: "中文",
  originalFileName: "",
  originalMime: "",
  extractedText: "教育背景：示例大学商业分析硕士（虚构），2028 年毕业。\n项目经历：使用 Excel、SQL 和可视化工具分析匿名电商数据，整理用户分群与运营建议。\n校园经历：策划社团内容活动，负责排期、复盘和跨团队沟通。\n技能：Excel、SQL、Power BI、基础 Python、英文沟通。",
  confirmedContent: "教育背景：示例大学商业分析硕士（虚构），2028 年毕业。\n项目经历：使用 Excel、SQL 和可视化工具分析匿名电商数据，整理用户分群与运营建议。\n校园经历：策划社团内容活动，负责排期、复盘和跨团队沟通。\n技能：Excel、SQL、Power BI、基础 Python、英文沟通。",
  createdAt: "2026-10-01T09:00:00.000Z",
  updatedAt: "2026-10-12T09:00:00.000Z",
  versionCount: 1,
  applicationCount: 2,
}];

export const PUBLIC_DEMO_RESUME_VERSIONS = [{
  id: "demo-resume-version",
  baseResumeId: "demo-resume",
  jobId: "demo-job-1",
  title: "商业分析方向一页版（虚构示例）",
  language: "中文",
  intensity: "结构调整",
  content: "教育背景：示例大学商业分析硕士（虚构），2028 年毕业。\n项目经历：分析匿名电商数据，使用 SQL 完成指标拆解，并通过 Power BI 展示用户分群结果和运营建议。\n校园经历：负责社团内容活动排期、协作和复盘。\n技能：Excel、SQL、Power BI、基础 Python、英文沟通。",
  suggestions: [{
    id: "demo-suggestion",
    original: "使用 Excel、SQL 和可视化工具分析匿名电商数据",
    revised: "分析匿名电商数据，使用 SQL 完成指标拆解，并通过 Power BI 展示用户分群结果和运营建议",
    why: "把方法与输出放在一起，便于核对岗位要求",
    requirement: "熟悉 Excel 和 SQL，能清晰表达分析结论",
    evidence: "仅使用虚构基础简历中已确认的项目和技能",
    accepted: true,
  }],
  jdSnapshot: "协助整理经营数据，搭建周报并支持用户增长专题分析；熟悉 Excel 和 SQL。",
  status: "示例草稿 · 非实时 AI",
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-12T10:00:00.000Z",
  usageCount: 1,
}];

export const PUBLIC_DEMO_RESUME_OPTIONS = [
  { id: "demo-resume", type: "base" as const, label: "公开演示基础简历（虚构）", detail: "基础简历 · 中文", updatedAt: "2026-10-12T09:00:00.000Z" },
  { id: "demo-resume-version", type: "version" as const, label: "商业分析方向一页版（虚构示例）", detail: "岗位定制 · 星河数据工作室（虚构） · 商业分析实习生", updatedAt: "2026-10-12T10:00:00.000Z" },
];

export const PUBLIC_DEMO_DISCOVERY_PREFERENCES = {
  id: "default",
  baseResumeId: "demo-resume",
  preferredCities: ["深圳", "香港", "北京", "上海"],
  priorityCities: ["深圳", "香港"],
  recruitmentTypes: ["实习"],
  targetDirections: [] as string[],
  graduationDate: "2028-07",
  availableFrom: "2027-01",
  searchStage: "实习",
  companyPreferences: ["互联网", "专业服务", "成长型团队"],
  extraKeywords: ["商业分析", "数据分析", "用户运营", "内容运营", "策略运营"],
};

export const PUBLIC_DEMO_DISCOVERY_JOBS = [
  { id: "demo-discovery-1", company: "云桥零售科技（虚构）", position: "数据分析实习生", department: "经营分析部", category: "数据分析", location: "深圳", recruitmentType: "实习", description: "分析门店和用户行为数据，协助建立周报与异常监控。", requirements: "在校生；熟悉 Excel 或 SQL；每周到岗三天。", jobUrl: "https://example.com/job-compass/discovery-data", source: "公开演示岗位库", sourceKind: "demo", sourceJobId: "DISC-DEMO-001", publishedDate: "2026-10-12", deadline: "2026-11-15", graduationRequirement: "2027 至 2029 届在校生", startDate: "2027-01", rawText: "", availabilityStatus: "active", isFavorite: false },
  { id: "demo-discovery-2", company: "维港品牌顾问（虚构）", position: "商业策略实习生", department: "策略咨询组", category: "商业分析", location: "香港", recruitmentType: "实习", description: "支持市场研究、竞品分析和客户汇报材料制作。", requirements: "商业相关专业；中英文沟通；能够使用 Excel 整理和解释数据。", jobUrl: "https://example.com/job-compass/discovery-strategy", source: "公开演示岗位库", sourceKind: "demo", sourceJobId: "DISC-DEMO-002", publishedDate: "2026-10-10", deadline: "2026-11-20", graduationRequirement: "在校生", startDate: "2027-01", rawText: "", availabilityStatus: "active", isFavorite: true },
  { id: "demo-discovery-3", company: "南湾内容科技（虚构）", position: "内容分析实习生", department: "内容策略组", category: "内容运营", location: "深圳", recruitmentType: "实习", description: "研究内容表现，整理选题数据并协助形成策略建议。", requirements: "文字表达清晰；熟悉表格；对内容产品与用户行为感兴趣。", jobUrl: "https://example.com/job-compass/discovery-content", source: "公开演示岗位库", sourceKind: "demo", sourceJobId: "DISC-DEMO-003", publishedDate: "2026-10-08", deadline: "2026-11-10", graduationRequirement: "在校生", startDate: "2027-01", rawText: "", availabilityStatus: "active", isFavorite: false },
  { id: "demo-discovery-4", company: "北辰研究社（虚构）", position: "行业研究实习生", department: "研究组", category: "咨询与研究", location: "北京", recruitmentType: "实习", description: "进行公开资料研究、竞品整理和访谈纪要归纳。", requirements: "商业、经济或数据相关专业；注重事实核查。", jobUrl: "https://example.com/job-compass/discovery-research", source: "公开演示岗位库", sourceKind: "demo", sourceJobId: "DISC-DEMO-004", publishedDate: "2026-10-06", deadline: "2026-12-01", graduationRequirement: "毕业年份不限", startDate: "2027-01", rawText: "", availabilityStatus: "active", isFavorite: false },
];

export function clonePublicDemoApplications() {
  return PUBLIC_DEMO_APPLICATIONS.map((item) => ({ ...item, assessments: item.assessments?.map((entry) => ({ ...entry })) }));
}

export function parsePublicDemoStorage(raw: string | null) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value) || value.length > 500) return null;
    const rows = value.filter((item): item is ApplicationRecord => Boolean(item && typeof item === "object" && typeof item.id === "string" && typeof item.company === "string" && typeof item.position === "string"));
    return rows.length === value.length ? rows : null;
  } catch {
    return null;
  }
}

const findDuplicate = (row: Partial<ImportRow>, existing: ApplicationRecord[]) => {
  if (row.source?.trim() && row.sourceJobId?.trim()) {
    const sourceFingerprint = jobFingerprint(row);
    const exactSource = existing.find((item) => jobFingerprint(item) === sourceFingerprint);
    if (exactSource) return exactSource;
  }
  if (row.jobUrl?.trim()) {
    const urlFingerprint = jobFingerprint({ ...row, source: "", sourceJobId: "" });
    const exactUrl = existing.find((item) => jobFingerprint({ ...item, source: "", sourceJobId: "" }) === urlFingerprint);
    if (exactUrl) return exactUrl;
  }
  const identity = jobFingerprint({ ...row, source: "", sourceJobId: "", jobUrl: "" });
  if (identity === "identity:||") return undefined;
  return existing.find((item) => jobFingerprint({ ...item, source: "", sourceJobId: "", jobUrl: "" }) === identity);
};

export function previewPublicDemoImportRows(rows: ImportRow[], existing: ApplicationRecord[]) {
  const seen = new Map<string, string>();
  return mergeGroupedRows(rows).map((row) => {
    const duplicate = findDuplicate(row, existing);
    if (duplicate) return { ...row, duplicateId: duplicate.id, duplicateReason: "与当前浏览器中的岗位疑似重复", duplicateAction: row.duplicateAction || "skip" };
    const keys = [
      row.source.trim() && row.sourceJobId.trim() ? jobFingerprint(row) : "",
      row.jobUrl.trim() ? jobFingerprint({ ...row, source: "", sourceJobId: "" }) : "",
      jobFingerprint({ ...row, source: "", sourceJobId: "", jobUrl: "" }),
    ].filter((key) => key && key !== "identity:||");
    const earlier = keys.map((key) => seen.get(key)).find(Boolean);
    if (earlier) return { ...row, duplicateId: `batch:${earlier}`, duplicateReason: "与本批次较早的一行疑似重复", duplicateAction: row.duplicateAction || "skip" };
    keys.forEach((key) => seen.set(key, row.tempId));
    return row;
  });
}

const importRecord = (row: ImportRow, now: string): ApplicationRecord => ({
  ...emptyApplication(),
  id: `demo-session-${crypto.randomUUID()}`,
  company: row.company.trim(),
  position: row.position.trim(),
  category: row.category.trim() || "其他",
  location: row.location.trim(),
  recruitmentType: row.recruitmentType.trim() || "实习",
  description: row.description.trim(),
  requirements: row.requirements.trim(),
  jobUrl: row.jobUrl.trim(),
  source: row.source.trim() || "浏览器本地导入",
  sourceJobId: row.sourceJobId.trim(),
  publishedDate: row.publishedDate.trim(),
  deadline: row.deadline.trim(),
  tags: row.tags.trim(),
  rawText: row.rawText,
  appliedDate: row.appliedDate.trim(),
  channel: row.channel.trim(),
  status: STATUSES.includes(row.status as typeof STATUSES[number]) ? row.status : "待投递",
  isDraft: !row.company.trim() || !row.position.trim(),
  createdAt: now,
  updatedAt: now,
});

export function applyPublicDemoImport(current: ApplicationRecord[], rows: ImportRow[], now = new Date().toISOString()) {
  const items = current.map((item) => ({ ...item }));
  const createdByTempId = new Map<string, string>();
  let imported = 0, failed = 0, skipped = 0;
  for (const row of rows.filter((item) => item.selected !== false)) {
    if (!row.company.trim() && !row.position.trim() && /读取失败|解析失败|格式无效/.test(row.error)) { failed++; continue; }
    let duplicateId = row.duplicateId || findDuplicate(row, items)?.id || "";
    if (duplicateId.startsWith("batch:")) duplicateId = createdByTempId.get(duplicateId.slice(6)) || "";
    if (duplicateId && (row.duplicateAction || "skip") === "skip") { skipped++; continue; }
    const incoming = importRecord(row, now);
    if (duplicateId && row.duplicateAction === "merge") {
      const index = items.findIndex((item) => item.id === duplicateId);
      if (index >= 0) {
        const original = items[index];
        const merged = { ...original, updatedAt: now };
        for (const [key, value] of Object.entries(incoming)) {
          if (["id", "createdAt", "updatedAt"].includes(key) || value === "" || value === false) continue;
          const old = merged[key as keyof ApplicationRecord];
          if (!old || (key === "status" && old === "待投递")) (merged as unknown as Record<string, unknown>)[key] = value;
        }
        items[index] = merged;
        imported++;
        continue;
      }
    }
    items.unshift(incoming);
    createdByTempId.set(row.tempId, incoming.id);
    imported++;
  }
  return { items, imported, failed, skipped };
}
