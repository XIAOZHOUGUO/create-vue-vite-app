## CLI 脚手架开发回顾与问题解决

今天下午，我们致力于开发一个 Vue 3 CLI 脚手架工具，旨在简化新项目的创建和配置过程。以下是我们遇到的主要问题及其解决方案：

### 1. CLI 项目初始化与入口

*   **问题：** 如何开始一个 CLI 项目，并使其可执行？
*   **解决方案：**
    *   使用 `pnpm init` 初始化 `package.json`。
    *   在 `package.json` 中添加 `bin` 字段，指向我们的入口文件 `index.js`。
    *   创建 `index.js` 文件，并添加 `#!/usr/bin/env node` shebang，使其可作为脚本执行。

### 2. `pnpm link --global` 失败

*   **问题：** 尝试全局链接 CLI 工具时，遇到 `ERR_PNPM_NO_GLOBAL_BIN_DIR` 和 `global bin directory is not in PATH` 错误。
*   **解决方案：**
    *   最初尝试 `pnpm setup` 和手动 `source ~/.zshrc`，但由于 `run_shell_command` 的环境限制，未能直接解决。
    *   最终，我们决定在 CLI 内部不依赖全局链接，而是通过统一依赖安装和 `pnpm exec` 来确保命令的可用性。

### 3. 多次依赖安装导致输出混乱

*   **问题：** 在每个功能模块中（如 Pinia, Vue Router, ESLint, UnoCSS）都执行 `pnpm add`，导致命令行输出冗长且混乱。
*   **解决方案：**
    *   引入 `dependencies` 和 `devDependencies` 数组，将所有功能模块所需的依赖收集起来。
    *   在所有文件生成和配置完成后，统一更新 `package.json`。
    *   最后，只执行一次 `pnpm install` (或 `npm install`) 命令，大大简化了安装过程的输出。

### 4. Husky/Commitlint 命令找不到错误

*   **问题：** 在依赖安装完成之前，`husky init` 和 `commitlint` 命令被调用，导致 `Command "husky" not found` 错误。
*   **解决方案：**
    *   调整了执行顺序：确保 `pnpm install` 在所有依赖（包括 `husky` 和 `commitlint`）写入 `package.json` 并安装完成后才执行。
    *   将 `husky init` 和钩子文件的写入操作放在 `pnpm install` 之后执行。
    *   将 `npx` 命令替换为 `pnpm exec`，以确保在 `pnpm` 环境下正确执行已安装的包命令，避免额外的交互式提示。

### 5. Pinia 集成不完整

*   **问题：** 仅安装了 Pinia 依赖，但未创建示例 store 文件，也未在 `main.ts/js` 中正确集成。
*   **解决方案：**
    *   在 `src/store/index.ts` (或 `.js`) 中创建了一个简单的 Pinia counter store 示例。
    *   修改 `main.ts/js`，导入 `createPinia`，创建 Pinia 实例 (`const pinia = createPinia();`)，并将其注册到 Vue 应用中 (`app.use(pinia);`)，遵循更规范的实践。
    *   为 Pinia store 示例添加了 HMR (Hot Module Replacement) 支持，提升开发体验。

### 6. Vue Router 集成不完整

*   **问题：** 仅安装了 Vue Router 依赖，但未创建路由文件、视图组件，也未在 `main.ts/js` 中正确集成。
*   **解决方案：**
    *   在 `src/router/index.ts` (或 `.js`) 中创建了基础路由配置，包含一个 "Home" 路由。
    *   在 `src/views/` 目录下创建了 `Home.vue` 视图组件。
    *   修改 `main.ts/js`，导入并使用路由 (`app.use(router);`)。
    *   修改 `App.vue`，将默认内容替换为 `<router-view />`。

### 7. TypeScript 文件后缀动态调整

*   **问题：** 生成的文件后缀未能根据用户是否选择 TypeScript 进行动态调整。
*   **解决方案：**
    *   对 `main.ts/js`、`store/index.ts/js`、`router/index.ts/js`、`eslint.config.ts/js` 和 `uno.config.ts/js` 等文件，根据 `response.needsTypeScript` 变量动态设置文件后缀。

### 8. UnoCSS 配置优化

*   **问题：**
    *   UnoCSS 配置文件中使用了 `presetWind` 而非 `presetWind3`。
    *   UnoCSS 预设 (`@unocss/preset-attributify`, `@unocss/preset-wind`) 被错误地作为单独的依赖安装。
    *   UnoCSS 在 `main.ts/js` 中的导入方式不正确 (`import 'uno.css'`)。
    *   UnoCSS 插件未在 `vite.config.ts/js` 中正确添加。
*   **解决方案：**
    *   将 `uno.config` 中的 `presetWind` 更正为 `presetWind3`。
    *   移除了 UnoCSS 预设的单独安装命令，因为它们是 `unocss` 主包的一部分。
    *   将 `main.ts/js` 中的 UnoCSS 导入语句更正为 `import 'virtual:uno.css'`。
    *   修改 `vite.config.ts/js`，确保 `import UnoCSS from 'unocss/vite'` 和 `plugins: [..., UnoCSS(), ...]` 被正确添加。

### 9. VS Code 开发体验优化

*   **问题：**
    *   未自动推荐 ESLint 和 UnoCSS 相关的 VS Code 扩展。
    *   未提供 `settings.json` 配置以优化 ESLint Flat Config 和文件嵌套等。
    *   `.vscode/settings.json` 和 `extensions.json` 可能被 `.gitignore` 忽略。
*   **解决方案：**
    *   在 `.vscode/extensions.json` 中根据用户选择添加 `dbaeumer.vscode-eslint` 和 `antfu.unocss` 推荐。
    *   创建 `.vscode/settings.json`，包含 `eslint.useFlatConfig: true`、文件嵌套模式、禁用默认格式化器等配置。
    *   修改 `.gitignore` 文件处理逻辑，确保 `.vscode/` 目录本身被忽略，但 `extensions.json` 和 `settings.json` 不被忽略，并优化了 `.gitignore` 文件的结构。

### 10. 项目名称重复性检查时机与最终输出

*   **问题：**
    *   项目名称重复性检查发生在所有选项选择之后，用户体验不佳。
    *   最终的成功提示中，项目名称显示为 `undefined`。
*   **解决方案：**
    *   将项目名称的输入和校验逻辑提前到一个独立的 `while` 循环中，确保用户在继续其他配置之前，必须输入一个有效且不重复的项目名称。
    *   确保在最终的成功提示中，正确使用了在初始循环中获取到的 `projectName` 变量。

---