import {
  useCallback,
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
  formatWei,
  normalizeAddress,
  parseGenToWei,
  pollApplicationStatus,
  sleep,
} from './lib/genlayer'

import StatusPill from './components/StatusPill'
import WalletButton from './components/WalletButton'

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
        error instanceof Error
          ? error.message
          : 'Unexpected error.',
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

        setAccount(address)

        setLookupWallet(
          address,
        )

        setNoticeKind(
          'success',
        )

        setNotice(
          `Wallet connected: ${short(
            address,
          )}`,
        )
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

        if (
          description
            .trim()
            .length < 10
        ) {
          throw new Error(
            'Add a meaningful contribution description.',
          )
        }

        if (
          !proofUrl.startsWith(
            'https://',
          )
        ) {
          throw new Error(
            'Proof URL must be a public HTTPS URL.',
          )
        }

        if (
          !evidenceUrl.startsWith(
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
            evidenceUrl,
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
            description.trim(),
            proofUrl.trim(),
            evidenceUrl.trim(),
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

        await sleep(3500)

        await loadApplication(
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

        await sleep(3500)

        await loadApplication(
          application.applicant,
        )

        await loadCampaign(
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
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            AJ
          </div>

          <div>
            <strong>
              AirJudge
            </strong>

            <span>
              GenLayer contribution adjudication
            </span>
          </div>
        </div>

        <div className="top-actions">
          <a
            href={
              explorerAddress
            }
            target={
              contractConfigured
                ? '_blank'
                : undefined
            }
            rel="noreferrer"
          >
            CONTRACT ↗
          </a>

          <WalletButton
            account={account}
            onConnect={connect}
            busy={
              busy ===
              'connect'
            }
          />
        </div>
      </header>

      <main className="shell">
        <section className="hero">
          <span className="eyebrow">
            GENLAYER / INTELLIGENT CONTRACT
          </span>

          <h1>
            Prove contribution.
            <br />

            <em>
              Let consensus decide.
            </em>
          </h1>

          <p>
            Campaign creators define qualitative eligibility criteria and fund rewards.
            Applicants provide public proof and evidence.
            GenLayer validators adjudicate the contribution before funds can be claimed.
          </p>
        </section>

        {!contractConfigured && (
          <div className="notice error">
            Contract address is not configured.
          </div>
        )}

        {notice && (
          <div
            className={`notice ${noticeKind}`}
          >
            {notice}
          </div>
        )}

        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="step">
                01 / CAMPAIGN
              </span>

              <h2>
                Load campaign
              </h2>
            </div>

            {campaign && (
              <StatusPill
                status={
                  campaign.active
                    ? 'ACTIVE'
                    : 'PAUSED'
                }
              />
            )}
          </div>

          <div className="inline-form">
            <input
              value={campaignId}
              onChange={(
                event,
              ) =>
                setCampaignId(
                  event.target
                    .value,
                )
              }
              placeholder="Enter campaign ID"
            />

            <button
              onClick={
                handleLoadCampaign
              }
              disabled={
                busy !== ''
              }
            >
              {busy ===
              'load'
                ? 'LOADING…'
                : 'LOAD'}
            </button>
          </div>

          {campaign && (
            <>
              <div className="campaign-grid">
                <div>
                  <span>
                    CAMPAIGN
                  </span>

                  <strong>
                    {
                      campaign.name
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    REWARD
                  </span>

                  <strong>
                    {formatWei(
                      campaign.rewardWei,
                    )}{' '}
                    GEN
                  </strong>
                </div>

                <div>
                  <span>
                    POOL
                  </span>

                  <strong>
                    {formatWei(
                      campaign.poolWei,
                    )}{' '}
                    GEN
                  </strong>
                </div>

                <div>
                  <span>
                    RESERVED
                  </span>

                  <strong>
                    {formatWei(
                      campaign.reservedWei,
                    )}{' '}
                    GEN
                  </strong>
                </div>

                <div>
                  <span>
                    AVAILABLE
                  </span>

                  <strong>
                    {formatWei(
                      campaign.availableWei,
                    )}{' '}
                    GEN
                  </strong>
                </div>

                <div>
                  <span>
                    CREATOR
                  </span>

                  <strong>
                    {short(
                      campaign.creator,
                    )}
                  </strong>
                </div>
              </div>

              <div className="criteria-box">
                <span>
                  ELIGIBILITY CRITERIA
                </span>

                <p>
                  {
                    campaign.criteria
                  }
                </p>
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="step">
                02 / CREATE
              </span>

              <h2>
                Create reward campaign
              </h2>
            </div>
          </div>

          <form
            onSubmit={
              createCampaign
            }
            className="form-grid"
          >
            <label>
              <span>
                CAMPAIGN ID
              </span>

              <input
                value={
                  createId
                }
                onChange={(
                  event,
                ) =>
                  setCreateId(
                    event.target
                      .value,
                  )
                }
                placeholder="genlayer-builders"
              />
            </label>

            <label>
              <span>
                CAMPAIGN NAME
              </span>

              <input
                value={
                  createName
                }
                onChange={(
                  event,
                ) =>
                  setCreateName(
                    event.target
                      .value,
                  )
                }
                placeholder="GenLayer Builders"
              />
            </label>

            <label>
              <span>
                REWARD / GEN
              </span>

              <input
                value={
                  createReward
                }
                onChange={(
                  event,
                ) =>
                  setCreateReward(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label className="wide">
              <span>
                ELIGIBILITY CRITERIA
              </span>

              <textarea
                rows={4}
                value={
                  createCriteria
                }
                onChange={(
                  event,
                ) =>
                  setCreateCriteria(
                    event.target
                      .value,
                  )
                }
                placeholder="Applicant must provide verifiable evidence of..."
              />
            </label>

            <button
              type="submit"
              disabled={
                busy !== '' ||
                !account
              }
            >
              {busy ===
              'create'
                ? 'CREATING / VERIFYING…'
                : 'CREATE CAMPAIGN'}
            </button>
          </form>
        </section>

        {campaign && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="step">
                  03 / FUND
                </span>

                <h2>
                  Campaign reward pool
                </h2>
              </div>
            </div>

            <form
              onSubmit={
                fundCampaign
              }
              className="inline-form"
            >
              <input
                value={
                  fundAmount
                }
                onChange={(
                  event,
                ) =>
                  setFundAmount(
                    event.target
                      .value,
                  )
                }
                placeholder="GEN amount"
              />

              <button
                type="submit"
                disabled={
                  busy !== '' ||
                  !account ||
                  !owner
                }
              >
                {busy ===
                'fund'
                  ? 'FUNDING / VERIFYING…'
                  : 'FUND CAMPAIGN'}
              </button>
            </form>

            {owner && (
              <button
                className="secondary"
                onClick={
                  toggleCampaign
                }
                disabled={
                  busy !== ''
                }
              >
                {campaign.active
                  ? 'PAUSE CAMPAIGN'
                  : 'ACTIVATE CAMPAIGN'}
              </button>
            )}
          </section>
        )}

        {campaign && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="step">
                  04 / PROOF
                </span>

                <h2>
                  Submit contribution
                </h2>
              </div>
            </div>

            <div className="proof-marker">
              <span>
                REQUIRED PROOF MARKER
              </span>

              <code>
                {requiredMarker ||
                  'Connect applicant wallet to generate marker'}
              </code>

              <button
                type="button"
                onClick={
                  copyMarker
                }
                disabled={
                  !account
                }
              >
                COPY MARKER
              </button>
            </div>

            {owner && (
              <div className="notice info">
                Campaign creator cannot submit an application.
                Switch to an applicant wallet.
              </div>
            )}

            <form
              onSubmit={
                submitApplication
              }
              className="form-grid"
            >
              <label className="wide">
                <span>
                  CONTRIBUTION DESCRIPTION
                </span>

                <textarea
                  rows={5}
                  value={
                    description
                  }
                  onChange={(
                    event,
                  ) =>
                    setDescription(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Describe the concrete implemented work..."
                />
              </label>

              <label className="wide">
                <span>
                  AUTHORSHIP / PROOF URL
                </span>

                <input
                  value={
                    proofUrl
                  }
                  onChange={(
                    event,
                  ) =>
                    setProofUrl(
                      event.target
                        .value,
                    )
                  }
                  placeholder="https://..."
                />
              </label>

              <label className="wide">
                <span>
                  CONTRIBUTION EVIDENCE URL
                </span>

                <input
                  value={
                    evidenceUrl
                  }
                  onChange={(
                    event,
                  ) =>
                    setEvidenceUrl(
                      event.target
                        .value,
                    )
                  }
                  placeholder="https://..."
                />
              </label>

              <button
                type="submit"
                disabled={
                  busy !== '' ||
                  !account ||
                  owner ||
                  !campaign.active
                }
              >
                {busy ===
                'submit'
                  ? 'SUBMITTING / VERIFYING…'
                  : 'SUBMIT EVIDENCE'}
              </button>
            </form>
          </section>
        )}

        {campaign && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="step">
                  05 / ADJUDICATION
                </span>

                <h2>
                  AI review & settlement
                </h2>
              </div>
            </div>

            <div className="inline-form">
              <input
                value={
                  lookupWallet
                }
                onChange={(
                  event,
                ) =>
                  setLookupWallet(
                    event.target
                      .value,
                  )
                }
                placeholder="0x applicant wallet"
              />

              <button
                onClick={
                  handleLoadApplication
                }
                disabled={
                  busy !== ''
                }
              >
                LOAD APPLICATION
              </button>
            </div>

            {application && (
              <div className="application">
                <div className="application-head">
                  <div>
                    <span>
                      APPLICANT
                    </span>

                    <strong>
                      {short(
                        application.applicant,
                        10,
                        8,
                      )}
                    </strong>
                  </div>

                  <StatusPill
                    status={
                      application.status
                    }
                  />
                </div>

                <div className="application-grid">
                  <div>
                    <span>
                      DESCRIPTION
                    </span>

                    <p>
                      {
                        application.description
                      }
                    </p>
                  </div>

                  <div>
                    <span>
                      PROOF
                    </span>

                    <a
                      href={
                        application.proofUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {
                        application.proofUrl
                      }
                    </a>
                  </div>

                  <div>
                    <span>
                      EVIDENCE
                    </span>

                    <a
                      href={
                        application.evidenceUrl
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {
                        application.evidenceUrl
                      }
                    </a>
                  </div>
                </div>

                {application.reason && (
                  <div className="result-box">
                    <span>
                      CONSENSUS REASON
                    </span>

                    <p>
                      {
                        application.reason
                      }
                    </p>
                  </div>
                )}

                {application.reviewedSnapshot && (
                  <div className="result-box">
                    <span>
                      REVIEWED SNAPSHOT
                    </span>

                    <p>
                      {
                        application.reviewedSnapshot
                      }
                    </p>
                  </div>
                )}

                <div className="settlement-box">
                  <div>
                    <span>
                      RESERVED / CLAIMABLE
                    </span>

                    <strong>
                      {pendingGen}{' '}
                      GEN
                    </strong>
                  </div>

                  {application.status ===
                    'PENDING' && (
                    <button
                      onClick={
                        judgeApplication
                      }
                      disabled={
                        busy !== ''
                      }
                    >
                      {busy ===
                      'judge'
                        ? 'VALIDATORS RUNNING…'
                        : 'RUN GENLAYER ADJUDICATION'}
                    </button>
                  )}

                  {BigInt(
                    application.pendingWei ||
                      '0',
                  ) >
                    0n && (
                    <button
                      onClick={
                        withdraw
                      }
                      disabled={
                        busy !== '' ||
                        account.toLowerCase() !==
                          application.applicant.toLowerCase()
                      }
                    >
                      {busy ===
                      'withdraw'
                        ? 'CLAIMING / VERIFYING…'
                        : `CLAIM ${pendingGen} GEN`}
                    </button>
                  )}

                  {application.status ===
                    'ELIGIBLE_PAID' && (
                    <div className="paid">
                      ✓ REWARD CLAIMED
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <footer>
        <span>
          AIRJUDGE V3 / GENLAYER STUDIONET
        </span>

        <span>
          {contractConfigured
            ? short(
                CONTRACT_ADDRESS,
                10,
                8,
              )
            : 'CONTRACT NOT CONFIGURED'}
        </span>
      </footer>
    </div>
  )
}

export default App
