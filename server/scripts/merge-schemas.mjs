import fs from 'fs'
import path from 'path'
import YAML from 'yaml'
import $RefParser from '@apidevtools/json-schema-ref-parser'

const ROOT_FILE = './api/openapi.yaml'
const OUTPUT_FILE = './src/generated/openapi.yaml'

const BANNER =
    '# This file was automatically generated using @apidevtools/json-schema-ref-parser\n' +
    '# DO NOT MODIFY IT BY HAND. Instead, modify the source OpenAPI schema files,\n' +
    '# and run "yarn merge-schemas" to regenerate this file.\n'

async function main() {
    // Fully dereference so the output is a single self-contained file that
    // Bruno, Postman and Insomnia can import
    const resolved = await $RefParser.dereference(ROOT_FILE, {
        dereference: {
            circular: 'ignore',
        },
    })

    // Dereferencing reuses the same object for every $ref to it, which yaml
    // would emit as anchors/aliases. A JSON round-trip gives plain copies.
    const plain = JSON.parse(JSON.stringify(resolved))

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
    fs.writeFileSync(
        OUTPUT_FILE,
        (BANNER + YAML.stringify(plain)).replace(/\r?\n/g, '\r\n'),
        'utf-8'
    )

    console.log(`Fully resolved OpenAPI schema written to: ${OUTPUT_FILE}`)
}

main().catch((err) => {
    console.error('Failed to generate resolved OpenAPI schema:', err)
    process.exit(1)
})
