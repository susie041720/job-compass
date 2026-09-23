# 公开部署说明

本项目的公开作品站与本地个人版使用不同数据库。公开站固定开启只读展示模式，仅加载仓库里的虚构示例数据；真实投递、真实简历和 AI Key 都留在本机。

## 费用与账号

部署目标是 Cloudflare Workers + D1。个人作品站通常可以从免费额度开始，创建时不需要购买套餐。超过免费额度前，应先在 Cloudflare 后台确认价格与用量，不要自行升级付费服务。

需要一个 Cloudflare 账号，并在本机完成一次浏览器授权：

```bash
npx wrangler login
```

## 首次部署

1. 创建一套独立的公开数据库：

```bash
npx wrangler d1 create job-compass-public
```

记录命令返回的 `database_id`，只用于部署配置。

2. 依次执行数据库结构文件：

```bash
npx wrangler d1 execute job-compass-public --remote --file drizzle/0000_useful_fat_cobra.sql
npx wrangler d1 execute job-compass-public --remote --file drizzle/0001_rainy_the_watchers.sql
npx wrangler d1 execute job-compass-public --remote --file drizzle/0002_great_phalanx.sql
npx wrangler d1 execute job-compass-public --remote --file drizzle/0003_job_discovery.sql
npx wrangler d1 execute job-compass-public --remote --file drizzle/0004_dark_power_man.sql
npx wrangler d1 execute job-compass-public --remote --file drizzle/public-demo-seed.sql
```

3. 构建公开只读版本。把示例 ID 替换成第一步返回的值：

```bash
PUBLIC_DEMO_MODE=true \
CLOUDFLARE_D1_DATABASE_NAME=job-compass-public \
CLOUDFLARE_D1_DATABASE_ID=你的_database_id \
npm run build
```

4. 发布到 Cloudflare Workers：

```bash
npx wrangler deploy --config dist/server/wrangler.json
```

发布成功后会得到一个公开的 `workers.dev` 地址。请在无痕窗口验证首页、岗位详情、岗位发现和简历预览，并确认上传和保存操作会显示公开展示版提示。

## 后续更新

修改代码后重新执行第三、四步即可。示例数据有变化时，再执行一次 `public-demo-seed.sql`；其中使用 `INSERT OR IGNORE`，不会因为重复执行而生成重复记录。

## 安全检查

- GitHub 仓库中只保留 `.env.example`，不要提交 `.env`。
- 不要为公开 Worker 配置 `AI_API_KEY`。
- 不要把 `.wrangler`、真实 PDF/DOCX、数据库文件或导出的 CSV 加入 Git。
- 公开展示版的写入保护同时位于页面和服务端；不要仅依赖按钮禁用。
- 发布前检查 Git 历史，确认没有曾经提交过的密钥或个人资料。
