# <%= projectName %>

## Introduction

This is a modern frontend project built with [Vue 3](https://vuejs.org/) and [Vite](https://vitejs.dev/). It integrates various development tools and best practices, aiming to provide an efficient and maintainable development experience.

## Features

This project integrates the following features based on your selections:

<%- featuresEn %>

## Project Quick Start

Once your project is created, navigate into the project directory and follow these steps:

1. **Install Dependencies**

    ```bash
    <%= packageManager %> install
    ```

2. **Run Development Server**

    ```bash
    <%= packageManager %> run dev
    ```

## Available Scripts

- `<%= packageManager %> run dev`: Runs the application in development mode.
- `<%= packageManager %> run build`: Builds the application for production.
<% if (needsEslint) { -%>
- `<%= packageManager %> run lint`: run lint and auto fix code.
<% } -%>

## Directory Structure

```text
<%= projectName %>
<% if (needsGitCommit) { -%>
├── .husky/
<% } -%>
├── .vscode/          # VS Code editor configuration
├── public/
├── src/
│   ├── assets/       # Static assets
│   ├── components/   # Reusable Vue components
<% if (needsRouter) { -%>
│   ├── router/       # Vue Router
<% } -%>
<% if (needsPinia) { -%>
│   ├── store/        # Pinia
<% } -%>
<% if (needsRouter) { -%>
│   ├── views/        # pages
<% } -%>
│   ├── App.vue       # Root Vue component
│   └── main.<%= ext %>   # Application entry file
├── .gitignore        # Git ignore file
<% if (needsGitCommit) { -%>
├── commitlint.config.js
<% } -%>
<% if (needsEslint) { -%>
├── eslint.config.<%= ext %>
<% } -%>
├── index.html        # Application entry HTML file
├── package.json      # Project dependencies and scripts
<% if (needsTypeScript) { -%>
├── tsconfig.json
├── tsconfig.node.json
<% } -%>
<% if (needsUnoCSS) { -%>
├── uno.config.<%= ext %>
<% } -%>
├── vite.config.<%= ext %> # Vite configuration file
```

<%- qualityToolsEn %>
