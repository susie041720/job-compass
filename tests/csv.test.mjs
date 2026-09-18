import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, toCsv } from "../lib/csv.mjs";

test("CSV 导出后可以完整读回逗号、引号和换行", () => {
  const source=[{company:"示例,公司",position:'内容"运营',notes:"第一行\n第二行",status:"已投递"}];
  const parsed=parseCsv(toCsv(source));
  assert.equal(parsed[0].company,"示例,公司");
  assert.equal(parsed[0].position,'内容"运营');
  assert.equal(parsed[0].notes,"第一行\n第二行");
});

test("CSV 会忽略缺少公司或岗位的行", () => {
  const text="公司名称,岗位名称\n示例公司,数据分析\n,用户运营";
  assert.equal(parseCsv(text).length,1);
});
