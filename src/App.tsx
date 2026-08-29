import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import type {
  FormEvent,
} from 'react'

import './styles.css'

import {
  CONTRACT_ADDRESS,
  EXPLORER_BASE,
} from './lib/config'

import {
  airJudge,
  connectWallet,
  ensureStudioChain,
  getChainId,
  getConnectedWallet,
  getEthereumProvider,
  isStudioChain,
  formatWei,
  normalizeAddress,
  parseGenToWei,
  pollApplicationStatus,
  sleep,
} from './lib/genlayer'

import { reportError } from './lib/errors'

import StatusPill from './components/StatusPill'
import WalletButton from './components/WalletButton'

type WorkspaceTab = 'campaign' | 'proof' | 'review'

type Busy =
  | ''
  | 'connect'
  | 'load'
  | 'create'
  | 'fund'
  | 'submit'
  | 'judge'
  | 'withdraw'
  | 'toggle'
  | 'switch'

type Campaign = {
  id: string
  name: string
  criteria: string
  creator: string
  rewardWei: string
  active: boolean
  poolWei: string
  reservedWei: string
  availableWei: string
}

type Application = {
  applicant: string
  status: string
  description: string
  proofUrl: string
  evidenceUrl: string
  reason: string
  reviewedSnapshot: string
  pendingWei: string
}

const short = (
  value: string,
  head = 7,
  tail = 5,
) =>
  value &&
  value.length >
    head + tail + 3
    ? `${value.slice(
        0,
        head,
      )}…${value.slice(
        -tail,
      )}`
    : value

const contractConfigured =
  Boolean(CONTRACT_ADDRESS) &&
  /^0x[a-fA-F0-9]{40}$/.test(
    CONTRACT_ADDRESS,
  )

async function copyText(
  value: string,
) {
  if (!value) return false

  try {
    if (
      navigator.clipboard
        ?.writeText
    ) {
      await navigator.clipboard.writeText(
        value,
      )

      return true
    }
  } catch {
    // fallback below
  }

  try {
    const textarea =
      document.createElement(
        'textarea',
      )

    textarea.value = value

    textarea.style.position =
      'fixed'

    textarea.style.opacity =
      '0'

    document.body.appendChild(
      textarea,
    )

    textarea.focus()
    textarea.select()

    const ok =
      document.execCommand(
        'copy',
      )

    textarea.remove()

    return ok
  } catch {
    return false
  }
}

function App() {
  const [
    account,
    setAccount,
  ] = useState('')

  const [
    busy,
    setBusy,
  ] =
    useState<Busy>('')

  const [workspaceTab, setWorkspaceTab] =
    useState<WorkspaceTab>('campaign')

  const [
    notice,
    setNotice,
  ] = useState('')

  const [
    noticeKind,
    setNoticeKind,
  ] =
    useState<
      | 'info'
      | 'success'
      | 'error'
    >('info')

  const [
    chainId,
    setChainId,
  ] = useState('')

  /*
   * Restore an already-authorized wallet and keep account/network state
   * synchronized with MetaMask. This prevents a stale proof marker after
   * the reviewer changes accounts in the extension.
   */
  useEffect(() => {
    let cancelled = false
    const ethereum = getEthereumProvider()

    const restore = async () => {
      try {
        const [address, currentChain] = await Promise.all([
          getConnectedWallet(),
          getChainId(),
        ])

        if (cancelled) return

        setChainId(currentChain)

        if (address) {
          setAccount(address)
          setLookupWallet(address)
        }
      } catch (error) {
        console.warn('[AirJudge] wallet restore failed', error)
      }
    }

    const handleAccountsChanged = (accounts: string[]) => {
      try {
        const next = accounts?.[0] ? normalizeAddress(accounts[0]) : ''
        setAccount(next)
        setLookupWallet(next)

        if (next) {
          setNoticeKind('info')
          setNotice(
            `Wallet changed to ${short(next)}. The proof marker below now belongs to this wallet.`,
          )
        } else {
          setNoticeKind('info')
          setNotice('Wallet disconnected.')
        }
      } catch (error) {
        setNoticeKind('error')
        setNotice(reportError('accountsChanged', error))
      }
    }

    const handleChainChanged = (nextChainId: string) => {
      const next = String(nextChainId ?? '').toLowerCase()
      setChainId(next)

      if (next && !isStudioChain(next)) {
        setNoticeKind('info')
        setNotice('MetaMask changed networks. Switch to GenLayer Studio (61999) before a write.')
      }
    }

    ethereum?.on?.('accountsChanged', handleAccountsChanged)
    ethereum?.on?.('chainChanged', handleChainChanged)

    void restore()

    return () => {
      cancelled = true
      ethereum?.removeListener?.('accountsChanged', handleAccountsChanged)
      ethereum?.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [])

  /*
   * IMPORTANT:
   * No old hard-coded campaign.
   * F5 starts with a blank input.
   */
  const [
    campaignId,
    setCampaignId,
  ] = useState('')

  const [
    campaign,
    setCampaign,
  ] =
    useState<Campaign | null>(
      null,
    )

  const [
    createId,
    setCreateId,
  ] = useState('')

  const [
    createName,
    setCreateName,
  ] = useState('')

  const [
    createCriteria,
    setCreateCriteria,
  ] = useState('')

  const [
    createReward,
    setCreateReward,
  ] = useState('5')

  // Optional GEN sent with create_campaign. Empty or 0 keeps the campaign
  // unfunded at creation, which is how it behaved before create_campaign
  // became payable.
  const [
    createFunding,
    setCreateFunding,
  ] = useState('')

  const [
    fundAmount,
    setFundAmount,
  ] = useState('10')

  const [
    description,
    setDescription,
  ] = useState('')

  const [
    proofUrl,
    setProofUrl,
  ] = useState('')

  const [
    evidenceUrl,
    setEvidenceUrl,
  ] = useState('')

  const [
    lookupWallet,
    setLookupWallet,
  ] = useState('')

  const [
    application,
    setApplication,
  ] =
    useState<Application | null>(
      null,
    )

  const explorerAddress =
    contractConfigured
      ? `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`
      : '#'

  const owner = useMemo(
    () => {
      if (
        !account ||
        !campaign?.creator
      ) {
        return false
      }

      return (
        account.toLowerCase() ===
        campaign.creator.toLowerCase()
      )
    },
    [
      account,
      campaign,
    ],
  )

  const run = async (
    action: Busy,
    task: () => Promise<void>,
  ) => {
    if (busy !== '') {
      return
    }

    try {
      setBusy(action)
      setNotice('')

      await task()
    } catch (error) {
      setNoticeKind(
        'error',
      )

      setNotice(
        reportError(action || 'action', error),
      )
    } finally {
      setBusy('')
    }
  }

  const connect = () =>
    run(
      'connect',
      async () => {
        if (
          !contractConfigured
        ) {
          throw new Error(
            'Contract address is not configured.',
          )
        }

        const address =
          await connectWallet()

        // Account approval is authoritative. Keep it connected even if the
        // user dismisses a later network-switch prompt.
        setAccount(address)
        setLookupWallet(address)

        try {
          const currentChain =
            await ensureStudioChain()
          setChainId(currentChain)

          setNoticeKind('success')
          setNotice(`Wallet connected: ${short(address)} · GenLayer Studio`)
        } catch (error) {
          try {
            setChainId(await getChainId())
          } catch {
            // best-effort chain status refresh
          }
          throw error
        }
      },
    )

  const switchNetwork = () =>
    run(
      'switch',
      async () => {
        const current = await ensureStudioChain()
        setChainId(current)
        setNoticeKind('success')
        setNotice('MetaMask is now on GenLayer Studio (chain 61999).')
      },
    )

  const loadCampaign =
    useCallback(
      async (
        idOverride?: string,
      ) => {
        const id = (
          idOverride ??
          campaignId
        ).trim()

        if (!id) {
          throw new Error(
            'Enter a campaign ID.',
          )
        }

        const [
          name,
          criteria,
          creator,
          rewardWei,
          active,
          pool,
        ] =
          await Promise.all([
            airJudge.getCampaignName(
              id,
            ),
            airJudge.getCampaignCriteria(
              id,
            ),
            airJudge.getCampaignCreator(
              id,
            ),
            airJudge.getCampaignReward(
              id,
            ),
            airJudge.isCampaignActive(
              id,
            ),
            airJudge.getCampaignPoolStatus(
              id,
            ),
          ])

        if (
          !String(
            name,
          ).trim()
        ) {
          throw new Error(
            'Campaign not found.',
          )
        }

        setCampaignId(id)

        setCampaign({
          id,
          name: String(name),
          criteria:
            String(criteria),
          creator:
            String(creator),
          rewardWei:
            String(rewardWei),
          active:
            Boolean(active),
          poolWei:
            pool.pool_wei,
          reservedWei:
            pool.reserved_wei,
          availableWei:
            pool.available_wei,
        })

        /*
         * Prevent data from a
         * previous campaign
         * staying visible.
         */
        setApplication(
          null,
        )
      },
      [campaignId],
    )

  const refreshCampaignAfterWrite =
    async (
      id: string,
    ) => {
      let lastError:
        unknown

      for (
        let i = 0;
        i < 4;
        i += 1
      ) {
        try {
          await sleep(
            i === 0
              ? 2500
              : 3000,
          )

          await loadCampaign(
            id,
          )

          return
        } catch (error) {
          lastError =
            error
        }
      }

      throw lastError
    }

  const handleLoadCampaign =
    () =>
      run(
        'load',
        async () => {
          await loadCampaign()

          setNoticeKind(
            'success',
          )

          setNotice(
            'Campaign state loaded.',
          )
        },
      )

  const createCampaign = (
    event: FormEvent,
  ) => {
    event.preventDefault()

    return run(
      'create',
      async () => {
        if (!account) {
          throw new Error(
            'Connect wallet first.',
          )
        }

        if (
          !createId.trim() ||
          !createName.trim() ||
          !createCriteria.trim()
        ) {
          throw new Error(
            'Complete all campaign fields.',
          )
        }

        const rewardWei =
          parseGenToWei(
            createReward,
          )

        if (
          rewardWei <= 0n
        ) {
          throw new Error(
            'Reward must be greater than zero.',
          )
        }

        const initialFundingWei =
          createFunding.trim() === ''
            ? 0n
            : parseGenToWei(
                createFunding,
              )

        if (initialFundingWei < 0n) {
          throw new Error(
            'Initial funding cannot be negative.',
          )
        }

        const result =
          await airJudge.createCampaign(
            account,
            createId.trim(),
            createName.trim(),
            createCriteria.trim(),
            rewardWei,
          )

        setCampaignId(
          createId.trim(),
        )

        setNoticeKind(
          result.monitoringWarning
            ? 'info'
            : 'success',
        )

        setNotice(
          result.monitoringWarning
            ? `Transaction ${short(
                result.hash,
              )} submitted. RPC receipt monitoring dropped. Verifying onchain state before allowing a retry…`
            : `Campaign transaction ${short(
                result.hash,
              )} accepted. Verifying state…`,
        )

        await refreshCampaignAfterWrite(
          createId.trim(),
        )

        // ------------------------------------------------------------
        // Optional second leg: fund the campaign we just created.
        //
        // create_campaign is not payable, so funding is its own
        // transaction. Chaining it here means the creator signs twice
        // but drives one action, which is the behaviour the Explorer
        // review asked for. It runs only after the create is confirmed
        // onchain - firing fund_campaign against a campaign that does
        // not exist yet would revert.
        //
        // If this leg fails, the campaign still exists. Saying so
        // explicitly matters: a user who reads a generic failure will
        // try to create again and hit "campaign already exists".
        // ------------------------------------------------------------
        if (initialFundingWei > 0n) {
          setNoticeKind('info')
          setNotice(
            'Campaign created. Confirm the second transaction to fund it.',
          )

          try {
            const funded =
              await airJudge.fundCampaign(
                account,
                createId.trim(),
                initialFundingWei,
              )

            await refreshCampaignAfterWrite(
              createId.trim(),
            )

            setNoticeKind('success')
            setNotice(
              `Campaign created and funded. Funding transaction ${short(
                funded.hash,
              )}.`,
            )
            setCreateFunding('')
            return
          } catch (fundError) {
            setNoticeKind('error')
            setNotice(
              `Campaign "${createId.trim()}" was created successfully, but the funding transaction did not go through: ${reportError(
                'fund',
                fundError,
              )} Do not create it again - use Fund campaign below to add GEN.`,
            )
            return
          }
        }

        setNoticeKind(
          'success',
        )

        setNotice(
          'Campaign created and verified onchain.',
        )
      },
    )
  }

  const fundCampaign = (
    event: FormEvent,
  ) => {
    event.preventDefault()

    return run(
      'fund',
      async () => {
        if (!account) {
          throw new Error(
            'Connect wallet first.',
          )
        }

        if (!campaign) {
          throw new Error(
            'Load a campaign first.',
          )
        }

        if (!owner) {
          throw new Error(
            'Only the campaign creator can fund it.',
          )
        }

        const amountWei =
          parseGenToWei(
            fundAmount,
          )

        if (
          amountWei <= 0n
        ) {
          throw new Error(
            'Funding amount must be greater than zero.',
          )
        }

        const beforePool =
          BigInt(
            campaign.poolWei ||
              '0',
          )

        const result =
          await airJudge.fundCampaign(
            account,
            campaign.id,
            amountWei,
          )

        setNoticeKind(
          'info',
        )

        setNotice(
          result.monitoringWarning
            ? `Funding transaction ${short(
                result.hash,
              )} submitted. RPC monitoring dropped. Checking pool state before retry is allowed…`
            : `Funding transaction ${short(
                result.hash,
              )} accepted. Verifying pool…`,
        )

        let verified =
          false

        for (
          let i = 0;
          i < 5;
          i += 1
        ) {
          await sleep(
            i === 0
              ? 2500
              : 3000,
          )

          try {
            const pool =
              await airJudge.getCampaignPoolStatus(
                campaign.id,
              )

            const nextPool =
              BigInt(
                pool.pool_wei ||
                  '0',
              )

            if (
              nextPool >=
              beforePool +
                amountWei
            ) {
              await loadCampaign(
                campaign.id,
              )

              verified =
                true

              break
            }
          } catch {
            // wait for RPC recovery
          }
        }

        if (!verified) {
          throw new Error(
            `Transaction ${short(
              result.hash,
            )} was submitted, but RPC verification is still unavailable. DO NOT click Fund again. Wait and press LOAD to verify the pool.`,
          )
        }

        setNoticeKind(
          'success',
        )

        setNotice(
          `${fundAmount} GEN added to campaign pool and verified onchain.`,
        )
      },
    )
  }

  const toggleCampaign =
    () =>
      run(
        'toggle',
        async () => {
          if (
            !account ||
            !campaign
          ) {
            throw new Error(
              'Connect wallet and load campaign first.',
            )
          }

          if (!owner) {
            throw new Error(
              'Only the campaign creator can change campaign state.',
            )
          }

          await airJudge.setCampaignActive(
            account,
            campaign.id,
            !campaign.active,
          )

          await refreshCampaignAfterWrite(
            campaign.id,
          )

          setNoticeKind(
            'success',
          )

          setNotice(
            campaign.active
              ? 'Campaign paused.'
              : 'Campaign activated.',
          )
        },
      )

  const requiredMarker =
    useMemo(
      () => {
        if (
          !campaign ||
          !account
        ) {
          return ''
        }

        return `AIRJUDGE_PROOF:${campaign.id}:${account.toLowerCase()}`
      },
      [
        campaign,
        account,
      ],
    )

  const proofPageText =
    useMemo(
      () => {
        const cleanEvidenceUrl = evidenceUrl.trim()

        if (!requiredMarker || !cleanEvidenceUrl) {
          return ''
        }

        return `${requiredMarker}\nevidence_url:${cleanEvidenceUrl}`
      },
      [requiredMarker, evidenceUrl],
    )

  const copyProofPage =
    async () => {
      if (!requiredMarker) {
        setNoticeKind('error')
        setNotice('Connect the applicant wallet and load the campaign first.')
        return
      }

      if (!evidenceUrl.trim().startsWith('https://')) {
        setNoticeKind('error')
        setNotice('Paste the exact public HTTPS evidence URL first. AirJudge binds that URL into the proof page.')
        return
      }

      const copied = await copyText(proofPageText)

      if (copied) {
        setNoticeKind('success')
        setNotice('Full two-line proof page copied. Publish these exact lines at a public HTTPS URL, then paste that URL into Proof / Binding URL.')
      } else {
        setNoticeKind('info')
        setNotice('Browser blocked clipboard access. Select the two-line proof page and copy it manually.')
      }
    }

  const copyMarker =
    async () => {
      if (
        !requiredMarker
      ) {
        setNoticeKind(
          'error',
        )

        setNotice(
          'Connect wallet and load campaign first.',
        )

        return
      }

      const copied =
        await copyText(
          requiredMarker,
        )

      if (copied) {
        setNoticeKind(
          'success',
        )

        setNotice(
          'Proof marker copied.',
        )
      } else {
        setNoticeKind(
          'info',
        )

        setNotice(
          'Browser blocked clipboard access. Select the marker and copy it manually.',
        )
      }
    }

  const refreshApplicationAfterWrite =
    async (
      applicant: string,
      attempts = 5,
    ) => {
      let lastError:
        unknown

      for (
        let i = 0;
        i < attempts;
        i += 1
      ) {
        try {
          await sleep(
            i === 0
              ? 3000
              : 3000,
          )

          await loadApplication(
            applicant,
          )

          return
        } catch (error) {
          lastError =
            error
        }
      }

      throw lastError
    }

  const submitApplication = (
    event: FormEvent,
  ) => {
    event.preventDefault()

    return run(
      'submit',
      async () => {
        if (!account) {
          throw new Error(
            'Connect wallet first.',
          )
        }

        if (!campaign) {
          throw new Error(
            'Load a campaign first.',
          )
        }

        if (owner) {
          throw new Error(
            'Campaign creator cannot apply.',
          )
        }

        if (
          !campaign.active
        ) {
          throw new Error(
            'Campaign is not active.',
          )
        }

        const cleanDescription =
          description.trim()

        const cleanProofUrl =
          proofUrl.trim()

        const cleanEvidenceUrl =
          evidenceUrl.trim()

        if (
          cleanDescription.length < 10
        ) {
          throw new Error(
            'Add a meaningful contribution description.',
          )
        }

        if (
          !cleanProofUrl.startsWith(
            'https://',
          )
        ) {
          throw new Error(
            'Proof URL must be a public HTTPS URL.',
          )
        }

        if (
          !cleanEvidenceUrl.startsWith(
            'https://',
          )
        ) {
          throw new Error(
            'Evidence URL must be a public HTTPS URL.',
          )
        }

        const used =
          await airJudge.isEvidenceUsed(
            campaign.id,
            cleanEvidenceUrl,
          )

        if (used) {
          throw new Error(
            'This evidence URL has already been used in this campaign.',
          )
        }

        const result =
          await airJudge.submitApplication(
            account,
            campaign.id,
            cleanDescription,
            cleanProofUrl,
            cleanEvidenceUrl,
          )

        setLookupWallet(
          account,
        )

        setNoticeKind(
          result.monitoringWarning
            ? 'info'
            : 'success',
        )

        setNotice(
          result.monitoringWarning
            ? `Application transaction ${short(
                result.hash,
              )} submitted. Waiting for accepted state. Do not submit again.`
            : `Application transaction ${short(
                result.hash,
              )} accepted. Loading state…`,
        )

        await refreshApplicationAfterWrite(
          account,
        )

        setNoticeKind(
          'success',
        )

        setNotice(
          'Application submitted. Status is PENDING and ready for adjudication.',
        )
      },
    )
  }

  const loadApplication =
    async (
      walletOverride?: string,
    ) => {
      if (!campaign) {
        throw new Error(
          'Load a campaign first.',
        )
      }

      const wallet = (
        walletOverride ??
        lookupWallet
      ).trim()

      if (!wallet) {
        throw new Error(
          'Enter applicant wallet.',
        )
      }

      const applicant =
        normalizeAddress(
          wallet,
        )

      const [
        status,
        applicationDescription,
        applicationProofUrl,
        applicationEvidence,
        reason,
        reviewedSnapshot,
        pendingWei,
      ] =
        await Promise.all([
          airJudge.getApplicationStatus(
            campaign.id,
            applicant,
          ),

          airJudge.getApplicationDescription(
            campaign.id,
            applicant,
          ),

          airJudge.getApplicationProofUrl(
            campaign.id,
            applicant,
          ),

          airJudge.getApplicationEvidence(
            campaign.id,
            applicant,
          ),

          airJudge.getApplicationReason(
            campaign.id,
            applicant,
          ),

          airJudge.getReviewedSnapshot(
            campaign.id,
            applicant,
          ),

          airJudge.getPendingPayout(
            campaign.id,
            applicant,
          ),
        ])

      if (
        !String(
          status,
        ).trim()
      ) {
        throw new Error(
          'No application found for this wallet.',
        )
      }

      setLookupWallet(
        applicant,
      )

      setApplication({
        applicant,
        status:
          String(status),
        description:
          String(
            applicationDescription,
          ),
        proofUrl:
          String(
            applicationProofUrl,
          ),
        evidenceUrl:
          String(
            applicationEvidence,
          ),
        reason:
          String(reason),
        reviewedSnapshot:
          String(
            reviewedSnapshot,
          ),
        pendingWei:
          String(
            pendingWei,
          ),
      })
    }

  const handleLoadApplication =
    () =>
      run(
        'load',
        async () => {
          await loadApplication()

          setNoticeKind(
            'success',
          )

          setNotice(
            'Application loaded.',
          )
        },
      )

  const judgeApplication =
    () =>
      run(
        'judge',
        async () => {
          if (
            !account ||
            !campaign ||
            !application
          ) {
            throw new Error(
              'Load an application first.',
            )
          }

          if (
            application.status !==
            'PENDING'
          ) {
            throw new Error(
              'This application has already been adjudicated.',
            )
          }

          const { hash } =
            await airJudge.judgeApplication(
              account,
              campaign.id,
              application.applicant,
            )

          setNoticeKind(
            'info',
          )

          setNotice(
            `Adjudication ${short(
              hash,
            )} submitted. Validators are reaching consensus. Do not click Run again.`,
          )

          /*
           * Avoid immediate polling.
           * Give accepted state time to appear.
           */
          await sleep(7000)

          const status =
            await pollApplicationStatus(
              campaign.id,
              application.applicant,
            )

          await loadApplication(
            application.applicant,
          )

          try {
            await loadCampaign(
              campaign.id,
            )
          } catch {
            // transient RPC campaign refresh is non-fatal
          }

          if (
            status ===
            'PENDING'
          ) {
            setNoticeKind(
              'info',
            )

            setNotice(
              `Adjudication ${short(
                hash,
              )} was submitted, but RPC polling timed out. DO NOT run it again. Use LOAD APPLICATION to refresh the final status.`,
            )

            return
          }

          setNoticeKind(
            'success',
          )

          setNotice(
            `Consensus reached: ${status}`,
          )
        },
      )

  const withdraw = () =>
    run(
      'withdraw',
      async () => {
        if (
          !account ||
          !campaign ||
          !application
        ) {
          throw new Error(
            'Connect the applicant wallet first.',
          )
        }

        if (
          account.toLowerCase() !==
          application.applicant.toLowerCase()
        ) {
          throw new Error(
            'Connect the applicant wallet that owns this payout.',
          )
        }

        if (
          BigInt(
            application.pendingWei ||
              '0',
          ) <= 0n
        ) {
          throw new Error(
            'No reserved payout is available.',
          )
        }

        const result =
          await airJudge.withdraw(
            account,
            campaign.id,
          )

        setNoticeKind(
          result.monitoringWarning
            ? 'info'
            : 'success',
        )

        setNotice(
          result.monitoringWarning
            ? `Withdrawal ${short(
                result.hash,
              )} submitted. Verifying final payout state. Do not click Claim again.`
            : `Withdrawal ${short(
                result.hash,
              )} accepted. Verifying payout…`,
        )

        await refreshApplicationAfterWrite(
          application.applicant,
        )

        await refreshCampaignAfterWrite(
          campaign.id,
        )

        setNoticeKind(
          'success',
        )

        setNotice(
          'Reward withdrawal verified onchain.',
        )
      },
    )

  const pendingGen =
    application
      ? formatWei(
          application.pendingWei,
        )
      : '0'

  return (
    <div className="app pro-app">
      <header className="topbar pro-topbar">
        <div className="brand-row">
          <div className="brand">
            <div className="brand-mark">AJ</div>

            <div>
              <strong>AirJudge</strong>
              <span>Consensus reward adjudication</span>
            </div>
          </div>

          <div className="brand-divider" aria-hidden="true" />

          <a
            className="genlayer-brand"
            href="https://genlayer.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="Built on GenLayer"
            title="Built on GenLayer"
          >
            <span>BUILT ON</span>
            <img
              src="https://genlayer.com/brand/genlayer-logo-white-cropped.svg"
              alt="GenLayer"
            />
          </a>
        </div>

        <div className="top-actions">
          <a
            href={explorerAddress}
            target={contractConfigured ? '_blank' : undefined}
            rel="noreferrer"
          >
            CONTRACT ↗
          </a>

          <WalletButton
            account={account}
            onConnect={connect}
            busy={busy === 'connect'}
          />
        </div>
      </header>

      <main className="shell pro-shell">
        <section className="pro-hero">
          <div className="hero-copy">
            <span className="eyebrow">GENLAYER / INTELLIGENT CONTRACT</span>

            <h1>
              Contribution rewards,
              <em> adjudicated by consensus.</em>
            </h1>

            <p>
              Create funded reward campaigns, bind public contribution evidence
              to an applicant wallet, let GenLayer validators adjudicate, then
              settle eligible rewards onchain.
            </p>
          </div>

          <div className="hero-status-card">
            <span className="mini-label">CURRENT SESSION</span>

            <div className="hero-status-row">
              <span>Wallet</span>
              <strong>{account ? short(account, 8, 6) : 'Not connected'}</strong>
            </div>

            <div className="hero-status-row">
              <span>Network</span>
              <strong className={chainId && isStudioChain(chainId) ? 'ok-text' : ''}>
                {chainId
                  ? isStudioChain(chainId)
                    ? 'StudioNet · 61999'
                    : 'Wrong network'
                  : '—'}
              </strong>
            </div>

            <div className="hero-status-row">
              <span>Campaign</span>
              <strong>{campaign ? campaign.id : 'Not loaded'}</strong>
            </div>
          </div>
        </section>

        {!contractConfigured && (
          <div className="notice error">
            Contract address is not configured.
          </div>
        )}

        {account && chainId && !isStudioChain(chainId) && (
          <div className="network-banner pro-network-banner">
            <div>
              <strong>WRONG NETWORK</strong>
              <span>Switch MetaMask to GenLayer Studio (chain 61999) before a write.</span>
            </div>

            <button
              type="button"
              onClick={switchNetwork}
              disabled={busy !== ''}
            >
              {busy === 'switch' ? 'SWITCHING…' : 'SWITCH NETWORK'}
            </button>
          </div>
        )}

        {notice && (
          <div className={`notice ${noticeKind} pro-notice`}>
            {notice}
          </div>
        )}

        <section className="summary-strip">
          <div>
            <span>CAMPAIGN</span>
            <strong>{campaign ? campaign.name : '—'}</strong>
          </div>

          <div>
            <span>STATUS</span>
            <strong>{campaign ? (campaign.active ? 'ACTIVE' : 'PAUSED') : '—'}</strong>
          </div>

          <div>
            <span>REWARD</span>
            <strong>{campaign ? `${formatWei(campaign.rewardWei)} GEN` : '—'}</strong>
          </div>

          <div>
            <span>POOL</span>
            <strong>{campaign ? `${formatWei(campaign.poolWei)} GEN` : '—'}</strong>
          </div>

          <div>
            <span>AVAILABLE</span>
            <strong>{campaign ? `${formatWei(campaign.availableWei)} GEN` : '—'}</strong>
          </div>

          <div>
            <span>APPLICATION</span>
            <strong>{application ? application.status : '—'}</strong>
          </div>
        </section>

        <nav className="workspace-tabs" aria-label="AirJudge workflow">
          <button
            type="button"
            className={workspaceTab === 'campaign' ? 'workspace-tab active' : 'workspace-tab'}
            onClick={() => setWorkspaceTab('campaign')}
          >
            <span>01</span>
            Campaign
          </button>

          <button
            type="button"
            className={workspaceTab === 'proof' ? 'workspace-tab active' : 'workspace-tab'}
            onClick={() => setWorkspaceTab('proof')}
            disabled={!campaign}
          >
            <span>02</span>
            Proof & Submit
          </button>

          <button
            type="button"
            className={workspaceTab === 'review' ? 'workspace-tab active' : 'workspace-tab'}
            onClick={() => setWorkspaceTab('review')}
            disabled={!campaign}
          >
            <span>03</span>
            Review & Claim
            {application && <b className="tab-status-dot" />}
          </button>
        </nav>

        {workspaceTab === 'campaign' && (
          <section className="workspace-view campaign-view">
            <div className="workspace-grid campaign-top-grid">
              <article className="panel pro-panel">
                <div className="panel-head compact-head">
                  <div>
                    <span className="step">LOAD</span>
                    <h2>Open campaign</h2>
                  </div>

                  {campaign && (
                    <StatusPill status={campaign.active ? 'ACTIVE' : 'PAUSED'} />
                  )}
                </div>

                <div className="inline-form pro-inline-form">
                  <input
                    value={campaignId}
                    onChange={(event) => setCampaignId(event.target.value)}
                    placeholder="Enter campaign ID"
                  />

                  <button
                    onClick={handleLoadCampaign}
                    disabled={busy !== ''}
                  >
                    {busy === 'load' ? 'LOADING…' : 'LOAD'}
                  </button>
                </div>

                {campaign ? (
                  <div className="campaign-detail">
                    <div className="metric-grid">
                      <div>
                        <span>REWARD</span>
                        <strong>{formatWei(campaign.rewardWei)} GEN</strong>
                      </div>
                      <div>
                        <span>POOL</span>
                        <strong>{formatWei(campaign.poolWei)} GEN</strong>
                      </div>
                      <div>
                        <span>RESERVED</span>
                        <strong>{formatWei(campaign.reservedWei)} GEN</strong>
                      </div>
                      <div>
                        <span>AVAILABLE</span>
                        <strong>{formatWei(campaign.availableWei)} GEN</strong>
                      </div>
                    </div>

                    <div className="criteria-box pro-criteria">
                      <span>ELIGIBILITY CRITERIA</span>
                      <p>{campaign.criteria}</p>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    Load an existing campaign or create one beside it.
                  </div>
                )}
              </article>

              <article className="panel pro-panel">
                <div className="panel-head compact-head">
                  <div>
                    <span className="step">CREATE</span>
                    <h2>New reward campaign</h2>
                  </div>
                </div>

                <form onSubmit={createCampaign} className="form-grid compact-form-grid">
                  <label>
                    <span>CAMPAIGN ID</span>
                    <input
                      value={createId}
                      onChange={(event) => setCreateId(event.target.value)}
                      placeholder="genlayer-builders"
                    />
                  </label>

                  <label>
                    <span>CAMPAIGN NAME</span>
                    <input
                      value={createName}
                      onChange={(event) => setCreateName(event.target.value)}
                      placeholder="GenLayer Builders"
                    />
                  </label>

                  <label>
                    <span>REWARD / GEN</span>
                    <input
                      value={createReward}
                      onChange={(event) => setCreateReward(event.target.value)}
                    />
                  </label>

                  <label>
                    <span>FUND NOW / GEN — OPTIONAL</span>
                    <input
                      value={createFunding}
                      onChange={(event) => setCreateFunding(event.target.value)}
                      placeholder="0"
                    />
                    <small>
                      Funds the campaign right after it is created, as a second
                      signature. Leave empty to create it unfunded and top up
                      later.
                    </small>
                  </label>

                  <label className="wide">
                    <span>ELIGIBILITY CRITERIA</span>
                    <textarea
                      rows={3}
                      value={createCriteria}
                      onChange={(event) => setCreateCriteria(event.target.value)}
                      placeholder="Applicant must provide verifiable evidence of..."
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={busy !== '' || !account}
                  >
                    {busy === 'create'
                      ? 'CREATING / VERIFYING…'
                      : createFunding.trim() === ''
                        ? 'CREATE CAMPAIGN'
                        : 'CREATE & FUND CAMPAIGN'}
                  </button>
                </form>
              </article>
            </div>

            {campaign && (
              <article className="panel pro-panel fund-panel">
                <div className="panel-head compact-head">
                  <div>
                    <span className="step">FUND & CONTROL</span>
                    <h2>Campaign treasury</h2>
                  </div>

                  <div className="creator-chip">
                    Creator · {short(campaign.creator, 8, 6)}
                  </div>
                </div>

                <div className="fund-row">
                  <form onSubmit={fundCampaign} className="inline-form pro-inline-form fund-form">
                    <input
                      value={fundAmount}
                      onChange={(event) => setFundAmount(event.target.value)}
                      placeholder="GEN amount"
                    />

                    <button
                      type="submit"
                      disabled={busy !== '' || !account || !owner}
                    >
                      {busy === 'fund' ? 'FUNDING / VERIFYING…' : 'FUND CAMPAIGN'}
                    </button>
                  </form>

                  {owner && (
                    <button
                      className="secondary"
                      onClick={toggleCampaign}
                      disabled={busy !== ''}
                    >
                      {campaign.active ? 'PAUSE CAMPAIGN' : 'ACTIVATE CAMPAIGN'}
                    </button>
                  )}

                  {!owner && (
                    <span className="inline-hint">
                      Only the campaign creator can fund or change campaign status.
                    </span>
                  )}
                </div>
              </article>
            )}
          </section>
        )}

        {workspaceTab === 'proof' && campaign && (
          <section className="workspace-view proof-view">
            <div className="workspace-grid proof-main-grid">
              <article className="panel pro-panel proof-sidebar">
                <div className="panel-head compact-head">
                  <div>
                    <span className="step">APPLICANT IDENTITY</span>
                    <h2>Wallet-bound proof</h2>
                  </div>
                </div>

                <div className="proof-marker pro-proof-marker">
                  <span>REQUIRED PROOF MARKER</span>

                  <code>
                    {requiredMarker || 'Connect applicant wallet to generate marker'}
                  </code>

                  <button
                    type="button"
                    onClick={copyMarker}
                    disabled={!account}
                  >
                    COPY MARKER
                  </button>
                </div>

                {owner ? (
                  <div className="notice info compact-message">
                    Campaign creator cannot submit an application.
                    Switch to an applicant wallet.
                  </div>
                ) : (
                  <div className="proof-ready-card">
                    <span>APPLICANT READY</span>
                    <strong>{account ? short(account, 9, 7) : 'Connect wallet'}</strong>
                    <p>The proof marker automatically follows the selected MetaMask account.</p>
                  </div>
                )}

                <div className="proof-guide">
                  <span className="mini-label">3-STEP PROOF FLOW</span>
                  <ol>
                    <li>Paste a public contribution evidence URL.</li>
                    <li>Copy the generated two-line proof page and publish it.</li>
                    <li>Paste its public Raw URL into Proof / Binding URL.</li>
                  </ol>
                </div>
              </article>

              <article className="panel pro-panel">
                <div className="panel-head compact-head">
                  <div>
                    <span className="step">SUBMISSION</span>
                    <h2>Submit contribution evidence</h2>
                  </div>
                </div>

                <form onSubmit={submitApplication} className="form-grid proof-form-grid">
                  <label className="wide">
                    <span>CONTRIBUTION DESCRIPTION</span>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Describe the concrete implemented work..."
                    />
                  </label>

                  <label className="wide">
                    <span>CONTRIBUTION EVIDENCE URL</span>
                    <input
                      value={evidenceUrl}
                      onChange={(event) => setEvidenceUrl(event.target.value)}
                      placeholder="https://..."
                    />
                  </label>

                  <div className="wide proof-page-box pro-proof-page-box">
                    <div className="proof-page-head">
                      <div>
                        <span>READY-TO-PUBLISH PROOF PAGE</span>
                        <p>Publish these two lines unchanged at a public HTTPS URL.</p>
                      </div>

                      <button
                        type="button"
                        onClick={copyProofPage}
                        disabled={!account || !evidenceUrl.trim()}
                      >
                        COPY PROOF PAGE
                      </button>
                    </div>

                    <pre>
                      {proofPageText ||
                        `${requiredMarker || 'AIRJUDGE_PROOF:<campaign_id>:<applicant_wallet>'}\nevidence_url:<paste exact evidence URL above>`}
                    </pre>
                  </div>

                  <label className="wide">
                    <span>PROOF / BINDING URL</span>
                    <input
                      value={proofUrl}
                      onChange={(event) => setProofUrl(event.target.value)}
                      placeholder="https://gist.githubusercontent.com/.../raw/..."
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={busy !== '' || !account || owner || !campaign.active}
                  >
                    {busy === 'submit' ? 'SUBMITTING / VERIFYING…' : 'SUBMIT EVIDENCE'}
                  </button>
                </form>
              </article>
            </div>
          </section>
        )}

        {workspaceTab === 'review' && campaign && (
          <section className="workspace-view review-view">
            <article className="panel pro-panel application-loader">
              <div className="panel-head compact-head">
                <div>
                  <span className="step">APPLICATION LOOKUP</span>
                  <h2>Review & settlement</h2>
                </div>

                {application && <StatusPill status={application.status} />}
              </div>

              <div className="inline-form pro-inline-form">
                <input
                  value={lookupWallet}
                  onChange={(event) => setLookupWallet(event.target.value)}
                  placeholder="0x applicant wallet"
                />

                <button
                  onClick={handleLoadApplication}
                  disabled={busy !== ''}
                >
                  LOAD APPLICATION
                </button>
              </div>
            </article>

            {application ? (
              <div className="workspace-grid review-main-grid">
                <article className="panel pro-panel application-summary">
                  <div className="panel-head compact-head">
                    <div>
                      <span className="step">APPLICATION</span>
                      <h2>{short(application.applicant, 11, 8)}</h2>
                    </div>
                  </div>

                  <div className="app-description-card">
                    <span>DESCRIPTION</span>
                    <p>{application.description}</p>
                  </div>

                  <div className="link-grid">
                    <a href={application.proofUrl} target="_blank" rel="noreferrer">
                      <span>PROOF</span>
                      <strong>Open binding ↗</strong>
                      <small>{short(application.proofUrl, 28, 18)}</small>
                    </a>

                    <a href={application.evidenceUrl} target="_blank" rel="noreferrer">
                      <span>EVIDENCE</span>
                      <strong>Open evidence ↗</strong>
                      <small>{short(application.evidenceUrl, 28, 18)}</small>
                    </a>
                  </div>

                  {application.reason && (
                    <div className="result-box compact-result">
                      <span>CONSENSUS REASON</span>
                      <p>{application.reason}</p>
                    </div>
                  )}
                </article>

                <article className="panel pro-panel settlement-panel">
                  <div className="panel-head compact-head">
                    <div>
                      <span className="step">SETTLEMENT</span>
                      <h2>Reward state</h2>
                    </div>
                  </div>

                  <div className="claim-metric">
                    <span>RESERVED / CLAIMABLE</span>
                    <strong>{pendingGen} GEN</strong>
                  </div>

                  {application.status === 'PENDING' && (
                    <button
                      className="full-action"
                      onClick={judgeApplication}
                      disabled={busy !== ''}
                    >
                      {busy === 'judge'
                        ? 'VALIDATORS RUNNING…'
                        : 'RUN GENLAYER ADJUDICATION'}
                    </button>
                  )}

                  {BigInt(application.pendingWei || '0') > 0n && (
                    <button
                      className="full-action"
                      onClick={withdraw}
                      disabled={
                        busy !== '' ||
                        account.toLowerCase() !== application.applicant.toLowerCase()
                      }
                    >
                      {busy === 'withdraw'
                        ? 'CLAIMING / VERIFYING…'
                        : `CLAIM ${pendingGen} GEN`}
                    </button>
                  )}

                  {application.status === 'ELIGIBLE_PAID' && (
                    <div className="paid pro-paid">
                      ✓ REWARD CLAIMED
                    </div>
                  )}

                  {application.reviewedSnapshot && (
                    <div className="result-box snapshot-box">
                      <span>REVIEWED SNAPSHOT</span>
                      <p>{application.reviewedSnapshot}</p>
                    </div>
                  )}
                </article>
              </div>
            ) : (
              <div className="empty-state large-empty">
                Load an applicant wallet to inspect the adjudication and settlement state.
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="pro-footer">
        <span>AIRJUDGE V3 / GENLAYER STUDIONET</span>

        <span>
          {contractConfigured
            ? short(CONTRACT_ADDRESS, 10, 8)
            : 'CONTRACT NOT CONFIGURED'}
        </span>
      </footer>
    </div>
  )
}

export default App
