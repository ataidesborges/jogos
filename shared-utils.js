// ============================================================
// Utilidades compartilhadas — Fábrica de Palavras
// (depende de word-bank.js já ter sido carregado antes)
// ============================================================

// ---------- Illustrated icons (Twemoji) with graceful offline fallback ----------
function twemojify(el){
  if(window.twemoji){
    try{ twemoji.parse(el, {folder:'svg', ext:'.svg'}); }catch(e){ /* ignore */ }
  }
}
// if an icon image fails to load (e.g. no internet), fall back to the plain emoji character
document.addEventListener('error', function(e){
  const t = e.target;
  if(t && t.tagName === 'IMG' && t.classList && t.classList.contains('emoji') && t.alt){
    t.replaceWith(document.createTextNode(t.alt));
  }
}, true);

// ---------- All words (for the sticker album) ----------
const ALL_WORDS = [...WORDS.facil, ...WORDS.medio];
ALL_WORDS.forEach(w => { w.art = wordArtByName.get(w.word) || WORD_ART.nature; });
const collected = new Set(); // words already formed this session
const collectedScores = new Map(); // word -> best score earned for it this session

// ---------- Speech (built-in browser voice, pt-BR) ----------
function speak(text){
  if(!audioEnabled || !('speechSynthesis' in window)) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    u.rate = 0.85;
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  }catch(e){ /* speech not available, ignore */ }
}

// ---------- Sound (tiny, no external files) ----------
function ping(success){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    if(success){
      o.frequency.setValueAtTime(523.25, ctx.currentTime);
      o.frequency.setValueAtTime(783.99, ctx.currentTime+0.1);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.4);
      o.start(); o.stop(ctx.currentTime+0.4);
    } else {
      o.frequency.setValueAtTime(300, ctx.currentTime);
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.15);
      o.start(); o.stop(ctx.currentTime+0.15);
    }
  }catch(e){ /* audio not available, ignore */ }
}

// ---------- Tiny confetti burst ----------
function confetti(anchor){
  const rect = anchor.getBoundingClientRect();
  const colors = ['#FF6B6B','#3FBFB0','#FFC93C','#68C37B','#A78BFA','#FF9F45','#FF8FB1'];
  for(let i=0;i<18;i++){
    const p = document.createElement('div');
    const size = 6 + Math.random()*6;
    p.style.position = 'fixed';
    p.style.left = (rect.left + rect.width/2) + 'px';
    p.style.top = (rect.top + 10) + 'px';
    p.style.width = size+'px';
    p.style.height = size+'px';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.borderRadius = Math.random()>0.5 ? '50%' : '3px';
    p.style.zIndex = 999;
    p.style.pointerEvents = 'none';
    document.body.appendChild(p);
    const angle = (Math.random()*Math.PI) - Math.PI/2 - Math.PI/2;
    const dist = 80 + Math.random()*140;
    const dx = Math.cos(angle)*dist;
    const dy = Math.sin(angle)*dist - 60;
    p.animate([
      {transform:'translate(0,0) rotate(0deg)', opacity:1},
      {transform:`translate(${dx}px, ${dy+220}px) rotate(${360*Math.random()}deg)`, opacity:0}
    ], {duration: 900+Math.random()*400, easing:'cubic-bezier(.2,.8,.3,1)'});
    setTimeout(()=>p.remove(), 1400);
  }
}


// ---------- Utilidade: embaralhar array ----------
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}
