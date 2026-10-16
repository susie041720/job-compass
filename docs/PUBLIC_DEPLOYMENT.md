# 公开演示版发布说明

公开演示版与本地个人版使用同一套界面组件，但数据路径不同：

- 本地个人版使用本机 D1/SQLite 数据库，可以配置 AI、上传简历和保存真实投递记录。
- 公开演示版固定设置 `PUBLIC_DEMO_MODE=true`。投递记录在访客浏览器的 `localStorage` 中操作，不写入服务器；简历和岗位发现使用代码内的虚构样例。
- 公开服务端拒绝新增、编辑、删除、上传、外部抓取和 AI 请求。即使前端被绕过，也不会改动个人数据库。

## 当前仓库与发布关系

当前本地 `main` 分支跟踪的是 `sites/main`，项目通过现有 Sites/Cloudflare Worker 流程显式发布。GitHub 远程仓库 `origin` 是代码展示仓库，目前没有发现“推送 GitHub 后自动部署”的配置。

因此，确认发布后需要分成两个动作：

1. 把审核后的提交推送到 GitHub 的 `main` 分支，更新作品代码和 README。
2. 使用现有 Sites/Cloudflare 项目显式发布公开演示版本。

只推送 GitHub 不会自动更新线上网站。若以后希望改为 GitHub 自动部署，需要另行配置 Cloudflare Git 集成或 GitHub Actions；这属于基础设施变更，应单独确认。

## 费用与限制

演示站可以先使用 Cloudflare Workers Free。Cloudflare 官方价格页在 2026-10-02 更新时列出的免费额度包括：Workers 每天 100,000 次请求；D1 每天读取 500 万行、写入 100,000 行，并提供账户总计 5 GB 存储。静态资源请求免费且不限量。

本演示版的大部分操作发生在浏览器本地，正常作品集访问量通常远低于这些额度。免费额度超出后，请求或数据库操作会失败；不要自动升级到付费计划。Workers Paid 当前最低为每个账户每月 5 美元，只有在确认需要更高额度后再考虑。

官方价格说明：<https://developers.cloudflare.com/workers/platform/pricing/>

使用默认 `workers.dev` 地址不需要购买域名。自定义域名及其注册费用属于可选项，发布本次演示不需要。

## 发布前检查

```bash
npm test
npm run lint
npm run build
```

还需要完成以下人工检查：

- 首页明确写明“虚构数据”和“浏览器本地保存”。
- 新增、编辑、删除、状态更新和筛选都能工作，看板随之变化。
- CSV/Excel 导入先显示列名映射和确认表，重复记录默认跳过，缺字段记录显示待确认。
- CSV 导出触发下载反馈；恢复示例数据后回到 8 条虚构记录。
- 刷新后当前浏览器的修改仍在，新的无痕窗口看不到原窗口数据。
- 简历工作台和岗位发现明确标注为虚构预设示例，不出现上传入口、真实 AI 按钮或实时抓取承诺。
- 手机宽度下可以访问导航、主要操作、岗位卡片和提示信息。
- Git 历史、当前跟踪文件和构建产物中没有 API Key、真实简历、联系方式、真实投递或 HR 信息。

## 构建公开演示版本

沿用现有 Cloudflare D1 绑定，但必须使用一套与个人数据分开的公开数据库。公开数据库可以为空；服务端的只读接口会返回代码内的虚构演示数据，写入接口会被拒绝。

```bash
PUBLIC_DEMO_MODE=true \
CLOUDFLARE_D1_DATABASE_NAME=job-compass-public \
CLOUDFLARE_D1_DATABASE_ID=公开演示数据库ID \
npm run build
```

不要在公开 Worker 中配置 `AI_API_KEY`。不要复用本地个人数据库的 ID。

## 发布

使用现有 Sites 项目发布时，应从已经通过预览确认的同一提交构建。若改用标准 Wrangler 流程，可执行：

```bash
npx wrangler deploy --config dist/server/wrangler.json
```

发布完成后，在无痕窗口重复“发布前检查”，并把最终在线地址补充到 README。发布和 GitHub 推送都应等项目所有者确认预览后进行。

## 安全规则

- GitHub 只保留 `.env.example`，不提交 `.env`。
- 不提交 `.wrangler`、真实 PDF/DOCX、数据库文件或包含个人记录的 CSV。
- 不在前端、浏览器存储、日志、README 或截图中放 API Key。
- 若以后开放真实 AI，需要服务端密钥、输入长度限制、频率限制、账户总用量限制和错误重试保护；本次公开演示不开放真实 AI。
- 若发现历史提交曾包含密钥或个人数据，先吊销密钥并评估影响，再单独决定是否清理 Git 历史，不在未确认时重写历史。
