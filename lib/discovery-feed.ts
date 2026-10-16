import { AUTOMATIC_SOURCES, type AutomaticSource } from './discovery-catalog.ts';
import { greenhouseDetailToDiscoveryJob, parseOfficialJobUrl } from './discovery-sources.ts';
import { suggestCategories } from './job-categories.ts';
import type { DiscoveryJobInput } from './job-discovery.ts';

type Fetcher = typeof fetch;
type JsonRow = Record<string, unknown>;
const str = (v: unknown) => typeof v === 'string' ? v.trim() : '';
const object = (v: unknown): JsonRow => v && typeof v === 'object' && !Array.isArray(v) ? v as JsonRow : {};
const text = (v: unknown) => str(v).replace(/<\/(?:p|div|li)>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim();
const date = (v: unknown) => { const n = typeof v === 'number' ? v : Date.parse(str(v)); return Number.isFinite(n) ? new Date(n).toISOString().slice(0,10) : ''; };
const internship = (v: string) => /\bintern(?:ship)?\b|实习/i.test(v);

export function feedRowToJob(source: AutomaticSource, value: unknown): DiscoveryJobInput {
  const row = object(value);
  if (source.provider === 'oppo') {
    const id = String(row.idProjPosition || ''), position = str(row.positionName);
    if (!/^\d+$/.test(id) || !position) throw new Error('岗位名称或编号缺失');
    return {
      company: 'OPPO', position, location: str(row.workCityName), department: '',
      category: suggestCategories(position, str(row.positionDesc), str(row.positionRequire))[0]?.category || str(row.positionTypeName) || '其他',
      description: str(row.positionDesc), requirements: str(row.positionRequire),
      recruitmentType: row.recruitmentType === 'Intern' ? '实习' : str(row.recruitmentTypeName),
      graduationRequirement: str(row.graduationRequirement), source: 'OPPO 官方招聘', sourceKind: 'official', sourceJobId: id,
      jobUrl: `https://careers.oppo.com/university/oppo/campus/post/${id}?recruitType=Intern`, publishedDate: date(row.releaseTime),
      rawText: [str(row.projectName), str(row.graduationRequirement), str(row.positionDesc), str(row.positionRequire)].filter(Boolean).join('\n\n'),
      availabilityStatus: 'active',
    };
  }
  if (source.provider === 'greenhouse') {
    const id = String(row.id || '');
    const parsed = parseOfficialJobUrl(`https://job-boards.greenhouse.io/${source.id}/jobs/${id}`);
    if (!parsed || parsed.provider !== 'greenhouse') throw new Error('岗位编号缺失');
    const job=greenhouseDetailToDiscoveryJob(row, parsed);
    // Some boards label senior/contract roles as Intern. Flag conflicting metadata for review.
    if (internship(job.recruitmentType || '') && !internship(job.position || '') && /manager|senior|director|lead|contract|经理|总监/i.test(job.position || '')) {
      job.recruitmentType='待确认';job.availabilityStatus='needs_confirmation';
    }
    return job;
  }
  const cats = object(row.categories), ashby = source.provider === 'ashby';
  const position = str(ashby ? row.title : row.text), id = str(row.id);
  if (!position || !id || !/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('岗位名称或编号缺失');
  const extra = Array.isArray(row.lists) ? row.lists.map(v => {const x=object(v);return [str(x.text),text(x.content)].join('\n');}).join('\n\n') : '';
  const description = ashby ? str(row.descriptionPlain) : [str(row.descriptionPlain),extra,str(row.additionalPlain)].filter(Boolean).join('\n\n');
  if (!description) throw new Error('官网没有返回岗位正文');
  const type = str(ashby ? row.employmentType : cats.commitment);
  const location = ashby ? [str(row.location),...(Array.isArray(row.secondaryLocations) ? row.secondaryLocations.map(x=>str(object(x).location)) : [])].filter(Boolean).join('、') : str(cats.location);
  return {company:source.company,position,location,department:str(ashby ? row.department : cats.team),
    category:suggestCategories(position,description,'')[0]?.category || '其他',
    recruitmentType:internship(`${position} ${type}`) ? '实习' : type || '待确认',
    description,requirements:'',rawText:description,source:`${source.company} 官方招聘（${source.provider}）`,sourceKind:'official',sourceJobId:id,
    jobUrl:`https://${ashby?'jobs.ashbyhq.com':'jobs.lever.co'}/${source.id}/${id}`,
    publishedDate:ashby ? date(row.publishedAt) : '', availabilityStatus:'active'};
}

export function matchesFeedScope(job: DiscoveryJobInput, cities: string[]) {
  // Only explicit internships enter this feed. Missing location remains visible for confirmation.
  if (!internship(`${job.position} ${job.recruitmentType}`)) return false;
  if (!cities.length || !job.location) return true;
  const aliases:Record<string,string[]> = {深圳:['深圳','shenzhen'],香港:['香港','hongkong','kwuntong'],北京:['北京','beijing'],上海:['上海','shanghai']};
  const loc=job.location.toLowerCase().replace(/\s/g,'');
  return cities.some(city=>(aliases[city] || [city.toLowerCase().replace(/\s/g,'')]).some(c=>loc.includes(c)));
}

async function fetchOppoRows(fetcher: Fetcher): Promise<unknown[]> {
  const request = async (path: string, body?: unknown) => {
    const response = await fetcher(`https://careers.oppo.com${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'Tenant-Id': '1000' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'manual', signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`OPPO 官网返回 ${response.status}，请稍后重试`);
    const result = object(await response.json());
    if (result.code !== 0) throw new Error('OPPO 公开列表暂时不可读取，请前往官网');
    return result.data;
  };
  const rawProjects = await request('/openapi/position/project/list');
  if (!Array.isArray(rawProjects)) throw new Error('OPPO 招聘项目格式改变');
  const projects = rawProjects.map(object).filter((project) => project.recruitmentType === 'Intern');
  if (!projects.length) return [];
  const rows: unknown[] = [];
  for (let page = 1; page <= 10; page++) {
    const data = object(await request('/openapi/position/pageNew', {
      pageNum: page, pageSize: 20, positionName: '', positionTypeList: [], workCityCodeList: [], shareId: '',
      projectList: projects.map((project) => ({ projectId: project.idRecruitProject, recruitmentType: 'Intern', isAllNode: 'Y', themeList: [] })),
    }));
    if (!Array.isArray(data.records) || typeof data.pages !== 'number' || data.pages > 10) {
      throw new Error('OPPO 列表不完整或超出本次读取上限，未更新该来源');
    }
    rows.push(...data.records.map((value) => {
      const row = object(value), project = projects.find((item) => item.idRecruitProject === row.projectId);
      return { ...row, graduationRequirement: str(project?.recruitRequire) };
    }));
    if (page >= data.pages) return rows;
  }
  throw new Error('OPPO 列表未完整读取');
}

export async function fetchSourceFeed(source: AutomaticSource, cities: string[], fetcher: Fetcher = fetch) {
  const endpoint = source.provider === 'greenhouse' ? `https://boards-api.greenhouse.io/v1/boards/${source.id}/jobs?content=true`
    : source.provider === 'ashby' ? `https://api.ashbyhq.com/posting-api/job-board/${source.id}` : `https://api.lever.co/v0/postings/${source.id}?mode=json`;
  const response = source.provider === 'oppo' ? null : await fetcher(endpoint,{headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(20_000)});
  if (response && !response.ok) throw new Error(response.status===429 ? '官网限流，请稍后重试' : `官网返回 ${response.status}；可前往官网查看`);
  const body:unknown = response ? await response.json() : await fetchOppoRows(fetcher);
  const values:unknown = source.provider==='lever' || source.provider==='oppo' ? body : object(body).jobs;
  if (!Array.isArray(values)) throw new Error('官网返回格式改变，本次未更新');
  if (values.length>5000) throw new Error('官网列表过大，本次未更新');
  const jobs:DiscoveryJobInput[]=[];const allJobs:DiscoveryJobInput[]=[];const seenIds:string[]=[];let invalid=0;
  for (const value of values) {
    if (object(value).isListed === false) continue;
    try {const row=feedRowToJob(source,value);allJobs.push(row);if(row.sourceJobId) seenIds.push(row.sourceJobId);if(matchesFeedScope(row,cities)) jobs.push(row);} catch { invalid++; }
  }
  return {jobs,allJobs,seenIds,scanned:values.length,invalid};
}

export async function fetchDiscoveryFeeds(cities: string[], fetcher: Fetcher = fetch) {
  return Promise.all(AUTOMATIC_SOURCES.map(async source=>{
    try {return {source,...await fetchSourceFeed(source,cities,fetcher),error:''};}
    catch(error) {return {source,jobs:[] as DiscoveryJobInput[],allJobs:[] as DiscoveryJobInput[],seenIds:[] as string[],scanned:0,invalid:0,error:error instanceof Error?error.message:'官网暂时无法读取'};}
  }));
}

export function sourceOwnsJobUrl(source: AutomaticSource, value: string) {
  try {
    const url=new URL(value);
    if (source.provider === 'oppo') return url.protocol === 'https:' && url.hostname === 'careers.oppo.com'
      && /^\/university\/oppo\/campus\/post\/\d+$/.test(url.pathname) && url.searchParams.get('recruitType') === 'Intern';
    const host=source.provider==='greenhouse'?'job-boards.greenhouse.io':source.provider==='lever'?'jobs.lever.co':'jobs.ashbyhq.com';
    return url.protocol==='https:' && url.hostname===host && url.pathname.startsWith(`/${source.id}/`);
  } catch {return false;}
}
