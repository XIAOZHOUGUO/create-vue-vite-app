import antfu from '@antfu/eslint-config'

export default antfu({
  // Enable stylistic formatting rules
  // stylistic: true,
  <% if (unoESLintConfig) { %>unocss: true,<% } -%>
  // Or customize the stylistic rules
  stylistic: {
    indent: 2,
    quotes: 'single',
  },

  // TypeScript and Vue are auto-detected, you can also explicitly enable them:
  <% if (typeScriptConfig) { %>typescript: true,<% } -%>
  vue: true,

  // Disable jsonc and yaml support
  jsonc: false,
  yaml: false,

  // `.eslintignore` is no longer supported in Flat config, use `ignores` instead
  ignores: [
    './fixtures',
    // ...globs
  ],
  // rules config
  rules: {

  },
});