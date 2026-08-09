type Props = { status?: string }

export default function StatusPill({ status = '' }: Props) {
  const normalized = status.toUpperCase()
  const cls =
    normalized === 'ELIGIBLE'
      ? 'status eligible'
      : normalized === 'NOT_ELIGIBLE'
        ? 'status rejected'
        : normalized === 'PENDING'
          ? 'status pending'
          : 'status neutral'

  return <span className={cls}>{status || 'Unknown'}</span>
}
