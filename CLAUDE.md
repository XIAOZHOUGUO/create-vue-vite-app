# CLAUDE.md

## 项目概述

`@qinmoon/create-vue-vite-app` 是一个 Vue 3 + Vite 项目脚手架 CLI。用户通过交互式 prompts 选择功能（TypeScript、Vue Router、Pinia、ESLint、UnoCSS、CSS 预处理器、Git Hooks），CLI 自动生成完整项目。

## 常用命令

- **构建**: `nr build`（tsdown 打包 `src/index.ts` → `dist/index.js`，target: node22）
- **Lint**: `nr lint` / `nr lint:fix`
- **测试**: `nr test`（vitest，`pretest` 先自动 build）
- **单测**: `npx vitest run tests/utils.test.ts`
- **本地调试 CLI**: `node dist/index.js`
- **发布**: `nr release`（预检环境 → `npm version` → 推送 main+tag → 手动 `npm publish`；参数 `major|minor|patch`，`--check` 仅预检）

## 架构

### 入口与流程 (`src/index.ts`)

commander 解析命令行，主流程 `main()`：

1. `promptUserOptions()` — 交互式收集选项（`src/prompts.ts`）
2. `createProject()` + `scaffoldVite()` — 建目录并调用 create-vite 生成基础项目
3. `setupVitePlugins()` — 注入默认 Vite 插件（vue-devtools；TS 项目加 unplugin-auto-import / vue-components）
4. 遍历功能模块（Router/Pinia/ESLint/UnoCSS/GitHooks），各返回 `FeatureResult` 合并
5. 按 `cssOption` 处理 CSS：sass / less / lightningcss
6. `updateMainFile()` — 注入 imports 和 `.use()` 调用到 main.ts/js
7. `setupVSCode()` + `updatePackageJson()` + `installDependencies()`
8. `runPostInstallTasks()` — ESLint 格式化 + Git Hooks(husky) 初始化
9. `generateAndWriteReadme()` — 生成 README

### 功能模块 (`src/core/`)

每个模块导出 `setup*` 函数，签名 `(projectPath, options) => FeatureResult`。`FeatureResult` 含 dependencies、devDependencies、scripts、importsToAdd、usesToAdd、`lint-staged`，由主流程统一合并。

| 文件 | 职责 |
|------|------|
| `eslint.ts` | ESLint + @antfu/eslint-config |
| `git.ts` | Husky + lint-staged + commitlint + commitizen |
| `router.ts` | Vue Router 配置 |
| `pinia.ts` | Pinia 状态管理 |
| `unocss.ts` | UnoCSS 原子化 CSS |
| `lightningcss.ts` | LightningCSS 转换器 + cssMinify |
| `vite-plugins.ts` | 默认 Vite 插件注入（vue-devtools / auto-import / components） |
| `vscode.ts` | VSCode settings.json |
| `readme.ts` | README 生成（EJS 模板） |

### 模板系统 (`templates/`)

- **自定义占位符** (`{{ placeholder }}`) — `copyTemplate()`，空值时移除整行
- **EJS** (`.tpl`) — `renderTemplate()`，用于 README、uno.config、commitlint 等

### 依赖版本清单 (`templates/versions/package.json`)

生成项目注入的所有依赖版本（含 `create-vite` 精确版本）的唯一来源。功能模块只返回包名，`installDependencies()` 通过 `resolveDependencyVersions()` 查表，**未登记的包直接抛错**——新增依赖必须同步登记。create-vite 模板已声明的依赖（如 `@types/node`）保留模板版本。升级：`nr deps:update`（taze，带 7 天成熟期）后跑 `nr test`（E2E 会实际 build 生成的项目）。

### 工具函数 (`src/utils.ts`)

JSON 读写（jsonc-parser 支持注释）、`exec` / `execPromise` 命令执行、`sortObjectKeys`、vite.config 注入（`insertImports` / `appendVitePlugins`）、`copyTemplate` / `renderTemplate`、`validateProjectName`。

## 测试

- `tests/utils.test.ts` — 工具函数单元测试
- `tests/cli.test.ts` — E2E，spawn 子进程模拟交互式 CLI 输入（超时 180s）
- 测试依赖构建产物 `dist/index.js`，修改源码后需先 build

## 技术栈与约定

- **包管理器**: pnpm
- **ESLint**: @antfu/eslint-config（lib 模式，2 空格缩进，单引号）
- **构建**: tsdown（ESM，minify，target node22，输出 `.js`）
- **发布**: `files` 仅包含 `dist/` 和 `templates/`，Node >= 22.22.1
- **本仓库 Git Hooks**: simple-git-hooks + lint-staged（pre-commit 运行 `pnpm lint-staged`）
