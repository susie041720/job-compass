import test from "node:test";
import assert from "node:assert/strict";
import { bytedanceDetailToDiscoveryJob, fetchOfficialJob, greenhouseDetailToDiscoveryJob, parseOfficialJobUrl } from "../lib/discovery-sources.ts";

test("只识别允许访问的字节跳动公开岗位链接", () => {
  assert.deepEqual(parseOfficialJobUrl("https://jobs.bytedance.com/campus/position/7683433810375739653/detail?spread=test"), {
    provider: "bytedance", source: "字节跳动招聘官网", sourceJobId: "7683433810375739653",
    jobUrl: "https://jobs.bytedance.com/campus/position/7683433810375739653/detail",
  });
  assert.equal(parseOfficialJobUrl("https://example.com/campus/position/7683433810375739653/detail"), null);
  assert.equal(parseOfficialJobUrl("http://jobs.bytedance.com/campus/position/7683433810375739653/detail"), null);
});

test("只允许已经验证的 Greenhouse 官方公司链接", () => {
  assert.deepEqual(parseOfficialJobUrl("https://job-boards.greenhouse.io/casetify/jobs/5979732004?gh_src=test"), {
    provider: "greenhouse", board: "casetify", company: "CASETiFY", source: "CASETiFY 官方招聘（Greenhouse）",
    sourceJobId: "5979732004", jobUrl: "https://job-boards.greenhouse.io/casetify/jobs/5979732004",
  });
  assert.equal(parseOfficialJobUrl("https://job-boards.greenhouse.io/unknown/jobs/1"), null);
  assert.equal(parseOfficialJobUrl("https://evil.example/casetify/jobs/5979732004"), null);
});

test("Greenhouse 详情转换保留官方链接、原始 JD 和更新时间", () => {
  const parsed = parseOfficialJobUrl("https://job-boards.greenhouse.io/casetify/jobs/5979732004");
  assert.ok(parsed?.provider === "greenhouse");
  const row = greenhouseDetailToDiscoveryJob({
    id: 5979732004, title: "Marketing Intern", content: "&lt;p&gt;Support campaign analysis &amp;amp; operations.&lt;/p&gt;&lt;p&gt;Graduating in 2028.&lt;/p&gt;",
    updated_at: "2026-09-18T01:01:46-04:00", location: { name: "Kwun Tong, Hong Kong" },
    departments: [{ name: "Brand Marketing" }], metadata: [{ name: "Employment Type", value: "Full-time" }],
  }, parsed);
  assert.equal(row.company, "CASETiFY");
  assert.equal(row.recruitmentType, "实习");
  assert.equal(row.location, "Kwun Tong, Hong Kong");
  assert.equal(row.sourceUpdatedAt, "2026-09-18");
  assert.match(row.rawText || "", /analysis & operations/);
  assert.match(row.graduationRequirement || "", /2028/);
});

test("官方详情转换时保留原始 JD、来源和发布时间", () => {
  const row = bytedanceDetailToDiscoveryJob({
    id: "123", title: "策略运营实习生 - 示例业务", description: "负责数据分析", requirement: "在校生，熟悉 Excel",
    publish_time: Date.parse("2026-09-22T00:00:00Z"), channel_online_status: 1,
    city_list: [{ i18n_name: "深圳" }, { i18n_name: "中国香港" }], recruit_type: { i18n_name: "实习" }, job_category: { i18n_name: "运营" },
  }, "https://jobs.bytedance.com/campus/position/123/detail");
  assert.equal(row.company, "字节跳动");
  assert.equal(row.location, "深圳、中国香港");
  assert.equal(row.department, "示例业务");
  assert.equal(row.sourceKind, "official");
  assert.equal(row.publishedDate, "2026-09-22");
  assert.match(row.rawText || "", /熟悉 Excel/);
});

test("读取失败或关闭时不编造岗位内容", async () => {
  const closed = await fetchOfficialJob("https://jobs.bytedance.com/campus/position/123/detail", async () =>
    new Response(JSON.stringify({ code: 0, data: { job_post_detail: null } }), { status: 200 }));
  assert.equal(closed.status, "closed");
  await assert.rejects(() => fetchOfficialJob("https://unknown.example/jobs/1", async () => new Response("{}")), /暂不支持/);
});
