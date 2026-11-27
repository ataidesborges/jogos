// ============================================================
// Utilidades dos jogos de matemática
// (depende de word-bank.js e shared-utils.js já carregados antes)
// ============================================================

// Figuras boas para contar, com o plural e o gênero (para a voz perguntar
// "Quantos patos?" / "Quantas bolas?")
const COUNTABLES = [
  ['BOLA', 'bolas', 'f'], ['BANANA', 'bananas', 'f'], ['OVO', 'ovos', 'm'], ['PEIXE', 'peixes', 'm'],
  ['PATO', 'patos', 'm'], ['CARRO', 'carros', 'm'], ['SORVETE', 'sorvetes', 'm'], ['BALÃO', 'balões', 'm'],
  ['BALA', 'balas', 'f'], ['LÁPIS', 'lápis', 'm'], ['TOMATE', 'tomates', 'm'], ['GATO', 'gatos', 'm'],
  ['SAPO', 'sapos', 'm'], ['JOANINHA', 'joaninhas', 'f'], ['BORBOLETA', 'borboletas', 'f'], ['PIPA', 'pipas', 'f'],
  ['ROSA', 'rosas', 'f'], ['COPO', 'copos', 'm'], ['DADO', 'dados', 'm'], // (UVA fica de fora: a figura é um cacho)
  ['ABACATE', 'abacates', 'm'], ['PINGUIM', 'pinguins', 'm'], ['FOGUETE', 'foguetes', 'm'], ['GIRASSOL', 'girassóis', 'm'],
].map(([word, plural, g]) => {
  const w = ALL_WORDS.find(x => x.word === word);
  return w ? {word, plural, fem: g === 'f', art: w.art} : null;
}).filter(Boolean);

function randomCountable(except){
  const pool = COUNTABLES.filter(c => !except || c.word !== except.word);
  return pool[Math.floor(Math.random() * pool.length)];
}
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// opções de resposta: a certa + números vizinhos (nunca negativos)
function numberOptions(answer, n, max, min){
  min = min || 0;
  const set = new Set([answer]);
  const near = shuffle([-3, -2, -1, 1, 2, 3, 4, -4, 5]);
  for(const d of near){
    if(set.size >= n) break;
    const v = answer + d;
    if(v >= min && v <= Math.max(max, answer + 5)) set.add(v);
  }
  let k = 1;
  while(set.size < n){ set.add(answer + 5 + k++); }
  return shuffle([...set]);
}

// botões de número (reaproveita o estilo .q-opt)
function renderNumberOptions(container, values, onPick){
  container.innerHTML = '';
  values.forEach(v=>{
    const b = document.createElement('button');
    b.className = 'q-opt num-opt';
    b.textContent = v;
    b._v = v; // valor do botão (para mostrar a certa quando errar)
    b.addEventListener('click', ()=> onPick(b, v));
    container.appendChild(b);
  });
}

// a voz conta "um, dois, três..." e chama `each(i)` a cada número
function countAloud(total, each, done){
  let i = 0;
  const step = ()=>{
    i++;
    if(each) each(i);
    say(String(i), 1);
    if(i < total) setTimeout(step, 520);
    else if(done) setTimeout(done, 600);
  };
  step();
}
