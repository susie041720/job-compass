export const CSV_HEADERS = ["公司名称","岗位名称","岗位类别","工作地点","招聘类型","岗位描述","任职要求","岗位链接","信息来源","投递日期","截止日期","投递渠道","当前进度","简历版本","备注","公司介绍","面试经验","笔试资料","常见问题","准备笔记","信息更新时间"];
export const CSV_KEYS = ["company","position","category","location","recruitmentType","description","requirements","jobUrl","source","appliedDate","deadline","channel","status","resumeVersion","notes","companyIntro","interviewExperience","writtenTestMaterials","commonQuestions","preparationNotes","updatedAt"];
const escapeCell = (value: unknown) => `"${String(value ?? "").replaceAll('"','""')}"`;
export function toCsv(items: Record<string, unknown>[]) {
  return "\uFEFF" + [CSV_HEADERS.map(escapeCell).join(","), ...items.map(item => CSV_KEYS.map(key => escapeCell(item[key])).join(","))].join("\n");
}
export function parseCsv(text: string): Record<string,string>[] {
  const source=text.replace(/^\uFEFF/,""); const rows:string[][]=[]; let row:string[]=[],cell="",quoted=false;
  for(let i=0;i<source.length;i++){const c=source[i],n=source[i+1];if(c==='"'&&quoted&&n==='"'){cell+='"';i++;}else if(c==='"'){quoted=!quoted;}else if(c===","&&!quoted){row.push(cell);cell="";}else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&n==="\n")i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell="";}else cell+=c;} row.push(cell); if(row.some(Boolean))rows.push(row);
  if(rows.length<2)return []; const headers=rows[0];
  return rows.slice(1).map(values=>Object.fromEntries(CSV_HEADERS.map((header,index)=>[CSV_KEYS[index],values[headers.indexOf(header)]??""]))).filter(x=>x.company&&x.position);
}
