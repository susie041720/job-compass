import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPdfText, pdfTextWarning } from '../lib/pdf-text.ts';
const item = (str: string, x: number, y: number, hasEOL = false) => ({str, transform: [12, 0, 0, 12, x, y], width: 12, hasEOL});
test('中文逐字文字保留连续字符和换行', () => {
  assert.equal(formatPdfText([item('教',0,100), item('育',12,100,true), item('经',0,80), item('历',12,80)]), '教育\n经历');
});
test('没有 EOL 标记时按基线恢复行，英文单词按间距分隔', () => {
  assert.equal(formatPdfText([item('Data',0,100), item('Analyst',40,100), item('SQL',0,80)]), 'Data Analyst\nSQL');
});
test('忽略标记项但保留同一单词内的紧邻字符', () => {
  assert.equal(formatPdfText([{type:'beginMarkedContent'},item('A',0,100),item('I',12,100)]), 'AI');
});
test('扫描件、替换字符和私用字体编码提示人工核对，正常中英文字不报警', () => {
  assert.ok(pdfTextWarning(''));
  assert.ok(pdfTextWarning('经历\uFFFD'));
  assert.ok(pdfTextWarning('\uE010'));
  assert.equal(pdfTextWarning('教育背景 Education SQL'), '');
});
