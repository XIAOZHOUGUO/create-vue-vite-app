# {{ projectName }}

## Introduction

This is a modern frontend project built with [Vue 3](https://vuejs.org/) and [Vite](https://vitejs.dev/). It integrates various development tools and best practices, aiming to provide an efficient and maintainable development experience.

## Features

This project integrates the following features based on your selections:

{{ features }}

## Getting Started with the CLI

To use this CLI tool, ensure you have [Node.js](https://nodejs.org/) (LTS recommended) installed.

1.  **Install the CLI (Globally - Recommended for frequent use)**

    ```bash
    npm install -g @xiaozhou/create-vue-vite-app
    # or
    pnpm install -g @xiaozhou/create-vue-vite-app
    # or
    yarn global add @xiaozhou/create-vue-vite-app
    ```

2.  **Create a New Project**

    ```bash
    create-vue
    # or use npx/pnpx for one-time use without global installation
    npx @xiaozhou/create-vue-vite-app
    # or
    pnpx @xiaozhou/create-vue-vite-app
    ```

    Follow the prompts to configure your new project.

## Project Quick Start

Once your project is created, navigate into the project directory and follow these steps:

1.  **Install Dependencies**

    ```bash
    {{ packageManager }} install
    ```

2.  **Run Development Server**

    ```bash
    {{ packageManager }} run dev
    ```

## Available Scripts

-   `{{ packageManager }} run dev`: Runs the application in development mode.
-   `{{ packageManager }} run build`: Builds the application for production.
{{ lintScript }}

## Directory Structure

```
{{ projectName }}/
├── public/
├── src/
│   ├── assets/       # Static assets
│   ├── components/   # Reusable Vue components
{{ routerDir }}
{{ piniaDir }}
{{ viewsDir }}
│   ├── App.vue       # Root Vue component
│   └── main.{{ mainFileExtension }}    # Application entry file
├── .vscode/          # VS Code editor configuration
├── .gitignore        # Git ignore file
├── index.html        # Application entry HTML file
├── package.json      # Project dependencies and scripts
├── vite.config.{{ viteConfigExtension }} # Vite configuration file
{{ tsconfig }}
{{ eslintConfig }}
{{ unocssConfig }}
{{ commitlintConfig }}
```

{{ codeQualityTools }}

## Contributing

Contributions via Pull Requests are welcome, as are Issue reports and suggestions.
