import { SignUp } from '@clerk/nextjs'
import '../../cosmic.css'

export default function SignUpPage() {
  return (
    <>
      <style>{`
        .auth-root {
          min-height: 100vh; background: var(--void);
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden; padding: 40px 20px;
        }
        .auth-bg {
          position: fixed; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 70% 60% at 70% 50%, rgba(57,255,156,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 10% 20%, rgba(124,58,255,0.08) 0%, transparent 50%),
            radial-gradient(ellipse 40% 60% at 90% 80%, rgba(0,212,255,0.06) 0%, transparent 50%);
        }
        .auth-card {
          position: relative; z-index: 10;
          display: flex; flex-direction: column; align-items: center; gap: 28px;
          width: 100%; max-width: 440px;
        }
        .auth-logo { display: flex; align-items: center; gap: 12px; }
        .auth-eye {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, var(--plasma), var(--star));
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; box-shadow: var(--glow-violet);
          animation: pulse 3s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100%{box-shadow:var(--glow-violet)} 50%{box-shadow:0 0 40px rgba(124,58,255,0.6),0 0 80px rgba(124,58,255,0.2)} }
        .auth-logo-txt { font-family: var(--fd); font-size: 28px; font-weight: 900; color: var(--white); letter-spacing: -1px; }
        .auth-logo-txt em { color: var(--plasma-l); font-style: normal; }
        .auth-tagline { font-family: var(--fm); font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); }

        .cl-card, .cl-rootBox { width: 100% !important; max-width: 440px !important; }
        
        :root[data-theme='dark'] .cl-card {
          background: linear-gradient(135deg, rgba(14,17,32,0.98), rgba(19,22,40,0.95)) !important;
          border: 1px solid rgba(57,255,156,0.2) !important;
        }
        :root[data-theme='light'] .cl-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(244,245,252,0.95)) !important;
          border: 1px solid rgba(109,40,217,0.15) !important;
        }
        .cl-card {
          border-radius: 20px !important;
          box-shadow: 0 32px 80px rgba(0,0,0,0.15), 0 0 40px var(--border) !important;
        }
        .cl-main,
        .cl-cardBox,
        .cl-rootBox {
          background: transparent !important;
        }
        
        :root[data-theme='dark'] .cl-headerTitle,
        :root[data-theme='dark'] .cl-socialButtonsBlockButtonText,
        :root[data-theme='dark'] .cl-formFieldLabel,
        :root[data-theme='dark'] .cl-identityPreviewText,
        :root[data-theme='dark'] .cl-footerActionText,
        :root[data-theme='dark'] .cl-dividerText {
          color: #cbd5e1 !important;
        }
        :root[data-theme='light'] .cl-headerTitle,
        :root[data-theme='light'] .cl-socialButtonsBlockButtonText,
        :root[data-theme='light'] .cl-formFieldLabel,
        :root[data-theme='light'] .cl-identityPreviewText,
        :root[data-theme='light'] .cl-footerActionText,
        :root[data-theme='light'] .cl-dividerText {
          color: var(--text) !important;
        }
        
        :root[data-theme='dark'] .cl-headerSubtitle { color: #94a3b8 !important; }
        :root[data-theme='light'] .cl-headerSubtitle { color: var(--muted) !important; }
        
        :root[data-theme='dark'] .cl-footerActionLink,
        :root[data-theme='dark'] .cl-identityPreviewEditButton {
          color: #6ee7b7 !important;
        }
        :root[data-theme='light'] .cl-footerActionLink,
        :root[data-theme='light'] .cl-identityPreviewEditButton {
          color: var(--neon-d) !important;
        }
        
        :root[data-theme='dark'] .cl-socialButtonsBlockButton {
          background: rgba(15, 23, 42, 0.72) !important;
          border: 1px solid rgba(124, 58, 237, 0.28) !important;
        }
        :root[data-theme='light'] .cl-socialButtonsBlockButton {
          background: rgba(237, 233, 254, 0.7) !important;
          border: 1px solid rgba(109, 40, 217, 0.2) !important;
        }
        
        :root[data-theme='dark'] .cl-formFieldInput {
          background: rgba(2, 6, 23, 0.78) !important;
          border: 1px solid rgba(124, 58, 237, 0.3) !important;
          color: #e2e8f0 !important;
        }
        :root[data-theme='light'] .cl-formFieldInput {
          background: rgba(245, 240, 255, 0.7) !important;
          border: 1px solid rgba(109, 40, 217, 0.15) !important;
          color: var(--text) !important;
        }
        
        :root[data-theme='dark'] .cl-formFieldInput::placeholder { color: #64748b !important; }
        :root[data-theme='light'] .cl-formFieldInput::placeholder { color: var(--muted) !important; }
        
        :root[data-theme='dark'] .cl-dividerLine { background: rgba(148, 163, 184, 0.22) !important; }
        :root[data-theme='light'] .cl-dividerLine { background: rgba(109, 40, 217, 0.1) !important; }
        
        :root[data-theme='dark'] .cl-formButtonPrimary {
          background: linear-gradient(135deg, #7c3aed, #9333ea) !important;
          color: #ffffff !important;
        }
        :root[data-theme='light'] .cl-formButtonPrimary {
          background: linear-gradient(135deg, var(--plasma), var(--plasma-l)) !important;
          color: #ffffff !important;
        }
        
        :root[data-theme='dark'] .cl-footerText { color: #94a3b8 !important; }
        :root[data-theme='light'] .cl-footerText { color: var(--text) !important; }
        
        :root[data-theme='dark'] .cl-devBadge { 
          background: rgba(124, 58, 255, 0.15) !important;
          color: #7c3aed !important;
        }
        :root[data-theme='light'] .cl-devBadge {
          background: rgba(109, 40, 217, 0.1) !important;
          color: var(--plasma) !important;
        }
        
        .signal-bar { position: fixed; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--neon), var(--plasma-l), var(--star), transparent); background-size: 200% 100%; animation: sweep 3s linear infinite; }
        @keyframes sweep { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .auth-stars { position: fixed; inset: 0; pointer-events: none; z-index: 1; }
        .auth-star { position: absolute; border-radius: 50%; animation: twinkle var(--d) var(--dl) infinite ease-in-out; }
        @keyframes twinkle { 0%,100%{opacity:0.1} 50%{opacity:0.8} }
      `}</style>

      <div className="auth-root">
        <div className="auth-bg" />
        <div className="scanlines" />
        <div className="auth-stars">
          {Array.from({ length: 30 }, (_, i) => (
            <div key={i} className="auth-star" style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              width: Math.random() * 2 + 1, height: Math.random() * 2 + 1,
              background: ['#39ff9c', '#00d4ff', '#a855f7', 'rgba(255,255,255,0.7)'][i % 4],
              ['--d' as any]: `${Math.random() * 4 + 2}s`,
              ['--dl' as any]: `${Math.random() * 3}s`,
            } as any} />
          ))}
        </div>

        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-eye">👁</div>
            <div className="auth-logo-txt">Focus<em>Lens</em></div>
          </div>
          <div className="auth-tagline">Begin your transmission</div>

          <SignUp afterSignUpUrl="/dashboard" redirectUrl="/dashboard" />
        </div>

        <div className="signal-bar" />
      </div>
    </>
  )
}
