#!/usr/bin/env node

/**
 * 发布脚本：校验环境 -> 版本升级 -> 推送 main 与 tag。
 * 最后一步 npm publish（需 OTP / 浏览器认证）留给用户手动执行。
 * 用法: npm run release [major|minor|patch]   （不带参数时交互式选择）
 *       npm run release -- --check             （仅预检环境）
 * 版本类型依据改动内容选择: major=破坏性变更 / minor=新功能 / patch=修复
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import process from 'node:process'
import readline from 'node:readline/promises'

const VALID_BUMP = new Set(['major', 'minor', 'patch'])

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts })
}

function capture(cmd) {
  return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()
}

function fail(msg) {
  console.error(`\n✖ ${msg}`)
  process.exit(1)
}

function log(msg) {
  console.log(msg)
}

async function askBump() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    const raw = await rl.question('版本类型 [major/minor/patch]（回车默认 minor）: ')
    return raw.trim() || 'minor'
  }
  finally {
    rl.close()
  }
}

async function main() {
  const arg = process.argv[2]
  const checkOnly = arg === '--check'
  const bumpArg = checkOnly ? process.argv[3] || 'minor' : arg

  if (!existsSync('package.json')) {
    fail('未找到 package.json，请在项目根目录运行: npm run release')
  }

  const bump = bumpArg || await askBump()
  if (!VALID_BUMP.has(bump)) {
    fail(`无效的版本类型 "${bump}"，可用: major | minor | patch`)
  }

  log('── 发布预检 ───────────────────────')

  const status = capture('git status --porcelain')
  if (status) {
    fail(`工作区有未提交的改动，请先 commit:\n${status}`)
  }
  log('✔ git 工作区干净')

  let upstream
  try {
    upstream = capture('git rev-parse --abbrev-ref @{u}')
  }
  catch {
    fail('当前分支未设置上游分支，请先 push -u 建立追踪。')
  }

  const pendingCommits = capture(`git log --oneline @{u}..HEAD`)
  if (pendingCommits) {
    fail(`本地有未推送的提交，请先 push:\n${pendingCommits}`)
  }
  log(`✔ 已同步上游 (${upstream})`)

  const registry = capture('npm config get registry')
  if (!registry.includes('registry.npmjs.org')) {
    fail(`当前 registry 为 ${registry}\n请先切换到官方源: nrm use npm`)
  }
  log(`✔ registry 为官方源 (${registry})`)

  try {
    capture('npm whoami')
  }
  catch {
    fail('未登录 npm，请先执行 npm login（可能需要在浏览器完成认证）。')
  }
  log('✔ npm 已登录')

  if (checkOnly) {
    log('\n✔ 环境就绪，可以发布。\n执行 npm run release 完成版本升级与推送。')
    process.exit(0)
  }

  log(`\n执行 npm version ${bump} ...`)
  run(`npm version ${bump}`)

  const branch = capture('git branch --show-current')
  log(`\n推送 ${branch} 分支与 tag ...`)
  run(`git push origin ${branch} --tags`)

  log('\n完成：版本与 tag 已推送。')
  log('最后一步：请手动执行以下命令完成发布（可能需要 OTP / 浏览器指纹认证）:')
  log('  npm publish')
}

main()
