// Pure receipt/postcondition rules shared by the wallet adapter and Node tests.
export type Snapshot = {
  pool: bigint; reserved: bigint; pending: bigint; reward: bigint
  status: string; active: boolean; name: string; criteria: string; creator: string
  description: string; proof: string; evidence: string; snapshot: string
}
export type Action = { method: string; args: Array<string | boolean | bigint>; account: string; value: bigint }

export function assertProfile(info: Record<string, unknown>) {
  if (info.contract_name !== 'AirJudge' || info.version !== '1.3.1' ||
      info.semantic_output !== 'strict_json_two_keys' ||
      info.claim_window_basis !== 'UTC_calendar_day_soft_expiry') {
    throw new Error('Writes locked: this frontend requires AirJudge 1.3.1. Check the deployed contract address.')
  }
}

export function executionState(raw: unknown): { state: 'pending' | 'success' | 'error'; reason?: string } {
  if (!raw || typeof raw !== 'object') return { state: 'pending' }
  const tx = raw as any
  if (tx.status !== 'FINALIZED') return { state: 'pending' }
  const source = tx.consensus_data?.leader_receipt
  const entries = Array.isArray(source) ? source : source ? [source] : []
  const leader = entries.filter((r: any) => r?.mode === 'leader').at(-1)
  if (!leader || !['SUCCESS', 'ERROR'].includes(leader.execution_result)) return { state: 'pending' }
  let tag: number | undefined
  let reason = 'Contract execution rolled back.'
  if (typeof leader.result === 'string' && leader.result) {
    try {
      const bytes = Uint8Array.from(atob(leader.result), c => c.charCodeAt(0))
      tag = bytes[0]
      if (tag !== 0) reason = new TextDecoder().decode(bytes.slice(1)).slice(0, 220) || reason
    } catch { return { state: 'pending' } }
  }
  if (leader.execution_result === 'ERROR' || (tag !== undefined && tag !== 0)) return { state: 'error', reason }
  // A SUCCESS receipt needs the normal-return tag as well.
  return tag === 0 ? { state: 'success' } : { state: 'pending' }
}

export async function waitForExecution(
  hash: string, fetchTx: () => Promise<unknown>,
  options: { timeoutMs?: number; pause?: () => Promise<void>; now?: () => number } = {},
) {
  const now = options.now ?? Date.now
  const deadline = now() + (options.timeoutMs ?? 180_000)
  const pause = options.pause ?? (() => new Promise<void>(r => setTimeout(r, 3000)))
  while (now() < deadline) {
    let raw: unknown
    try { raw = await fetchTx() } catch { await pause(); continue }
    const outcome = executionState(raw)
    if (outcome.state === 'success') return
    if (outcome.state === 'error') throw new Error(`Transaction ${hash} finalized with execution ERROR: ${outcome.reason}`)
    await pause()
  }
  throw new Error(`Transaction ${hash} submitted — confirmation delayed. Do not resend. Open Explorer and refresh state.`)
}

export function postcondition(a: Action, before: Snapshot, after: Snapshot): boolean {
  if (after.pool < 0n || after.reserved < 0n || after.reserved > after.pool) return false
  const samePool = after.pool === before.pool
  const sameReserved = after.reserved === before.reserved
  const reward = before.reward
  switch (a.method) {
    case 'create_campaign':
      return after.name === String(a.args[1]).trim() && after.criteria === String(a.args[2]).trim() &&
        after.creator.toLowerCase() === a.account.toLowerCase() && after.active &&
        after.reward === BigInt(a.args[3]) && after.pool === 0n && after.reserved === 0n
    case 'fund_campaign': return after.pool === before.pool + a.value && sameReserved
    case 'set_campaign_active': return after.active === a.args[1] && samePool && sameReserved
    case 'reclaim_unused_pool': return !after.active && before.pool > before.reserved &&
      after.pool === before.reserved && sameReserved
    case 'submit_application':
      return after.status === 'PENDING' && after.pending === 0n && samePool && sameReserved &&
        after.description === String(a.args[1]).trim() && after.proof === String(a.args[2]).trim() &&
        after.evidence === String(a.args[3]).trim()
    case 'judge_application':
      if (before.status !== 'PENDING' || !samePool) return false
      if (after.status === 'ELIGIBLE_RESERVED') return after.snapshot.trim().length > 0 && reward > 0n &&
        after.pending === reward && after.reserved === before.reserved + reward
      if (after.status === 'ELIGIBLE_UNDERFUNDED') return after.snapshot.trim().length > 0 &&
        reward > before.pool - before.reserved && after.pending === 0n && sameReserved
      if (after.status === 'ELIGIBLE_NO_REWARD') return after.snapshot.trim().length > 0 &&
        reward === 0n && after.pending === 0n && sameReserved
      return after.status === 'NOT_ELIGIBLE' && after.pending === 0n && sameReserved
    case 'withdraw': return before.pending > 0n && after.status === 'ELIGIBLE_PAID' && after.pending === 0n &&
      after.pool === before.pool - before.pending && after.reserved === before.reserved - before.pending
    case 'reserve_underfunded': return before.status === 'ELIGIBLE_UNDERFUNDED' &&
      after.status === 'ELIGIBLE_RESERVED' && after.pending === reward && reward > 0n && samePool &&
      after.reserved === before.reserved + reward
    case 'release_expired_reservation': return before.status === 'ELIGIBLE_RESERVED' && before.pending > 0n &&
      after.status === 'ELIGIBLE_EXPIRED' && after.pending === 0n && samePool &&
      after.reserved === before.reserved - before.pending
    default: return false
  }
}
