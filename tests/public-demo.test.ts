import test from "node:test";
import assert from "node:assert/strict";
import { isPublicDemoValue, PUBLIC_DEMO_MESSAGE } from "../lib/public-demo-core.ts";

test("public demo mode only accepts explicit true values", () => {
  assert.equal(isPublicDemoValue("true"), true);
  assert.equal(isPublicDemoValue("TRUE"), true);
  assert.equal(isPublicDemoValue("1"), true);
  assert.equal(isPublicDemoValue("false"), false);
  assert.equal(isPublicDemoValue(undefined), false);
});

test("public demo warning explains persistence and privacy", () => {
  assert.match(PUBLIC_DEMO_MESSAGE, /虚构示例数据/);
  assert.match(PUBLIC_DEMO_MESSAGE, /不会保存/);
  assert.match(PUBLIC_DEMO_MESSAGE, /请勿上传真实简历/);
});
