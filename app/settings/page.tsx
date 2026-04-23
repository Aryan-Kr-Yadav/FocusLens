'use client'

import { useState, useEffect } from 'react'
import CosmicTopbar from '../CosmicTopbar'
import '../cosmic.css'

const DEFAULT_SETTINGS = {
  focusThreshold: 75,
  minSessionMins: 2,
  micEnabled: true,
  notifyOnDistraction: true,
  autoSave: true,
  darkMode: true,
  soundscape: false,
  showHistory: true,
  quoteRotation: 30,
  creditAlerts: true,
}

type Settings = typeof DEFAULT_SETTINGS

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('fl_settings') || 'null')
      if (stored) setSettings({ ...DEFAULT_SETTINGS, ...stored })
    } catch { }
  }, [])

  const update = (key: keyof Settings, val: any) => {
    setSettings(prev => {
      const next = { ...prev, [key]: val }
      localStorage.setItem('fl_settings', JSON.stringify(next))
      return next
    })
  }

  const handleSave = () => {
    localStorage.setItem('fl_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = () => {
    if (!resetConfirm) { setResetConfirm(true); setTimeout(() => setResetConfirm(false), 3000); return }
    localStorage.removeItem('fl_settings')
    localStorage.removeItem('fl_credits')
    localStorage.removeItem('fl_redeemed')
    setSettings(DEFAULT_SETTINGS)
    window.dispatchEvent(new Event('fl_credits_changed'))
    setResetConfirm(false)
  }

  const Toggle = ({ id, label, sub }: { id: keyof Settings; label: string; sub?: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--white)', fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      <button
        onClick={() => update(id, !settings[id])}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: settings[id] ? 'var(--neon)' : 'var(--panel3)',
          position: 'relative', transition: 'all 0.25s', flexShrink: 0,
          boxShadow: settings[id] ? '0 0 10px rgba(57,255,156,0.35)' : 'none',
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          background: settings[id] ? '#000' : 'var(--muted)',
          position: 'absolute', top: 3,
          left: settings[id] ? 23 : 3,
          transition: 'all 0.25s',
        }} />
      </button>
    </div>
  )

  const Slider = ({ id, label, sub, min, max, step, unit }: { id: keyof Settings; label: string; sub?: string; min: number; max: number; step: number; unit: string }) => (
    <div style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--white)', fontWeight: 500 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
        </div>
        <div style={{ fontFamily: 'var(--fm)', fontSize: 14, fontWeight: 700, color: 'var(--plasma-l)' }}>
          {settings[id]}{unit}
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={settings[id] as number}
        onChange={e => update(id, Number(e.target.value))}
        style={{
          width: '100%', height: 4, borderRadius: 2, outline: 'none', cursor: 'pointer',
          appearance: 'none', WebkitAppearance: 'none',
          background: `linear-gradient(90deg, var(--plasma) ${((settings[id] as number - min) / (max - min)) * 100}%, rgba(124,58,255,0.15) 0%)`,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--fm)', fontSize: 9, color: 'var(--muted)' }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  )

  const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <div style={{ background: 'linear-gradient(135deg, var(--panel), var(--panel2))', border: '1px solid var(--border)', borderRadius: 20, padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(124,58,255,0.3),rgba(57,255,156,0.15),transparent)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(124,58,255,0.12)', border: '1px solid rgba(124,58,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
        <div style={{ fontFamily: 'var(--fd)', fontSize: 15, fontWeight: 700, color: 'var(--white)' }}>{title}</div>
      </div>
      {children}
    </div>
  )

  return (
    <>
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 16px; height: 16px;
          border-radius: 50%; background: var(--plasma-l);
          cursor: pointer; border: 2px solid rgba(124,58,255,0.4);
          box-shadow: 0 0 8px rgba(124,58,255,0.4);
        }
        input[type=range]::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--plasma-l); cursor: pointer;
          border: 2px solid rgba(124,58,255,0.4);
        }
      `}</style>

      <div className="scanlines" />
      <CosmicTopbar />
      <div style={{ position: 'relative', zIndex: 10 }} className="page-content">
        <div className="section-head">
          <div className="section-icon">◎</div>
          <div>
            <div className="section-title">Settings</div>
            <div className="section-sub">Customize your FocusLens experience</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
          <div>
            <Section title="Focus Tracking" icon="👁">
              <Slider id="focusThreshold" label="Focus Threshold" sub="Minimum focus % to qualify for credits" min={50} max={95} step={5} unit="%" />
              <Slider id="minSessionMins" label="Minimum Session Length" sub="Sessions shorter than this won't earn credits" min={1} max={10} step={1} unit="m" />
              <Toggle id="micEnabled" label="Microphone Detection" sub="Track ambient noise as a distraction signal" />
              <Toggle id="notifyOnDistraction" label="Distraction Alerts" sub="Show visual alerts when you look away" />
            </Section>

            <Section title="Quote & Motivation" icon="✦">
              <Slider id="quoteRotation" label="Quote Rotation Interval" sub="How often the motivational quote changes (seconds)" min={10} max={120} step={10} unit="s" />
            </Section>
          </div>

          <div>
            <Section title="App Behavior" icon="⚙️">
              <Toggle id="autoSave" label="Auto-Save Sessions" sub="Automatically save session data when you stop tracking" />
              <Toggle id="showHistory" label="Show Session History" sub="Display past sessions on the dashboard" />
              <Toggle id="creditAlerts" label="Credit Award Notifications" sub="Show popup when you earn focus credits" />
              <Toggle id="soundscape" label="Ambient Soundscape" sub="Play focus-enhancing sounds during sessions (requires Soundscape perk)" />
            </Section>

            <Section title="Danger Zone" icon="⚠️">
              <div style={{ padding: '12px 0' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
                  These actions cannot be undone. Your session history and credits will be permanently deleted.
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleReset}
                    style={{
                      padding: '9px 20px', borderRadius: 10, border: '1px solid rgba(255,61,138,0.3)',
                      background: resetConfirm ? 'rgba(255,61,138,0.15)' : 'rgba(255,61,138,0.05)',
                      color: 'var(--pulsar)', fontFamily: 'var(--fd)', fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.2s',
                      letterSpacing: 0.5, textTransform: 'uppercase',
                    }}
                  >
                    {resetConfirm ? '⚠ Click Again to Confirm' : '↺ Reset All Data'}
                  </button>
                </div>
              </div>
            </Section>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button className="btn-neon" onClick={handleSave}>
            {saved ? '✓ Saved!' : '✓ Save Settings'}
          </button>
          <button className="btn-ghost" onClick={() => { setSettings(DEFAULT_SETTINGS); localStorage.removeItem('fl_settings') }}>
            Reset to Defaults
          </button>
        </div>
      </div>
    </>
  )
}
