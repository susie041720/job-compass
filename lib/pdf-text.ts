export type PdfTextItem = {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
  width?: number;
};

/** Keep PDF reading order; reconstruct lines without spacing every Chinese glyph. */
export function formatPdfText(items: Array<PdfTextItem | object>): string {
  let result = '';
  let previous: PdfTextItem | undefined;
  for (const item of items) {
    if (!('str' in item) || typeof item.str !== 'string') continue;
    const current = item as PdfTextItem;
    const text = current.str.normalize('NFC');
    if (text && previous && !result.endsWith('\n')) {
      const a = previous.transform, b = current.transform;
      const height = Math.max(Math.abs(a?.[3] || 0), Math.abs(b?.[3] || 0), 1);
      if (a && b && Math.abs(a[5] - b[5]) > height * 0.5) result += '\n';
      else if (!/\s$/.test(result) && !/^\s/.test(text)) {
        const gap = a && b ? b[4] - (a[4] + (previous.width || 0)) : 0;
        const latinWords = /[\p{Script=Latin}\d]$/u.test(result) && /^[\p{Script=Latin}\d]/u.test(text);
        if (gap > height * 0.25 || (!a && latinWords)) result += ' ';
      }
    }
    result += text;
    if (current.hasEOL && !result.endsWith('\n')) result += '\n';
    if (text) previous = current;
  }
  return result.replace(/[ \t]+\n/g, '\n').trim();
}

export function pdfTextWarning(text: string): string {
  if (!text.trim()) return '没有读取到文字：PDF 可能是扫描件或文字已转为图形。请粘贴正确正文，或换用 DOCX；原文件仍会保留。';
  if (/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F\uE000-\uF8FF]/u.test(text)) {
    return '检测到无法识别的字符，PDF 字体可能缺少文字映射。请对照原文件修正正文，或换用 DOCX 后再保存；不要直接将异常文字用于 AI 分析。';
  }
  return '';
}
