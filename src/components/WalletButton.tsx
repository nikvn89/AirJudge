import { Wallet } from 'lucide-react'

type Props = {
  account: string
  onConnect: () => void
  busy?: boolean
}

function short(address: string) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''
}

export default function WalletButton({ account, onConnect, busy }: Props) {
  return (
    <button className="wallet-button" onClick={onConnect} disabled={busy}>
      <Wallet size={17} />
      {account ? short(account) : busy ? 'Connecting…' : 'Connect wallet'}
    </button>
  )
}
