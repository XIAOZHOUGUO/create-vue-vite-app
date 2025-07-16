{
  "eslint.useFlatConfig": true,
  "explorer.fileNesting.enabled": true,
  "explorer.fileNesting.patterns": {
    "tsconfig.json": "tsconfig.*.json, env.d.ts",
    "vite.config.*": "jsconfig*, vitest.config.*",
    "package.json": "package-lock.json, pnpm*, .yarnrc*, .eslint*"
  },
  "prettier.enable": false,
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "eslint.rules.customizations": [
    { "rule": "style/*", "severity": "off" },
    { "rule": "format/*", "severity": "off" }
  ],
  "eslint.validate": [
    "javascript", "typescript", "vue", "html", "markdown", "json", "jsonc", "yaml"
  ]
}
