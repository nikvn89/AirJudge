import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'
import { getAddress } from 'viem'
import { CONTRACT_ADDRESS, STUDIO_RPC } from './config'

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
    throw new Error('Enter a valid GEN amount.')
  }

  const [whole, fraction = ''] = clean.split('.')

  return (
    BigInt(whole || '0') * 10n ** 18n +
    BigInt(
      (fraction + '0'.repeat(18)).slice(0, 18),
    )
  )
}

const getEthereumProvider = () => {
  if (typeof window === 'undefined') {
    return undefined
  }

  return (window as any).ethereum
}

export const getClient = (account?: string) => {
  const provider = getEthereumProvider()

  const checksummed = account
    ? normalizeAddress(account)
    : undefined

  return createClient({
    chain,
    account: checksummed as any,
    provider: provider as any,
  })
}

export async function connectWallet(): Promise<string> {
  const ethereum = getEthereumProvider()

  if (!ethereum) {
    throw new Error(
      'No browser wallet detected. Install MetaMask or a compatible wallet.',
    )
  }

  const accounts = (await ethereum.request({
    method: 'eth_requestAccounts',
  })) as string[]

  if (!accounts?.[0]) {
    throw new Error(
      'Wallet connection was not approved.',
    )
  }

  return normalizeAddress(accounts[0])
}

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

async function write(
  account: string,
  functionName: string,
  args: Array<string | boolean | bigint>,
  value: bigint = 0n,
) {
  const client = getClient(account)

  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value,
  } as any)

  const receipt =
    await client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.ACCEPTED,
    })

  return {
    hash,
    receipt,
  }
}

async function writeAsync(
  account: string,
  functionName: string,
  args: Array<string | boolean | bigint>,
) {
  const client = getClient(account)

  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: 0n,
  } as any)

  return {
    hash,
  }
}

async function read(
  functionName: string,
  args: Array<string | boolean> = [],
) {
  const client = getClient()

  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    stateStatus: 'accepted',
  } as any)
}

export type CampaignPool = {
  pool_wei: string
  reserved_wei: string
  available_wei: string
}

export const airJudge = {
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
    writeAsync(
      account,
      'judge_application',
      [
        campaignId,
        normalizeAddress(applicant),
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

  getCampaignReward: async (
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

  getCampaignPoolStatus: async (
    campaignId: string,
  ): Promise<CampaignPool> => {
    const raw = String(
      await read(
        'get_campaign_pool_status',
        [campaignId],
      ),
    )

    const parsed = JSON.parse(raw)

    return {
      pool_wei: String(
        parsed.pool_wei ?? 0,
      ),
      reserved_wei: String(
        parsed.reserved_wei ?? 0,
      ),
      available_wei: String(
        parsed.available_wei ?? 0,
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
        normalizeAddress(applicant),
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
        normalizeAddress(applicant),
      ],
    ) as Promise<string>,

  getApplicationDescription: (
    campaignId: string,
    applicant: string,
  ) =>
    read(
      'get_application_description',
      [
        campaignId,
        normalizeAddress(applicant),
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
        normalizeAddress(applicant),
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
        normalizeAddress(applicant),
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
        normalizeAddress(applicant),
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
        normalizeAddress(applicant),
      ],
    ) as Promise<string>,

  getPendingPayout: async (
    campaignId: string,
    applicant: string,
  ) =>
    String(
      await read(
        'get_pending_payout',
        [
          campaignId,
          normalizeAddress(applicant),
        ],
      ),
    ),

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

export async function pollApplicationStatus(
  campaignId: string,
  applicant: string,
  timeoutMs = 300_000,
) {
  const deadline = Date.now() + timeoutMs

  let delay = 6_000
  let last = 'PENDING'

  while (Date.now() < deadline) {
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
      // Ignore temporary Studio read/rate-limit errors
      // while validators are reaching consensus.
    }

    await sleep(delay)

    delay = Math.min(
      Math.round(delay * 1.35),
      15_000,
    )
  }

  return last
}
