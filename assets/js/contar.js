// ============================================================
// Vamos Contar — aparecem várias figuras iguais (ex.: 4 patos), a voz
// pergunta "Quantos patos?" e a criança toca no número certo. Ao acertar,
// a voz conta junto ("um, dois, três, quatro") e cada figura ganha o número.
//  • Fácil: de 1 a 5 · Médio: de 1 a 10. 10 rodadas por jogo.
// (depende de word-bank.js, shared-utils.js e math-utils.js)
// ============================================================

const qStage = document.getElementById('qStage');
const ctTray = document.getElementById('ctTray');
const qOptions = document.getElementById('qOptions');
const qQuestion = document.getElementById('qQuestion');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

const ROUNDS = 10;
let level = 'facil';
let round = 0, score = 0, tries = 0, locked = false;
let current = null; // {item, n}
let lastItem = null, lastN = 0;
let nextTimer = null;

const question = c => `Quant${c.fem ? 'as' : 'os'} ${c.plural}?`;

function start(){
  clearTimeout(nextTimer);
  round = 0; score = 0;
  qFinal.hidden = true;
  qStage.hidden = false;
  loadRound();
}

function loadRound(){
  locked = false; tries = 0;
  const max = level === 'facil' ? 5 : level === 'medio' ? 10 : 15;
  let n;
  do{ n = randInt(1, max); } while(n === lastN);
  lastN = n;
  const item = randomCountable(lastItem);
  lastItem = item;
  current = {item, n};

  ctTray.innerHTML = '';
  ctTray.classList.toggle('many', n > 6);
  for(let i = 0; i < n; i++){
    const d = document.createElement('div');
    d.className = 'ct-item';
    d.style.animationDelay = (i * 60) + 'ms';
    d.innerHTML = `<img src="${item.art}" alt=""><span class="ct-num"></span>`;
    ctTray.appendChild(d);
  }
  renderNumberOptions(qOptions, numberOptions(n, level === 'facil' ? 3 : 4, max, 1), choose);
  qQuestion.textContent = question(item);
  qProgress.textContent = `Rodada ${round + 1} de ${ROUNDS}`;
  qScore.textContent = `${score} pontos`;
  setTimeout(()=> say(question(item), 0.9), 350);
}

function choose(btn, v){
  if(locked) return;
  if(v === current.n){
    locked = true;
    btn.classList.add('right');
    const earned = tries === 0 ? 10 : 5;
    score += earned;
    addPoints(earned);
    qScore.textContent = `${score} pontos`;
    ping(true);
    collectSticker(current.item.word, earned);
    // a voz conta junto, e cada figura ganha o seu número
    const items = [...ctTray.children];
    countAloud(current.n, i => items[i - 1].classList.add('counted'), ()=>{
      confetti(ctTray);
      nextTimer = setTimeout(next, 900);
    });
    items.forEach((el, i) => el.querySelector('.ct-num').textContent = i + 1);
  } else {
    // uma tentativa só: errou, a voz conta junto e segue
    locked = true;
    missAnswer(btn, b => b._v === current.n, `Ops! São <b>${current.n}</b>. Vamos contar juntos!`);
    const items = [...ctTray.children];
    items.forEach((el, i) => el.querySelector('.ct-num').textContent = i + 1);
    setTimeout(()=> countAloud(current.n, i => items[i - 1].classList.add('counted'), ()=>{ nextTimer = setTimeout(next, 900); }), 600);
  }
}

function next(){
  round++;
  if(round >= ROUNDS) finish();
  else loadRound();
}

function finish(){
  qStage.hidden = true;
  qFinal.hidden = false;
  qFinalText.textContent = `Você fez ${score} pontos em ${ROUNDS} rodadas!`;
  levelDone(level, score / 10, ROUNDS);
  qProgress.textContent = 'Fim de jogo';
  confetti(qFinal);
  ping(true);
}

document.getElementById('qListen').addEventListener('click', ()=> current && say(question(current.item), 0.9));
document.querySelectorAll('.level-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    level = btn.dataset.level;
    start();
  });
});
document.getElementById('qNewBtn').addEventListener('click', start);
document.getElementById('qAgainBtn').addEventListener('click', start);

// ---------- Init ----------
initCommon('contar');
start();
