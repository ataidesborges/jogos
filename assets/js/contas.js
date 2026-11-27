// ============================================================
// Contas com Figuras — três modos (os botões do topo):
//  • Somar: 3 bananas + 2 bananas = ?   (resultado até 10)
//  • Subtrair: 5 bananas, 2 ficam riscadas = ?   (até 10)
//  • Multiplicar: 3 grupos de 2 bananas = ?   (até 5 × 5)
// A voz lê a conta ("três mais dois"). 10 contas por jogo.
// (depende de word-bank.js, shared-utils.js e math-utils.js)
// ============================================================

const qStage = document.getElementById('qStage');
const csVisual = document.getElementById('csVisual');
const csExpr = document.getElementById('csExpr');
const qOptions = document.getElementById('qOptions');
const qQuestion = document.getElementById('qQuestion');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

const ROUNDS = 10;
const SIGN = {somar:'+', subtrair:'−', multiplicar:'×'};
const SPOKEN = {somar:'mais', subtrair:'menos', multiplicar:'vezes'};

let mode = 'somar';
let round = 0, score = 0, tries = 0, locked = false;
let current = null; // {a, b, answer, item}
let lastKey = '';
let nextTimer = null;

function makeProblem(){
  let a, b;
  for(let k = 0; k < 30; k++){
    if(mode === 'somar'){ a = randInt(1, 6); b = randInt(1, 10 - a); }
    else if(mode === 'subtrair'){ a = randInt(2, 10); b = randInt(1, a - 1); }
    else { a = randInt(2, 5); b = randInt(1, 5); } // pelo menos 2 grupos
    if(`${a},${b}` !== lastKey) break;
  }
  lastKey = `${a},${b}`;
  const answer = mode === 'somar' ? a + b : mode === 'subtrair' ? a - b : a * b;
  return {a, b, answer, item: randomCountable(current && current.item)};
}

const fig = (item, extra) => `<span class="cs-fig${extra ? ' ' + extra : ''}"><img src="${item.art}" alt=""></span>`;

function renderVisual(p){
  const {a, b, item} = p;
  let html = '';
  if(mode === 'somar'){
    html = `<div class="cs-group">${fig(item).repeat(a)}</div><div class="cs-sign">+</div><div class="cs-group">${fig(item).repeat(b)}</div>`;
  } else if(mode === 'subtrair'){
    // as que "saem" ficam riscadas e apagadinhas
    html = `<div class="cs-group">${fig(item).repeat(a - b)}${fig(item, 'gone').repeat(b)}</div>`;
  } else {
    // a grupos de b figuras
    const box = `<div class="cs-box">${fig(item).repeat(b)}</div>`;
    html = `<div class="cs-boxes">${box.repeat(a)}</div>`;
  }
  csVisual.innerHTML = html;
  csVisual.className = 'cs-visual mode-' + mode + ((a + b > 9 || a * b > 12) ? ' many' : '');
}

function loadRound(){
  locked = false; tries = 0;
  const p = current = makeProblem();
  renderVisual(p);
  csExpr.innerHTML = `<span>${p.a}</span><span class="op">${SIGN[mode]}</span><span>${p.b}</span><span class="op">=</span><span class="ans">?</span>`;
  qQuestion.textContent = mode === 'multiplicar' ? `${p.a} ${p.a === 1 ? 'grupo' : 'grupos'} de ${p.b}. Quanto dá?` : 'Qual é o resultado?';
  renderNumberOptions(qOptions, numberOptions(p.answer, 4, mode === 'multiplicar' ? 25 : 10, 0), choose);
  qProgress.textContent = `Conta ${round + 1} de ${ROUNDS}`;
  qScore.textContent = `${score} pontos`;
  setTimeout(readAloud, 300);
}

function readAloud(){
  if(current) say(`${current.a} ${SPOKEN[mode]} ${current.b}`, 0.85);
}

function choose(btn, v){
  if(locked) return;
  if(v === current.answer){
    locked = true;
    btn.classList.add('right');
    csExpr.querySelector('.ans').textContent = v;
    csExpr.querySelector('.ans').classList.add('done');
    const earned = tries === 0 ? 10 : 5;
    score += earned;
    addPoints(earned);
    qScore.textContent = `${score} pontos`;
    ping(true);
    confetti(csExpr);
    collectSticker(current.item.word, earned);
    say(`${current.a} ${SPOKEN[mode]} ${current.b}, igual a ${v}!`, 0.85);
    nextTimer = setTimeout(next, 2300);
  } else {
    tries++;
    btn.classList.add('wrong');
    ping(false);
  }
}

function start(){
  clearTimeout(nextTimer);
  round = 0; score = 0; current = null;
  qFinal.hidden = true;
  qStage.hidden = false;
  loadRound();
}

function next(){
  round++;
  if(round >= ROUNDS) finish();
  else loadRound();
}

function finish(){
  qStage.hidden = true;
  qFinal.hidden = false;
  qFinalText.textContent = `Você fez ${score} pontos em ${ROUNDS} contas!`;
  qProgress.textContent = 'Fim de jogo';
  confetti(qFinal);
  ping(true);
}

document.getElementById('qListen').addEventListener('click', readAloud);
document.querySelectorAll('.level-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.level;
    start();
  });
});
document.getElementById('qNewBtn').addEventListener('click', start);
document.getElementById('qAgainBtn').addEventListener('click', start);

// ---------- Init ----------
initCommon('contas');
start();
