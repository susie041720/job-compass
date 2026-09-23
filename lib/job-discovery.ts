import { normalizeUrl } from "./job-import.ts";

export type DiscoveryPreferences = {
  id: string;
  baseResumeId: string;
  preferredCities: string[];
  priorityCities: string[];
  recruitmentTypes: string[];
  targetDirections: string[];
  graduationDate: string;
  availableFrom: string;
  searchStage: string;
  companyPreferences: string[];
  extraKeywords: string[];
  createdAt: string;
  updatedAt: string;
};

export type DiscoveryJobInput = {
  id?: string;
  company?: string;
  position?: string;
  department?: string;
  category?: string;
  location?: string;
  recruitmentType?: string;
  description?: string;
  requirements?: string;
  jobUrl?: string;
  source?: string;
  sourceKind?: string;
  sourceJobId?: string;
  publishedDate?: string;
  deadline?: string;
  graduationRequirement?: string;
  startDate?: string;
  rawText?: string;
  availabilityStatus?: string;
  sourceUpdatedAt?: string;
};

export type MatchResult = {
  score: number;
  confidence: "资料不足" | "初步估算" | "信息较完整";
  eligible: boolean;
  reasons: string[];
  confirmations: string[];
  mismatches: string[];
};

export const defaultDiscoveryPreferences = (now = new Date().toISOString()): DiscoveryPreferences => ({
  id: "default",
  baseResumeId: "",
  preferredCities: [],
  priorityCities: [],
  recruitmentTypes: [],
  targetDirections: [],
  graduationDate: "",
  availableFrom: "",
  searchStage: "",
  companyPreferences: [],
  extraKeywords: [],
  createdAt: now,
  updatedAt: now,
});

const directionGroups: Record<string, string[]> = {
  运营: ["运营", "用户", "内容", "社区", "增长", "活动", "策略", "商业化", "市场"],
  分析: ["分析", "商业分析", "数据分析", "经营分析", "策略", "研究", "洞察", "咨询"],
  产品: ["产品", "产品经理", "产品运营", "需求分析", "用户研究"],
  数据: ["数据", "SQL", "Python", "Excel", "Tableau", "Power BI", "BI", "统计"],
  咨询: ["咨询", "审计", "风险", "交易", "税务", "战略", "行业研究", "专业服务"],
  项目: ["项目", "项目管理", "跨部门", "沟通", "协调", "调研"],
};

const skillTerms = [
  "SQL", "Python", "Excel", "Tableau", "Power BI", "SPSS", "R语言", "数据分析", "商业分析",
  "用户研究", "行业研究", "增长", "内容运营", "用户运营", "策略运营", "项目管理", "英语", "粤语",
];

const norm = (value = "") => value.trim().toLowerCase().replace(/\s+/g, "");
const includesAny = (text: string, terms: string[]) => terms.filter((term) => text.includes(term.toLowerCase()));
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
const cityAliases: Record<string, string[]> = {
  香港: ["香港", "hongkong", "hongkongsar", "kwuntong"],
  深圳: ["深圳", "shenzhen"],
  北京: ["北京", "beijing"],
  上海: ["上海", "shanghai"],
};

function locationIncludesCity(location: string, city: string) {
  const normalizedLocation = norm(location);
  return (cityAliases[city] || [city]).some((alias) => normalizedLocation.includes(norm(alias)));
}

export function discoveryFingerprint(job: DiscoveryJobInput) {
  if (job.source?.trim() && job.sourceJobId?.trim()) return `source:${norm(job.source)}:${norm(job.sourceJobId)}`;
  const url = normalizeUrl(job.jobUrl || "");
  if (url) return `url:${url}`;
  return `identity:${[job.company, job.position, job.location].map((value) => norm(value)).join("|")}`;
}

function explicitRecruitmentMismatch(jobType: string, wanted: string[]) {
  const value = jobType.trim();
  if (!value) return false;
  const wantsIntern = wanted.some((item) => item.includes("实习"));
  const isIntern = /实习/.test(value);
  const isFullTimeOnly = /(社招|正式|全职)/.test(value) && !isIntern;
  return wantsIntern && isFullTimeOnly;
}

function graduationMismatch(requirement: string, graduationDate: string) {
  if (!requirement || !graduationDate) return false;
  const targetYear = graduationDate.slice(0, 4);
  const years: string[] = requirement.match(/20\d{2}/g) || [];
  return years.length > 0 && !years.includes(targetYear);
}

export function calculateDiscoveryMatch(
  job: DiscoveryJobInput,
  preferences: DiscoveryPreferences,
  resumeText = "",
  historyText = "",
  today = new Date(),
): MatchResult {
  const jobText = [job.position, job.department, job.category, job.description, job.requirements].join(" ").toLowerCase();
  const resume = `${resumeText} ${preferences.extraKeywords.join(" ")}`.toLowerCase();
  const reasons: string[] = [], confirmations: string[] = [], mismatches: string[] = [];

  if (job.location && preferences.preferredCities.length) {
    const cityMatches = preferences.preferredCities.some((city) => locationIncludesCity(job.location!, city));
    if (!cityMatches) mismatches.push(`工作地点“${job.location}”不在当前目标城市中`);
    else if (preferences.priorityCities.some((city) => locationIncludesCity(job.location!, city))) reasons.push("位于优先城市");
    else reasons.push("位于可接受城市");
  } else if (!job.location) confirmations.push("工作地点待确认");
  else confirmations.push("目标城市尚未设置");

  if (preferences.recruitmentTypes.length && explicitRecruitmentMismatch(job.recruitmentType || "", preferences.recruitmentTypes)) {
    mismatches.push(`招聘类型“${job.recruitmentType}”与当前实习阶段不符`);
  } else if (!job.recruitmentType) confirmations.push("招聘类型待确认");
  else if (preferences.recruitmentTypes.length) reasons.push("招聘类型符合当前求职阶段");
  else confirmations.push("目标招聘类型尚未设置");

  if (graduationMismatch(job.graduationRequirement || job.requirements || "", preferences.graduationDate)) {
    mismatches.push(`明确的毕业年份要求未包含 ${preferences.graduationDate.slice(0, 4)} 届`);
  } else if (/final[- ]year|应届|毕业年级/i.test(job.graduationRequirement || job.requirements || "") && preferences.graduationDate) {
    confirmations.push(`岗位提到应届或毕业年级学生，你预计 ${preferences.graduationDate.slice(0, 7)} 毕业，请向招聘方确认资格`);
  } else if (!job.graduationRequirement && !/20\d{2}届/.test(job.requirements || "")) {
    confirmations.push("毕业年份要求待确认");
  }

  if (job.deadline && job.deadline < today.toISOString().slice(0, 10)) mismatches.push("岗位截止日期已过");
  if (job.availabilityStatus === "possibly_closed" || job.availabilityStatus === "closed") mismatches.push("岗位可能已经关闭");
  if (job.startDate && preferences.availableFrom && job.startDate < preferences.availableFrom) confirmations.push("到岗时间早于你的最早可到岗日期，请确认是否仍在招聘");
  if (/尽快到岗|立即到岗/.test(job.requirements || "")) confirmations.push("岗位要求尽快到岗，需要确认是否接受 12 月后入职");

  let roleScore = 0;
  const explicitDirections = preferences.targetDirections.map((item) => item.toLowerCase()).filter(Boolean);
  if (explicitDirections.length) {
    const matched = includesAny(jobText, explicitDirections);
    roleScore = Math.min(30, matched.length * 12);
    if (matched.length) reasons.push(`岗位方向符合偏好：${matched.slice(0, 3).join("、")}`);
  } else {
    const supportedGroups = Object.values(directionGroups).filter((terms) => includesAny(resume, terms).length > 0);
    const roleMatches = unique(supportedGroups.flatMap((terms) => includesAny(jobText, terms)));
    roleScore = Math.min(30, roleMatches.length * 5);
    if (roleMatches.length) reasons.push(`简历经历可关联岗位方向：${roleMatches.slice(0, 4).join("、")}`);
  }

  const requiredSkills = unique(includesAny(jobText, skillTerms));
  const matchedSkills = requiredSkills.filter((term) => resume.includes(term.toLowerCase()));
  const skillScore = requiredSkills.length ? Math.round(25 * matchedSkills.length / requiredSkills.length) : 10;
  if (matchedSkills.length) reasons.push(`技能关键词相符：${matchedSkills.slice(0, 4).join("、")}`);
  if (requiredSkills.length && matchedSkills.length < requiredSkills.length) confirmations.push(`部分技能尚未在简历中找到依据：${requiredSkills.filter((term) => !matchedSkills.includes(term)).slice(0, 3).join("、")}`);

  const evidenceTerms = unique(Object.values(directionGroups).flatMap((terms) => includesAny(jobText, terms)));
  const evidenceMatches = evidenceTerms.filter((term) => resume.includes(term.toLowerCase()));
  const evidenceScore = evidenceTerms.length ? Math.min(25, Math.round(25 * evidenceMatches.length / evidenceTerms.length)) : 8;

  const educationTerms = ["商业分析", "商科", "数据", "统计", "管理", "经济", "市场"];
  const jobEducation = includesAny(jobText, educationTerms);
  const educationMatches = jobEducation.filter((term) => resume.includes(term.toLowerCase()));
  const educationScore = jobEducation.length ? Math.round(10 * educationMatches.length / jobEducation.length) : 5;
  if (educationMatches.length) reasons.push(`教育或专业背景相关：${educationMatches.join("、")}`);

  const historyTerms = unique(Object.values(directionGroups).flatMap((terms) => includesAny(jobText, terms)));
  const historyScore = historyTerms.some((term) => historyText.toLowerCase().includes(term.toLowerCase())) ? 5 : 0;

  let freshnessScore = 2;
  if (job.publishedDate) {
    const age = Math.max(0, (today.getTime() - new Date(job.publishedDate).getTime()) / 86_400_000);
    freshnessScore = age <= 7 ? 5 : age <= 30 ? 3 : 1;
    if (age <= 7) reasons.push("发布时间较新");
  } else confirmations.push("发布时间待确认");

  const raw = roleScore + skillScore + evidenceScore + educationScore + historyScore + freshnessScore;
  const score = Math.max(0, Math.min(100, raw - mismatches.length * 18));
  const filled = [job.description, job.requirements, job.location, job.recruitmentType, job.publishedDate].filter(Boolean).length;
  const confidence = !resumeText || filled < 2 ? "资料不足" : filled >= 4 ? "信息较完整" : "初步估算";
  if (!reasons.length) reasons.push("当前资料不足，建议打开详情补充 JD 后再判断");
  return { score, confidence, eligible: mismatches.length === 0, reasons: unique(reasons), confirmations: unique(confirmations), mismatches: unique(mismatches) };
}
