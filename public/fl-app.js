'use strict';
// fl-app.js — FocusLens 2.0: Invisible Attention & Health Intelligence System

// ── Constants ──────────────────────────────────────────────────────────────────
const DETECT_MS  = 80;
const EAR_DEF    = 0.30, EAR_RATIO = 0.70, EAR_LEN = 5;
const CAL_N      = 35, CC = 3, CB_MAX = 6;
const BL_MIN     = 50, BL_MAX = 450;
const GH = 0.20, GV = 0.28, BRIGHT_THR = 12;
const MIC_THR    = 15, MIC_HOLD = 600;
const MODEL_CDNS = [
  'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
  'https://unpkg.com/face-api.js@0.22.2/weights',
  'https://cdnjs.cloudflare.com/ajax/libs/face-api.js/0.22.2/weights',
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights',
];

// ── Module 1: Attention Leak Detection ────────────────────────────────────────
const ATT = {
  gazeShifts: [],        // timestamps of gaze shifts
  shortSpans: 0,         // attention spans < 10s
  leakFreq: 0,           // leaks per minute
  lastFocusStart: null,  // when last focused period started
  focusSpanDurations: [], // recent focus span lengths
  score: 100,
};

// ── Module 2: Burnout Detection ───────────────────────────────────────────────
const BURN = {
  blinkHistory: [],      // {time, rate} per minute
  focusHistory: [],      // {time, pct} per minute
  fatigueScore: 0,       // 0-100
  risk: 'Low',           // Low / Medium / High
  insight: '',
  sessionStart: null,
  minuteSamples: [],     // sampled every 60s
  lastSampleTime: null,
};

// ── Module 3: Posture Detection ───────────────────────────────────────────────
const POSTURE = {
  score: 100,
  status: 'Good',        // Good / Warning / Poor
  feedback: '',
  noseHistory: [],       // {x, y, time}
  baselineNose: null,    // calibrated nose position
  tiltAccum: 0,
  forwardLean: 0,
  alerts: 0,
  lastAlertTime: 0,
};

// ── AI Intelligence Layer ─────────────────────────────────────────────────────
const AI = {
  healthScore: 100,
  insight: 'Start a session to get your AI productivity analysis.',
  suggestions: [],
  lastUpdate: 0,
  UPDATE_INTERVAL: 15000, // update every 15s during session
};

// ── Core State ────────────────────────────────────────────────────────────────
let st = {
  trk:false, mdlOk:false,
  foc:true, micLoud:false, reason:'',
  tot:0, fSec:0, dSec:0, bCnt:0, lCnt:0,
  start:null, lastTick:null,
  ecSince:null, blkStart:0, ccnt:0, inBlink:false,
  cal:false, calS:[], earBase:EAR_DEF, earThr:EAR_DEF*EAR_RATIO, earH:[],
  micS:null, camBlk:false, darkBl:null,
  blinksThisMin: 0, blinkMinStart: null,
};
let user=null, vs=null, ac=null, an=null, ms=null, tt=null, dt=null;
const bCv=Object.assign(document.createElement('canvas'),{width:64,height:48});
const pCv=Object.assign(document.createElement('canvas'),{width:32,height:16});

// ── DOM ────────────────────────────────────────────────────────────────────────
const $=id=>document.getElementById(id);
const loadScreen=$('loadScreen'), loadBar=$('loadBar'), loadMsg=$('loadMsg');
const appScreen=$('appScreen');
const statusChip=$('statusChip'), statusLbl=$('statusLbl');
const appAlert=$('appAlert');
const userChip=$('userChip'), uAvatar=$('uAvatar'), uName=$('uName'), btnOut=$('btnOut');
const scoreBig=$('scoreBig'), scorePct=$('scorePct'), scoreMsg=$('scoreMsg');
const ringFg=$('ringFg');
const segF=$('segF'), segD=$('segD');
const rT=$('rT'), rF=$('rF'), rD=$('rD');
const liveDot=$('liveDot'), liveLbl=$('liveLbl'), timerTxt=$('timerTxt');
const tdF=$('tdF'), tdD=$('tdD'), tdT=$('tdT');
const tdFp=$('tdFp'), tdDp=$('tdDp'), tdTp=$('tdTp');
const videoEl=$('videoEl'), camCanvas=$('camCanvas');
const camPh=$('camPlaceholder');
const eyeBadge=$('eyeBadge'), modelBadge=$('modelBadge');
const blinkN=$('blinkN'), lookN=$('lookN'), micBar=$('micBar');
const btnStart=$('btnStart'), btnStop=$('btnStop');
const histGrid=$('histGrid'), btnClear=$('btnClear');
const toastEl=$('toast');

// ── New Module DOM (created dynamically) ───────────────────────────────────────
function getModuleEl(id) { return $(id); }

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = s => { s=Math.max(0,Math.round(s)); return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`; };
const pq  = p => p>=70?'g':p>=40?'m':'b';

let toastTmr;
function toast(m){ toastEl.textContent=m; toastEl.classList.add('show'); clearTimeout(toastTmr); toastTmr=setTimeout(()=>toastEl.classList.remove('show'),3000); }
function setLoad(p,m){ if(p!=null)loadBar.style.width=p+'%'; if(m)loadMsg.textContent=m; }

function storKey(){ return 'fl_s_'+(user?user.uid:'guest'); }
function loadS(){ try{return JSON.parse(localStorage.getItem(storKey())||'[]')}catch{return[]} }
function saveS(a){ try{localStorage.setItem(storKey(),JSON.stringify(a.slice(0,50)))}catch{} }

function showAppAlert(msg,type='show'){ appAlert.textContent=msg; appAlert.className='app-alert '+type; }
function hideAppAlert(){ appAlert.className='app-alert'; }

// ── MODULE 1: Attention Leak Analysis ─────────────────────────────────────────
function recordGazeShift() {
  const now = Date.now();
  ATT.gazeShifts.push(now);
  // Keep only last 60 seconds
  const cutoff = now - 60000;
  ATT.gazeShifts = ATT.gazeShifts.filter(t => t > cutoff);

  // End current focus span
  if (ATT.lastFocusStart) {
    const spanDur = (now - ATT.lastFocusStart) / 1000;
    ATT.focusSpanDurations.push(spanDur);
    if (ATT.focusSpanDurations.length > 20) ATT.focusSpanDurations.shift();
    if (spanDur < 10) ATT.shortSpans++;
  }
  ATT.lastFocusStart = null;
}

function recordFocusStart() {
  if (!ATT.lastFocusStart) ATT.lastFocusStart = Date.now();
}

function updateAttentionScore() {
  const shiftsPerMin = ATT.gazeShifts.length;
  ATT.leakFreq = shiftsPerMin;

  // Score: start at 100, penalize for shifts
  let score = 100;
  score -= Math.min(50, shiftsPerMin * 5);

  // Penalize for very short focus spans
  const avgSpan = ATT.focusSpanDurations.length
    ? ATT.focusSpanDurations.reduce((a,b)=>a+b,0)/ATT.focusSpanDurations.length
    : 60;
  if (avgSpan < 5)  score -= 20;
  else if (avgSpan < 15) score -= 10;
  else if (avgSpan < 30) score -= 5;

  ATT.score = Math.max(0, Math.round(score));
  renderAttentionModule();
}

function renderAttentionModule() {
  const el = $('att-score');
  const el2 = $('att-leak');
  const el3 = $('att-bar');
  if (el)  el.textContent = ATT.score;
  if (el2) el2.textContent = ATT.leakFreq + '/min';
  if (el3) {
    el3.style.width = ATT.score + '%';
    el3.style.background = ATT.score >= 70 ? 'var(--neon)' : ATT.score >= 40 ? 'var(--amber)' : 'var(--pulsar)';
  }
}

// ── MODULE 2: Burnout Detection ───────────────────────────────────────────────
function updateBurnout() {
  const now = Date.now();
  if (!BURN.sessionStart) return;
  const sessionMins = (now - BURN.sessionStart) / 60000;

  // Sample every 60s
  if (!BURN.lastSampleTime || now - BURN.lastSampleTime > 60000) {
    BURN.lastSampleTime = now;
    const blinksPerMin = st.blinksThisMin;
    st.blinksThisMin = 0; st.blinkMinStart = now;
    const focusPct = st.tot > 0 ? (st.fSec / st.tot) * 100 : 100;
    BURN.minuteSamples.push({ time: now, blinks: blinksPerMin, focus: focusPct });
    if (BURN.minuteSamples.length > 10) BURN.minuteSamples.shift();
  }

  // Compute fatigue
  let fatigue = 0;

  // 1. High blink rate = eye fatigue
  const recentBlinks = BURN.minuteSamples.slice(-3).map(s=>s.blinks);
  const avgBlinks = recentBlinks.length ? recentBlinks.reduce((a,b)=>a+b,0)/recentBlinks.length : 0;
  if (avgBlinks > 25) fatigue += 30;
  else if (avgBlinks > 18) fatigue += 15;

  // 2. Declining focus over time
  if (BURN.minuteSamples.length >= 3) {
    const early = BURN.minuteSamples.slice(0, Math.ceil(BURN.minuteSamples.length/2)).map(s=>s.focus);
    const late  = BURN.minuteSamples.slice(-Math.ceil(BURN.minuteSamples.length/2)).map(s=>s.focus);
    const earlyAvg = early.reduce((a,b)=>a+b,0)/early.length;
    const lateAvg  = late.reduce((a,b)=>a+b,0)/late.length;
    const drop = earlyAvg - lateAvg;
    if (drop > 30) fatigue += 35;
    else if (drop > 15) fatigue += 20;
    else if (drop > 5) fatigue += 10;
  }

  // 3. Long session = natural fatigue
  if (sessionMins > 90) fatigue += 20;
  else if (sessionMins > 60) fatigue += 10;
  else if (sessionMins > 45) fatigue += 5;

  // 4. High distraction time
  const disPct = st.tot > 0 ? (st.dSec / st.tot) * 100 : 0;
  if (disPct > 50) fatigue += 20;
  else if (disPct > 30) fatigue += 10;

  BURN.fatigueScore = Math.min(100, Math.round(fatigue));
  BURN.risk = BURN.fatigueScore >= 60 ? 'High' : BURN.fatigueScore >= 30 ? 'Medium' : 'Low';
  BURN.insight = BURN.risk === 'High'
    ? 'Significant fatigue detected. Take a 10-min break.'
    : BURN.risk === 'Medium'
    ? 'Mild fatigue building. Consider a short break soon.'
    : 'You\'re in good shape. Keep it up!';

  renderBurnoutModule();
}

function renderBurnoutModule() {
  const riskEl = $('burn-risk');
  const insightEl = $('burn-insight');
  const barEl = $('burn-bar');
  if (riskEl) {
    riskEl.textContent = BURN.risk;
    riskEl.style.color = BURN.risk==='High' ? 'var(--pulsar)' : BURN.risk==='Medium' ? 'var(--amber)' : 'var(--neon)';
  }
  if (insightEl) insightEl.textContent = BURN.insight;
  if (barEl) {
    barEl.style.width = BURN.fatigueScore + '%';
    barEl.style.background = BURN.risk==='High' ? 'var(--pulsar)' : BURN.risk==='Medium' ? 'var(--amber)' : 'var(--neon)';
  }
}

// ── MODULE 3: Posture Detection ───────────────────────────────────────────────
function analyzePosture(landmarks) {
  const nose = landmarks.getNose()[3]; // tip of nose
  const now = Date.now();

  // Calibrate baseline on first 30 samples
  POSTURE.noseHistory.push({ x: nose.x, y: nose.y, time: now });
  if (POSTURE.noseHistory.length > 60) POSTURE.noseHistory.shift();

  if (!POSTURE.baselineNose && POSTURE.noseHistory.length >= 30) {
    const xs = POSTURE.noseHistory.map(p=>p.x);
    const ys = POSTURE.noseHistory.map(p=>p.y);
    POSTURE.baselineNose = {
      x: xs.reduce((a,b)=>a+b,0)/xs.length,
      y: ys.reduce((a,b)=>a+b,0)/ys.length,
    };
  }

  if (!POSTURE.baselineNose) {
    POSTURE.score = 100; POSTURE.status = 'Calibrating…';
    return;
  }

  // Measure deviation from baseline
  const dx = nose.x - POSTURE.baselineNose.x;
  const dy = nose.y - POSTURE.baselineNose.y;

  // Tilt (horizontal) — head leaning left/right
  const tiltPct = Math.abs(dx) / (videoEl.videoWidth || 640) * 100;
  // Forward lean (vertical — nose moves down in frame = head closer to screen)
  const leanPct = (dy) / (videoEl.videoHeight || 480) * 100;

  let score = 100;
  let issues = [];

  if (tiltPct > 8) { score -= 30; issues.push('Head tilted'); }
  else if (tiltPct > 4) { score -= 15; issues.push('Slight head tilt'); }

  if (leanPct > 6) { score -= 30; issues.push('Leaning forward'); }
  else if (leanPct > 3) { score -= 15; issues.push('Slight forward lean'); }

  POSTURE.score = Math.max(0, Math.round(score));
  POSTURE.status = POSTURE.score >= 75 ? 'Good' : POSTURE.score >= 40 ? 'Warning' : 'Poor';
  POSTURE.feedback = issues.length ? issues.join(' · ') : 'Posture looks good ✓';

  // Alert if posture is bad (throttled to every 30s)
  if (POSTURE.score < 40 && now - POSTURE.lastAlertTime > 30000) {
    POSTURE.lastAlertTime = now;
    POSTURE.alerts++;
    showPostureAlert(POSTURE.feedback);
  }

  renderPostureModule();
}

function showPostureAlert(msg) {
  const id = 'fl-posture-alert';
  const existing = $(id); if(existing) existing.remove();
  const el = document.createElement('div');
  el.id = id;
  el.style.cssText = 'position:fixed;bottom:70px;right:20px;z-index:9000;background:linear-gradient(135deg,#1a0a0e,#1a1020);border:1px solid rgba(255,61,138,0.4);border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 30px rgba(0,0,0,0.5);animation:flCrIn .35s ease both;max-width:280px;';
  el.innerHTML = `<div style="font-size:20px">🪑</div><div><div style="font-family:Syne,sans-serif;font-size:13px;font-weight:700;color:#ff3d8a">Posture Alert</div><div style="font-family:Space Mono,monospace;font-size:10px;color:#3d4666;margin-top:2px">${msg} — sit straight!</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(20px)'; setTimeout(()=>el.remove(),300); }, 4000);
}

function renderPostureModule() {
  const scoreEl = $('pos-score');
  const statusEl = $('pos-status');
  const feedbackEl = $('pos-feedback');
  const barEl = $('pos-bar');
  if (scoreEl) scoreEl.textContent = POSTURE.score;
  if (statusEl) {
    statusEl.textContent = POSTURE.status;
    statusEl.style.color = POSTURE.status==='Good' ? 'var(--neon)' : POSTURE.status==='Warning' ? 'var(--amber)' : 'var(--pulsar)';
  }
  if (feedbackEl) feedbackEl.textContent = POSTURE.feedback;
  if (barEl) {
    barEl.style.width = POSTURE.score + '%';
    barEl.style.background = POSTURE.status==='Good' ? 'var(--neon)' : POSTURE.status==='Warning' ? 'var(--amber)' : 'var(--pulsar)';
  }
}

// ── AI Intelligence Layer ──────────────────────────────────────────────────────
function updateAIInsight() {
  const now = Date.now();
  if (now - AI.lastUpdate < AI.UPDATE_INTERVAL) return;
  AI.lastUpdate = now;

  if (!st.trk || st.tot < 30) {
    AI.healthScore = 100;
    AI.insight = 'Warming up analysis… keep tracking!';
    AI.suggestions = [];
    renderAIModule(); return;
  }

  const focusPct = st.tot > 0 ? (st.fSec / st.tot) * 100 : 100;

  // Weighted health score
  const w = { focus: 0.40, attention: 0.25, posture: 0.20, burnout: 0.15 };
  const burnHealth = 100 - BURN.fatigueScore;
  AI.healthScore = Math.round(
    focusPct * w.focus +
    ATT.score * w.attention +
    POSTURE.score * w.posture +
    burnHealth * w.burnout
  );

  // Generate natural insight
  const problems = [];
  if (ATT.leakFreq > 6) problems.push('frequent gaze shifts');
  if (POSTURE.status !== 'Good') problems.push(`${POSTURE.status.toLowerCase()} posture`);
  if (BURN.risk !== 'Low') problems.push(`${BURN.risk.toLowerCase()} burnout risk`);
  if (focusPct < 50) problems.push('low focus ratio');

  if (problems.length === 0) {
    AI.insight = AI.healthScore >= 85
      ? 'Excellent productivity health! All signals are green.'
      : 'Good productivity health. Minor improvements possible.';
  } else {
    AI.insight = `Your focus is being impacted by ${problems.slice(0,2).join(' and ')}.`;
  }

  // Generate suggestions
  AI.suggestions = [];
  if (ATT.leakFreq > 5) AI.suggestions.push('🎯 Try the Pomodoro technique to reduce gaze shifts');
  if (POSTURE.score < 60) AI.suggestions.push('🪑 Adjust your chair or monitor height for better posture');
  if (BURN.risk === 'High') AI.suggestions.push('☕ Take a 10-minute break — you\'ve been working hard');
  if (BURN.risk === 'Medium') AI.suggestions.push('💧 Hydrate and stretch — mild fatigue detected');
  if (focusPct < 40) AI.suggestions.push('🔇 Reduce noise/notifications around you');
  if (ATT.shortSpans > 5) AI.suggestions.push('📵 Phone or background apps may be causing micro-distractions');
  if (!AI.suggestions.length) AI.suggestions.push('✅ Keep it up! Your productivity health is strong.');

  // Credit bonuses for good posture and low leaks
  if (POSTURE.score >= 80) {
    const key = 'fl_posture_credit_' + new Date().toDateString();
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1');
      const cur = parseInt(localStorage.getItem('fl_credits')||'0',10);
      localStorage.setItem('fl_credits', String(cur + 2));
      window.dispatchEvent(new CustomEvent('fl_credits_changed', {detail:{credits:cur+2}}));
    }
  }

  renderAIModule();
}

function renderAIModule() {
  const scoreEl = $('ai-health');
  const insightEl = $('ai-insight');
  const sugEl = $('ai-suggestions');
  const barEl = $('ai-bar');
  if (scoreEl) {
    scoreEl.textContent = AI.healthScore;
    scoreEl.style.color = AI.healthScore >= 75 ? 'var(--neon)' : AI.healthScore >= 50 ? 'var(--amber)' : 'var(--pulsar)';
  }
  if (insightEl) insightEl.textContent = AI.insight;
  if (barEl) {
    barEl.style.width = AI.healthScore + '%';
    barEl.style.background = AI.healthScore>=75 ? 'linear-gradient(90deg,var(--plasma),var(--neon))' : AI.healthScore>=50 ? 'linear-gradient(90deg,#6b3a00,var(--amber))' : 'linear-gradient(90deg,#6b001a,var(--pulsar))';
  }
  if (sugEl && AI.suggestions.length) {
    sugEl.innerHTML = AI.suggestions.map(s =>
      `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:7px;font-size:11px;color:var(--text);line-height:1.5;">${s}</div>`
    ).join('');
  }
}

// ── Enter App ─────────────────────────────────────────────────────────────────
async function enterApp(u){
  user = u;
  appScreen.classList.remove('hidden');
  hideAppAlert();

  // Support both legacy and current topbar DOM structures.
  if(userChip){
    if(u){
      userChip.classList.remove('hidden');
      if(uName) uName.textContent = u.displayName || u.email || 'User';
      if(uAvatar){
        if(u.photoURL){ uAvatar.src=u.photoURL; uAvatar.style.display='block'; }
        else uAvatar.style.display='none';
      }
    } else {
      userChip.classList.add('hidden');
    }
  }

  if(u && u.loadSessions && u.loadProfile){
    histGrid.innerHTML='<div class="hempty" style="opacity:0.5">Loading your data from cloud…</div>';
    try{
      const [sessions, profile] = await Promise.all([u.loadSessions(), u.loadProfile()]);
      if(sessions && sessions.length){
        localStorage.setItem('fl_s_' + u.uid, JSON.stringify(sessions));
      }
      if(profile){
        const credits = profile.credits || 0;
        localStorage.setItem('fl_credits', String(credits));
        window.dispatchEvent(new CustomEvent('fl_credits_changed', {detail:{credits}}));
      }
    }catch(e){ console.warn('[FL] Firestore load error:', e); }
  }

  renderHist();
  renderAIModule(); // show initial AI state
  if(u) toast(`Welcome back, ${u.displayName || u.email}!`);
}

if(btnOut){
  btnOut.addEventListener('click', async () => {
    if(window.FL_USER && typeof window.FL_USER.signOut === 'function'){
      await window.FL_USER.signOut();
    }
  });
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
async function boot(){
  setLoad(10,'Initializing face detection…');
  const ready = await new Promise(res=>{
    if(window.faceapi) return res(true);
    if(window._faceApiErr) return res(false);
    let w=0;
    const t=setInterval(()=>{
      w+=100;
      if(window.faceapi){ clearInterval(t); res(true); return; }
      if(window._faceApiErr){ clearInterval(t); res(false); return; }
      if(w>=8000){ clearInterval(t); res(false); }
    },100);
  });
  if(!ready){ bootErr('face-api.js failed to load.\n\nTry: refresh page, disable ad blocker.'); return; }

  setLoad(18,'Loading detection models…');
  let ok=false;
  for(let ci=0; ci<MODEL_CDNS.length; ci++){
    const cdn = MODEL_CDNS[ci];
    try{
      setLoad(20 + ci*8, `Loading detector (${cdn.split('/')[2]})…`);
      await faceapi.nets.tinyFaceDetector.loadFromUri(cdn);
      setLoad(60, 'Loading landmark model…');
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(cdn);
      ok=true; break;
    }catch(e){ console.warn('[FL] Model load failed from', cdn); }
  }
  if(!ok){ bootErr('Could not load face detection models.\n\nTry refreshing or disabling ad blockers.'); return; }

  setLoad(100,'✓ Ready'); st.mdlOk=true;
  await new Promise(r=>setTimeout(r,350));
  loadScreen.classList.add('out');
  setTimeout(()=>loadScreen.style.display='none', 600);

  const clerkUser = await new Promise(res => {
    if(window.FL_USER) return res(window.FL_USER);
    let waited = 0;
    const poll = setInterval(() => {
      waited += 100;
      if(window.FL_USER){ clearInterval(poll); res(window.FL_USER); }
      else if(waited >= 3000){ clearInterval(poll); res(null); }
    }, 100);
  });
  await enterApp(clerkUser);
}

function bootErr(msg){
  setLoad(100, msg);
  loadScreen.classList.add('out');
  setTimeout(()=>loadScreen.style.display='none', 600);
  appScreen.classList.remove('hidden');
  showAppAlert(msg, 'show');
  btnStart.disabled=true; btnStart.textContent='⚠ Unavailable';
}

// ── DETECTION ─────────────────────────────────────────────────────────────────
function camBlocked(){
  if(videoEl.readyState<2) return false;
  const ctx=bCv.getContext('2d'); ctx.drawImage(videoEl,0,0,64,48);
  const d=ctx.getImageData(0,0,64,48).data; let s=0;
  for(let i=0;i<d.length;i+=4) s+=(d[i]+d[i+1]+d[i+2])/3;
  return(s/(64*48))<BRIGHT_THR;
}
function calcEAR(p){ const f=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),h=f(p[0],p[3]); return h<1e-6?.3:(f(p[1],p[5])+f(p[2],p[4]))/(2*h); }
function smEAR(r){ st.earH.push(r); if(st.earH.length>EAR_LEN)st.earH.shift(); return st.earH.reduce((a,b)=>a+b,0)/st.earH.length; }
function tryCal(r){
  if(r>.22) st.calS.push(r);
  if(st.calS.length>=CAL_N&&!st.cal){
    const s=[...st.calS].sort((a,b)=>a-b),m=s[Math.floor(s.length*.5)];
    st.earBase=m; st.earThr=m*EAR_RATIO; st.cal=true;
    modelBadge.textContent='CALIBRATED'; modelBadge.style.color='var(--g)';
    toast(`✓ Calibrated — posture baseline in 30s`);
  }
}
function getPupil(pts){
  let cx=0,cy=0; pts.forEach(p=>{cx+=p.x;cy+=p.y;}); cx/=pts.length; cy/=pts.length;
  const ew=Math.hypot(pts[3].x-pts[0].x,pts[3].y-pts[0].y);
  const eh=Math.hypot(pts[1].x-pts[4].x,pts[1].y-pts[4].y)+1;
  const pw=Math.max(8,ew*.4),ph=Math.max(4,eh*.8);
  const ctx=pCv.getContext('2d'); ctx.drawImage(videoEl,cx-pw/2,cy-ph/2,pw,ph,0,0,32,16);
  const px=ctx.getImageData(0,0,32,16).data; let dk=0,n=0;
  for(let i=0;i<px.length;i+=4){dk+=255-(px[i]*.299+px[i+1]*.587+px[i+2]*.114);n++;}
  return{cx,cy,dk:n>0?dk/n:0};
}
function drawEye(ctx,pts,cl,pcx,pcy,sx,sy){
  const col=cl?'rgba(255,60,60,1)':'rgba(78,255,145,1)';
  ctx.beginPath(); ctx.moveTo(pts[0].x*sx,pts[0].y*sy);
  for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x*sx,pts[i].y*sy);
  ctx.closePath(); ctx.strokeStyle=col; ctx.lineWidth=1.8; ctx.stroke();
  ctx.fillStyle=cl?'rgba(255,60,60,.1)':'rgba(78,255,145,.07)'; ctx.fill();
  ctx.fillStyle=col; pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x*sx,p.y*sy,2,0,Math.PI*2);ctx.fill();});
  const px=pcx*sx,py=pcy*sy,r=cl?2.5:4;
  ctx.strokeStyle=cl?'rgba(255,60,60,.8)':'rgba(255,255,255,.8)'; ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(px-r,py);ctx.lineTo(px+r,py);ctx.stroke();
  ctx.beginPath();ctx.moveTo(px,py-r);ctx.lineTo(px,py+r);ctx.stroke();
  ctx.beginPath();ctx.arc(px,py,r*1.5,0,Math.PI*2);
  ctx.strokeStyle=cl?'rgba(255,60,60,.5)':'rgba(78,255,145,.4)'; ctx.stroke();
}
function isClosed(e,thr,lD,rD){
  const ec=e<thr,avg=(lD+rD)/2;
  if(!ec&&e>thr*1.15) st.darkBl=st.darkBl===null?avg:st.darkBl*.95+avg*.05;
  return ec||(st.darkBl!==null&&avg<st.darkBl*.65);
}

async function detect(){
  if(!st.trk) return;
  const t0=performance.now();
  if(camBlocked()){st.camBlk=true;st.earH=[];st.ccnt=0;st.ecSince=null;setDis('CAMERA BLOCKED');nxt(t0);return;}
  if(st.camBlk){st.camBlk=false;toast('Camera unblocked');}
  if(videoEl.readyState<3){nxt(t0);return;}
  const ctx=camCanvas.getContext('2d'); ctx.clearRect(0,0,camCanvas.width,camCanvas.height);
  let det;
  try{det=await faceapi.detectSingleFace(videoEl,new faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:.28})).withFaceLandmarks(true);}
  catch{nxt(t0);return;}
  if(!det){st.earH=[];st.ccnt=0;st.ecSince=null;setDis('OUT OF FRAME');nxt(t0);return;}
  const lm=det.landmarks,le=lm.getLeftEye(),re=lm.getRightEye();
  const rE=(calcEAR(le)+calcEAR(re))/2,e=smEAR(rE);
  if(!st.cal){tryCal(rE);modelBadge.textContent=`CAL ${st.calS.length}/${CAL_N}`;modelBadge.style.color='var(--a)';modelBadge.classList.remove('hidden');}

  // ── MODULE 3: Posture ──
  if (st.cal) analyzePosture(lm);

  const lP=getPupil(le),rP=getPupil(re),thr=st.earThr,cl=isClosed(e,thr,lP.dk,rP.dk);
  const sx=camCanvas.width/(videoEl.videoWidth||640),sy=camCanvas.height/(videoEl.videoHeight||480);
  drawEye(ctx,le,cl,lP.cx,lP.cy,sx,sy); drawEye(ctx,re,cl,rP.cx,rP.cy,sx,sy);
  const dp=st.darkBl?Math.round(((lP.dk+rP.dk)/2)/st.darkBl*100):100;
  ctx.font='9px monospace'; ctx.fillStyle=cl?'rgba(255,80,80,.8)':'rgba(78,255,145,.5)';
  ctx.fillText(`EAR ${e.toFixed(3)} THR ${thr.toFixed(3)} PUPIL ${dp}%`,4,camCanvas.height-4);
  const now=Date.now();
  if(cl){
    st.ccnt++;
    if(st.ccnt>=CC){
      if(!st.ecSince){st.ecSince=now;st.blkStart=now;}
      if(st.ccnt>CB_MAX) setDis(`EYES CLOSED ${((now-st.ecSince)/1000).toFixed(1)}s`);
      else{if(!st.inBlink)st.inBlink=true;setFoc('BLINKING…');}
    }
  } else {
    if(st.ccnt>=CC&&st.inBlink){
      const d=now-st.blkStart;
      if(d>=BL_MIN&&d<=BL_MAX){
        st.bCnt++;
        st.blinksThisMin++;
        blinkN.textContent=st.bCnt;
      }
    }
    st.ccnt=0;st.ecSince=null;st.inBlink=false;
    const box=det.detection.box;
    const fcx=box.x+box.width/2,fcy=box.y+box.height/2,nose=lm.getNose()[3];
    const hd=Math.abs(nose.x-fcx)/box.width,vd=Math.abs(nose.y-fcy)/box.height;
    const apx=(lP.cx+rP.cx)/2,apy=(lP.cy+rP.cy)/2;
    ctx.strokeStyle=(hd>GH||vd>GV)?'rgba(255,184,48,.7)':'rgba(78,255,145,.2)'; ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(apx*sx,apy*sy);ctx.lineTo(fcx*sx,fcy*sy);ctx.stroke();
    if(hd>GH){
      st.lCnt++;lookN.textContent=st.lCnt;
      recordGazeShift(); // MODULE 1
      setDis('LOOKING AWAY');
    } else if(vd>GV){
      st.lCnt++;lookN.textContent=st.lCnt;
      recordGazeShift(); // MODULE 1
      setDis('LOOKING UP/DOWN');
    } else {
      recordFocusStart(); // MODULE 1
      setFoc('FOCUSED ✓');
    }
  }

  // Update attention score every 5s
  if (!detect._lastAttUpdate || now - detect._lastAttUpdate > 5000) {
    detect._lastAttUpdate = now;
    updateAttentionScore();
    updateBurnout();
    updateAIInsight();
  }

  nxt(t0);
}
function nxt(t0){ if(!st.trk)return; dt=setTimeout(detect,Math.max(0,DETECT_MS-(performance.now()-t0))); }

function setFoc(r){
  if(st.micLoud){setDis('LOUD NOISE');return;}
  st.foc=true;st.reason='';
  eyeBadge.textContent=r; eyeBadge.className='eye-badge foc'; eyeBadge.classList.remove('hidden');
  chip();
}
function setDis(r){
  st.foc=false;st.reason=r;
  eyeBadge.textContent=st.micLoud?r+' + MIC':r;
  eyeBadge.className='eye-badge dis'; eyeBadge.classList.remove('hidden');
  chip();
}
function chip(){
  if(!statusChip || !statusLbl) return;
  if(!st.trk){ statusChip.className='tb-status'; statusLbl.textContent='IDLE'; }
  else if(st.foc){ statusChip.className='tb-status on'; statusLbl.textContent='FOCUSED'; }
  else { statusChip.className='tb-status dis'; statusLbl.textContent='DISTRACTED'; }
}

// ── Mic ───────────────────────────────────────────────────────────────────────
async function startMic(){
  try{
    ms=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    ac=new(window.AudioContext||window.webkitAudioContext)();
    an=ac.createAnalyser(); an.fftSize=512; an.smoothingTimeConstant=.5;
    ac.createMediaStreamSource(ms).connect(an);
    const data=new Uint8Array(an.frequencyBinCount);
    function poll(){
      if(!ms) return;
      an.getByteFrequencyData(data); let s=0; for(let i=0;i<data.length;i++)s+=data[i];
      const avg=s/data.length,loud=avg>MIC_THR,now=Date.now();
      if(loud){
        if(!st.micS)st.micS=now;
        st.micLoud=(now-st.micS)>=MIC_HOLD;
        if(st.micLoud&&st.trk&&st.foc)setDis('LOUD NOISE');
      } else {
        const was=st.micLoud; st.micS=null; st.micLoud=false;
        if(was&&st.trk&&!st.foc&&st.reason==='LOUD NOISE')setFoc('FOCUSED ✓');
      }
      const p=Math.min(100,(avg/40)*100);
      micBar.style.width=p+'%';
      micBar.className='mic-bar'+(st.micLoud?' l':(loud?' w':''));
      setTimeout(poll,80);
    }
    poll(); toast('🎤 Mic active');
  }catch{ showAppAlert('Mic denied — noise detection disabled.','warn'); }
}

// ── Tick / render ─────────────────────────────────────────────────────────────
function tick(){
  const now=Date.now();
  if(st.lastTick){const d=(now-st.lastTick)/1000;st.tot+=d;if(st.foc)st.fSec+=d;else st.dSec+=d;}
  st.lastTick=now; renderLive();
}
function renderLive(){
  const T=st.tot,F=st.fSec,D=st.dSec;
  const p=T>0?Math.round((F/T)*100):100,fp=T>0?(F/T)*100:0,dp=T>0?(D/T)*100:0;
  const q=pq(p),el=st.start?Math.floor((Date.now()-st.start)/1000):0;
  scoreBig.textContent=p; scoreBig.className='score-big '+q;
  scorePct.textContent='%'; scoreMsg.textContent=p>=70?'Excellent focus!':p>=40?'Keep going':'You keep getting distracted';
  ringFg.style.strokeDashoffset=201-(p/100)*201;
  ringFg.style.stroke=p>=70?'var(--g)':p>=40?'var(--a)':'var(--r)';
  segF.style.width=fp+'%'; segD.style.width=dp+'%';
  rT.textContent=fmt(T); rF.textContent=fmt(F); rD.textContent=fmt(D);
  tdF.textContent=fmt(F); tdD.textContent=fmt(D); tdT.textContent=fmt(T);
  tdFp.textContent=T>0?`${Math.round(fp)}% of session`:'—';
  tdDp.textContent=T>0?`${Math.round(dp)}% of session`:'—';
  tdTp.textContent=st.start?new Date(st.start).toLocaleTimeString():'—';
  liveDot.className='ldot'+(st.trk?' on':'');
  liveLbl.textContent=st.trk?'LIVE':'ENDED';
  timerTxt.textContent=st.trk?fmt(el)+' elapsed':'';
}

// ── Start / Stop ──────────────────────────────────────────────────────────────
async function startTracking(){
  hideAppAlert(); btnStart.disabled=true; btnStart.textContent='⏳ Requesting…';
  try{
    vs=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,facingMode:'user'}});
    videoEl.srcObject=vs;
    await new Promise((res,rej)=>{ videoEl.onloadedmetadata=res; videoEl.onerror=rej; setTimeout(rej,8000); });
    videoEl.play(); videoEl.style.display='block'; camPh.style.display='none';
    camCanvas.width=videoEl.videoWidth||640; camCanvas.height=videoEl.videoHeight||480;
    modelBadge.textContent='FACE-API'; modelBadge.classList.remove('hidden'); modelBadge.style.color='var(--g)';
  }catch{
    showAppAlert('Camera permission denied. Eye tracking needs camera access.','show');
    btnStart.disabled=false; btnStart.textContent='▶ Start Tracking'; return;
  }
  await startMic();

  // Reset all modules
  Object.assign(ATT, { gazeShifts:[], shortSpans:0, leakFreq:0, lastFocusStart:null, focusSpanDurations:[], score:100 });
  Object.assign(BURN, { blinkHistory:[], focusHistory:[], fatigueScore:0, risk:'Low', insight:'', minuteSamples:[], lastSampleTime:null });
  Object.assign(POSTURE, { score:100, status:'Good', feedback:'Calibrating…', noseHistory:[], baselineNose:null, tiltAccum:0, forwardLean:0, alerts:0, lastAlertTime:0 });
  Object.assign(AI, { healthScore:100, insight:'Warming up…', suggestions:[], lastUpdate:0 });
  BURN.sessionStart = Date.now();
  st.blinksThisMin = 0; st.blinkMinStart = Date.now();
  renderAttentionModule(); renderBurnoutModule(); renderPostureModule(); renderAIModule();

  Object.assign(st,{trk:true,foc:true,micLoud:false,reason:'',tot:0,fSec:0,dSec:0,bCnt:0,lCnt:0,start:Date.now(),lastTick:null,ecSince:null,blkStart:0,inBlink:false,ccnt:0,cal:false,calS:[],earBase:EAR_DEF,earThr:EAR_DEF*EAR_RATIO,earH:[],micS:null,camBlk:false,darkBl:null});
  blinkN.textContent='0'; lookN.textContent='0'; micBar.style.width='0%';
  tt=setInterval(tick,1000); detect(); chip();
  btnStart.classList.add('hidden'); btnStop.classList.remove('hidden');
  toast('Tracking started — good luck!');
}

function stopTracking(){
  st.trk=false; clearInterval(tt); clearTimeout(dt);
  if(vs){vs.getTracks().forEach(t=>t.stop());vs=null;}
  if(ms){ms.getTracks().forEach(t=>t.stop());ms=null;}
  if(ac){ac.close();ac=null;an=null;}
  camCanvas.getContext('2d').clearRect(0,0,camCanvas.width,camCanvas.height);
  videoEl.style.display='none'; videoEl.srcObject=null; camPh.style.display='flex';
  eyeBadge.classList.add('hidden'); modelBadge.classList.add('hidden'); micBar.style.width='0%';

  const T=Math.round(st.tot),F=Math.round(st.fSec),D=Math.round(st.dSec),p=T>0?Math.round((F/T)*100):0;
  const s={
    id:Date.now(),
    date:new Date().toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}),
    time:new Date().toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}),
    totalSecs:T, focusedSecs:F, distractedSecs:D, focusPercent:p,
    blinkCount:st.bCnt, lookAwayCount:st.lCnt,
    // NEW: save module data
    attentionScore: ATT.score,
    attentionLeaks: ATT.leakFreq,
    burnoutRisk: BURN.risk,
    burnoutScore: BURN.fatigueScore,
    postureScore: POSTURE.score,
    postureStatus: POSTURE.status,
    healthScore: AI.healthScore,
    aiInsight: AI.insight,
  };

  const arr=loadS(); arr.unshift(s); saveS(arr); renderHist();

  if(window.FL_DB){
    window.FL_DB.saveSession(s).catch(e=>console.warn('[FL] Firestore saveSession failed:',e));
  }

  // Credits: +5 focus, +2 good posture, +1 low leaks
  let earned = 0;
  if(p>=75 && T>=120) earned += 5;
  if(POSTURE.score >= 75 && T>=120) earned += 2;
  if(ATT.leakFreq <= 3 && T>=120) earned += 1;

  if(earned > 0){
    var curCredits = parseInt(localStorage.getItem('fl_credits')||'0',10);
    var newCredits = curCredits + earned;
    localStorage.setItem('fl_credits', String(newCredits));
    if(window.FL_DB){
      window.FL_DB.addCredits(earned).then(function(total){
        localStorage.setItem('fl_credits', String(total));
        window.dispatchEvent(new CustomEvent('fl_credits_changed', {detail:{credits:total}}));
      }).catch(function(){
        window.dispatchEvent(new CustomEvent('fl_credits_changed', {detail:{credits:newCredits}}));
      });
    } else {
      window.dispatchEvent(new CustomEvent('fl_credits_changed', {detail:{credits:newCredits}}));
    }

    // Credit toast
    (function(){
      const ct=document.createElement('div');
      ct.style.cssText='position:fixed;top:74px;right:20px;z-index:99999;background:linear-gradient(135deg,#0e1120,#131628);border:1px solid rgba(255,176,32,0.4);border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:12px;box-shadow:0 12px 40px rgba(0,0,0,0.6);animation:flCrIn .4s cubic-bezier(.4,0,.2,1) both';
      const style=document.createElement('style');
      style.textContent='@keyframes flCrIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}@keyframes flCrOut{to{opacity:0;transform:translateX(30px)}}';
      document.head.appendChild(style);
      const breakdown = [p>=75&&T>=120?'+5 focus':'',POSTURE.score>=75&&T>=120?'+2 posture':'',ATT.leakFreq<=3&&T>=120?'+1 low leaks':''].filter(Boolean).join(' · ');
      ct.innerHTML=`<div style="font-size:26px">🪙</div><div><div style="font-family:Syne,sans-serif;font-size:14px;font-weight:900;color:#ffb020">+${earned} Credits Earned!</div><div style="font-family:Space Mono,monospace;font-size:10px;color:#3d4666;margin-top:3px">${breakdown}</div></div><div style="font-size:18px;margin-left:4px">✦</div>`;
      document.body.appendChild(ct);
      setTimeout(function(){ct.style.animation='flCrOut .4s ease both';setTimeout(function(){ct.remove();},420);},4000);
    })();
  }

  liveDot.className='ldot'; liveLbl.textContent='ENDED'; timerTxt.textContent=`${fmt(T)} · ${p}% focus`; chip();
  btnStop.classList.add('hidden'); btnStart.classList.remove('hidden'); btnStart.disabled=false; btnStart.textContent='▶ Start Tracking';
  toast(`Session saved — ${p}% focus${earned>0?' · +'+earned+' credits!':''}`);
}

// ── History ───────────────────────────────────────────────────────────────────
function renderHist(){
  const arr=loadS();
  if(!arr.length){histGrid.innerHTML='<div class="hempty">No sessions yet.<br/>Start tracking to build your history.</div>';return;}
  histGrid.innerHTML=arr.map((s,i)=>{
    const p=s.focusPercent||0,q=pq(p);
    const healthBadge = s.healthScore ? `<div style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:6px;background:rgba(124,58,255,0.1);border:1px solid rgba(124,58,255,0.2);font-size:8px;font-family:'Space Mono',monospace;color:#a855f7;margin-left:6px;">🧠 ${s.healthScore}</div>` : '';
    const postureBadge = s.postureScore ? `<div style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:6px;background:rgba(57,255,156,0.08);border:1px solid rgba(57,255,156,0.15);font-size:8px;font-family:'Space Mono',monospace;color:#39ff9c;margin-left:6px;">🪑 ${s.postureScore}</div>` : '';
    return`<div class="hcard" style="cursor:pointer" onclick="openSessionReport(${i})" title="Click to view full report">
      <div class="htop"><div class="hdate">${s.date}<br/>${s.time}</div><div class="hpct ${q}">${p}%</div></div>
      <div class="hbar"><div class="hfill ${q}" style="width:${p}%"></div></div>
      <div class="hmeta">
        <div class="hmi"><strong>${fmt(s.totalSecs||0)}</strong>Duration</div>
        <div class="hmi"><strong>${fmt(s.focusedSecs||0)}</strong>Focused</div>
        <div class="hmi"><strong>${s.blinkCount||0}</strong>Blinks</div>
        <div class="hmi"><strong>${s.lookAwayCount||0}</strong>Glances</div>
      </div>
      <div style="margin-top:8px;display:flex;align-items:center;flex-wrap:wrap;">${healthBadge}${postureBadge}</div>
      <div style="margin-top:6px;font-family:'Space Mono',monospace;font-size:8px;color:rgba(57,255,156,0.35);letter-spacing:1.5px;text-transform:uppercase;">View Report →</div>
    </div>`;
  }).join('');
}

// ── SESSION REPORT POPUP (Enhanced) ──────────────────────────────────────────
function openSessionReport(idx){
  const arr=loadS();
  const s=arr[idx];
  if(!s) return;

  const p=s.focusPercent||0,q=pq(p);
  const T=s.totalSecs||0, F=s.focusedSecs||0, D=s.distractedSecs||0;
  const fp=T>0?Math.round((F/T)*100):0;
  const dp=T>0?Math.round((D/T)*100):0;
  const grade=p>=90?'S':p>=75?'A':p>=60?'B':p>=40?'C':'D';
  const gradeColor=p>=90?'#39ff9c':p>=75?'#7c3aff':p>=60?'#00d4ff':p>=40?'#ffb020':'#ff3d8a';
  const gradeLabel=p>=90?'Exceptional':p>=75?'Excellent':p>=60?'Good':p>=40?'Average':'Needs Work';

  const existing=document.getElementById('fl-session-report');
  if(existing) existing.remove();

  const el=document.createElement('div');
  el.id='fl-session-report';
  el.innerHTML=`
<style>
#fl-session-report {
  --rpt-overlay-bg: rgba(2,3,10,0.85);
  --rpt-card-bg: linear-gradient(160deg,#0a0d18,#0e1120,#080b16);
  --rpt-card-border: rgba(124,58,255,0.25);
  --rpt-card-shadow: 0 40px 100px rgba(0,0,0,0.7);
  --rpt-card-topline: linear-gradient(90deg,transparent,rgba(124,58,255,0.6),rgba(57,255,156,0.3),transparent);
  --rpt-panel-bg: rgba(14,17,32,0.8);
  --rpt-panel-border: rgba(124,58,255,0.1);
  --rpt-text-primary: #eef2ff;
  --rpt-text-secondary: #94a3c0;
  --rpt-text-muted: #3d4666;
  --rpt-track-bg: rgba(124,58,255,0.08);
  --rpt-eyebrow-bg: rgba(124,58,255,0.1);
  --rpt-eyebrow-border: rgba(124,58,255,0.2);
  --rpt-ai-bg: linear-gradient(135deg,rgba(124,58,255,0.08),rgba(57,255,156,0.04));
  --rpt-ai-border: rgba(124,58,255,0.2);
  --rpt-close-bg: linear-gradient(135deg,rgba(124,58,255,0.15),rgba(124,58,255,0.08));
  --rpt-close-bg-hover: rgba(124,58,255,0.25);
  --rpt-close-border: rgba(124,58,255,0.3);
  --rpt-close-text: #eef2ff;
  --rpt-hint-text: #1e2440;
  position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--rpt-overlay-bg);backdrop-filter:blur(12px);animation:rptFadeIn .3s ease both;
}
body[data-theme='light'] #fl-session-report {
  --rpt-overlay-bg: rgba(240,242,248,0.78);
  --rpt-card-bg: linear-gradient(160deg,#ffffff,#f7f8fd,#eff2fa);
  --rpt-card-border: rgba(109,40,217,0.18);
  --rpt-card-shadow: 0 28px 80px rgba(15,23,42,0.18);
  --rpt-card-topline: linear-gradient(90deg,transparent,rgba(109,40,217,0.35),rgba(5,150,105,0.2),transparent);
  --rpt-panel-bg: rgba(255,255,255,0.85);
  --rpt-panel-border: rgba(109,40,217,0.12);
  --rpt-text-primary: #1f2937;
  --rpt-text-secondary: #374151;
  --rpt-text-muted: #6b7280;
  --rpt-track-bg: rgba(109,40,217,0.12);
  --rpt-eyebrow-bg: rgba(109,40,217,0.08);
  --rpt-eyebrow-border: rgba(109,40,217,0.2);
  --rpt-ai-bg: linear-gradient(135deg,rgba(109,40,217,0.08),rgba(5,150,105,0.06));
  --rpt-ai-border: rgba(109,40,217,0.18);
  --rpt-close-bg: linear-gradient(135deg,rgba(109,40,217,0.12),rgba(109,40,217,0.06));
  --rpt-close-bg-hover: rgba(109,40,217,0.18);
  --rpt-close-border: rgba(109,40,217,0.25);
  --rpt-close-text: #1f2937;
  --rpt-hint-text: #6b7280;
}
@keyframes rptFadeIn  { from{opacity:0} to{opacity:1} }
@keyframes rptSlideUp { from{opacity:0;transform:translateY(40px) scale(0.97)} to{opacity:1;transform:none} }
@keyframes rptOut     { to{opacity:0;transform:translateY(20px) scale(0.97)} }
@keyframes countUp    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
@keyframes barFill    { from{width:0%} to{width:var(--w)} }
@keyframes ringAnim   { from{stroke-dashoffset:201} to{stroke-dashoffset:var(--offset)} }
@keyframes gradePop   { 0%{transform:scale(0.3) rotate(-15deg);opacity:0} 60%{transform:scale(1.12) rotate(3deg)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
@keyframes shimmer    { 0%{background-position:200% center} 100%{background-position:-200% center} }
@keyframes scanline   { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
.rpt-card { position:relative;width:100%;max-width:600px;background:var(--rpt-card-bg);border:1px solid var(--rpt-card-border);border-radius:24px;overflow:hidden;animation:rptSlideUp .4s cubic-bezier(.4,0,.2,1) both;box-shadow:var(--rpt-card-shadow); }
.rpt-card::before { content:'';position:absolute;top:0;left:0;right:0;height:1px;background:var(--rpt-card-topline); }
.rpt-scanline { position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(57,255,156,0.15),transparent);animation:scanline 4s linear infinite;pointer-events:none;z-index:1; }
.rpt-shimmer { position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(57,255,156,0.4),rgba(124,58,255,0.4),transparent);background-size:200% 100%;animation:shimmer 3s linear infinite; }
.rpt-header { padding:24px 24px 0;display:flex;align-items:flex-start;justify-content:space-between;position:relative;z-index:2; }
.rpt-eyebrow { display:inline-flex;align-items:center;gap:6px;padding:3px 12px;border-radius:20px;background:var(--rpt-eyebrow-bg);border:1px solid var(--rpt-eyebrow-border);font-family:'Space Mono',monospace;font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:#a855f7;margin-bottom:8px; }
.rpt-eyebrow-dot { width:5px;height:5px;border-radius:50%;background:#a855f7;box-shadow:0 0 5px #a855f7; }
.rpt-title { font-family:'Syne',sans-serif;font-size:20px;font-weight:900;color:var(--rpt-text-primary);letter-spacing:-0.8px;margin-bottom:2px; }
.rpt-subtitle { font-family:'Space Mono',monospace;font-size:10px;color:var(--rpt-text-muted); }
.rpt-grade { width:68px;height:68px;border-radius:16px;background:var(--rpt-panel-bg);border:2px solid var(--gc);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 30px var(--gs);animation:gradePop .6s .3s cubic-bezier(.175,.885,.32,1.275) both;flex-shrink:0; }
.rpt-grade-letter { font-family:'Syne',sans-serif;font-size:28px;font-weight:900;color:var(--gc);line-height:1;text-shadow:0 0 20px var(--gc); }
.rpt-grade-lbl { font-family:'Space Mono',monospace;font-size:7px;letter-spacing:1px;color:var(--gc);opacity:0.7;text-transform:uppercase; }
.rpt-score-section { padding:16px 24px;display:flex;align-items:center;gap:20px;position:relative;z-index:2; }
.rpt-ring-wrap { position:relative;width:90px;height:90px;flex-shrink:0; }
.rpt-ring-wrap svg { transform:rotate(-90deg); }
.rpt-ring-bg { fill:none;stroke:var(--rpt-track-bg);stroke-width:8; }
.rpt-ring-fg { fill:none;stroke-width:8;stroke-linecap:round;stroke-dasharray:201;animation:ringAnim 1.2s .4s cubic-bezier(.4,0,.2,1) both; }
.rpt-ring-center { position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center; }
.rpt-score-num { font-family:'Syne',sans-serif;font-size:26px;font-weight:900;color:var(--rpt-text-primary);line-height:1;animation:countUp .5s .6s ease both; }
.rpt-score-pct { font-family:'Syne',sans-serif;font-size:12px;color:var(--rpt-text-muted); }
.rpt-score-info { flex:1; }
.rpt-score-label { font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--rpt-text-primary);margin-bottom:4px; }
.rpt-score-sub { font-family:'Space Mono',monospace;font-size:10px;color:var(--rpt-text-muted);line-height:1.6; }
/* Module scores row */
.rpt-modules { display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:0 24px;position:relative;z-index:2; }
.rpt-mod { background:var(--rpt-panel-bg);border:1px solid var(--rpt-panel-border);border-radius:12px;padding:12px 8px;text-align:center;animation:countUp .4s ease both; }
.rpt-mod:nth-child(1){animation-delay:.5s} .rpt-mod:nth-child(2){animation-delay:.6s} .rpt-mod:nth-child(3){animation-delay:.7s} .rpt-mod:nth-child(4){animation-delay:.8s}
.rpt-mod-val { font-family:'Syne',sans-serif;font-size:18px;font-weight:900;line-height:1;margin-bottom:3px; }
.rpt-mod-lbl { font-family:'Space Mono',monospace;font-size:7px;letter-spacing:1px;text-transform:uppercase;color:var(--rpt-text-muted); }
/* AI insight */
.rpt-ai { margin:14px 24px;padding:14px 16px;background:var(--rpt-ai-bg);border:1px solid var(--rpt-ai-border);border-radius:14px;position:relative;z-index:2;animation:countUp .4s .9s ease both; }
.rpt-ai-label { font-family:'Space Mono',monospace;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#a855f7;margin-bottom:6px; }
.rpt-ai-text { font-family:'Inter',sans-serif;font-size:12px;color:var(--rpt-text-secondary);line-height:1.6; }
/* Stats */
.rpt-stats { display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 24px;position:relative;z-index:2; }
.rpt-stat { background:var(--rpt-panel-bg);border:1px solid var(--rpt-panel-border);border-radius:12px;padding:12px;text-align:center;animation:countUp .4s ease both; }
.rpt-stat-val { font-family:'Syne',sans-serif;font-size:18px;font-weight:900;color:var(--rpt-text-primary);line-height:1;margin-bottom:3px; }
.rpt-stat-lbl { font-family:'Space Mono',monospace;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:var(--rpt-text-muted); }
.rpt-breakdown { padding:14px 24px;position:relative;z-index:2; }
.rpt-breakdown-title { font-family:'Space Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--rpt-text-muted);margin-bottom:12px;display:flex;align-items:center;gap:10px; }
.rpt-breakdown-title::after { content:'';flex:1;height:1px;background:var(--rpt-panel-border); }
.rpt-bar-row { margin-bottom:10px; }
.rpt-bar-label { display:flex;justify-content:space-between;align-items:center;margin-bottom:5px; }
.rpt-bar-name { font-family:'Space Mono',monospace;font-size:10px;color:var(--rpt-text-secondary); }
.rpt-bar-pct { font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--rpt-text-primary); }
.rpt-bar-track { height:5px;background:var(--rpt-track-bg);border-radius:3px;overflow:hidden; }
.rpt-bar-fill { height:100%;border-radius:3px;width:var(--w);animation:barFill 1s cubic-bezier(.4,0,.2,1) both; }
.rpt-bar-fill.focused    { background:linear-gradient(90deg,#1a6b3c,#39ff9c);animation-delay:.7s; }
.rpt-bar-fill.distracted { background:linear-gradient(90deg,#6b1a2a,#ff3d8a);animation-delay:.85s; }
.rpt-highlights { padding:0 24px;display:flex;gap:7px;flex-wrap:wrap;position:relative;z-index:2; }
.rpt-chip { display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;background:var(--rpt-panel-bg);border:1px solid var(--rpt-panel-border);font-family:'Space Mono',monospace;font-size:10px;color:var(--rpt-text-secondary);animation:countUp .4s ease both; }
.rpt-chip:nth-child(1){animation-delay:.8s} .rpt-chip:nth-child(2){animation-delay:.9s} .rpt-chip:nth-child(3){animation-delay:1s} .rpt-chip:nth-child(4){animation-delay:1.1s}
.rpt-chip-dot { width:6px;height:6px;border-radius:50%; }
.rpt-footer { padding:16px 24px 24px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2; }
.rpt-close { padding:10px 24px;border-radius:10px;background:var(--rpt-close-bg);border:1px solid var(--rpt-close-border);color:var(--rpt-close-text);font-family:'Syne',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:all .2s; }
.rpt-close:hover { background:var(--rpt-close-bg-hover);transform:translateY(-1px); }
.rpt-close-hint { font-family:'Space Mono',monospace;font-size:9px;color:var(--rpt-hint-text);letter-spacing:1px; }
</style>
<div class="rpt-card">
  <div class="rpt-scanline"></div>
  <div class="rpt-shimmer"></div>
  <div class="rpt-header">
    <div>
      <div class="rpt-eyebrow"><div class="rpt-eyebrow-dot"></div>Session Report · FocusLens 2.0</div>
      <div class="rpt-title">${s.date}</div>
      <div class="rpt-subtitle">${s.time} &nbsp;·&nbsp; ${fmt(T)} total</div>
    </div>
    <div class="rpt-grade" style="--gc:${gradeColor};--gs:${gradeColor}44">
      <div class="rpt-grade-letter">${grade}</div>
      <div class="rpt-grade-lbl">${gradeLabel}</div>
    </div>
  </div>
  <div class="rpt-score-section">
    <div class="rpt-ring-wrap">
      <svg width="90" height="90" viewBox="0 0 70 70">
        <circle class="rpt-ring-bg" cx="35" cy="35" r="32"/>
        <circle class="rpt-ring-fg" cx="35" cy="35" r="32" stroke="${gradeColor}" style="--offset:${Math.round(201-(p/100)*201)}"/>
      </svg>
      <div class="rpt-ring-center">
        <div class="rpt-score-num" style="color:${gradeColor}">${p}</div>
        <div class="rpt-score-pct">%</div>
      </div>
    </div>
    <div class="rpt-score-info">
      <div class="rpt-score-label" style="color:${gradeColor}">${gradeLabel} Focus</div>
      <div class="rpt-score-sub">${fp}% focused · ${dp}% distracted<br>${p>=75?'🪙 Credits awarded':'Reach 75% to earn credits'}</div>
    </div>
  </div>
  <!-- Module Scores -->
  <div class="rpt-modules">
    <div class="rpt-mod">
      <div class="rpt-mod-val" style="color:${(s.attentionScore||100)>=70?'#39ff9c':(s.attentionScore||100)>=40?'#ffb020':'#ff3d8a'}">${s.attentionScore||'—'}</div>
      <div class="rpt-mod-lbl">Attention</div>
    </div>
    <div class="rpt-mod">
      <div class="rpt-mod-val" style="color:${(s.burnoutRisk||'Low')==='Low'?'#39ff9c':(s.burnoutRisk||'Low')==='Medium'?'#ffb020':'#ff3d8a'}">${s.burnoutRisk||'Low'}</div>
      <div class="rpt-mod-lbl">Burnout</div>
    </div>
    <div class="rpt-mod">
      <div class="rpt-mod-val" style="color:${(s.postureScore||100)>=75?'#39ff9c':(s.postureScore||100)>=40?'#ffb020':'#ff3d8a'}">${s.postureScore||'—'}</div>
      <div class="rpt-mod-lbl">Posture</div>
    </div>
    <div class="rpt-mod">
      <div class="rpt-mod-val" style="color:#a855f7">${s.healthScore||'—'}</div>
      <div class="rpt-mod-lbl">Health</div>
    </div>
  </div>
  <!-- AI Insight -->
  ${s.aiInsight ? `<div class="rpt-ai"><div class="rpt-ai-label">🧠 AI Insight</div><div class="rpt-ai-text">${s.aiInsight}</div></div>` : ''}
  <!-- Core stats -->
  <div class="rpt-stats" style="margin-top:14px;">
    <div class="rpt-stat"><div class="rpt-stat-val" style="color:#39ff9c">${fmt(F)}</div><div class="rpt-stat-lbl">Focused</div></div>
    <div class="rpt-stat"><div class="rpt-stat-val" style="color:#ff3d8a">${fmt(D)}</div><div class="rpt-stat-lbl">Distracted</div></div>
    <div class="rpt-stat"><div class="rpt-stat-val" style="color:#00d4ff">${fmt(T)}</div><div class="rpt-stat-lbl">Duration</div></div>
  </div>
  <div class="rpt-breakdown">
    <div class="rpt-breakdown-title">Time Breakdown</div>
    <div class="rpt-bar-row"><div class="rpt-bar-label"><span class="rpt-bar-name">Focused</span><span class="rpt-bar-pct" style="color:#39ff9c">${fp}%</span></div><div class="rpt-bar-track"><div class="rpt-bar-fill focused" style="--w:${fp}%"></div></div></div>
    <div class="rpt-bar-row"><div class="rpt-bar-label"><span class="rpt-bar-name">Distracted</span><span class="rpt-bar-pct" style="color:#ff3d8a">${dp}%</span></div><div class="rpt-bar-track"><div class="rpt-bar-fill distracted" style="--w:${dp}%"></div></div></div>
  </div>
  <div class="rpt-highlights">
    <div class="rpt-chip"><div class="rpt-chip-dot" style="background:#39ff9c"></div>${s.blinkCount||0} blinks</div>
    <div class="rpt-chip"><div class="rpt-chip-dot" style="background:#ffb020"></div>${s.lookAwayCount||0} look-aways</div>
    <div class="rpt-chip"><div class="rpt-chip-dot" style="background:#a855f7"></div>${s.attentionLeaks||0} att. leaks/min</div>
    <div class="rpt-chip"><div class="rpt-chip-dot" style="background:#00d4ff"></div>${s.postureStatus||'—'} posture</div>
  </div>
  <div class="rpt-footer">
    <div class="rpt-close-hint">ESC or click outside to close</div>
    <button class="rpt-close" onclick="closeSessionReport()">Close Report ✕</button>
  </div>
</div>`;

  document.body.appendChild(el);
  el.addEventListener('click', e=>{ if(e.target===el) closeSessionReport(); });
}

function closeSessionReport(){
  const el=document.getElementById('fl-session-report');
  if(!el) return;
  const card=el.querySelector('.rpt-card');
  if(card) card.style.animation='rptOut .25s ease both';
  el.style.animation='rptFadeIn .25s ease reverse both';
  setTimeout(()=>el.remove(), 260);
}
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeSessionReport(); });

// ── Events ────────────────────────────────────────────────────────────────────
btnStart.addEventListener('click', startTracking);
btnStop.addEventListener('click', stopTracking);
btnClear.addEventListener('click', async ()=>{
  if(!confirm('Delete all history?'))return;
  saveS([]); renderHist();
  if(window.FL_USER && window.FL_USER.clearSessions){
    try{ await window.FL_USER.clearSessions(); }catch(e){ console.warn('[FL] clearSessions error:',e); }
  }
  localStorage.setItem('fl_credits','0');
  window.dispatchEvent(new CustomEvent('fl_credits_changed',{detail:{credits:0}}));
  toast('History cleared');
});
document.addEventListener('visibilitychange',()=>{
  if(!st.trk)return;
  if(document.hidden){clearInterval(tt);st.lastTick=null;}
  else{st.lastTick=Date.now();tt=setInterval(tick,1000);toast('Tab back — resuming');}
});

// ── Go ─────────────────────────────────────────────────────────────────────────
boot();
