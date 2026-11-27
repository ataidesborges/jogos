// ============================================================
// Problemas de Matemática (3º ao 5º ano) — probleminhas com histórias.
//  • Fácil: adição e subtração (até 99).
//  • Médio: multiplicação e divisão exata (tabuada até 10).
//  • Misto: todas as operações.
// A voz lê o problema; depois do acerto aparece a conta que resolve.
// 8 problemas por jogo.
// (depende de word-bank.js, shared-utils.js e math-utils.js)
// ============================================================

const qStage = document.getElementById('qStage');
const pbText = document.getElementById('pbText');
const pbExplain = document.getElementById('pbExplain');
const qOptions = document.getElementById('qOptions');
const qQuestion = document.getElementById('qQuestion');
const qProgress = document.getElementById('qProgress');
const qScore = document.getElementById('qScore');
const qFinal = document.getElementById('qFinal');
const qFinalText = document.getElementById('qFinalText');

const NAMES = ['Ana', 'Bia', 'Caio', 'Davi', 'Duda', 'Enzo', 'Gabi', 'Léo', 'Lia', 'Luca', 'Malu', 'Nina', 'Pedro', 'Rafa', 'Sofia', 'Théo', 'Iara', 'Joaquim'];
// [plural, feminino?]
const THINGS = [
  ['figurinhas', true], ['bolinhas de gude', true], ['lápis', false], ['livros', false], ['balas', true], ['pipas', true],
  ['carrinhos', false], ['adesivos', false], ['maçãs', true], ['laranjas', true], ['biscoitos', false], ['canetas', true],
];
const ROUNDS = 8;

const q = fem => fem ? 'Quantas' : 'Quantos';
const pick = a => a[Math.floor(Math.random() * a.length)];

// cada modelo devolve {text, answer, expr}
const MODELS = {
  soma(){
    const n = pick(NAMES), [t, f] = pick(THINGS), a = randInt(8, 60), b = randInt(5, 39);
    return pick([
      {text:`${n} tem ${a} ${t}. Ganhou mais ${b}. ${q(f)} ${t} ${n} tem agora?`, answer:a + b, expr:`${a} + ${b} = ${a + b}`},
      {text:`Na turma, ${a} crianças trouxeram lanche e ${b} compraram na cantina. Quantas crianças lancharam?`, answer:a + b, expr:`${a} + ${b} = ${a + b}`},
      {text:`${n} leu ${a} páginas ontem e ${b} páginas hoje. Quantas páginas leu nos dois dias?`, answer:a + b, expr:`${a} + ${b} = ${a + b}`},
    ]);
  },
  sub(){
    const n = pick(NAMES), [t, f] = pick(THINGS), a = randInt(20, 99), b = randInt(3, a - 5);
    return pick([
      {text:`${n} tinha ${a} ${t} e deu ${b} para um amigo. Com ${q(f).toLowerCase()} ${t} ${n} ficou?`, answer:a - b, expr:`${a} − ${b} = ${a - b}`},
      {text:`Um ônibus saiu com ${a} passageiros. No primeiro ponto, desceram ${b}. Quantos passageiros continuaram no ônibus?`, answer:a - b, expr:`${a} − ${b} = ${a - b}`},
      {text:`Um livro tem ${a} páginas. ${n} já leu ${b}. Quantas páginas ainda faltam?`, answer:a - b, expr:`${a} − ${b} = ${a - b}`},
    ]);
  },
  mult(){
    const n = pick(NAMES), [t, f] = pick(THINGS), a = randInt(2, 9), b = randInt(2, 10);
    return pick([
      {text:`${n} comprou ${a} pacotes com ${b} ${t} cada. ${q(f)} ${t} ${n} comprou ao todo?`, answer:a * b, expr:`${a} × ${b} = ${a * b}`},
      {text:`Na sala há ${a} fileiras com ${b} carteiras em cada uma. Quantas carteiras há na sala?`, answer:a * b, expr:`${a} × ${b} = ${a * b}`},
      {text:`Uma aranha tem 8 patas. Quantas patas têm ${a} aranhas?`, answer:a * 8, expr:`${a} × 8 = ${a * 8}`},
    ]);
  },
  div(){
    const n = pick(NAMES), [t, f] = pick(THINGS), k = randInt(2, 9), each = randInt(2, 10), total = k * each;
    return pick([
      {text:`${n} tem ${total} ${t} e vai dividir igualmente entre ${k} amigos. ${q(f)} ${t} cada amigo vai receber?`, answer:each, expr:`${total} ÷ ${k} = ${each}`},
      {text:`A professora tem ${total} lápis para colocar em ${k} estojos, a mesma quantidade em cada um. Quantos lápis vão em cada estojo?`, answer:each, expr:`${total} ÷ ${k} = ${each}`},
      {text:`${total} alunos vão formar grupos de ${each}. Quantos grupos serão formados?`, answer:k, expr:`${total} ÷ ${each} = ${k}`},
    ]);
  },
};
const LEVEL_OPS = {facil:['soma', 'sub'], medio:['mult', 'div'], misto:['soma', 'sub', 'mult', 'div']};

let level = 'facil';
let problems = [], idx = 0, score = 0, tries = 0, locked = false;
let current = null;
let nextTimer = null;

function start(){
  clearTimeout(nextTimer);
  const ops = LEVEL_OPS[level];
  problems = Array.from({length: ROUNDS}, (_, i) => MODELS[ops[i % ops.length]]());
  problems = shuffle(problems);
  idx = 0; score = 0;
  qFinal.hidden = true;
  qStage.hidden = false;
  load();
}

function load(){
  locked = false; tries = 0;
  const p = current = problems[idx];
  // números em destaque no texto
  pbText.innerHTML = p.text.replace(/\d+/g, n => `<b>${n}</b>`);
  pbExplain.textContent = '';
  pbExplain.classList.remove('show');
  const max = Math.max(20, p.answer + 10);
  renderNumberOptions(qOptions, numberOptions(p.answer, 4, max, 0), choose);
  qQuestion.textContent = 'Qual é a resposta?';
  qProgress.textContent = `Problema ${idx + 1} de ${problems.length}`;
  qScore.textContent = `${score} pontos`;
  setTimeout(()=> say(p.text, 0.9), 300);
}

function choose(btn, v){
  if(locked) return;
  if(v === current.answer){
    locked = true;
    btn.classList.add('right');
    const earned = tries === 0 ? 10 : 5;
    score += earned;
    addPoints(earned);
    qScore.textContent = `${score} pontos`;
    ping(true);
    confetti(btn);
    if(tries === 0) rewardSticker(null, earned);
    pbExplain.textContent = `A conta é: ${current.expr}`;
    pbExplain.classList.add('show');
    nextTimer = setTimeout(next, 2800);
  } else {
    // uma tentativa só: errou, mostra a conta certa
    locked = true;
    missAnswer(btn, b => b._v === current.answer, `Ops! A resposta era <b>${current.answer}</b>`);
    pbExplain.textContent = `A conta é: ${current.expr}`;
    pbExplain.classList.add('show');
    nextTimer = setTimeout(next, MISS_DELAY + 1200);
  }
}

function next(){
  idx++;
  if(idx >= problems.length) finish();
  else load();
}

function finish(){
  qStage.hidden = true;
  qFinal.hidden = false;
  levelDone(level, score / 10, problems.length);
  qFinalText.textContent = `Você fez ${score} pontos em ${problems.length} problemas!`;
  qProgress.textContent = 'Fim de jogo';
  confetti(qFinal);
  ping(true);
}

document.getElementById('qListen').addEventListener('click', ()=> current && say(current.text, 0.9));
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
initCommon('problemas');
start();
