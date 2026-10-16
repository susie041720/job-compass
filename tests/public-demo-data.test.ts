import test from "node:test";
import assert from "node:assert/strict";
import { applyPublicDemoImport, clonePublicDemoApplications, parsePublicDemoStorage, previewPublicDemoImportRows } from "../lib/public-demo-data.ts";
import { blankImportRow } from "../lib/job-import.ts";

test("公开演示种子全部是虚构公司和示例链接", () => {
  const items = clonePublicDemoApplications();
  assert.ok(items.length >= 8);
  assert.ok(items.every((item) => item.company.includes("虚构")));
  assert.ok(items.every((item) => !item.jobUrl || new URL(item.jobUrl).hostname === "example.com"));
});

test("演示版本地存储只接受结构完整且数量受限的记录", () => {
  const source = clonePublicDemoApplications();
  assert.equal(parsePublicDemoStorage(JSON.stringify(source))?.length, source.length);
  assert.equal(parsePublicDemoStorage("not json"), null);
  assert.equal(parsePublicDemoStorage(JSON.stringify([{ id: "x" }])), null);
  assert.equal(parsePublicDemoStorage(JSON.stringify(Array.from({ length: 501 }, () => source[0]))), null);
});

test("演示版批量导入会提示重复、允许跳过并保留有效行", () => {
  const existing = clonePublicDemoApplications();
  const duplicate = blankImportRow({ company: existing[0].company, position: existing[0].position, location: existing[0].location });
  const valid = blankImportRow({ company: "新增虚构公司", position: "运营实习生", location: "深圳", status: "已投递" });
  const broken = blankImportRow({ selected: true, error: "读取失败：文件损坏" });
  const preview = previewPublicDemoImportRows([duplicate, valid, broken], existing);
  assert.equal(preview[0].duplicateAction, "skip");
  const result = applyPublicDemoImport(existing, preview, "2026-10-16T00:00:00.000Z");
  assert.equal(result.imported, 1);
  assert.equal(result.skipped, 1);
  assert.equal(result.failed, 1);
  assert.equal(result.items[0].company, "新增虚构公司");
});
