import test from "node:test";
import assert from "node:assert/strict";
import { calculateDiscoveryMatch, defaultDiscoveryPreferences, discoveryFingerprint } from "../lib/job-discovery.ts";

test("新环境不会把个人偏好写进代码默认值", () => {
  const preferences = defaultDiscoveryPreferences("2026-09-23T00:00:00.000Z");
  assert.deepEqual(preferences.priorityCities, []);
  assert.deepEqual(preferences.recruitmentTypes, []);
  assert.equal(preferences.graduationDate, "");
  assert.equal(preferences.availableFrom, "");
  assert.deepEqual(preferences.targetDirections, []);
});

test("正式岗位和非目标城市先被硬条件排除", () => {
  const preferences = { ...defaultDiscoveryPreferences(), preferredCities: ["甲城", "乙城"], priorityCities: ["甲城"], recruitmentTypes: ["实习"], graduationDate: "2030-07", availableFrom: "2029-12-01", searchStage: "实习" };
  const result = calculateDiscoveryMatch({
    company: "示例公司", position: "数据分析师", location: "丙城", recruitmentType: "社会招聘全职",
    description: "负责数据分析", requirements: "熟练使用 SQL", publishedDate: "2026-09-20",
  }, preferences, "商业分析专业，熟悉 SQL", "", new Date("2026-09-23T00:00:00Z"));
  assert.equal(result.eligible, false);
  assert.match(result.mismatches.join(" "), /工作地点/);
  assert.match(result.mismatches.join(" "), /招聘类型/);
});

test("缺失硬条件时标记待确认而不是擅自排除", () => {
  const preferences = { ...defaultDiscoveryPreferences(), preferredCities: ["甲城", "乙城"], recruitmentTypes: ["实习"], graduationDate: "2030-07" };
  const result = calculateDiscoveryMatch({
    company: "示例公司", position: "商业分析实习生", description: "协助行业研究和商业分析",
  }, preferences, "商业分析专业，有行业研究项目", "", new Date("2026-09-23T00:00:00Z"));
  assert.equal(result.eligible, true);
  assert.match(result.confirmations.join(" "), /工作地点待确认/);
  assert.match(result.confirmations.join(" "), /招聘类型待确认/);
});

test("英文地点能匹配用户设置的中文目标城市", () => {
  const preferences = { ...defaultDiscoveryPreferences(), preferredCities: ["深圳", "香港"], priorityCities: ["深圳", "香港"], recruitmentTypes: ["实习"] };
  const result = calculateDiscoveryMatch({
    company: "示例公司", position: "Marketing Intern", location: "Kwun Tong, Hong Kong", recruitmentType: "实习", requirements: "Final-year students are welcomed",
  }, { ...preferences, graduationDate: "2028-07" }, "市场分析", "", new Date("2026-09-23T00:00:00Z"));
  assert.equal(result.eligible, true);
  assert.match(result.reasons.join(" "), /优先城市/);
  assert.match(result.confirmations.join(" "), /确认资格/);
});

test("来源岗位 ID 优先于链接和文字生成去重指纹", () => {
  assert.equal(discoveryFingerprint({ source: "腾讯招聘", sourceJobId: "A-123", jobUrl: "https://example.com/a" }), "source:腾讯招聘:a-123");
});
