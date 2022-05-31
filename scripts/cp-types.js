const fs = require('fs')
const path = require('path')

fs.copyFileSync(path.resolve(__dirname, '../src/typings.d.ts'), path.resolve(__dirname, '../lib/typings.d.ts'))
