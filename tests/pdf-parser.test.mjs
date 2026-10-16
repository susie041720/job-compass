import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { formatPdfText } from '../lib/pdf-text.ts';

// Synthetic PDF: Chinese CID font requiring the external Adobe CMap,
// without an embedded font or ToUnicode table. Contains no personal data.
function chinesePdf() {
  const stream = 'BT /F1 12 Tf 30 150 Td <655980B280CC666F> Tj 0 -20 Td <987976EE7ECF5386> Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [5 0 R] >>',
    '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

test('真实 PDF 解析器使用本地 CMap 正确读出中文 CID 字体', async () => {
  const original = chinesePdf();
  const snapshot = original.slice();
  const task = getDocument({data: original.slice(), cMapUrl: fileURLToPath(new URL('../node_modules/pdfjs-dist/cmaps/', import.meta.url)), cMapPacked: true});
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    assert.equal(formatPdfText((await page.getTextContent()).items), '教育背景\n项目经历');
    assert.deepEqual(original, snapshot);
  } finally { await task.destroy(); }
});
