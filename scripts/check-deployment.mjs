// Read-only verification. Never persists RPC node/provider configuration.
import fs from 'node:fs'
import crypto from 'node:crypto'
import { abi } from 'genlayer-js'
import { executionState } from '../src/lib/txVerification.ts'
const flags = process.argv.slice(2)
const at = key => { const i=flags.indexOf(key); return i<0 ? '' : flags[i+1] || '' }
const address=at('--address')
if(!/^0x[\da-fA-F]{40}$/.test(address)) throw Error('Usage: npm run check:deployment -- --address 0x... [--campaign ID --applicant 0x... --tx HASH]')
const rpc=async(method,params)=>{
  const response=await fetch('https://studio.genlayer.com/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)})
  if(!response.ok) throw Error('RPC HTTP '+response.status)
  const body=await response.json()
  if(body.error) throw Error('RPC could not complete '+method)
  return body.result
}
const read=async(method,args=[])=>{
  const data=abi.transactions.serialize([abi.calldata.encode(abi.calldata.makeCalldataObject(method,args,undefined)),false])
  const raw=await rpc('gen_call',[{type:'read',to:address,from:'0x0000000000000000000000000000000000000000',data,status:'finalized'}])
  const hex=typeof raw==='string'?raw:raw.data
  const decoded=abi.calldata.decode(new Uint8Array(Buffer.from(hex.replace(/^0x/,''),'hex')))
  return decoded
}
const digest=source=>crypto.createHash('sha256').update(source.toString('utf8').replace(/\r\n/g,'\n')).digest('hex')
const local=fs.readFileSync(new URL('../contracts/airjudge.py',import.meta.url))
const remote=Buffer.from(await rpc('gen_getContractCode',[address]),'base64')
const evidence={network:'StudioNet',chain_id:61999,address,checked_at:new Date().toISOString(),source_parity:{normalization:'CRLF to LF only',local_sha256:digest(local),deployed_sha256:digest(remote),pass:digest(local)===digest(remote)},profile:JSON.parse(String(await read('get_contract_info')))}
if(at('--campaign')){
  const cid=at('--campaign')
  evidence.campaign_id=cid
  evidence.treasury=JSON.parse(String(await read('get_campaign_pool_status',[cid])))
  evidence.active=await read('is_campaign_active',[cid])
  if(at('--applicant')){
    const applicant=at('--applicant')
    evidence.applicant=applicant
    evidence.application_status=await read('get_application_status',[cid,applicant])
    evidence.payout_window=JSON.parse(String(await read('get_payout_window',[cid,applicant])))
    evidence.reason=await read('get_application_reason',[cid,applicant])
  }
}
if(at('--tx')){
  const tx=await rpc('eth_getTransactionByHash',[at('--tx')])
  const rows=tx?.consensus_data?.leader_receipt
  const leaders=(Array.isArray(rows)?rows:rows?[rows]:[]).filter(r=>r.mode==='leader')
  const leader=leaders.at(-1)
  evidence.transaction={hash:at('--tx'),status:tx?.status,from:tx?.from_address,to:tx?.to_address,
    leader_execution:leader?.execution_result,execution:executionState(tx)}
}
console.log(JSON.stringify(evidence,(_,v)=>typeof v==='bigint'?v.toString():v,2))
if(!evidence.source_parity.pass||evidence.profile.version!=='1.3.1')process.exitCode=1
