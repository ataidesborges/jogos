// ============================================================
// Lógica específica do jogo — desembaralhar
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

// ================= DESEMBARALHE A PALAVRA =================
const uImage = document.getElementById('uImage');
const uSlots = document.getElementById('uSlots');
const uTray = document.getElementById('uTray');
const uEraseBtn = document.getElementById('uEraseBtn');
const uHintBtn = document.getElementById('uHintBtn');
const uTryAgainMsg = document.getElementById('uTryAgainMsg');
const uProgressText = document.getElementById('uProgressText');
const uScoreText = document.getElementById('uScoreText');
const uReveal = document.getElementById('uReveal');
const uRevealMsg = document.getElementById('uRevealMsg');
const uRevealWord = document.getElementById('uRevealWord');
const uRevealPoints = document.getElementById('uRevealPoints');
const uNextBtn = document.getElementById('uNextBtn');
const uStage = document.getElementById('uStage');
const uFinalScreen = document.getElementById('uFinalScreen');
const uFinalScoreText = document.getElementById('uFinalScoreText');
const uRestartBtn = document.getElementById('uRestartBtn');
const WORDS_PER_GAME = 10;

function scrambledLetters(word){
  const letters = word.toUpperCase().split('');
  if(letters.length < 2) return letters.map((ch,i)=>({ch, idx:i}));
  let attempt;
  let tries = 0;
  do{
    attempt = shuffle(letters.map((ch,i)=>({ch, idx:i})));
    tries++;
  } while(attempt.map(t=>t.ch).join('') === word.toUpperCase() && tries < 20);
  return attempt;
}

let uLevel = 'facil';
let uWordList = [];   // words for this level, in play order
let uWordIdx = 0;
let uScore = 0;
let uTiles = [];      // [{ch, idx, used}]
let uSlotsState = [];  // array of {tileArrIdx|null}
let uRevealTimer = null;
let uRetryTimer = null;
let uSolved = false;   // palavra atual já acertada (trava as letras)

document.querySelectorAll('.u-level-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.u-level-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    uLevel = btn.dataset.level;
    startGame();
  });
});
uRestartBtn.addEventListener('click', startGame);
uEraseBtn.addEventListener('click', clearSlots);
uHintBtn.addEventListener('click', giveHint);
uNextBtn.addEventListener('click', ()=>{
  uReveal.classList.remove('show');
  clearTimeout(uRevealTimer);
  nextWord();
});

function wordPoolFor(level){
  return level === 'facil'
    ? ALL_WORDS.filter(w => w.word.length <= 6)
    : ALL_WORDS.filter(w => w.word.length >= 7);
}

function startGame(){
  clearTimeout(uRevealTimer);
  clearTimeout(uRetryTimer);
  uScore = 0;
  uWordIdx = 0;
  uWordList = shuffle([...wordPoolFor(uLevel)]).slice(0, WORDS_PER_GAME);
  uFinalScreen.classList.remove('show');
  uStage.style.display = '';
  updateScore();
  loadWord();
}

function nextWord(){
  uWordIdx++;
  if(uWordIdx >= uWordList.length){
    finishGame();
    return;
  }
  loadWord();
}

function loadWord(){
  uReveal.classList.remove('show');
  uTryAgainMsg.classList.remove('show');
  uSolved = false;
  const w = uWordList[uWordIdx];
  uSlots.style.setProperty('--letters', w.word.length);
  uImage.src = w.art;
  uImage.alt = `Ilustração de ${w.word.toLowerCase()}`;
  uProgressText.textContent = `Palavra ${uWordIdx+1} de ${uWordList.length}`;

  uTiles = scrambledLetters(w.word);
  uSlotsState = Array(w.word.length).fill(null);

  renderTray();
  renderSlots();
}

function renderTray(){
  uTray.innerHTML = '';
  uTiles.forEach((t, i)=>{
    const btn = document.createElement('button');
    btn.className = 'tile pop-in c' + (i % 7) + (t.used ? ' used' : '');
    btn.textContent = t.ch;
    btn.dataset.tileIdx = i;
    btn.addEventListener('click', ()=> placeLetter(i));
    uTray.appendChild(btn);
  });
}

function renderSlots(){
  uSlots.innerHTML = '';
  uSlotsState.forEach((tileArrIdx, i)=>{
    const span = document.createElement('span');
    if(tileArrIdx === null){
      span.className = 'tile-slot empty';
    } else {
      const t = uTiles[tileArrIdx];
      span.className = 'tile-slot filled tile c' + (tileArrIdx % 7);
      span.textContent = t.ch;
      span.addEventListener('click', ()=> removeLetter(i));
    }
    uSlots.appendChild(span);
  });
}

function placeLetter(tileArrIdx){
  const t = uTiles[tileArrIdx];
  if(t.used || uSolved) return;
  const emptyIdx = uSlotsState.findIndex(v => v === null);
  if(emptyIdx === -1) return;
  t.used = true;
  uSlotsState[emptyIdx] = tileArrIdx;
  renderTray();
  renderSlots();

  if(uSlotsState.every(v => v !== null)){
    checkAnswer();
  }
}

function removeLetter(slotIdx){
  const tileArrIdx = uSlotsState[slotIdx];
  if(tileArrIdx === null || uSolved) return;
  uTiles[tileArrIdx].used = false;
  uSlotsState[slotIdx] = null;
  renderTray();
  renderSlots();
}

function clearSlots(){
  if(uSolved) return;
  uSlotsState = uSlotsState.map(()=> null);
  uTiles.forEach(t => t.used = false);
  renderTray();
  renderSlots();
}

function giveHint(){
  if(uSolved) return;
  const target = uWordList[uWordIdx].word.toUpperCase();
  // primeira posição vazia OU com a letra errada
  const pos = uSlotsState.findIndex((v, i) => v === null || uTiles[v].ch !== target[i]);
  if(pos === -1) return;
  // se já tem letra errada a partir daí, devolve essas letras para a bandeja
  for(let i = pos; i < uSlotsState.length; i++){
    if(uSlotsState[i] !== null){ uTiles[uSlotsState[i]].used = false; uSlotsState[i] = null; }
  }
  renderTray();
  renderSlots();
  const targetLetter = target[pos];
  const candidate = uTiles.findIndex(t => !t.used && t.ch === targetLetter);
  if(candidate === -1) return;
  const el = uTray.querySelector(`[data-tile-idx="${candidate}"]`);
  if(el){
    el.classList.add('hint');
    setTimeout(()=> el.classList.remove('hint'), 1400);
  }
}

function checkAnswer(){
  const w = uWordList[uWordIdx];
  const formed = uSlotsState.map(tileArrIdx => uTiles[tileArrIdx].ch).join('');
  if(formed === w.word.toUpperCase()){
    onCorrect(w);
  } else {
    onWrong();
  }
}

function onCorrect(w){
  uSolved = true;
  const earned = 10;
  uScore += earned;
  updateScore();
  ping(true);
  speak(w.word);
  confetti(uStage);

  collectSticker(w.word, earned);

  uRevealMsg.textContent = '🎉 Você acertou! 🎉';
  uRevealWord.textContent = w.word;
  uRevealPoints.textContent = `+${earned} pontos`;
  uReveal.classList.add('show');
}

function onWrong(){
  ping(false);
  uTryAgainMsg.textContent = 'Quase lá! Tente de novo 😊';
  uTryAgainMsg.classList.add('show');
  uSlots.querySelectorAll('.tile-slot').forEach(el => el.classList.add('shake'));
  clearTimeout(uRetryTimer);
  uRetryTimer = setTimeout(()=>{
    uSlots.querySelectorAll('.tile-slot').forEach(el => el.classList.remove('shake'));
    uTryAgainMsg.classList.remove('show');
    clearSlots();
  }, 900);
}

function updateScore(){
  uScoreText.textContent = `⭐ ${uScore} pontos`;
}

function finishGame(){
  uStage.style.display = 'none';
  uFinalScoreText.textContent = `Você terminou o jogo! Pontuação final: ${uScore} pontos`;
  uFinalScreen.classList.add('show');
  confetti(uFinalScreen);
  ping(true);
}

// ---------- Init ----------
initCommon('desembaralhar');
startGame();

