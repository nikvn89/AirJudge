import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
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
  value && value.length > head + tail + 3
    ? `${value.slice(0, head)}…${value.slice(-tail)}`
    : value

const contractConfigured =
  Boolean(CONTRACT_ADDRESS) &&
  /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS)

function App() {
  const [account, setAccount] = useState('')
  const [busy, setBusy] = useState<Busy>('')

  const [notice, setNotice] = useState('')
  const [noticeKind, setNoticeKind] =
    useState<'info' | 'success' | 'error'>('info')

  const [campaignId, setCampaignId] =
    useState('airjudge-v3-final')

  const [campaign, setCampaign] =
    useState<Campaign | null>(null)

  const [createId, setCreateId] = useState('')
  const [createName, setCreateName] = useState('')
  const [createCriteria, setCreateCriteria] =
    useState('')
  const [createReward, setCreateReward] =
    useState('5')

  const [fundAmount, setFundAmount] =
    useState('10')

  const [description, setDescription] =
    useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [evidenceUrl, setEvidenceUrl] =
    useState('')

  const [lookupWallet, setLookupWallet] =
    useState('')
  const [application, setApplication] =
    useState<Application | null>(null)

  const explorerAddress = contractConfigured
    ? `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`
    : '#'

  const owner = useMemo(() => {
    if (!account || !campaign?.creator) {
      return false
    }

    return (
      account.toLowerCase() ===
      campaign.creator.toLowerCase()
    )
  }, [account, campaign])

  const run = async (
    action: Busy,
    task: () => Promise<void>,
  ) => {
    try {
      setBusy(action)
      setNotice('')
      await task()
    } catch (error) {
      setNoticeKind('error')
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
    run('connect', async () => {
      if (!contractConfigured) {
        throw new Error(
          'Contract address is not configured.',
        )
      }

      const address = await connectWallet()

      setAccount(address)
      setLookupWallet(address)

      setNoticeKind('success')
      setNotice(
        `Wallet connected: ${short(address)}`,
      )
    })

  const loadCampaign = useCallback(
    async (idOverride?: string) => {
      const id = (
        idOverride ?? campaignId
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
      ] = await Promise.all([
        airJudge.getCampaignName(id),
        airJudge.getCampaignCriteria(id),
        airJudge.getCampaignCreator(id),
        airJudge.getCampaignReward(id),
        airJudge.isCampaignActive(id),
        airJudge.getCampaignPoolStatus(id),
      ])

      if (!String(name).trim()) {
        throw new Error(
          'Campaign not found.',
        )
      }

      setCampaignId(id)

      setCampaign({
        id,
        name: String(name),
        criteria: String(criteria),
        creator: String(creator),
        rewardWei: String(rewardWei),
        active: Boolean(active),
        poolWei: pool.pool_wei,
        reservedWei: pool.reserved_wei,
        availableWei: pool.available_wei,
      })
    },
    [campaignId],
  )

  useEffect(() => {
    if (!contractConfigured) {
      return
    }

    void loadCampaign('airjudge-v3-final').catch(
      () => {
        // Campaign may not exist on another deployment.
      },
    )
  }, [])

  const handleLoadCampaign = () =>
    run('load', async () => {
      await loadCampaign()

      setNoticeKind('success')
      setNotice('Campaign state loaded.')
    })

  const createCampaign = (
    event: FormEvent,
  ) => {
    event.preventDefault()

    return run('create', async () => {
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
        parseGenToWei(createReward)

      if (rewardWei <= 0n) {
        throw new Error(
          'Reward must be greater than zero.',
        )
      }

      await airJudge.createCampaign(
        account,
        createId.trim(),
        createName.trim(),
        createCriteria.trim(),
        rewardWei,
      )

      setCampaignId(createId.trim())

      await loadCampaign(
        createId.trim(),
      )

      setNoticeKind('success')
      setNotice(
        'Campaign created onchain.',
      )
    })
  }

  const fundCampaign = (
    event: FormEvent,
  ) => {
    event.preventDefault()

    return run('fund', async () => {
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

      const amountWei =
        parseGenToWei(fundAmount)

      if (amountWei <= 0n) {
        throw new Error(
          'Funding amount must be greater than zero.',
        )
      }

      await airJudge.fundCampaign(
        account,
        campaign.id,
        amountWei,
      )

      await loadCampaign(campaign.id)

      setNoticeKind('success')
      setNotice(
        `${fundAmount} GEN added to campaign pool.`,
      )
    })
  }

  const toggleCampaign = () =>
    run('toggle', async () => {
      if (!account || !campaign) {
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

      await loadCampaign(campaign.id)

      setNoticeKind('success')
      setNotice(
        campaign.active
          ? 'Campaign paused.'
          : 'Campaign activated.',
      )
    })

  const requiredMarker =
    useMemo(() => {
      if (!campaign || !account) {
        return ''
      }

      return `AIRJUDGE_PROOF:${campaign.id}:${account.toLowerCase()}`
    }, [campaign, account])

  const loadRequiredMarker =
    async () => {
      if (!campaign || !account) {
        return
      }

      try {
        const marker =
          await airJudge.getRequiredProofMarker(
            campaign.id,
            account,
          )

        if (marker) {
          return String(marker)
        }
      } catch {
        // UI fallback below matches contract marker format.
      }

      return requiredMarker
    }

  const submitApplication = (
    event: FormEvent,
  ) => {
    event.preventDefault()

    return run('submit', async () => {
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

      if (!campaign.active) {
        throw new Error(
          'Campaign is not active.',
        )
      }

      if (
        description.trim().length < 10
      ) {
        throw new Error(
          'Add a meaningful contribution description.',
        )
      }

      if (
        !proofUrl.startsWith('https://')
      ) {
        throw new Error(
          'Proof URL must be a public HTTPS URL.',
        )
      }

      if (
        !evidenceUrl.startsWith('https://')
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

      await airJudge.submitApplication(
        account,
        campaign.id,
        description.trim(),
        proofUrl.trim(),
        evidenceUrl.trim(),
      )

      setLookupWallet(account)

      await loadApplication(account)

      setNoticeKind('success')
      setNotice(
        'Application submitted. Ready for GenLayer adjudication.',
      )
    })
  }

  const loadApplication = async (
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
      normalizeAddress(wallet)

    const [
      status,
      applicationDescription,
      applicationProofUrl,
      applicationEvidence,
      reason,
      reviewedSnapshot,
      pendingWei,
    ] = await Promise.all([
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

    if (!String(status).trim()) {
      throw new Error(
        'No application found for this wallet.',
      )
    }

    setLookupWallet(applicant)

    setApplication({
      applicant,
      status: String(status),
      description:
        String(applicationDescription),
      proofUrl:
        String(applicationProofUrl),
      evidenceUrl:
        String(applicationEvidence),
      reason: String(reason),
      reviewedSnapshot:
        String(reviewedSnapshot),
      pendingWei:
        String(pendingWei),
    })
  }

  const handleLoadApplication = () =>
    run('load', async () => {
      await loadApplication()

      setNoticeKind('success')
      setNotice(
        'Application loaded.',
      )
    })

  const judgeApplication = () =>
    run('judge', async () => {
      if (
        !account ||
        !campaign ||
        !application
      ) {
        throw new Error(
          'Load an application first.',
        )
      }

      const { hash } =
        await airJudge.judgeApplication(
          account,
          campaign.id,
          application.applicant,
        )

      setNoticeKind('info')
      setNotice(
        `Adjudication submitted (${short(
          String(hash),
        )}). Waiting for validator consensus...`,
      )

      const status =
        await pollApplicationStatus(
          campaign.id,
          application.applicant,
        )

      await loadApplication(
        application.applicant,
      )

      await loadCampaign(
        campaign.id,
      )

      setNoticeKind('success')
      setNotice(
        `Consensus reached: ${status}`,
      )
    })

  const withdraw = () =>
    run('withdraw', async () => {
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
          application.pendingWei || '0',
        ) <= 0n
      ) {
        throw new Error(
          'No reserved payout is available.',
        )
      }

      await airJudge.withdraw(
        account,
        campaign.id,
      )

      await loadApplication(
        application.applicant,
      )

      await loadCampaign(
        campaign.id,
      )

      setNoticeKind('success')
      setNotice(
        'Reward withdrawn successfully.',
      )
    })

  const copyMarker = async () => {
    const marker =
      await loadRequiredMarker()

    if (!marker) {
      setNoticeKind('error')
      setNotice(
        'Connect wallet and load campaign first.',
      )
      return
    }

    await navigator.clipboard.writeText(
      marker,
    )

    setNoticeKind('success')
    setNotice(
      'Proof marker copied.',
    )
  }

  const pendingGen = application
    ? formatWei(application.pendingWei)
    : '0'

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            AJ
          </div>

          <div>
            <strong>AirJudge</strong>
            <span>
              GenLayer contribution adjudication
            </span>
          </div>
        </div>

        <div className="top-actions">
          <a
            href={explorerAddress}
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
            busy={busy === 'connect'}
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
            Campaign creators define
            qualitative eligibility criteria
            and fund rewards. Applicants
            provide public proof and evidence.
            GenLayer validators adjudicate the
            contribution before funds can be
            claimed.
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
              onChange={(event) =>
                setCampaignId(
                  event.target.value,
                )
              }
              placeholder="campaign-id"
            />

            <button
              onClick={
                handleLoadCampaign
              }
              disabled={busy !== ''}
            >
              {busy === 'load'
                ? 'LOADING…'
                : 'LOAD'}
            </button>
          </div>

          {campaign && (
            <div className="campaign-grid">
              <div>
                <span>CAMPAIGN</span>
                <strong>
                  {campaign.name}
                </strong>
              </div>

              <div>
                <span>REWARD</span>
                <strong>
                  {formatWei(
                    campaign.rewardWei,
                  )}{' '}
                  GEN
                </strong>
              </div>

              <div>
                <span>POOL</span>
                <strong>
                  {formatWei(
                    campaign.poolWei,
                  )}{' '}
                  GEN
                </strong>
              </div>

              <div>
                <span>RESERVED</span>
                <strong>
                  {formatWei(
                    campaign.reservedWei,
                  )}{' '}
                  GEN
                </strong>
              </div>

              <div>
                <span>AVAILABLE</span>
                <strong>
                  {formatWei(
                    campaign.availableWei,
                  )}{' '}
                  GEN
                </strong>
              </div>

              <div>
                <span>CREATOR</span>
                <strong>
                  {short(
                    campaign.creator,
                  )}
                </strong>
              </div>
            </div>
          )}

          {campaign && (
            <div className="criteria-box">
              <span>
                ELIGIBILITY CRITERIA
              </span>
              <p>
                {campaign.criteria}
              </p>
            </div>
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
            onSubmit={createCampaign}
            className="form-grid"
          >
            <label>
              <span>CAMPAIGN ID</span>
              <input
                value={createId}
                onChange={(event) =>
                  setCreateId(
                    event.target.value,
                  )
                }
                placeholder="genlayer-builders"
              />
            </label>

            <label>
              <span>CAMPAIGN NAME</span>
              <input
                value={createName}
                onChange={(event) =>
                  setCreateName(
                    event.target.value,
                  )
                }
                placeholder="GenLayer Builders"
              />
            </label>

            <label>
              <span>REWARD / GEN</span>
              <input
                value={createReward}
                onChange={(event) =>
                  setCreateReward(
                    event.target.value,
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
                value={createCriteria}
                onChange={(event) =>
                  setCreateCriteria(
                    event.target.value,
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
              {busy === 'create'
                ? 'CREATING…'
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
              onSubmit={fundCampaign}
              className="inline-form"
            >
              <input
                value={fundAmount}
                onChange={(event) =>
                  setFundAmount(
                    event.target.value,
                  )
                }
                placeholder="GEN amount"
              />

              <button
                type="submit"
                disabled={
                  busy !== '' ||
                  !account
                }
              >
                {busy === 'fund'
                  ? 'FUNDING…'
                  : 'FUND CAMPAIGN'}
              </button>
            </form>

            {owner && (
              <button
                className="secondary"
                onClick={toggleCampaign}
                disabled={busy !== ''}
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
                  'Connect wallet to generate marker'}
              </code>

              <button
                type="button"
                onClick={copyMarker}
                disabled={!account}
              >
                COPY MARKER
              </button>
            </div>

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
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  placeholder="Describe what you created and why it satisfies the campaign criteria..."
                />
              </label>

              <label className="wide">
                <span>
                  AUTHORSHIP / PROOF URL
                </span>
                <input
                  value={proofUrl}
                  onChange={(event) =>
                    setProofUrl(
                      event.target.value,
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
                  value={evidenceUrl}
                  onChange={(event) =>
                    setEvidenceUrl(
                      event.target.value,
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
                  !campaign.active
                }
              >
                {busy === 'submit'
                  ? 'SUBMITTING…'
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
                value={lookupWallet}
                onChange={(event) =>
                  setLookupWallet(
                    event.target.value,
                  )
                }
                placeholder="0x applicant wallet"
              />

              <button
                onClick={
                  handleLoadApplication
                }
                disabled={busy !== ''}
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
                      {pendingGen} GEN
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
                      {busy === 'judge'
                        ? 'VALIDATORS RUNNING…'
                        : 'RUN GENLAYER ADJUDICATION'}
                    </button>
                  )}

                  {BigInt(
                    application.pendingWei ||
                      '0',
                  ) > 0n && (
                    <button
                      onClick={withdraw}
                      disabled={
                        busy !== '' ||
                        account.toLowerCase() !==
                          application.applicant.toLowerCase()
                      }
                    >
                      {busy ===
                      'withdraw'
                        ? 'CLAIMING…'
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
