# 求职航标 Job Compass

一个中文个人求职管理网站，用于集中保存投递记录、追踪进度、整理岗位资料并导入导出 CSV。第一阶段不依赖付费服务，也不需要 AI Key。

## 已完成的 MVP

- 投递记录的新增、编辑和删除
- 八种求职进度与表格内快速更新
- 按关键词、进度、岗位类别、地点筛选，并按更新时间、投递日期、公司排序
- 公司介绍、JD、任职要求、面试经验、笔试资料、常见问题和准备笔记
- CSV 批量导入和筛选结果导出
- 投递总数、回复率、面试率、Offer 数量和阶段分布
- 桌面端和手机端自适应中文界面
- Cloudflare D1 数据库，可在本地和云端运行

## 技术方案

- 前端与服务端：Next.js 16、React 19、TypeScript
- 样式与组件：Tailwind CSS、项目内置 UI 组件
- 数据库：Cloudflare D1（SQLite 兼容）
- 数据访问：Drizzle ORM
- 部署：Cloudflare Workers 兼容构建
- 测试：Node.js 内置测试工具

选择这套方案的原因是：一个代码仓库即可维护前端、接口和数据库；TypeScript 能提前发现字段错误；SQLite 结构直观；目前无需购买服务器或数据库。

## 本地运行

### 1. 安装工具

安装 [Node.js 22 或更高版本](https://nodejs.org/) 和 [Git](https://git-scm.com/downloads)。打开“终端”（Windows 使用 PowerShell），输入：

```bash
node --version
git --version
```

看到版本号就表示安装成功。

### 2. 下载并安装项目

```bash
git clone <你的 GitHub 仓库地址>
cd job-compass
npm install
```

### 3. 建立本地数据库并启动

```bash
npm run db:generate
npm run build
npm start
```

终端显示本地地址后，用浏览器打开它。开发界面时也可以运行 `npm run dev`。

### 4. 检查是否成功

- 首页能看到“求职航标”
- 点击“新增投递”可以填写并保存
- 刷新页面后记录仍然存在
- `npm test` 显示测试通过

## CSV 导入

点击“导入 CSV”，选择 UTF-8 编码的 CSV 文件。可使用 [examples/applications.csv](examples/applications.csv) 作为模板。公司名称和岗位名称为必填项，一次最多导入 500 条。

## 环境变量与隐私

MVP 不需要环境变量。`.env.example` 只为第二阶段预留变量名。不要把真实 API Key、个人简历、手机号、邮箱或私密岗位记录提交到 GitHub。真实的 `.env` 和本地数据库已被 Git 忽略。

## 第二阶段

1. 粘贴岗位链接或 JD，自动识别字段
2. AI 总结职责、要求、匹配点、差距、优先级、简历和面试建议
3. 仅通过公开且允许访问的招聘页面或官方接口收集岗位
4. 去重与匹配度排序
5. 登录和个人数据隔离（公开部署前必须加入）

AI 服务接入前，需要选择供应商并设置消费上限；岗位采集前，需要逐一确认目标网站的公开访问规则。项目不会绕过登录、验证码或反爬机制。

详细产品和数据设计见 [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md)。

## 常用命令

```bash
npm run dev
npm run build
npm start
npm test
npm run db:generate
```
