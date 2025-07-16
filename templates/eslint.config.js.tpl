import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: {{ needsTypeScript }},
  {{ unoESLintConfig }}
});
