'use client'

import { useEffect, useState } from 'react'
import CosmicTopbar from '../CosmicTopbar'
import '../cosmic.css'

const ACHIEVEMENTS = [
  {
    id: 'first_session', icon: '🚀', title: 'Launchpad',
    desc: 'Complete your first focus session',
    condition: (stats: any) => stats.totalSessions >= 1,
    tier: 'bronze', xp: 10,
  },
  {
    id: 'focus_75', icon: '🎯', title: 'On Target',
    desc: 'Achieve 75%+ focus in a session',
    condition: (stats: any) => stats.bestFocus >= 75,
    tier: 'bronze', xp: 15,
  },
  {
    id: 'five_sessions', icon: '🔥', title: 'Signal Strong',
    desc: 'Complete 5 focus sessions',
    condition: (stats: any) => stats.totalSessions >= 5,
    tier: 'silver', xp: 25,
  },
  {
    id: 'focus_90', icon: '💎', title: 'Deep Space Focus',
    desc: 'Achieve 90%+ focus in a session',
    condition: (stats: any) => stats.bestFocus >= 90,
    tier: 'gold', xp: 50,
  },
  {
    id: 'ten_sessions', icon: '🌟', title: 'Orbit Established',
    desc: 'Complete 10 focus sessions',
    condition: (stats: any) => stats.totalSessions >= 10,
    tier: 'silver', xp: 40,
  },
  {
    id: 'two_hours', icon: '⏱', title: 'Time Traveler',
    desc: 'Accumulate 2 hours of total focus time',
    condition: (stats: any) => stats.totalFocusSecs >= 7200,
    tier: 'gold', xp: 60,
  },
  {
    id: 'credits_50', icon: '🪙', title: 'Credit Collector',
    desc: 'Earn 50 focus credits',
    condition: (stats: any) => stats.credits >= 50,
    tier: 'silver', xp: 30,
  },
  {
    id: 'credits_200', icon: '💰', title: 'Cosmic Banker',
    desc: 'Earn 200 focus credits',
    condition: (stats: any) => stats.credits >= 200,
    tier: 'gold', xp: 75,
  },
  {
    id: 'perfect_session', icon: '✨', title: 'Singularity',
    desc: 'Achieve 100% focus for 5+ minutes',
    condition: (stats: any) => stats.perfectSessions >= 1,
    tier: 'platinum', xp: 100,
  },
  {
    id: 'twenty_five_sessions', icon: '🌌', title: 'Cosmic Veteran',
    desc: 'Complete 25 focus sessions',
    condition: (stats: any) => stats.totalSessions >= 25,
    tier: 'platinum', xp: 100,
  },
  {
    id: 'five_hours', icon: '⚡', title: 'Power Surge',
    desc: 'Accumulate 5 hours of total focus time',
    condition: (stats: any) => stats.totalFocusSecs >= 18000,
    tier: 'gold', xp: 80,
  },
  {
    id: 'credits_500', icon: '👑', title: 'Space Baron',
    desc: 'Earn 500 focus credits',
    condition: (stats: any) => stats.credits >= 500,
    tier: 'platinum', xp: 150,
  },
]

const TIER_COLORS: Record<string, { color: string; glow: string; bg: string; label: string }> = {
  bronze:   { color: '#cd7f32', glow: 'rgba(205,127,50,0.3)',  bg: 'rgba(205,127,50,0.08)',  label: 'Bronze' },
  silver:   { color: '#a8b2c1', glow: 'rgba(168,178,193,0.3)', bg: 'rgba(168,178,193,0.06)', label: 'Silver' },
  gold:     { color: '#ffb020', glow: 'rgba(255,176,32,0.35)', bg: 'rgba(255,176,32,0.08)',  label: 'Gold' },
  platinum: { color: '#a855f7', glow: 'rgba(168,85,247,0.4)',  bg: 'rgba(168,85,247,0.1)',   label: 'Platinum' },
}

function getStats() {
  try {
    const sessions = JSON.parse(localStorage.getItem('fl_s_' + ((window as any)._flUid || 'guest')) || '[]')
    const credits = parseInt(localStorage.getItem('fl_credits') || '0', 10)
    return {
      totalSessions: sessions.length,
      bestFocus: sessions.reduce((m: number, s: any) => Math.max(m, s.focusPercent || 0), 0),
      totalFocusSecs: sessions.reduce((m: number, s: any) => m + (s.focusedSecs || 0), 0),
      credits,
      perfectSessions: sessions.filter((s: any) => s.focusPercent >= 100 && s.totalSecs >= 300).length,
    }
  } catch { return { totalSessions: 0, bestFocus: 0, totalFocusSecs: 0, credits: 0, perfectSessions: 0 } }
}

export default function AchievementsPage() {
  const [stats, setStats] = useState({ totalSessions: 0, bestFocus: 0, totalFocusSecs: 0, credits: 0, perfectSessions: 0 })
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')

  useEffect(() => {
    setStats(getStats())
    const onUpdate = () => setStats(getStats())
    window.addEventListener('storage', onUpdate)
    window.addEventListener('fl_credits_changed', onUpdate)
    return () => { window.removeEventListener('storage', onUpdate); window.removeEventListener('fl_credits_changed', onUpdate) }
  }, [])

  const unlocked = ACHIEVEMENTS.filter(a => a.condition(stats))
  const locked = ACHIEVEMENTS.filter(a => !a.condition(stats))
  const filtered = filter === 'all' ? ACHIEVEMENTS : filter === 'unlocked' ? unlocked : locked
  const totalXP = unlocked.reduce((s, a) => s + a.xp, 0)

  const fmt = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`

  return (
    <>
      <style>{`
        .achieve-root { position: relative; z-index: 10; }
        .stats-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
        .stat-card {
          background: linear-gradient(135deg, rgba(14,17,32,0.9), rgba(19,22,40,0.8));
          border: 1px solid rgba(124,58,255,0.15);
          border-radius: 14px; padding: 18px 20px;
          position: relative; overflow: hidden;
        }
        .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(124,58,255,0.3),transparent); }
        .stat-val { font-family: var(--fd); font-size: 32px; font-weight: 900; color: var(--white); letter-spacing: -1px; line-height: 1; margin-bottom: 4px; }
        .stat-lbl { font-family: var(--fm); font-size: 8px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); }
        .stat-accent { color: var(--neon); }

        .filter-row { display: flex; gap: 8px; margin-bottom: 24px; }
        .filter-btn {
          padding: 7px 18px; border-radius: 8px; font-size: 11px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; border: 1px solid var(--border2);
          background: transparent; color: var(--muted); font-family: var(--fi);
        }
        .filter-btn:hover { color: var(--text); border-color: rgba(124,58,255,0.3); }
        .filter-btn.active { background: rgba(124,58,255,0.12); border-color: var(--plasma-l); color: var(--plasma-l); }

        .achieve-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }

        .achieve-card {
          background: linear-gradient(135deg, rgba(14,17,32,0.95), rgba(19,22,40,0.9));
          border: 1px solid rgba(124,58,255,0.1);
          border-radius: 16px; padding: 20px;
          position: relative; overflow: hidden;
          transition: all 0.3s;
        }
        .achieve-card.unlocked { border-color: var(--tier-color, rgba(57,255,156,0.25)); }
        .achieve-card.unlocked:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.3), 0 0 20px var(--tier-glow, rgba(57,255,156,0.1)); }
        .achieve-card.locked { opacity: 0.5; filter: grayscale(0.6); }
        .achieve-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--tier-color, rgba(124,58,255,0.3)),transparent); }

        .achieve-top { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 12px; }
        .achieve-icon-wrap {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; flex-shrink: 0;
          background: var(--tier-bg, rgba(124,58,255,0.1));
          border: 1px solid var(--tier-color, rgba(124,58,255,0.2));
        }
        .achieve-title { font-family: var(--fd); font-size: 14px; font-weight: 700; color: var(--white); margin-bottom: 4px; }
        .achieve-desc { font-size: 11px; color: var(--muted); line-height: 1.5; }
        .achieve-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }
        .achieve-tier { display: flex; align-items: center; gap: 5px; font-family: var(--fm); font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--tier-color, var(--muted)); }
        .achieve-xp { font-family: var(--fd); font-size: 13px; font-weight: 700; color: var(--plasma-l); }
        .achieve-check { font-size: 16px; }
        .locked-hint { font-family: var(--fm); font-size: 9px; color: var(--muted); letter-spacing: 1px; }

        .xp-banner {
          background: linear-gradient(135deg, rgba(124,58,255,0.12), rgba(57,255,156,0.05));
          border: 1px solid rgba(124,58,255,0.2);
          border-radius: 14px; padding: 20px 24px;
          display: flex; align-items: center; gap: 20px;
          margin-bottom: 28px;
        }
        .xp-val { font-family: var(--fd); font-size: 48px; font-weight: 900; color: var(--plasma-l); letter-spacing: -2px; line-height: 1; }
        .xp-lbl { font-family: var(--fm); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-top: 4px; }
        .xp-bar-wrap { flex: 1; }
        .xp-bar-track { height: 6px; background: rgba(124,58,255,0.1); border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
        .xp-bar-fill { height: 100%; background: linear-gradient(90deg, var(--plasma), var(--plasma-l)); border-radius: 3px; transition: width 1s ease; }
        .xp-counts { display: flex; justify-content: space-between; font-family: var(--fm); font-size: 10px; color: var(--muted); }

        @media(max-width:640px) { .stats-bar{grid-template-columns:repeat(2,1fr)} }
      `}</style>

      <div className="scanlines" />
      <CosmicTopbar />
      <div className="achieve-root page-content">
        <div className="section-head">
          <div className="section-icon">🏆</div>
          <div>
            <div className="section-title">Achievements</div>
            <div className="section-sub">{unlocked.length} of {ACHIEVEMENTS.length} unlocked · Earn by completing focus sessions</div>
          </div>
        </div>

        {/* XP banner */}
        <div className="xp-banner">
          <div>
            <div className="xp-val">{totalXP}</div>
            <div className="xp-lbl">Total XP Earned</div>
          </div>
          <div className="xp-bar-wrap">
            <div className="xp-bar-track">
              <div className="xp-bar-fill" style={{ width: `${Math.min((totalXP / 700) * 100, 100)}%` }} />
            </div>
            <div className="xp-counts">
              <span>{unlocked.length} achievements</span>
              <span>{totalXP} / 700 XP</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-bar">
          {[
            { val: stats.totalSessions, lbl: 'Sessions', accent: false },
            { val: `${stats.bestFocus}%`, lbl: 'Best Focus', accent: true },
            { val: fmt(stats.totalFocusSecs), lbl: 'Total Focus Time', accent: false },
            { val: stats.credits, lbl: 'Credits Earned', accent: true },
          ].map(s => (
            <div className="stat-card" key={s.lbl}>
              <div className={`stat-val ${s.accent ? 'stat-accent' : ''}`}>{s.val}</div>
              <div className="stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="filter-row">
          {(['all', 'unlocked', 'locked'] as const).map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? `All (${ACHIEVEMENTS.length})` : f === 'unlocked' ? `Unlocked (${unlocked.length})` : `Locked (${locked.length})`}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="achieve-grid">
          {filtered.map(a => {
            const isUnlocked = a.condition(stats)
            const tc = TIER_COLORS[a.tier]
            return (
              <div
                key={a.id}
                className={`achieve-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                style={{ ['--tier-color' as any]: tc.color, ['--tier-glow' as any]: tc.glow, ['--tier-bg' as any]: tc.bg }}
              >
                <div className="achieve-top">
                  <div className="achieve-icon-wrap">{a.icon}</div>
                  <div>
                    <div className="achieve-title">{a.title}</div>
                    <div className="achieve-desc">{a.desc}</div>
                  </div>
                </div>
                <div className="achieve-footer">
                  <div className="achieve-tier">◆ {tc.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="achieve-xp">+{a.xp} XP</div>
                    {isUnlocked
                      ? <div className="achieve-check">✅</div>
                      : <div className="locked-hint">LOCKED</div>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
