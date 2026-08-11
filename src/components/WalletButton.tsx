type Props = {
  account: string
  busy?: boolean
  onConnect: () => void
}

const short = (value: string) =>
  value ? `${value.slice(0, 6)}…${value.slice(-4)}` : ''

export default function WalletButton({ account, busy, onConnect }: Props) {
  return (
    <button className="wallet-btn" onClick={onConnect} disabled={busy}>
      {account ? short(account) : busy ? 'Connecting…' : 'Connect wallet'}
    </button>
  )
}
