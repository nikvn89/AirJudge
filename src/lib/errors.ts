export type NormalizedError = {
  message: string
  code?: number | string
  raw: unknown
}

const CODE_MESSAGES: Record<string, string> = {
  '4001': 'You rejected the request in your wallet.',
  '4100': 'Your wallet has not authorised this account. Unlock MetaMask and try again.',
  '4902': 'GenLayer Studio is not added to your wallet yet.',
  '-32002': 'MetaMask already has a pending request. Open the extension and finish it first.',
  '-32601': 'Your wallet does not support this optional method. You can keep using AirJudge.',
  '-32603': 'Your wallet reported an internal error. Check that MetaMask is on GenLayer Studio (chain 61999).',
}

const KNOWN_CODES = new Set(Object.keys(CODE_MESSAGES))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function errorCode(value: unknown, depth = 0): number | string | undefined {
  if (!isRecord(value) || depth > 5) return undefined

  const direct = value.code ?? value.errorCode
  const hasDirect = typeof direct === 'number' || typeof direct === 'string'

  if (hasDirect && KNOWN_CODES.has(String(direct))) {
    return direct as number | string
  }

  let nestedFallback: number | string | undefined

  for (const key of ['data', 'cause', 'error', 'originalError'] as const) {
    const nested: unknown = value[key]
    if (nested && nested !== value) {
      const found = errorCode(nested, depth + 1)
      if (found !== undefined) {
        if (KNOWN_CODES.has(String(found))) return found
        if (nestedFallback === undefined) nestedFallback = found
      }
    }
  }

  if (hasDirect) return direct as number | string
  return nestedFallback
}

function errorMessage(value: unknown, depth = 0): string | undefined {
  if (depth > 5) return undefined
  if (typeof value === 'string') return value.trim() || undefined
  if (value instanceof Error && value.message.trim()) return value.message.trim()
  if (!isRecord(value)) return undefined

  for (const key of ['shortMessage', 'message', 'reason'] as const) {
    const candidate = value[key]
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }

  for (const key of ['data', 'cause', 'error', 'originalError'] as const) {
    const nested: unknown = value[key]
    if (nested && nested !== value) {
      const found = errorMessage(nested, depth + 1)
      if (found) return found
    }
  }

  return undefined
}

export function normalizeError(raw: unknown): NormalizedError {
  const code = errorCode(raw)
  const known = code === undefined ? undefined : CODE_MESSAGES[String(code)]
  let message = known ?? errorMessage(raw)

  if (!message) {
    message = 'Unexpected wallet or network error. Open the browser console for details.'
  }

  message = message.split('\n')[0]!.trim().slice(0, 260)
  return { message, ...(code === undefined ? {} : { code }), raw }
}

export function reportError(context: string, raw: unknown): string {
  const normalized = normalizeError(raw)

  console.error(`[AirJudge] ${context} failed`, {
    code: normalized.code,
    message: normalized.message,
    raw,
  })

  return normalized.code === undefined
    ? normalized.message
    : `${normalized.message} (code ${normalized.code})`
}
