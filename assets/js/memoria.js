// ============================================================
// Lógica específica do jogo — Jogo da Memória (figura + palavra)
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const mGrid = document.getElementById('mGrid');
const mProgressText = document.getElementById('mProgressText');
const mScoreText = document.getElementById('mScoreText');
const mCongrats = document.getElementById('mCongrats');
const mCongratsText = document.getElementById('mCongratsText');

const PAIRS = { facil: 6, medio: 8 };
let mLevel = 'facil';
let mCards = [];        // {word, art, kind:'img'|'word', el, matched}
let mOpen = [];         // cartas viradas aguardando comparação (no máximo 2)
let mLocked = false;    // trava cliques enquanto duas cartas erradas desviram
let mPairsFound = 0;
let mMoves = 0;
let mScore = 0;
let mFlipTimer = null;

document.querySelectorAll('.m-level-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.m-level-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    mLevel = btn.dataset.level;
    startMemory();
  });
});
document.getElementById('mNewBtn').addEventListener('click', startMemory);
document.getElementById('mAgainBtn').addEventListener('click', startMemory);

// Fácil: palavras curtas (até 5 letras); Médio: qualquer palavra
function memoryPool(level){
  return level === 'facil' ? WORDS.facil.filter(w => w.word.length <= 5) : ALL_WORDS;
}

function startMemory(){
  clearTimeout(mFlipTimer);
  mOpen = [];
  mLocked = false;
  mPairsFound = 0;
  mMoves = 0;
  mScore = 0;
  mCongrats.classList.remove('show');

  const words = shuffle([...memoryPool(mLevel)]).slice(0, PAIRS[mLevel]);
  mCards = shuffle(words.flatMap(w => [
    {word:w.word, art:w.art, kind:'img'},
    {word:w.word, art:w.art, kind:'word'},
  ]));

  mGrid.className = 'memory-grid pairs-' + words.length;
  mGrid.innerHTML = '';
  mCards.forEach((card, i)=>{
    const btn = document.createElement('button');
    btn.className = 'memory-card';
    btn.setAttribute('aria-label', `Carta ${i+1} virada para baixo`);
    const face = card.kind === 'img'
      ? `<img src="${card.art}" alt="">`
      : `<span class="memory-word">${card.word}</span>`;
    btn.innerHTML = `
      <span class="memory-inner">
        <span class="memory-back" aria-hidden="true">?</span>
        <span class="memory-front ${card.kind}">${face}</span>
      </span>`;
    btn.addEventListener('click', ()=> flipCard(card));
    card.el = btn;
    mGrid.appendChild(btn);
  });
  updateMemoryUI();
}

function flipCard(card){
  if(mLocked || card.matched || mOpen.includes(card)) return;
  card.el.classList.add('flipped');
  card.el.setAttribute('aria-label', card.kind === 'img' ? `Figura: ${card.word.toLowerCase()}` : `Palavra: ${card.word}`);
  if(card.kind === 'word') speak(card.word);
  mOpen.push(card);
  if(mOpen.length < 2) return;

  mMoves++;
  const [a, b] = mOpen;
  if(a.word === b.word){
    // par certo!
    a.matched = b.matched = true;
    a.el.classList.add('matched');
    b.el.classList.add('matched');
    mOpen = [];
    mPairsFound++;
    const earned = 10;
    mScore += earned;
    addPoints(earned);
    ping(true);
    speak(a.word);
    confetti(b.el);
    collectSticker(a.word, earned);
    updateMemoryUI();
    if(mPairsFound === PAIRS[mLevel] || mCards.every(c => c.matched)) finishMemory();
  } else {
    // errou: mostra por um instante e desvira
    mLocked = true;
    ping(false);
    mFlipTimer = setTimeout(()=>{
      [a, b].forEach(c => {
        c.el.classList.remove('flipped');
        c.el.setAttribute('aria-label', 'Carta virada para baixo');
      });
      mOpen = [];
      mLocked = false;
    }, 1100);
    updateMemoryUI();
  }
}

function updateMemoryUI(){
  mProgressText.textContent = `${mPairsFound} / ${mCards.length/2} pares · ${mMoves} jogadas`;
  mScoreText.textContent = `${mScore} pontos`;
}

function finishMemory(){
  // bônus por memória boa: poucas jogadas além do mínimo
  const pairs = mCards.length/2;
  const bonus = Math.max(0, (pairs*2 - mMoves) * 2);
  mScore += bonus;
  addPoints(bonus);
  updateMemoryUI();
  mCongratsText.textContent = bonus > 0
    ? `${mMoves} jogadas · bônus de memória: +${bonus} pontos!`
    : `${mMoves} jogadas · total de ${mScore} pontos`;
  setTimeout(()=>{
    mCongrats.classList.add('show');
    confetti(mCongrats);
  }, 600);
}

// ---------- Init ----------
initCommon('memoria');
startMemory();
