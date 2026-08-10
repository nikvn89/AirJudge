import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'
import { getAddress } from 'viem'
import { CONTRACT_ADDRESS, STUDIO_RPC } from './config'

const chain = {
  ...studionet,
  rpcUrls: {
    default: {
      http: [STUDIO_RPC],
    },
  },
}

export const normalizeAddress = (address: string) => getAddress(address)

export const getClient = (account?: string) => {
  const provider = typeof window !== 'undefined' ? window.ethereum : undefined
  const checksummed = account ? normalizeAddress(account) : undefined

  return createClient({
    chain,
    account: checksummed as any,
    provider: provider as any,
  })
}

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error(
      'No browser wallet detected. Install MetaMask or a compatible wallet.',
    )
  }

  const accounts = (await window.ethereum.request({
    method: 'eth_requestAccounts',
  })) as string[]

  if (!accounts?.[0]) {
    throw new Error('Wallet connection was not approved.')
  }

  const address = normalizeAddress(accounts[0])

  return address
}

/* ------------------------------------------------------------------ */
/* Evidence URL validation — mirrors what gl.nondet.web.render can do  */
/* ------------------------------------------------------------------ */

const UNRENDERABLE_PATTERNS = [
  { test: /raw\.githubusercontent\.com/i, label: 'raw.githubusercontent.com' },
  { test: /github\.com\/[^/]+\/[^/]+\/blob\//i, label: 'a github.com /blob/ file link' },
]

export function checkEvidenceUrl(url: string): string | null {
  const trimmed = url.trim()

  if (!trimmed.startsWith('https://')) {
    return 'Evidence URL must start with https://'
  }

  for (const { test, label } of UNRENDERABLE_PATTERNS) {
    if (test.test(trimmed)) {
      return `GenLayer validators cannot fetch ${label}. Use the repository homepage (github.com/owner/repo) or a paste host instead.`
    }
  }

  return null
}

/* ------------------------------------------------------------------ */
/* Transaction helpers                                                 */
/* ------------------------------------------------------------------ */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Ordinary write. Waits for ACCEPTED, which is what reads below observe.
 * Use this for setup calls that do not invoke the validator set.
 */
async function write(
  account: string,
  functionName: string,
  args: Array<string | boolean>,
) {
  const client = getClient(account)

  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: BigInt(0),
  })

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
  })

  return { hash, receipt }
}

/**
 * Fire-and-return write for calls that invoke the validator set.
 *
 * Adjudication takes roughly one to two minutes. Blocking on
 * waitForTransactionReceipt for that long is what made the UI look like
 * nothing happened: the promise outlived the page interaction and the
 * result never rendered. Instead we return the hash immediately and let
 * the caller poll contract state.
 */
async function writeAsync(
  account: string,
  functionName: string,
  args: Array<string | boolean>,
) {
  const client = getClient(account)

  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: BigInt(0),
  })

  return { hash }
}

/**
 * Reads MUST specify the accepted state. Without it the client observes
 * finalized state, which lags acceptance by a long way — a write that
 * already succeeded still reads back as if it never happened.
 */
async function read(functionName: string, args: Array<string | boolean>) {
  const client = getClient()

  // stateStatus is accepted at runtime but missing from the published
  // type definitions, hence the cast.
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    stateStatus: 'accepted',
  } as any)
}

/**
 * Polls a read until the predicate passes or the budget runs out.
 * Backs off gently so a slow adjudication does not burn the Studio
 * rate limit (roughly 30 requests per minute).
 */
export async function pollUntil<T>(
  fetcher: () => Promise<T>,
  done: (value: T) => boolean,
  options: { timeoutMs?: number; intervalMs?: number; maxIntervalMs?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 300_000
  const maxIntervalMs = options.maxIntervalMs ?? 15_000
  let interval = options.intervalMs ?? 6_000

  const deadline = Date.now() + timeoutMs

  // A single failed read must not abort the wait. The transaction is
  // already onchain and validators keep working regardless of whether
  // one poll got throttled, so transient errors are swallowed and the
  // loop simply tries again on the next tick.
  let last: T | undefined
  let lastError: unknown

  for (;;) {
    try {
      last = await fetcher()
      lastError = undefined
      if (done(last)) return last
    } catch (e) {
      lastError = e
    }

    if (Date.now() >= deadline) {
      if (last !== undefined) return last
      throw lastError instanceof Error
        ? lastError
        : new Error(
            'Adjudication is taking longer than expected. It may still finish — search the applicant again in a minute to check.',
          )
    }

    await sleep(interval)
    interval = Math.min(interval * 1.4, maxIntervalMs)
  }
}

/* ------------------------------------------------------------------ */
/* Contract bindings                                                   */
/* ------------------------------------------------------------------ */

export const contract = {
  /* --- identity --- */

  registerHandle: (account: string, handle: string) =>
    write(account, 'register_handle', [handle]),

  getHandle: (address: string) =>
    read('get_handle', [normalizeAddress(address)]) as Promise<string>,

  /* --- campaigns --- */

  createCampaign: (
    account: string,
    campaignId: string,
    name: string,
    criteria: string,
  ) => write(account, 'create_campaign', [campaignId, name, criteria]),

  setCampaignActive: (account: string, campaignId: string, active: boolean) =>
    write(account, 'set_campaign_active', [campaignId, active]),

  getCampaignName: (campaignId: string) =>
    read('get_campaign_name', [campaignId]) as Promise<string>,

  getCampaignCriteria: (campaignId: string) =>
    read('get_campaign_criteria', [campaignId]) as Promise<string>,

  getCampaignCreator: (campaignId: string) =>
    read('get_campaign_creator', [campaignId]) as Promise<string>,

  isCampaignActive: (campaignId: string) =>
    read('is_campaign_active', [campaignId]) as Promise<boolean>,

  /* --- applications --- */

  submitApplication: (
    account: string,
    campaignId: string,
    description: string,
    evidenceUrl: string,
  ) =>
    write(account, 'submit_application', [
      campaignId,
      description,
      evidenceUrl.trim(),
    ]),

  isEvidenceUsed: (campaignId: string, evidenceUrl: string) =>
    read('is_evidence_used', [campaignId, evidenceUrl.trim()]) as Promise<boolean>,

  /** Returns as soon as the transaction is submitted. Poll with awaitVerdict. */
  judgeApplication: (account: string, campaignId: string, applicant: string) =>
    writeAsync(account, 'judge_application', [
      campaignId,
      normalizeAddress(applicant),
    ]),

  getApplicationStatus: (campaignId: string, applicant: string) =>
    read('get_application_status', [
      campaignId,
      normalizeAddress(applicant),
    ]) as Promise<string>,

  getApplicationDescription: (campaignId: string, applicant: string) =>
    read('get_application_description', [
      campaignId,
      normalizeAddress(applicant),
    ]) as Promise<string>,

  getApplicationEvidence: (campaignId: string, applicant: string) =>
    read('get_application_evidence', [
      campaignId,
      normalizeAddress(applicant),
    ]) as Promise<string>,

  getApplicationReason: (campaignId: string, applicant: string) =>
    read('get_application_reason', [
      campaignId,
      normalizeAddress(applicant),
    ]) as Promise<string>,

  /**
   * Waits for an application to leave PENDING.
   * Call this after judgeApplication resolves with its hash.
   */
  awaitVerdict: (campaignId: string, applicant: string) =>
    pollUntil(
      () => contract.getApplicationStatus(campaignId, applicant),
      (status) => status === 'ELIGIBLE' || status === 'NOT_ELIGIBLE',
    ),
}
