// ============================================================
// Utilidades compartilhadas — Fábrica de Palavras
// (depende de word-bank.js já ter sido carregado antes)
// ============================================================

// ---------- Todas as palavras (para o álbum de figurinhas) ----------
const ALL_WORDS = [...WORDS.facil, ...WORDS.medio];

// ---------- Som ligado/desligado (lembrado entre visitas) ----------
let audioEnabled = localStorage.getItem('fp-som') !== 'off';

function setupSoundButton(){
  const btn = document.getElementById('soundBtn');
  if(!btn) return;
  const paint = ()=>{
    btn.textContent = audioEnabled ? '🔊' : '🔇';
    btn.classList.toggle('muted', !audioEnabled);
    btn.setAttribute('aria-label', audioEnabled ? 'Desligar o som' : 'Ligar o som');
  };
  paint();
  btn.addEventListener('click', ()=>{
    audioEnabled = !audioEnabled;
    localStorage.setItem('fp-som', audioEnabled ? 'on' : 'off');
    paint();
    if(!audioEnabled && 'speechSynthesis' in window) speechSynthesis.cancel();
  });
}

// ---------- Fala (voz do navegador, pt-BR) ----------
function speak(text){
  if(!audioEnabled || !('speechSynthesis' in window)) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    u.rate = 0.85;
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  }catch(e){ /* fala indisponível, ignora */ }
}

// ---------- Efeitos sonoros (sem arquivos externos) ----------
let audioCtx = null;
function ping(success){
  if(!audioEnabled) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const ctx = audioCtx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    const t = ctx.currentTime;
    if(success){
      o.frequency.setValueAtTime(523.25, t);
      o.frequency.setValueAtTime(783.99, t+0.1);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.4);
      o.start(t); o.stop(t+0.4);
    } else {
      o.frequency.setValueAtTime(300, t);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.15);
      o.start(t); o.stop(t+0.15);
    }
  }catch(e){ /* áudio indisponível, ignora */ }
}

// ---------- Confete ----------
function confetti(anchor){
  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = anchor.getBoundingClientRect();
  const colors = ['#FF6B6B','#3FBFB0','#FFC93C','#68C37B','#A78BFA','#FF9F45','#FF8FB1'];
  for(let i=0;i<18;i++){
    const p = document.createElement('div');
    const size = 6 + Math.random()*6;
    Object.assign(p.style, {
      position:'fixed',
      left:(rect.left + rect.width/2) + 'px',
      top:(rect.top + 10) + 'px',
      width:size+'px', height:size+'px',
      background:colors[Math.floor(Math.random()*colors.length)],
      borderRadius:Math.random()>0.5 ? '50%' : '3px',
      zIndex:3000, pointerEvents:'none',
    });
    document.body.appendChild(p);
    const angle = (Math.random()*Math.PI) - Math.PI;
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

// ---------- Embaralhar array ----------
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

// ---------- Álbum de figurinhas (um por jogo, salvo no navegador) ----------
// Usa os elementos #albumTitle, #albumToggleBtn e #gallery da página.
let albumKey = null;
const collectedScores = new Map(); // palavra -> melhor pontuação

function setupAlbum(gameId){
  albumKey = 'fp-album-' + gameId;
  try{
    const saved = JSON.parse(localStorage.getItem(albumKey) || '{}');
    Object.entries(saved).forEach(([word, pts])=> collectedScores.set(word, pts));
  }catch(e){ /* dados salvos inválidos, começa do zero */ }

  const toggle = document.getElementById('albumToggleBtn');
  const gallery = document.getElementById('gallery');
  toggle.addEventListener('click', ()=>{
    const open = gallery.classList.toggle('open');
    toggle.textContent = open ? 'Esconder álbum' : 'Ver álbum completo';
    toggle.setAttribute('aria-expanded', open);
  });
  renderAlbum();
}

function collectSticker(word, earned){
  const best = collectedScores.get(word) || 0;
  collectedScores.set(word, Math.max(best, earned));
  try{ localStorage.setItem(albumKey, JSON.stringify(Object.fromEntries(collectedScores))); }catch(e){}
  renderAlbum();
}

function renderAlbum(){
  const title = document.getElementById('albumTitle');
  const gallery = document.getElementById('gallery');
  const total = ALL_WORDS.filter(w => collectedScores.has(w.word)).length;
  title.textContent = `🏆 Álbum de Figurinhas — ${total}/${ALL_WORDS.length} coletadas`;
  gallery.innerHTML = '';
  ALL_WORDS.forEach(w=>{
    const pts = collectedScores.get(w.word);
    const el = document.createElement('div');
    el.className = 'sticker ' + (pts ? 'unlocked' : 'locked');
    el.innerHTML = pts
      ? `<img class="word-art" src="${w.art}" alt="${w.word.toLowerCase()}" loading="lazy"><span>${w.word}</span><span class="sticker-score">+${pts} pts</span>`
      : `<img class="word-art" src="${LOCKED_ART}" alt="Figurinha bloqueada" loading="lazy"><span>?????</span>`;
    gallery.appendChild(el);
  });
}

// Liga o botão de som e o álbum de um jogo
function initCommon(gameId){
  setupSoundButton();
  setupAlbum(gameId);
}
