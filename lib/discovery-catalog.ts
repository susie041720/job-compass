/** Official entry points verified 2026-10-09. Directory entries are not live job feeds. */
export const COMPANY_DIRECTORY = [
  { company: '腾讯', url: 'https://join.qq.com/', note: '国内实习入口；暂需官网筛选并导入 JD' },
  { company: '美团', url: 'https://job.meituan.com/web/campus', note: '校园与实习；暂需手动导入' },
  { company: '得物', url: 'https://careers.dewu.com/', note: '暂需官网筛选工作地点并导入' },
  { company: '小红书', url: 'https://job.xiaohongshu.com/campus/theme', note: '含深圳岗位筛选；暂需手动导入' },
  { company: '字节跳动', url: 'https://jobs.bytedance.com/campus/', note: '支持单条官网链接读取；列表暂需手动筛选' },
  { company: '大疆', url: 'https://careers.dji.com/zh-CN/', note: '深圳科技公司；暂需手动导入' },
  { company: '安克创新', url: 'https://career.anker.com.cn/universities/recruitment/new/', note: '请区分实习与毕业生岗位；暂需手动导入' },
  { company: 'Klook 客路', url: 'https://www.klookcareers.com/', note: '香港互联网旅游平台；暂需手动导入' },
  { company: '华为', url: 'https://career.huawei.com/', note: '深圳及全国实习；暂需官网筛选并导入' },
  { company: 'vivo', url: 'https://hr.vivo.com/index.html', note: '产品、运营、市场等岗位；暂需手动导入' },
  { company: '携程集团', url: 'https://careers.ctrip.com/', note: '互联网旅游与国际业务；暂需手动导入' },
  { company: '哔哩哔哩', url: 'https://www.bilibili.com/blackboard/join-list.html', note: '内容平台岗位；暂需手动导入' },
  { company: '汇丰', url: 'https://www.hsbc.com/careers/students-and-graduates/find-a-programme', note: '香港实习项目；暂需官网筛选并导入' },
  { company: '毕马威 KPMG', url: 'https://kpmg.com/cn/zh/careers/campus/basecamp.html', note: '香港及内地实习项目；暂需手动导入' },
  { company: 'Animoca Brands', url: 'https://careers.animocabrands.com/jobs', note: '香港科技与 Web3 公司；当前实习以官网为准' },
] as const;

export const AUTOMATIC_SOURCES = [
  { id: 'oppo', company: 'OPPO', provider: 'oppo', url: 'https://careers.oppo.com/campus' },
  { id: 'casetify', company: 'CASETiFY', provider: 'greenhouse', url: 'https://job-boards.greenhouse.io/casetify' },
  { id: 'flowtraders', company: 'Flow Traders', provider: 'greenhouse', url: 'https://job-boards.greenhouse.io/flowtraders' },
  { id: 'lalamove', company: 'Lalamove 货拉拉', provider: 'lever', url: 'https://www.lalamove.com/career-listing?type=department' },
  { id: 'ekimetrics', company: 'Ekimetrics', provider: 'lever', url: 'https://www.ekimetrics.com/join-ekimetrics' },
  { id: 'airwallex', company: 'Airwallex 空中云汇', provider: 'ashby', url: 'https://careers.airwallex.com/jobs/' },
] as const;
export type AutomaticSource = typeof AUTOMATIC_SOURCES[number];
