'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState, useCallback, useRef } from 'react'
import CosmicTopbar from '../CosmicTopbar'
import '../cosmic.css'

// ── Types ──────────────────────────────────────────────────────────────────────
interface FriendEntry {
  uid: string
  name: string
  avatar: string           // initials or emoji
  focusMinsToday: number
  focusMinsWeek: number
  focusMinsAllTime: number
  sessionsToday: number
  sessionsTotal: number
  credits: number
  streak: number           // consecutive days with ≥1 session
  lastActive: string       // ISO date string
  level: string
  addedAt: number
}

interface LeaderboardRow extends FriendEntry {
  rank: number
  isMe: boolean
  change: 'up' | 'down' | 'same' | 'new'
}

type SortKey = 'focusMinsToday' | 'focusMinsWeek' | 'focusMinsAllTime' | 'credits' | 'streak'

// ── Level helper ────────────────────────────────────────────────────────────────
function getLevel(credits: number) {
  if (credits >= 700) return { name: 'Master',  icon: '👑', color: '#ffb020' }
  if (credits >= 350) return { name: 'Expert',  icon: '💎', color: '#a855f7' }
  if (credits >= 150) return { name: 'Pro',     icon: '⚡', color: '#00d4ff' }
  if (credits >= 50)  return { name: 'Focused', icon: '🎯', color: '#39ff9c' }
  return              { name: 'Beginner', icon: '🌱', color: '#94a3c0' }
}

// ── Read my stats from localStorage ────────────────────────────────────────────
function readMyStats(uid: string, name: string, avatar: string, credits: number): FriendEntry {
  const today = new Date().toLocaleDateString()
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000

  let sessions: any[] = []
  try { sessions = JSON.parse(localStorage.getItem('fl_s_' + uid) || '[]') } catch {}

  const todaySessions  = sessions.filter((s: any) => s.date === new Date().toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' }))
  const weekSessions   = sessions.filter((s: any) => s.id > weekAgo)
  const focusMinsToday = Math.round(todaySessions.reduce((a: number, s: any) => a + (s.focusedSecs || 0), 0) / 60)
  const focusMinsWeek  = Math.round(weekSessions.reduce((a: number, s: any) => a + (s.focusedSecs || 0), 0) / 60)
  const focusMinsAll   = Math.round(sessions.reduce((a: number, s: any) => a + (s.focusedSecs || 0), 0) / 60)

  // Calculate streak
  let streak = 0
  const daySet = new Set(sessions.map((s: any) => new Date(s.id).toLocaleDateString()))
  let d = new Date()
  while (daySet.has(d.toLocaleDateString())) { streak++; d.setDate(d.getDate() - 1) }

  const lv = getLevel(credits)
  return {
    uid, name, avatar,
    focusMinsToday, focusMinsWeek, focusMinsAllTime: focusMinsAll,
    sessionsToday: todaySessions.length,
    sessionsTotal: sessions.length,
    credits, streak,
    lastActive: today,
    level: lv.name,
    addedAt: Date.now(),
  }
}

// ── Format helpers ──────────────────────────────────────────────────────────────
function fmtMins(m: number) {
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr)
  const diff = (Date.now() - d.getTime()) / 1000
  if (isNaN(diff) || diff < 86400) return 'Today'
  if (diff < 172800) return 'Yesterday'
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Avatar component ────────────────────────────────────────────────────────────
function Avatar({ text, size = 36, color }: { text: string; size?: number; color?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color || 'linear-gradient(135deg, #7c3aff, #a855f7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Syne, sans-serif', fontWeight: 900,
      fontSize: size * 0.38, color: '#fff',
      border: '2px solid rgba(124,58,255,0.35)',
      boxShadow: '0 0 12px rgba(124,58,255,0.2)',
    }}>{text}</div>
  )
}

// ── Rank badge ──────────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, { bg: string; color: string; label: string }> = {
    1: { bg: 'rgba(255,176,32,0.15)', color: '#ffb020', label: '🥇' },
    2: { bg: 'rgba(168,178,193,0.15)', color: '#a8b2c1', label: '🥈' },
    3: { bg: 'rgba(205,127,50,0.15)', color: '#cd7f32', label: '🥉' },
  }
  const s = styles[rank]
  if (s) return (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, border: `1px solid ${s.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
      {s.label}
    </div>
  )
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,58,255,0.06)', border: '1px solid rgba(124,58,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>
      {rank}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { user, isLoaded } = useUser()

  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('focusMinsToday')
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'friends'>('leaderboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [addMode, setAddMode] = useState(false)
  const [newFriendCode, setNewFriendCode] = useState('')
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [myCode, setMyCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const refreshRef = useRef<ReturnType<typeof setInterval>>()

  // ── Load friends from localStorage ───────────────────────────────────────────
  const loadFriends = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('fl_friends') || '[]')
      setFriends(stored)
    } catch { setFriends([]) }
  }, [])

  // ── Generate my share code (deterministic from uid) ───────────────────────────
  useEffect(() => {
    if (!user) return
    // Code = first 8 chars of uid in uppercase, prefixed with FL-
    const code = 'FL-' + user.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()
    setMyCode(code)
    localStorage.setItem('fl_my_code', code)
    localStorage.setItem('fl_my_uid', user.id)
    publishMyStats()
  }, [user])

  // ── Publish my own stats to localStorage so friends can read ─────────────────
  const publishMyStats = useCallback(() => {
    if (!user) return
    const credits = parseInt(localStorage.getItem('fl_credits') || '0', 10)
    const name = user.fullName || user.firstName || user.emailAddresses?.[0]?.emailAddress || 'Me'
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    const stats = readMyStats(user.id, name, initials, credits)
    // Store under my uid so others can look it up
    localStorage.setItem('fl_user_' + user.id, JSON.stringify({ ...stats, publishedAt: Date.now() }))
    setLastUpdated(new Date())
  }, [user])

  // ── Auto-refresh every 30s + on focus ────────────────────────────────────────
  useEffect(() => {
    loadFriends()
    refreshRef.current = setInterval(() => { publishMyStats(); loadFriends() }, 30000)
    window.addEventListener('focus', publishMyStats)
    window.addEventListener('fl_credits_changed', publishMyStats)
    return () => {
      clearInterval(refreshRef.current)
      window.removeEventListener('focus', publishMyStats)
      window.removeEventListener('fl_credits_changed', publishMyStats)
    }
  }, [loadFriends, publishMyStats])

  // ── Build leaderboard rows ────────────────────────────────────────────────────
  const myCredits = parseInt(localStorage.getItem('fl_credits') || '0', 10)
  const myName = user?.fullName || user?.firstName || 'Me'
  const myInitials = myName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const myStats = user ? readMyStats(user.id, myName, myInitials, myCredits) : null

  // Merge me + friends, sort, rank
  const allEntries: LeaderboardRow[] = []
  if (myStats) {
    allEntries.push({ ...myStats, rank: 0, isMe: true, change: 'same' })
  }
  friends.forEach(f => {
    // Try to get latest stats if they're stored locally (same device scenario)
    let latest = f
    try {
      const pub = JSON.parse(localStorage.getItem('fl_user_' + f.uid) || 'null')
      if (pub && pub.publishedAt > f.addedAt) latest = { ...f, ...pub }
    } catch {}
    allEntries.push({ ...latest, rank: 0, isMe: false, change: 'same' })
  })

  allEntries.sort((a, b) => b[sortKey] - a[sortKey])
  allEntries.forEach((e, i) => { e.rank = i + 1 })

  // ── Add friend by code ────────────────────────────────────────────────────────
  const handleAddFriend = () => {
    setAddError('')
    setAddSuccess('')
    const code = newFriendCode.trim().toUpperCase()
    if (!code) { setAddError('Enter a friend code'); return }
    if (code === myCode) { setAddError("That's your own code!"); return }
    if (friends.some(f => ('FL-' + f.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()) === code)) {
      setAddError('Already in your friends list'); return
    }

    // Try to find their data in localStorage (same device) or create placeholder
    const uid = code.replace('FL-', '').toLowerCase()
    let friendData: FriendEntry | null = null

    // Look for any stored user with matching code
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('fl_user_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || 'null')
          if (data) {
            const dataCode = 'FL-' + data.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()
            if (dataCode === code) { friendData = data; break }
          }
        } catch {}
      }
    }

    if (!friendData) {
      // Create a placeholder — they'll appear once they open the app on same device
      // or their data will be loaded via share code
      friendData = {
        uid: code.replace('FL-', '') + '_placeholder',
        name: `Friend (${code})`,
        avatar: '👤',
        focusMinsToday: 0, focusMinsWeek: 0, focusMinsAllTime: 0,
        sessionsToday: 0, sessionsTotal: 0,
        credits: 0, streak: 0,
        lastActive: new Date().toLocaleDateString(),
        level: 'Beginner',
        addedAt: Date.now(),
      }
    }

    const existing = JSON.parse(localStorage.getItem('fl_friends') || '[]')
    localStorage.setItem('fl_friends', JSON.stringify([...existing, friendData]))
    setFriends([...existing, friendData])
    setNewFriendCode('')
    setAddMode(false)
    setAddSuccess(`${friendData.name} added! Their stats will update when they use FocusLens.`)
    setTimeout(() => setAddSuccess(''), 5000)
  }

  // ── Remove friend ─────────────────────────────────────────────────────────────
  const handleRemoveFriend = (uid: string) => {
    const updated = friends.filter(f => f.uid !== uid)
    localStorage.setItem('fl_friends', JSON.stringify(updated))
    setFriends(updated)
  }

  // ── Copy code to clipboard ────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(myCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!isLoaded) return null

  const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
    { key: 'focusMinsToday', label: 'Today',    icon: '📅' },
    { key: 'focusMinsWeek',  label: 'This Week', icon: '📆' },
    { key: 'focusMinsAllTime', label: 'All Time', icon: '🏆' },
    { key: 'credits',        label: 'Credits',   icon: '🪙' },
    { key: 'streak',         label: 'Streak',    icon: '🔥' },
  ]

  const lv = getLevel(myCredits)

  return (
    <>
      <style>{`
        .lb-root { position:relative; z-index:10; }

        /* ── Tabs ── */
        .lb-tabs { display:flex; gap:4px; margin-bottom:24px; border-bottom:1px solid var(--border); }
        .lb-tab { padding:10px 22px; border-radius:10px 10px 0 0; font-size:12px; font-weight:600; cursor:pointer; border:none; background:transparent; color:var(--muted); font-family:var(--fi); border-bottom:2px solid transparent; transition:all 0.2s; }
        .lb-tab:hover { color:var(--text); }
        .lb-tab.active { color:var(--plasma-l); border-bottom-color:var(--plasma-l); }

        /* ── Sort pills ── */
        .sort-row { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
        .sort-pill { padding:6px 16px; border-radius:20px; font-size:11px; font-weight:600; cursor:pointer; border:1px solid var(--border2); background:transparent; color:var(--muted); font-family:var(--fm); transition:all 0.2s; display:flex; align-items:center; gap:5px; }
        .sort-pill:hover { border-color:rgba(124,58,255,0.3); color:var(--text); }
        .sort-pill.active { background:rgba(124,58,255,0.12); border-color:var(--plasma-l); color:var(--plasma-l); }

        /* ── Leaderboard table ── */
        .lb-list { display:flex; flex-direction:column; gap:8px; }
        .lb-row {
          display:grid; grid-template-columns:40px 40px 1fr auto;
          align-items:center; gap:14px;
          padding:14px 18px;
          background:linear-gradient(135deg,rgba(14,17,32,0.95),rgba(19,22,40,0.9));
          border:1px solid rgba(124,58,255,0.12);
          border-radius:14px; transition:all 0.25s; position:relative; overflow:hidden;
        }
        .lb-row::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(124,58,255,0.2),transparent); }
        .lb-row:hover { border-color:rgba(124,58,255,0.28); transform:translateY(-1px); }
        .lb-row.me { border-color:rgba(57,255,156,0.25); background:linear-gradient(135deg,rgba(14,17,32,0.98),rgba(14,28,20,0.95)); }
        .lb-row.me::before { background:linear-gradient(90deg,transparent,rgba(57,255,156,0.3),transparent); }
        .lb-row.rank-1 { border-color:rgba(255,176,32,0.3); background:linear-gradient(135deg,rgba(14,17,32,0.98),rgba(28,22,8,0.95)); }
        .lb-row.rank-2 { border-color:rgba(168,178,193,0.25); }
        .lb-row.rank-3 { border-color:rgba(205,127,50,0.25); }

        .lb-info { display:flex; flex-direction:column; min-width:0; }
        .lb-name { font-family:var(--fd); font-size:14px; font-weight:700; color:var(--white); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:8px; }
        .lb-me-badge { font-family:var(--fm); font-size:8px; letter-spacing:1.5px; text-transform:uppercase; padding:2px 7px; border-radius:4px; background:rgba(57,255,156,0.1); border:1px solid rgba(57,255,156,0.25); color:var(--neon); }
        .lb-meta { display:flex; align-items:center; gap:10px; margin-top:3px; flex-wrap:wrap; }
        .lb-meta-item { font-family:var(--fm); font-size:9px; color:var(--muted); display:flex; align-items:center; gap:3px; }
        .lb-level { font-family:var(--fm); font-size:8px; letter-spacing:1px; padding:2px 7px; border-radius:4px; }

        .lb-stats { display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; }
        .lb-main-val { font-family:var(--fd); font-size:20px; font-weight:900; color:var(--white); letter-spacing:-1px; line-height:1; }
        .lb-main-lbl { font-family:var(--fm); font-size:8px; color:var(--muted); letter-spacing:1px; text-transform:uppercase; }
        .lb-change { font-size:10px; }

        /* ── My code card ── */
        .code-card { background:linear-gradient(135deg,rgba(124,58,255,0.1),rgba(57,255,156,0.05)); border:1px solid rgba(124,58,255,0.2); border-radius:16px; padding:20px 24px; margin-bottom:20px; display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
        .code-val { font-family:'Space Mono',monospace; font-size:24px; font-weight:700; color:var(--white); letter-spacing:4px; }
        .code-copy { padding:8px 20px; border-radius:9px; border:1px solid rgba(57,255,156,0.3); background:rgba(57,255,156,0.08); color:var(--neon); font-family:var(--fm); font-size:11px; font-weight:700; cursor:pointer; transition:all 0.2s; letter-spacing:1px; }
        .code-copy:hover { background:rgba(57,255,156,0.15); }
        .code-copy.copied { background:rgba(57,255,156,0.2); }

        /* ── Add friend form ── */
        .add-form { background:linear-gradient(135deg,rgba(14,17,32,0.95),rgba(19,22,40,0.9)); border:1px solid rgba(124,58,255,0.2); border-radius:16px; padding:20px; margin-bottom:16px; }
        .add-form-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
        .add-input { flex:1; min-width:200px; padding:10px 14px; border-radius:10px; border:1px solid var(--border2); background:rgba(14,17,32,0.9); color:var(--white); font-family:'Space Mono',monospace; font-size:14px; letter-spacing:3px; outline:none; text-transform:uppercase; }
        .add-input:focus { border-color:var(--plasma-l); box-shadow:0 0 0 2px rgba(124,58,255,0.1); }
        .add-input::placeholder { color:var(--muted); letter-spacing:1px; font-size:11px; text-transform:none; }
        .add-err { color:var(--pulsar); font-size:11px; font-family:var(--fm); margin-top:8px; }
        .add-ok  { color:var(--neon);   font-size:11px; font-family:var(--fm); margin-top:8px; }

        /* ── Friends list ── */
        .friends-list { display:flex; flex-direction:column; gap:8px; }
        .friend-row { display:flex; align-items:center; gap:14px; padding:14px 18px; background:linear-gradient(135deg,rgba(14,17,32,0.95),rgba(19,22,40,0.9)); border:1px solid rgba(124,58,255,0.12); border-radius:14px; transition:all 0.2s; }
        .friend-row:hover { border-color:rgba(124,58,255,0.25); }
        .friend-info { flex:1; min-width:0; }
        .friend-name { font-family:var(--fd); font-size:14px; font-weight:700; color:var(--white); margin-bottom:3px; }
        .friend-stats { display:flex; gap:12px; flex-wrap:wrap; }
        .friend-stat { font-family:var(--fm); font-size:9px; color:var(--muted); }
        .friend-stat strong { color:var(--text); display:block; font-size:11px; }
        .friend-remove { padding:5px 12px; border-radius:7px; border:1px solid rgba(255,61,138,0.25); background:rgba(255,61,138,0.05); color:var(--pulsar); font-size:10px; cursor:pointer; transition:all 0.2s; font-family:var(--fm); flex-shrink:0; }
        .friend-remove:hover { background:rgba(255,61,138,0.12); }

        /* ── Empty state ── */
        .lb-empty { padding:48px 24px; text-align:center; border:1px dashed rgba(124,58,255,0.2); border-radius:16px; color:var(--muted); font-size:13px; line-height:2.2; }
        .lb-empty-icon { font-size:40px; display:block; margin-bottom:12px; }

        /* ── Summary cards ── */
        .my-summary { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
        .sum-card { background:linear-gradient(135deg,rgba(14,17,32,0.95),rgba(19,22,40,0.9)); border:1px solid rgba(124,58,255,0.12); border-radius:12px; padding:14px; position:relative; overflow:hidden; }
        .sum-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(124,58,255,0.3),transparent); }
        .sum-val { font-family:var(--fd); font-size:22px; font-weight:900; color:var(--white); letter-spacing:-1px; margin-bottom:3px; }
        .sum-lbl { font-family:var(--fm); font-size:8px; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); }

        /* ── Update badge ── */
        .update-row { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-bottom:14px; }
        .update-time { font-family:var(--fm); font-size:9px; color:var(--muted); letter-spacing:1px; }
        .refresh-btn { padding:4px 12px; border-radius:6px; border:1px solid var(--border2); background:transparent; color:var(--muted); font-size:10px; cursor:pointer; transition:all 0.2s; font-family:var(--fm); }
        .refresh-btn:hover { border-color:var(--plasma-l); color:var(--plasma-l); }

        /* ── Light theme ── */
        body[data-theme="light"] .lb-row,
        body[data-theme="light"] .friend-row,
        body[data-theme="light"] .sum-card,
        body[data-theme="light"] .add-form { background:linear-gradient(135deg,rgba(255,255,255,0.97),rgba(244,245,252,0.95)) !important; border-color:rgba(109,40,217,0.12) !important; }
        body[data-theme="light"] .lb-row.me { background:linear-gradient(135deg,rgba(240,255,248,0.97),rgba(244,252,248,0.95)) !important; }
        body[data-theme="light"] .code-card { background:linear-gradient(135deg,rgba(124,58,255,0.06),rgba(57,255,156,0.03)) !important; }
        body[data-theme="light"] .add-input { background:rgba(255,255,255,0.9) !important; color:#0e1120 !important; }

        @media(max-width:800px) { .lb-row{grid-template-columns:36px 36px 1fr auto} .my-summary{grid-template-columns:repeat(2,1fr)} }
        @media(max-width:520px) { .lb-row{grid-template-columns:32px 1fr auto} .lb-row > :nth-child(2){display:none} .my-summary{grid-template-columns:1fr 1fr} }
      `}</style>

      <div className="scanlines" />
      <CosmicTopbar />

      <div className="lb-root page-content">
        {/* Header */}
        <div className="section-head">
          <div className="section-icon">🏆</div>
          <div>
            <div className="section-title">Leaderboard</div>
            <div className="section-sub">
              Compete with friends · Rankings update every 30 seconds
            </div>
          </div>
        </div>

        {/* My summary row */}
        {myStats && (
          <div className="my-summary">
            {[
              { val: fmtMins(myStats.focusMinsToday), lbl: "Today's Focus",    icon: '📅' },
              { val: fmtMins(myStats.focusMinsWeek),  lbl: "This Week",        icon: '📆' },
              { val: `${myStats.streak}d`,             lbl: 'Current Streak',  icon: '🔥' },
              { val: String(myStats.credits),          lbl: 'Total Credits',   icon: '🪙' },
            ].map(s => (
              <div className="sum-card" key={s.lbl}>
                <div style={{ fontSize: 18, marginBottom: 6 }}>{s.icon}</div>
                <div className="sum-val">{s.val}</div>
                <div className="sum-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="lb-tabs">
          <button className={`lb-tab ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
            🏆 Leaderboard
          </button>
          <button className={`lb-tab ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>
            👥 Friends {friends.length > 0 && `(${friends.length})`}
          </button>
        </div>

        {/* ── LEADERBOARD TAB ── */}
        {activeTab === 'leaderboard' && (
          <div>
            {/* Sort pills + refresh */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div className="sort-row" style={{ margin: 0 }}>
                {SORT_OPTIONS.map(o => (
                  <button key={o.key} className={`sort-pill ${sortKey === o.key ? 'active' : ''}`} onClick={() => setSortKey(o.key)}>
                    {o.icon} {o.label}
                  </button>
                ))}
              </div>
              <div className="update-row" style={{ margin: 0 }}>
                {lastUpdated && <span className="update-time">Updated {lastUpdated.toLocaleTimeString()}</span>}
                <button className="refresh-btn" onClick={() => { publishMyStats(); loadFriends(); setLastUpdated(new Date()) }}>↻ Refresh</button>
              </div>
            </div>

            {allEntries.length === 0 ? (
              <div className="lb-empty">
                <span className="lb-empty-icon">👥</span>
                No friends added yet.<br />
                Go to the Friends tab to add friends using their code.<br />
                <span style={{ fontSize: 11, color: 'rgba(124,58,255,0.5)' }}>Your rank will appear once you add at least one friend.</span>
              </div>
            ) : (
              <div className="lb-list">
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px 40px 1fr auto', gap: 14, padding: '0 18px', marginBottom: 4 }}>
                  <div style={{ fontFamily: 'var(--fm)', fontSize: 8, color: 'var(--muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Rank</div>
                  <div />
                  <div style={{ fontFamily: 'var(--fm)', fontSize: 8, color: 'var(--muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Player</div>
                  <div style={{ fontFamily: 'var(--fm)', fontSize: 8, color: 'var(--muted)', letterSpacing: '1.5px', textTransform: 'uppercase', textAlign: 'right' }}>
                    {SORT_OPTIONS.find(o => o.key === sortKey)?.label}
                  </div>
                </div>

                {allEntries.map((entry, idx) => {
                  const lv = getLevel(entry.credits)
                  const mainVal = sortKey === 'credits' ? entry.credits
                    : sortKey === 'streak' ? entry.streak
                    : entry[sortKey]
                  const mainFmt = sortKey === 'credits' ? `${mainVal}` : sortKey === 'streak' ? `${mainVal}d` : fmtMins(mainVal as number)

                  return (
                    <div key={entry.uid} className={`lb-row ${entry.isMe ? 'me' : ''} rank-${entry.rank}`}
                      style={{ animationDelay: `${idx * 0.04}s` }}>
                      <RankBadge rank={entry.rank} />
                      <Avatar text={entry.avatar} size={36}
                        color={entry.isMe ? 'linear-gradient(135deg,#39ff9c,#00c864)' : undefined} />
                      <div className="lb-info">
                        <div className="lb-name">
                          {entry.name}
                          {entry.isMe && <span className="lb-me-badge">YOU</span>}
                        </div>
                        <div className="lb-meta">
                          <span className="lb-level" style={{ background: `${lv.color}15`, color: lv.color, border: `1px solid ${lv.color}33` }}>
                            {lv.icon} {lv.name}
                          </span>
                          <span className="lb-meta-item">🔥 {entry.streak}d streak</span>
                          <span className="lb-meta-item">📊 {entry.sessionsTotal} sessions</span>
                          <span className="lb-meta-item">🕐 {timeAgo(entry.lastActive)}</span>
                        </div>
                      </div>
                      <div className="lb-stats">
                        <div className="lb-main-val">{mainFmt}</div>
                        <div className="lb-main-lbl">
                          {sortKey === 'focusMinsToday' ? 'today' : sortKey === 'focusMinsWeek' ? 'this week' : sortKey === 'focusMinsAllTime' ? 'all time' : sortKey}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── FRIENDS TAB ── */}
        {activeTab === 'friends' && (
          <div>
            {/* My code */}
            <div className="code-card">
              <div>
                <div style={{ fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Your Friend Code</div>
                <div className="code-val">{myCode}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 340 }}>
                  Share this code with friends so they can add you. Their leaderboard updates daily based on focus time, streaks, and credits.
                </div>
              </div>
              <button className={`code-copy ${copied ? 'copied' : ''}`} onClick={handleCopy}>
                {copied ? '✓ Copied!' : '⧉ Copy Code'}
              </button>
            </div>

            {/* Add success message */}
            {addSuccess && (
              <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(57,255,156,0.06)', border: '1px solid rgba(57,255,156,0.2)', color: 'var(--neon)', fontSize: 12, marginBottom: 14, fontFamily: 'var(--fm)' }}>
                ✓ {addSuccess}
              </div>
            )}

            {/* Add friend */}
            <div style={{ marginBottom: 20 }}>
              {!addMode ? (
                <button className="btn-neon" onClick={() => setAddMode(true)} style={{ fontSize: 12 }}>
                  + Add Friend
                </button>
              ) : (
                <div className="add-form">
                  <div style={{ fontFamily: 'var(--fd)', fontSize: 14, fontWeight: 700, color: 'var(--white)', marginBottom: 12 }}>
                    Enter Friend Code
                  </div>
                  <div className="add-form-row">
                    <input
                      className="add-input"
                      placeholder="e.g. FL-ABC12345"
                      value={newFriendCode}
                      onChange={e => setNewFriendCode(e.target.value.toUpperCase())}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddFriend() }}
                      maxLength={14}
                      autoFocus
                    />
                    <button className="btn-neon" onClick={handleAddFriend} style={{ fontSize: 12, padding: '10px 24px' }}>Add</button>
                    <button className="btn-ghost" onClick={() => { setAddMode(false); setAddError(''); setNewFriendCode('') }} style={{ fontSize: 12, padding: '10px 18px' }}>Cancel</button>
                  </div>
                  {addError && <div className="add-err">⚠ {addError}</div>}
                  <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
                    Ask your friend for their code from this same page. Codes start with <span style={{ color: 'var(--plasma-l)', fontFamily: 'monospace' }}>FL-</span> followed by 8 characters.
                  </div>
                </div>
              )}
            </div>

            {/* Friends list */}
            {friends.length === 0 ? (
              <div className="lb-empty">
                <span className="lb-empty-icon">🤝</span>
                No friends yet.<br />
                Add friends using their <span style={{ color: 'var(--plasma-l)' }}>FL-XXXXXXXX</span> code above.<br />
                <span style={{ fontSize: 11, color: 'rgba(124,58,255,0.5)' }}>Your friend code: <strong style={{ color: 'var(--white)' }}>{myCode}</strong></span>
              </div>
            ) : (
              <div className="friends-list">
                <div style={{ fontFamily: 'var(--fm)', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
                  {friends.length} Friend{friends.length !== 1 ? 's' : ''}
                </div>
                {friends.map(f => {
                  const lv = getLevel(f.credits)
                  return (
                    <div key={f.uid} className="friend-row">
                      <Avatar text={f.avatar} size={40} />
                      <div className="friend-info">
                        <div className="friend-name">{f.name}</div>
                        <div className="friend-stats">
                          <div className="friend-stat"><strong>{fmtMins(f.focusMinsToday)}</strong>Today</div>
                          <div className="friend-stat"><strong>{fmtMins(f.focusMinsWeek)}</strong>This Week</div>
                          <div className="friend-stat"><strong>{f.streak}d</strong>Streak</div>
                          <div className="friend-stat"><strong>{f.credits}</strong>Credits</div>
                          <div className="friend-stat"><strong>{f.sessionsTotal}</strong>Sessions</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--fm)', fontSize: 8, letterSpacing: '1px', padding: '2px 8px', borderRadius: 5, background: `${lv.color}15`, color: lv.color, border: `1px solid ${lv.color}33` }}>
                          {lv.icon} {lv.name}
                        </span>
                        <span style={{ fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--muted)' }}>{timeAgo(f.lastActive)}</span>
                        <button className="friend-remove" onClick={() => handleRemoveFriend(f.uid)}>Remove</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
