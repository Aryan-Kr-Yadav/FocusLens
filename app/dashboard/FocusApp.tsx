'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useEffect, useRef, useState, useCallback } from 'react'
import Script from 'next/script'
import CosmicTopbar from '../CosmicTopbar'

const DAILY_QUOTES = [
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Concentrate all your thoughts upon the work at hand.", author: "Alexander Graham Bell" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Focus is a matter of deciding what things you're not going to do.", author: "John Carmack" },
  { text: "The key to success is to focus our conscious mind on things we desire.", author: "Brian Tracy" },
  { text: "Do one thing at a time, and while doing it put your whole soul into it.", author: "Swami Vivekananda" },
  { text: "Your focus determines your reality.", author: "Qui-Gon Jinn" },
  { text: "The art of being wise is knowing what to overlook.", author: "William James" },
  { text: "Where focus goes, energy flows.", author: "Tony Robbins" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "Lack of direction, not lack of time, is the problem.", author: "Zig Ziglar" },
  { text: "The mind is everything. What you think, you become.", author: "Buddha" },
  { text: "Absorb what is useful, discard what is not, add what is uniquely your own.", author: "Bruce Lee" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Anonymous" },
  { text: "Great things never come from comfort zones.", author: "Roy T. Bennett" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "When something is important enough, you do it even if the odds are not in your favor.", author: "Elon Musk" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
  { text: "Opportunities don't happen, you create them.", author: "Chris Grosser" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "The harder I work, the luckier I get.", author: "Samuel Goldwyn" },
]

export default function FocusApp() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const injected = useRef(false)
  const [credits, setCredits] = useState(0)
  const [quote, setQuote] = useState(DAILY_QUOTES[0])
  const [quoteVisible, setQuoteVisible] = useState(true)
  const quoteInterval = useRef<NodeJS.Timeout | undefined>(undefined)

  // Rotate quotes
  const rotateQuote = useCallback(() => {
    setQuoteVisible(false)
    setTimeout(() => {
      setQuote(q => {
        const idx = DAILY_QUOTES.indexOf(q)
        return DAILY_QUOTES[(idx + 1) % DAILY_QUOTES.length]
      })
      setQuoteVisible(true)
    }, 400)
  }, [])

  useEffect(() => {
    // Random quote on mount
    setQuote(DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)])
    quoteInterval.current = setInterval(rotateQuote, 30000)
    return () => clearInterval(quoteInterval.current)
  }, [rotateQuote])

  // Load credits from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('fl_credits')
    if (stored) setCredits(parseInt(stored, 10))

    const onCredit = () => {
      const val = parseInt(localStorage.getItem('fl_credits') || '0', 10)
      setCredits(val)
    }
    window.addEventListener('fl_credits_changed', onCredit)
    window.addEventListener('storage', onCredit)
    return () => {
      window.removeEventListener('fl_credits_changed', onCredit)
      window.removeEventListener('storage', onCredit)
    }
  }, [])

  // Inject Clerk user into window for fl-app.js
  useEffect(() => {
    if (!user || injected.current) return
    injected.current = true
    ;(window as any).FL_USER = {
      email: user.emailAddresses[0]?.emailAddress ?? '',
      displayName: (user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress) ?? 'User',
      uid: user.id,
      photoURL: user.imageUrl ?? null,
      signOut: () => signOut({ redirectUrl: '/' }),
    }
  }, [user, signOut])

  return (
    <>
      <style>{`
        #appScreen { position: relative; z-index: 10; max-width: 1120px; margin: 0 auto; padding: 0 24px 80px; }

        .motive-banner {
          position: relative; margin: 18px 0;
          padding: 16px 22px;
          background: var(--motive-bg, linear-gradient(135deg, rgba(124,58,255,0.08), rgba(57,255,156,0.04)));
          border: 1px solid rgba(124,58,255,0.2);
          border-radius: 14px; display: flex; align-items: center; gap: 16px;
          overflow: hidden; transition: opacity 0.4s ease;
        }
        .motive-banner::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:linear-gradient(180deg,var(--plasma-l),var(--neon)); border-radius:3px 0 0 3px; }
        .motive-icon { font-size:20px; flex-shrink:0; }
        .motive-txt { font-family:var(--fi); font-size:13px; color:var(--white); font-style:italic; line-height:1.5; flex:1; font-weight:300; }
        .motive-author { font-family:var(--fm); font-size:9px; color:var(--neon); letter-spacing:1px; margin-top:3px; }
        .motive-day { font-family:var(--fm); font-size:9px; color:var(--muted); letter-spacing:1px; padding:4px 10px; border:1px solid var(--border); border-radius:4px; white-space:nowrap; flex-shrink:0; }

        .app-grid { display:grid; grid-template-columns:1fr 300px; gap:14px; margin-bottom:14px; }
        .left-col { display:flex; flex-direction:column; gap:14px; }

        .card {
          background: var(--card-bg, linear-gradient(135deg, rgba(14,17,32,0.95), rgba(19,22,40,0.9)));
          border: 1px solid rgba(124,58,255,0.12);
          border-radius:16px; padding:20px; position:relative; overflow:hidden;
        }
        .card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(124,58,255,0.3),rgba(57,255,156,0.2),transparent); }
        .card-tag { font-family:var(--fm); font-size:8px; letter-spacing:3px; text-transform:uppercase; color:var(--muted); margin-bottom:16px; display:flex; align-items:center; gap:8px; }
        .card-tag::after { content:''; flex:1; height:1px; background:rgba(124,58,255,0.15); }

        .score-row { display:flex; align-items:flex-end; margin-bottom:16px; }
        .score-big { font-family:var(--fd); font-size:96px; font-weight:900; line-height:0.85; letter-spacing:-6px; color:var(--white); transition:color 0.5s; }
        .score-big.g { color:var(--neon); text-shadow:0 0 30px rgba(57,255,156,0.25); }
        .score-big.m { color:var(--amber); }
        .score-big.b { color:var(--pulsar); }
        .score-side { padding-bottom:14px; margin-left:6px; }
        .score-pct { font-family:var(--fd); font-size:26px; font-weight:700; color:var(--muted); }
        .score-msg { font-size:11px; color:var(--muted); margin-top:4px; line-height:1.5; max-width:160px; }
        .ring-box { position:relative; width:72px; height:72px; margin-left:auto; flex-shrink:0; padding-bottom:14px; }
        .ring-box svg { transform:rotate(-90deg); }
        .ring-bg { fill:none; stroke:rgba(124,58,255,0.1); stroke-width:6; }
        .ring-fg { fill:none; stroke-width:6; stroke-linecap:round; stroke-dasharray:201; stroke-dashoffset:201; transition:stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1),stroke 0.4s; stroke:var(--neon); }

        .seg-bar { display:flex; height:4px; border-radius:3px; overflow:hidden; background:rgba(124,58,255,0.08); margin-bottom:16px; }
        .seg-bar > div:first-child { background:var(--neon); height:100%; transition:width 0.8s cubic-bezier(.4,0,.2,1); }
        .seg-bar > div:last-child { background:var(--pulsar); height:100%; transition:width 0.8s cubic-bezier(.4,0,.2,1); opacity:0.8; }

        .reads { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:16px; }
        .read { background:var(--panel2); border:1px solid var(--border); border-radius:10px; padding:10px 8px; }
        .rval { font-size:15px; font-weight:600; color:var(--white); letter-spacing:-0.3px; margin-bottom:2px; font-family:var(--fm); }
        .rlbl { font-size:8px; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); }

        .live-row { display:flex; align-items:center; justify-content:space-between; }
        .live-ind { display:flex; align-items:center; gap:5px; font-size:8px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); font-family:var(--fm); }
        .ldot { width:6px; height:6px; border-radius:50%; background:var(--muted); }
        .ldot.on { background:var(--neon); box-shadow:0 0 6px var(--neon); animation:blink 1.8s infinite; }
        #timerTxt { font-size:10px; color:var(--muted); font-family:var(--fm); }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .trows { display:flex; flex-direction:column; gap:12px; }
        .trow { display:flex; align-items:center; gap:10px; }
        .tbar { width:3px; height:30px; border-radius:2px; flex-shrink:0; }
        .tlbl { font-size:10px; color:var(--muted); }
        .tval { font-size:16px; font-weight:600; color:var(--white); letter-spacing:-0.3px; line-height:1; font-family:var(--fm); }
        .tpct { margin-left:auto; font-size:10px; color:var(--muted); font-family:var(--fm); }

        .cam-card { display:flex; flex-direction:column; }
        .cam-box { width:100%; aspect-ratio:4/3; background:var(--space); border:1px solid var(--border); border-radius:10px; overflow:hidden; position:relative; margin-bottom:12px; flex-shrink:0; }
        #videoEl { width:100%; height:100%; object-fit:cover; transform:scaleX(-1); display:none; }
        #camCanvas { position:absolute; top:0; left:0; width:100%; height:100%; transform:scaleX(-1); pointer-events:none; }
        .cam-ph { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; }
        .cam-icon { font-size:28px; color:var(--muted); }
        .cam-hint { font-size:10px; color:var(--muted); text-align:center; line-height:1.8; font-family:var(--fm); }
        .eye-badge { position:absolute; bottom:8px; left:8px; font-size:9px; letter-spacing:1px; text-transform:uppercase; padding:4px 10px; border-radius:4px; background:rgba(2,3,10,0.9); border:1px solid var(--border); color:var(--muted); transition:all 0.3s; font-family:var(--fm); }
        .eye-badge.foc { color:var(--neon); border-color:rgba(57,255,156,0.3); }
        .eye-badge.dis { color:var(--pulsar); border-color:rgba(255,61,138,0.3); }
        .mdl-badge { position:absolute; top:8px; right:8px; font-size:9px; letter-spacing:1px; text-transform:uppercase; padding:3px 8px; border-radius:4px; background:rgba(2,3,10,0.9); border:1px solid var(--border); color:var(--muted); font-family:var(--fm); }

        .micro-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; }
        .micro { background:var(--panel2); border:1px solid var(--border); border-radius:10px; padding:10px; }
        .mv { font-family:var(--fd); font-size:22px; font-weight:700; letter-spacing:-0.5px; color:var(--white); line-height:1; margin-bottom:2px; }
        .ml { font-size:8px; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); }

        .mic-strip { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
        .mic-lbl { font-size:9px; color:var(--muted); letter-spacing:1.5px; text-transform:uppercase; width:26px; font-family:var(--fm); }
        .mic-track { flex:1; height:4px; background:var(--panel2); border-radius:2px; overflow:hidden; }
        .mic-bar { height:100%; border-radius:2px; background:var(--star); width:0%; transition:width 0.15s; }
        .mic-bar.w { background:var(--amber); }
        .mic-bar.l { background:var(--pulsar); }

        .btn-primary { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:12px; border:none; border-radius:10px; background:linear-gradient(135deg,var(--neon),#00e87a); color:#000; font-family:var(--fd); font-size:11px; font-weight:900; letter-spacing:0.5px; text-transform:uppercase; cursor:pointer; transition:all 0.2s; box-shadow:0 0 20px rgba(57,255,156,0.3); }
        .btn-primary:hover:not(:disabled) { transform:translateY(-1px); filter:brightness(1.05); }
        .btn-primary:disabled { opacity:0.35; cursor:not-allowed; transform:none !important; }
        .btn-stop { display:flex; align-items:center; justify-content:center; width:100%; padding:12px; border:1px solid rgba(255,61,138,0.3); border-radius:10px; background:rgba(255,61,138,0.05); color:var(--pulsar); font-family:var(--fd); font-size:11px; font-weight:900; letter-spacing:0.5px; text-transform:uppercase; cursor:pointer; transition:all 0.2s; margin-top:8px; }
        .btn-stop:hover { background:rgba(255,61,138,0.12); border-color:var(--pulsar); }

        .app-alert { display:none; padding:10px 16px; border-radius:10px; font-size:11px; line-height:1.6; white-space:pre-line; margin-bottom:14px; }
        .app-alert.show { display:block; background:rgba(255,61,138,0.08); border:1px solid rgba(255,61,138,0.3); color:var(--pulsar); }
        .app-alert.warn { display:block; background:rgba(255,176,32,0.06); border:1px solid rgba(255,176,32,0.25); color:var(--amber); }

        .history { margin-top:0; }
        .hist-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
        .hist-title { font-family:var(--fd); font-size:17px; font-weight:700; color:var(--white); letter-spacing:-0.3px; }
        .btn-ghost-sm { background:none; border:none; color:var(--muted); font-family:var(--fm); font-size:10px; cursor:pointer; padding:4px; transition:color 0.2s; }
        .btn-ghost-sm:hover { color:var(--text); }
        .hist-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; }
        .hcard { background:linear-gradient(135deg,rgba(14,17,32,0.9),rgba(19,22,40,0.8)); border:1px solid var(--border); border-radius:14px; padding:14px; transition:all 0.2s; position:relative; overflow:hidden; }
        .hcard:hover { border-color:var(--border2); transform:translateY(-2px); }
        .htop { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; }
        .hdate { font-size:9px; color:var(--muted); line-height:1.6; font-family:var(--fm); }
        .hpct { font-family:var(--fd); font-size:24px; font-weight:900; letter-spacing:-0.5px; line-height:1; }
        .hpct.g { color:var(--neon); } .hpct.m { color:var(--amber); } .hpct.b { color:var(--pulsar); }
        .hbar { height:2px; background:var(--panel2); border-radius:1px; overflow:hidden; margin-bottom:10px; }
        .hfill { height:100%; border-radius:1px; }
        .hfill.g { background:var(--neon); } .hfill.m { background:var(--amber); } .hfill.b { background:var(--pulsar); }
        .hmeta { display:flex; gap:10px; flex-wrap:wrap; }
        .hmi { font-size:8px; color:var(--muted); line-height:1.6; }
        .hmi strong { display:block; font-size:10px; color:var(--text); font-weight:500; font-family:var(--fm); }
        .hempty { grid-column:1/-1; padding:36px; text-align:center; border:1px dashed var(--border); border-radius:14px; color:var(--muted); font-size:11px; line-height:2.5; }

        .toast { position:fixed; bottom:20px; left:50%; transform:translateX(-50%) translateY(60px); background:var(--panel2); border:1px solid var(--border2); color:var(--text); font-size:11px; padding:9px 18px; border-radius:8px; transition:transform 0.3s cubic-bezier(.4,0,.2,1); z-index:9999; white-space:nowrap; box-shadow:0 12px 40px rgba(0,0,0,0.5); font-family:var(--fm); }
        .toast.show { transform:translateX(-50%) translateY(0); }

        #loadScreen { position:fixed; inset:0; background:var(--void); display:flex; align-items:center; justify-content:center; z-index:9999; transition:opacity 0.6s; }
        #loadScreen.out { opacity:0; pointer-events:none; }
        .load-box { display:flex; flex-direction:column; align-items:center; gap:20px; }
        .load-logo-wrap { display:flex; align-items:center; gap:12px; }
        .load-eye { width:48px; height:48px; background:linear-gradient(135deg,var(--neon),var(--star)); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:22px; animation:loadPulse 2s ease-in-out infinite; }
        @keyframes loadPulse { 0%,100%{box-shadow:0 0 20px rgba(57,255,156,0.4)} 50%{box-shadow:0 0 40px rgba(57,255,156,0.7),0 0 80px rgba(57,255,156,0.2)} }
        .load-logo-txt { font-family:var(--fd); font-size:28px; font-weight:900; color:var(--white); letter-spacing:-1px; }
        .load-logo-txt span { color:var(--neon); }
        .load-track { width:240px; height:2px; background:rgba(124,58,255,0.15); border-radius:2px; overflow:hidden; }
        .load-bar { height:100%; width:0%; background:linear-gradient(90deg,var(--plasma),var(--neon)); transition:width 0.4s ease; }
        .load-msg { font-family:var(--fm); font-size:10px; color:var(--muted); letter-spacing:2px; text-transform:uppercase; }
        .uchip { display:none !important; }


        /* ── INTELLIGENCE MODULES v2.0 ───────────────────────── */
        .intel-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 14px;
        }
        .intel-card {
          background: linear-gradient(135deg, rgba(14,17,32,0.95), rgba(19,22,40,0.9));
          border: 1px solid rgba(124,58,255,0.14);
          border-radius: 16px; padding: 16px;
          position: relative; overflow: hidden;
        }
        .intel-card::before { content:''; position:absolute; top:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,rgba(124,58,255,0.35),rgba(57,255,156,0.2),transparent); }
        .intel-label { font-family:var(--fm); font-size:8px; letter-spacing:2.5px; text-transform:uppercase; color:var(--muted); margin-bottom:10px; display:flex; align-items:center; gap:6px; }
        .intel-label::after { content:''; flex:1; height:1px; background:rgba(124,58,255,0.1); }
        .intel-score { font-family:var(--fd); font-size:36px; font-weight:900; line-height:1; letter-spacing:-2px; margin-bottom:4px; }
        .intel-sub { font-size:10px; color:var(--muted); margin-bottom:10px; line-height:1.5; min-height:28px; }
        .intel-bar-track { height:4px; background:rgba(124,58,255,0.08); border-radius:2px; overflow:hidden; margin-bottom:8px; }
        .intel-bar-fill { height:100%; border-radius:2px; transition:width 1s ease, background 0.4s; }
        .intel-meta { font-family:var(--fm); font-size:9px; color:var(--muted); letter-spacing:0.5px; }
        .intel-card.ai-card { grid-column: 1 / -1; }
        .ai-insight-text { font-size:12px; color:var(--text); line-height:1.7; margin-bottom:10px; }
        .ai-suggestions { display:flex; flex-direction:column; gap:0; }
        .ai-bar-track { height:5px; background:rgba(124,58,255,0.08); border-radius:2px; overflow:hidden; margin-bottom:10px; }
        .ai-bar-fill { height:100%; border-radius:2px; transition:width 1s ease; background:linear-gradient(90deg,var(--plasma),var(--neon)); }
        body[data-theme="light"] .intel-card { background:linear-gradient(135deg,rgba(255,255,255,0.97),rgba(244,245,252,0.95)) !important; border:1px solid rgba(109,40,217,0.12) !important; }

        @media (max-width:820px) {
          .app-grid { grid-template-columns:1fr; }
          .right-col { order:-1; }
          .score-big { font-size:72px; }
          .ring-box { display:none; }
        }
      `}</style>

      {/* face-api loader */}
      <script dangerouslySetInnerHTML={{ __html: `
(function(){
  var s=['https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
         'https://unpkg.com/face-api.js@0.22.2/dist/face-api.min.js'];
  var i=0;
  function next(){
    if(i>=s.length){window._faceApiErr=true;return;}
    var el=document.createElement('script');
    el.src=s[i++];el.crossOrigin='anonymous';
    el.onload=function(){window._faceApiReady=true;};
    el.onerror=next;
    document.head.appendChild(el);
  }
  next();
})();
` }} />

      {/* Load screen */}
      <div id="loadScreen">
        <div className="load-box">
          <div className="load-logo-wrap">
            <div className="load-eye">👁</div>
            <div className="load-logo-txt">Focus<span>Lens</span></div>
          </div>
          <div className="load-track">
            <div className="load-bar" id="loadBar"></div>
          </div>
          <div className="load-msg" id="loadMsg">Initializing…</div>
        </div>
      </div>

      {/* Topbar */}
      <CosmicTopbar />

      {/* App screen — fl-app.js controls this */}
      <div id="appScreen" className="hidden">

        {/* Daily quote */}
        <div className="motive-banner" style={{ opacity: quoteVisible ? 1 : 0 }}>
          <div className="motive-icon">✦</div>
          <div style={{ flex: 1 }}>
            <div className="motive-txt">"{quote.text}"</div>
            <div className="motive-author">— {quote.author}</div>
          </div>
          <div className="motive-day">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>

        <div id="appAlert" className="app-alert"></div>

        <div className="app-grid">
          <div className="left-col">
            <div className="card">
              <div className="card-tag">Focus Score</div>
              <div className="score-row">
                <div id="scoreBig" className="score-big">—</div>
                <div className="score-side">
                  <div id="scorePct" className="score-pct"></div>
                  <div id="scoreMsg" className="score-msg">Start a session to begin tracking</div>
                </div>
                <div className="ring-box">
                  <svg width="72" height="72" viewBox="0 0 70 70">
                    <circle className="ring-bg" cx="35" cy="35" r="32" />
                    <circle id="ringFg" className="ring-fg" cx="35" cy="35" r="32" />
                  </svg>
                </div>
              </div>
              <div className="seg-bar">
                <div id="segF" style={{ width: '0%' }}></div>
                <div id="segD" style={{ width: '0%' }}></div>
              </div>
              <div className="reads">
                <div className="read"><div id="rT" className="rval">0:00</div><div className="rlbl">Total</div></div>
                <div className="read"><div id="rF" className="rval" style={{ color: 'var(--neon)' }}>0:00</div><div className="rlbl">Focused</div></div>
                <div className="read"><div id="rD" className="rval" style={{ color: 'var(--pulsar)' }}>0:00</div><div className="rlbl">Distracted</div></div>
              </div>
              <div className="live-row">
                <div className="live-ind">
                  <div id="liveDot" className="ldot"></div>
                  <span id="liveLbl">Standby</span>
                </div>
                <span id="timerTxt"></span>
              </div>
            </div>

            <div className="card">
              <div className="card-tag">Time Breakdown</div>
              <div className="trows">
                <div className="trow">
                  <div className="tbar" style={{ background: 'var(--neon)' }}></div>
                  <div><div className="tlbl">Focused</div><div id="tdF" className="tval">0:00</div></div>
                  <div id="tdFp" className="tpct">—</div>
                </div>
                <div className="trow">
                  <div className="tbar" style={{ background: 'var(--pulsar)' }}></div>
                  <div><div className="tlbl">Distracted</div><div id="tdD" className="tval">0:00</div></div>
                  <div id="tdDp" className="tpct">—</div>
                </div>
                <div className="trow">
                  <div className="tbar" style={{ background: 'var(--muted)' }}></div>
                  <div><div className="tlbl">Session Duration</div><div id="tdT" className="tval">0:00</div></div>
                  <div id="tdTp" className="tpct">—</div>
                </div>
              </div>
            </div>
          </div>

          <div className="right-col">
            <div className="card cam-card">
              <div className="card-tag">Eye Tracking Feed</div>
              <div className="cam-box">
                <video id="videoEl" autoPlay muted playsInline></video>
                <canvas id="camCanvas"></canvas>
                <div id="camPlaceholder" className="cam-ph">
                  <div className="cam-icon">⬡</div>
                  <div className="cam-hint">Camera feed appears here<br />after you start tracking</div>
                </div>
                <div id="eyeBadge" className="eye-badge hidden"></div>
                <div id="modelBadge" className="mdl-badge hidden"></div>
              </div>
              <div className="micro-row">
                <div className="micro"><div id="blinkN" className="mv">0</div><div className="ml">Blinks</div></div>
                <div className="micro"><div id="lookN" className="mv">0</div><div className="ml">Look Aways</div></div>
              </div>
              <div className="mic-strip">
                <span className="mic-lbl">MIC</span>
                <div className="mic-track"><div id="micBar" className="mic-bar"></div></div>
              </div>
              <button id="btnStart" className="btn-primary">▶ Start Tracking</button>
              <button id="btnStop" className="btn-stop hidden">■ Stop & Save</button>
            </div>
          </div>
        </div>


        {/* ── INTELLIGENCE MODULES ─────────────────────────────── */}
        <div className="intel-grid">
          {/* Attention Leak */}
          <div className="intel-card">
            <div className="intel-label">🎯 Attention Leak</div>
            <div className="intel-score" id="att-score" style={{ color:'var(--neon)' }}>100</div>
            <div className="intel-sub">Leaks: <span id="att-leak" style={{ color:'var(--amber)' }}>0/min</span></div>
            <div className="intel-bar-track"><div className="intel-bar-fill" id="att-bar" style={{ width:'100%', background:'var(--neon)' }}></div></div>
            <div className="intel-meta">Gaze shifts · Focus spans</div>
          </div>
          {/* Burnout Risk */}
          <div className="intel-card">
            <div className="intel-label">🧠 Burnout Risk</div>
            <div className="intel-score" id="burn-risk" style={{ color:'var(--neon)', fontSize:'22px', paddingTop:'7px' }}>Low</div>
            <div className="intel-sub" id="burn-insight">Start session to monitor fatigue</div>
            <div className="intel-bar-track"><div className="intel-bar-fill" id="burn-bar" style={{ width:'0%', background:'var(--neon)' }}></div></div>
            <div className="intel-meta">Blink rate · Session fatigue</div>
          </div>
          {/* Posture */}
          <div className="intel-card">
            <div className="intel-label">🪑 Posture</div>
            <div className="intel-score" id="pos-score" style={{ color:'var(--neon)' }}>100</div>
            <div className="intel-sub">
              <span id="pos-status" style={{ color:'var(--neon)' }}>Good</span><br/>
              <span id="pos-feedback" style={{ fontSize:'9px' }}>Calibrating after 30s…</span>
            </div>
            <div className="intel-bar-track"><div className="intel-bar-fill" id="pos-bar" style={{ width:'100%', background:'var(--neon)' }}></div></div>
            <div className="intel-meta">Head tilt · Forward lean</div>
          </div>
          {/* Productivity Health */}
          <div className="intel-card">
            <div className="intel-label">⚡ Productivity Health</div>
            <div className="intel-score" id="ai-health" style={{ color:'var(--plasma-l)' }}>100</div>
            <div className="intel-sub">Unified intelligence score</div>
            <div className="intel-bar-track"><div className="intel-bar-fill" id="ai-bar" style={{ width:'100%', background:'linear-gradient(90deg,var(--plasma),var(--neon))' }}></div></div>
            <div className="intel-meta">Focus · Attention · Posture · Burnout</div>
          </div>
          {/* AI Insight — full width */}
          <div className="intel-card ai-card">
            <div className="intel-label">🤖 AI Insight</div>
            <div className="ai-insight-text" id="ai-insight">Start a session to get your AI productivity analysis.</div>
            <div className="ai-suggestions" id="ai-suggestions"></div>
          </div>
        </div>

        <section className="history">
          <div className="hist-head">
            <div className="hist-title">Session History</div>
            <button id="btnClear" className="btn-ghost-sm">Clear All</button>
          </div>
          <div id="histGrid" className="hist-grid"></div>
        </section>
      </div>

      <div id="toast" className="toast"></div>

      

      <Script src="/fl-app.js" strategy="afterInteractive" />
    </>
  )
}
