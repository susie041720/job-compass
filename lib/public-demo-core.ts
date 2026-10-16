export const PUBLIC_DEMO_MESSAGE =
  "公开演示版只使用虚构示例数据。投递记录的修改仅保存在当前浏览器，不会写入服务器；请勿上传真实简历或个人资料。";

export function isPublicDemoValue(value?: string) {
  return value === "1" || value?.toLowerCase() === "true";
}
