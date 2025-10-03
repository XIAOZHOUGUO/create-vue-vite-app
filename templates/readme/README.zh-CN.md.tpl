# <%= projectName %>

## 简介

这是一个基于 [Vue 3](https://vuejs.org/) 和 [Vite](https://vitejs.dev/) 构建的现代前端项目。它集成了多种开发工具和最佳实践，旨在提供高效、可维护的开发体验。

## 主要特性

本项目根据您的选择，集成了以下功能：

<%- featuresZh %>

## 项目快速开始

项目创建完成后，进入项目目录并按照以下步骤操作：

1. **安装依赖**

    ```bash
    <%= packageManager %> install
    ```

2. **运行开发服务器**

    ```bash
    <%= packageManager %> run dev
    ```

## 可用脚本

- `<%= packageManager %> run dev`: 在开发模式下运行应用。
- `<%= packageManager %> run build`: 为生产环境构建应用。
<% if (needsEslint) { -%>
- `<%= packageManager %> run lint`: 运行 ESLint 检查并自动修复代码中的问题。
<% } -%>

## 目录结构

```text
<%= projectName %>
<% if (needsGitCommit) { -%>
├── .husky/
<% } -%>
├── .vscode/          # VS Code 编辑器配置
├── public/
├── src/
│   ├── assets/       # 静态资源
│   ├── components/   # 可复用 Vue 组件
<% if (needsRouter) { -%>
│   ├── router/       # Vue Router 路由配置
<% } -%>
<% if (needsPinia) { -%>
│   ├── store/        # Pinia 状态管理模块
<% } -%>
<% if (needsRouter) { -%>
│   ├── views/        # 页面级 Vue 组件
<% } -%>
│   ├── App.vue       # 应用根组件
│   └── main.<%= ext %>   # 应用入口文件
├── .gitignore        # Git 忽略文件
<% if (needsGitCommit) { -%>
├── commitlint.config.js
<% } -%>
<% if (needsEslint) { -%>
├── eslint.config.<%= ext %>
<% } -%>
├── index.html        # 应用入口 HTML 文件
├── package.json      # 项目依赖和脚本配置
<% if (needsTypeScript) { -%>
├── tsconfig.json
├── tsconfig.node.json
<% } -%>
<% if (needsUnoCSS) { -%>
├── uno.config.<%= ext %>
<% } -%>
├── vite.config.<%= ext %> # Vite 配置文件
```

<%- qualityToolsZh %>
