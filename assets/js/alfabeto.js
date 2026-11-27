// ============================================================
// Caça ao Alfabeto — a voz fala o nome de uma letra ("bê") e a criança
// encontra a letra no meio das outras. Ao acertar aparece "B de BOLA",
// com a figura de uma palavra que começa com essa letra.
//  • Fácil: 6 letras na tela · Médio: 12 letras, com letras parecidas
//    misturadas (B, D, P, R…).
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const qStage = document.getElementById('qStage');
const qOptions = document.getElementById('qOptions');
const abReveal = document.getElementById('abReveal');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

const ROUNDS = 10;
const ALPHABET = 'ABCDEFGHIJLMNOPQRSTUVXZ'.split(''); // sem K, W e Y (quase não aparecem)
const LOOK_ALIKE = {
  B:'DPR', D:'BOP', P:'BRF', R:'PBK', E:'FL', F:'ET', M:'NV', N:'MHU', O:'QCD', Q:'OG',
  C:'GO', G:'CQ', U:'VN', V:'UY', I:'JLT', J:'IL', L:'IJT', T:'FI', S:'Z', Z:'SN', H:'NA', A:'HV', X:'V',
};
const COLORS = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

let level = 'facil';
let targets = [], idx = 0, score = 0, tries = 0, locked = false;
let current = null;
let nextTimer = null;

function start(){
  clearTimeout(nextTimer);
  targets = shuffle([...ALPHABET]).slice(0, ROUNDS);
  idx = 0; score = 0;
  qFinal.hidden = true;
  qStage.hidden = false;
  loadRound();
}

function loadRound(){
  locked = false; tries = 0;
  const letter = current = targets[idx];
  const n = level === 'facil' ? 6 : 12;
  // no Médio entram primeiro as letras parecidas com a certa
  const alike = level === 'medio' ? (LOOK_ALIKE[letter] || '').split('').filter(l => ALPHABET.includes(l)) : [];
  const others = shuffle(ALPHABET.filter(l => l !== letter && !alike.includes(l)));
  const letters = shuffle([letter, ...alike, ...others].slice(0, n));
  if(!letters.includes(letter)) letters[0] = letter;

  qOptions.innerHTML = '';
  qOptions.classList.toggle('many', n > 6);
  shuffle(letters).forEach((l, i)=>{
    const b = document.createElement('button');
    b.className = 'ab-letter ' + COLORS[i % COLORS.length];
    b.textContent = l;
    b.addEventListener('click', ()=> choose(b, l));
    qOptions.appendChild(b);
  });
  abReveal.innerHTML = '';
  qProgress.textContent = `Letra ${idx + 1} de ${targets.length}`;
  qScore.textContent = `${score} pontos`;
  setTimeout(()=> speakLetter(letter), 300);
}

function choose(btn, l){
  if(locked) return;
  if(l === current){
    locked = true;
    btn.classList.add('right');
    const earned = tries === 0 ? 10 : 5;
    score += earned;
    qScore.textContent = `${score} pontos`;
    ping(true);
    confetti(btn);
    // "B de BOLA": uma palavra com figura que começa com essa letra
    const examples = ALL_WORDS.filter(w => plain(w.word[0]) === l);
    if(examples.length){
      const w = examples[Math.floor(Math.random() * examples.length)];
      abReveal.innerHTML = `<img src="${w.art}" alt=""><span><b>${l}</b> de <b>${w.word}</b></span>`;
      collectSticker(w.word, earned);
      setTimeout(()=> say(`${LETTER_NAMES[l]}, de ${w.word.toLocaleLowerCase('pt-BR')}`, 0.85), 250);
    } else {
      abReveal.innerHTML = `<span><b>${l}</b> — muito bem!</span>`;
      setTimeout(()=> speakLetter(l), 250);
    }
    nextTimer = setTimeout(next, 2100);
  } else {
    tries++;
    btn.classList.add('wrong');
    ping(false);
    setTimeout(()=> speakLetter(current), 450); // repete a letra para ajudar
  }
}

function next(){
  idx++;
  if(idx >= targets.length) finish();
  else loadRound();
}

function finish(){
  qStage.hidden = true;
  qFinal.hidden = false;
  qFinalText.textContent = `Você fez ${score} pontos em ${targets.length} letras!`;
  qProgress.textContent = 'Fim de jogo';
  confetti(qFinal);
  ping(true);
}

document.getElementById('qListen').addEventListener('click', ()=> current && speakLetter(current));
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
initCommon('alfabeto');
start();
