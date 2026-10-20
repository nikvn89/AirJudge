import { assertProfile, postcondition, waitForExecution } from './txVerification'
import type { Snapshot } from './txVerification'
import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { getAddress } from 'viem'
import {
  CONTRACT_ADDRESS,
  EXPLORER_BASE,
  STUDIO_CHAIN_ID_HEX,
  STUDIO_CHAIN_NAME,
  STUDIO_RPC,
  STUDIO_WALLET_RPC,
} from './config'
import { errorCode, normalizeError } from './errors'

const chain = {
  ...studionet,
  rpcUrls: {
    default: { http: [STUDIO_RPC] },
  },
}

export const normalizeAddress = (address: string) =>
  getAddress(address)

export const formatWei = (
  value?: string | bigint | number,
) => {
  const wei = BigInt(value ?? 0)

  const whole = wei / 10n ** 18n
  const fraction = wei % 10n ** 18n

  if (fraction === 0n) {
    return whole.toString()
  }

  return `${whole}.${fraction
    .toString()
    .padStart(18, '0')
    .replace(/0+$/, '')}`
}

export const parseGenToWei = (value: string) => {
  const clean = value.trim()

  if (!/^\d+(\.\d{0,18})?$/.test(clean)) {
    throw new Error(
      'Enter a valid GEN amount.',
    )
  }

  const [whole, fraction = ''] =
    clean.split('.')

  return (
    BigInt(whole || '0') *
      10n ** 18n +
    BigInt(
      (
        fraction +
        '0'.repeat(18)
      ).slice(0, 18),
    )
  )
}

export const getEthereumProvider = () => {
  if (
    typeof window === 'undefined'
  ) {
    return undefined
  }

  return (window as any).ethereum
}

export async function getChainId(): Promise<string> {
  const ethereum = getEthereumProvider()

  if (!ethereum) return ''

  const chainId = await ethereum.request({ method: 'eth_chainId' })
  return String(chainId ?? '').toLowerCase()
}

export const isStudioChain = (chainId: string) =>
  chainId.toLowerCase() === STUDIO_CHAIN_ID_HEX

export async function ensureStudioChain(): Promise<string> {
  const ethereum = getEthereumProvider()

  if (!ethereum) {
    throw new Error('No browser wallet detected. Install MetaMask or a compatible wallet.')
  }

  const current = await getChainId()
  if (isStudioChain(current)) return current

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIO_CHAIN_ID_HEX }],
    })
  } catch (error) {
    if (String(errorCode(error) ?? '') !== '4902') throw error

    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: STUDIO_CHAIN_ID_HEX,
          chainName: STUDIO_CHAIN_NAME,
          rpcUrls: [STUDIO_WALLET_RPC],
          nativeCurrency: {
            name: 'GEN Token',
            symbol: 'GEN',
            decimals: 18,
          },
          blockExplorerUrls: [EXPLORER_BASE],
        },
      ],
    })
  }

  const updated = await getChainId()
  if (!isStudioChain(updated)) {
    throw new Error('Switch MetaMask to GenLayer Studio (chain 61999) before continuing.')
  }

  return updated
}

const getReadClient = () =>
  createClient({
    chain,
  } as any)

const getWriteClient = (
  account: string,
) =>
  createClient({
    chain,
    account:
      normalizeAddress(account) as any,
    provider:
      getEthereumProvider() as any,
  } as any)

export async function getConnectedWallet(): Promise<string> {
  const ethereum =
    getEthereumProvider()

  if (!ethereum) {
    return ''
  }

  const accounts =
    (await ethereum.request({
      method: 'eth_accounts',
    })) as string[]

  if (!accounts?.[0]) {
    return ''
  }

  return normalizeAddress(
    accounts[0],
  )
}

export async function connectWallet(): Promise<string> {
  const ethereum =
    getEthereumProvider()

  if (!ethereum) {
    throw new Error(
      'No browser wallet detected. Install MetaMask or a compatible wallet.',
    )
  }

  const accounts =
    (await ethereum.request({
      method:
        'eth_requestAccounts',
    })) as string[]

  if (!accounts?.[0]) {
    throw new Error(
      'Wallet connection was not approved.',
    )
  }

  return normalizeAddress(
    accounts[0],
  )
}

export const sleep = (
  ms: number,
) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms),
  )

function submissionError(
  error: unknown,
) {
  const normalized = normalizeError(error)

  console.error('[AirJudge] transaction submission failed before tx hash', {
    code: normalized.code,
    message: normalized.message,
  })

  const suffix = normalized.code === undefined
    ? normalized.message
    : `${normalized.message} (code ${normalized.code})`

  return new Error(
    `No transaction hash was returned. Check wallet activity and Explorer before retrying; submission may be unknown. ${suffix}`,
  )
}

async function transactionSnapshot(campaignId: string, applicant = ''): Promise<Snapshot> {
  const app = (method: string) => applicant ? readRaw(method, [campaignId, applicant]) : Promise.resolve('')
  const [pool, reward, name, criteria, creator, active, status, pending, description, proof, evidence, reviewed] = await Promise.all([
    readRaw('get_campaign_pool_status', [campaignId]), readRaw('get_campaign_reward', [campaignId]),
    readRaw('get_campaign_name', [campaignId]), readRaw('get_campaign_criteria', [campaignId]),
    readRaw('get_campaign_creator', [campaignId]), readRaw('is_campaign_active', [campaignId]),
    app('get_application_status'), app('get_pending_payout'), app('get_application_description'),
    app('get_application_proof_url'), app('get_application_evidence'), app('get_reviewed_snapshot'),
  ])
  const treasury = JSON.parse(String(pool))
  return { pool: BigInt(treasury.pool_wei), reserved: BigInt(treasury.reserved_wei),
    reward: BigInt(String(reward)), pending: BigInt(String(pending || '0')), name: String(name),
    criteria: String(criteria), creator: String(creator), active: active === true, status: String(status),
    description: String(description), proof: String(proof), evidence: String(evidence), snapshot: String(reviewed) }
}

async function fetchTransaction(hash: string): Promise<unknown> {
  const response = await fetch(STUDIO_RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_getTransactionByHash',params:[hash]}),
    signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error('Transaction confirmation temporarily unavailable.')
  const body = await response.json()
  if (body.error) throw new Error('Transaction confirmation temporarily unavailable.')
  // Never log/store the raw response: node configuration can contain credentials.
  return body.result
}

function txNotice(hash: string, state: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('airjudge:transaction', {detail:{hash,state}}))
}

async function write(account: string, functionName: string, args: Array<string | boolean | bigint>, value = 0n) {
  const info = JSON.parse(String(await readRaw('get_contract_info')))
  assertProfile(info)
  await ensureStudioChain()
  const selected = await getConnectedWallet()
  if (selected.toLowerCase() !== account.toLowerCase()) throw new Error('Wallet changed. Refresh and confirm the selected account.')
  const campaignId = String(args[0]).trim()
  const targeted = ['judge_application','reserve_underfunded','release_expired_reservation'].includes(functionName)
  const applicant = targeted ? String(args[1]) : ['submit_application','withdraw'].includes(functionName) ? account : ''
  const before = await transactionSnapshot(campaignId, applicant)
  if ((await getConnectedWallet()).toLowerCase() !== account.toLowerCase()) throw new Error('Wallet changed during the state check. Refresh before signing.')
  const client = getWriteClient(account)
  let hash: string
  try {
    hash = String(await client.writeContract({ address: CONTRACT_ADDRESS, functionName, args, value } as any))
  } catch (error) { throw submissionError(error) }
  txNotice(hash, 'submitted')
  try {
    await waitForExecution(hash, () => fetchTransaction(hash))
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const after = await transactionSnapshot(campaignId, applicant)
        if (postcondition({method:functionName,args,account,value},before,after)) {
          txNotice(hash, 'verified')
          return {hash,monitoringWarning:false}
        }
      } catch { /* retry a temporarily unavailable finalized read */ }
      await sleep(2500)
    }
    throw new Error(`Transaction ${hash} executed, but its postcondition is not confirmed. Do not resend; refresh state.`)
  } catch (error) {
    txNotice(hash, 'check required')
    // Refresh the affected records even after an execution error; no success is inferred.
    await transactionSnapshot(campaignId, applicant).catch(() => undefined)
    throw error
  }
}

async function readRaw(
  functionName: string,
  args: Array<
    string | boolean
  > = [],
) {
  const client = getReadClient()

  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    stateStatus: 'finalized',
  } as any)
}

async function read(
  functionName: string,
  args: Array<
    string | boolean
  > = [],
  attempts = 3,
) {
  let lastError: unknown

  for (
    let i = 0;
    i < attempts;
    i += 1
  ) {
    try {
      return await readRaw(
        functionName,
        args,
      )
    } catch (error) {
      lastError = error

      if (
        i <
        attempts - 1
      ) {
        await sleep(
          1500 * (i + 1),
        )
      }
    }
  }

  throw lastError
}

export type CampaignPool = {
  pool_wei: string
  reserved_wei: string
  available_wei: string
}

export const airJudge = {
  getContractInfo: async (): Promise<Record<string, unknown>> => JSON.parse(String(await read('get_contract_info'))),
  createCampaign: (
    account: string,
    campaignId: string,
    name: string,
    criteria: string,
    rewardWei: bigint,
  ) =>
    write(
      account,
      'create_campaign',
      [
        campaignId,
        name,
        criteria,
        rewardWei,
      ],
    ),

  fundCampaign: (
    account: string,
    campaignId: string,
    valueWei: bigint,
  ) =>
    write(
      account,
      'fund_campaign',
      [campaignId],
      valueWei,
    ),

  setCampaignActive: (
    account: string,
    campaignId: string,
    active: boolean,
  ) =>
    write(
      account,
      'set_campaign_active',
      [
        campaignId,
        active,
      ],
    ),

  reclaimUnusedPool: (
    account: string,
    campaignId: string,
  ) =>
    write(
      account,
      'reclaim_unused_pool',
      [campaignId],
    ),

  submitApplication: (
    account: string,
    campaignId: string,
    description: string,
    proofUrl: string,
    evidenceUrl: string,
  ) =>
    write(
      account,
      'submit_application',
      [
        campaignId,
        description,
        proofUrl,
        evidenceUrl,
      ],
    ),

  judgeApplication: (
    account: string,
    campaignId: string,
    applicant: string,
  ) =>
    write(
      account,
      'judge_application',
      [
        campaignId,
        normalizeAddress(
          applicant,
        ),
      ],
    ),

  withdraw: (
    account: string,
    campaignId: string,
  ) =>
    write(
      account,
      'withdraw',
      [campaignId],
    ),

  getCampaignName: (
    campaignId: string,
  ) =>
    read(
      'get_campaign_name',
      [campaignId],
    ) as Promise<string>,

  getCampaignCriteria: (
    campaignId: string,
  ) =>
    read(
      'get_campaign_criteria',
      [campaignId],
    ) as Promise<string>,

  getCampaignCreator: (
    campaignId: string,
  ) =>
    read(
      'get_campaign_creator',
      [campaignId],
    ) as Promise<string>,

  getCampaignReward:
    async (
      campaignId: string,
    ) =>
      String(
        await read(
          'get_campaign_reward',
          [campaignId],
        ),
      ),

  isCampaignActive: (
    campaignId: string,
  ) =>
    read(
      'is_campaign_active',
      [campaignId],
    ) as Promise<boolean>,

  getCampaignPoolStatus:
    async (
      campaignId: string,
    ): Promise<CampaignPool> => {
      const raw = String(
        await read(
          'get_campaign_pool_status',
          [campaignId],
        ),
      )

      const parsed =
        JSON.parse(raw)

      return {
        pool_wei: String(
          parsed.pool_wei ?? 0,
        ),
        reserved_wei:
          String(
            parsed.reserved_wei ??
              0,
          ),
        available_wei:
          String(
            parsed.available_wei ??
              0,
          ),
      }
    },

  getRequiredProofMarker: (
    campaignId: string,
    applicant: string,
  ) =>
    read(
      'get_required_proof_marker',
      [
        campaignId,
        normalizeAddress(
          applicant,
        ),
      ],
    ) as Promise<string>,

  getApplicationStatus: (
    campaignId: string,
    applicant: string,
  ) =>
    read(
      'get_application_status',
      [
        campaignId,
        normalizeAddress(
          applicant,
        ),
      ],
    ) as Promise<string>,

  getApplicationDescription:
    (
      campaignId: string,
      applicant: string,
    ) =>
      read(
        'get_application_description',
        [
          campaignId,
          normalizeAddress(
            applicant,
          ),
        ],
      ) as Promise<string>,

  getApplicationProofUrl: (
    campaignId: string,
    applicant: string,
  ) =>
    read(
      'get_application_proof_url',
      [
        campaignId,
        normalizeAddress(
          applicant,
        ),
      ],
    ) as Promise<string>,

  getApplicationEvidence: (
    campaignId: string,
    applicant: string,
  ) =>
    read(
      'get_application_evidence',
      [
        campaignId,
        normalizeAddress(
          applicant,
        ),
      ],
    ) as Promise<string>,

  getApplicationReason: (
    campaignId: string,
    applicant: string,
  ) =>
    read(
      'get_application_reason',
      [
        campaignId,
        normalizeAddress(
          applicant,
        ),
      ],
    ) as Promise<string>,

  getReviewedSnapshot: (
    campaignId: string,
    applicant: string,
  ) =>
    read(
      'get_reviewed_snapshot',
      [
        campaignId,
        normalizeAddress(
          applicant,
        ),
      ],
    ) as Promise<string>,

  getPendingPayout:
    async (
      campaignId: string,
      applicant: string,
    ) =>
      String(
        await read(
          'get_pending_payout',
          [
            campaignId,
            normalizeAddress(
              applicant,
            ),
          ],
        ),
      ),

  // v1.3 — deterministic settlement actions (no model call).
  reserveUnderfunded: (
    account: string,
    campaignId: string,
    applicant: string,
  ) =>
    write(
      account,
      'reserve_underfunded',
      [campaignId, normalizeAddress(applicant)],
    ),

  releaseExpiredReservation: (
    account: string,
    campaignId: string,
    applicant: string,
  ) =>
    write(
      account,
      'release_expired_reservation',
      [campaignId, normalizeAddress(applicant)],
    ),

  // v1.3 — claim window of one application; null on a pre-1.3 deployment.
  getPayoutWindow: async (
    campaignId: string,
    applicant: string,
  ): Promise<PayoutWindow | null> => {
    try {
      const raw = String(
        await read('get_payout_window', [campaignId, normalizeAddress(applicant)]),
      )
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || !('status' in parsed)) return null
      return {
        status: String(parsed.status),
        pendingWei: String(parsed.pending_wei ?? '0'),
        reservedDay: Number(parsed.reserved_day ?? 0),
        expiresDay: Number(parsed.expires_day ?? 0),
        today: Number(parsed.today ?? 0),
        expired: Boolean(parsed.expired),
        reservableNow: Boolean(parsed.reservable_now),
      }
    } catch {
      return null
    }
  },

  isEvidenceUsed: (
    campaignId: string,
    evidenceUrl: string,
  ) =>
    read(
      'is_evidence_used',
      [
        campaignId,
        evidenceUrl.trim(),
      ],
    ) as Promise<boolean>,
}

export type PayoutWindow = {
  status: string
  pendingWei: string
  reservedDay: number
  expiresDay: number
  today: number
  expired: boolean
  reservableNow: boolean
}

// Day number (days since 1970-01-01, UTC) -> YYYY-MM-DD.
export const dayToDate = (day: number) =>
  new Date(day * 86_400_000).toISOString().slice(0, 10)

export async function pollApplicationStatus(
  campaignId: string,
  applicant: string,
  timeoutMs = 300_000,
) {
  const deadline =
    Date.now() + timeoutMs

  let delay = 7_000
  let last = 'PENDING'

  while (
    Date.now() < deadline
  ) {
    try {
      last = String(
        await airJudge.getApplicationStatus(
          campaignId,
          applicant,
        ),
      )

      if (
        last &&
        last !== 'PENDING'
      ) {
        return last
      }
    } catch {
      // Temporary RPC read errors
      // will be retried next cycle.
    }

    await sleep(delay)

    delay = Math.min(
      Math.round(
        delay * 1.25,
      ),
      15_000,
    )
  }

  return last
}
