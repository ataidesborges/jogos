// ============================================================
// Desafio Relâmpago — 1 minuto para acertar o máximo de contas.
// Modos (botões do topo): Adição (até 20), Subtração (até 20) e
// Tabuada (1 a 10). O recorde de cada modo fica salvo no aparelho.
// A cada 5 acertos, ganha uma figurinha para o álbum.
// (depende de word-bank.js, shared-utils.js e math-utils.js)
// ============================================================

const qStage = document.getElementById('qStage');
const rlStart = document.getElementById('rlStart');
const rlPlay = document.getElementById('rlPlay');
const rlRecord = document.getElementById('rlRecord');
const rlBar = document.getElementById('rlBar');
const rlTime = document.getElementById('rlTime');
const rlHits = document.getElementById('rlHits');
const rlStreak = document.getElementById('rlStreak');
const rlExpr = document.getElementById('rlExpr');
const qOptions = document.getElementById('qOptions');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

const DURATION = 60;
const SIGN = {somar:'+', subtrair:'−', multiplicar:'×', dividir:'÷'};
const NAME = {somar:'Adição', subtrair:'Subtração', multiplicar:'Tabuada', dividir:'Divisão'};

let mode = 'somar';
let hits = 0, streak = 0, timeLeft = DURATION, timer = null, playing = false, locked = false;
let current = null, lastKey = '';

const recordKey = () => 'fp-relampago-' + mode;
const getRecord = () => +(localStorage.getItem(recordKey()) || 0);

function showStart(){
  clearInterval(timer);
  playing = false;
  qFinal.hidden = true;
  qStage.hidden = false;
  rlStart.hidden = false;
  rlPlay.hidden = true;
  const rec = getRecord();
  rlRecord.textContent = rec ? `🏅 Seu recorde em ${NAME[mode]}: ${rec} acertos` : `Modo: ${NAME[mode]}`;
  qProgress.textContent = NAME[mode];
  qScore.textContent = '0 pontos';
}

function makeProblem(){
  let a, b;
  for(let k = 0; k < 30; k++){
    if(mode === 'somar'){ a = randInt(1, 12); b = randInt(1, 20 - a); }
    else if(mode === 'subtrair'){ a = randInt(2, 20); b = randInt(1, a); }
    else if(mode === 'multiplicar'){ a = randInt(1, 10); b = randInt(1, 10); }
    else { b = randInt(2, 10); a = b * randInt(1, 10); } // divisão sempre exata
    if(`${a},${b}` !== lastKey) break;
  }
  lastKey = `${a},${b}`;
  const answer = mode === 'somar' ? a + b : mode === 'subtrair' ? a - b : mode === 'multiplicar' ? a * b : a / b;
  return {a, b, answer};
}

function nextProblem(){
  locked = false;
  current = makeProblem();
  rlExpr.innerHTML = `<span>${current.a}</span><span class="op">${SIGN[mode]}</span><span>${current.b}</span><span class="op">=</span><span class="ans">?</span>`;
  rlExpr.classList.remove('pop'); void rlExpr.offsetWidth; rlExpr.classList.add('pop');
  renderNumberOptions(qOptions, numberOptions(current.answer, 4, mode === 'multiplicar' ? 100 : 20, 0), choose);
}

function go(){
  hits = 0; streak = 0; timeLeft = DURATION; playing = true;
  rlStart.hidden = true;
  rlPlay.hidden = false;
  updateInfo();
  nextProblem();
  clearInterval(timer);
  timer = setInterval(()=>{
    timeLeft--;
    updateInfo();
    if(timeLeft <= 5 && timeLeft > 0) ping(false);
    if(timeLeft <= 0) finish();
  }, 1000);
}

function updateInfo(){
  rlTime.textContent = `${timeLeft}s`;
  rlBar.style.width = (100 * timeLeft / DURATION) + '%';
  rlBar.classList.toggle('low', timeLeft <= 10);
  rlHits.textContent = `${hits} ${hits === 1 ? 'acerto' : 'acertos'}`;
  rlStreak.textContent = streak >= 3 ? `🔥 ${streak} seguidos!` : '';
  qScore.textContent = `${hits * 10} pontos`;
}

function choose(btn, v){
  if(!playing || locked) return;
  if(v === current.answer){
    locked = true;
    btn.classList.add('right');
    rlExpr.querySelector('.ans').textContent = v;
    hits++; streak++;
    ping(true);
    // a cada 5 acertos, uma figurinha
    if(hits % 5 === 0){
      const w = ALL_WORDS[Math.floor(Math.random() * ALL_WORDS.length)];
      collectSticker(w.word, 10);
      confetti(rlExpr);
    }
    updateInfo();
    setTimeout(nextProblem, 350);
  } else {
    streak = 0;
    btn.classList.add('wrong');
    ping(false);
    updateInfo();
  }
}

function finish(){
  clearInterval(timer);
  playing = false;
  const rec = getRecord();
  const isRecord = hits > rec;
  if(isRecord) localStorage.setItem(recordKey(), hits);
  qStage.hidden = true;
  qFinal.hidden = false;
  qFinalText.textContent = isRecord
    ? `⭐ Novo recorde em ${NAME[mode]}: ${hits} acertos!`
    : `Você acertou ${hits} contas! Seu recorde é ${rec}.`;
  qProgress.textContent = 'Tempo esgotado!';
  confetti(qFinal);
  ping(true);
  say(isRecord ? `Novo recorde! ${hits} acertos!` : `Você acertou ${hits} contas!`, 0.9);
}

document.getElementById('rlGo').addEventListener('click', go);
document.querySelectorAll('.level-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.level;
    showStart();
  });
});
document.getElementById('qNewBtn').addEventListener('click', showStart);
document.getElementById('qAgainBtn').addEventListener('click', ()=>{ showStart(); go(); });

// ---------- Init ----------
initCommon('relampago');
showStart();
