import test from "node:test";
import assert from "node:assert/strict";
import { blankImportRow, jobFingerprint, mergeGroupedRows, normalizeUrl, parseJobText, parseLinkLines } from "../lib/job-import.ts";
import { assertGroundedDraft, redactPersonalInfo } from "../lib/resume-safety.ts";

test("一次解析 10 份资料时保留缺字段项目供确认", () => {
  const blocks = Array.from({ length: 10 }, (_, index) => index === 8
    ? "公司：缺岗位公司\n地点：上海"
    : `公司：公司${index}\n岗位：岗位${index}\n地点：上海`).join("\n---\n");
  const rows = parseJobText(blocks);
  assert.equal(rows.length, 10);
  assert.match(rows[8].error, /待确认/);
  assert.equal(rows.filter((row) => row.company && row.position).length, 9);
});

test("规范化链接去除追踪参数但保留岗位参数", () => {
  assert.equal(normalizeUrl("https://EXAMPLE.com/jobs/1/?utm_source=x&id=8#top"), "https://example.com/jobs/1?id=8");
});

test("同公司不同岗位不会得到相同指纹", () => {
  const a = jobFingerprint({ company: "示例公司", position: "用户运营", location: "上海" });
  const b = jobFingerprint({ company: "示例公司", position: "商业分析", location: "上海" });
  assert.notEqual(a, b);
});

test("多张同岗位截图按用户指定分组合并", () => {
  const rows = mergeGroupedRows([
    blankImportRow({ groupKey: "A", company: "示例公司", description: "职责第一段", originalName: "1.png" }),
    blankImportRow({ groupKey: "A", position: "用户运营", requirements: "要求第二段", originalName: "2.png" }),
    blankImportRow({ groupKey: "B", company: "示例公司", position: "数据分析", originalName: "3.png" }),
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((row) => row.groupKey === "A")?.position, "用户运营");
  assert.equal(rows.find((row) => row.groupKey === "A")?.requirements, "要求第二段");
});

test("链接无法读取时明确保留待补充原因", () => {
  const rows = parseLinkLines("https://example.com/job/1\nnot-a-url");
  assert.equal(rows.length, 2);
  assert.match(rows[0].error, /补充截图或岗位文字/);
  assert.match(rows[1].error, /格式无效/);
});

test("发送 AI 前隐藏联系方式", () => {
  const output = redactPersonalInfo("邮箱 test@example.com 手机 13812345678 地址：上海市某路 8 号\n教育经历");
  assert.doesNotMatch(output, /test@example.com|13812345678|某路/);
});

test("AI 草稿出现基础简历中没有的数字时拒绝保存", () => {
  assert.doesNotThrow(() => assertGroundedDraft("提升转化率 15%", "转化率提升 15%"));
  assert.throws(() => assertGroundedDraft("负责活动运营", "负责活动运营，提升 30%"), /未经简历确认/);
});
