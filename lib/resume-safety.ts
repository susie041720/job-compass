export function redactPersonalInfo(text: string) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[邮箱已隐藏]")
    .replace(/(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g, "[手机号已隐藏]")
    .replace(/(?:住址|地址)[：:]?[^\n]{4,40}/g, "地址：[已隐藏]");
}

export function ungroundedNumbers(source: string, draft: string) {
  const token = /(?<![\p{L}\d])\d+(?:[.,]\d+)?%?(?![\p{L}\d])/gu;
  const known = new Set(source.match(token) || []);
  return [...new Set(draft.match(token) || [])].filter((value) => !known.has(value));
}

export function assertGroundedDraft(source: string, draft: string) {
  const unsupported = ungroundedNumbers(source, draft);
  if (unsupported.length) throw new Error(`AI 草稿出现未经简历确认的数字：${unsupported.join("、")}`);
}
