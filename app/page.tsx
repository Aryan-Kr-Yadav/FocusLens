'use client'

import { SignedIn, SignedOut } from '@clerk/nextjs'
import { useEffect, useState, useRef } from 'react'
import { useTheme } from './ThemeProvider'
import './cosmic.css'

const PARTICLES = Array.from({ length: 60 }, (_, i) => ({
  id: i, x: Math.random() * 100, y: Math.random() * 100,
  size: Math.random() * 2 + 0.5, delay: Math.random() * 8, dur: Math.random() * 12 + 8,
  color: i % 5 === 0 ? '#39ff9c' : i % 7 === 0 ? '#00d4ff' : i % 11 === 0 ? '#a855f7' : 'rgba(255,255,255,0.6)',
}))

const ORBIT_RINGS = [
  { r: 140, speed: 20, dot: '#39ff9c' },
  { r: 200, speed: 35, dot: '#00d4ff' },
  { r: 260, speed: 55, dot: '#a855f7' },
]

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [mouse, setMouse] = useState({ x: 50, y: 50 })
  const [tick, setTick] = useState(0)
 const raf = useRef<number | null>(null)

  useEffect(() => {
    setMounted(true)
    const handleMouse = (e: MouseEvent) => setMouse({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 })
    window.addEventListener('mousemove', handleMouse)
    let start: number
    const animate = (ts: number) => {
      if (!start) start = ts
      setTick(ts - start)
      raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)
 return () => {
    window.removeEventListener('mousemove', handleMouse) // Add this line
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current)
    }
  }
}, [])

  return (
    <>
      <style>{`
        .land-root {
          min-height: 100vh; background: var(--void);
          position: relative; overflow: hidden;
          display: flex; flex-direction: column;
        }

        /* Starfield particles */
        .particles { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
        .star-p {
          position: absolute; border-radius: 50%;
          animation: starFloat var(--dur) var(--delay) infinite ease-in-out;
        }
        @keyframes starFloat {
          0% { opacity: 0; transform: translateY(10px) scale(0.5); }
          30% { opacity: 1; }
          70% { opacity: 0.4; }
          100% { opacity: 0; transform: translateY(-80px) scale(0.2); }
        }

        /* Dynamic nebula glow */
        .nebula {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          transition: background 0.3s ease;
        }

        /* Corner brackets */
        .bracket { position: fixed; width: 50px; height: 50px; border-color: rgba(124,58,255,0.25); border-style: solid; pointer-events: none; z-index: 5; }
        .br-tl { top: 16px; left: 16px; border-width: 1px 0 0 1px; }
        .br-tr { top: 16px; right: 16px; border-width: 1px 1px 0 0; }
        .br-bl { bottom: 16px; left: 16px; border-width: 0 0 1px 1px; }
        .br-br { bottom: 16px; right: 16px; border-width: 0 1px 1px 0; }

        /* Orbit visual */
        .orbit-system {
          position: absolute; right: 5%; top: 50%;
          transform: translateY(-50%);
          width: 560px; height: 560px;
          pointer-events: none;
        }
        .orbit-center {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 80px; height: 80px; border-radius: 50%;
          background: linear-gradient(135deg, var(--neon), var(--star));
          display: flex; align-items: center; justify-content: center;
          font-size: 36px;
          box-shadow: 0 0 40px rgba(57,255,156,0.5), 0 0 80px rgba(57,255,156,0.2), 0 0 120px rgba(57,255,156,0.08);
          animation: pulseCenter 3s ease-in-out infinite;
          z-index: 2;
        }
        @keyframes pulseCenter { 0%,100%{box-shadow:0 0 40px rgba(57,255,156,0.5),0 0 80px rgba(57,255,156,0.2)} 50%{box-shadow:0 0 60px rgba(57,255,156,0.7),0 0 120px rgba(57,255,156,0.3),0 0 200px rgba(57,255,156,0.1)} }

        .orbit-ring {
          position: absolute; top: 50%; left: 50%;
          border: 1px solid rgba(124,58,255,0.15);
          border-radius: 50%;
          transform-origin: 0 0;
        }
        .orbit-dot {
          position: absolute; top: 0; left: 50%;
          width: 10px; height: 10px; border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 10px currentColor;
        }

        /* Main content */
        .land-content {
          position: relative; z-index: 10;
          min-height: 100vh;
          display: flex; flex-direction: column;
          align-items: flex-start; justify-content: center;
          padding: 80px 8% 80px;
          max-width: 700px;
        }

        /* Logo */
        .land-logo { display: flex; align-items: center; gap: 14px; margin-bottom: 32px; animation: fadeUpIn 0.8s ease both; }
        .land-eye {
          width: 56px; height: 56px; border-radius: 16px;
          background: linear-gradient(135deg, var(--neon), var(--star));
          display: flex; align-items: center; justify-content: center;
          font-size: 26px;
          box-shadow: var(--glow-green);
          animation: pulseCenter 3s ease-in-out infinite;
        }
        .land-logo-txt { font-family: var(--fd); font-size: 40px; font-weight: 900; color: var(--white); letter-spacing: -2px; }
        .land-logo-txt em { color: var(--neon); font-style: normal; }

        /* Eyebrow */
        .eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 5px 14px; border-radius: 20px;
          background: rgba(124,58,255,0.1);
          border: 1px solid rgba(124,58,255,0.25);
          font-family: var(--fm); font-size: 9px; letter-spacing: 3px;
          text-transform: uppercase; color: var(--plasma-l);
          margin-bottom: 20px; animation: fadeUpIn 0.85s 0.05s ease both;
        }
        .eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--plasma-l); box-shadow: 0 0 6px var(--plasma-l); animation: blink 2s infinite; }

        /* Headline */
        .land-h1 {
          font-family: var(--fd); font-weight: 900; color: var(--white);
          font-size: clamp(42px, 6vw, 80px); line-height: 0.92;
          letter-spacing: -4px; margin-bottom: 24px;
          animation: fadeUpIn 0.9s 0.1s ease both;
        }
        .land-h1 .acc { color: var(--neon); display: block; }
        .land-h1 .plasma { background: linear-gradient(135deg, var(--plasma-l), var(--star)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        /* Sub */
        .land-sub { font-size: 16px; color: var(--text); line-height: 1.8; max-width: 480px; margin-bottom: 40px; animation: fadeUpIn 1s 0.15s ease both; font-weight: 300; }

        /* CTA */
        .land-ctas { display: flex; gap: 14px; margin-bottom: 64px; animation: fadeUpIn 1.1s 0.2s ease both; flex-wrap: wrap; }

        /* Feature chips */
        .feat-chips { display: flex; flex-wrap: wrap; gap: 10px; animation: fadeUpIn 1.2s 0.3s ease both; }
        .feat-chip {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px; border-radius: 10px;
          background: rgba(14,17,32,0.8);
          border: 1px solid var(--border2);
          backdrop-filter: blur(10px);
          font-size: 12px; color: var(--text);
          transition: all 0.3s;
        }
        .feat-chip:hover { border-color: rgba(57,255,156,0.3); color: var(--white); transform: translateY(-2px); }
        .feat-chip-icon { font-size: 16px; }
        .feat-chip-txt { font-weight: 500; }

        /* Signal line at bottom */
        .signal-line {
          position: fixed; bottom: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent 0%, var(--plasma) 30%, var(--neon) 50%, var(--star) 70%, transparent 100%);
          background-size: 200% 100%;
          animation: signalSweep 3s linear infinite;
          z-index: 20;
        }
        @keyframes signalSweep { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      <div className="land-root">
        {/* Nebula background */}
        <div className="nebula" style={{
          background: `radial-gradient(ellipse 60% 50% at ${mouse.x}% ${mouse.y}%, rgba(124,58,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 20% -10%, rgba(124,58,255,0.08) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 90% 110%, rgba(57,255,156,0.05) 0%, transparent 50%)`
        }} />

        <div className="scanlines" />

        {/* Corner brackets */}
        <div className="bracket br-tl" />
        <div className="bracket br-tr" />
        <div className="bracket br-bl" />
        <div className="bracket br-br" />

        {/* Particles */}
        {mounted && (
          <div className="particles">
            {PARTICLES.map(p => (
              <div key={p.id} className="star-p" style={{
                left: `${p.x}%`, top: `${p.y}%`,
                width: p.size, height: p.size,
                background: p.color,
                ['--dur' as any]: `${p.dur}s`,
                ['--delay' as any]: `${p.delay}s`,
              }} />
            ))}
          </div>
        )}

        {/* Orbit system */}
        {mounted && (
          <div className="orbit-system">
            <div className="orbit-center">👁</div>
            {ORBIT_RINGS.map((ring, i) => {
              const angle = (tick / 1000 / ring.speed) * Math.PI * 2
              const dx = Math.cos(angle) * ring.r
              const dy = Math.sin(angle) * ring.r
              return (
                <div key={i}>
                  <div className="orbit-ring" style={{
                    width: ring.r * 2, height: ring.r * 2,
                    marginLeft: -ring.r, marginTop: -ring.r,
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    width: 10, height: 10, borderRadius: '50%',
                    background: ring.dot, color: ring.dot,
                    transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
                    boxShadow: `0 0 12px ${ring.dot}, 0 0 24px ${ring.dot}44`,
                  }} />
                </div>
              )
            })}
          </div>
        )}

        {/* Main content */}
        <div className="land-content">
          <div className="land-logo">
            <div className="land-eye">👁</div>
            <div className="land-logo-txt">Focus<em>Lens</em></div>
          </div>

          <div className="eyebrow">
            <div className="eyebrow-dot" />
            Real-Time Eye Tracking · Focus Intelligence
          </div>

          <h1 className="land-h1">
            <span className="plasma">Your mind</span>
            <span className="acc">deserves</span>
            laser focus
          </h1>

          <p className="land-sub">
            FocusLens watches your eyes so you can watch your goals. Get real-time distraction alerts, track focus scores, and earn credits for every session you dominate.
          </p>

          <div className="land-ctas">
            <SignedOut>
              <a href="/sign-up" className="btn-neon" style={{ fontSize: 13, padding: '14px 36px', textDecoration: 'none', color: '#000' }}>
                ⚡ Launch Free
              </a>
              <a href="/sign-in" className="btn-ghost" style={{ fontSize: 13, padding: '13px 32px', textDecoration: 'none' }}>
                Sign In →
              </a>
            </SignedOut>
            <SignedIn>
              <a href="/dashboard" className="btn-neon" style={{ fontSize: 13, padding: '14px 36px' }}>
                Open Dashboard →
              </a>
            </SignedIn>
          </div>

          <div className="feat-chips">
            {[
              { icon: '👁', txt: 'Pupil & Blink Tracking' },
              { icon: '📡', txt: 'Gaze Detection' },
              { icon: '🎤', txt: 'Noise Alerts' },
              { icon: '🪙', txt: 'Credits & Rewards' },
              { icon: '📊', txt: 'Session History' },
            ].map(f => (
              <div className="feat-chip" key={f.txt}>
                <span className="feat-chip-icon">{f.icon}</span>
                <span className="feat-chip-txt">{f.txt}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="signal-line" />
      </div>
    </>
  )
}
