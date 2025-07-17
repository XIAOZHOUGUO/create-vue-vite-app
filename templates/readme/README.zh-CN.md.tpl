# {{ projectName }}

## 简介

这是一个基于 [Vue 3](https://vuejs.org/) 和 [Vite](https://vitejs.dev/) 构建的现代前端项目。它集成了多种开发工具和最佳实践，旨在提供高效、可维护的开发体验。

## 主要特性

本项目根据您的选择，集成了以下功能：

{{ features }}

## 项目快速开始

项目创建完成后，进入项目目录并按照以下步骤操作：

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

```text
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
