'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import CosmicTopbar from '../CosmicTopbar'
import '../cosmic.css'

const CREDIT_PERKS = [
  { id: 'focus_theme', icon: '🎨', title: 'Nebula Theme', desc: 'Unlock a deep purple nebula dashboard skin', cost: 50, category: 'cosmetic' },
  { id: 'export_pdf', icon: '📊', title: 'Session PDF Export', desc: 'Export your focus history as a beautiful PDF report', cost: 30, category: 'productivity' },
  { id: 'pomodoro', icon: '🍅', title: 'Pomodoro Mode', desc: 'Auto-schedule 25min focus blocks with 5min breaks', cost: 40, category: 'productivity' },
  { id: 'streak_shield', icon: '🛡', title: 'Streak Shield', desc: 'Protect your streak if you miss a day once', cost: 25, category: 'protection' },
  { id: 'audio_cue', icon: '🔔', title: 'Focus Soundscape', desc: 'Ambient space sounds while tracking (lofi & binaural)', cost: 60, category: 'productivity' },
  { id: 'custom_goal', icon: '🎯', title: 'Custom Focus Goal', desc: 'Set a personalized daily focus time target', cost: 20, category: 'productivity' },
]

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const [credits, setCredits] = useState(0)
  const [redeemed, setRedeemed] = useState<string[]>([])
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'profile' | 'credits'>('profile')

  useEffect(() => {
    if (user) setDisplayName(user.fullName || user.firstName || '')
    const c = parseInt(localStorage.getItem('fl_credits') || '0', 10)
    setCredits(c)
    try { setRedeemed(JSON.parse(localStorage.getItem('fl_redeemed') || '[]')) } catch { }
    const onUpdate = () => {
      setCredits(parseInt(localStorage.getItem('fl_credits') || '0', 10))
    }
    window.addEventListener('fl_credits_changed', onUpdate)
    window.addEventListener('storage', onUpdate)
    return () => { window.removeEventListener('fl_credits_changed', onUpdate); window.removeEventListener('storage', onUpdate) }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      const [firstName, ...rest] = displayName.trim().split(' ')
      await user?.update({ firstName, lastName: rest.join(' ') || undefined })
      setSaveMsg('✓ Profile updated!')
    } catch {
      setSaveMsg('✗ Update failed')
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const handleRedeem = (perk: typeof CREDIT_PERKS[0]) => {
    if (credits < perk.cost || redeemed.includes(perk.id)) return
    const newCredits = credits - perk.cost
    const newRedeemed = [...redeemed, perk.id]
    localStorage.setItem('fl_credits', String(newCredits))
    localStorage.setItem('fl_redeemed', JSON.stringify(newRedeemed))
    setCredits(newCredits)
    setRedeemed(newRedeemed)
    window.dispatchEvent(new Event('fl_credits_changed'))
  }

  const totalSessions = (() => {
    try {
      const uid = (user?.id || 'guest')
      const s = JSON.parse(localStorage.getItem('fl_s_' + uid) || localStorage.getItem('fl_s_guest') || '[]')
      return s.length
    } catch { return 0 }
  })()

  if (!isLoaded) return null

  return (
    <>
      <style>{`
        .profile-root { position: relative; z-index: 10; }
        .profile-grid { display: grid; grid-template-columns: 300px 1fr; gap: 20px; align-items: start; }
        @media(max-width:768px) { .profile-grid{grid-template-columns:1fr} }

        /* Avatar card */
        .avatar-card {
          background: linear-gradient(135deg, rgba(14,17,32,0.95), rgba(19,22,40,0.9));
          border: 1px solid rgba(124,58,255,0.15);
          border-radius: 20px; padding: 28px 24px;
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          position: relative; overflow: hidden;
        }
        .avatar-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(124,58,255,0.4),rgba(57,255,156,0.2),transparent); }
        .big-avatar {
          width: 90px; height: 90px; border-radius: 50%;
          background: linear-gradient(135deg, var(--plasma), var(--star));
          display: flex; align-items: center; justify-content: center;
          font-family: var(--fd); font-size: 34px; font-weight: 900;
          color: #fff; overflow: hidden;
          border: 3px solid rgba(124,58,255,0.4);
          box-shadow: 0 0 30px rgba(124,58,255,0.25);
        }
        .big-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-name { font-family: var(--fd); font-size: 18px; font-weight: 700; color: var(--white); text-align: center; }
        .avatar-email { font-size: 11px; color: var(--muted); text-align: center; }
        .avatar-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; margin-top: 8px; }
        .av-stat { background: var(--panel2); border: 1px solid var(--border); border-radius: 10px; padding: 12px; text-align: center; }
        .av-stat-val { font-family: var(--fd); font-size: 22px; font-weight: 900; color: var(--neon); line-height: 1; }
        .av-stat-lbl { font-family: var(--fm); font-size: 8px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-top: 4px; }
        .credits-big { font-family: var(--fd); font-size: 36px; font-weight: 900; color: var(--amber); text-shadow: 0 0 20px rgba(255,176,32,0.3); }

        /* Tabs */
        .tab-row { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
        .tab-btn { padding: 10px 20px; border-radius: 10px 10px 0 0; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; background: transparent; color: var(--muted); font-family: var(--fi); border-bottom: 2px solid transparent; }
        .tab-btn:hover { color: var(--text); }
        .tab-btn.active { color: var(--plasma-l); border-bottom-color: var(--plasma-l); }

        /* Form card */
        .form-card {
          background: linear-gradient(135deg, rgba(14,17,32,0.95), rgba(19,22,40,0.9));
          border: 1px solid rgba(124,58,255,0.15);
          border-radius: 20px; padding: 28px;
          position: relative; overflow: hidden;
        }
        .form-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(124,58,255,0.4),rgba(57,255,156,0.2),transparent); }

        .save-msg { font-size: 12px; color: var(--neon); font-family: var(--fm); margin-top: 12px; min-height: 20px; }

        /* Perks grid */
        .perks-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
        .perk-card {
          background: linear-gradient(135deg, rgba(14,17,32,0.9), rgba(19,22,40,0.8));
          border: 1px solid rgba(124,58,255,0.12);
          border-radius: 14px; padding: 18px;
          transition: all 0.3s; position: relative; overflow: hidden;
        }
        .perk-card:hover:not(.redeemed) { border-color: rgba(124,58,255,0.3); transform: translateY(-2px); }
        .perk-card.redeemed { border-color: rgba(57,255,156,0.25); }
        .perk-card.cant-afford { opacity: 0.5; }
        .perk-top { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
        .perk-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(124,58,255,0.1); border: 1px solid rgba(124,58,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .perk-title { font-family: var(--fd); font-size: 13px; font-weight: 700; color: var(--white); margin-bottom: 4px; }
        .perk-desc { font-size: 11px; color: var(--muted); line-height: 1.5; }
        .perk-footer { display: flex; align-items: center; justify-content: space-between; }
        .perk-cost { display: flex; align-items: center; gap: 5px; font-family: var(--fd); font-size: 14px; font-weight: 700; color: var(--amber); }
        .perk-btn {
          padding: 6px 16px; border-radius: 8px; font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all 0.2s; border: none;
          font-family: var(--fd); letter-spacing: 0.3px;
        }
        .perk-btn.active { background: linear-gradient(135deg, var(--plasma), var(--plasma-l)); color: #fff; }
        .perk-btn.active:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,58,255,0.3); }
        .perk-btn.disabled { background: rgba(255,255,255,0.05); color: var(--muted); cursor: not-allowed; }
        .perk-btn.done { background: rgba(57,255,156,0.1); color: var(--neon); border: 1px solid rgba(57,255,156,0.2); cursor: default; }

        .category-tag { display: inline-flex; padding: 2px 8px; border-radius: 4px; font-family: var(--fm); font-size: 8px; letter-spacing: 1px; text-transform: uppercase; background: rgba(124,58,255,0.08); color: var(--plasma-l); margin-bottom: 8px; }
      `}</style>

      <div className="scanlines" />
      <CosmicTopbar />
      <div className="profile-root page-content">
        <div className="section-head">
          <div className="section-icon">◉</div>
          <div>
            <div className="section-title">Profile</div>
            <div className="section-sub">Manage your identity and spend your focus credits</div>
          </div>
        </div>

        <div className="profile-grid">
          {/* Left: avatar card */}
          <div className="avatar-card">
            <div className="big-avatar">
              {user?.imageUrl ? <img src={user.imageUrl} alt="" /> : (user?.fullName || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div className="avatar-name">{user?.fullName || user?.firstName || 'Explorer'}</div>
            <div className="avatar-email">{user?.emailAddresses?.[0]?.emailAddress}</div>
            <div className="avatar-stats">
              <div className="av-stat">
                <div className="av-stat-val">{totalSessions}</div>
                <div className="av-stat-lbl">Sessions</div>
              </div>
              <div className="av-stat" style={{ gridColumn: '1 / -1' }}>
                <div className="credits-big">🪙 {credits}</div>
                <div className="av-stat-lbl">Focus Credits</div>
              </div>
            </div>
          </div>

          {/* Right: tabs */}
          <div>
            <div className="tab-row">
              <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Edit Profile</button>
              <button className={`tab-btn ${activeTab === 'credits' ? 'active' : ''}`} onClick={() => setActiveTab('credits')}>Spend Credits</button>
            </div>

            {activeTab === 'profile' && (
              <div className="form-card">
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input
                    className="form-input"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Your name..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" value={user?.emailAddresses?.[0]?.emailAddress || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">User ID</label>
                  <input className="form-input" value={user?.id || ''} disabled style={{ opacity: 0.4, cursor: 'not-allowed', fontFamily: 'var(--fm)', fontSize: 11 }} />
                </div>
                <button className="btn-neon" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
                  {saving ? '⟳ Saving…' : '✓ Save Changes'}
                </button>
                {saveMsg && <div className="save-msg">{saveMsg}</div>}
              </div>
            )}

            {activeTab === 'credits' && (
              <div>
                <div style={{ marginBottom: 20, padding: '14px 20px', background: 'rgba(255,176,32,0.05)', border: '1px solid rgba(255,176,32,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 28 }}>🪙</span>
                  <div>
                    <div style={{ fontFamily: 'var(--fd)', fontSize: 22, fontWeight: 900, color: 'var(--amber)' }}>{credits} Credits Available</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Earn 5 credits per session with 75%+ focus for 2+ minutes</div>
                  </div>
                </div>
                <div className="perks-grid">
                  {CREDIT_PERKS.map(perk => {
                    const isRedeemed = redeemed.includes(perk.id)
                    const canAfford = credits >= perk.cost
                    return (
                      <div key={perk.id} className={`perk-card ${isRedeemed ? 'redeemed' : !canAfford ? 'cant-afford' : ''}`}>
                        <div className="category-tag">{perk.category}</div>
                        <div className="perk-top">
                          <div className="perk-icon">{perk.icon}</div>
                          <div>
                            <div className="perk-title">{perk.title}</div>
                            <div className="perk-desc">{perk.desc}</div>
                          </div>
                        </div>
                        <div className="perk-footer">
                          <div className="perk-cost">🪙 {perk.cost}</div>
                          {isRedeemed
                            ? <button className="perk-btn done">✓ Unlocked</button>
                            : <button className={`perk-btn ${canAfford ? 'active' : 'disabled'}`} onClick={() => handleRedeem(perk)}>
                                {canAfford ? 'Redeem' : `Need ${perk.cost - credits} more`}
                              </button>
                          }
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
