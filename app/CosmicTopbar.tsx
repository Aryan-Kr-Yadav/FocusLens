'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from './ThemeProvider'

export default function CosmicTopbar() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const { theme, toggle } = useTheme()
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)
  const [credits, setCredits] = useState(0)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = () => {
      const stored = localStorage.getItem('fl_credits')
      if (stored) setCredits(parseInt(stored, 10))
    }
    load()
    window.addEventListener('fl_credits_changed', load)
    window.addEventListener('storage', load)
    return () => {
      window.removeEventListener('fl_credits_changed', load)
      window.removeEventListener('storage', load)
    }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const displayName = user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'User'
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const milestone = Math.ceil((credits + 1) / 50) * 50
  const progress = ((credits % 50) / 50) * 100

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '◈' },
    { href: '/achievements', label: 'Achievements', icon: '◆' },
    { href: '/profile', label: 'Profile', icon: '◉' },
    { href: '/settings', label: 'Settings', icon: '◎' },
  ]

  const isDark = theme === 'dark'

  return (
    <>
      <style>{`
        /* Light mode topbar overrides */
        [data-theme="light"] .topbar {
          background: rgba(240,242,248,0.92) !important;
          border-bottom-color: rgba(109,40,217,0.15) !important;
        }
        [data-theme="light"] .profile-dropdown {
          background: #ffffff !important;
          border-color: rgba(109,40,217,0.2) !important;
          box-shadow: 0 24px 60px rgba(0,0,0,0.12) !important;
        }
        [data-theme="light"] .drop-header {
          background: linear-gradient(135deg,rgba(109,40,217,0.06),transparent) !important;
        }
        [data-theme="light"] .drop-item:hover {
          background: rgba(109,40,217,0.06) !important;
        }
        [data-theme="light"] .nav-link:hover {
          background: rgba(109,40,217,0.06) !important;
        }
        [data-theme="light"] .profile-btn {
          background: #f4f5fc !important;
        }

        /* Theme toggle button */
        .theme-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid var(--border2);
          background: var(--panel2);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(.4,0,.2,1);
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }
        .theme-toggle:hover {
          border-color: var(--plasma-l);
          background: rgba(124,58,255,0.08);
          transform: scale(1.05);
        }
        .theme-toggle:active { transform: scale(0.95); }

        .theme-icon {
          font-size: 16px;
          transition: all 0.3s cubic-bezier(.4,0,.2,1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Sun/moon animation on toggle */
        .theme-toggle.spinning .theme-icon {
          animation: themeSpin 0.4s cubic-bezier(.4,0,.2,1);
        }
        @keyframes themeSpin {
          0%   { transform: rotate(0deg) scale(1); }
          50%  { transform: rotate(180deg) scale(0.6); }
          100% { transform: rotate(360deg) scale(1); }
        }

        /* Light mode specific body backgrounds */
        [data-theme="light"] body::before {
          background:
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(109,40,217,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 110%, rgba(5,150,105,0.04) 0%, transparent 50%) !important;
        }
        [data-theme="light"] body::after {
          background-image:
            radial-gradient(circle 1px at 20% 30%, rgba(109,40,217,0.2) 0%, transparent 100%),
            radial-gradient(circle 1px at 80% 20%, rgba(109,40,217,0.15) 0%, transparent 100%),
            radial-gradient(circle 1px at 50% 70%, rgba(5,150,105,0.25) 0%, transparent 100%),
            linear-gradient(rgba(109,40,217,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(109,40,217,0.03) 1px, transparent 1px) !important;
          background-size: 100% 100%, 100% 100%, 100% 100%, 60px 60px, 60px 60px !important;
        }

        /* Light mode card overrides */
        [data-theme="light"] .card,
        [data-theme="light"] .cosmic-card,
        [data-theme="light"] .hcard,
        [data-theme="light"] .read,
        [data-theme="light"] .micro,
        [data-theme="light"] .av-stat,
        [data-theme="light"] .achieve-card,
        [data-theme="light"] .perk-card,
        [data-theme="light"] .set-sec,
        [data-theme="light"] .form-card,
        [data-theme="light"] .av-card,
        [data-theme="light"] .stat-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(244,245,252,0.9)) !important;
          border-color: rgba(109,40,217,0.12) !important;
        }
        [data-theme="light"] .card::before,
        [data-theme="light"] .hcard::before {
          background: linear-gradient(90deg, transparent, rgba(109,40,217,0.15), rgba(5,150,105,0.1), transparent) !important;
        }
        [data-theme="light"] .brand-name,
        [data-theme="light"] .land-logo-txt,
        [data-theme="light"] .hist-title,
        [data-theme="light"] .section-title,
        [data-theme="light"] .sec-title,
        [data-theme="light"] .achieve-title,
        [data-theme="light"] .perk-title,
        [data-theme="light"] .set-sec-title,
        [data-theme="light"] .av-nm,
        [data-theme="light"] .drop-name,
        [data-theme="light"] .dnm {
          color: #111827 !important;
        }
        [data-theme="light"] .cam-box { background: #e8eaf4 !important; }
        [data-theme="light"] .seg-bar { background: rgba(109,40,217,0.08) !important; }
        [data-theme="light"] .mic-track,
        [data-theme="light"] .hbar,
        [data-theme="light"] .cr-track,
        [data-theme="light"] .xp-track { background: rgba(109,40,217,0.08) !important; }

        /* Light mode load screen */
        [data-theme="light"] #loadScreen { background: #f0f2f8 !important; }

        /* Light mode motive banner */
        [data-theme="light"] .motive-banner {
          background: linear-gradient(135deg, rgba(109,40,217,0.06), rgba(5,150,105,0.03)) !important;
          border-color: rgba(109,40,217,0.18) !important;
        }
      `}</style>

      <div className="topbar">
        <Link href="/dashboard" className="brand">
          <div className="brand-eye">👁</div>
          <div className="brand-name">Focus<em>Lens</em></div>
        </Link>

        <nav className="nav-links">
          {navItems.map(n => (
            <Link key={n.href} href={n.href} className={`nav-link ${pathname === n.href ? 'active' : ''}`}>
              <span style={{ fontSize: 11 }}>{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Status chip */}
          <div id="statusChip" className="status-chip">
            <div className="sdot"></div>
            <span id="statusLbl">IDLE</span>
          </div>

          {/* ── THEME TOGGLE ── */}
          <button
            className="theme-toggle"
            onClick={(e) => {
              const btn = e.currentTarget
              btn.classList.add('spinning')
              setTimeout(() => btn.classList.remove('spinning'), 400)
              toggle()
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <div className="theme-icon">
              {isDark ? '☀️' : '🌙'}
            </div>
          </button>

          {/* Profile dropdown */}
          <div ref={dropRef} style={{ position: 'relative' }}>
            <button
              className={`profile-btn ${profileOpen ? 'open' : ''}`}
              onClick={() => setProfileOpen(o => !o)}
            >
              <div className="avatar-ring">
                {user?.imageUrl ? <img src={user.imageUrl} alt="" /> : initials}
              </div>
              <span className="profile-name">{displayName.split(' ')[0]}</span>
              <div className="credits-pill">🪙 {credits}</div>
              <span className="chevron">▼</span>
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                <div className="drop-header">
                  <div className="drop-avatar">
                    {user?.imageUrl ? <img src={user.imageUrl} alt="" /> : initials}
                  </div>
                  <div>
                    <div className="drop-name">{displayName}</div>
                    <div className="drop-email">{user?.emailAddresses?.[0]?.emailAddress}</div>
                  </div>
                </div>

                <div className="drop-credits">
                  <div className="drop-credits-row">
                    <div className="drop-credits-label">⚡ Focus Credits</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 18 }}>🪙</span>
                      <div className="drop-credits-val">{credits}</div>
                    </div>
                  </div>
                  <div className="cr-track">
                    <div className="cr-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="cr-hint">
                    Stay focused 75%+ for 2+ min to earn 5 credits. {milestone - credits} credits to next milestone!
                  </div>
                </div>

                <div className="drop-menu">
                  <Link href="/profile" className="drop-item" onClick={() => setProfileOpen(false)}>
                    <div className="drop-item-icon">✏️</div>
                    Edit Profile
                  </Link>
                  <Link href="/achievements" className="drop-item" onClick={() => setProfileOpen(false)}>
                    <div className="drop-item-icon">🏆</div>
                    Achievements
                  </Link>
                  <Link href="/settings" className="drop-item" onClick={() => setProfileOpen(false)}>
                    <div className="drop-item-icon">⚙️</div>
                    Settings
                  </Link>

                  {/* Theme toggle inside dropdown too */}
                  <button className="drop-item" onClick={() => { toggle(); setProfileOpen(false) }}>
                    <div className="drop-item-icon">{isDark ? '☀️' : '🌙'}</div>
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </button>

                  <div className="drop-divider" />
                  <button
                    className="drop-item danger"
                    onClick={() => { setProfileOpen(false); signOut({ redirectUrl: '/' }) }}
                  >
                    <div className="drop-item-icon">↩</div>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
