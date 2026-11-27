// ============================================================
// Rimas — a figura de cima aparece com o nome (GATO) e a voz fala;
// a criança escolhe, entre as figuras de baixo, a que RIMA (PATO).
//  • Fácil: 3 opções · Médio: 4 opções. 8 rodadas por jogo.
// Tocar numa figura de baixo faz a voz falar o nome dela, para a
// criança comparar o som do final das palavras.
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const qStage = document.getElementById('qStage');
const qCard = document.querySelector('.q-card');
const qArt = document.getElementById('qArt');
const rmWord = document.getElementById('rmWord');
const qOptions = document.getElementById('qOptions');
const qQuestion = document.getElementById('qQuestion');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

// Grupos de palavras que rimam (todas têm figura no jogo)
const RHYMES = [
  ['GATO', 'PATO', 'RATO'],
  ['GALO', 'CAVALO'],
  ['TOMATE', 'ABACATE'],
  ['JANELA', 'PANELA'],
  ['GALINHA', 'JOANINHA'],
  ['BALÃO', 'AVIÃO', 'LEÃO'],
  ['SORVETE', 'FOGUETE'],
  ['BICICLETA', 'BORBOLETA'],
  ['BALA', 'MALA'],
];
const ROUNDS = 8;
const byWord = new Map(ALL_WORDS.map(w => [w.word, w]));
const groups = RHYMES.map(g => g.filter(w => byWord.has(w))).filter(g => g.length >= 2);
const inSameGroup = (a, b) => groups.some(g => g.includes(a) && g.includes(b));

let level = 'facil';
let rounds = [], idx = 0, score = 0, tries = 0, locked = false;
let current = null; // {target, answer}
let nextTimer = null;

function start(){
  clearTimeout(nextTimer);
  // cada rodada: um grupo, uma palavra-alvo e outra do mesmo grupo como resposta
  const order = shuffle([...groups]);
  rounds = [];
  for(let i = 0; i < ROUNDS; i++){
    const g = shuffle([...order[i % order.length]]);
    rounds.push({target: byWord.get(g[0]), answer: byWord.get(g[1])});
  }
  idx = 0; score = 0;
  qFinal.hidden = true;
  qStage.hidden = false;
  loadRound();
}

function loadRound(){
  locked = false; tries = 0;
  const r = current = rounds[idx];
  const n = level === 'facil' ? 3 : 4;
  // opções erradas: palavras que NÃO rimam com a palavra-alvo
  // (e que nem terminem com o mesmo som, como LEITE e FOGUETE, para não confundir)
  const end2 = s => s.normalize('NFD').replace(/\p{M}/gu, '').slice(-2); // tira acentos
  const wrong = shuffle(ALL_WORDS.filter(w => w.word !== r.target.word && !inSameGroup(w.word, r.target.word) && end2(w.word) !== end2(r.target.word))).slice(0, n - 1);
  const opts = shuffle([r.answer, ...wrong]);

  rmWord.textContent = r.target.word;
  qOptions.innerHTML = '';
  qOptions.classList.toggle('four', n === 4);
  opts.forEach(o=>{
    const b = document.createElement('button');
    b.className = 'dt-opt';
    b.innerHTML = `<img src="${o.art}" alt=""><span class="dt-word small">${o.word}</span>`;
    b.setAttribute('aria-label', o.word);
    b.addEventListener('click', ()=> choose(b, o));
    qOptions.appendChild(b);
  });
  qQuestion.textContent = `Qual figura rima com ${r.target.word}?`;
  qProgress.textContent = `Rodada ${idx + 1} de ${rounds.length}`;
  qScore.textContent = `${score} pontos`;
  qCard.classList.remove('pop'); void qCard.offsetWidth; qCard.classList.add('pop');
  setArt(qArt, r.target.art, `Ilustração de ${r.target.word.toLowerCase()}`).then(()=> speak(r.target.word));
}

function choose(btn, o){
  if(locked) return;
  if(o.word === current.answer.word){
    locked = true;
    btn.classList.add('right');
    const earned = tries === 0 ? 10 : 5;
    score += earned;
    qScore.textContent = `${score} pontos`;
    ping(true);
    confetti(btn);
    collectSticker(o.word, earned);
    // a voz fala as duas palavras, para a criança ouvir a rima
    say(`${current.target.word.toLocaleLowerCase('pt-BR')}... ${o.word.toLocaleLowerCase('pt-BR')}!`, 0.8);
    qQuestion.textContent = `🎉 ${current.target.word} rima com ${o.word}!`;
    nextTimer = setTimeout(next, 2300);
  } else {
    tries++;
    speak(o.word);
    btn.classList.add('wrong');
    ping(false);
  }
}

function next(){
  idx++;
  if(idx >= rounds.length) finish();
  else loadRound();
}

function finish(){
  qStage.hidden = true;
  qFinal.hidden = false;
  qFinalText.textContent = `Você fez ${score} pontos em ${rounds.length} rimas!`;
  qProgress.textContent = 'Fim de jogo';
  confetti(qFinal);
  ping(true);
}

document.getElementById('qListen').addEventListener('click', ()=> current && speak(current.target.word));
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
initCommon('rimas');
start();
