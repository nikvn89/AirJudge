export default function StatusPill({ status }: { status: string }) {
  const normalized = status || 'UNKNOWN'
  return (
    <span className={`status-pill ${normalized.toLowerCase().replaceAll('_', '-')}`}>
      {normalized}
    </span>
  )
}
