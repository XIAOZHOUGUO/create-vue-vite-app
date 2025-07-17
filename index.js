#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const prompts = require("prompts");
const { red, green, bold } = require("kolorist");
const {
  exec,
  readJsonFile,
  writeJsonFile,
  sortObjectKeys,
  copyTemplate,
} = require("./utils");

// =================================================================
// #region 核心逻辑
// =================================================================

/**
 * 提示用户输入项目名称和各项配置选项。
 * @returns {Promise<object>} 一个 Promise，解析为包含用户所选项目名称和配置选项的对象。
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
 * 在当前工作目录下创建新的项目目录。
 * 如果目录已存在，则不会执行任何操作。
 * @param {string} projectName 要创建的项目名称。
 * @returns {string} 新创建的项目目录的绝对路径。
 */
function createProject(projectName) {
  const projectPath = path.join(process.cwd(), projectName);
  fs.mkdirSync(projectPath, { recursive: true });
  return projectPath;
}

/**
 * 使用 Vite 创建一个基础项目脚手架。
 * 根据用户选择的 TypeScript 选项和包管理器来生成相应的 Vite 命令。
 * @param {string} projectPath 项目的绝对路径。
 * @param {object} options 用户的配置选项，包含 `packageManager` 和 `needsTypeScript`。
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
 * 修改项目的主入口文件 (main.js 或 main.ts)。
 * 主要用于添加全局导入语句和 Vue 实例的 `use` 方法调用。
 * 将 `createApp(App)` 赋值给一个变量，然后逐行调用 `use()` 方法，最后再调用 `mount()`。
 * @param {string} projectPath 项目的绝对路径。
 * @param {object} options 用户的配置选项，包含 `needsTypeScript`。
 * @param {string[]} importsToAdd 一个字符串数组，每个字符串代表一个要添加到文件顶部的 import 语句。
 * @param {string[]} usesToAdd 一个字符串数组，每个字符串代表一个要添加到 Vue 应用实例上的 `.use()` 调用（例如 `.use(router)`）。
 */
function updateMainFile(projectPath, options, importsToAdd, usesToAdd) {
  const mainFileName = options.needsTypeScript ? "main.ts" : "main.js";
  const mainFilePath = path.join(projectPath, "src", mainFileName);
  let content = fs.readFileSync(mainFilePath, "utf-8");

  // 找到 createApp(App).mount('#app') 这一行
  const mountRegex = /createApp\(App\)\.mount\(['"]#app['"]\)/;

  let appInstanceCode = "const app = createApp(App);\n";

  // 添加 use() 调用
  if (usesToAdd.length > 0) {
    usesToAdd.forEach((useCall) => {
      appInstanceCode += `app${useCall};\n`;
    });
  }

  // 添加 mount() 调用
  appInstanceCode += "app.mount('#app');";

  // 在顶部添加 import 语句
  if (importsToAdd.length > 0) {
    content = `${importsToAdd.join("\n")}\n${content}`;
  }

  // 替换原有的链式调用为新的逐行调用
  content = content.replace(mountRegex, appInstanceCode);

  fs.writeFileSync(mainFilePath, content);
}

// =================================================================
// #region 功能设置函数
// =================================================================

/**
 * 设置 Vue Router。
 * 包括创建路由文件、视图文件，并修改 `App.vue`。
 * 返回此功能所需依赖、开发依赖、以及需要添加到主入口文件的 import 语句和 use() 调用。
 * @param {string} projectPath 项目的绝对路径。
 * @param {object} options 用户的配置选项，包含 `needsTypeScript`。
 * @returns {object} 包含此功能所需依赖、开发依赖、import 语句和 use() 调用的对象。
 */
function setupRouter(projectPath, options) {
  const { needsTypeScript } = options;
  const routerDir = path.join(projectPath, "src", "router");
  fs.mkdirSync(routerDir, { recursive: true });

  const templateName = needsTypeScript ? "router/router.ts.tpl" : "router/router.js.tpl";
  const targetFile = needsTypeScript ? "index.ts" : "index.js";
  fs.writeFileSync(path.join(routerDir, targetFile), copyTemplate(templateName));

  const viewsDir = path.join(projectPath, "src", "views");
  fs.mkdirSync(viewsDir, { recursive: true });
  fs.writeFileSync(path.join(viewsDir, "Home.vue"), copyTemplate("Home.vue.tpl"));

  const appVuePath = path.join(projectPath, "src", "App.vue");
  let appVueContent = fs.readFileSync(appVuePath, "utf-8");
  appVueContent = appVueContent
    .replace(/<HelloWorld.*\/>/, "<router-view />")
    .replace(/import HelloWorld.*\n/, "");
  fs.writeFileSync(appVuePath, appVueContent);

  return {
    dependencies: ["vue-router"],
    devDependencies: [],
    importsToAdd: ["import router from './router'"],
    usesToAdd: [".use(router)"],
  };
}

/**
 * 设置 Pinia 状态管理。
 * 包括创建 Pinia 实例文件和示例 store 文件。
 * 返回此功能所需依赖、开发依赖、以及需要添加到主入口文件的 import 语句和 use() 调用。
 * @param {string} projectPath 项目的绝对路径。
 * @param {object} options 用户的配置选项，包含 `needsTypeScript`。
 * @returns {object} 包含此功能所需依赖、开发依赖、import 语句和 use() 调用的对象。
 */
function setupPinia(projectPath, options) {
  const { needsTypeScript } = options;
  const storeDir = path.join(projectPath, "src", "store");
  fs.mkdirSync(storeDir, { recursive: true });

  // 复制 Pinia 实例文件
  const piniaIndexTemplate = needsTypeScript
    ? "store/store-index.ts.tpl"
    : "store/store-index.js.tpl";
  const piniaIndexFile = needsTypeScript ? "index.ts" : "index.js";
  fs.writeFileSync(
    path.join(storeDir, piniaIndexFile),
    copyTemplate(piniaIndexTemplate)
  );

  // 复制示例 store 文件
  const counterStoreTemplate = needsTypeScript
    ? "store/store-counter.ts.tpl"
    : "store/store-counter.js.tpl";
  const counterStoreFile = needsTypeScript ? "counter.ts" : "counter.js";
  fs.writeFileSync(
    path.join(storeDir, counterStoreFile),
    copyTemplate(counterStoreTemplate)
  );

  return {
    dependencies: ["pinia"],
    devDependencies: [],
    importsToAdd: ["import pinia from './store'"],
    usesToAdd: [".use(pinia)"],
  };
}

/**
 * 设置 ESLint。
 * 包括创建 ESLint 配置文件，并根据需要更新 `tsconfig.node.json`。
 * @param {string} projectPath 项目的绝对路径。
 * @param {object} options 用户的配置选项，包含 `needsTypeScript` 和 `needsUnoCSS`。
 * @returns {object} 包含此功能所需依赖、开发依赖和脚本的对象。
 */
function setupEslint(projectPath, options) {
  const { needsTypeScript, needsUnoCSS } = options;
  const targetFile = needsTypeScript ? "eslint.config.ts" : "eslint.config.js";

  const eslintConfigContent = copyTemplate("eslint.config.js.tpl", {
    typeScriptConfig: needsTypeScript ? "typescript: true," : "",
    unoESLintConfig: needsUnoCSS ? "unocss: true," : "",
  });
  fs.writeFileSync(path.join(projectPath, targetFile), eslintConfigContent);

  const devDependencies = ["eslint", "@antfu/eslint-config"];
  if (needsTypeScript) {
    devDependencies.push("jiti");
    const tsconfigNodePath = path.join(projectPath, "tsconfig.node.json");
    const tsconfig = readJsonFile(tsconfigNodePath);
    tsconfig.include = [...new Set([...(tsconfig.include || []), targetFile])];
    writeJsonFile(tsconfigNodePath, tsconfig);
  }

  return {
    dependencies: [],
    devDependencies,
    scripts: { lint: "eslint . --fix" },
  };
}

/**
 * 设置 UnoCSS。
 * 包括创建 UnoCSS 配置文件，修改 Vite 配置文件。
 * 返回此功能所需依赖、开发依赖、以及需要添加到主入口文件的 import 语句和 use() 调用。
 * @param {string} projectPath 项目的绝对路径。
 * @param {object} options 用户的配置选项，包含 `needsTypeScript`。
 * @returns {object} 包含此功能所需依赖、开发依赖、import 语句和 use() 调用的对象。
 */
function setupUnoCSS(projectPath, options) {
  const { needsTypeScript } = options;
  const targetFile = needsTypeScript ? "uno.config.ts" : "uno.config.js";
  fs.writeFileSync(
    path.join(projectPath, targetFile),
    copyTemplate("uno.config.js.tpl")
  );

  const viteConfigFile = needsTypeScript ? "vite.config.ts" : "vite.config.js";
  let viteConfigContent = fs.readFileSync(
    path.join(projectPath, viteConfigFile),
    "utf-8"
  );
  viteConfigContent = viteConfigContent
    .replace(
      /import { defineConfig } from 'vite'/g,
      `import { defineConfig } from 'vite'\nimport UnoCSS from 'unocss/vite'`
    )
    .replace(/(plugins:\s*\[)/, `$1\n    UnoCSS(),`);
  fs.writeFileSync(path.join(projectPath, viteConfigFile), viteConfigContent);

  return {
    dependencies: [],
    devDependencies: ["unocss", "@unocss/eslint-plugin"],
    importsToAdd: ["import 'virtual:uno.css'"],
    usesToAdd: [], // UnoCSS 不需要 app.use() 调用
  };
}

/**
 * 设置 Git 提交规范和钩子。
 * 包括创建 `commitlint.config.js`，并返回所需的依赖、开发依赖和脚本。
 * @param {string} projectPath 项目的绝对路径。
 * @returns {object} 包含此功能所需依赖、开发依赖和脚本的对象。
 */
function setupGitHooks(projectPath) {
  fs.writeFileSync(
    path.join(projectPath, "commitlint.config.js"),
    copyTemplate("commitlint.config.js.tpl")
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
    "lint-staged": { "*.{js,ts,vue}": "eslint --fix" },
  };
}

/**
 * 设置 VS Code 相关配置。
 * 包括创建 `.vscode` 目录，生成 `extensions.json` (推荐扩展) 和 `settings.json` (工作区设置)。
 * @param {string} projectPath 项目的绝对路径。
 * @param {object} options 用户的配置选项，包含 `needsEslint` 和 `needsUnoCSS`。
 */
function setupVSCode(projectPath, options) {
  const { needsEslint, needsUnoCSS } = options;
  const vscodeDir = path.join(projectPath, ".vscode");
  fs.mkdirSync(vscodeDir, { recursive: true });

  const extensionsContent = copyTemplate("vscode/extensions.json.tpl", {
    eslintExtension: needsEslint ? '"dbaeumer.vscode-eslint",' : "",
    unocssExtension: needsUnoCSS ? '"antfu.unocss",' : "",
  });
  fs.writeFileSync(path.join(vscodeDir, "extensions.json"), extensionsContent);

  fs.writeFileSync(
    path.join(vscodeDir, "settings.json"),
    copyTemplate("vscode/settings.json.tpl")
  );
}

/**
 * 根据用户选项生成并写入 README.md 和 README.zh-CN.md 文件。
 * @param {string} projectPath 项目的绝对路径。
 * @param {object} options 用户的配置选项。
 */
function generateAndWriteReadme(projectPath, options) {
  const {
    projectName,
    packageManager,
    cssPreprocessor,
    needsTypeScript,
    needsRouter,
    needsPinia,
    needsEslint,
    needsUnoCSS,
    needsGitCommit,
  } = options;

  const featureDefinitions = [
    {
      option: "packageManager",
      check: (value) => value === "pnpm",
      en: "- **pnpm**: Fast, disk space-efficient package manager.",
      zh: "- **pnpm**: 快速、节省磁盘空间的包管理器。",
    },
    {
      option: "needsTypeScript",
      en: "- **TypeScript**: Strongly typed JavaScript for enhanced code quality and development efficiency.",
      zh: "- **TypeScript**: 强类型 JavaScript，提升代码质量和开发效率。",
    },
    {
      option: "needsRouter",
      en: "- **Vue Router**: The official router for building Single-Page Applications.",
      zh: "- **Vue Router**: 官方路由管理器，用于构建单页面应用。",
    },
    {
      option: "needsPinia",
      en: "- **Pinia**: A lightweight, type-safe state management library for Vue.",
      zh: "- **Pinia**: 轻量级、类型安全的 Vue 状态管理库。",
    },
    {
      option: "needsEslint",
      en: "- **ESLint**: Tool for code linting and style checking...",
      zh: "- **ESLint**: 代码规范和风格检查工具...",
    },
    {
      option: "cssPreprocessor",
      check: (value) => value !== "none",
      en: `- **${cssPreprocessor}**: ${cssPreprocessor} pre-processor...`,
      zh: `- **${cssPreprocessor}**: ${cssPreprocessor} 预处理器...`,
    },
    {
      option: "needsUnoCSS",
      en: "- **UnoCSS**: Instant on-demand atomic CSS engine...",
      zh: "- **UnoCSS**: 即时按需原子化 CSS 引擎...",
    },
    {
      option: "needsGitCommit",
      en: "- **Git Commit Convention**: Using Husky, lint-staged, and Commitlint...",
      zh: "- **Git Commit 规范**: 通过 Husky、lint-staged 和 Commitlint...",
    },
  ];

  const activeFeatures = featureDefinitions.filter((feature) => {
    const value = options[feature.option];
    return feature.check ? feature.check(value) : value;
  });

  let featuresEn = "";
  let featuresZh = "";

  if (activeFeatures.length > 0) {
    featuresEn = activeFeatures.map((f) => f.en).join("\n");
    featuresZh = activeFeatures.map((f) => f.zh).join("\n");
  } else {
    featuresEn = "- **Basic Vue Setup**: A minimal Vue 3 project setup with Vite.";
    featuresZh = "- **基础 Vue 环境**: 一个使用 Vite 构建的最小化 Vue 3 项目。";
  }

  const baseTplVars = {
    projectName,
    packageManager,
    mainFileExtension: needsTypeScript ? "ts" : "js",
    viteConfigExtension: needsTypeScript ? "ts" : "js",
    tsconfig: needsTypeScript
      ? `├── tsconfig.json\n├── tsconfig.node.json`
      : "",
    eslintConfig: needsEslint
      ? `├── eslint.config.${needsTypeScript ? "ts" : "js"}`
      : "",
    unocssConfig: needsUnoCSS
      ? `├── uno.config.${needsTypeScript ? "ts" : "js"}`
      : "",
    commitlintConfig: needsGitCommit
      ? `├── commitlint.config.js\n├── .husky/`
      : "",
  };

  let qualityToolsEn = "";
  let qualityToolsZh = "";

  if (needsEslint || needsGitCommit) {
    const replacements = { packageManager };
    const eslintEn = needsEslint
      ? copyTemplate("readme/eslint.en.md.tpl", replacements)
      : "";
    const eslintZh = needsEslint
      ? copyTemplate("readme/eslint.zh-CN.md.tpl", replacements)
      : "";
    const gitHooksEn = needsGitCommit
      ? copyTemplate("readme/git-hooks.en.md.tpl", replacements)
      : "";
    const gitHooksZh = needsGitCommit
      ? copyTemplate("readme/git-hooks.zh-CN.md.tpl", replacements)
      : "";

    qualityToolsEn = copyTemplate("readme/quality-tools.en.md.tpl", {
      eslintSection: eslintEn,
      gitHooksSection: gitHooksEn,
    });
    qualityToolsZh = copyTemplate("readme/quality-tools.zh-CN.md.tpl", {
      eslintSection: eslintZh,
      gitHooksSection: gitHooksZh,
    });
  }

  const enTplVars = {
    ...baseTplVars,
    features: featuresEn,
    lintScript: needsEslint
      ? `- \`${packageManager} run lint\`: run lint and auto fix code.`
      : "",
    routerDir: needsRouter ? `│   ├── router/       # Vue Router` : "",
    piniaDir: needsPinia ? `│   ├── store/        # Pinia` : "",
    viewsDir: needsRouter ? `│   ├── views/        # pages` : "",
    codeQualityTools: qualityToolsEn,
  };

  const zhTplVars = {
    ...baseTplVars,
    features: featuresZh,
    lintScript: needsEslint
      ? `- \`${packageManager} run lint\`: 运行 ESLint 检查并自动修复代码中的问题。`
      : "",
    routerDir: needsRouter ? `│   ├── router/       # Vue Router 路由配置` : "",
    piniaDir: needsPinia ? `│   ├── store/        # Pinia 状态管理模块` : "",
    viewsDir: needsRouter ? `│   ├── views/        # 页面级 Vue 组件` : "",
    codeQualityTools: qualityToolsZh,
  };

  fs.writeFileSync(
    path.join(projectPath, "README.md"),
    copyTemplate("readme/README.md.tpl", enTplVars)
  );
  fs.writeFileSync(
    path.join(projectPath, "README.zh-CN.md"),
    copyTemplate("readme/README.zh-CN.md.tpl", zhTplVars)
  );
}

/**
 * 更新项目的 `package.json` 文件。
 * 主要用于合并 `scripts` 和 `lint-staged` 字段，确保不覆盖 Vite 默认生成的配置。
 * 依赖和开发依赖的更新由 `installDependencies` 函数处理。
 * @param {string} projectPath 项目的绝对路径。
 * @param {object} updates 包含要合并到 `package.json` 的 `scripts` 和 `lint-staged` 字段的对象。
 */
function updatePackageJson(projectPath, updates) {
  const pkgPath = path.join(projectPath, "package.json");
  const pkg = readJsonFile(pkgPath);

  // 仅合并 scripts，而不是覆盖
  if (updates.scripts) {
    pkg.scripts = { ...pkg.scripts, ...updates.scripts };
  }

  // 仅合并 lint-staged，而不是覆盖
  if (updates["lint-staged"]) {
    pkg["lint-staged"] = { ...pkg["lint-staged"], ...updates["lint-staged"] };
  }

  // 依赖和开发依赖由 installDependencies 函数处理，此处无需排序和合并
  writeJsonFile(pkgPath, pkg);
}

/**
 * 使用指定的包管理器安装项目的生产依赖和开发依赖。
 * 会将所有依赖合并到 `package.json` 中，并按字母排序。
 * 如果选择 `pnpm`，则会将其自身作为开发依赖添加。
 * @param {string} projectPath 项目的绝对路径。
 * @param {object} options 用户的配置选项，包含 `packageManager`。
 * @param {string[]} deps 需要安装的生产依赖包名数组。
 * @param {string[]} devDeps 需要安装的开发依赖包名数组。
 */
function installDependencies(projectPath, options, deps, devDeps) {
  console.log(green("\n正在安装依赖... 请稍候。"));
  const { packageManager } = options;

  // 如果选择 pnpm，则将 pnpm 添加到开发依赖中
  if (packageManager === "pnpm") {
    devDeps.push("pnpm");
  }

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
 * 运行安装后的任务，例如 ESLint 格式化和 Git 钩子初始化。
 * @param {string} projectPath 项目的绝对路径。
 * @param {object} options 用户的配置选项，包含 `needsEslint` 和 `needsGitCommit`。
 */
function runPostInstallTasks(projectPath, options) {
  const { packageManager } = options;

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

    console.log(green("正在初始化 Commitizen..."));
    const commitizenInitCommand =
      packageManager === "npm"
        ? "npm install -D commitizen cz-conventional-changelog && npx commitizen init cz-conventional-changelog --save-dev --save-exact"
        : `pnpm add -D commitizen cz-conventional-changelog && pnpm commitizen init cz-conventional-changelog --pnpm --save-dev --save-exact`;
    exec(commitizenInitCommand, { cwd: projectPath });

    // 确保 husky 的 prepare 脚本被执行
    exec(`${packageManager} run prepare`, { cwd: projectPath });
  }
}

/**
 * 向用户打印项目创建成功的消息和后续操作指引。
 * @param {string} projectName 新创建的项目名称。
 * @param {string} packageManager 使用的包管理器名称。
 */
function logFinalInstructions(projectName, packageManager) {
  console.log(bold(green(`🎉 项目创建成功!`)));
  console.log(`开始使用, 请运行:\n`);
  console.log(`  cd ${projectName}`);
  console.log(`  ${packageManager} dev\n`);
}

/**
 * 主函数，负责编排整个项目创建流程。
 * 包括提示用户选项、创建项目、配置各项功能、安装依赖、执行安装后任务和生成 README。
 */
async function main() {
  const options = await promptUserOptions();
  const { projectName, packageManager } = options;

  const projectPath = createProject(projectName);
  scaffoldVite(projectPath, options);

  const allDependencies = [];
  const allDevDependencies = [];
  const pkgUpdates = { scripts: {} };
  const allImportsToAdd = []; // 新增：收集所有需要添加的 import 语句
  const allUsesToAdd = []; // 新增：收集所有需要添加的 use() 调用

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
      if (result["lint-staged"]) {
        pkgUpdates["lint-staged"] = {
          ...pkgUpdates["lint-staged"],
          ...result["lint-staged"],
        };
      }
      // 收集 import 和 use 调用
      if (result.importsToAdd) allImportsToAdd.push(...result.importsToAdd);
      if (result.usesToAdd) allUsesToAdd.push(...result.usesToAdd);
    }
  }

  // 统一调用 updateMainFile
  updateMainFile(projectPath, options, allImportsToAdd, allUsesToAdd);

  setupVSCode(projectPath, options);
  updatePackageJson(projectPath, pkgUpdates);

  installDependencies(
    projectPath,
    options,
    [...new Set(allDependencies)],
    [...new Set(allDevDependencies)]
  );

  runPostInstallTasks(projectPath, options);
  generateAndWriteReadme(projectPath, options);
  logFinalInstructions(projectName, packageManager);
}

main().catch((e) => {
  console.error(red("✖ 发生未知错误。"));
  console.error(red(e));
  process.exit(1);
});
