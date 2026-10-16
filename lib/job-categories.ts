export const CATEGORY_GROUPS: Record<string, string[]> = {
  '运营': ['运营', '用户运营', '内容运营', '产品运营', '策略运营', '商业化运营', '电商运营'],
  '分析与策略': ['商业分析', '数据分析', '经营分析', '商业策略'],
  '产品': ['产品经理', '产品助理', 'AI 产品'],
  '市场与增长': ['市场营销', '品牌', '公关', '用户增长'],
  '咨询与研究': ['管理咨询', '行业研究', '用户研究'],
  '财务与专业服务': ['审计', '税务', '财务', '风险咨询'],
  '商务与客户': ['商务拓展', '销售', '客户成功'],
  '其他': ['人力资源', '供应链', '技术', '设计', '其他'],
};
export const ALL_CATEGORIES = Object.values(CATEGORY_GROUPS).flat();
const TERMS: Record<string, string[]> = {
  '用户运营': ['用户运营', '用户分层', '用户留存', '社群运营', 'user operations'],
  '内容运营': ['内容运营', '内容策划', '创作者', 'content operations'],
  '产品运营': ['产品运营', 'product operations'], '策略运营': ['策略运营', 'strategy operations'],
  '商业化运营': ['商业化', '广告运营'], '电商运营': ['电商', 'e-commerce', '店铺运营'],
  '商业分析': ['商业分析', 'business analyst', 'business analysis'],
  '数据分析': ['数据分析', 'data analyst', 'data analysis', 'sql', '数据建模'],
  '经营分析': ['经营分析', '经营指标', '经营预算'], '商业策略': ['商业策略', '战略规划', 'business strategy'],
  '产品经理': ['产品经理', 'product manager', '需求文档'], '产品助理': ['产品助理', '产品实习'],
  'AI 产品': ['ai产品', 'ai 产品', '大模型产品'], '市场营销': ['市场营销', 'marketing', '营销活动'],
  '品牌': ['品牌', 'branding'], '公关': ['公关', 'public relations'], '用户增长': ['用户增长', 'growth', '获客'],
  '管理咨询': ['管理咨询', 'management consulting'], '行业研究': ['行业研究', 'industry research'],
  '用户研究': ['用户研究', 'user research', '用户访谈'], '审计': ['审计', 'audit'], '税务': ['税务', 'tax'],
  '财务': ['财务', 'finance', '会计'], '风险咨询': ['风险咨询', 'risk advisory'],
  '商务拓展': ['商务拓展', 'business development'], '销售': ['销售', 'sales'], '客户成功': ['客户成功', 'customer success'],
  '人力资源': ['人力资源', 'human resources', '招聘专员'], '供应链': ['供应链', 'supply chain'],
  '技术': ['软件开发', 'software engineer', '前端开发', '后端开发'], '设计': ['视觉设计', '交互设计', 'ux designer'],
};
export function suggestCategories(position: string, description = '', requirements = '') {
  const title = position.toLowerCase(), body = `${description}\n${requirements}`.toLowerCase();
  return Object.entries(TERMS).map(([category, words]) => {
    const titleHits = words.filter(word => title.includes(word));
    const bodyHits = words.filter(word => body.includes(word));
    return { category, group: Object.keys(CATEGORY_GROUPS).find(group => CATEGORY_GROUPS[group].includes(category))!,
      evidence: [...new Set([...titleHits, ...bodyHits])], score: titleHits.length * 10 + bodyHits.length };
  }).filter(item => item.score > 0).sort((a,b) => b.score - a.score).slice(0, 3);
}
