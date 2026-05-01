// db.ts — localStorage-based data layer (no external DB required)
// All data persists in browser localStorage

export function getCredits(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem('fl_credits') || '0', 10)
}

export function setCredits(val: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('fl_credits', String(val))
  window.dispatchEvent(new CustomEvent('fl_credits_changed', { detail: { credits: val } }))
}

export function getSessions(uid: string): any[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('fl_s_' + uid) || '[]') } catch { return [] }
}

export function saveSessions(uid: string, sessions: any[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('fl_s_' + uid, JSON.stringify(sessions.slice(0, 50)))
}
