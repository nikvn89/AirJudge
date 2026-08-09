const KEY = 'airjudge:campaigns'

export function getRecentCampaigns(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function rememberCampaign(id: string) {
  const next = [id, ...getRecentCampaigns().filter((x) => x !== id)].slice(0, 8)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable (private mode, quota) — the recent list is a
    // convenience, so never let it break campaign creation
  }
  return next
}
