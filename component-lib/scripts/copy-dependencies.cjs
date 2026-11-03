const fs = require('fs')
const path = require('path')

const dstPackagePath = path.resolve(__dirname, '../package.json')
const srcPackagePath = path.resolve(__dirname, '../../client/package.json')

const dstPackage = JSON.parse(fs.readFileSync(dstPackagePath, 'utf8'))
const srcPackage = JSON.parse(fs.readFileSync(srcPackagePath, 'utf8'))

dstPackage.dependencies = {
    ...srcPackage.dependencies,
    ...dstPackage.dependencies,
}

fs.writeFileSync(dstPackagePath, JSON.stringify(dstPackage, null, 2), 'utf8')
console.log(
    'Updated component-lib package dependencies with client dependencies'
)
