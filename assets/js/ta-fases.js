// ============================================================
// Tabuada Aventura: FASES FEITAS À MÃO
//  Cada fase é desenhada trecho por trecho (não é sorteada), seguindo a
//  ideia de jogo profissional: aprender → praticar → surpresa → desafio.
//  O "construtor" (B) tem um cursor x que anda da esquerda para a direita;
//  os itens usam posições relativas ao cursor (dx) antes do chão avançar.
// (usa as constantes e o motor de ta-corrida.js)
// ============================================================

// conta bônus (usa a operação e a tabuada escolhidas nas contas)
function doorQuestion(){
  const t = (typeof table !== 'undefined' && table) || randInt(2, 9);
  const n = randInt(1, 10);
  const m = (typeof mode !== 'undefined' && mode) || 'multiplicar';
  let a, b, ans;
  if(m === 'somar'){ a = t; b = n; ans = t + n; }
  else if(m === 'subtrair'){ a = t + n; b = t; ans = n; }
  else if(m === 'dividir'){ a = t * n; b = t; ans = n; }
  else { a = t; b = n; ans = t * n; }
  const sign = {somar:'+', subtrair:'−', multiplicar:'×', dividir:'÷'}[m] || '×';
  const spoken = {somar:'mais', subtrair:'menos', multiplicar:'vezes', dividir:'dividido por'}[m] || 'vezes';
  const wrong = new Set();
  [ans + t, ans - t, ans + 1, ans - 1, ans + 2, ans + 10].forEach(v => { if(v >= 0 && v !== ans && wrong.size < 2 && Math.random() < .7) wrong.add(v); });
  for(let k = 3; wrong.size < 2; k++) if(ans + k !== ans) wrong.add(ans + k);
  return {a, b, ans, text:`${a} ${sign} ${b}`, spoken:`${a} ${spoken} ${b}`, opts:shuffle([ans, ...wrong])};
}

function buildFromDef(def, d){
  const L = {solids:[], plats:[], coins:[], stars:[], enemies:[], spikes:[], springs:[], decos:[], starSpots:[], foods:[], signs:[],
    keys:[], rollSpawns:[], rollers:[], lamps:[], jets:[], checks:[], hearts:[], cubs:[], pages:[], bushes:[], textSigns:[], doors:[],
    waters:[], masks:[], crushers:[], spinners:[]};
  let x = -300;
  const lastGround = () => [...L.solids].reverse().find(q => q.type === 'ground');
  const enemyObj = (ex, minX, maxX, speed) => ({x:ex, y:GY, minX, maxX, dir:-1, speed:speed || (50 + d * 8), alive:true, flying:false, baseY:GY - 85, ph:Math.random() * 6, dead:0});
  const B = {
    get x(){ return x; },
    ground(len, top){
      top = top || GY;
      const last = lastGround();
      if(last && last.top === top && Math.abs(last.x1 - x) < 1) last.x1 = x + len;
      else L.solids.push({x0:x, x1:x + len, top, bottom:9999, type:'ground'});
      x += len;
    },
    gap(w){ x += w; },
    coin(dx, y){ L.coins.push({x:x + dx, y}); },
    coins(dx, y, n, step){ for(let k = 0; k < n; k++) L.coins.push({x:x + dx + k * (step || 36), y}); },
    arc(dx0, dx1, y, h, n){ for(let k = 0; k < n; k++){ const f = k / (n - 1); L.coins.push({x:x + dx0 + (dx1 - dx0) * f, y:y - Math.sin(f * Math.PI) * h}); } },
    plat(dx, top, w, o){ L.plats.push(Object.assign({x0:x + dx, x1:x + dx + (w || 120), y:top}, o || {})); },
    moving(dx, top, w, amp, sp, ph){ L.plats.push({x0:x + dx, x1:x + dx + (w || 110), y:top, baseY:top, amp:amp || 30, sp:sp || 1.6, ph:ph || 0, moving:true}); },
    hidden(dx, top, w, group){ L.plats.push({x0:x + dx, x1:x + dx + (w || 110), y:top, hidden:true, group}); },
    key(dx, y, group){ L.keys.push({x:x + dx, y, group, taken:false}); },
    enemy(dx, range, speed){ L.enemies.push(enemyObj(x + dx, x + dx - (range || 120), x + dx + (range || 120) * .3, speed)); },
    bee(dx, baseY, amp, ph){ L.enemies.push({x:x + dx, y:baseY, minX:x + dx, maxX:x + dx, dir:-1, speed:0, alive:true, flying:true, baseY, amp:amp || 55, ph:ph || 0, dead:0}); },
    spring(dx){ L.springs.push({x:x + dx, y:GY, comp:0}); },
    spikes(dx, n){ L.spikes.push({x0:x + dx, x1:x + dx + 34 * (n || 1), y:GY}); },
    box(dx, top){ L.solids.push({x0:x + dx, x1:x + dx + 36, top:top || GY - 128, bottom:(top || GY - 128) + 36, type:'box', used:false, bump:0}); },
    star(dx, y){ L.stars.push({x:x + dx, y, taken:false}); },
    page(dx, y){ L.pages.push({x:x + dx, y, taken:false}); },
    cub(dx, y, kind){ L.cubs.push({x:x + dx, y:y || GY, kind:kind || 0, taken:false}); },
    heart(dx, y){ L.hearts.push({x:x + dx, y:y || GY - 40, taken:false}); },
    check(dx, y){ L.checks.push({x:x + dx, on:false, y}); },
    // plataforma que anda para os lados (leva o personagem junto)
    hmove(dx, top, w, amp, sp, ph){ const ww = Math.max(w || 120, 145); L.plats.push({x0:x + dx, x1:x + dx + ww, y:top, baseX:x + dx, amp:amp || 100, sp:(sp || 1.3) * .8, ph:ph || 0, axisX:true}); }, // largas e calmas
    // pedra esmagadora que cai do alto em ritmo
    crusher(dx, w, off){ L.crushers.push({x:x + dx, w:w || 72, topY:GY - 215, off:off || 0}); },
    // bola de espinho girando presa numa corrente
    spinner(dx, cy, len, sp, ph){ L.spinners.push({cx:x + dx, cy, len:len || 80, sp:sp || 1.6, ph:ph || 0}); },
    // ---- fundo do mar ----
    mask(dx, y){ L.masks.push({x:x + dx, y:y || GY - 34, taken:false}); },
    fish(dx, y, range, speed, col){ L.enemies.push({x:x + dx, y, minX:x + dx - (range || 100), maxX:x + dx + (range || 100), dir:-1, speed:speed || 60, alive:true, flying:true, baseY:y, amp:8, ph:Math.random() * 6, dead:0, kind:'peixe', col}); },
    jelly(dx, y, amp){ L.enemies.push({x:x + dx, y, minX:x + dx, maxX:x + dx, dir:-1, speed:0, alive:true, flying:true, baseY:y, amp:amp || 60, ph:Math.random() * 6, dead:0, kind:'agua'}); },
    rock(dx, w, top){ L.solids.push({x0:x + dx, x1:x + dx + w, top, bottom:9999, type:'ground'}); },   // pedra que sobe do fundo
    roof(dx, w, bottom){ L.solids.push({x0:x + dx, x1:x + dx + w, top:-9999, bottom, type:'ceil'}); }, // pedra que desce de cima (passar por baixo)
    sea(len, depth){ L.waters.push({x0:x, x1:x + len, surface:GY + 12, floor:GY + depth}); L.solids.push({x0:x, x1:x + len, top:GY + depth, bottom:9999, type:'ground'}); x += len; },
    bush(dx, w){ L.bushes.push({x0:x + dx, x1:x + dx + (w || 160)}); },
    sign(dx, text){ L.textSigns.push({x:x + dx, text}); },
    // conta bônus: 3 blocos com números flutuando (não bloqueiam o caminho).
    // Acertou = superpoder por 10 s; errou = os blocos somem e a chance acaba.
    bonus(dx, power){
      const q = doorQuestion();
      const powers = ['rapido', 'pulo', 'escudo'];
      const bn = {q, state:'open', power:power || powers[L.doors.length % 3], x:x + dx + 82 + 23};
      const bx = x + dx;
      q.opts.forEach((v, k) => L.solids.push({x0:bx + k * 82, x1:bx + k * 82 + 46, top:GY - 140, bottom:GY - 94, type:'numbox', value:v, door:bn, bump:0, bad:0}));
      L.doors.push(bn);
    },
    // portão: só abre com todos os filhotes
    gate(dx, need){ L.solids.push({x0:x + dx, x1:x + dx + 50, top:-9999, bottom:9999, type:'wall', kind:'gate', need:need || 3}); },
    flag(dx){ L.flagX = x + dx; },
  };
  def.build(B, d);
  L.endX = L.flagX + 170;
  for(let dx = -100; dx < (L.flagX + 900) * .55; dx += randInt(120, 260)) L.decos.push({x:dx, s:.75 + Math.random() * .5, v:Math.random()});
  L.speed = 236;
  L.halfX = null;
  return L;
}

window.LEVEL_DEFS = {
  // ======================= MUNDO 1: FLORESTA =======================
  '1-1': {
    name:'Os filhotes perdidos', theme:0, ph:1,
    goal:'Ache os 3 filhotes 🐣 para abrir o portão. Olhe no alto das árvores e atrás dos arbustos!',
    build(B){
      // 1. começo tranquilo: andar e pegar moedas
      B.sign(330, 'Ache os 3 filhotes 🐣');
      B.coins(450, GY - 36, 5);
      B.ground(760);
      // 2. primeiro buraco (aprender a pular)
      B.arc(10, 100, GY - 50, 70, 5);
      B.gap(110);
      // 3. primeiro bichinho (aprender a pular em cima)
      B.coins(80, GY - 36, 3);
      B.enemy(330, 150, 45);
      B.ground(560);
      // 4. subir na árvore com a mola: filhote 1 lá no alto
      B.spring(130);
      B.coins(200, GY - 220, 3, 40);
      B.plat(300, GY - 190, 130);
      B.plat(520, GY - 255, 150);
      B.cub(595, GY - 255, 0);
      B.star(595, GY - 400);            // estrela: pulo duplo do galho mais alto
      B.coins(330, GY - 226, 3);
      B.check(800);
      B.ground(920);
      // 5. conta bônus: acertou, ganha um superpoder
      B.sign(60, 'Conta bônus: acerte e ganhe um superpoder!');
      B.bonus(300);
      B.heart(620);
      B.ground(760);
      // 6. pedras que sobem e descem sobre o buraco
      B.moving(90, GY - 30, 110, 30, 1.5, 0);
      B.moving(280, GY - 60, 110, 35, 1.5, 1.4);
      B.moving(470, GY - 30, 110, 30, 1.5, 2.8);
      B.coins(120, GY - 110, 1); B.coins(310, GY - 140, 1); B.coins(500, GY - 110, 1);
      B.star(335, GY - 250);
      B.gap(660);
      // 7. trilha de moedas que entra no arbusto: filhote 2 escondido
      B.bonus(40);
      B.enemy(300, 160, 55);
      B.coins(420, GY - 36, 4, 32);
      B.bush(540, 190);
      B.cub(640, GY, 1);
      B.check(880);
      B.ground(960);
      // 8. estrela-chave e plataformas secretas: filhote 3 lá no alto
      B.sign(20, 'Pegue a estrela-chave ✨');
      B.key(150, GY - 70, 0);
      B.ground(260);
      B.hidden(60, GY - 50, 115, 0);
      B.hidden(220, GY - 110, 115, 0);
      B.hidden(380, GY - 170, 115, 0);
      B.cub(437, GY - 170, 2);
      B.page(437, GY - 330);             // página do livro: pulo duplo do topo
      B.hidden(540, GY - 110, 115, 0);
      B.hidden(700, GY - 50, 115, 0);
      B.gap(870);
      // 9. reta final: espinhos, bichinho, bloco "?" e o portão dos filhotes
      B.arc(200, 360, GY - 50, 90, 5);
      B.spikes(250, 2);
      B.star(285, GY - 220);
      B.enemy(560, 120, 60);
      B.box(700, GY - 128);
      B.gate(920, 3);
      B.flag(1150);
      B.ground(1500);
    },
  },
  '1-2': {
    name:'Ninho das abelhas', theme:0, ph:1,
    goal:'Passe pelas abelhas na hora certa e ache a página do livro 📜 escondida!',
    build(B){
      // 1. aquecimento
      B.sign(330, 'Cuidado com as abelhas! 🐝');
      B.coins(430, GY - 36, 4);
      B.ground(720);
      // 2. corredor das abelhas (aprender o ritmo)
      B.bee(260, GY - 70, 55, 0);
      B.bee(520, GY - 70, 55, 1.5);
      B.coins(140, GY - 36, 3); B.coins(380, GY - 36, 3); B.coins(640, GY - 36, 3);
      B.heart(760);
      B.ground(880);
      // 3. buraco com pedras que se mexem e abelha no meio
      B.moving(80, GY - 40, 105, 40, 1.8, 0);
      B.moving(270, GY - 80, 105, 45, 1.8, 1.2);
      B.bee(370, GY - 190, 40, .5);
      B.moving(460, GY - 40, 105, 40, 1.8, 2.4);
      B.star(322, GY - 270);
      B.gap(650);
      B.check(80);
      // 4. espinhos e uma conta bônus
      B.spikes(130, 2);
      B.arc(80, 260, GY - 50, 90, 5);
      B.bonus(430);
      B.ground(840);
      // 5. dois caminhos: em cima (mola, estrela) ou embaixo (bichinhos e o arbusto com a página)
      B.spring(80);
      B.plat(200, GY - 200, 140); B.plat(420, GY - 230, 140); B.plat(640, GY - 200, 140);
      B.coins(230, GY - 236, 3); B.coins(450, GY - 266, 3); B.coins(670, GY - 236, 3);
      B.star(490, GY - 380);
      B.enemy(300, 130, 70); B.enemy(600, 130, 70);
      B.bush(780, 180);
      B.page(870, GY - 30);
      B.ground(1060);
      // 6. plataformas secretas com abelhas em volta
      B.check(-120);
      B.key(140, GY - 70, 0);
      B.ground(240);
      B.hidden(70, GY - 60, 110, 0);
      B.bee(200, GY - 170, 35, 0);
      B.hidden(240, GY - 120, 110, 0);
      B.hidden(410, GY - 60, 110, 0);
      B.bee(540, GY - 150, 40, 1.8);
      B.hidden(580, GY - 100, 110, 0);
      B.gap(770);
      // 7. segunda conta bônus + bichinhos rápidos
      B.enemy(200, 110, 80);
      B.bonus(330);
      B.heart(620);
      B.ground(760);
      // 8. corredor das pedras esmagadoras (passe no ritmo certo)
      B.sign(60, 'Passe quando a pedra subir!');
      B.crusher(240, 72, 0); B.crusher(440, 72, 1.25); B.crusher(640, 72, 2.5);
      B.coins(260, GY - 36, 2); B.coins(460, GY - 36, 2); B.coins(660, GY - 36, 2);
      B.check(820);
      B.ground(900);
      // 9. abismo com plataformas que andam e bola de espinho girando no meio
      B.hmove(70, GY - 40, 120, 90, 1.3, 0);
      B.spinner(345, GY - 205, 80, 1.3, 0);
      B.hmove(470, GY - 70, 120, 90, 1.3, 1.6);
      B.coins(130, GY - 76, 2); B.coins(530, GY - 106, 2);
      B.star(345, GY - 205);
      B.gap(760);
      // 10. reta final com abelhas e espinhos
      B.bee(240, GY - 60, 60, 0); B.bee(470, GY - 60, 60, 1.6);
      B.spikes(350, 1);
      B.coins(100, GY - 36, 3); B.coins(560, GY - 36, 4);
      B.flag(900);
      B.ground(1300);
    },
  },
  // ======================= MUNDO 2: PRAIA =======================
  '2-1': {
    name:'Mergulho na baía', theme:1, ph:2,
    goal:'Pegue a máscara 🤿 e mergulhe! No mar, toque PULAR para nadar para cima.',
    build(B){
      // 1. praia com caranguejo
      B.sign(330, 'Pegue a máscara 🤿 no píer!');
      B.coins(430, GY - 36, 4);
      B.enemy(620, 130, 50);
      B.ground(780);
      // 2. pontes que caem por cima da água
      B.plat(80, GY - 14, 96, {falls:true, baseY:GY - 14, st:'idle', tm:0, vy:0});
      B.plat(230, GY - 46, 96, {falls:true, baseY:GY - 46, st:'idle', tm:0, vy:0});
      B.plat(380, GY - 14, 96, {falls:true, baseY:GY - 14, st:'idle', tm:0, vy:0});
      B.coins(110, GY - 50, 1); B.coins(260, GY - 82, 1); B.coins(410, GY - 50, 1);
      B.gap(530);
      // 3. píer com a máscara de mergulho
      B.check(60);
      B.sign(150, 'Pule na água e toque PULAR para nadar!');
      B.mask(300, GY - 34);
      B.ground(420);
      // 4. primeiro mergulho
      for(let k = 0; k < 6; k++) B.coin(70 + k * 45, GY + 60 + k * 32);
      B.fish(330, GY + 200, 120, 60);
      B.jelly(560, GY + 260, 80);
      B.roof(700, 150, GY + 180);                // rocha: passe por baixo
      B.coins(720, GY + 270, 3, 40);
      B.heart(860, GY + 420);
      B.check(900, GY + 480);
      B.rock(1010, 110, GY + 310);               // pedra alta no fundo: passe por cima
      B.fish(1065, GY + 240, 70, 70, '#A855F7');
      B.star(1180, GY + 445);                    // estrela escondida perto do fundo
      for(let k = 0; k < 6; k++) B.coin(1260 + k * 40, GY + 300 - k * 45);
      B.sea(1500, 480);
      // 5. praia do meio: conta bônus e caranguejo rápido
      B.bonus(120);
      B.enemy(560, 140, 75);
      B.ground(720);
      // 6. plataforma que anda por cima do mar
      B.hmove(60, GY - 30, 120, 110, 1.2, 0);
      B.coins(90, GY - 66, 3);
      B.gap(400);
      B.check(40);
      B.spring(150);
      B.star(283, GY - 330);
      B.ground(520);
      // 7. segundo mergulho, mais fundo: caverna do tesouro
      for(let k = 0; k < 5; k++) B.coin(60 + k * 45, GY + 70 + k * 40);
      B.jelly(260, GY + 220, 90);
      B.jelly(420, GY + 330, 90);
      B.fish(620, GY + 170, 150, 80);
      B.roof(800, 300, GY + 320);                // caverna baixa
      B.fish(950, GY + 470, 110, 70, '#22C55E');
      B.page(1040, GY + 560);                    // a página no fundo da caverna
      B.check(1150, GY + 600);
      B.rock(1250, 100, GY + 400);
      B.fish(1380, GY + 330, 100, 90);
      B.star(1300, GY + 360);
      for(let k = 0; k < 6; k++) B.coin(1480 + k * 36, GY + 420 - k * 60);
      B.sea(1720, 600);
      // 8. chegada na praia
      B.coins(80, GY - 36, 3);
      B.enemy(300, 120, 70);
      B.spikes(460, 2);
      B.arc(400, 560, GY - 50, 90, 5);
      B.flag(820);
      B.ground(1200);
    },
  },
  '2-2': {
    name:'Recife perigoso', theme:1, ph:2,
    goal:'Atravesse o recife cheio de peixes e águas-vivas. A página está num túnel no fundo!',
    build(B){
      // 1. praia: bola de espinho e caranguejos
      B.sign(330, 'O recife é perigoso. Nade com cuidado!');
      B.mask(470, GY - 34);
      B.spinner(700, GY - 120, 80, 1.8, 0);
      B.enemy(920, 120, 70);
      B.ground(1080);
      // 2. labirinto do recife
      for(let k = 0; k < 5; k++) B.coin(60 + k * 40, GY + 60 + k * 36);
      B.roof(300, 170, GY + 220);
      B.fish(380, GY + 300, 110, 75);
      B.rock(560, 120, GY + 330);
      B.jelly(700, GY + 250, 100);
      B.roof(820, 200, GY + 270);
      B.fish(920, GY + 420, 120, 85, '#EAB308');
      B.check(1100, GY + 560);
      B.star(1180, GY + 300);
      B.jelly(1300, GY + 200, 110);
      B.jelly(1420, GY + 330, 110);
      B.heart(1520, GY + 500);
      for(let k = 0; k < 6; k++) B.coin(1640 + k * 36, GY + 380 - k * 55);
      B.sea(1860, 560);
      // 3. ilha: plataformas que andam e conta bônus
      B.bonus(80);
      B.ground(520);
      B.hmove(60, GY - 40, 110, 100, 1.4, 0);
      B.hmove(390, GY - 80, 110, 100, 1.4, 1.5);
      B.coins(110, GY - 76, 2); B.coins(440, GY - 116, 2);
      B.gap(700);
      B.check(40);
      B.enemy(300, 130, 80);
      B.ground(560);
      // 4. túnel no fundo do mar
      for(let k = 0; k < 6; k++) B.coin(60 + k * 40, GY + 60 + k * 50);
      B.jelly(240, GY + 200, 70);
      B.roof(380, 1000, GY + 400);               // túnel comprido e baixo
      B.fish(560, GY + 520, 130, 90);
      B.fish(860, GY + 560, 130, 100, '#EF4444');
      B.fish(1160, GY + 510, 130, 90);
      B.page(1300, GY + 600);
      B.star(800, GY + 470);
      B.check(1420, GY + 640);
      for(let k = 0; k < 6; k++) B.coin(1440 + k * 36, GY + 520 - k * 70);
      B.sea(1700, 640);
      // 5. chegada: pedras esmagadoras na praia
      B.crusher(220, 72, 0); B.crusher(420, 72, 1.3);
      B.coins(240, GY - 36, 2); B.coins(440, GY - 36, 2);
      B.star(620, GY - 200);
      B.spring(560);
      B.flag(900);
      B.ground(1300);
    },
  },
};
