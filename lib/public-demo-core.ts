export const PUBLIC_DEMO_MESSAGE =
  "公开作品展示版只使用虚构示例数据，修改只在当前页面试用，不会保存。请勿上传真实简历或个人资料。";

export function isPublicDemoValue(value?: string) {
  return value === "1" || value?.toLowerCase() === "true";
}
