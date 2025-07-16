#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const prompts = require("prompts");
const { red, green, bold } = require("kolorist");
const { execSync } = require("child_process");

// =================================================================
// #region 辅助函数
// =================================================================

/**
 * 执行一个 shell 命令，并包含错误处理和日志记录。
 * @param {string} command 要执行的命令。
 * @param {import('child_process').ExecSyncOptions} options 执行选项。
 */
function exec(command, options) {
  try {
    execSync(command, { stdio: "inherit", ...options });
  } catch (e) {
    console.error(red(`✖ 命令执行失败: ${command}`));
    console.error(red(e));
    process.exit(1);
  }
}

/**
 * 读取并解析一个 JSON 文件，会先移除文件中的注释。
 * @param {string} filePath JSON 文件的路径。
 * @returns {object} 解析后的 JSON 对象。
 */
function readJsonFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  // 移除JSON文件中的注释，以便JSON.parse可以正确工作
  const contentWithoutComments = content.replace(/\/\/.*|\/\*[^]*?\*\//g, "");
  return JSON.parse(contentWithoutComments);
}

/**
 * 将一个对象写入 JSON 文件。
 * @param {string} filePath JSON 文件的路径。
 * @param {object} data 要写入的对象。
 */
function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * 按字母顺序对对象的键进行排序。
 * @param {object} obj 要排序的对象。
 * @returns {object} 排序后的对象。
 */
function sortObjectKeys(obj) {
  if (!obj) return {};
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
}

// #endregion

// =================================================================
// #region 核心逻辑
// =================================================================

/**
 * 提示用户输入项目配置选项。
 * @returns {Promise<object>} 一个解析为用户所选选项的 Promise。
 */
async function promptUserOptions() {
  const { projectName } = await prompts({
    type: "text",
    name: "projectName",
    message: "项目名称:",
    initial: "vite-demo",
    validate: (name) => {
      if (!name) return "项目名称不能为空。";
      const targetPath = path.join(process.cwd(), name);
      if (fs.existsSync(targetPath)) {
        return `目录 ${targetPath} 已存在，请选择其他名称。`;
      }
      return true;
    },
  });

  const options = await prompts([
    {
      type: "select",
      name: "packageManager",
      message: "选择包管理器:",
      choices: [
        { title: "pnpm", value: "pnpm" },
        { title: "npm", value: "npm" },
      ],
      initial: 0,
    },
    {
      type: "confirm",
      name: "needsTypeScript",
      message: "是否需要 TypeScript?",
      initial: true,
    },
    {
      type: "confirm",
      name: "needsRouter",
      message: "是否需要 Vue Router?",
      initial: true,
    },
    {
      type: "confirm",
      name: "needsPinia",
      message: "是否需要 Pinia?",
      initial: true,
    },
    {
      type: "confirm",
      name: "needsEslint",
      message: "是否需要 ESLint 用于代码质量检查?",
      initial: true,
    },
    {
      type: "select",
      name: "cssPreprocessor",
      message: "选择 CSS 预处理器:",
      choices: [
        { title: "无", value: "none" },
        { title: "Sass", value: "sass" },
        { title: "Less", value: "less" },
      ],
      initial: 0,
    },
    {
      type: "confirm",
      name: "needsUnoCSS",
      message: "是否需要 UnoCSS?",
      initial: true,
    },
    {
      type: "confirm",
      name: "needsGitCommit",
      message: "是否需要 Git 提交规范 (commit hooks)?",
      initial: true,
    },
  ]);

  return { projectName, ...options };
}

/**
 * 创建项目目录。
 * @param {string} projectName 项目名称。
 * @returns {string} 项目的绝对路径。
 */
function createProject(projectName) {
  const projectPath = path.join(process.cwd(), projectName);
  fs.mkdirSync(projectPath, { recursive: true });
  return projectPath;
}

/**
 * 初始化一个 Vite 项目。
 * @param {string} projectPath 项目的路径。
 * @param {object} options 用户的所选选项。
 */
function scaffoldVite(projectPath, options) {
  const { packageManager, needsTypeScript } = options;
  const template = needsTypeScript ? "vue-ts" : "vue";
  const command =
    packageManager === "pnpm"
      ? `pnpm create vite . --template ${template}`
      : `npm create vite@latest . --template ${template}`;

  console.log(green("正在使用 Vite 构建项目脚手架..."));
  exec(command, { cwd: projectPath });
}

/**
 * 修改主入口文件 (main.js/ts)。
 * @param {string} projectPath 项目的路径。
 * @param {object} options 用户的所选选项。
 * @param {string[]} importsToAdd 需要添加的 import 语句数组。
 * @param {string[]} usesToAdd 需要添加的 app.use() 语句数组。
 */
function updateMainFile(projectPath, options, importsToAdd, usesToAdd) {
  const mainFileName = options.needsTypeScript ? "main.ts" : "main.js";
  const mainFilePath = path.join(projectPath, "src", mainFileName);
  let content = fs.readFileSync(mainFilePath, "utf-8");

  const appCreation = /createApp\(App\)/;

  // 在顶部添加 import 语句
  if (importsToAdd.length > 0) {
    content = `${importsToAdd.join("\n")}\n${content}`;
  }

  // 链式调用 .use() 方法
  if (usesToAdd.length > 0) {
    const usesString = usesToAdd.join("");
    content = content.replace(appCreation, `createApp(App)${usesString}`);
  }

  fs.writeFileSync(mainFilePath, content);
}

// =================================================================
// #region 功能设置函数
// =================================================================

function setupRouter(projectPath, options) {
  const { needsTypeScript } = options;
  const routerDir = path.join(projectPath, "src", "router");
  fs.mkdirSync(routerDir, { recursive: true });

  const routerFile = needsTypeScript ? "index.ts" : "index.js";
  const routerContent = needsTypeScript
    ? `import { createRouter, createWebHistory } from 'vue-router'\nimport type { RouteRecordRaw } from 'vue-router'\nimport HomeView from '../views/Home.vue'\n\nconst routes: Array<RouteRecordRaw> = [\n  { path: '/', name: 'Home', component: HomeView }\n]\n\nconst router = createRouter({ history: createWebHistory(), routes })\nexport default router`
    : `import { createRouter, createWebHistory } from 'vue-router'\nimport HomeView from '../views/Home.vue'\n\nconst routes = [\n  { path: '/', name: 'Home', component: HomeView }\n]\n\nconst router = createRouter({ history: createWebHistory(), routes })\nexport default router`;
  fs.writeFileSync(path.join(routerDir, routerFile), routerContent);

  const viewsDir = path.join(projectPath, "src", "views");
  fs.mkdirSync(viewsDir, { recursive: true });
  fs.writeFileSync(
    path.join(viewsDir, "Home.vue"),
    "<template><h1>Home</h1></template>"
  );

  const appVuePath = path.join(projectPath, "src", "App.vue");
  let appVueContent = fs.readFileSync(appVuePath, "utf-8");
  appVueContent = appVueContent
    .replace(/<HelloWorld.*\/>/, "<router-view />")
    .replace(/import HelloWorld.*\n/, "");
  fs.writeFileSync(appVuePath, appVueContent);

  updateMainFile(
    projectPath,
    options,
    ["import router from './router'"],
    [".use(router)"]
  );

  return {
    dependencies: ["vue-router"],
    devDependencies: [],
  };
}

function setupPinia(projectPath, options) {
  const { needsTypeScript } = options;
  const storeDir = path.join(projectPath, "src", "store");
  fs.mkdirSync(storeDir, { recursive: true });

  const storeFile = needsTypeScript ? "index.ts" : "index.js";
  const storeContent = needsTypeScript
    ? `import { defineStore } from 'pinia'\n\nexport const useCounterStore = defineStore('counter', {\n  state: () => ({ count: 0 as number }),\n  actions: {\n    increment() { this.count++ },\n  },\n})`
    : `import { defineStore } from 'pinia'\n\nexport const useCounterStore = defineStore('counter', {\n  state: () => ({ count: 0 }),\n  actions: {\n    increment() { this.count++ },\n  },\n})`;
  fs.writeFileSync(path.join(storeDir, storeFile), storeContent);

  updateMainFile(
    projectPath,
    options,
    ["import { createPinia } from 'pinia'"],
    [".use(createPinia())"]
  );

  return {
    dependencies: ["pinia"],
    devDependencies: [],
  };
}

function setupEslint(projectPath, options) {
  const { needsTypeScript, needsUnoCSS } = options;
  const eslintConfigFile = needsTypeScript
    ? "eslint.config.ts"
    : "eslint.config.js";
  let eslintConfigContent = `import antfu from '@antfu/eslint-config'\n\nexport default antfu({\n  vue: true,\n  typescript: ${needsTypeScript},\n  ${
    needsUnoCSS ? "unocss: true," : ""
  }\n});\n`;
  fs.writeFileSync(
    path.join(projectPath, eslintConfigFile),
    eslintConfigContent
  );

  if (needsTypeScript) {
    const tsconfigNodePath = path.join(projectPath, "tsconfig.node.json");
    const tsconfig = readJsonFile(tsconfigNodePath);
    tsconfig.include = [
      ...new Set([...(tsconfig.include || []), "eslint.config.ts"]),
    ];
    writeJsonFile(tsconfigNodePath, tsconfig);
  }

  return {
    dependencies: [],
    devDependencies: ["eslint", "@antfu/eslint-config"],
    scripts: { lint: "eslint . --fix" },
  };
}

function setupUnoCSS(projectPath, options) {
  const { needsTypeScript } = options;
  const unoConfigFile = needsTypeScript ? "uno.config.ts" : "uno.config.js";
  const unoConfigContent = `import { defineConfig, presetAttributify, presetUno } from 'unocss'\n\nexport default defineConfig({\n  presets: [\n    presetAttributify(),\n    presetUno(),\n  ],\n})\n`;
  fs.writeFileSync(path.join(projectPath, unoConfigFile), unoConfigContent);

  const viteConfigFile = needsTypeScript ? "vite.config.ts" : "vite.config.js";
  let viteConfigContent = fs.readFileSync(
    path.join(projectPath, viteConfigFile),
    "utf-8"
  );
  viteConfigContent = viteConfigContent
    .replace(
      /import { defineConfig } from 'vite'/,
      `import { defineConfig } from 'vite'\nimport UnoCSS from 'unocss/vite'`
    )
    .replace(/(plugins:\s*\[)/, `$1\n    UnoCSS(),`);
  fs.writeFileSync(path.join(projectPath, viteConfigFile), viteConfigContent);

  updateMainFile(projectPath, options, ["import 'virtual:uno.css'"], []);

  if (needsTypeScript) {
    const tsconfigNodePath = path.join(projectPath, "tsconfig.node.json");
    const tsconfig = readJsonFile(tsconfigNodePath);
    tsconfig.include = [
      ...new Set([...(tsconfig.include || []), "uno.config.ts"]),
    ];
    writeJsonFile(tsconfigNodePath, tsconfig);
  }

  return {
    dependencies: [],
    devDependencies: ["unocss", "@unocss/eslint-plugin"],
  };
}

function setupGitHooks(projectPath) {
  fs.writeFileSync(
    path.join(projectPath, "commitlint.config.js"),
    `export default { extends: ['@commitlint/config-conventional'] };`
  );

  return {
    dependencies: [],
    devDependencies: [
      "husky",
      "lint-staged",
      "commitizen",
      "cz-conventional-changelog",
      "@commitlint/cli",
      "@commitlint/config-conventional",
    ],
    scripts: { cz: "cz" },
    "lint-staged": {
      "*.{js,ts,vue}": "eslint --fix",
    },
  };
}

function setupVSCode(projectPath, options) {
  const { needsEslint, needsUnoCSS } = options;
  const vscodeDir = path.join(projectPath, ".vscode");
  fs.mkdirSync(vscodeDir, { recursive: true });

  const extensions = {
    recommendations: [
      "Vue.volar",
      ...(needsEslint ? ["dbaeumer.vscode-eslint"] : []),
      ...(needsUnoCSS ? ["antfu.unocss"] : []),
    ],
  };
  writeJsonFile(path.join(vscodeDir, "extensions.json"), extensions);

  const settings = {
    "eslint.useFlatConfig": true,
    "explorer.fileNesting.enabled": true,
    "explorer.fileNesting.patterns": {
      "tsconfig.json": "tsconfig.*.json, env.d.ts",
      "vite.config.*": "jsconfig*, vitest.config.*",
      "package.json": "package-lock.json, pnpm*, .yarnrc*, .eslint*",
    },
    "prettier.enable": false,
    "editor.formatOnSave": false,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": "explicit",
      "source.organizeImports": "never",
    },
    "eslint.rules.customizations": [
      { rule: "style/*", severity: "off" },
      { rule: "format/*", severity: "off" },
    ],
    "eslint.validate": [
      "javascript",
      "typescript",
      "vue",
      "html",
      "markdown",
      "json",
      "jsonc",
      "yaml",
    ],
  };
  writeJsonFile(path.join(vscodeDir, "settings.json"), settings);
}

// #endregion

/**
 * 使用新的脚本、依赖等更新 package.json 文件。
 * @param {string} projectPath 项目的路径。
 * @param {object} updates 要应用到 package.json 的更新。
 */
function updatePackageJson(projectPath, updates) {
  const pkgPath = path.join(projectPath, "package.json");
  const pkg = readJsonFile(pkgPath);

  Object.assign(pkg, updates);

  if (updates.dependencies) {
    pkg.dependencies = { ...pkg.dependencies, ...updates.dependencies };
  }
  if (updates.devDependencies) {
    pkg.devDependencies = {
      ...pkg.devDependencies,
      ...updates.devDependencies,
    };
  }
  if (updates.scripts) {
    pkg.scripts = { ...pkg.scripts, ...updates.scripts };
  }

  pkg.dependencies = sortObjectKeys(pkg.dependencies);
  pkg.devDependencies = sortObjectKeys(pkg.devDependencies);

  writeJsonFile(pkgPath, pkg);
}

/**
 * 使用指定的包管理器安装依赖。
 * @param {string} projectPath 项目的路径。
 * @param {object} options 用户的所选选项。
 * @param {string[]} deps 需要安装的生产依赖列表。
 * @param {string[]} devDeps 需要安装的开发依赖列表。
 */
function installDependencies(projectPath, options, deps, devDeps) {
  console.log(green("\n正在安装依赖... 请稍候。"));
  const { packageManager } = options;

  const pkgPath = path.join(projectPath, "package.json");
  const pkg = readJsonFile(pkgPath);

  pkg.dependencies = deps.reduce(
    (acc, dep) => ({ ...acc, [dep]: "latest" }),
    pkg.dependencies || {}
  );
  pkg.devDependencies = devDeps.reduce(
    (acc, dep) => ({ ...acc, [dep]: "latest" }),
    pkg.devDependencies || {}
  );

  pkg.dependencies = sortObjectKeys(pkg.dependencies);
  pkg.devDependencies = sortObjectKeys(pkg.devDependencies);

  writeJsonFile(pkgPath, pkg);

  exec(`${packageManager} install`, { cwd: projectPath });
}

/**
 * 运行安装后任务，例如初始化 husky。
 * @param {string} projectPath 项目的路径。
 * @param {object} options 用户的所选选项。
 */
function runPostInstallTasks(projectPath, options) {
  if (options.needsEslint) {
    console.log(green("正在使用 ESLint 格式化项目..."));
    exec("npx eslint . --fix", { cwd: projectPath });
  }

  if (options.needsGitCommit) {
    console.log(green("正在初始化 Git 仓库和钩子..."));
    exec("git init -b main", { cwd: projectPath });
    exec("npx husky init", { cwd: projectPath });
    fs.writeFileSync(
      path.join(projectPath, ".husky", "pre-commit"),
      `npx lint-staged`
    );
    fs.writeFileSync(
      path.join(projectPath, ".husky", "commit-msg"),
      `npx commitlint --edit "$1"`
    );
    exec(`chmod +x ${path.join(projectPath, ".husky", "pre-commit")}`, {
      cwd: projectPath,
    });
    exec(`chmod +x ${path.join(projectPath, ".husky", "commit-msg")}`, {
      cwd: projectPath,
    });
  }
}

/**
 * 向用户打印最终的操作说明。
 * @param {string} projectName 项目名称。
 * @param {string} packageManager 使用的包管理器。
 */
function logFinalInstructions(projectName, packageManager) {
  console.log(bold(green(`\n🎉 项目创建成功!`)));
  console.log(`\n开始使用, 请运行:\n`);
  console.log(`  cd ${projectName}`);
  console.log(`  ${packageManager} dev\n`);
}

// =================================================================
// #region 主执行流程
// =================================================================

async function main() {
  const options = await promptUserOptions();
  const { projectName, packageManager } = options;

  const projectPath = createProject(projectName);
  projectPath, options;

  const allDependencies = [];
  const allDevDependencies = [];
  const pkgUpdates = { scripts: {}, "lint-staged": {} };

  const featureSetups = {
    needsRouter: setupRouter,
    needsPinia: setupPinia,
    needsEslint: setupEslint,
    needsUnoCSS: setupUnoCSS,
    needsGitCommit: setupGitHooks,
  };

  for (const [option, setupFn] of Object.entries(featureSetups)) {
    if (options[option]) {
      const result = setupFn(projectPath, options);
      if (result.dependencies) allDependencies.push(...result.dependencies);
      if (result.devDependencies)
        allDevDependencies.push(...result.devDependencies);
      if (result.scripts) Object.assign(pkgUpdates.scripts, result.scripts);
      if (result["lint-staged"])
        Object.assign(pkgUpdates["lint-staged"], result["lint-staged"]);
    }
  }

  // 此函数不返回依赖项
  setupVSCode(projectPath, options);

  updatePackageJson(projectPath, pkgUpdates);

  installDependencies(
    projectPath,
    options,
    [...new Set(allDependencies)],
    [...new Set(allDevDependencies)]
  );

  runPostInstallTasks(projectPath, options);

  // 注意: 如果需要，可以在此处添加 README 文件的生成逻辑。

  generateAndWriteReadme(projectPath, options);

  logFinalInstructions(projectName, packageManager);
}

main().catch((e) => {
  console.error(red("✖ 发生未知错误。"));
  console.error(red(e));
  process.exit(1);
});

/**
 * 根据用户选项生成 README.md 的内容。
 * @param {object} options 用户的所选选项。
 * @returns {string} README.md 的内容。
 */
function generateReadmeContent(options) {
  const {
    projectName,
    needsTypeScript,
    needsRouter,
    needsPinia,
    needsEslint,
    cssPreprocessor,
    needsUnoCSS,
    needsGitCommit,
    packageManager,
  } = options;

  const ts = needsTypeScript;

  let content = `# ${projectName}

`;
  content += `## 简介\n\n`;
  content += `这是一个基于 [Vue 3](https://vuejs.org/) 和 [Vite](https://vitejs.dev/) 构建的现代前端项目。它集成了多种开发工具和最佳实践，旨在提供高效、可维护的开发体验。\n\n`;

  content += `## 主要特性\n\n`;
  content += `本项目根据您的选择，集成了以下功能：\n\n`;
  if (ts)
    content += `- **TypeScript**: 强类型 JavaScript，提升代码质量和开发效率。\n`;
  content += `- **Vite**: 极速的前端构建工具，提供闪电般的开发服务器启动和热更新。\n`;
  if (needsRouter)
    content += `- **Vue Router**: 官方路由管理器，用于构建单页面应用。\n`;
  if (needsPinia)
    content += `- **Pinia**: 轻量级、类型安全的 Vue 状态管理库。\n`;
  if (needsEslint)
    content += `- **ESLint**: 代码规范和风格检查工具，配合 [@antfu/eslint-config](https://github.com/antfu/eslint-config) 提供开箱即用的配置。\n`;
  if (cssPreprocessor !== "none")
    content += `- **${cssPreprocessor}**: ${cssPreprocessor} 预处理器，增强 CSS 编写能力。\n`;
  if (needsUnoCSS)
    content += `- **UnoCSS**: 即时按需原子化 CSS 引擎，提供极致的开发灵活性和性能。\n`;

  if (needsGitCommit) {
    content += `- **Git Commit 规范**: 通过 [Husky](https://typicode.github.io/husky/)、[lint-staged](https://github.com/okonet/lint-staged) 和 [Commitlint](https://commitlint.js.org/) 强制执行统一的 Git 提交信息规范。\n`;
    content += `  - **Husky 和 lint-staged**: Husky 用于管理 Git 钩子。配置了 pre-commit 钩子，运行 lint-staged，它会在暂存文件上运行 ESLint。这确保了没有带有 linting 错误的代码可以被提交。\n`;
    content += `  - **Commitizen**: 用于强制执行约定式提交信息。使用时，请运行以下命令代替 \`git commit\`：\n\n`;
    content += `    \`\`\`bash\n`;
    content += `    git cz\n`;
    content += `    \`\`\`\n\n`;
    content += `    这将提示您一系列问题以生成约定式提交信息。有关提交信息格式的更多详细信息，请参阅 [Conventional Commits 规范](https://www.conventionalcommits.org/en/v1.0.0/)。\n\n`;
  }

  content += `## 快速开始\n\n`;
  content += `请确保您已安装 [Node.js](https://nodejs.org/) (推荐 LTS 版本) 和 ${packageManager}。\n\n`;
  content += `1. **安装依赖**\n\n`;
  content += `\`\`\`bash\n`;
  content += `${packageManager} install\n`;
  content += `\`\`\`\n\n`;
  content += `2. **运行开发服务器**\n\n`;
  content += `\`\`\`bash\n`;
  content += `${packageManager} run dev\n`;
  content += `\`\`\`\n\n`;

  content += `## 可用脚本\n\n`;
  content += `- \`${packageManager} run dev\`: 在开发模式下运行应用。\n`;
  content += `- \`${packageManager} run build\`: 为生产环境构建应用。\n`;
  if (needsEslint)
    content += `- \`${packageManager} run lint\`: 运行 ESLint 检查并自动修复代码中的问题。\n`;

  content += `## 目录结构\n\n`;
  content += `\`\`\`\n`;
  content += `${projectName}/\n`;
  content += `├── public/\n`;
  content += `├── src/\n`;
  content += `│   ├── assets/       # 静态资源\n`;
  content += `│   ├── components/   # 可复用 Vue 组件\n`;
  if (needsRouter) content += `│   ├── router/       # Vue Router 路由配置\n`;
  if (needsPinia) content += `│   ├── store/        # Pinia 状态管理模块\n`;
  if (needsRouter) content += `│   ├── views/        # 页面级 Vue 组件\n`;
  content += `│   ├── App.vue       # 应用根组件\n`;
  content += `│   └── main.${ts ? "ts" : "js"}    # 应用入口文件\n`;
  content += `├── .vscode/          # VS Code 编辑器配置\n`;
  content += `├── .gitignore        # Git 忽略文件\n`;
  content += `├── index.html        # 应用入口 HTML 文件\n`;
  content += `├── package.json      # 项目依赖和脚本配置\n`;
  content += `├── vite.config.${ts ? "ts" : "js"} # Vite 配置文件\n`;
  if (ts) content += `├── tsconfig.json\n├── tsconfig.node.json\n`;
  if (needsEslint) content += `├── eslint.config.${ts ? "ts" : "js"}\n`;
  if (needsUnoCSS) content += `├── uno.config.${ts ? "ts" : "js"}\n`;
  if (needsGitCommit) content += `├── commitlint.config.js\n├── .husky/\n`;
  content += `\`\`\`\n\n`;

  content += `## 贡献\n\n`;
  content += `欢迎通过 Pull Request 贡献代码，或提交 Issue 报告问题和提出建议。\n\n`;

  return content;
}

/**
 * 生成并写入 README.md 文件。
 * @param {string} projectPath 项目的路径。
 * @param {object} options 用户的所选选项。
 */
function generateAndWriteReadme(projectPath, options) {
  console.log(green("正在生成 README.md 文件..."));
  const readmeContent = generateReadmeContent(options);
  fs.writeFileSync(path.join(projectPath, "README.md"), readmeContent);
}

// #endregion
