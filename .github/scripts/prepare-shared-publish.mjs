#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SHARED_PACKAGE_JSON = path.join(ROOT, 'shared/package.json')
const ROOT_PACKAGE_JSON = path.join(ROOT, 'package.json')

const versionArgIndex = process.argv.indexOf('--version')
const VERSION_ARG =
    versionArgIndex >= 0 ? process.argv[versionArgIndex + 1] : null
const githubOutputArg = process.argv.indexOf('--github-output')
const GITHUB_OUTPUT =
    githubOutputArg >= 0 ? process.argv[githubOutputArg + 1] : null

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 4)}\n`)
}

function resolveVersion() {
    if (VERSION_ARG) {
        return VERSION_ARG
    }

    const rootPackage = readJson(ROOT_PACKAGE_JSON)
    if (!rootPackage.version) {
        throw new Error('Root package.json is missing a version')
    }

    return rootPackage.version
}

function main() {
    const version = resolveVersion()
    const sharedPackage = readJson(SHARED_PACKAGE_JSON)

    sharedPackage.version = version
    writeJson(SHARED_PACKAGE_JSON, sharedPackage)

    process.stdout.write(
        `Prepared ${sharedPackage.name}@${version} for publish\n`
    )

    if (GITHUB_OUTPUT) {
        fs.appendFileSync(GITHUB_OUTPUT, `version=${version}\n`)
    }
}

main()
