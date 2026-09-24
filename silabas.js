// ============================================================
// Lógica específica do jogo — Formar Palavras (sílabas)
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

// ---------- State ----------
let currentLevel = "facil";
let targets = [];      // {word, syl, emoji, formed}
let resetTimer = null;
let formedCount = 0;
let audioEnabled = true;

// ---------- Scoring ----------
let currentAttemptPoints = 10; // starts at 10, drops by 1 each time "Apagar" is used, resets to 10 after each word formed
let roundScore = 0;            // points earned in the current round
let totalScore = 0;            // cumulative points this session
let roundNumber = 1;
let sessionRanking = [];       // {round, score} for each completed round, this session only

// ---------- DOM refs ----------
const trayEl = document.getElementById('tray');
const boxSlots = document.getElementById('boxSlots');
const boxHint = document.getElementById('boxHint');
const chestEl = document.getElementById('chest');
const revealEl = document.getElementById('reveal');
const revealEmoji = document.getElementById('revealEmoji');
const revealWord = document.getElementById('revealWord');
const progressText = document.getElementById('progressText');
const galleryEl = document.getElementById('gallery');
const albumTitle = document.getElementById('albumTitle');
const albumToggleBtn = document.getElementById('albumToggleBtn');
const roundCompleteEl = document.getElementById('roundComplete');
const newRoundBtn = document.getElementById('newRoundBtn');
const soundBtn = document.getElementById('soundBtn');
const eraseBtn = document.getElementById('eraseBtn');
const scoreText = document.getElementById('scoreText');
const revealPoints = document.getElementById('revealPoints');
const roundScoreText = document.getElementById('roundScoreText');
const rankingList = document.getElementById('rankingList');

document.querySelectorAll('.level-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.level-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentLevel = btn.dataset.level;
    startRound();
  });
});
newRoundBtn.addEventListener('click', startRound);

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

eraseBtn.addEventListener('click', ()=>{
  clearTimeout(resetTimer);
  const boxTiles = Array.from(boxSlots.querySelectorAll('.tile'));
  boxTiles.forEach(t=> trayEl.appendChild(t));
  boxHint.style.display = 'block';
  revealEl.classList.remove('show');
  updateEraseBtn();

  // erasing a failed attempt costs a point off the next word's score (never below 1)
  if(boxTiles.length > 0){
    currentAttemptPoints = Math.max(1, currentAttemptPoints - 1);
    ping(false);
  }
});

function updateEraseBtn(){
  const hasTiles = boxSlots.querySelectorAll('.tile').length > 0;
  eraseBtn.classList.toggle('visible', hasTiles);
}

function updateScoreDisplay(){
  scoreText.textContent = `⭐ ${totalScore} pontos`;
}

function renderRanking(){
  if(sessionRanking.length === 0){
    rankingList.innerHTML = '<div class="ranking-empty">Complete uma rodada inteira para entrar no ranking!</div>';
    return;
  }
  const medals = ['🥇','🥈','🥉'];
  const sorted = [...sessionRanking].sort((a,b)=> b.score - a.score);
  rankingList.innerHTML = sorted.map((r,i)=>
    `<div class="ranking-row"><span><span class="medal">${medals[i] || (i+1)+'º'}</span>Rodada ${r.round}</span><span class="score">${r.score} pontos</span></div>`
  ).join('');
}

// ---------- Round setup ----------
function pickRandom(arr, n){
  const copy = [...arr];
  const picked = [];
  for(let i=0;i<n && copy.length;i++){
    const idx = Math.floor(Math.random()*copy.length);
    picked.push(copy.splice(idx,1)[0]);
  }
  return picked;
}
function startRound(){
  clearTimeout(resetTimer);
  revealEl.classList.remove('show');
  roundCompleteEl.classList.remove('show');
  formedCount = 0;
  roundScore = 0;
  currentAttemptPoints = 10;

  const pool = WORDS[currentLevel];
  const n = Math.min(WORDS_PER_ROUND, pool.length);
  targets = pickRandom(pool, n).map(w=>({...w, formed:false}));

  // build tile list
  let tiles = [];
  targets.forEach((t, wIdx)=>{
    t.syl.forEach(s=>{
      tiles.push({syl:s, wordIdx:wIdx, colorIdx: Math.floor(Math.random()*7)});
    });
  });
  shuffle(tiles);

  // render tray
  trayEl.innerHTML = '<div class="tray-label">SÍLABAS</div>';
  tiles.forEach((t,i)=>{
    const el = document.createElement('div');
    el.className = `tile c${t.colorIdx} pop-in`;
    el.textContent = t.syl;
    el.dataset.syl = t.syl;
    el.dataset.wordIdx = t.wordIdx;
    attachDrag(el);
    trayEl.appendChild(el);
  });

  // render empty box
  boxSlots.innerHTML = '';
  boxSlots.appendChild(boxHint);
  boxHint.style.display = 'block';
  updateEraseBtn();

  updateProgress();
}

function updateProgress(){
  progressText.textContent = `${formedCount} / ${targets.length} palavras nesta rodada`;
}

// ---------- Drag & drop (pointer events, works for mouse & touch) ----------
function attachDrag(tile){
  let startParent, shiftX, shiftY, moved, startX, startY;

  tile.addEventListener('pointerdown', (e)=>{
    e.preventDefault();
    tile.setPointerCapture(e.pointerId);
    startParent = tile.parentElement;
    const rect = tile.getBoundingClientRect();
    shiftX = e.clientX - rect.left;
    shiftY = e.clientY - rect.top;
    startX = e.clientX; startY = e.clientY;
    moved = false;

    tile.classList.add('dragging');
    tile.style.position = 'fixed';
    tile.style.width = rect.width+'px';
    tile.style.left = rect.left+'px';
    tile.style.top = rect.top+'px';
    tile.style.zIndex = 1000;
    document.body.appendChild(tile);
    tile.dataset.lastMove = Date.now();
    speak(tile.dataset.syl);
  });

  tile.addEventListener('pointermove', (e)=>{
    if(!tile.classList.contains('dragging')) return;
    tile.dataset.lastMove = Date.now();
    if(Math.abs(e.clientX-startX) > 4 || Math.abs(e.clientY-startY) > 4) moved = true;
    tile.style.left = (e.clientX - shiftX)+'px';
    tile.style.top = (e.clientY - shiftY)+'px';

    const chestRect = chestEl.getBoundingClientRect();
    const tRect = tile.getBoundingClientRect();
    const cx = tRect.left + tRect.width/2;
    const cy = tRect.top + tRect.height/2;
    const over = cx > chestRect.left && cx < chestRect.right && cy > chestRect.top && cy < chestRect.bottom;
    chestEl.classList.toggle('hover-target', over);
  });

  tile.addEventListener('pointerup', (e)=>{
    if(!tile.classList.contains('dragging')) return;
    tile.classList.remove('dragging');
    tile.style.position = '';
    tile.style.width = '';
    tile.style.left = '';
    tile.style.top = '';
    tile.style.zIndex = '';
    chestEl.classList.remove('hover-target');

    const chestRect = chestEl.getBoundingClientRect();
    const tRect = tile.getBoundingClientRect();
    const cx = e.clientX, cy = e.clientY;
    const overChest = cx > chestRect.left && cx < chestRect.right && cy > chestRect.top && cy < chestRect.bottom;

    if(!moved){
      // it's a tap, not a drag
      if(startParent === boxSlots){
        // tap on a tile already in the box -> send it back to the tray
        trayEl.appendChild(tile);
        boxHint.style.display = boxSlots.querySelectorAll('.tile').length===0 ? 'block' : 'none';
        clearTimeout(resetTimer);
        updateEraseBtn();
      } else {
        // tap on a tile in the tray -> send it straight into the box
        boxHint.style.display = 'none';
        boxSlots.appendChild(tile);
        updateEraseBtn();
        checkBox();
      }
      return;
    }

    if(overChest){
      boxHint.style.display = 'none';
      boxSlots.appendChild(tile);
      updateEraseBtn();
      checkBox();
    } else {
      trayEl.appendChild(tile);
      boxHint.style.display = boxSlots.querySelectorAll('.tile').length===0 ? 'block' : 'none';
      updateEraseBtn();
    }
  });

  // Safety net: if the browser interrupts the gesture (finger slips, OS
  // gesture, tab switch, etc.) a 'pointercancel' fires instead of 'pointerup'
  // and the tile could otherwise be left floating on screen forever.
  // Always send it safely back to the tray in that case.
  tile.addEventListener('pointercancel', ()=>{
    if(!tile.classList.contains('dragging')) return;
    tile.classList.remove('dragging');
    tile.style.position = '';
    tile.style.width = '';
    tile.style.left = '';
    tile.style.top = '';
    tile.style.zIndex = '';
    chestEl.classList.remove('hover-target');
    trayEl.appendChild(tile);
    boxHint.style.display = boxSlots.querySelectorAll('.tile').length===0 ? 'block' : 'none';
    updateEraseBtn();
  });
}

// ---------- Check box contents against target words ----------
function checkBox(){
  clearTimeout(resetTimer);
  const boxTiles = Array.from(boxSlots.querySelectorAll('.tile'));
  const attempt = boxTiles.map(t=>t.dataset.syl).join('');

  const matchIdx = targets.findIndex(t => !t.formed && t.syl.join('') === attempt && boxTiles.length === t.syl.length);

  if(matchIdx !== -1){
    // success! score = current attempt points (10, or less if "Apagar" was used before)
    const target = targets[matchIdx];
    target.formed = true;
    formedCount++;
    updateProgress();
    ping(true);

    const earned = currentAttemptPoints;
    roundScore += earned;
    totalScore += earned;
    updateScoreDisplay();
    currentAttemptPoints = 10; // reset for the next word

    celebrate(target, earned);

    setTimeout(()=>{
      boxTiles.forEach(t=>t.remove());
      boxHint.style.display = 'block';
      revealEl.classList.remove('show');
      updateEraseBtn();
      if(formedCount === targets.length){
        roundScoreText.textContent = `+${roundScore} pontos nesta rodada`;
        roundCompleteEl.classList.add('show');
        sessionRanking.push({round: roundNumber, score: roundScore});
        roundNumber++;
        renderRanking();
        setTimeout(startRound, 2200);
      }
    }, 4500);
  }
  // if no match, the tiles simply stay in the box — the child can keep
  // adding more, or tap a tile to send it back manually. Points only drop
  // when "Apagar" is used to clear a failed attempt (see eraseBtn handler).
}

function celebrate(target, earned){
  revealEmoji.src = target.art;
  revealEmoji.alt = `Ilustração de ${target.word.toLowerCase()}`;
  revealWord.textContent = target.word;
  revealPoints.textContent = `+${earned} pontos`;
  revealEl.classList.add('show');
  twemojify(revealEmoji);

  collected.add(target.word);
  const best = collectedScores.get(target.word) || 0;
  if(earned > best) collectedScores.set(target.word, earned);
  renderAlbum();
  speak(target.word);

  confetti(chestEl);
}

// ---------- Sticker album ----------
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

// ---------- Init ----------
renderAlbum();
renderRanking();
updateScoreDisplay();
startRound();
twemojify(document.body);

// Extra safety net: every couple of seconds, check for any syllable that got
// stuck floating (dragging state with no movement for a while) and gently
// send it back to the tray. Covers rare edge cases the pointer events miss.
setInterval(()=>{
  document.querySelectorAll('.tile.dragging').forEach(tile=>{
    const last = Number(tile.dataset.lastMove || 0);
    if(Date.now() - last > 2500){
      tile.classList.remove('dragging');
      tile.style.position = '';
      tile.style.width = '';
      tile.style.left = '';
      tile.style.top = '';
      tile.style.zIndex = '';
      chestEl.classList.remove('hover-target');
      trayEl.appendChild(tile);
      boxHint.style.display = boxSlots.querySelectorAll('.tile').length===0 ? 'block' : 'none';
      updateEraseBtn();
    }
  });
}, 2000);
