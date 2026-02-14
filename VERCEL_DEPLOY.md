# Vercel 部署指南

本文档说明如何将项目部署到 Vercel 并绑定自定义域名 `www.tritondft.com`。

## 1. 推送到 GitHub

确保代码已推送到 GitHub 仓库：

```bash
git add .
git commit -m "chore: prepare for Vercel deployment"
git push origin main
```

## 2. 从本地 Supabase 迁移到云端 Supabase

⚠️ **重要说明**：如果你之前使用的是本地 Supabase（通过 `supabase start` 启动），部署到 Vercel 时**必须**使用云端的 Supabase 项目，因为 Vercel 无法访问你本地的数据库。

### 2.1 创建云端 Supabase 项目

1. 访问 [Supabase](https://supabase.com/) 并登录（如果没有账号，先注册）
2. 点击 **"New Project"** 创建新项目
3. 填写项目信息：
   - **Name**: 项目名称（如 `chatbot-ui-production`）
   - **Database Password**: 设置数据库密码（请妥善保管）
   - **Region**: 选择离你最近的区域（如 `Southeast Asia (Singapore)`）
4. 点击 **"Create new project"**，等待项目创建完成（约 2 分钟）

### 2.2 获取 Supabase 项目配置

项目创建完成后，获取以下信息：

1. 进入项目 Dashboard
2. 点击左下角的 **"Project Settings"**（齿轮图标）
3. 在 **"General"** 标签页找到：
   - **Reference ID**：这是你的 Project ID（稍后会用到）
4. 切换到 **"API"** 标签页，找到：
   - **Project URL**：这是 `NEXT_PUBLIC_SUPABASE_URL` 的值（如 `https://xxxxx.supabase.co`）
   - **anon public**：这是 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 的值
   - **service_role**：这是 `SUPABASE_SERVICE_ROLE_KEY` 的值（⚠️ 请妥善保管，不要泄露）

### 2.3 配置认证（Auth）

1. 在 Supabase Dashboard 左侧菜单，点击 **"Authentication"**
2. 切换到 **"Providers"** 标签页
3. 确保 **"Email"** 已启用
4. 在 **"Email"** 设置中，建议关闭 **"Confirm email"**（用于个人实例，避免每次登录都要确认邮箱）

### 2.4 迁移数据库结构

将本地数据库的结构和迁移文件推送到云端：

1. 在本地项目根目录打开终端
2. 登录 Supabase CLI：
   ```bash
   supabase login
   ```
3. 链接到云端项目（使用上面获取的 Project ID）：
   ```bash
   supabase link --project-ref <你的-project-id>
   ```
4. 推送数据库迁移到云端：
   ```bash
   supabase db push
   ```
   这会执行所有迁移文件，在云端创建所需的表、函数等。

### 2.5 更新迁移文件中的配置（如果需要）

如果你的迁移文件中有硬编码的本地 Supabase URL，需要更新：

1. 打开 `supabase/migrations/20240108234540_setup.sql`
2. 找到第 53 行的 `project_url` 和第 54 行的 `service_role_key`
3. 如果这些值需要更新，替换为云端 Supabase 的值：
   - `project_url`：使用云端的 **Project URL**
   - `service_role_key`：使用云端的 **service_role** 密钥

### 2.6 迁移数据（可选）

如果你在本地 Supabase 中有重要数据需要迁移：

1. 从本地导出数据：
   ```bash
   supabase db dump -f local_backup.sql
   ```
2. 在云端 Supabase Dashboard → **SQL Editor** 中执行导出的 SQL（或使用其他数据库迁移工具）

**注意**：如果这是新项目，可以跳过数据迁移步骤。

## 3. 在 Vercel 创建项目

1. 访问 [Vercel](https://vercel.com/) 并使用 GitHub 账号登录
2. 点击 **"Add New Project"**
3. 选择你的 GitHub 仓库
4. 框架会自动检测为 **Next.js**，保持默认设置即可：
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (默认)
   - **Output Directory**: `.vercel/output` (默认)
   - **Node Version**: 20 (推荐)

## 4. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

### 必需的环境变量（Supabase）

1. **NEXT_PUBLIC_SUPABASE_URL**
   - 获取方式：Supabase Dashboard → Project Settings → API → Project URL
   - 示例：`https://xxxxx.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - 获取方式：Supabase Dashboard → Project Settings → API → Project API keys → `anon public`
   - 这是公开的匿名密钥，可以暴露在前端

3. **SUPABASE_SERVICE_ROLE_KEY**
   - 获取方式：Supabase Dashboard → Project Settings → API → Project API keys → `service_role`
   - ⚠️ **重要**：这是服务端密钥，请妥善保管，不要泄露

### 可选的环境变量

4. **NEXT_PUBLIC_SITE_URL** (推荐)
   - 设置为：`https://www.tritondft.com`
   - 用于修复 metadataBase 警告和 Open Graph 图片

5. **NEXT_PUBLIC_OLLAMA_URL** (可选)
   - 仅在使用本地 Ollama 模型时需要
   - 默认：`http://localhost:11434`

### API 密钥（可选，用于预配置）

如果要在环境变量中预设 API 密钥（这样用户就不需要在设置中手动输入），可以添加：

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GEMINI_API_KEY`
- `MISTRAL_API_KEY`
- `GROQ_API_KEY`
- `PERPLEXITY_API_KEY`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_GPT_35_TURBO_NAME`
- `AZURE_GPT_45_VISION_NAME`
- `AZURE_GPT_45_TURBO_NAME`
- `AZURE_EMBEDDINGS_NAME`
- `OPENROUTER_API_KEY`
- `DFT_API_KEY`
- `OPENAI_ORGANIZATION_ID`

### 在 Vercel 中添加环境变量

1. 进入项目 → **Settings** → **Environment Variables**
2. 添加每个环境变量：
   - **Key**: 变量名（如 `NEXT_PUBLIC_SUPABASE_URL`）
   - **Value**: 变量值
   - **Environment**: 选择 `Production`, `Preview`, `Development`（建议全选）
3. 点击 **Save**

## 5. 首次部署

配置完环境变量后：

1. 点击 **Deploy** 按钮
2. 等待构建完成（通常 2-5 分钟）
3. 部署成功后，Vercel 会提供一个临时域名（如 `your-project.vercel.app`）

## 6. 绑定自定义域名

### 在 Vercel 中添加域名

1. 进入项目 → **Settings** → **Domains**
2. 在输入框中输入：`www.tritondft.com`
3. 点击 **Add**
4. Vercel 会显示需要配置的 DNS 记录

### 在 Squarespace 配置 DNS

根据 Vercel 显示的 DNS 配置，在 Squarespace 域名设置中添加：

#### 方式 1：使用 CNAME（推荐）

1. 登录 Squarespace
2. 进入 **Settings** → **Domains** → 选择 `tritondft.com`
3. 点击 **DNS Settings**
4. 添加 CNAME 记录：
   - **Type**: CNAME
   - **Host**: `www`
   - **Points to**: `cname.vercel-dns.com`（或 Vercel 显示的 CNAME 值）
   - **TTL**: 3600（默认）

#### 方式 2：如果需要支持裸域（tritondft.com）

如果想让 `tritondft.com`（不带 www）也能访问，需要添加 A 记录：

- **Type**: A
- **Host**: `@` 或留空
- **Points to**: `76.76.21.21`（Vercel 的 IPv4 地址）
- **TTL**: 3600

### 验证域名

1. 回到 Vercel 的 **Domains** 页面
2. 点击域名旁边的 **"Verify"** 按钮
3. 等待 DNS 传播（通常 5 分钟到 1 小时）
4. 验证成功后，Vercel 会自动配置 HTTPS 证书

## 7. 验证部署

1. 访问 `https://www.tritondft.com` 确认网站正常加载
2. 检查 Vercel 的 **Deployments** 页面，确认没有错误
3. 如果遇到问题，查看 **Deployments** → 点击部署 → **Logs** 查看详细错误信息

## 8. 常见问题

### 问题：Supabase 连接错误

**错误信息**：`Your project's URL and Key are required to create a Supabase client!`

**解决方案**：
- 确认 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已正确配置
- 检查环境变量是否已应用到所有环境（Production, Preview, Development）
- 确认使用的是**云端 Supabase** 的 URL 和密钥，而不是本地 Supabase 的值
- 重新部署项目

### 问题：本地 Supabase vs 云端 Supabase

**问题**：我之前用的是本地 Supabase，现在部署到 Vercel 后无法连接。

**原因**：Vercel 部署的应用无法访问你本地的 Supabase 实例（localhost）。

**解决方案**：
- 必须创建并使用云端的 Supabase 项目
- 按照本文档第 2 节的步骤创建云端项目并迁移数据库
- 在 Vercel 环境变量中使用云端 Supabase 的 URL 和密钥

### 问题：metadataBase 警告

**警告信息**：`metadata.metadataBase is not set`

**解决方案**：
- 已修复：代码中已添加 `metadataBase`，使用 `NEXT_PUBLIC_SITE_URL` 或默认值 `https://www.tritondft.com`
- 建议在 Vercel 中设置 `NEXT_PUBLIC_SITE_URL=https://www.tritondft.com`

### 问题：DNS 未生效

**解决方案**：
- 等待 5 分钟到 1 小时（DNS 传播需要时间）
- 使用 `nslookup www.tritondft.com` 检查 DNS 解析
- 确认 Squarespace 的 DNS 记录配置正确

### 问题：构建失败

**解决方案**：
- 查看 Vercel 部署日志中的具体错误
- 确认 Node.js 版本兼容（推荐 Node 20）
- 检查是否有缺失的依赖或环境变量

## 9. 后续更新

每次推送到 GitHub 的 `main` 分支，Vercel 会自动触发新的部署。

你也可以手动触发部署：
1. 进入 Vercel 项目
2. 点击 **Deployments** 标签
3. 点击 **Redeploy** 按钮

---

**提示**：如果遇到其他问题，请查看 Vercel 的 [官方文档](https://vercel.com/docs) 或项目的 README.md。

