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
  const client = getClient(address)

  await client.connect('studionet')

  return address
}

async function write(
  account: string,
  functionName: string,
  args: Array<string | boolean>,
) {
  const client = getClient(account)

  await client.connect('studionet')

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

async function read(functionName: string, args: string[]) {
  const client = getClient()

  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  })
}

export const contract = {
  createCampaign: (
    account: string,
    campaignId: string,
    name: string,
    criteria: string,
  ) => write(account, 'create_campaign', [campaignId, name, criteria]),

  setCampaignActive: (
    account: string,
    campaignId: string,
    active: boolean,
  ) => write(account, 'set_campaign_active', [campaignId, active]),

  submitApplication: (
    account: string,
    campaignId: string,
    description: string,
    evidenceUrl: string,
  ) =>
    write(account, 'submit_application', [
      campaignId,
      description,
      evidenceUrl,
    ]),

  judgeApplication: (
    account: string,
    campaignId: string,
    applicant: string,
  ) =>
    write(account, 'judge_application', [
      campaignId,
      normalizeAddress(applicant),
    ]),

  getCampaignName: (campaignId: string) =>
    read('get_campaign_name', [campaignId]) as Promise<string>,

  getCampaignCriteria: (campaignId: string) =>
    read('get_campaign_criteria', [campaignId]) as Promise<string>,

  getCampaignCreator: (campaignId: string) =>
    read('get_campaign_creator', [campaignId]) as Promise<string>,

  isCampaignActive: (campaignId: string) =>
    read('is_campaign_active', [campaignId]) as Promise<boolean>,

  getApplicationStatus: (campaignId: string, applicant: string) =>
    read('get_application_status', [
      campaignId,
      normalizeAddress(applicant),
    ]) as Promise<string>,

  getApplicationDescription: (
    campaignId: string,
    applicant: string,
  ) =>
    read('get_application_description', [
      campaignId,
      normalizeAddress(applicant),
    ]) as Promise<string>,

  getApplicationEvidence: (
    campaignId: string,
    applicant: string,
  ) =>
    read('get_application_evidence', [
      campaignId,
      normalizeAddress(applicant),
    ]) as Promise<string>,

  getApplicationReason: (
    campaignId: string,
    applicant: string,
  ) =>
    read('get_application_reason', [
      campaignId,
      normalizeAddress(applicant),
    ]) as Promise<string>,
}
