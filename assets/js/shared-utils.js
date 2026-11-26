// ============================================================
// Utilidades compartilhadas — Fábrica de Palavras
// (depende de word-bank.js já ter sido carregado antes)
// ============================================================

// ---------- Todas as palavras (para o álbum de figurinhas) ----------
const ALL_WORDS = [...WORDS.facil, ...WORDS.medio];

// ---------- Ícones (traço simples, herdam a cor do texto) ----------
const ICONS = {
  soundOn:  '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
  soundOff: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>',
  expand:   '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  shrink:   '<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>',
};
function icon(name){
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

// ---------- Som ligado/desligado (lembrado entre visitas) ----------
let audioEnabled = localStorage.getItem('fp-som') !== 'off';

function setupSoundButton(){
  const btn = document.getElementById('soundBtn');
  if(!btn) return;
  const paint = ()=>{
    btn.innerHTML = icon(audioEnabled ? 'soundOn' : 'soundOff');
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
    overlayRoot().appendChild(p);
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
    toggle.textContent = open ? 'Esconder álbum' : 'Ver álbum';
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
  const count = document.getElementById('albumCount');
  const bar = document.getElementById('albumBar');
  const gallery = document.getElementById('gallery');
  const total = ALL_WORDS.filter(w => collectedScores.has(w.word)).length;
  if(count) count.textContent = `${total} de ${ALL_WORDS.length} figurinhas coletadas`;
  if(bar) bar.style.width = (100 * total / ALL_WORDS.length) + '%';
  gallery.innerHTML = '';
  ALL_WORDS.forEach(w=>{
    const pts = collectedScores.get(w.word);
    const el = document.createElement('div');
    el.className = 'sticker ' + (pts ? 'unlocked' : 'locked');
    el.innerHTML = pts
      ? `<img class="word-art" src="${w.art}" alt="${w.word.toLowerCase()}" loading="lazy"><span>${w.word}</span><span class="sticker-score">+${pts} pts</span>`
      : `<span class="sticker-lock" aria-hidden="true">?</span><span>???</span>`;
    gallery.appendChild(el);
  });
}

// ---------- Tela cheia (só a "janela do jogo": níveis, pontos e o jogo) ----------
// Usa o elemento #gameWindow da página. Onde o navegador não deixa colocar um
// elemento em tela cheia (ex.: iPhone), a janela ocupa a tela inteira da página.
const gameWindow = document.getElementById('gameWindow');

// Onde colocar elementos flutuantes (confete, sílaba sendo arrastada): em tela
// cheia de verdade, só o que está dentro da janela do jogo aparece.
function overlayRoot(){
  if(gameWindow && gameWindow.classList.contains('is-fs')) return gameWindow;
  return document.fullscreenElement || document.webkitFullscreenElement || document.body;
}

function setupFullscreen(){
  if(!gameWindow) return;
  const row = gameWindow.querySelector('.progress-row');
  const btn = document.createElement('button');
  btn.id = 'fsBtn';
  btn.className = 'fs-btn';
  row.appendChild(btn);

  let pseudo = false;
  const isNative = ()=> (document.fullscreenElement || document.webkitFullscreenElement) === gameWindow;

  const paint = ()=>{
    const on = isNative() || pseudo;
    gameWindow.classList.toggle('is-fs', on);
    gameWindow.classList.toggle('is-pseudo', pseudo);
    document.body.classList.toggle('fs-lock', on);
    btn.innerHTML = on
      ? `${icon('shrink')}<span class="fs-label">Sair da tela cheia</span>`
      : `${icon('expand')}<span class="fs-label">Tela cheia</span>`;
    btn.setAttribute('aria-label', on ? 'Sair da tela cheia' : 'Tela cheia');
    btn.setAttribute('aria-pressed', on);
    window.dispatchEvent(new Event('resize'));
  };
  const setPseudo = (v)=>{ pseudo = v; paint(); };

  btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    btn.blur(); // evita que a barra de espaço do jogo aperte o botão de novo
    if(isNative()){
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    if(pseudo){ setPseudo(false); return; }
    const req = gameWindow.requestFullscreen || gameWindow.webkitRequestFullscreen;
    if(!req){ setPseudo(true); return; }
    try{
      const r = req.call(gameWindow);
      if(r && r.catch) r.catch(()=> setPseudo(true));
      // se o navegador não responder (alguns apps e tablets), usa o modo da página
      setTimeout(()=>{ if(!isNative() && !pseudo) setPseudo(true); }, 700);
    }catch(err){ setPseudo(true); }
  });
  const onChange = ()=>{ if(isNative()) pseudo = false; paint(); };
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange);
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && pseudo) setPseudo(false);
  });
  paint();
}

// Liga o botão de som, o álbum e a tela cheia de um jogo
function initCommon(gameId){
  setupSoundButton();
  setupAlbum(gameId);
  setupFullscreen();
}
