// ============================================================
// Lógica específica do jogo — flappy-letras
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

// ================= LETRA VOADORA (Flappy + soletrar palavras) =================
const soundBtn = document.getElementById('soundBtn');
const albumTitle = document.getElementById('albumTitle');
const albumToggleBtn = document.getElementById('albumToggleBtn');
const galleryEl = document.getElementById('gallery');
const fScoreText = document.getElementById('fScoreText');
const fLivesText = document.getElementById('fLivesText');
const fRestartBtn = document.getElementById('fRestartBtn');
const fFullscreenBtn = document.getElementById('fFullscreenBtn');
const fTargetImg = document.getElementById('fTargetImg');
const fWordProgress = document.getElementById('fWordProgress');
const fCanvasWrap = document.getElementById('fCanvasWrap');
const fCanvas = document.getElementById('fCanvas');
const ctx = fCanvas.getContext('2d');
const fStartOverlay = document.getElementById('fStartOverlay');
const fWordCompleteOverlay = document.getElementById('fWordCompleteOverlay');
const fGameOverOverlay = document.getElementById('fGameOverOverlay');
const fGameOverRestartBtn = document.getElementById('fGameOverRestartBtn');

let audioEnabled = true;
soundBtn.addEventListener('click', ()=>{
  audioEnabled = !audioEnabled;
  soundBtn.textContent = audioEnabled ? '🔊' : '🔇';
  soundBtn.classList.toggle('muted', !audioEnabled);
  twemojify(soundBtn);
  if(!audioEnabled && 'speechSynthesis' in window) speechSynthesis.cancel();
});
albumToggleBtn.addEventListener('click', ()=>{
  const open = galleryEl.classList.toggle('open');
  albumToggleBtn.textContent = open ? 'Esconder álbum' : 'Ver álbum completo';
});

function renderAlbum(){
  albumTitle.textContent = `🏆 Álbum de Figurinhas — ${collected.size}/${ALL_WORDS.length} coletadas`;
  galleryEl.innerHTML = '';
  ALL_WORDS.forEach(w=>{
    const unlocked = collected.has(w.word);
    const el = document.createElement('div');
    el.className = 'sticker ' + (unlocked ? 'unlocked' : 'locked');
    el.innerHTML = unlocked
      ? `<img class="word-art" src="${w.art}" alt="Ilustração de ${w.word.toLowerCase()}"><span>${w.word}</span><span class="sticker-score">+${collectedScores.get(w.word)} pts</span>`
      : `<img class="word-art" src="${WORD_ART.nature}" alt="Figurinha bloqueada"><span>?????</span>`;
    galleryEl.appendChild(el);
  });
  twemojify(galleryEl);
}

// ---------- Cores (lidas das variáveis CSS do site) ----------
const rootStyle = getComputedStyle(document.documentElement);
function cssVar(name){ return rootStyle.getPropertyValue(name).trim(); }
const TILE_COLORS = [cssVar('--red'), cssVar('--teal'), cssVar('--yellow'), cssVar('--green'), cssVar('--purple'), cssVar('--orange'), cssVar('--pink')];
const COLOR_GREEN = cssVar('--green');
const COLOR_PINK = cssVar('--pink');
const COLOR_YELLOW = cssVar('--yellow');
const COLOR_ORANGE = cssVar('--orange');
const COLOR_INK = cssVar('--ink');
const COLOR_RED = cssVar('--red');

// ---------- Níveis ----------
const LEVELS = {
  facil: {gravity:1250, jump:-380, bubbleSpeed:130, spawnInterval:1300, maxWait:4200},
  medio: {gravity:1500, jump:-410, bubbleSpeed:175, spawnInterval:1000, maxWait:3600},
};
let fLevel = 'facil';

function wordPoolFor(level){
  return level === 'facil'
    ? ALL_WORDS.filter(w => w.word.length <= 6)
    : ALL_WORDS.filter(w => w.word.length >= 7);
}

// ---------- Estado do jogo ----------
let CW = fCanvas.width, CH = fCanvas.height;
let phase = 'idle'; // 'idle' | 'playing' | 'celebrating' | 'falling' | 'over'
let lastTime = null;
let bird = {x:90, y:CH/2, vy:0, r:20};
let bubbles = [];
let hearts = [];
let popEffects = [];
let spawnTimer = 0;
let heartSpawnTimer = 0;
let heartSpawnInterval = 9000 + Math.random()*5000;
let waitSinceCorrect = 0;
let score = 0;
const MAX_LIVES = 5;
let lives = 3;
let currentWordObj = null;
let filledSlots = [];
let neededCounts = {};
let mistakeCount = 0;
let lastWord = null;
let cloudOffset = 0;

document.querySelectorAll('.f-level-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.f-level-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    fLevel = btn.dataset.level;
    resetGame();
  });
});
fRestartBtn.addEventListener('click', resetGame);
fGameOverRestartBtn.addEventListener('click', (e)=>{
  e.stopPropagation();
  resetGame();
});

let pseudoFullscreen = false;

function isInFullscreen(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement) || pseudoFullscreen;
}

function activatePseudoFullscreen(){
  pseudoFullscreen = true;
  fCanvasWrap.classList.add('pseudo-fullscreen');
  document.body.classList.add('fs-lock');
  updateFullscreenBtn();
}
function deactivatePseudoFullscreen(){
  pseudoFullscreen = false;
  fCanvasWrap.classList.remove('pseudo-fullscreen');
  document.body.classList.remove('fs-lock');
  updateFullscreenBtn();
}

function toggleFullscreen(){
  if(isInFullscreen()){
    if(document.fullscreenElement || document.webkitFullscreenElement){
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if(exit) exit.call(document);
    }
    if(pseudoFullscreen) deactivatePseudoFullscreen();
    return;
  }
  const req = fCanvasWrap.requestFullscreen || fCanvasWrap.webkitRequestFullscreen;
  if(req){
    try{
      const result = req.call(fCanvasWrap);
      if(result && result.then){
        result.then(updateFullscreenBtn).catch(()=> activatePseudoFullscreen());
      } else {
        setTimeout(()=>{ if(!document.fullscreenElement && !document.webkitFullscreenElement) activatePseudoFullscreen(); }, 250);
      }
    } catch(err){
      activatePseudoFullscreen();
    }
  } else {
    activatePseudoFullscreen();
  }
}
fFullscreenBtn.addEventListener('click', (e)=>{
  e.stopPropagation();
  toggleFullscreen();
});
document.addEventListener('fullscreenchange', updateFullscreenBtn);
document.addEventListener('webkitfullscreenchange', updateFullscreenBtn);
function updateFullscreenBtn(){
  const active = isInFullscreen();
  fFullscreenBtn.textContent = active ? '×' : '⛶';
  fFullscreenBtn.title = active ? 'Sair da tela cheia' : 'Tela cheia';
}

function updateScoreUI(){ fScoreText.textContent = `⭐ ${score} pontos`; }
function updateLivesUI(){
  fLivesText.innerHTML = lives > 0 ? '❤️'.repeat(lives) : '💔';
  twemojify(fLivesText);
}

function collectedCountFor(letter){
  const target = currentWordObj.word.toUpperCase();
  let c = 0;
  for(let i=0;i<target.length;i++){ if(target[i]===letter && filledSlots[i]) c++; }
  return c;
}
function remainingNeededLetters(){
  return Object.keys(neededCounts).filter(l => collectedCountFor(l) < neededCounts[l]);
}

function updateProgressUI(){
  const target = currentWordObj.word.toUpperCase();
  fWordProgress.innerHTML = '';
  target.split('').forEach((ch, i)=>{
    const span = document.createElement('span');
    if(filledSlots[i]){
      span.className = 'tile-slot filled tile c' + (i % 7);
      span.textContent = ch;
    } else {
      span.className = 'tile-slot empty';
      span.textContent = ch;
    }
    fWordProgress.appendChild(span);
  });
}

function pickNewWord(){
  const pool = wordPoolFor(fLevel);
  let candidate;
  do{
    candidate = pool[Math.floor(Math.random()*pool.length)];
  } while(pool.length > 1 && lastWord && candidate.word === lastWord);
  lastWord = candidate.word;
  return candidate;
}

function loadWord(){
  currentWordObj = pickNewWord();
  const target = currentWordObj.word.toUpperCase();
  filledSlots = Array(target.length).fill(false);
  neededCounts = {};
  target.split('').forEach(ch => { neededCounts[ch] = (neededCounts[ch]||0) + 1; });
  mistakeCount = 0;
  bubbles = [];
  popEffects = [];
  spawnTimer = 0;
  waitSinceCorrect = 0;
  fTargetImg.src = currentWordObj.art;
  fTargetImg.alt = `Ilustração de ${currentWordObj.word.toLowerCase()}`;
  updateProgressUI();
}

function resetGame(){
  phase = 'idle';
  lastTime = null;
  score = 0;
  lives = 3;
  bird = {x:90, y:CH/2, vy:0, r:20};
  bubbles = [];
  hearts = [];
  popEffects = [];
  heartSpawnTimer = 0;
  heartSpawnInterval = 9000 + Math.random()*5000;
  updateScoreUI();
  updateLivesUI();
  loadWord();
  fWordCompleteOverlay.classList.remove('show');
  fGameOverOverlay.classList.remove('show');
  fStartOverlay.classList.add('show');
}

function jump(){
  if(phase !== 'idle' && phase !== 'playing') return;
  const cfg = LEVELS[fLevel];
  bird.vy = cfg.jump;
}

function startRun(){
  if(phase !== 'idle') return;
  phase = 'playing';
  lastTime = null;
  fStartOverlay.classList.remove('show');
}

function handlePointer(e){
  if(e.target.closest && e.target.closest('#fFullscreenBtn')) return;
  e.preventDefault();
  if(phase === 'over'){ resetGame(); return; }
  if(phase === 'falling' || phase === 'celebrating') return;
  startRun();
  jump();
}
fCanvasWrap.addEventListener('pointerdown', handlePointer);
window.addEventListener('keydown', (e)=>{
  if(e.code === 'Space'){
    e.preventDefault();
    if(phase === 'over'){ resetGame(); return; }
    if(phase === 'falling' || phase === 'celebrating') return;
    startRun();
    jump();
  }
  if(e.key === 'Escape' && pseudoFullscreen){ deactivatePseudoFullscreen(); }
});

function spawnBubble(){
  const cfg = LEVELS[fLevel];
  const remaining = remainingNeededLetters();
  const forceCorrect = remaining.length > 0 && waitSinceCorrect >= cfg.maxWait;
  let letter;
  if(remaining.length > 0 && (forceCorrect || Math.random() < 0.4)){
    letter = remaining[Math.floor(Math.random()*remaining.length)];
    waitSinceCorrect = 0;
  } else {
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    letter = ALPHABET[Math.floor(Math.random()*ALPHABET.length)];
  }
  const margin = 46;
  const y = margin + Math.random()*(CH - margin*2);
  bubbles.push({x:CW+30, y, letter, r:24, colorIdx: Math.floor(Math.random()*7)});
}

function spawnHeart(){
  const margin = 46;
  const y = margin + Math.random()*(CH - margin*2);
  hearts.push({x:CW+30, y, r:22});
}

function onHeartHit(h){
  if(lives < MAX_LIVES){
    lives++;
    updateLivesUI();
    ping(true);
    popEffects.push({x:h.x, y:h.y, text:'+❤️', life:1, ok:true});
  } else {
    score += 5;
    updateScoreUI();
    popEffects.push({x:h.x, y:h.y, text:'+5', life:1, ok:true, soft:true});
  }
}

function onBubbleHit(bubble){
  const target = currentWordObj.word.toUpperCase();
  const letter = bubble.letter;
  const isWordLetter = neededCounts[letter] !== undefined;
  const stillNeeded = isWordLetter && collectedCountFor(letter) < neededCounts[letter];

  if(stillNeeded){
    const idx = target.split('').findIndex((ch,i)=> ch===letter && !filledSlots[i]);
    filledSlots[idx] = true;
    ping(true);
    popEffects.push({x:bubble.x, y:bubble.y, text:'✓', life:1, ok:true});
    updateProgressUI();
    if(filledSlots.every(Boolean)){
      onWordComplete();
    }
  } else if(isWordLetter){
    // letra repetida que já foi completada: nenhuma penalidade, só um aviso suave
    popEffects.push({x:bubble.x, y:bubble.y, text:'✓', life:1, ok:true, soft:true});
  } else {
    mistakeCount++;
    ping(false);
    bird.vy = Math.max(bird.vy, 0) + 90;
    popEffects.push({x:bubble.x, y:bubble.y, text:'✗', life:1, ok:false});
    loseLife(false);
  }
}

function onWordComplete(){
  phase = 'celebrating';
  const earned = 10 + (mistakeCount === 0 ? 5 : 0);
  score += earned;
  updateScoreUI();

  collected.add(currentWordObj.word);
  const best = collectedScores.get(currentWordObj.word) || 0;
  if(earned > best) collectedScores.set(currentWordObj.word, earned);
  renderAlbum();
  speak(currentWordObj.word);
  confetti(fCanvasWrap);

  fWordCompleteOverlay.querySelector('.flappy-overlay-msg').textContent =
    mistakeCount === 0 ? `🎉 ${currentWordObj.word}! +${earned} pontos (sem erros!) 🎉` : `🎉 ${currentWordObj.word}! +${earned} pontos 🎉`;
  fWordCompleteOverlay.classList.add('show');

  setTimeout(()=>{
    fWordCompleteOverlay.classList.remove('show');
    loadWord();
    bird.y = CH/2; bird.vy = 0;
    phase = 'playing';
  }, 1700);
}

// Perder uma vida NÃO reinicia mais a palavra nem o jogo — o jogo continua
// até acabarem as vidas. Só quando a última vida acaba é que o passarinho
// entra em queda livre (sem controle) até bater no chão; aí sim aparece a
// tela de "reiniciar".
function loseLife(causedByFloor){
  if(phase !== 'playing') return;
  lives--;
  updateLivesUI();
  if(lives <= 0){
    if(causedByFloor){
      triggerGameOver();
    } else {
      phase = 'falling';
      bubbles = [];
      hearts = [];
    }
  }
}

function triggerGameOver(){
  phase = 'over';
  ping(false);
  fGameOverOverlay.querySelector('.flappy-overlay-msg').textContent = `💥 Fim de jogo! Pontuação final: ${score} pontos`;
  fGameOverOverlay.classList.add('show');
}

function update(dt){
  const cfg = LEVELS[fLevel];
  bird.vy += cfg.gravity*dt;
  bird.y += bird.vy*dt;

  if(bird.y - bird.r <= 6){
    bird.y = bird.r + 6;
    bird.vy = 0;
    if(phase === 'playing'){
      ping(false);
      loseLife(false);
    }
  } else if(bird.y + bird.r >= CH-6){
    bird.y = CH-6-bird.r;
    bird.vy = 0;
    if(phase === 'playing'){
      ping(false);
      loseLife(true);
    } else if(phase === 'falling'){
      triggerGameOver();
    }
  }

  if(phase !== 'playing'){
    cloudOffset = (cloudOffset + dt*12) % (CW+120);
    for(let i=popEffects.length-1; i>=0; i--){
      popEffects[i].life -= dt*1.4;
      if(popEffects[i].life <= 0) popEffects.splice(i,1);
    }
    return;
  }

  spawnTimer += dt*1000;
  waitSinceCorrect += dt*1000;
  if(spawnTimer >= cfg.spawnInterval){
    spawnTimer = 0;
    spawnBubble();
  }

  heartSpawnTimer += dt*1000;
  if(heartSpawnTimer >= heartSpawnInterval){
    heartSpawnTimer = 0;
    heartSpawnInterval = 9000 + Math.random()*5000;
    spawnHeart();
  }

  for(let i=bubbles.length-1; i>=0; i--){
    const b = bubbles[i];
    b.x -= cfg.bubbleSpeed*dt;
    if(b.x < -40){ bubbles.splice(i,1); continue; }
    const dist = Math.hypot(bird.x-b.x, bird.y-b.y);
    if(dist < bird.r+b.r-6){
      bubbles.splice(i,1);
      onBubbleHit(b);
    }
  }

  for(let i=hearts.length-1; i>=0; i--){
    const h = hearts[i];
    h.x -= cfg.bubbleSpeed*dt*0.85;
    if(h.x < -40){ hearts.splice(i,1); continue; }
    const dist = Math.hypot(bird.x-h.x, bird.y-h.y);
    if(dist < bird.r+h.r-6){
      hearts.splice(i,1);
      onHeartHit(h);
    }
  }

  for(let i=popEffects.length-1; i>=0; i--){
    popEffects[i].life -= dt*1.4;
    if(popEffects[i].life <= 0) popEffects.splice(i,1);
  }

  cloudOffset = (cloudOffset + dt*12) % (CW+120);
}

function drawClouds(){
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const cloudsPos = [[80,60,26],[260,40,20],[440,80,30],[600,50,18]];
  cloudsPos.forEach(([cx,cy,r])=>{
    let x = cx - cloudOffset;
    if(x < -80) x += CW+160;
    ctx.beginPath();
    ctx.arc(x,cy,r,0,Math.PI*2);
    ctx.arc(x+r*0.8,cy+4,r*0.7,0,Math.PI*2);
    ctx.arc(x-r*0.8,cy+6,r*0.6,0,Math.PI*2);
    ctx.fill();
  });
}

function drawBird(){
  ctx.save();
  ctx.translate(bird.x, bird.y);
  const angle = Math.max(-0.5, Math.min(1.0, bird.vy/600));
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0,0,22,18,0,0,Math.PI*2);
  ctx.fillStyle = COLOR_YELLOW;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-3,5,10,7,Math.PI/6,0,Math.PI*2);
  ctx.fillStyle = COLOR_ORANGE;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(9,-6,4,0,Math.PI*2);
  ctx.fillStyle = COLOR_INK;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18,-2);
  ctx.lineTo(31,2);
  ctx.lineTo(18,7);
  ctx.closePath();
  ctx.fillStyle = COLOR_ORANGE;
  ctx.fill();
  ctx.restore();
}

function draw(){
  ctx.clearRect(0,0,CW,CH);
  const grad = ctx.createLinearGradient(0,0,0,CH);
  grad.addColorStop(0, '#E6F9FF');
  grad.addColorStop(1, '#FFFFFF');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,CW,CH);

  drawClouds();

  ctx.fillStyle = COLOR_PINK;
  ctx.fillRect(0,0,CW,6);
  ctx.fillStyle = COLOR_GREEN;
  ctx.fillRect(0,CH-6,CW,6);

  bubbles.forEach(b=>{
    ctx.beginPath();
    ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
    ctx.fillStyle = TILE_COLORS[b.colorIdx];
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = "700 24px 'Fredoka', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.letter, b.x, b.y+1);
  });

  hearts.forEach(h=>{
    ctx.beginPath();
    ctx.arc(h.x,h.y,h.r,0,Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLOR_PINK;
    ctx.stroke();
    ctx.font = "22px sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❤️', h.x, h.y+1);
  });

  popEffects.forEach(p=>{
    ctx.globalAlpha = Math.max(p.life,0);
    ctx.fillStyle = p.soft ? cssVar('--purple') : (p.ok ? COLOR_GREEN : COLOR_RED);
    ctx.font = "700 22px 'Fredoka', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x, p.y - (1-p.life)*36);
    ctx.globalAlpha = 1;
  });

  drawBird();
}

function loop(ts){
  const active = (phase === 'playing' || phase === 'falling');
  if(active){
    if(lastTime === null) lastTime = ts;
    const dt = Math.min((ts-lastTime)/1000, 0.033);
    lastTime = ts;
    update(dt);
  } else {
    lastTime = null;
  }
  draw();
  requestAnimationFrame(loop);
}

// ---------- Init ----------
renderAlbum();
resetGame();
requestAnimationFrame(loop);
twemojify(document.body);

