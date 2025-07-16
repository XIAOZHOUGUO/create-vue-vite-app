# {{ projectName }}

## 简介

这是一个基于 [Vue 3](https://vuejs.org/) 和 [Vite](https://vitejs.dev/) 构建的现代前端项目。它集成了多种开发工具和最佳实践，旨在提供高效、可维护的开发体验。

## 主要特性

本项目根据您的选择，集成了以下功能：

{{ features }}

## 快速开始

请确保您已安装 [Node.js](https://nodejs.org/) (推荐 LTS 版本) 和 {{ packageManager }}。

1. **安装依赖**

```bash
{{ packageManager }} install
```

2. **运行开发服务器**

```bash
{{ packageManager }} run dev
```

## 可用脚本

- `{{ packageManager }} run dev`: 在开发模式下运行应用。
- `{{ packageManager }} run build`: 为生产环境构建应用。
{{ lintScript }}

## 目录结构

```
{{ projectName }}/
├── public/
├── src/
│   ├── assets/       # 静态资源
│   ├── components/   # 可复用 Vue 组件
{{ routerDir }}
{{ piniaDir }}
{{ viewsDir }}
│   ├── App.vue       # 应用根组件
│   └── main.{{ mainFileExtension }}    # 应用入口文件
├── .vscode/          # VS Code 编辑器配置
├── .gitignore        # Git 忽略文件
├── index.html        # 应用入口 HTML 文件
├── package.json      # 项目依赖和脚本配置
├── vite.config.{{ viteConfigExtension }} # Vite 配置文件
{{ tsconfig }}
{{ eslintConfig }}
{{ unocssConfig }}
{{ commitlintConfig }}
```

{{ codeQualityTools }}

## 贡献

欢迎通过 Pull Request 贡献代码，或提交 Issue 报告问题和提出建议。
