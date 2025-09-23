import antfu from '@antfu/eslint-config'

export default antfu({
  type: 'lib',
  typescript: true,
  stylistic: {
    indent: 2,
    quotes: 'single',
  },
  ignores: [
    'dist',
    'node_modules',
  ],
}, {
  // Custom rules
  rules: {
    'no-console': 'off',
  },
})
