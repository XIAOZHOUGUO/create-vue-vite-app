### Husky and lint-staged

Husky is used to manage Git hooks. A pre-commit hook is configured to run lint-staged, which in turn runs ESLint on staged files. This ensures that no code with linting errors can be committed.

### Commitizen

Commitizen is used to enforce conventional commit messages. To use it, run the following command instead of `git commit`:

```bash
{{ packageManager }} run cz
```

This will prompt you with a series of questions to generate a conventional commit message. For more details on the commit message format, please refer to the [Conventional Commits specification](https://www.conventionalcommits.org/).

In short, the format is:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- **type**: Represents the type of commit, e.g., `feat` (new feature), `fix` (bug fix), `docs` (documentation), `style` (code style), `refactor` (code refactoring), `test` (tests), `chore` (changes to the build process or auxiliary tools).
- **scope**: (Optional) Represents the scope of this change, e.g., `button`, `login`, `core`.
- **description**: A short description of the change.

A `commit-msg` hook is also configured to validate the commit message format.

Here is an example of a valid commit message:

```text
feat(button): add new ripple effect

- Add a new ripple effect to the button component.
- The effect is triggered on click.
```
