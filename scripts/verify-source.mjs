import fs from 'node:fs'
import crypto from 'node:crypto'
const release=JSON.parse(fs.readFileSync(new URL('../release.json',import.meta.url),'utf8'))
const source=fs.readFileSync(new URL('../contracts/airjudge.py',import.meta.url),'utf8').replace(/\r\n/g,'\n')
const hash=crypto.createHash('sha256').update(source).digest('hex')
if(hash!==release.normalized_sha256) throw Error('Contract source differs from release.json; review the source and evidence before changing the manifest.')
if(!/^[0-9a-f]{40}$/.test(release.reviewed_project_commit)||!/^[0-9a-f]{40}$/.test(release.accepted_milestone_v2_commit))throw Error('Full baseline commit SHAs are required.')
console.log('Frozen contract source: '+hash)
