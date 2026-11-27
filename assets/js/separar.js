// ============================================================
// Separa Sílabas (3º ao 5º ano)
//  • Separar: a palavra aparece com espacinhos entre as letras; a criança
//    toca nos espaços para colocar os tracinhos (BOR - BO - LE - TA) e confere.
//  • Classificar: diz se a palavra é monossílaba, dissílaba, trissílaba
//    ou polissílaba.
// 10 palavras por jogo.
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const qStage = document.getElementById('qStage');
const txPic = document.getElementById('txPic');
const spWord = document.getElementById('spWord');
const qOptions = document.getElementById('qOptions');
const qQuestion = document.getElementById('qQuestion');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

// monossílabas (sem figura) para o modo Classificar
const MONOS = ['PÃO', 'MAR', 'SOL', 'FLOR', 'LUZ', 'MÃE', 'PÉ', 'CÉU', 'SAL', 'PAZ', 'TREM', 'BOI', 'REI', 'MEL', 'CHÁ', 'FÉ', 'NÓS', 'TRÊS', 'DEZ', 'MÃO']
  .map(w => ({word:w, syl:[w], art:null}));
const CLASSES = [
  {name:'Monossílaba', n:1, help:'1 sílaba'},
  {name:'Dissílaba', n:2, help:'2 sílabas'},
  {name:'Trissílaba', n:3, help:'3 sílabas'},
  {name:'Polissílaba', n:4, help:'4 ou mais'},
];
const classOf = w => Math.min(w.syl.length, 4);
const ROUNDS = 10;

let level = 'facil';
let words = [], idx = 0, score = 0, tries = 0, locked = false;
let current = null, cuts = new Set(), answerCuts = new Set();
let nextTimer = null;

function start(){
  clearTimeout(nextTimer);
  if(level === 'facil'){
    words = shuffle(ALL_WORDS.filter(w => w.syl.length >= 2)).slice(0, ROUNDS);
  } else {
    // mistura as 4 classes de forma equilibrada
    const byClass = n => shuffle([...MONOS, ...ALL_WORDS].filter(w => classOf(w) === n));
    const pools = [1, 2, 3, 4].map(byClass);
    words = [];
    for(let i = 0; words.length < ROUNDS; i++){ const p = pools[i % 4]; if(p.length) words.push(p.pop()); }
    words = shuffle(words);
  }
  idx = 0; score = 0;
  qFinal.hidden = true;
  qStage.hidden = false;
  load();
}

function showPic(w){
  txPic.innerHTML = w.art ? `<img src="${w.art}" alt="">` : '';
  txPic.hidden = !w.art;
}

function load(){
  locked = false; tries = 0;
  const w = current = words[idx];
  showPic(w);
  qProgress.textContent = `Palavra ${idx + 1} de ${words.length}`;
  qScore.textContent = `${score} pontos`;
  if(level === 'facil') loadSeparate(w);
  else loadClassify(w);
}

// ---------- Separar ----------
function loadSeparate(w){
  const letters = [...w.word];
  answerCuts = new Set();
  let pos = 0;
  w.syl.slice(0, -1).forEach(s => { pos += [...s].length; answerCuts.add(pos); });
  cuts = new Set();
  spWord.innerHTML = '';
  spWord.style.setProperty('--n', letters.length);
  letters.forEach((ch, i)=>{
    if(i > 0){
      const g = document.createElement('button');
      g.className = 'sp-gap';
      g.dataset.pos = i;
      g.setAttribute('aria-label', `Separar entre ${letters[i - 1]} e ${ch}`);
      g.addEventListener('click', ()=> toggleCut(g, i));
      spWord.appendChild(g);
    }
    const t = document.createElement('span');
    t.className = 'sp-letter';
    t.textContent = ch;
    spWord.appendChild(t);
  });
  qQuestion.textContent = 'Toque entre as letras para separar as sílabas.';
  qOptions.innerHTML = '';
  const ok = document.createElement('button');
  ok.className = 'm-new-btn sp-check';
  ok.textContent = 'Conferir';
  ok.addEventListener('click', checkSeparate);
  qOptions.appendChild(ok);
}

function toggleCut(g, i){
  if(locked) return;
  if(cuts.has(i)){ cuts.delete(i); g.classList.remove('on'); }
  else { cuts.add(i); g.classList.add('on'); }
  spWord.querySelectorAll('.sp-gap').forEach(x => x.classList.remove('bad', 'miss'));
}

function checkSeparate(){
  if(locked) return;
  const same = cuts.size === answerCuts.size && [...cuts].every(c => answerCuts.has(c));
  if(same){
    locked = true;
    win(spWord, tries === 0 ? 10 : tries === 1 ? 5 : 2);
    say(current.syl.map(s => s.toLocaleLowerCase('pt-BR')).join(', '), 0.75);
    qQuestion.textContent = `✔ ${current.syl.join(' - ')} (${current.syl.length} sílabas)`;
    return;
  }
  tries++;
  ping(false);
  spWord.querySelectorAll('.sp-gap').forEach(g=>{
    const p = +g.dataset.pos;
    if(cuts.has(p) && !answerCuts.has(p)) g.classList.add('bad');
  });
  if(tries >= 3){
    // mostra a resposta e segue
    locked = true;
    spWord.querySelectorAll('.sp-gap').forEach(g=>{
      const p = +g.dataset.pos;
      g.classList.toggle('on', answerCuts.has(p));
      g.classList.remove('bad');
    });
    qQuestion.textContent = `A separação certa é: ${current.syl.join(' - ')}`;
    say(current.syl.map(s => s.toLocaleLowerCase('pt-BR')).join(', '), 0.75);
    nextTimer = setTimeout(next, 3200);
  } else {
    qQuestion.textContent = 'Ainda não… Dica: fale a palavra devagar, batendo palmas em cada pedacinho.';
  }
}

// ---------- Classificar ----------
function loadClassify(w){
  spWord.innerHTML = `<span class="tx-big">${w.word}</span>`;
  qQuestion.textContent = 'Quantas sílabas tem esta palavra?';
  qOptions.innerHTML = '';
  CLASSES.forEach(c=>{
    const b = document.createElement('button');
    b.className = 'tx-class';
    b.innerHTML = `<b>${c.name}</b><small>${c.help}</small>`;
    b.addEventListener('click', ()=> chooseClass(b, c));
    qOptions.appendChild(b);
  });
  speak(w.word);
}

function chooseClass(btn, c){
  if(locked) return;
  if(c.n === classOf(current)){
    locked = true;
    btn.classList.add('right');
    win(btn, tries === 0 ? 10 : 5);
    spWord.innerHTML = `<span class="tx-big">${current.syl.join(' - ')}</span>`;
    qQuestion.textContent = `✔ ${current.word} tem ${current.syl.length} ${current.syl.length === 1 ? 'sílaba' : 'sílabas'}: é ${c.name.toLowerCase()}.`;
    say(current.syl.map(s => s.toLocaleLowerCase('pt-BR')).join(', '), 0.75);
  } else {
    tries++;
    btn.classList.add('wrong');
    ping(false);
  }
}

function win(anchor, earned){
  score += earned;
  addPoints(earned);
  qScore.textContent = `${score} pontos`;
  ping(true);
  confetti(anchor);
  if(tries === 0) rewardSticker(current.word, earned);
  nextTimer = setTimeout(next, 2600);
}

function next(){
  idx++;
  if(idx >= words.length) finish();
  else load();
}

function finish(){
  qStage.hidden = true;
  qFinal.hidden = false;
  qFinalText.textContent = `Você fez ${score} pontos em ${words.length} palavras!`;
  qProgress.textContent = 'Fim de jogo';
  confetti(qFinal);
  ping(true);
}

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
initCommon('separar');
start();
