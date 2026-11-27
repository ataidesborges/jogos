// ============================================================
// Ditado Mágico — a voz fala uma palavra e a criança encontra a resposta.
//  • Fácil: toca na FIGURA certa (4 opções).
//  • Médio: toca na PALAVRA ESCRITA certa (4 opções parecidas — mesma
//    letra inicial ou mesmo tamanho, para treinar a leitura de verdade).
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const qStage = document.getElementById('qStage');
const qOptions = document.getElementById('qOptions');
const qQuestion = document.getElementById('qQuestion');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

const ROUNDS = 10;
const OPTIONS = 4;
const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

let level = 'facil';
let words = [], idx = 0, score = 0, tries = 0, locked = false;
let current = null;
let nextTimer = null;

function start(){
  clearTimeout(nextTimer);
  words = shuffle([...ALL_WORDS]).slice(0, ROUNDS);
  idx = 0; score = 0;
  qFinal.hidden = true;
  qStage.hidden = false;
  loadWord();
}

// opções erradas: no Médio, palavras parecidas com a certa (mesma 1ª letra ou mesmo tamanho)
function distractors(w){
  const others = ALL_WORDS.filter(x => plain(x.word) !== plain(w.word));
  if(level === 'medio'){
    const similar = shuffle(others.filter(x => x.word[0] === w.word[0] || Math.abs(x.word.length - w.word.length) <= 1));
    const rest = shuffle(others.filter(x => !similar.includes(x)));
    return [...similar, ...rest].slice(0, OPTIONS - 1);
  }
  return shuffle(others).slice(0, OPTIONS - 1);
}

function loadWord(){
  locked = false; tries = 0;
  const w = current = words[idx];
  const opts = shuffle([w, ...distractors(w)]);
  qOptions.innerHTML = '';
  qOptions.classList.toggle('words', level === 'medio');
  opts.forEach(o=>{
    const b = document.createElement('button');
    b.className = 'dt-opt';
    b.dataset.word = o.word;
    b.innerHTML = level === 'facil'
      ? `<img src="${o.art}" alt="">`
      : `<span class="dt-word">${o.word}</span>`;
    b.setAttribute('aria-label', level === 'facil' ? 'Figura' : o.word);
    b.addEventListener('click', ()=> choose(b, o));
    qOptions.appendChild(b);
  });
  qQuestion.textContent = level === 'facil' ? 'Qual figura a voz falou?' : 'Qual palavra a voz falou?';
  qProgress.textContent = `Palavra ${idx + 1} de ${words.length}`;
  qScore.textContent = `${score} pontos`;
  setTimeout(()=> speak(w.word), 300);
}

function choose(btn, o){
  if(locked) return;
  if(o.word === current.word){
    locked = true;
    btn.classList.add('right');
    // no Médio, revela a figura junto com a palavra certa
    if(level === 'medio') btn.innerHTML = `<img src="${o.art}" alt=""><span class="dt-word">${o.word}</span>`;
    else btn.insertAdjacentHTML('beforeend', `<span class="dt-word small">${o.word}</span>`);
    const earned = tries === 0 ? 10 : 5;
    score += earned;
    qScore.textContent = `${score} pontos`;
    ping(true);
    confetti(btn);
    collectSticker(o.word, earned);
    speak(o.word);
    nextTimer = setTimeout(next, 1700);
  } else {
    tries++;
    btn.classList.add('wrong');
    ping(false);
    setTimeout(()=> speak(current.word), 450); // repete a palavra para ajudar
  }
}

function next(){
  idx++;
  if(idx >= words.length) finish();
  else loadWord();
}

function finish(){
  qStage.hidden = true;
  qFinal.hidden = false;
  qFinalText.textContent = `Você fez ${score} pontos em ${words.length} palavras!`;
  qProgress.textContent = 'Fim de jogo';
  confetti(qFinal);
  ping(true);
}

document.getElementById('qListen').addEventListener('click', ()=> current && speak(current.word));
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
initCommon('ditado');
start();
