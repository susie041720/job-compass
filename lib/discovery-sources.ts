import type { DiscoveryJobInput } from "./job-discovery.ts";

export type OfficialJobResult =
  | { status: "ok"; job: DiscoveryJobInput }
  | { status: "closed"; source: string; sourceJobId: string; jobUrl: string };

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

type ByteDanceDetail = {
  id?: string;
  title?: string;
  description?: string;
  requirement?: string;
  publish_time?: number;
  channel_online_status?: number;
  code?: string;
  city_info?: { i18n_name?: string; name?: string };
  city_list?: Array<{ i18n_name?: string; name?: string }>;
  recruit_type?: { i18n_name?: string; name?: string; parent?: { i18n_name?: string; name?: string } };
  job_category?: { i18n_name?: string; name?: string };
};

type GreenhouseDetail = {
  id?: number;
  title?: string;
  content?: string;
  updated_at?: string;
  absolute_url?: string;
  location?: { name?: string };
  departments?: Array<{ name?: string }>;
  metadata?: Array<{ name?: string; value?: unknown }>;
};

const greenhouseBoards: Record<string, { company: string; source: string }> = {
  casetify: { company: "CASETiFY", source: "CASETiFY 官方招聘（Greenhouse）" },
  flowtraders: { company: "Flow Traders", source: "Flow Traders 官方招聘（Greenhouse）" },
};

const bytedanceHost = "jobs.bytedance.com";
const bytedancePath = /^\/campus\/position\/(\d+)\/detail\/?$/;
const greenhouseHost = "job-boards.greenhouse.io";
const greenhousePath = /^\/([a-z0-9_-]+)\/jobs\/(\d+)\/?$/i;

export function parseOfficialJobUrl(value: string) {
  let url: URL;
  try { url = new URL(value.trim()); }
  catch { return null; }
  if (url.protocol !== "https:") return null;
  const bytedanceMatch = url.hostname === bytedanceHost ? url.pathname.match(bytedancePath) : null;
  if (bytedanceMatch) return {
      provider: "bytedance" as const,
      source: "字节跳动招聘官网",
      sourceJobId: bytedanceMatch[1],
      jobUrl: `https://${bytedanceHost}/campus/position/${bytedanceMatch[1]}/detail`,
    };
  const greenhouseMatch = url.hostname === greenhouseHost ? url.pathname.match(greenhousePath) : null;
  const board = greenhouseMatch?.[1]?.toLowerCase();
  const config = board ? greenhouseBoards[board] : undefined;
  if (greenhouseMatch && board && config) return {
    provider: "greenhouse" as const,
    board,
    company: config.company,
    source: config.source,
    sourceJobId: greenhouseMatch[2],
    jobUrl: `https://${greenhouseHost}/${board}/jobs/${greenhouseMatch[2]}`,
  };
  return null;
}

const label = (value?: { i18n_name?: string; name?: string }) => value?.i18n_name?.trim() || value?.name?.trim() || "";
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

export function bytedanceDetailToDiscoveryJob(detail: ByteDanceDetail, jobUrl: string): DiscoveryJobInput {
  const title = detail.title?.trim() || "";
  if (!detail.id || !title) throw new Error("官方页面没有返回完整的岗位名称或岗位 ID");
  const cityList = unique((detail.city_list || []).map(label));
  const location = cityList.join("、") || label(detail.city_info);
  const category = label(detail.job_category) || "其他";
  const recruitmentType = label(detail.recruit_type) || label(detail.recruit_type?.parent);
  const publishedDate = detail.publish_time ? new Date(detail.publish_time).toISOString().slice(0, 10) : "";
  const department = title.includes(" - ") ? title.split(" - ").slice(1).join(" - ").trim() : "";
  const rawText = [detail.description, detail.requirement].filter(Boolean).join("\n\n");
  return {
    company: "字节跳动",
    position: title,
    department,
    category,
    location,
    recruitmentType,
    description: detail.description?.trim() || "",
    requirements: detail.requirement?.trim() || "",
    jobUrl,
    source: "字节跳动招聘官网",
    sourceKind: "official",
    sourceJobId: detail.id,
    publishedDate,
    graduationRequirement: /ByteIntern/.test(rawText) ? "以官网对应招聘项目为准" : "面向在校生，具体毕业年份以官网为准",
    rawText,
    availabilityStatus: detail.channel_online_status === 0 ? "possibly_closed" : "active",
    sourceUpdatedAt: publishedDate,
  };
}

function htmlToText(value = "") {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
  const decodeEntities = (text: string) => text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return entities[entity.toLowerCase()] ?? `&${entity};`;
  });
  return decodeEntities(decodeEntities(value))
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|ul|ol)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function metadataValue(detail: GreenhouseDetail, name: RegExp) {
  const value = detail.metadata?.find((item) => name.test(item.name || ""))?.value;
  return typeof value === "string" ? value.trim() : "";
}

function inferCategory(title: string, department: string) {
  const text = `${title} ${department}`.toLowerCase();
  if (/market|content|brand|growth|community|运营|市场|品牌/.test(text)) return "运营/市场";
  if (/analyt|research|strategy|trading|分析|研究|策略/.test(text)) return "分析/研究";
  if (/product|产品/.test(text)) return "产品";
  if (/design|设计/.test(text)) return "设计";
  return "其他";
}

export function greenhouseDetailToDiscoveryJob(
  detail: GreenhouseDetail,
  parsed: Extract<NonNullable<ReturnType<typeof parseOfficialJobUrl>>, { provider: "greenhouse" }>,
): DiscoveryJobInput {
  const title = detail.title?.trim() || "";
  if (!detail.id || !title) throw new Error("官方页面没有返回完整的岗位名称或岗位 ID");
  const content = htmlToText(detail.content);
  const department = unique((detail.departments || []).map((item) => item.name?.trim() || "")).join("、");
  const employmentType = metadataValue(detail, /employment type/i);
  const recruitmentType = /intern/i.test(title) ? "实习" : employmentType || "待确认";
  const sourceUpdatedAt = detail.updated_at ? new Date(detail.updated_at).toISOString().slice(0, 10) : "";
  const startDate = metadataValue(detail, /start date/i);
  const graduationSentence = content.split(/\n|。/).find((line) => /graduat|毕业/i.test(line) && /20\d{2}/.test(line)) || "";
  return {
    company: parsed.company,
    position: title,
    department,
    category: inferCategory(title, department),
    location: detail.location?.name?.trim() || "",
    recruitmentType,
    description: content,
    requirements: content,
    jobUrl: parsed.jobUrl,
    source: parsed.source,
    sourceKind: "official",
    sourceJobId: String(detail.id),
    graduationRequirement: graduationSentence,
    startDate,
    rawText: content,
    availabilityStatus: "active",
    sourceUpdatedAt,
  };
}

export async function fetchOfficialJob(value: string, fetcher: FetchLike = fetch): Promise<OfficialJobResult> {
  const parsed = parseOfficialJobUrl(value);
  if (!parsed) throw new Error("暂不支持自动读取这个链接，请粘贴 JD 或手动填写；当前支持字节跳动及已验证公司的 Greenhouse 官方岗位链接");
  const endpoint = parsed.provider === "bytedance"
    ? `https://${bytedanceHost}/api/v1/job/posts/${parsed.sourceJobId}?portal_type=3`
    : `https://boards-api.greenhouse.io/v1/boards/${parsed.board}/jobs/${parsed.sourceJobId}`;
  let response: Response;
  try {
    response = await fetcher(endpoint, {
      headers: { Accept: "application/json", "Accept-Language": "zh-CN", "User-Agent": "JobCompass/1.0 (+personal local job tracker)" },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new Error("官网读取超时或暂时不可访问，请稍后重试，或改为粘贴岗位 JD");
  }
  if (response.status === 404 || response.status === 410) return { status: "closed", source: parsed.source, sourceJobId: parsed.sourceJobId, jobUrl: parsed.jobUrl };
  if (!response.ok) throw new Error(`官网返回 ${response.status}，没有写入任何岗位资料`);
  if (parsed.provider === "greenhouse") {
    const detail = await response.json() as GreenhouseDetail;
    return { status: "ok", job: greenhouseDetailToDiscoveryJob(detail, parsed) };
  }
  const body = await response.json() as { code?: number; data?: { job_post_detail?: ByteDanceDetail | null } };
  const detail = body.data?.job_post_detail;
  if (!detail) return { status: "closed", source: parsed.source, sourceJobId: parsed.sourceJobId, jobUrl: parsed.jobUrl };
  return { status: "ok", job: bytedanceDetailToDiscoveryJob(detail, parsed.jobUrl) };
}
