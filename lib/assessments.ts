export const ASSESSMENT_TYPES = ['线上测评（OA）', '笔试', '录制视频面试', 'AI 面试', '真人面试', '群面／Assessment Centre', '其他'] as const;
export type Assessment = { id: string; type: string; round: string; mode: string; scheduledAt: string; deadline: string; link: string; notes: string; outcome: string };
export const emptyAssessment = (): Assessment => ({id: crypto.randomUUID(), type: '真人面试', round: '', mode: '', scheduledAt: '', deadline: '', link: '', notes: '', outcome: '待完成'});
export function validateAssessments(value: unknown): Assessment[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error('考核记录格式不正确，最多保存 100 次考核');
  const ids = new Set<string>();
  return value.map(row => {
    if (!row || typeof row !== 'object') throw new Error('考核记录格式不正确');
    const result = Object.fromEntries(['id','type','round','mode','scheduledAt','deadline','link','notes','outcome'].map(key => {
      const v = row[key];
      if (typeof v !== 'string' || v.length > (key === 'notes' ? 10000 : 2000)) throw new Error('考核字段格式不正确或内容过长');
      return [key,v.trim()];
    })) as Assessment;
    if (!result.id || ids.has(result.id)) throw new Error('考核记录编号缺失或重复');
    ids.add(result.id);
    if (!(ASSESSMENT_TYPES as readonly string[]).includes(result.type)) throw new Error('请选择有效的考核类型');
    if (!['','线上','线下'].includes(result.mode) || !['待完成','已完成','已取消'].includes(result.outcome)) throw new Error('考核形式或完成情况不正确');
    for (const date of [result.scheduledAt,result.deadline]) if (date && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)))) throw new Error('请填写有效的考核时间');
    if (result.link && !/^https?:\/\//i.test(result.link)) throw new Error('考核链接必须以 https:// 或 http:// 开头');
    return result;
  });
}
export function readAssessments(value: string): Assessment[] { return validateAssessments(JSON.parse(value)); }
export const statusLabel = (value: string) => value === '笔试' ? '测评／笔试' : value;
