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

// ---------- Fala (voz do navegador, sempre em português) ----------
// Escolhe a melhor voz em português que o aparelho tiver (as vozes "naturais"
// soam bem menos robóticas) e NUNCA usa voz em inglês: se o aparelho não tiver
// voz em português, o jogo fica em silêncio em vez de falar errado.
let ptVoice = null;
let voicesReady = false;

function scoreVoice(v){
  const name = v.name.toLowerCase();
  const lang = (v.lang || '').toLowerCase().replace('_', '-');
  let s = 0;
  if(lang === 'pt-br') s += 100;            // português do Brasil
  else if(lang.startsWith('pt')) s += 40;   // português de Portugal (melhor que inglês)
  else return -1;                           // qualquer outra língua: nunca
  if(/natural|neural|online|premium|enhanced|aprimorad/.test(name)) s += 50; // vozes naturais
  if(/francisca|thalita|leticia|letícia|brenda|giovanna|yara|elza|manuela/.test(name)) s += 25; // Edge (Microsoft)
  if(/google/.test(name)) s += 30;          // Chrome / Android
  if(/luciana|felipe|fernanda/.test(name)) s += 20; // iPhone / iPad / Mac
  if(/maria|daniel|heloisa|helena/.test(name) && !/natural|online/.test(name)) s -= 10; // antigas do Windows (robóticas)
  if(/daniel|antonio|antônio|felipe|ricardo/.test(name)) s -= 3; // empate: prefere voz feminina, como a da professora
  if(v.localService === false) s += 5;      // vozes na nuvem costumam ser melhores
  return s;
}

function pickVoice(){
  if(!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  if(!voices.length) return;
  voicesReady = true;
  let best = null, bestScore = -1;
  voices.forEach(v => { const s = scoreVoice(v); if(s > bestScore){ best = v; bestScore = s; } });
  ptVoice = best; // null se não houver nenhuma voz em português
  const btn = document.getElementById('soundBtn');
  if(btn) btn.title = ptVoice ? `Som ligado · voz: ${ptVoice.name}` : 'Este aparelho não tem voz em português';
}
if('speechSynthesis' in window){
  pickVoice();
  speechSynthesis.addEventListener ? speechSynthesis.addEventListener('voiceschanged', pickVoice)
                                   : (speechSynthesis.onvoiceschanged = pickVoice);
}

function say(text, rate){
  if(!audioEnabled || !('speechSynthesis' in window) || !text) return;
  if(!voicesReady) pickVoice();
  if(!ptVoice){
    // as vozes ainda estão carregando: tenta de novo em instantes
    if(!voicesReady) setTimeout(()=>{ pickVoice(); if(ptVoice) say(text, rate); }, 400);
    return;
  }
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = ptVoice;
    u.lang = ptVoice.lang;
    u.rate = rate;
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  }catch(e){ /* fala indisponível, ignora */ }
}

// Palavras: sempre em minúsculas (em MAIÚSCULAS a voz às vezes soletra, como se fosse sigla)
function speak(text){
  say(String(text).toLocaleLowerCase('pt-BR'), 0.85);
}

// Sílabas soltas: escreve do jeito que se fala, para a voz não soletrar
// ("BA" virava "bê-á") nem ler em inglês. Ex.: BA → bá, CE → sé, GI → jí, HA → á.
const SYLLABLE_SAY = {
  A:'á', E:'é', I:'í', O:'ó', U:'ú',
  CE:'sé', CI:'sí', GE:'jé', GI:'jí',
  HA:'á', HE:'é', HI:'í', HO:'ó', HU:'ú',
  XA:'chá', XE:'ché', XI:'chí', XO:'chó', XU:'chú',
  QUE:'kê', QUI:'kí', GUE:'guê', GUI:'guí',
};
const ACUTE = {a:'á', e:'é', i:'í', o:'ó', u:'ú'};
function syllableToSpeech(syl){
  const up = String(syl).toUpperCase();
  if(SYLLABLE_SAY[up]) return SYLLABLE_SAY[up];
  const low = up.toLocaleLowerCase('pt-BR');
  if(/[áéíóúâêôãõ]/.test(low)) return low; // já tem acento (ex.: lão, péu)
  // uma só vogal no fim (ba, cho, gre, nha): põe acento nela → bá, chó, gré, nhá
  const m = low.match(/^([^aeiou]*)([aeiou])$/);
  if(m) return m[1] + ACUTE[m[2]];
  return low; // sílabas como bar, pin, pei, ão ficam como estão
}
function speakSyllable(syl){
  say(syllableToSpeech(syl), 0.8);
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

// ---------- Imagens das palavras ----------
// Troca a imagem de um <img> e só avisa quando a nova já carregou — assim a
// figurinha nunca aparece com a imagem da palavra anterior.
function setArt(img, src, alt){
  img.alt = alt || '';
  return new Promise(resolve=>{
    let finished = false;
    const done = ()=>{
      if(finished) return;
      finished = true;
      img.style.visibility = '';
      resolve();
    };
    if(img.getAttribute('src') === src && img.complete && img.naturalWidth){ done(); return; }
    img.style.visibility = 'hidden';
    img.onload = img.onerror = done;
    img.src = src;
    if(img.complete && img.naturalWidth) done();
    setTimeout(done, 1500); // se a internet estiver lenta, mostra mesmo assim
  });
}

// Baixa todas as imagens em segundo plano, para aparecerem na hora no jogo
function preloadArt(){
  const run = ()=> ALL_WORDS.forEach(w=>{ const i = new Image(); i.src = w.art; });
  if('requestIdleCallback' in window) requestIdleCallback(run, {timeout:3000});
  else setTimeout(run, 1200);
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
// Usa uma camada própria (não muda o layout da janela; antes a sílaba arrastada
// virava o "último item" da janela e a página inteira pulava para baixo).
let fsLayer = null;
function overlayRoot(){
  if(gameWindow && gameWindow.classList.contains('is-fs') && fsLayer) return fsLayer;
  return document.fullscreenElement || document.webkitFullscreenElement || document.body;
}

function setupFullscreen(){
  if(!gameWindow) return;
  fsLayer = document.createElement('div');
  fsLayer.className = 'fs-layer';
  gameWindow.appendChild(fsLayer);
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
  preloadArt();
}

// ---------- Nome das letras (para os jogos de alfabeto) ----------
const LETTER_NAMES = {
  A:'á', B:'bê', C:'cê', D:'dê', E:'é', F:'éfe', G:'gê', H:'agá', I:'í', J:'jóta',
  K:'cá', L:'éle', M:'ême', N:'êne', O:'ó', P:'pê', Q:'quê', R:'érre', S:'ésse',
  T:'tê', U:'ú', V:'vê', W:'dáblio', X:'xis', Y:'ípsilon', Z:'zê',
};
function speakLetter(letter){
  const up = String(letter).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  say(LETTER_NAMES[up] || up.toLowerCase(), 0.8);
}

// ---------- Silhueta (sombra) de uma figura ----------
// As figuras têm fundo branco, então um simples "pintar de preto" virava um
// quadrado. Aqui o fundo branco é apagado (a partir das bordas) e o resto da
// figura vira uma silhueta da cor escolhida. O resultado fica guardado.
const silhouetteCache = new Map();
function silhouette(src, color){
  color = color || '#2A1B5C';
  const key = src + '|' + color;
  if(silhouetteCache.has(key)) return silhouetteCache.get(key);
  const job = new Promise(resolve=>{
    const img = new Image();
    img.onload = ()=>{
      try{
        const size = 220;
        const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight, 1) || 1;
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d', {willReadFrequently:true});
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h);
        const px = data.data;
        const isBg = i => px[i + 3] < 30 || (px[i] > 228 && px[i + 1] > 228 && px[i + 2] > 228);
        // apaga o fundo: "pinta" a partir das bordas tudo que for branco/transparente
        const seen = new Uint8Array(w * h);
        const stack = [];
        for(let x = 0; x < w; x++){ stack.push(x, (h - 1) * w + x); }
        for(let y = 0; y < h; y++){ stack.push(y * w, y * w + w - 1); }
        while(stack.length){
          const p = stack.pop();
          if(seen[p]) continue;
          seen[p] = 1;
          const i = p * 4;
          if(!isBg(i)) continue;
          px[i + 3] = 0;
          const x = p % w, y = (p / w) | 0;
          if(x > 0) stack.push(p - 1);
          if(x < w - 1) stack.push(p + 1);
          if(y > 0) stack.push(p - w);
          if(y < h - 1) stack.push(p + w);
        }
        // o resto vira silhueta
        const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
        for(let i = 0; i < px.length; i += 4){
          if(px[i + 3] === 0) continue;
          px[i] = r; px[i + 1] = g; px[i + 2] = b;
        }
        ctx.putImageData(data, 0, 0);
        resolve(cv.toDataURL('image/png'));
      }catch(e){ resolve(src); } // se algo falhar, mostra a figura normal
    };
    img.onerror = ()=> resolve(src);
    img.src = src;
  });
  silhouetteCache.set(key, job);
  return job;
}
