// ============================================================
// Detetive da Ortografia (3º ao 5º ano) — a palavra aparece com uma
// lacuna e a criança escolhe a forma certa de completar.
//  • Fácil: M ou N (antes de P/B) · R ou RR · L ou U no final.
//  • Médio: S ou Z · SS ou Ç · X ou CH · G ou J.
// Só entram palavras em que a opção errada NÃO forma outra palavra
// (por isso não há CARO/CARRO, MAL/MAU, SOL/SOU…).
// 10 palavras por jogo.
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

const qStage = document.getElementById('qStage');
const txRule = document.getElementById('txRule');
const txWord = document.getElementById('txWord');
const qOptions = document.getElementById('qOptions');
const qQuestion = document.getElementById('qQuestion');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

// cada item: [antes, resposta, depois]  → a palavra é antes + resposta + depois
const RULES = {
  'M ou N?': { opts:['M','N'], tip:'Antes de P e B, usamos M.', level:'facil', words:[
    ['CA','M','PO'], ['BO','M','BA'], ['TA','M','PA'], ['SA','M','BA'], ['LÂ','M','PADA'], ['E','M','PADA'], ['TE','M','PO'],
    ['CO','M','PRA'], ['CA','N','TO'], ['PO','N','TE'], ['DE','N','TE'], ['BA','N','CO'], ['MU','N','DO'], ['O','N','DA'],
    ['LE','M','BRAR'], ['SO','M','BRA'], ['PE','N','TE'], ['VE','N','TO'],
  ]},
  'R ou RR?': { opts:['R','RR'], tip:'Entre vogais, o som forte se escreve com RR.', level:'facil', words:[
    ['TE','RR','A'], ['CO','RR','IDA'], ['GA','RR','AFA'], ['CACHO','RR','O'], ['BA','RR','IGA'], ['A','RR','OZ'], ['TO','RR','ADA'],
    ['GI','R','AFA'], ['BA','R','ATA'], ['JACA','R','É'], ['O','R','ELHA'], ['PE','R','A'], ['FA','R','OFA'],
  ]},
  'L ou U?': { opts:['L','U'], tip:'Ouça bem: no final, L e U podem ter o mesmo som!', level:'facil', words:[
    ['ANZO','L',''], ['CHAPÉ','U',''], ['PAPE','L',''], ['PASTE','L',''], ['MINGA','U',''], ['FUNI','L',''], ['CARACO','L',''],
    ['DEGRA','U',''], ['PINCE','L',''], ['AZU','L',''], ['VARA','L',''],
  ]},
  'S ou Z?': { opts:['S','Z'], tip:'Entre vogais, o S tem som de Z. Cuidado!', level:'medio', words:[
    ['CA','S','A'], ['ME','S','A'], ['RO','S','A'], ['A','Z','UL'], ['BELE','Z','A'], ['PRINCE','S','A'], ['RIQUE','Z','A'],
    ['','Z','EBRA'], ['VA','Z','IO'], ['CAMI','S','A'], ['FA','Z','ENDA'], ['AVI','S','O'], ['BU','Z','INA'], ['MÚ','S','ICA'],
    ['GULO','S','EIMA'],
  ]},
  'SS ou Ç?': { opts:['SS','Ç'], tip:'Ç nunca vem antes de E ou I.', level:'medio', words:[
    ['A','Ç','ÚCAR'], ['PALHA','Ç','O'], ['CABE','Ç','A'], ['PA','SS','EIO'], ['A','SS','ADO'], ['CORA','Ç','ÃO'],
    ['PÊ','SS','EGO'], ['PÁ','SS','ARO'], ['CRIAN','Ç','A'], ['PRE','SS','A'], ['LI','Ç','ÃO'], ['TO','SS','E'], ['CARRO','Ç','A'],
  ]},
  'X ou CH?': { opts:['X','CH'], tip:'X e CH têm o mesmo som — é preciso memorizar!', level:'medio', words:[
    ['','CH','UVA'], ['','X','ÍCARA'], ['CAI','X','A'], ['','CH','AVE'], ['PEI','X','E'], ['','CH','INELO'], ['ABACA','X','I'],
    ['BRU','X','A'], ['MO','CH','ILA'], ['LI','X','O'], ['','CH','OCOLATE'], ['EN','X','ADA'], ['FLE','CH','A'], ['','X','AROPE'], ['BI','CH','O'],
  ]},
  'G ou J?': { opts:['G','J'], tip:'Antes de E e I, G e J têm o mesmo som.', level:'medio', words:[
    ['','G','IRAFA'], ['','J','ILÓ'], ['','G','ELADEIRA'], ['','J','EITO'], ['TI','G','ELA'], ['CAN','J','ICA'], ['MÁ','G','ICO'],
    ['','G','ENTE'], ['','J','IBOIA'], ['BERIN','J','ELA'], ['LO','J','ISTA'], ['RELÓ','G','IO'], ['MAN','J','ERICÃO'],
  ]},
};
const ROUNDS = 10;

let level = 'facil';
let items = [], idx = 0, score = 0, tries = 0, locked = false;
let current = null;
let nextTimer = null;

function start(){
  clearTimeout(nextTimer);
  const all = [];
  Object.entries(RULES).forEach(([name, r])=>{
    if(r.level !== level) return;
    r.words.forEach(([a, ans, b]) => all.push({rule:name, tip:r.tip, opts:r.opts, a, ans, b, word:a + ans + b}));
  });
  // sem repetir palavras
  const seen = new Set();
  items = shuffle(all).filter(x => !seen.has(x.word) && seen.add(x.word)).slice(0, ROUNDS);
  idx = 0; score = 0;
  qFinal.hidden = true;
  qStage.hidden = false;
  load();
}

function load(){
  locked = false; tries = 0;
  const it = current = items[idx];
  txRule.textContent = it.rule;
  txWord.innerHTML = `<span>${it.a}</span><span class="tx-gap">?</span><span>${it.b}</span>`;
  qOptions.innerHTML = '';
  it.opts.forEach(o=>{
    const b = document.createElement('button');
    b.className = 'q-opt tx-opt';
    b.textContent = o;
    b.addEventListener('click', ()=> choose(b, o));
    qOptions.appendChild(b);
  });
  qQuestion.textContent = 'Qual completa a palavra?';
  qProgress.textContent = `Palavra ${idx + 1} de ${items.length}`;
  qScore.textContent = `${score} pontos`;
}

function choose(btn, o){
  if(locked) return;
  if(o === current.ans){
    locked = true;
    btn.classList.add('right');
    const gap = txWord.querySelector('.tx-gap');
    gap.textContent = o;
    gap.classList.add('done');
    const earned = tries === 0 ? 10 : 5;
    score += earned;
    qScore.textContent = `${score} pontos`;
    ping(true);
    confetti(txWord);
    if(tries === 0) rewardSticker(current.word, earned);
    speak(current.word);
    qQuestion.textContent = `✔ ${current.word} — ${current.tip}`;
    nextTimer = setTimeout(next, 2300);
  } else {
    tries++;
    btn.classList.add('wrong');
    ping(false);
    qQuestion.textContent = `Dica: ${current.tip}`;
  }
}

function next(){
  idx++;
  if(idx >= items.length) finish();
  else load();
}

function finish(){
  qStage.hidden = true;
  qFinal.hidden = false;
  qFinalText.textContent = `Você fez ${score} pontos em ${items.length} palavras!`;
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
initCommon('ortografia');
start();
