### Husky 和 lint-staged

本项目使用 Husky 管理 Git 钩子。我们配置了一个 pre-commit 钩子，它会运行 lint-staged，从而对暂存区的文件执行 ESLint 检查。此操作，确保不规范的代码无法被提交。

### Commitizen

本项目使用 Commitizen 来规范提交信息。请使用以下命令替代 `git commit` 命令：

```bash
<%= packageManager %> run cz
```

这将引导您通过一系列问题来生成一个符合规范的提交信息。关于提交信息格式的更多细节，请参考 [Conventional Commits 规范](https://www.conventionalcommits.org/)。

简而言之，格式如下：

```text
<type>[可选范围]: <描述>

[可选正文]

[可选脚注]
```

- **type**: 代表提交的类型，例如 `feat` (新功能)、`fix` (修复 bug)、`docs` (文档)、`style` (代码风格)、`refactor` (代码重构)、`test` (测试)、`chore` (构建过程或辅助工具的变动)。
- **scope**: (可选) 代表本次改动的范围，例如 `button`、`login`、`core`。
- **description**: 对改动的简短描述。

我们同样配置了 `commit-msg` 钩子来验证提交信息的格式。

这是一个有效的提交信息示例：

```text
feat(button): 添加新的波纹效果

- 为按钮组件添加新的波纹效果。
- 该效果在点击时触发。
```