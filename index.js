#!/usr/bin/env node

// 导入Node.js内置模块
const fs = require("fs");
const path = require("path");
const prompts = require("prompts");
const { red } = require("kolorist");
const { execSync } = require("child_process");

async function main() {
  let projectName;
  let projectPath;

  while (true) {
    const response = await prompts({
      type: "text",
      name: "projectName",
      message: "项目名称:",
      initial: "vite-demo",
      validate: (name) => {
        if (!name) return "项目名称不能为空";
        const targetPath = path.join(process.cwd(), name);
        if (fs.existsSync(targetPath)) {
          return `项目目录 ${targetPath} 已存在. 请输入其他名称.`;
        }
        return true;
      },
    });

    projectName = response.projectName;
    projectPath = path.join(process.cwd(), projectName);

    if (projectName && !fs.existsSync(projectPath)) {
      break; // 名称有效且目录不存在，跳出循环
    }
  }

  // 收集用户的所有选择
  const response = await prompts([
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
      message: "是否需要 ESLint?",
      initial: true,
    },
    {
      type: "select",
      name: "cssPreprocessor",
      message: "选择CSS预处理器:",
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
      message: "是否需要 git commit 规范?",
      initial: true,
    },
  ]);

  // 创建项目目录
  fs.mkdirSync(projectPath);

  // 根据用户选择，决定 vite 的模板
  const template = response.needsTypeScript ? "vue-ts" : "vue";

  // 根据用户选择决定包管理器
  const packageManager = response.packageManager;

  const command =
    packageManager === "pnpm"
      ? `pnpm create vite . --template ${template}`
      : `npm create vite@latest . --template ${template}`;

  // 使用 vite 创建一个基础的 vue 项目
  execSync(command, {
    stdio: "inherit",
    cwd: projectPath,
  });

  const mainFileName = response.needsTypeScript ? "main.ts" : "main.js";
  const mainFilePath = path.join(projectPath, "src", mainFileName);
  let mainFileContent = fs.readFileSync(mainFilePath, "utf-8");

  let appInstance = "const app = createApp(App);\n";

  // 定义所有需要安装的依赖
  const dependencies = [];
  const devDependencies = [];

  // 添加pnpm 依赖
  if (packageManager === "pnpm") {
    devDependencies.push("pnpm");
  }

  // 如果用户选择需要 router，则安装并配置
  if (response.needsRouter) {
    dependencies.push("vue-router");

    const routerDir = path.join(projectPath, "src", "router");
    fs.mkdirSync(routerDir, { recursive: true });

    const routerFileName = response.needsTypeScript ? "index.ts" : "index.js";
    const routerFilePath = path.join(routerDir, routerFileName);
    const routerContent = response.needsTypeScript
      ? `import { createRouter, createWebHistory } from 'vue-router'\nimport type { RouteRecordRaw } from 'vue-router'\nimport HomeView from '../views/Home.vue'\n\nconst routes: Array<RouteRecordRaw> = [\n  {\n    path: '/',\n    name: 'Home',\n    component: HomeView\n  }\n]\n\nconst router = createRouter({\n  history: createWebHistory(),\n  routes\n})\n\nexport default router`
      : `import { createRouter, createWebHistory } from 'vue-router'\nimport HomeView from '../views/Home.vue'\n\nconst routes = [\n  {\n    path: '/',\n    name: 'Home',
    component: HomeView
  }\n]\n\nconst router = createRouter({
  history: createWebHistory(),
  routes
})\n\nexport default router`;
    fs.writeFileSync(routerFilePath, routerContent);

    const viewsDir = path.join(projectPath, "src", "views");
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(
      path.join(viewsDir, "Home.vue"),
      "<template><h1>Home</h1></template>"
    );

    mainFileContent = `import router from './router'\n${mainFileContent}`;
    appInstance += `app.use(router);\n`;

    const appVuePath = path.join(projectPath, "src", "App.vue");
    let appVueContent = fs.readFileSync(appVuePath, "utf-8");
    appVueContent = appVueContent.replace(
      /<HelloWorld.*\/>/,
      "<router-view />"
    );
    appVueContent = appVueContent.replace(/import HelloWorld.*\n/, "");
    fs.writeFileSync(appVuePath, appVueContent);
  }

  // 如果用户选择需要 pinia，则安装 pinia 并进行配置
  if (response.needsPinia) {
    dependencies.push("pinia");

    const storeDir = path.join(projectPath, "src", "store");
    fs.mkdirSync(storeDir, { recursive: true });

    const storeFileName = response.needsTypeScript ? "index.ts" : "index.js";
    const storeFilePath = path.join(storeDir, storeFileName);
    const storeContent = response.needsTypeScript
      ? `import { defineStore, acceptHMRUpdate } from 'pinia'\n\nexport const useCounterStore = defineStore('counter', {\n  state: () => ({\n    count: 0 as number,\n  }),\n  actions: {\n    increment() {\n      this.count++\n    },\n  },\n})\n\nif (import.meta.hot) {\n  import.meta.hot.accept(acceptHMRUpdate(useCounterStore, import.meta.hot))\n}`
      : `import { defineStore, acceptHMRUpdate } from 'pinia'\n\nexport const useCounterStore = defineStore('counter', {\n  state: () => ({\n    count: 0,\n  }),\n  actions: {\n    increment() {\n      this.count++\n    },\n  },\n})\n\nif (import.meta.hot) {\n  import.meta.hot.accept(acceptHMRUpdate(useCounterStore, import.meta.hot))\n}`; // 添加 HMR 相关内容
    fs.writeFileSync(storeFilePath, storeContent);

    mainFileContent = `import { createPinia } from 'pinia'\n${mainFileContent}`;
    appInstance += `const pinia = createPinia();\napp.use(pinia);\n`;
  }

  // 挂载App
  appInstance += `app.mount('#app');`;

  // 替换原有的createApp().mount()调用为新的appInstance
  mainFileContent = mainFileContent.replace(
    /createApp\(App\)\.mount\(['"]#app['"]\)/,
    appInstance
  );

  fs.writeFileSync(mainFilePath, mainFileContent);

  // 如果用户选择了CSS预处理器，则安装对应的依赖
  if (response.cssPreprocessor === "sass") {
    devDependencies.push("sass-embedded");
  } else if (response.cssPreprocessor === "less") {
    devDependencies.push("less");
  }

  // 如果用户选择需要 eslint，则安装 eslint 和相关配置
  if (response.needsEslint) {
    devDependencies.push("eslint", "@antfu/eslint-config");

    const eslintConfigFileName = response.needsTypeScript
      ? "eslint.config.ts"
      : "eslint.config.js";
    const eslintConfigFilePath = path.join(projectPath, eslintConfigFileName);

    let eslintConfigContent = `import antfu from '@antfu/eslint-config'\n\nexport default antfu({\n  vue: true,\n  typescript: ${response.needsTypeScript},\n`;

    if (response.needsUnoCSS) {
      eslintConfigContent += `  unocss: true,\n`;
    }
    eslintConfigContent += `});\n`;

    fs.writeFileSync(eslintConfigFilePath, eslintConfigContent);
  }

  // 如果用户选择需要 UnoCSS，则安装 UnoCSS 并创建配置文件
  if (response.needsUnoCSS) {
    devDependencies.push("unocss");

    const unoConfigFileName = response.needsTypeScript
      ? "uno.config.ts"
      : "uno.config.js";
    const unoConfigFilePath = path.join(projectPath, unoConfigFileName);
    fs.writeFileSync(
      unoConfigFilePath,
      `import { defineConfig, presetAttributify, presetWind3 } from 'unocss'\n\nexport default defineConfig({\n  presets: [\n    presetAttributify(),\n    presetWind3(),\n  ],\n})\n`
    );

    // 修改 vite 配置文件
    const viteConfigFileName = response.needsTypeScript
      ? "vite.config.ts"
      : "vite.config.js";
    const viteConfigFilePath = path.join(projectPath, viteConfigFileName);
    let viteConfigContent = fs.readFileSync(viteConfigFilePath, "utf-8");
    viteConfigContent = viteConfigContent.replace(
      /import { defineConfig } from 'vite'/,
      `import { defineConfig } from 'vite'\nimport UnoCSS from 'unocss/vite'`
    );
    // 替换 plugins 数组，确保 UnoCSS() 被添加
    viteConfigContent = viteConfigContent.replace(
      /(plugins:\s*\[)/,
      `$1\n    UnoCSS(),`
    );
    fs.writeFileSync(viteConfigFilePath, viteConfigContent);

    // 修改 main.js/ts 文件
    mainFileContent = `import 'virtual:uno.css'\n${mainFileContent}`;
    fs.writeFileSync(mainFilePath, mainFileContent);
  }

  // 如果用户同时选择了 eslint 和 unocss，则添加 unocss 的 eslint 插件
  if (response.needsEslint && response.needsUnoCSS) {
    devDependencies.push("@unocss/eslint-plugin");
  }

  // 如果用户选择了 ts，并且也使用了 eslint 或 unocss,则需要把对应的配置文件添加到 tsconfig.node.json 中
  if (
    response.needsTypeScript &&
    (response.needsEslint || response.needsUnoCSS)
  ) {
    const tsconfigNodePath = path.join(projectPath, "tsconfig.node.json");
    if (fs.existsSync(tsconfigNodePath)) {
      try {
        // 读取 tsconfig.node.json 文件内容
        let tsconfigNodeContent = fs.readFileSync(tsconfigNodePath, "utf-8");
        // 移除 JSON 文件中的注释
        tsconfigNodeContent = tsconfigNodeContent.replace(
          /\/\/.*|\/\*[^]*?\*\//g,
          ""
        );
        let tsconfigNodeJson = JSON.parse(tsconfigNodeContent);
        if (!tsconfigNodeJson.include) {
          tsconfigNodeJson.include = [];
        }

        if (response.needsEslint) {
          tsconfigNodeJson.include.push("eslint.config.ts");
        }
        if (response.needsUnoCSS) {
          tsconfigNodeJson.include.push("uno.config.ts");
        }

        // 去重
        tsconfigNodeJson.include = [...new Set(tsconfigNodeJson.include)];

        // 写回 tsconfig.node.json
        fs.writeFileSync(
          tsconfigNodePath,
          JSON.stringify(tsconfigNodeJson, null, 2)
        );
      } catch (e) {
        console.error(
          red(
            `✖ 无法自动更新 ${tsconfigNodePath}. 请手动将 eslint.config.ts 和/或 uno.config.ts 添加到 "include" 数组中。`
          )
        );
      }
    }
  }

  // 如果用户选择需要 git commit 规范，则安装 husky、lint-staged 和 commitlint等
  if (response.needsGitCommit) {
    devDependencies.push(
      "husky",
      "lint-staged",
      "commitizen",
      "cz-conventional-changelog",
      "@commitlint/cli",
      "@commitlint/config-conventional"
    );

    // 创建 commitlint 配置文件
    fs.writeFileSync(
      path.join(projectPath, "commitlint.config.js"),
      `export default { extends: ['@commitlint/config-conventional'] };\n`
    );

    // 处理 .gitignore 文件，确保 .vscode/settings.json 和 .vscode/extensions.json 不被忽略
    const gitignorePath = path.join(projectPath, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      let gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
      let lines = gitignoreContent.split("\n");

      // 移除任何现有的 .vscode 相关的忽略规则，以便重新添加它们
      lines = lines.filter(
        (line) =>
          !line.startsWith(".vscode/") &&
          !line.startsWith("!.vscode/extensions.json") &&
          !line.startsWith("!.vscode/settings.json") &&
          !line.startsWith(".vscode/*") // 移除旧的通配符忽略
      );

      const vscodeSection = [
        ".vscode/*", // 忽略 .vscode 目录下其他文件
        "!.vscode/extensions.json", // 但不忽略 extensions.json
        "!.vscode/settings.json", // 也不忽略 settings.json
      ];

      let editorSectionHeaderIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === "# Editor directories and files") {
          editorSectionHeaderIndex = i;
          break;
        }
      }

      if (editorSectionHeaderIndex !== -1) {
        // 在标题下方插入新的 .vscode 部分
        lines.splice(editorSectionHeaderIndex + 1, 0, ...vscodeSection);
      } else {
        // 如果没有找到标题，则在文件末尾添加标题和 .vscode 部分
        lines.push("", "# Editor directories and files", ...vscodeSection);
      }

      // 清理可能产生的多余空行
      lines = lines.filter(
        (line, index, arr) => !(line === "" && arr[index + 1] === "")
      );

      fs.writeFileSync(gitignorePath, lines.join("\n"));
    }
  }

  // 处理 VS Code 推荐扩展
  const vscodeDir = path.join(projectPath, ".vscode");
  fs.mkdirSync(vscodeDir, { recursive: true });
  const extensionsFilePath = path.join(vscodeDir, "extensions.json");
  let extensions = { recommendations: ["Vue.volar"] };

  if (fs.existsSync(extensionsFilePath)) {
    try {
      extensions = JSON.parse(fs.readFileSync(extensionsFilePath, "utf-8"));
    } catch (e) {
      console.error(red(`✖ 无法解析 ${extensionsFilePath}: ${e.message}`));
    }
  }

  if (!extensions.recommendations) {
    extensions.recommendations = [];
  }

  if (
    response.needsEslint &&
    !extensions.recommendations.includes("dbaeumer.vscode-eslint")
  ) {
    extensions.recommendations.push("dbaeumer.vscode-eslint");
  }
  if (
    response.needsUnoCSS &&
    !extensions.recommendations.includes("antfu.unocss")
  ) {
    extensions.recommendations.push("antfu.unocss");
  }

  fs.writeFileSync(extensionsFilePath, JSON.stringify(extensions, null, 2));

  // 创建 settings.json
  const settingsFilePath = path.join(vscodeDir, "settings.json");
  const settingsContent = `{
  // Enable the Eslint flat config support
  "eslint.useFlatConfig": true,

  // Enable file nesting for specific file types
  "explorer.fileNesting.enabled": true,
  "explorer.fileNesting.patterns": {
    "tsconfig.json": "tsconfig.*.json, env.d.ts",
    "vite.config.*": "jsconfig*, vitest.config.*, cypress.config.*, playwright.config.*",
    "package.json": "package-lock.json, pnpm*, .yarnrc*, yarn*, .eslint*, eslint*, .oxlint*, oxlint*, .prettier*, prettier*, .editorconfig"
  },

  // Disable the default formatter, use eslint instead
  "prettier.enable": false,
  "editor.formatOnSave": false,

  // Auto fix
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },

  // Silent the stylistic rules in you IDE, but still auto fix them
  "eslint.rules.customizations": [
    { "rule": "style/*", "severity": "off" },
    { "rule": "format/*", "severity": "off" },
    { "rule": "*-indent", "severity": "off" },
    { "rule": "*-spacing", "severity": "off" },
    { "rule": "*-breaks", "severity": "off" },
    { "rule": "*-quotes", "severity": "off" },
    { "rule": "*-semi", "severity": "off" }
  ],

  // Enable eslint for all supported languages
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "vue",
    "html",
    "markdown",
    "json",
    "jsonc",
    "yaml"
  ]
}`;
  fs.writeFileSync(settingsFilePath, settingsContent);

  // 统一处理依赖安装
  console.log("\n正在更新 package.json 并安装依赖...");

  // 读取并更新 package.json
  const pkgPath = path.join(projectPath, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  // 添加依赖到 package.json
  if (dependencies.length > 0) {
    if (!pkg.dependencies) pkg.dependencies = {};
    dependencies.forEach((dep) => {
      pkg.dependencies[dep] = "latest";
    });
  }

  if (devDependencies.length > 0) {
    if (!pkg.devDependencies) pkg.devDependencies = {};
    devDependencies.forEach((dep) => {
      pkg.devDependencies[dep] = "latest";
    });
  }

  // 如果有 eslint，添加 lint 脚本
  if (response.needsEslint) {
    if (!pkg.scripts) pkg.scripts = {};
    pkg.scripts.lint = "eslint . --fix";
  }

  // 如果有 git commit 规范，添加 lint-staged 配置
  if (response.needsGitCommit) {
    pkg.scripts.cz = "cz";
    pkg["lint-staged"] = {
      "*.{js,ts,vue}": "eslint --fix",
    };
    // 移除 prepare 脚本，因为 husky init 会自动添加
    if (pkg.scripts && pkg.scripts.prepare) {
      delete pkg.scripts.prepare;
    }
  }

  // Sort dependencies alphabetically
  if (pkg.dependencies) {
    pkg.dependencies = Object.keys(pkg.dependencies)
      .sort()
      .reduce((obj, key) => {
        obj[key] = pkg.dependencies[key];
        return obj;
      }, {});
  }

  // Sort devDependencies alphabetically
  if (pkg.devDependencies) {
    pkg.devDependencies = Object.keys(pkg.devDependencies)
      .sort()
      .reduce((obj, key) => {
        obj[key] = pkg.devDependencies[key];
        return obj;
      }, {});
  }

  // 写回 package.json
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  // 一次性安装所有依赖
  console.log("正在安装依赖...");
  execSync(`${packageManager} install`, { stdio: "inherit", cwd: projectPath });

  // 如果需要 eslint，则执行格式化
  if (response.needsEslint) {
    console.log("正在格式化项目...");
    execSync("npx eslint . --fix", { stdio: "inherit", cwd: projectPath });
  }

  // 如果需要 git commit 规范，在依赖安装完成后初始化 husky
  if (response.needsGitCommit) {
    console.log("正在初始化 husky、commitizen...");

    // 使用 npx 更稳妥，兼容所有包管理器
    execSync("npx husky init", { stdio: "inherit", cwd: projectPath });

    // 直接写入 pre-commit 钩子文件
    fs.writeFileSync(
      path.join(projectPath, ".husky", "pre-commit"),
      `npx lint-staged`
    );
    execSync(`chmod +x ${path.join(projectPath, ".husky", "pre-commit")}`, {
      stdio: "inherit",
      cwd: projectPath,
    });

    // 直接写入 commit-msg 钩子文件
    fs.writeFileSync(
      path.join(projectPath, ".husky", "commit-msg"),
      `npx commitlint --edit "$1"`
    );
    execSync(`chmod +x ${path.join(projectPath, ".husky", "commit-msg")}`, {
      stdio: "inherit",
      cwd: projectPath,
    });
    // 初始化一个git 仓库，并将默认分支设置为main
    execSync("git init -b main", {
      stdio: "inherit",
      cwd: projectPath,
    });

    // 初始化 commitizen
    const commitizenInitCommand =
      packageManager === "npm"
        ? "npm commitizen init cz-conventional-changelog --save-dev --save-exact"
        : `pnpm commitizen init cz-conventional-changelog --pnpm --save-dev --save-exact`;
    execSync(commitizenInitCommand, { stdio: "inherit", cwd: projectPath });

    //  运行script prepare
    execSync(`${packageManager} run prepare`, {
      stdio: "inherit",
      cwd: projectPath,
    });
  }

  console.log("\n依赖安装完成！");

  // 打印完成信息
  console.log(`\n🎉 项目创建成功! 现在运行:\n`);
  console.log(`  cd ${projectName}`);
  console.log(`  ${packageManager} dev`);
  console.log();

  // 生成 README.md 文件
  /**
   * @description 生成 README.md 文件
   * @param {object} response - 用户选择的配置对象
   * @param {string} projectName - 项目名称
   * @returns {string} README.md 文件的内容
   */
  function generateReadmeContent(response, projectName) {
    let readmeContent = `# ${projectName}\n\n`;
    readmeContent += `## 简介\n\n`;
    readmeContent += `这是一个基于 [Vue 3](https://vuejs.org/) 和 [Vite](https://vitejs.dev/) 构建的现代前端项目。它集成了多种开发工具和最佳实践，旨在提供高效、可维护的开发体验。\n\n`;

    readmeContent += `## 主要特性\n\n`;
    readmeContent += `本项目根据您的选择，集成了以下功能：\n\n`;
    if (response.needsTypeScript) {
      readmeContent += `- **TypeScript**: 强类型 JavaScript，提升代码质量和开发效率。\n`;
    }
    readmeContent += `- **Vite**: 极速的前端构建工具，提供闪电般的开发服务器启动和热更新。\n`;
    if (response.needsRouter) {
      readmeContent += `- **Vue Router**: 官方路由管理器，用于构建单页面应用。\n`;
    }
    if (response.needsPinia) {
      readmeContent += `- **Pinia**: 轻量级、类型安全的 Vue 状态管理库。\n`;
    }
    if (response.needsEslint) {
      readmeContent += `- **ESLint**: 代码规范和风格检查工具，配合 [@antfu/eslint-config](https://github.com/antfu/eslint-config) 提供开箱即用的配置。\n`;
    }
    if (response.cssPreprocessor !== "none") {
      readmeContent += `- **${response.cssPreprocessor}**: ${response.cssPreprocessor} 预处理器，增强 CSS 编写能力。\n`;
    }
    if (response.needsUnoCSS) {
      readmeContent += `- **UnoCSS**: 即时按需原子化 CSS 引擎，提供极致的开发灵活性和性能。\n`;
    }
    if (response.needsGitCommit) {
      readmeContent += `- **Git Commit 规范**: 通过 [Husky](https://typicode.github.io/husky/)、[lint-staged](https://github.com/okonet/lint-staged) 和 [Commitlint](https://commitlint.js.org/) 强制执行统一的 Git 提交信息规范。\n`;
      readmeContent += `  - **Husky 和 lint-staged**: Husky 用于管理 Git 钩子。配置了 pre-commit 钩子，运行 lint-staged，它会在暂存文件上运行 ESLint。这确保了没有带有 linting 错误的代码可以被提交。\n`;
      readmeContent += `  - **Commitizen**: 用于强制执行约定式提交信息。使用时，请运行以下命令代替 \`git commit\`：\n\n`;
      readmeContent += `    \`\`\`bash\n`;
      readmeContent += `    git cz\n`;
      readmeContent += `    \`\`\`\n\n`;
      readmeContent += `    这将提示您一系列问题以生成约定式提交信息。有关提交信息格式的更多详细信息，请参阅 [Conventional Commits 规范](https://www.conventionalcommits.org/en/v1.0.0/)。\n\n`;
      readmeContent += `    简而言之，格式为：\n\n`;
      readmeContent += `    \`\`\`\n`;
      readmeContent += `    <type>[optional scope]: <description>\n\n`;
      readmeContent += `    [optional body]\n\n`;
      readmeContent += `    [optional footer(s)]\n`;
      readmeContent += `    \`\`\`\n`;
      readmeContent += `    - \`type\`: 表示提交的类型，例如 \`feat\` (新功能), \`fix\` (bug 修复), \`docs\` (文档), \`style\` (代码风格), \`refactor\` (代码重构), \`test\` (测试), \`chore\` (构建过程或辅助工具的更改)。\n`;
      readmeContent += `    - \`scope\`: (可选) 表示此更改的范围，例如 \`button\`, \`login\`, \`core\`。\n`;
      readmeContent += `    - \`description\`: 更改的简短描述。\n`;
      readmeContent += `    还配置了 commit-msg 钩子来验证提交信息格式。\n\n`;
      readmeContent += `    以下是一个有效提交信息的示例：\n\n`;
      readmeContent += `    \`\`\`\n`;
      readmeContent += `    feat(button): add new ripple effect\n\n`;
      readmeContent += `    - Add a new ripple effect to the button component.\n`;
      readmeContent += `    - The effect is triggered on click.\n`;
      readmeContent += `    \`\`\`\n`;
    }
    readmeContent += `\n`;

    readmeContent += `## 快速开始\n\n`;
    readmeContent += `请确保您已安装 [Node.js](https://nodejs.org/) (推荐 LTS 版本) 和 ${response.packageManager}。\n\n`;

    readmeContent += `1. **克隆或下载项目**\n\n`;
    readmeContent += `2. **安装依赖**\n\n`;
    readmeContent += `\`\`\`bash\n`;
    readmeContent += `${response.packageManager} install\n`;
    readmeContent += `\`\`\`\n\n`;

    readmeContent += `3. **运行开发服务器**\n\n`;
    readmeContent += `\`\`\`bash\n`;
    readmeContent += `${response.packageManager} run dev\n`;
    readmeContent += `\`\`\`\n\n`;
    readmeContent += `项目将在本地开发服务器上运行，通常是 \`http://localhost:5173/\` (具体端口请查看终端输出)。\n\n`;

    readmeContent += `## 可用脚本\n\n`;
    readmeContent += `在项目根目录中，您可以使用以下命令：\n\n`;

    readmeContent += `- \`${response.packageManager} run dev\`\n  在开发模式下运行应用。\n\n`;
    readmeContent += `- \`${response.packageManager} run build\`\n  为生产环境构建应用。构建产物将位于 \`dist/\` 目录下。\n\n`;
    if (response.needsEslint) {
      readmeContent += `- \`${response.packageManager} run lint\`\n  运行 ESLint 检查并自动修复代码中的问题。\n\n`;
    }
    readmeContent += `## 目录结构\n\n`;
    readmeContent += `\`\`\`\n`;
    readmeContent += `${projectName}/\n`;
    readmeContent += `├── public/\n`;
    readmeContent += `├── src/\n`;
    readmeContent += `│   ├── assets/       # 静态资源，如图片、字体等\n`;
    readmeContent += `│   ├── components/   # 可复用 Vue 组件\n`;
    readmeContent += `│   ├── router/       # Vue Router 路由配置 (如果选择)\n`;
    readmeContent += `│   ├── store/        # Pinia 状态管理模块 (如果选择)\n`;
    readmeContent += `│   ├── views/        # 页面级 Vue 组件\n`;
    readmeContent += `│   ├── App.vue       # 应用根组件\n`;
    readmeContent += `│   └── main.${
      response.needsTypeScript ? "ts" : "js"
    }    # 应用入口文件\n`;
    readmeContent += `├── .vscode/          # VS Code 编辑器配置和推荐扩展\n`;
    readmeContent += `├── .gitignore        # Git 忽略文件\n`;
    readmeContent += `├── index.html        # 应用入口 HTML 文件\n`;
    readmeContent += `├── package.json      # 项目依赖和脚本配置\n`;
    readmeContent += `├── vite.config.${
      response.needsTypeScript ? "ts" : "js"
    } # Vite 配置文件\n`;
    readmeContent += `${
      response.needsTypeScript
        ? "├── tsconfig.json\n├── tsconfig.node.json\n"
        : ""
    }${
      response.needsEslint
        ? `├── eslint.config.${response.needsTypeScript ? "ts" : "js"}\n`
        : ""
    }${
      response.needsUnoCSS
        ? `├── uno.config.${response.needsTypeScript ? "ts" : "js"}\n`
        : ""
    }${
      response.needsGitCommit ? `├── commitlint.config.js\n├── .husky/\n` : ""
    }\`\`\`\n\n`;

    readmeContent += `## 配置说明\n\n`;
    readmeContent += `- **Vite 配置**: 位于 \`vite.config.${
      response.needsTypeScript ? "ts" : "js"
    }\`，用于配置 Vite 构建行为。\n`;
    if (response.needsEslint) {
      readmeContent += `- **ESLint 配置**: 位于 \`eslint.config.${
        response.needsTypeScript ? "ts" : "js"
      }\`，基于 [@antfu/eslint-config](https://github.com/antfu/eslint-config) 提供。\n`;
    }
    if (response.needsUnoCSS) {
      readmeContent += `- **UnoCSS 配置**: 位于 \`uno.config.${
        response.needsTypeScript ? "ts" : "js"
      }\`，用于配置 UnoCSS 的规则和预设。\n`;
    }
    if (response.needsGitCommit) {
      readmeContent += `- **Commitlint 配置**: 位于 \`commitlint.config.js\`，用于规范 Git 提交信息。\n`;
    }
    readmeContent += `- **VS Code 配置**: \`.vscode/\` 目录下包含 \`extensions.json\` (推荐扩展) 和 \`settings.json\` (工作区设置)。\n\n`;

    readmeContent += `## 贡献\n\n`;
    readmeContent += `欢迎通过 Pull Request 贡献代码，或提交 Issue 报告问题和提出建议。\n\n`;

    readmeContent += `## 许可证\n\n`;
    readmeContent += `本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。\n\n`;

    return readmeContent;
  }

  const readmeContent = generateReadmeContent(response, projectName);
  fs.writeFileSync(path.join(projectPath, "README.md"), readmeContent);
}

main().catch((e) => {
  console.error(e);
});
