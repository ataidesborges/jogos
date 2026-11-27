// ============================================================
// Tabuada Aventura: MÚSICA DE FUNDO (feita no próprio jogo)
//  Melodias originais em estilo videogame, uma para cada tema, mais
//  um som de ambiente (passarinhos, ondas, vento, grilos, gotas, vulcão).
//  Nada de arquivos de música: tudo é gerado pelo navegador (Web Audio),
//  então não há problema de direitos autorais e não pesa no site.
//  Liga/desliga pelo botão 🎵 (fica salvo no aparelho).
// ============================================================

const MUSIC_KEY = 'fp-musica';
let musicOn = localStorage.getItem(MUSIC_KEY) !== 'off';

// mel: 64 passos (4 compassos de 16). Dígito = nota da escala; '-' = silêncio.
const SONGS = {
  Floresta:{bpm:116, root:72, scale:[0, 2, 4, 7, 9], lead:'square', bass:[0, -3, 5, 7], drums:true, amb:'passaros',
    mel:'0-2-4-2-5-4-2---3-4-5-4-2-0-2---0-2-4-5-7-5-4---5-4-2-0-2---0---'},
  Praia:{bpm:96, root:67, scale:[0, 2, 4, 7, 9], lead:'triangle', bass:[0, 5, -3, 7], drums:false, amb:'ondas',
    mel:'0---2---4---2---5---4---2-------4---5---7---5---4---2---0-------'},
  Neve:{bpm:88, root:76, scale:[0, 2, 4, 7, 9], lead:'sine', bass:[0, -5, -3, -7], drums:false, amb:'vento',
    mel:'7-5-4---5-4-2---4-2-0---2---4---7-9-7-5-4---2---4-5-4-2-0-------'},
  Noite:{bpm:92, root:69, scale:[0, 3, 5, 7, 10], lead:'triangle', bass:[0, -4, -2, -5], drums:false, amb:'grilos',
    mel:'0---1-2-1---0---2---3-2-1-------0-1-2-3-4---3---2-1-0-----------'},
  Caverna:{bpm:80, root:62, scale:[0, 3, 5, 7, 10], lead:'triangle', bass:[0, 0, -2, -5], drums:false, amb:'gotas',
    mel:'0-------2-------1-------0-------3-------2---1---0---------------'},
  'Vulcão':{bpm:132, root:64, scale:[0, 3, 5, 7, 10], lead:'sawtooth', bass:[0, 0, 3, -2], drums:true, amb:'vulcao',
    mel:'0-0-1-0-2-0-1-0-0-0-1-0-3-2-1---4-3-2-1-2-1-0-0-0-0-1-0-2---0---'},
  Chefe:{bpm:150, root:64, scale:[0, 3, 5, 6, 7, 10], lead:'sawtooth', bass:[0, 3, 5, 6], drums:true, amb:'vulcao',
    mel:'0-0-3-0-5-0-3-0-6-5-3---0---0-0-3-0-5-0-6-5-4---3---2-1-0-------'},
};

const music = {song:null, step:0, next:0, timer:0, out:null, amb:null, noise:null};
const midi = m => 440 * Math.pow(2, (m - 69) / 12);

function musicCtx(){
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }catch(e){ return null; }
}
function noiseBuffer(ctx){
  if(music.noise) return music.noise;
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = b.getChannelData(0);
  for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (music.noise = b);
}
function note(ctx, freq, t, dur, type, vol){
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + .015);
  g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); g.connect(music.out);
  o.start(t); o.stop(t + dur + .05);
}
function drum(ctx, t, kind){
  if(kind === 'kick'){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + .12);
    g.gain.setValueAtTime(.16, t); g.gain.exponentialRampToValueAtTime(.001, t + .16);
    o.connect(g); g.connect(music.out); o.start(t); o.stop(t + .2);
  } else {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuffer(ctx); f.type = 'highpass'; f.frequency.value = 7000;
    g.gain.setValueAtTime(.03, t); g.gain.exponentialRampToValueAtTime(.001, t + .05);
    s.connect(f); f.connect(g); g.connect(music.out); s.start(t, Math.random()); s.stop(t + .06);
  }
}
function playStep(ctx, sg, st, t){
  const stepDur = 60 / sg.bpm / 4;
  const ch = sg.mel[st];
  if(ch && ch !== '-'){
    const i = +ch, oct = Math.floor(i / sg.scale.length);
    const freq = midi(sg.root + sg.scale[i % sg.scale.length] + oct * 12);
    note(ctx, freq, t, stepDur * 1.8, sg.lead, sg.lead === 'sawtooth' ? .028 : sg.lead === 'square' ? .032 : .06);
  }
  // baixo: no começo e no meio de cada compasso
  if(st % 8 === 0){
    const b = sg.bass[Math.floor(st / 16) % sg.bass.length];
    note(ctx, midi(sg.root - 24 + b), t, stepDur * 7, 'triangle', .075);
  }
  if(sg.drums){
    if(st % 8 === 0) drum(ctx, t, 'kick');
    if(st % 4 === 2) drum(ctx, t, 'hat');
  }
}

// ---------- sons de ambiente ----------
function startAmbient(ctx, kind){
  const g = ctx.createGain(); g.gain.value = 0; g.connect(music.out);
  g.gain.linearRampToValueAtTime(1, ctx.currentTime + 2);
  const nodes = [g];
  const loopNoise = (filterType, freq, q, vol, lfoRate, lfoAmt)=>{
    const s = ctx.createBufferSource(); s.buffer = noiseBuffer(ctx); s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q || 1;
    const v = ctx.createGain(); v.gain.value = vol;
    s.connect(f); f.connect(v); v.connect(g); s.start();
    if(lfoRate){
      const l = ctx.createOscillator(), la = ctx.createGain();
      l.frequency.value = lfoRate; la.gain.value = lfoAmt;
      l.connect(la); la.connect(v.gain); l.start(); nodes.push(l);
    }
    nodes.push(s);
  };
  if(kind === 'ondas') loopNoise('lowpass', 500, 1, .05, .12, .045);
  if(kind === 'vento') loopNoise('bandpass', 700, 3, .035, .2, .03);
  if(kind === 'vulcao') loopNoise('lowpass', 120, 1, .09, .3, .05);
  music.amb = {nodes, kind, g};
}
function ambientTick(ctx, t){
  const k = music.amb && music.amb.kind;
  if(k === 'passaros' && Math.random() < .06){ // piu-piu
    const f = 2200 + Math.random() * 1200;
    for(let i = 0; i < 2; i++){
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f, t + i * .09); o.frequency.exponentialRampToValueAtTime(f * 1.4, t + i * .09 + .06);
      g.gain.setValueAtTime(.018, t + i * .09); g.gain.exponentialRampToValueAtTime(.0005, t + i * .09 + .08);
      o.connect(g); g.connect(music.amb.g); o.start(t + i * .09); o.stop(t + i * .09 + .1);
    }
  }
  if(k === 'grilos' && Math.random() < .08){
    for(let i = 0; i < 3; i++){
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 4400; g.gain.setValueAtTime(.008, t + i * .05); g.gain.exponentialRampToValueAtTime(.0004, t + i * .05 + .035);
      o.connect(g); g.connect(music.amb.g); o.start(t + i * .05); o.stop(t + i * .05 + .04);
    }
  }
  if(k === 'gotas' && Math.random() < .035){ // ploc
    const o = ctx.createOscillator(), g = ctx.createGain();
    const f = 900 + Math.random() * 700;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * .45, t + .12);
    g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.0005, t + .18);
    o.connect(g); g.connect(music.amb.g); o.start(t); o.stop(t + .2);
  }
}

function startMusic(name){
  stopMusic();
  if(!musicOn || !audioEnabled) return;
  const sg = SONGS[name] || SONGS.Floresta;
  const ctx = musicCtx(); if(!ctx) return;
  music.out = ctx.createGain();
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
  music.out.connect(lp); lp.connect(ctx.destination);
  music.out.gain.setValueAtTime(0, ctx.currentTime);
  music.out.gain.linearRampToValueAtTime(.9, ctx.currentTime + 1.5);
  music.song = sg; music.step = 0; music.next = ctx.currentTime + .1; music.name = name;
  startAmbient(ctx, sg.amb);
  music.timer = setInterval(()=>{
    if(!music.song) return;
    while(music.next < ctx.currentTime + .15){
      playStep(ctx, music.song, music.step, music.next);
      ambientTick(ctx, music.next);
      music.next += 60 / music.song.bpm / 4;
      music.step = (music.step + 1) % 64;
    }
  }, 30);
}
function stopMusic(){
  clearInterval(music.timer);
  if(music.out && audioCtx){
    const g = music.out, t = audioCtx.currentTime;
    try{ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + .4); }catch(e){}
    const amb = music.amb;
    setTimeout(()=>{ try{ g.disconnect(); }catch(e){} if(amb) amb.nodes.forEach(n => { try{ n.stop && n.stop(); }catch(e){} }); }, 500);
  }
  music.song = null; music.out = null; music.amb = null;
}

function setupMusicButton(){
  const b = document.getElementById('taMusicBtn');
  if(!b) return;
  const paint = ()=>{ b.textContent = musicOn ? '🎵' : '🔇'; b.title = musicOn ? 'Desligar a música' : 'Ligar a música'; b.classList.toggle('off', !musicOn); };
  paint();
  b.addEventListener('pointerdown', e => e.stopPropagation());
  b.addEventListener('click', e=>{
    e.stopPropagation();
    musicOn = !musicOn;
    try{ localStorage.setItem(MUSIC_KEY, musicOn ? 'on' : 'off'); }catch(_){}
    paint();
    if(musicOn && run) startMusic(run.def && run.def.boss ? 'Chefe' : run.theme.name); else stopMusic();
  });
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden) stopMusic(); else if(musicOn && run && run.state !== 'done') startMusic(run.def && run.def.boss ? 'Chefe' : run.theme.name); });
}
