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
 * 如果命令执行失败，将打印错误信息并退出进程。
 * @param {string} command 要执行的命令字符串。
 * @param {import('child_process').ExecSyncOptions} options 执行命令的选项。
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
 * 读取并解析一个 JSON 文件，会先移除文件中的单行和多行注释。
 * @param {string} filePath JSON 文件的路径。
 * @returns {object} 解析后的 JSON 对象。
 */
function readJsonFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  const contentWithoutComments = content.replace(/\/\/.*|\/\*[^]*?\*\//g, "");
  return JSON.parse(contentWithoutComments);
}

/**
 * 将一个 JavaScript 对象写入到指定的 JSON 文件中，格式化为两空格缩进。
 * @param {string} filePath JSON 文件的路径。
 * @param {object} data 要写入的 JavaScript 对象。
 */
function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * 对给定对象的键进行字母排序，并返回一个新的排序后的对象。
 * @param {object} obj 要排序的对象。
 * @returns {object} 键已排序的新对象。
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

/**
 * 从模板目录复制文件到目标路径，并可选择性地替换占位符。
 * 占位符格式为 `{{ placeholderName }}`。
 * 未被替换的占位符（即在 `replacements` 对象中没有对应键的）将被移除。
 * @param {string} templateName 模板文件名 (位于 `templates/` 目录下)。
 * @param {string} targetPath 目标文件的完整路径。
 * @param {object} [replacements={}] 一个包含占位符名称和替换值的对象。
 */
function copyTemplate(templateName, targetPath, replacements = {}) {
  const templatePath = path.join(__dirname, "templates", templateName);
  let content = fs.readFileSync(templatePath, "utf-8");

  for (const [placeholder, value] of Object.entries(replacements)) {
    const regex = new RegExp(`{{ ${placeholder} }}`, "g");
    content = content.replace(regex, value);
  }

  content = content.replace(/{{ .* }}\n?/g, "");
  fs.writeFileSync(targetPath, content);
}

// #endregion

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

  const templateName = needsTypeScript ? "router.ts.tpl" : "router.js.tpl";
  const targetFile = needsTypeScript ? "index.ts" : "index.js";
  copyTemplate(templateName, path.join(routerDir, targetFile));

  const viewsDir = path.join(projectPath, "src", "views");
  fs.mkdirSync(viewsDir, { recursive: true });
  copyTemplate("Home.vue.tpl", path.join(viewsDir, "Home.vue"));

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
  const piniaIndexTemplate = needsTypeScript ? "store-index.ts.tpl" : "store-index.js.tpl";
  const piniaIndexFile = needsTypeScript ? "index.ts" : "index.js";
  copyTemplate(piniaIndexTemplate, path.join(storeDir, piniaIndexFile));

  // 复制示例 store 文件
  const counterStoreTemplate = needsTypeScript ? "store-counter.ts.tpl" : "store-counter.js.tpl";
  const counterStoreFile = needsTypeScript ? "counter.ts" : "counter.js";
  copyTemplate(counterStoreTemplate, path.join(storeDir, counterStoreFile));

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

  copyTemplate("eslint.config.js.tpl", path.join(projectPath, targetFile), {
    needsTypeScript: needsTypeScript,
    unoESLintConfig: needsUnoCSS ? "unocss: true," : "",
  });

  if (needsTypeScript) {
    const tsconfigNodePath = path.join(projectPath, "tsconfig.node.json");
    const tsconfig = readJsonFile(tsconfigNodePath);
    tsconfig.include = [...new Set([...(tsconfig.include || []), targetFile])];
    writeJsonFile(tsconfigNodePath, tsconfig);
  }

  return {
    dependencies: [],
    devDependencies: ["eslint", "@antfu/eslint-config"],
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
  copyTemplate("uno.config.js.tpl", path.join(projectPath, targetFile));

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
  copyTemplate(
    "commitlint.config.js.tpl",
    path.join(projectPath, "commitlint.config.js")
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

  copyTemplate("extensions.json.tpl", path.join(vscodeDir, "extensions.json"), {
    eslintExtension: needsEslint ? "dbaeumer.vscode-eslint" : "",
    unocssExtension: needsUnoCSS ? "antfu.unocss" : "",
  });

  copyTemplate("settings.json.tpl", path.join(vscodeDir, "settings.json"));
}

/**
 * 根据用户选项生成并写入 README.md 文件。
 * @param {string} projectPath 项目的绝对路径。
 * @param {object} options 用户的配置选项。
 */
function generateAndWriteReadme(projectPath, options) {
  const {
    needsTypeScript,
    needsRouter,
    needsPinia,
    needsEslint,
    needsGitCommit,
    cssPreprocessor,
    needsUnoCSS,
  } = options;
  let features = [];
  if (needsTypeScript)
    features.push(
      `- **TypeScript**: 强类型 JavaScript，提升代码质量和开发效率。`
    );
  if (needsRouter)
    features.push(`- **Vue Router**: 官方路由管理器，用于构建单页面应用。`);
  if (needsPinia)
    features.push(`- **Pinia**: 轻量级、类型安全的 Vue 状态管理库。`);
  if (needsEslint) features.push(`- **ESLint**: 代码规范和风格检查工具...`);
  if (cssPreprocessor !== "none")
    features.push(`- **${cssPreprocessor}**: ${cssPreprocessor} 预处理器...`);
  if (needsUnoCSS) features.push(`- **UnoCSS**: 即时按需原子化 CSS 引擎...`);
  if (needsGitCommit)
    features.push(
      `- **Git Commit 规范**: 通过 Husky、lint-staged 和 Commitlint...`
    );

  copyTemplate("README.md.tpl", path.join(projectPath, "README.md"), {
    projectName: options.projectName,
    packageManager: options.packageManager,
    features: features.join("\n"),
    lintScript: needsEslint
      ? `- \`${options.packageManager} run lint\`: 运行 ESLint 检查并自动修复代码中的问题。`
      : "",
    routerDir: needsRouter ? `│   ├── router/       # Vue Router 路由配置` : "",
    piniaDir: needsPinia ? `│   ├── store/        # Pinia 状态管理模块` : "",
    viewsDir: needsRouter ? `│   ├── views/        # 页面级 Vue 组件` : "",
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
  });
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
