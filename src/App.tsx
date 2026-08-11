import { FormEvent, useMemo, useState } from 'react'
import {
  BadgeCheck,
  BrainCircuit,
  CircleDollarSign,
  Copy,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  LoaderCircle,
  Search,
  ShieldCheck,
} from 'lucide-react'
import WalletButton from './components/WalletButton'
import StatusPill from './components/StatusPill'
import { CONTRACT_ADDRESS, EXPLORER_BASE } from './lib/config'
import {
  airJudge,
  connectWallet,
  formatWei,
  normalizeAddress,
  parseGenToWei,
  pollApplicationStatus,
  type CampaignPool,
} from './lib/genlayer'
import './styles.css'

type Notice = {
  kind: 'info' | 'success' | 'error'
  message: string
  tx?: string
} | null

type Campaign = {
  id: string
  name: string
  criteria: string
  creator: string
  rewardWei: string
  active: boolean
  pool: CampaignPool
}

type Application = {
  applicant: string
  status: string
  description: string
  proofUrl: string
  evidenceUrl: string
  reason: string
  snapshot: string
  pendingWei: string
}

const short = (value: string, head = 7, tail = 5) =>
  value && value.length > head + tail + 3
    ? `${value.slice(0, head)}…${value.slice(-tail)}`
    : value

export default function App() {
  const [account, setAccount] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState<Notice>(null)

  const [campaignId, setCampaignId] = useState('airjudge-v3-final')
  const [campaign, setCampaign] = useState<Campaign | null>(null)

  const [createForm, setCreateForm] = useState({
    id: '',
    name: '',
    criteria: '',
    rewardGen: '5',
  })

  const [fundGen, setFundGen] = useState('10')

  const [proofMarker, setProofMarker] = useState('')
  const [submitForm, setSubmitForm] = useState({
    description: '',
    proofUrl: '',
    evidenceUrl: '',
  })

  const [lookupApplicant, setLookupApplicant] = useState('')
  const [application, setApplication] = useState<Application | null>(null)

  const explorer = `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`

  const isCreator = useMemo(
    () =>
      Boolean(
        account &&
          campaign?.creator &&
          account.toLowerCase() === campaign.creator.toLowerCase(),
      ),
    [account, campaign],
  )

  async function run(name: string, task: () => Promise<void>) {
    setBusy(name)
    setNotice(null)
    try {
      await task()
    } catch (error) {
      setNotice({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unexpected error.',
      })
    } finally {
      setBusy('')
    }
  }

  async function connect() {
    await run('connect', async () => {
      const address = await connectWallet()
      setAccount(address)
      setLookupApplicant(address)
      setNotice({ kind: 'success', message: 'Wallet connected to GenLayer Studionet.' })
    })
  }

  async function loadCampaign(idOverride?: string) {
    const id = (idOverride ?? campaignId).trim()
    if (!id) throw new Error('Enter a campaign ID.')

    const [name, criteria, creator, rewardWei, active, pool] = await Promise.all([
      airJudge.getCampaignName(id),
      airJudge.getCampaignCriteria(id),
      airJudge.getCampaignCreator(id),
      airJudge.getCampaignReward(id),
      airJudge.isCampaignActive(id),
      airJudge.getCampaignPoolStatus(id),
    ])

    if (!name) throw new Error('Campaign not found.')

    setCampaign({
      id,
      name,
      criteria,
      creator,
      rewardWei,
      active,
      pool,
    })
    setCampaignId(id)

    if (account) {
      setProofMarker(await airJudge.getRequiredProofMarker(id, account))
    }
  }

  async function createCampaign(event: FormEvent) {
    event.preventDefault()
    await run('create', async () => {
      if (!account) throw new Error('Connect creator wallet first.')

      await airJudge.createCampaign(
        account,
        createForm.id.trim(),
        createForm.name.trim(),
        createForm.criteria.trim(),
        parseGenToWei(createForm.rewardGen),
      )

      await loadCampaign(createForm.id.trim())
      setNotice({ kind: 'success', message: 'Campaign created onchain.' })
    })
  }

  async function fundCampaign(event: FormEvent) {
    event.preventDefault()
    await run('fund', async () => {
      if (!account || !campaign) throw new Error('Load a campaign first.')
      if (!isCreator) throw new Error('Only the campaign creator can fund it.')

      await airJudge.fundCampaign(
        account,
        campaign.id,
        parseGenToWei(fundGen),
      )

      await loadCampaign(campaign.id)
      setNotice({ kind: 'success', message: 'Campaign funded.' })
    })
  }

  async function refreshMarker() {
    await run('marker', async () => {
      if (!account || !campaign) throw new Error('Connect wallet and load campaign first.')
      const marker = await airJudge.getRequiredProofMarker(campaign.id, account)
      setProofMarker(marker)
    })
  }

  async function submitApplication(event: FormEvent) {
    event.preventDefault()
    await run('submit', async () => {
      if (!account || !campaign) throw new Error('Connect wallet and load campaign first.')
      if (isCreator) throw new Error('Campaign creator cannot apply.')

      const used = await airJudge.isEvidenceUsed(
        campaign.id,
        submitForm.evidenceUrl,
      )
      if (used) throw new Error('This evidence URL is already used in this campaign.')

      const { hash } = await airJudge.submitApplication(
        account,
        campaign.id,
        submitForm.description,
        submitForm.proofUrl,
        submitForm.evidenceUrl,
      )

      setLookupApplicant(account)
      await loadApplication(account)
      setNotice({
        kind: 'success',
        message: 'Application submitted. It is ready for GenLayer adjudication.',
        tx: hash,
      })
    })
  }

  async function loadApplication(applicantOverride?: string) {
    if (!campaign) throw new Error('Load campaign first.')

    const applicant = normalizeAddress(
      (applicantOverride ?? lookupApplicant).trim(),
    )

    const [
      status,
      description,
      proofUrl,
      evidenceUrl,
      reason,
      snapshot,
      pendingWei,
    ] = await Promise.all([
      airJudge.getApplicationStatus(campaign.id, applicant),
      airJudge.getApplicationDescription(campaign.id, applicant),
      airJudge.getApplicationProofUrl(campaign.id, applicant),
      airJudge.getApplicationEvidence(campaign.id, applicant),
      airJudge.getApplicationReason(campaign.id, applicant),
      airJudge.getReviewedSnapshot(campaign.id, applicant),
      airJudge.getPendingPayout(campaign.id, applicant),
    ])

    if (!status) throw new Error('Application not found.')

    setLookupApplicant(applicant)
    setApplication({
      applicant,
      status: String(status),
      description: String(description),
      proofUrl: String(proofUrl),
      evidenceUrl: String(evidenceUrl),
      reason: String(reason),
      snapshot: String(snapshot),
      pendingWei: String(pendingWei),
    })
  }

  async function judge() {
    await run('judge', async () => {
      if (!account || !campaign || !application) {
        throw new Error('Load an application first.')
      }
      if (application.status !== 'PENDING') {
        throw new Error('This application has already been adjudicated.')
      }

      const { hash } = await airJudge.judgeApplication(
        account,
        campaign.id,
        application.applicant,
      )

      setNotice({
        kind: 'info',
        message: 'Validators are reviewing proof provenance and the committed evidence snapshot…',
        tx: hash,
      })

      await pollApplicationStatus(campaign.id, application.applicant)
      await loadApplication(application.applicant)
      await loadCampaign(campaign.id)

      setNotice({
        kind: 'success',
        message: 'GenLayer adjudication finished.',
        tx: hash,
      })
    })
  }

  async function withdraw() {
    await run('withdraw', async () => {
      if (!account || !campaign || !application) throw new Error('Load application first.')
      if (account.toLowerCase() !== application.applicant.toLowerCase()) {
        throw new Error('Connect the applicant wallet to claim this reward.')
      }

      const { hash } = await airJudge.withdraw(account, campaign.id)
      await loadApplication(account)
      await loadCampaign(campaign.id)

      setNotice({
        kind: 'success',
        message: 'Reserved GEN reward withdrawn successfully.',
        tx: hash,
      })
    })
  }

  async function toggleCampaign() {
    await run('toggle', async () => {
      if (!account || !campaign || !isCreator) {
        throw new Error('Campaign creator wallet required.')
      }

      await airJudge.setCampaignActive(account, campaign.id, !campaign.active)
      await loadCampaign(campaign.id)
    })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">AJ</div>
          <div>
            <strong>AirJudge V3</strong>
            <span>Contribution rewards with verified provenance</span>
          </div>
        </div>

        <div className="top-actions">
          <a href={explorer} target="_blank" rel="noreferrer" className="contract-link">
            Contract {short(CONTRACT_ADDRESS)} <ExternalLink size={14} />
          </a>
          <WalletButton
            account={account}
            busy={busy === 'connect'}
            onConnect={connect}
          />
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><ShieldCheck size={16} /> AIRJUDGE / GENLAYER</div>
          <h1>Verify the work.<br /><em>Reward the contributor.</em></h1>
          <p>
            V3 separates wallet-control proof from contribution evidence, commits
            the exact validator-reviewed snapshot onchain, and connects an
            ELIGIBLE verdict to a reserved native GEN reward.
          </p>

          <div className="flow-row">
            <span><Fingerprint size={16} /> Control proof</span>
            <span><FileCheck2 size={16} /> Evidence snapshot</span>
            <span><BrainCircuit size={16} /> AI consensus</span>
            <span><CircleDollarSign size={16} /> Reserve + claim</span>
          </div>
        </section>

        {notice && (
          <div className={`notice ${notice.kind}`}>
            <span>{notice.message}</span>
            {notice.tx && (
              <a
                href={`${EXPLORER_BASE}/tx/${notice.tx}`}
                target="_blank"
                rel="noreferrer"
              >
                {short(notice.tx)} ↗
              </a>
            )}
          </div>
        )}

        <section className="workspace-grid">
          <div className="panel">
            <div className="panel-head">
              <div>
                <span className="step">01 / CAMPAIGN</span>
                <h2>Create reward campaign</h2>
              </div>
              <CircleDollarSign />
            </div>

            <form onSubmit={createCampaign} className="form-stack">
              <label>
                Campaign ID
                <input
                  value={createForm.id}
                  onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
                  placeholder="airjudge-v3-campaign"
                />
              </label>
              <label>
                Name
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Contributor Reward Program"
                />
              </label>
              <label>
                Eligibility criteria
                <textarea
                  rows={5}
                  value={createForm.criteria}
                  onChange={(e) => setCreateForm({ ...createForm, criteria: e.target.value })}
                  placeholder="Describe what concrete public evidence must demonstrate…"
                />
              </label>
              <label>
                Reward / GEN
                <input
                  value={createForm.rewardGen}
                  onChange={(e) => setCreateForm({ ...createForm, rewardGen: e.target.value })}
                />
              </label>
              <button disabled={busy !== '' || !account}>
                {busy === 'create' ? 'CREATING…' : 'CREATE CAMPAIGN'}
              </button>
            </form>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <span className="step">02 / LOAD</span>
                <h2>Campaign state</h2>
              </div>
              <Search />
            </div>

            <div className="search-row">
              <input
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                placeholder="campaign-id"
              />
              <button
                type="button"
                onClick={() => run('load', () => loadCampaign())}
                disabled={busy !== ''}
              >
                LOAD
              </button>
            </div>

            {campaign ? (
              <div className="campaign-card">
                <div className="campaign-title">
                  <div>
                    <h3>{campaign.name}</h3>
                    <small>{campaign.id}</small>
                  </div>
                  <StatusPill status={campaign.active ? 'ACTIVE' : 'PAUSED'} />
                </div>

                <p className="criteria">{campaign.criteria}</p>

                <div className="stats">
                  <div><span>REWARD</span><strong>{formatWei(campaign.rewardWei)} GEN</strong></div>
                  <div><span>POOL</span><strong>{formatWei(campaign.pool.pool_wei)} GEN</strong></div>
                  <div><span>RESERVED</span><strong>{formatWei(campaign.pool.reserved_wei)} GEN</strong></div>
                  <div><span>AVAILABLE</span><strong>{formatWei(campaign.pool.available_wei)} GEN</strong></div>
                </div>

                <div className="creator-line">
                  Creator <code>{short(campaign.creator)}</code>
                </div>

                {isCreator && (
                  <>
                    <form onSubmit={fundCampaign} className="fund-row">
                      <input
                        value={fundGen}
                        onChange={(e) => setFundGen(e.target.value)}
                        placeholder="GEN"
                      />
                      <button disabled={busy !== ''}>
                        {busy === 'fund' ? 'FUNDING…' : 'FUND CAMPAIGN'}
                      </button>
                    </form>

                    <button className="secondary" onClick={toggleCampaign} disabled={busy !== ''}>
                      {campaign.active ? 'PAUSE CAMPAIGN' : 'ACTIVATE CAMPAIGN'}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="empty">Load a campaign to inspect its reward and liquidity.</div>
            )}
          </div>
        </section>

        {campaign && (
          <section className="workspace-grid">
            <div className="panel">
              <div className="panel-head">
                <div>
                  <span className="step">03 / PROVENANCE</span>
                  <h2>Bind wallet to evidence</h2>
                </div>
                <Fingerprint />
              </div>

              {!account ? (
                <div className="empty">Connect the applicant wallet first.</div>
              ) : isCreator ? (
                <div className="warning-box">Campaign creator cannot apply.</div>
              ) : (
                <>
                  <p className="muted">
                    Publish this campaign-specific wallet marker on a public proof
                    page together with the exact <code>EVIDENCE_URL:</code> line.
                  </p>

                  <button className="secondary" onClick={refreshMarker} disabled={busy !== ''}>
                    {busy === 'marker' ? 'LOADING…' : 'GET PROOF MARKER'}
                  </button>

                  {proofMarker && (
                    <div className="proof-box">
                      <code>{proofMarker}</code>
                      <button
                        type="button"
                        className="copy"
                        onClick={() => navigator.clipboard.writeText(proofMarker)}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  )}

                  <form onSubmit={submitApplication} className="form-stack top-gap">
                    <label>
                      Contribution description
                      <textarea
                        rows={5}
                        value={submitForm.description}
                        onChange={(e) =>
                          setSubmitForm({ ...submitForm, description: e.target.value })
                        }
                        placeholder="Describe the concrete implemented work…"
                      />
                    </label>
                    <label>
                      Proof URL
                      <input
                        value={submitForm.proofUrl}
                        onChange={(e) =>
                          setSubmitForm({ ...submitForm, proofUrl: e.target.value })
                        }
                        placeholder="https://pastebin.com/..."
                      />
                      <small>Must contain the marker and EVIDENCE_URL:&lt;exact URL&gt;.</small>
                    </label>
                    <label>
                      Contribution evidence URL
                      <input
                        value={submitForm.evidenceUrl}
                        onChange={(e) =>
                          setSubmitForm({ ...submitForm, evidenceUrl: e.target.value })
                        }
                        placeholder="https://github.com/owner/repo"
                      />
                      <small>Use the real public work, not a self-assertion page.</small>
                    </label>
                    <button disabled={busy !== '' || !account || isCreator}>
                      {busy === 'submit' ? 'SUBMITTING…' : 'SUBMIT APPLICATION'}
                    </button>
                  </form>
                </>
              )}
            </div>

            <div className="panel">
              <div className="panel-head">
                <div>
                  <span className="step">04 / ADJUDICATION</span>
                  <h2>Review & settlement</h2>
                </div>
                <BrainCircuit />
              </div>

              <div className="search-row">
                <input
                  value={lookupApplicant}
                  onChange={(e) => setLookupApplicant(e.target.value)}
                  placeholder="0x applicant wallet"
                />
                <button
                  type="button"
                  onClick={() => run('lookup', () => loadApplication())}
                  disabled={busy !== ''}
                >
                  LOAD
                </button>
              </div>

              {!application ? (
                <div className="empty">Load an applicant to inspect its onchain state.</div>
              ) : (
                <div className="application-card">
                  <div className="campaign-title">
                    <div>
                      <small>APPLICANT</small>
                      <h3>{short(application.applicant, 9, 7)}</h3>
                    </div>
                    <StatusPill status={application.status} />
                  </div>

                  <div className="detail-block">
                    <span>CLAIM</span>
                    <p>{application.description}</p>
                  </div>

                  <div className="link-grid">
                    <a href={application.proofUrl} target="_blank" rel="noreferrer">
                      Proof page <ExternalLink size={13} />
                    </a>
                    <a href={application.evidenceUrl} target="_blank" rel="noreferrer">
                      Contribution evidence <ExternalLink size={13} />
                    </a>
                  </div>

                  {application.reason && (
                    <div className="reason-box">
                      <BadgeCheck size={18} />
                      <div>
                        <span>CONSENSUS REASON</span>
                        <p>{application.reason}</p>
                      </div>
                    </div>
                  )}

                  {application.snapshot && (
                    <details className="snapshot">
                      <summary>Reviewed evidence snapshot</summary>
                      <pre>{application.snapshot}</pre>
                    </details>
                  )}

                  <div className="payout-box">
                    <span>PENDING REWARD</span>
                    <strong>{formatWei(application.pendingWei)} GEN</strong>
                  </div>

                  {application.status === 'PENDING' && (
                    <button className="judge-btn" onClick={judge} disabled={busy !== ''}>
                      {busy === 'judge' ? (
                        <><LoaderCircle className="spin" size={17} /> VALIDATORS RUNNING…</>
                      ) : (
                        <><BrainCircuit size={17} /> RUN GENLAYER ADJUDICATION</>
                      )}
                    </button>
                  )}

                  {BigInt(application.pendingWei || '0') > 0n && (
                    <button className="claim-btn" onClick={withdraw} disabled={busy !== ''}>
                      {busy === 'withdraw'
                        ? 'PROCESSING…'
                        : `CLAIM ${formatWei(application.pendingWei)} GEN`}
                    </button>
                  )}

                  {application.status === 'ELIGIBLE_PAID' && (
                    <div className="paid-banner">✓ REWARD PAID</div>
                  )}

                  {application.status === 'ELIGIBLE_UNDERFUNDED' && (
                    <div className="warning-box">
                      ELIGIBLE / CAMPAIGN POOL UNDERFUNDED
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer>
        <span>AIRJUDGE V3 / GENLAYER STUDIONET</span>
        <span>{short(CONTRACT_ADDRESS, 10, 8)}</span>
      </footer>
    </div>
  )
}
