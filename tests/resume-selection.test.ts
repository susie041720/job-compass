import test from "node:test";
import assert from "node:assert/strict";
import { applyResumeSelection, resumeSelectionValue, type ResumeOption } from "../lib/resume-selection.ts";

const options: ResumeOption[] = [
  { id: "base-1", type: "base", label: "商业分析基础版", detail: "基础简历", updatedAt: "2026-09-23" },
  { id: "version-1", type: "version", label: "岗位定制版", detail: "岗位定制", updatedAt: "2026-09-23" },
];

test("旧投递记录可以根据已有简历 ID 推断选择类型", () => {
  assert.equal(resumeSelectionValue({ resumeVersion: "商业分析基础版", resumeVersionId: "base-1", resumeSourceType: "" }, options), "base:base-1");
});

test("选择基础简历或定制版本会同时保存名称、ID 和类型", () => {
  const initial = { resumeVersion: "", resumeVersionId: "", resumeSourceType: "" as const, notes: "保留" };
  assert.deepEqual(applyResumeSelection(initial, "version:version-1", options), {
    resumeVersion: "岗位定制版", resumeVersionId: "version-1", resumeSourceType: "version", notes: "保留",
  });
});

test("取消关联会清空简历选择但保留投递的其他字段", () => {
  const current = { resumeVersion: "岗位定制版", resumeVersionId: "version-1", resumeSourceType: "version" as const, status: "已投递" };
  assert.deepEqual(applyResumeSelection(current, "__none", options), {
    resumeVersion: "", resumeVersionId: "", resumeSourceType: "", status: "已投递",
  });
});
