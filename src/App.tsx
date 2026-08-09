import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Gavel,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react'
import WalletButton from './components/WalletButton'
import StatusPill from './components/StatusPill'
import { CONTRACT_ADDRESS, EXPLORER_BASE } from './lib/config'
import { connectWallet, contract, normalizeAddress } from './lib/genlayer'
import { getRecentCampaigns, rememberCampaign } from './lib/storage'

type Campaign = {
  id: string
  name: string
  criteria: string
  creator: string
  active: boolean
}

type Application = {
  applicant: string
  description: string
  evidence: string
  status: string
  reason: string
}

type Notice = {
  kind: 'success' | 'error' | 'info'
  message: string
  tx?: string
} | null

const clean = (value: unknown) => String(value ?? '').replace(/^"|"$/g, '')

export default function App() {
  const [account, setAccount] = useState('')
  const [walletBusy, setWalletBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [busy, setBusy] = useState('')
  const [recent, setRecent] = useState<string[]>([])

  const [createForm, setCreateForm] = useState({
    id: '',
    name: '',
    criteria: '',
  })

  const [campaignId, setCampaignId] = useState('')
  const [campaign, setCampaign] = useState<Campaign | null>(null)

  const [submitForm, setSubmitForm] = useState({
    description: '',
    evidence: '',
  })

  const [lookupWallet, setLookupWallet] = useState('')
  const [application, setApplication] = useState<Application | null>(null)

  useEffect(() => setRecent(getRecentCampaigns()), [])

  useEffect(() => {
    if (!window.ethereum?.on) return

    const handler = (accounts: string[]) => {
      if (!accounts?.[0]) {
        setAccount('')
        return
      }
      try {
        setAccount(normalizeAddress(accounts[0]))
      } catch {
        setAccount(accounts[0])
      }
    }

    window.ethereum.on('accountsChanged', handler)
    return () => window.ethereum?.removeListener?.('accountsChanged', handler)
  }, [])

  const explorerContract = `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`

  const canJudge = useMemo(
    () => Boolean(account && campaign && application?.applicant && application.status === 'PENDING'),
    [account, campaign, application],
  )

  async function handleConnect() {
    setWalletBusy(true)
    setNotice(null)
    try {
      const address = await connectWallet()
      setAccount(address)
      setLookupWallet(address)
      setNotice({ kind: 'success', message: 'Wallet connected to GenLayer Studionet.' })
    } catch (e) {
      setNotice({ kind: 'error', message: errorMessage(e) })
    } finally {
      setWalletBusy(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!account) return requireWallet()
    if (!createForm.id.trim() || !createForm.name.trim() || createForm.criteria.trim().length < 20) {
      setNotice({ kind: 'error', message: 'Enter a campaign ID, name, and criteria of at least 20 characters.' })
      return
    }

    setBusy('create')
    setNotice({ kind: 'info', message: 'Creating campaign and waiting for GenLayer acceptance…' })
    try {
      const { hash } = await contract.createCampaign(
        account,
        createForm.id.trim(),
        createForm.name.trim(),
        createForm.criteria.trim(),
      )
      setRecent(rememberCampaign(createForm.id.trim()))
      setCampaignId(createForm.id.trim())
      setNotice({ kind: 'success', message: 'Campaign created onchain.', tx: hash })
      await loadCampaign(createForm.id.trim())
      setCreateForm({ id: '', name: '', criteria: '' })
    } catch (e) {
      setNotice({ kind: 'error', message: errorMessage(e) })
    } finally {
      setBusy('')
    }
  }

  async function loadCampaign(idOverride?: string) {
    const id = (idOverride ?? campaignId).trim()
    if (!id) return

    setBusy('load')
    setNotice(null)
    try {
      const [name, criteria, creator, active] = await Promise.all([
        contract.getCampaignName(id),
        contract.getCampaignCriteria(id),
        contract.getCampaignCreator(id),
        contract.isCampaignActive(id),
      ])

      const parsedName = clean(name)
      if (!parsedName) throw new Error('Campaign not found. Check the campaign ID.')

      const data = {
        id,
        name: parsedName,
        criteria: clean(criteria),
        creator: clean(creator),
        active: Boolean(active),
      }
      setCampaign(data)
      setCampaignId(id)
      setRecent(rememberCampaign(id))
      setApplication(null)
    } catch (e) {
      setCampaign(null)
      setNotice({ kind: 'error', message: errorMessage(e) })
    } finally {
      setBusy('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!account) return requireWallet()
    if (!campaign) {
      setNotice({ kind: 'error', message: 'Load a campaign first.' })
      return
    }
    if (submitForm.description.trim().length < 20) {
      setNotice({ kind: 'error', message: 'Contribution description must be at least 20 characters.' })
      return
    }
    if (!submitForm.evidence.trim().startsWith('https://')) {
      setNotice({ kind: 'error', message: 'Evidence URL must begin with https://.' })
      return
    }

    setBusy('submit')
    setNotice({ kind: 'info', message: 'Submitting contribution evidence onchain…' })
    try {
      const { hash } = await contract.submitApplication(
        account,
        campaign.id,
        submitForm.description.trim(),
        submitForm.evidence.trim(),
      )
      setLookupWallet(account)
      setNotice({ kind: 'success', message: 'Application submitted. Status is now PENDING.', tx: hash })
      await loadApplication(account)
    } catch (e) {
      setNotice({ kind: 'error', message: errorMessage(e) })
    } finally {
      setBusy('')
    }
  }

  async function loadApplication(walletOverride?: string) {
    if (!campaign) {
      setNotice({ kind: 'error', message: 'Load a campaign first.' })
      return
    }

    const applicant = (walletOverride ?? lookupWallet).trim()
    if (!applicant) return

    setBusy('lookup')
    setNotice(null)
    try {
      const address = normalizeAddress(applicant)
      const [status, description, evidence, reason] = await Promise.all([
        contract.getApplicationStatus(campaign.id, address),
        contract.getApplicationDescription(campaign.id, address),
        contract.getApplicationEvidence(campaign.id, address),
        contract.getApplicationReason(campaign.id, address),
      ])

      const parsedStatus = clean(status)
      if (!parsedStatus) throw new Error('No application found for this wallet and campaign.')

      setLookupWallet(address)
      setApplication({
        applicant: address,
        status: parsedStatus,
        description: clean(description),
        evidence: clean(evidence),
        reason: clean(reason),
      })
    } catch (e) {
      setApplication(null)
      setNotice({ kind: 'error', message: errorMessage(e) })
    } finally {
      setBusy('')
    }
  }

  async function handleJudge() {
    if (!account) return requireWallet()
    if (!campaign || !application) return

    setBusy('judge')
    setNotice({
      kind: 'info',
      message: 'GenLayer validators are reading the evidence and adjudicating eligibility. This can take longer than a normal transaction.',
    })
    try {
      const { hash } = await contract.judgeApplication(
        account,
        campaign.id,
        application.applicant,
      )
      setNotice({ kind: 'success', message: 'AI consensus accepted. Refreshing the onchain verdict…', tx: hash })
      await loadApplication(application.applicant)
    } catch (e) {
      setNotice({ kind: 'error', message: errorMessage(e) })
    } finally {
      setBusy('')
    }
  }

  function requireWallet() {
    setNotice({ kind: 'error', message: 'Connect a wallet before sending a transaction.' })
  }

  return (
    <div className="app-shell">
      <nav className="nav">
        <a className="brand" href="#">
          <div className="brand-mark"><Gavel size={20} /></div>
          <div>
            <strong>AirJudge</strong>
            <span>on GenLayer</span>
          </div>
        </a>
        <div className="nav-actions">
          <a className="ghost-link" href={explorerContract} target="_blank" rel="noreferrer">
            Contract <ExternalLink size={14} />
          </a>
          <WalletButton account={account} onConnect={handleConnect} busy={walletBusy} />
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-badge"><Sparkles size={15} /> Decentralized contribution adjudication</div>
          <h1>Reward real contribution.<br /><span>Let evidence decide.</span></h1>
          <p>
            Create natural-language eligibility rules, let contributors submit public evidence,
            and use GenLayer's AI-validator consensus to resolve who qualifies.
          </p>
          <div className="hero-flow">
            <Flow icon={<FileCheck2 />} label="Set criteria" />
            <ArrowRight className="flow-arrow" />
            <Flow icon={<Search />} label="Submit evidence" />
            <ArrowRight className="flow-arrow" />
            <Flow icon={<Bot />} label="AI validators" />
            <ArrowRight className="flow-arrow" />
            <Flow icon={<ShieldCheck />} label="Onchain verdict" />
          </div>
        </section>

        {notice && <NoticeCard notice={notice} />}

        <section className="workspace">
          <div className="section-heading">
            <span>01</span>
            <div>
              <h2>Create a campaign</h2>
              <p>Define subjective eligibility in plain English. The rules become the court's rubric.</p>
            </div>
          </div>

          <form className="card form-grid" onSubmit={handleCreate}>
            <Field label="Campaign ID" hint="Unique, lowercase-friendly identifier">
              <input
                placeholder="builders-airdrop-2026"
                value={createForm.id}
                onChange={(e) => setCreateForm({ ...createForm, id: e.target.value })}
              />
            </Field>
            <Field label="Campaign name">
              <input
                placeholder="GenLayer Builder Rewards"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </Field>
            <Field className="full" label="Eligibility criteria" hint="Describe what counts as a meaningful contribution.">
              <textarea
                rows={5}
                placeholder="Applicant must provide a public, original and meaningful technical contribution..."
                value={createForm.criteria}
                onChange={(e) => setCreateForm({ ...createForm, criteria: e.target.value })}
              />
            </Field>
            <button className="primary full" disabled={busy === 'create'}>
              {busy === 'create' ? <><LoaderCircle className="spin" size={18} /> Creating…</> : <>Create campaign <ArrowRight size={18} /></>}
            </button>
          </form>
        </section>

        <section className="workspace">
          <div className="section-heading">
            <span>02</span>
            <div>
              <h2>Open a campaign</h2>
              <p>Load any campaign by its onchain ID.</p>
            </div>
          </div>

          <div className="card">
            <div className="search-row">
              <input
                placeholder="Campaign ID"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCampaign()}
              />
              <button className="secondary" onClick={() => loadCampaign()} disabled={busy === 'load'}>
                {busy === 'load' ? <LoaderCircle className="spin" size={17} /> : <Search size={17} />}
                Load
              </button>
            </div>

            {recent.length > 0 && (
              <div className="recent">
                <span>Recent</span>
                {recent.map((id) => (
                  <button key={id} onClick={() => loadCampaign(id)}>{id}</button>
                ))}
              </div>
            )}

            {campaign && (
              <div className="campaign-panel">
                <div className="campaign-top">
                  <div>
                    <div className="eyebrow">{campaign.id}</div>
                    <h3>{campaign.name}</h3>
                  </div>
                  <StatusPill status={campaign.active ? 'ACTIVE' : 'CLOSED'} />
                </div>
                <div className="criteria-box">
                  <span>Eligibility criteria</span>
                  <p>{campaign.criteria}</p>
                </div>
                <div className="meta-line">
                  Creator <code>{campaign.creator}</code>
                </div>
              </div>
            )}
          </div>
        </section>

        {campaign && (
          <section className="two-col">
            <div className="workspace">
              <div className="section-heading">
                <span>03</span>
                <div>
                  <h2>Submit contribution</h2>
                  <p>Your claim is untrusted until public evidence supports it.</p>
                </div>
              </div>

              <form className="card" onSubmit={handleSubmit}>
                <Field label="Contribution description">
                  <textarea
                    rows={5}
                    placeholder="I created an original technical tutorial explaining..."
                    value={submitForm.description}
                    onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })}
                  />
                </Field>
                <Field label="Public evidence URL" hint="Must be a public https:// page GenLayer can render.">
                  <input
                    placeholder="https://..."
                    value={submitForm.evidence}
                    onChange={(e) => setSubmitForm({ ...submitForm, evidence: e.target.value })}
                  />
                </Field>
                <button className="primary" disabled={busy === 'submit'}>
                  {busy === 'submit' ? <><LoaderCircle className="spin" size={18} /> Submitting…</> : <>Submit evidence <ArrowRight size={18} /></>}
                </button>
              </form>
            </div>

            <div className="workspace">
              <div className="section-heading">
                <span>04</span>
                <div>
                  <h2>Adjudicate</h2>
                  <p>Inspect an application, then ask GenLayer validators for a consensus verdict.</p>
                </div>
              </div>

              <div className="card">
                <Field label="Applicant wallet">
                  <div className="search-row">
                    <input
                      placeholder="0x..."
                      value={lookupWallet}
                      onChange={(e) => setLookupWallet(e.target.value)}
                    />
                    <button className="secondary" type="button" onClick={() => loadApplication()} disabled={busy === 'lookup'}>
                      {busy === 'lookup' ? <LoaderCircle className="spin" size={17} /> : <Search size={17} />}
                    </button>
                  </div>
                </Field>

                {account && !lookupWallet && (
                  <button className="text-button" onClick={() => { setLookupWallet(account); loadApplication(account) }}>
                    Use connected wallet
                  </button>
                )}

                {application && (
                  <div className="application-panel">
                    <div className="verdict-header">
                      <div>
                        <span>Application status</span>
                        <StatusPill status={application.status} />
                      </div>
                      {application.status === 'ELIGIBLE' ? <CheckCircle2 className="verdict-icon good" /> :
                        application.status === 'NOT_ELIGIBLE' ? <XCircle className="verdict-icon bad" /> :
                        <Bot className="verdict-icon" />}
                    </div>

                    <div className="application-detail">
                      <span>Claim</span>
                      <p>{application.description}</p>
                    </div>

                    <div className="application-detail">
                      <span>Evidence</span>
                      <a href={application.evidence} target="_blank" rel="noreferrer">
                        {application.evidence} <ExternalLink size={13} />
                      </a>
                    </div>

                    {application.reason && (
                      <div className="reason">
                        <Gavel size={17} />
                        <div>
                          <span>Consensus reason</span>
                          <p>{application.reason}</p>
                        </div>
                      </div>
                    )}

                    {application.status === 'PENDING' && (
                      <button className="judge-button" disabled={!canJudge || busy === 'judge'} onClick={handleJudge}>
                        {busy === 'judge'
                          ? <><LoaderCircle className="spin" size={19} /> Validators judging…</>
                          : <><Gavel size={19} /> Run GenLayer adjudication</>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="proof-section">
          <div className="proof-copy">
            <div className="hero-badge"><ShieldCheck size={15} /> Why GenLayer</div>
            <h2>Not another points checker.</h2>
            <p>
              Deterministic rules can count transactions. AirJudge handles the ambiguous part:
              whether unstructured public evidence actually satisfies a natural-language contribution policy.
            </p>
          </div>
          <div className="proof-grid">
            <Proof title="Natural-language rules" text="Campaign criteria can express quality, relevance and originality—not just numeric thresholds." />
            <Proof title="Public evidence" text="The applicant's claim is not trusted by default. Validators inspect the submitted public source." />
            <Proof title="AI-validator consensus" text="The verdict is resolved through GenLayer adjudication rather than a single centralized model." />
            <Proof title="Onchain finality" text="ELIGIBLE / NOT_ELIGIBLE is persisted as contract state for downstream reward systems." />
          </div>
        </section>
      </main>

      <footer>
        <div>
          <strong>AirJudge</strong>
          <span>Contribution eligibility adjudication on GenLayer Studionet.</span>
        </div>
        <a href={explorerContract} target="_blank" rel="noreferrer">
          {CONTRACT_ADDRESS.slice(0, 10)}…{CONTRACT_ADDRESS.slice(-6)}
          <ExternalLink size={14} />
        </a>
      </footer>
    </div>
  )
}

function Field({
  label,
  hint,
  className = '',
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

function Flow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flow-item">{icon}<span>{label}</span></div>
}

function Proof({ title, text }: { title: string; text: string }) {
  return <div className="proof-card"><h3>{title}</h3><p>{text}</p></div>
}

function NoticeCard({ notice }: { notice: Exclude<Notice, null> }) {
  return (
    <div className={`notice ${notice.kind}`}>
      {notice.kind === 'success' ? <CheckCircle2 size={18} /> :
       notice.kind === 'error' ? <XCircle size={18} /> :
       <LoaderCircle className="spin" size={18} />}
      <span>{notice.message}</span>
      {notice.tx && (
        <a href={`${EXPLORER_BASE}/tx/${notice.tx}`} target="_blank" rel="noreferrer">
          View tx <ExternalLink size={13} />
        </a>
      )}
    </div>
  )
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Something went wrong while interacting with GenLayer.'
}
