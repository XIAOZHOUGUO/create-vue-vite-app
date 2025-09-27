import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// --- Test Setup ---
let projectDir: string

beforeEach(() => {
  // Create a new unique temporary directory for each test to ensure isolation.
  projectDir = mkdtempSync(join(tmpdir(), 'cli-e2e-test-'))
})

afterEach(() => {
  // Use a best-effort, fire-and-forget cleanup.
  // This prevents the test suite from failing or timing out due to Windows file locks.
  if (projectDir) {
    try {
      rmSync(projectDir, { recursive: true, force: true })
    }
    catch (e) {
      console.warn('⚠️ Cleanup failed (可能是 Windows 文件锁):', e)
    }
  }
})

// --- Constants for Interaction ---
const ARROW_DOWN = '\x1B[B'
const ENTER = '\n'

/**
 * Runs the CLI in a child process and interacts with it by sending a sequence of inputs.
 * @param inputs An array of strings representing user inputs.
 * @param cwd The working directory to run the command in.
 * @returns A promise that resolves with the process's exit code, stdout, and stderr.
 */
function runInteractiveCli(inputs: string[], cwd: string): Promise<{ code: number | null, stdout: string, stderr: string }> {
  const command = 'node'
  // Note: Adjust the path if your test setup changes.
  const args = [join(__dirname, '../dist/index.js')]
  const child = spawn(command, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] })

  let stdout = ''
  let stderr = ''
  child.stdout.on('data', data => (stdout += data.toString()))
  child.stderr.on('data', data => (stderr += data.toString()))

  const writeToStdin = (index = 0) => {
    if (index < inputs.length) {
      setTimeout(() => {
        child.stdin.write(inputs[index])
        writeToStdin(index + 1)
      }, 500)
    }
    else {
      child.stdin.end()
    }
  }

  writeToStdin()

  return new Promise((resolve) => {
    child.on('close', (code) => {
      resolve({ code, stdout, stderr })
    })
    child.on('error', (err) => {
      stderr += err.message
      resolve({ code: 1, stdout, stderr })
    })
  })
}

describe('cli End-to-End Test', () => {
  it('should scaffold a new project with a full feature set', async () => {
    const projectName = 'my-final-app'
    const projectPath = join(projectDir, projectName)

    const inputs = [
      projectName + ENTER,
      ENTER, // pnpm
      ENTER, // TypeScript
      ENTER, // Router
      ENTER, // Pinia
      ENTER, // ESLint
      ARROW_DOWN + ENTER, // Sass
      ENTER, // UnoCSS
      ENTER, // Git hooks
    ]

    const result = await runInteractiveCli(inputs, projectDir)

    // Assert the process exited cleanly (exit code 0).
    // We no longer check stderr, as progress indicators (like ora) write to it.
    expect(result.code).toBe(0)

    // Assert that the main scaffolded files and directories exist
    expect(existsSync(projectPath), 'Project directory should exist').toBe(true)
    expect(existsSync(join(projectPath, 'package.json')), 'package.json should exist').toBe(true)
    expect(existsSync(join(projectPath, 'vite.config.ts')), 'vite.config.ts should exist').toBe(true)
    expect(existsSync(join(projectPath, 'src', 'router')), 'src/router directory should exist').toBe(true)
    expect(existsSync(join(projectPath, 'src', 'store')), 'src/store directory should exist').toBe(true)
    expect(existsSync(join(projectPath, '.husky')), '.husky directory should exist for git hooks').toBe(true)

    // Assert package.json content
    const pkgJson = JSON.parse(readFileSync(join(projectPath, 'package.json'), 'utf-8'))
    expect(pkgJson.name).toBe(projectName)
    expect(pkgJson.dependencies).toHaveProperty('vue-router')
    expect(pkgJson.dependencies).toHaveProperty('pinia')
    expect(pkgJson.devDependencies).toHaveProperty('sass-embedded')
    expect(pkgJson.devDependencies).toHaveProperty('husky')
  }, 180000) // 3-minute timeout for the full installation and setup
})
