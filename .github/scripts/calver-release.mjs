#!/usr/bin/env node

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const TIMEZONE = 'UTC'
const ROOT = process.cwd()
const PACKAGE_JSON = path.join(ROOT, 'package.json')
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md')

const COMMIT = process.argv.includes('--commit')
const TAG = process.argv.includes('--tag')
const githubOutputArg = process.argv.indexOf('--github-output')
const GITHUB_OUTPUT =
    githubOutputArg >= 0 ? process.argv[githubOutputArg + 1] : null

const SECTION_ORDER = [
    ['feat', 'Features'],
    ['fix', 'Bug Fixes'],
    ['perf', 'Performance Improvements'],
    ['refactor', 'Refactoring'],
    ['docs', 'Documentation'],
    ['test', 'Tests'],
    ['build', 'Build System'],
    ['ci', 'Continuous Integration'],
    ['chore', 'Chores'],
]

function run(command) {
    return execSync(command, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
}

function getCalverPrefix() {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIMEZONE,
        year: '2-digit',
        month: '2-digit',
    })
    const parts = formatter.formatToParts(new Date())
    const yy = parts.find((part) => part.type === 'year').value
    const mm = parts.find((part) => part.type === 'month').value
    return `${yy}.${mm}`
}

function getNextVersion(prefix) {
    const tags = run(`git tag -l "v${prefix}.*"`)
        .split('\n')
        .map((tag) => tag.trim())
        .filter(Boolean)

    if (tags.length === 0) {
        return `${prefix}.0`
    }

    const increments = tags
        .map((tag) => {
            const match = tag.match(/^v\d+\.\d+\.(\d+)$/)
            return match ? Number.parseInt(match[1], 10) : -1
        })
        .filter((value) => value >= 0)

    const next = increments.length === 0 ? 0 : Math.max(...increments) + 1
    return `${prefix}.${next}`
}

function getLastTag() {
    try {
        return run('git describe --tags --abbrev=0')
    } catch {
        return null
    }
}

function parseConventionalCommit(subject) {
    const match = subject.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/)
    if (!match) {
        return { type: 'other', scope: null, message: subject }
    }

    return {
        type: match[1],
        scope: match[2] ?? null,
        message: match[3],
    }
}

function formatCommitLine(commit) {
    const hash = commit.hash.slice(0, 7)
    const parsed = parseConventionalCommit(commit.subject)
    const scopePrefix = parsed.scope ? `**${parsed.scope}:** ` : ''
    return `- ${scopePrefix}${parsed.message} (${hash})`
}

function generateChangelog(version, sinceTag) {
    const range = sinceTag ? `${sinceTag}..HEAD` : 'HEAD'
    let rawLog = ''

    try {
        rawLog = run(`git log ${range} --pretty=format:%H|%s`)
    } catch {
        rawLog = ''
    }

    const commits = rawLog
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const separator = line.indexOf('|')
            return {
                hash: line.slice(0, separator),
                subject: line.slice(separator + 1),
            }
        })

    const grouped = new Map()
    for (const [type, title] of SECTION_ORDER) {
        grouped.set(type, { title, lines: [] })
    }
    grouped.set('other', { title: 'Other Changes', lines: [] })

    for (const commit of commits) {
        const parsed = parseConventionalCommit(commit.subject)
        const bucket = grouped.get(parsed.type) ?? grouped.get('other')
        bucket.lines.push(formatCommitLine(commit))
    }

    const date = new Intl.DateTimeFormat('en-CA', {
        timeZone: TIMEZONE,
    }).format(new Date())
    const sections = []

    for (const [, { title, lines }] of grouped) {
        if (lines.length === 0) {
            continue
        }
        sections.push(`### ${title}\n\n${lines.join('\n')}`)
    }

    if (sections.length === 0) {
        sections.push(
            '### Other Changes\n\n- No conventional commits since last release'
        )
    }

    return `## [${version}] (${date})\n\n${sections.join('\n\n')}\n`
}

function updatePackageJson(version) {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'))
    pkg.version = version
    fs.writeFileSync(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`)
}

function prependChangelog(entry) {
    const existing = fs.existsSync(CHANGELOG)
        ? fs.readFileSync(CHANGELOG, 'utf8')
        : ''
    fs.writeFileSync(CHANGELOG, `${entry}\n${existing}`)
}

function writeGithubOutput(values) {
    if (!GITHUB_OUTPUT) {
        return
    }

    let content = ''
    for (const [key, value] of Object.entries(values)) {
        if (value.includes('\n')) {
            content += `${key}<<EOF\n${value}\nEOF\n`
        } else {
            content += `${key}=${value}\n`
        }
    }

    fs.appendFileSync(GITHUB_OUTPUT, content)
}

function getDefaultBranch() {
    try {
        const ref = run('git symbolic-ref refs/remotes/origin/HEAD')
        return ref.replace('refs/remotes/origin/', '')
    } catch {
        return 'main'
    }
}

function commitAndTag(version, tag) {
    const defaultBranch = getDefaultBranch()

    run('git config user.name "github-actions[bot]"')
    run(
        'git config user.email "41898282+github-actions[bot]@users.noreply.github.com"'
    )

    if (COMMIT) {
        run('git add package.json CHANGELOG.md')
        run(`git commit -m "chore(release): ${version}"`)
        run(`git push origin HEAD:${defaultBranch}`)
    }

    if (TAG) {
        if (COMMIT) {
            run(`git tag ${tag}`)
        } else {
            run(`git tag -f ${tag}`)
        }
        run(`git push origin ${tag}`)
    }
}

function main() {
    const prefix = getCalverPrefix()
    const version = getNextVersion(prefix)
    const tag = `v${version}`
    const sinceTag = getLastTag()
    const changelog = generateChangelog(version, sinceTag)

    if (COMMIT) {
        updatePackageJson(version)
        prependChangelog(changelog)
    }

    if (COMMIT || TAG) {
        commitAndTag(version, tag)
    }

    const result = {
        version,
        tag,
        changelog,
    }

    if (GITHUB_OUTPUT) {
        writeGithubOutput(result)
    } else {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    }
}

main()
