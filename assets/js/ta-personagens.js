// ============================================================
// Tabuada Aventura: desenho dos personagens (arte própria do site)
//  Capivara (com uma tangerina na cabeça), Tatu-bola e Robozinho.
//  Desenhados no canvas com contorno, sombra e brilho, olhando para a
//  direita, com a origem no meio dos pés.
//
//  pose = {
//    t: tempo da animação (s), state: 'idle' | 'run' | 'jump' | 'fall' | 'hurt' | 'win',
//    spin: 0..1 durante o pulo duplo (giro), happy: olhinhos felizes,
//    jet: fogo do pulo duplo (robô)
//  }
// ============================================================

function rr(c, x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function vgrad(c, y0, y1, a, b){ const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function fs(c, fill){ c.fillStyle = fill; c.fill(); c.stroke(); }
function dot(c, x, y, r, color){ c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }

// olho de desenho animado (com brilho); muda com a expressão
function eye(c, x, y, r, P, outline){
  const blink = P.state !== 'hurt' && !P.happy && (P.t % 3.2) > 3.05;
  if(P.state === 'hurt'){
    c.save(); c.strokeStyle = outline; c.lineWidth = 2.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - r * .7, y - r * .7); c.lineTo(x + r * .7, y + r * .7);
    c.moveTo(x + r * .7, y - r * .7); c.lineTo(x - r * .7, y + r * .7); c.stroke(); c.restore();
    return;
  }
  if(P.happy || P.state === 'win' || blink){
    c.save(); c.strokeStyle = outline; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath();
    if(blink && !P.happy && P.state !== 'win'){ c.moveTo(x - r * .8, y); c.lineTo(x + r * .8, y); }
    else c.arc(x, y + r * .35, r * .75, Math.PI * 1.1, Math.PI * 1.9);
    c.stroke(); c.restore();
    return;
  }
  c.fillStyle = '#fff';
  c.beginPath(); c.ellipse(x, y, r * .85, r, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  const look = P.state === 'jump' ? -r * .25 : P.state === 'fall' ? r * .2 : 0;
  dot(c, x + r * .25, y + look, r * .55, '#1B1209');
  dot(c, x + r * .45, y + look - r * .3, r * .22, '#fff');
  dot(c, x + r * .05, y + look + r * .25, r * .1, '#fff');
}

// ---------------- CORES (loja) ----------------
// Uma cor muda o pelo/casco/metal do personagem mantendo as luzes e sombras:
// cada cor do desenho original vira a mesma claridade no tom novo.
// (olhos, bochechas, tangerina, visor e coração continuam iguais)
const COLOR_VARIANTS = {
  corRosa:   {h:330, s:72, lm:1.05, la:4},
  corAzul:   {h:205, s:70, lm:1, la:2},
  corVerde:  {h:120, s:45, lm:1, la:0},
  corRoxo:   {h:270, s:55, lm:1, la:2},
  corDourado:{h:44,  s:88, lm:1, la:6},
  corNeve:   {h:210, s:14, lm:.45, la:52},
  corNoite:  {h:235, s:28, lm:.6, la:-2},
  corFogo:   {h:12,  s:85, lm:1, la:2},
};
let TINT = null;
const tintCache = {};
function hexToHsl(hex){
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if(mx === mn) return [0, 0, l * 100];
  const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}
function T(hex){
  if(!TINT) return hex;
  const k = TINT.id + hex;
  if(tintCache[k]) return tintCache[k];
  const [, , l] = hexToHsl(hex);
  const nl = Math.max(4, Math.min(96, l * TINT.lm + TINT.la));
  return (tintCache[k] = `hsl(${TINT.h}, ${TINT.s}%, ${nl.toFixed(1)}%)`);
}
Object.entries(COLOR_VARIANTS).forEach(([id, v]) => v.id = id);

// ---------------- CAPIVARA ----------------
const CAPI = {out:'#4A2A12', fur1:'#CF9861', fur2:'#9C6434', dark:'#83532A', belly:'#E3B886', snout:'#8A5428'};

function capiLeg(c, x, y, ang, near){
  c.save();
  c.translate(x, y); c.rotate(ang);
  // perninha gordinha com pezinho redondo
  c.beginPath(); c.ellipse(0, 5, 5.2, 8, 0, 0, Math.PI * 2);
  fs(c, near ? T(CAPI.fur2) : T('#7A4B23'));
  c.beginPath(); c.ellipse(1, 12.2, 5.6, 3.3, 0, 0, Math.PI * 2);
  fs(c, near ? T('#5E3817') : T('#4E2E12'));
  c.restore();
}

// desenha várias formas com um contorno só (como se fossem uma peça)
function blob(c, path, fill, lw){
  c.save(); c.lineWidth = (lw || c.lineWidth) * 2; path(); c.stroke(); c.restore();
  path(); c.fillStyle = fill; c.fill();
}

function drawCapivara(c, P){
  const run = P.state === 'run', air = P.state === 'jump' || P.state === 'fall';
  const ph = P.t * 15;
  const s1 = Math.sin(ph);
  const bob = run ? -Math.abs(Math.sin(ph)) * 3 : P.state === 'idle' || P.state === 'win' ? Math.sin(P.t * 3) * 1 : 0;
  c.strokeStyle = T(CAPI.out); c.lineWidth = 2.2; c.lineJoin = 'round'; c.lineCap = 'round';

  // pernas de trás (lado de lá)
  const a = run ? s1 * .75 : air ? (P.state === 'jump' ? -.7 : .5) : 0;
  capiLeg(c, -15, -14 + bob, run ? -a : a, false);
  capiLeg(c, 13, -14 + bob, run ? a : -a * .6, false);

  accBack(c, P, 'behind', 13, -37 + bob, 1, -12, -40 + bob); // capa (atrás do corpo)
  // corpo fofinho (formato de feijão)
  c.save(); c.translate(0, bob);
  c.beginPath();
  c.moveTo(-27, -23);
  c.bezierCurveTo(-29, -44, 4, -48, 17, -41);
  c.bezierCurveTo(28, -35, 28, -15, 15, -10);
  c.bezierCurveTo(4, -6, -13, -6, -21, -10);
  c.bezierCurveTo(-26, -13, -27, -18, -27, -23);
  c.closePath();
  fs(c, vgrad(c, -46, -8, T(CAPI.fur1), T(CAPI.fur2)));
  c.save(); c.clip();
  // barriga clarinha
  c.fillStyle = T(CAPI.belly); c.globalAlpha = .6;
  c.beginPath(); c.ellipse(-2, -8, 22, 9, 0, 0, Math.PI * 2); c.fill();
  // brilho do pelo nas costas
  c.globalAlpha = .35; c.fillStyle = '#FFFFFF';
  c.beginPath(); c.ellipse(-8, -39, 13, 4, -.12, 0, Math.PI * 2); c.fill();
  // pelinhos
  c.globalAlpha = .7;
  c.strokeStyle = T(CAPI.dark); c.lineWidth = 1.3;
  [[-17, -30], [-9, -33], [-13, -24]].forEach(([fx, fy])=>{
    c.beginPath(); c.moveTo(fx, fy); c.quadraticCurveTo(fx + 2.5, fy - 2, fx + 5, fy); c.stroke();
  });
  c.restore();
  c.restore();

  accBack(c, P, 'front', 13, -37 + bob, 1, -12, -40 + bob);  // cachecol / mochila
  // pernas da frente (lado de cá)
  capiLeg(c, -10, -13 + bob, run ? a : a * .8, true);
  capiLeg(c, 17, -13 + bob, run ? -a : -a * .5, true);

  // cabeça grandona e redondinha
  const hb = run ? Math.sin(ph + .8) * 1.2 : 0;
  c.save();
  c.translate(19, -36 + bob + hb);
  c.rotate(P.state === 'jump' ? -.12 : P.state === 'fall' ? .1 : 0);
  // orelhinhas redondas
  [[-8, -14, -.5, true], [1, -16, .1, false]].forEach(([ex, ey, ea, far])=>{
    c.beginPath(); c.ellipse(ex, ey, 4.6, 5, ea, 0, Math.PI * 2); fs(c, far ? T(CAPI.dark) : T(CAPI.fur2));
    dot(c, ex + .4, ey + .6, 2.3, T('#E8A39A'));
  });
  // cabeça + focinho com um contorno só
  blob(c, ()=>{
    c.beginPath(); c.arc(4, -2, 14.5, 0, Math.PI * 2);
    c.moveTo(29.5, 2.5); c.ellipse(19, 2.5, 10.5, 9.5, 0, 0, Math.PI * 2);
  }, vgrad(c, -17, 12, T(CAPI.fur1), T('#A86D3A')));
  // focinho um pouco mais escuro
  c.save(); c.globalAlpha = .55;
  c.beginPath(); c.ellipse(20.5, 3.5, 8.6, 7.6, 0, 0, Math.PI * 2);
  c.fillStyle = vgrad(c, -4, 11, T('#B7814A'), T(CAPI.snout)); c.fill();
  c.restore();
  // brilho na testa
  c.fillStyle = 'rgba(255,255,255,.3)';
  c.beginPath(); c.ellipse(-1, -11, 7, 3.2, -.3, 0, Math.PI * 2); c.fill();
  // narizinho
  c.fillStyle = '#2B1709';
  c.beginPath(); c.ellipse(26.5, -.5, 2.8, 2.1, .2, 0, Math.PI * 2); c.fill();
  dot(c, 25.6, -1.3, .8, 'rgba(255,255,255,.7)');
  // boquinha sorrindo
  c.beginPath();
  if(P.state === 'hurt'){ c.moveTo(20, 7.5); c.quadraticCurveTo(22.5, 5, 25, 7.5); }
  else { const h = P.happy || P.state === 'win' ? 2.4 : 1.2; c.moveTo(19.5, 6); c.quadraticCurveTo(22.5, 6 + h * 2, 25.5, 6); }
  c.stroke();
  // olhão e bochecha
  eye(c, 8, -3, 5.6, P, T(CAPI.out));
  c.fillStyle = 'rgba(244,114,182,.5)';
  c.beginPath(); c.ellipse(11.5, 6.5, 4.2, 2.6, 0, 0, Math.PI * 2); c.fill();
  // tangerina na cabeça (balança atrasadinha) — sai quando ela usa chapéu
  const lag = run ? Math.sin(ph - 1) * 1.6 : air ? (P.state === 'jump' ? 2 : -2) : 0;
  if(!P.eq.head){
  c.save();
  c.translate(3, -19 + lag);
  c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2);
  const og = c.createRadialGradient(-2, -3, 1, 0, 0, 8); og.addColorStop(0, '#FDBA74'); og.addColorStop(1, '#EA580C');
  fs(c, og);
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-2.5, -3, 2, 1.2, -.6, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(4, -7, 4, 2, -.5, 0, Math.PI * 2); fs(c, '#22C55E');
  c.restore();
  }
  accEyes(c, P, 8, -3, 1.08, false);
  accHead(c, P, 4, -15 + lag * .4, 1.08);
  c.restore();
}

// ---------------- TATU-BOLA ----------------
const TATU = {out:'#3F2A16', shell1:'#C8A27A', shell2:'#8B6745', band:'#6B4E33', skin:'#E8C9A0', skin2:'#C9A57B'};

function tatuShellBall(c, P){
  c.save();
  c.translate(0, -19);
  c.rotate(P.t * 13);
  c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2);
  const g = c.createRadialGradient(-6, -7, 2, 0, 0, 19); g.addColorStop(0, T('#DDBB92')); g.addColorStop(1, T(TATU.shell2));
  fs(c, g);
  c.save(); c.clip();
  c.strokeStyle = T(TATU.band); c.lineWidth = 2;
  for(let k = -3; k <= 3; k++){
    c.beginPath(); c.ellipse(k * 6, 0, 3.5, 19, 0, 0, Math.PI * 2); c.stroke();
  }
  c.fillStyle = 'rgba(255,255,255,.25)';
  c.beginPath(); c.ellipse(-6, -8, 7, 4, -.6, 0, Math.PI * 2); c.fill();
  c.restore();
  // pontinha das orelhas e do rabo aparecendo
  c.beginPath(); c.ellipse(15, -10, 3, 6, .9, 0, Math.PI * 2); fs(c, T(TATU.skin2));
  c.restore();
}

function drawTatu(c, P){
  c.strokeStyle = T(TATU.out); c.lineWidth = 2.1; c.lineJoin = 'round'; c.lineCap = 'round';
  if(P.state === 'jump' || P.state === 'fall'){ tatuShellBall(c, P); return; }
  const run = P.state === 'run';
  const ph = P.t * 20, s1 = Math.sin(ph);
  const bob = run ? -Math.abs(s1) * 2 : Math.sin(P.t * 3) * .6;
  const legs = (near)=>{
    [[-13, near ? s1 : -s1], [11, near ? -s1 : s1]].forEach(([lx, s])=>{
      c.save(); c.translate(lx + (near ? 3 : -2), -9 + bob); c.rotate(run ? s * .7 : 0);
      rr(c, -3.5, -1, 7, 10, 3.5); fs(c, near ? T(TATU.skin2) : T('#A8845C'));
      c.strokeStyle = '#2B1D10'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(1, 9); c.lineTo(4, 10.5); c.moveTo(-1, 9.4); c.lineTo(1.5, 11); c.stroke();
      c.strokeStyle = T(TATU.out); c.lineWidth = 2.1;
      c.restore();
    });
  };
  legs(false);
  c.save(); c.translate(0, bob);
  accBack(c, P, 'behind', 16, -24, .85, -2, -37);
  // rabo com aneizinhos
  c.save(); c.translate(-22, -15); c.rotate(run ? Math.sin(ph * .5) * .15 + .25 : .25);
  c.beginPath(); c.moveTo(0, -4); c.lineTo(-16, 0); c.lineTo(0, 4); c.closePath(); fs(c, T(TATU.shell2));
  c.strokeStyle = T(TATU.band); c.lineWidth = 1.4;
  [-5, -10].forEach(tx => { c.beginPath(); c.moveTo(tx, -3 + Math.abs(tx) * .2); c.lineTo(tx, 3 - Math.abs(tx) * .2); c.stroke(); });
  c.restore();
  c.strokeStyle = T(TATU.out); c.lineWidth = 2.1;
  // casco
  c.beginPath();
  c.moveTo(-25, -10);
  c.bezierCurveTo(-28, -44, 22, -46, 24, -10);
  c.closePath();
  fs(c, vgrad(c, -43, -10, T(TATU.shell1), T(TATU.shell2)));
  c.save(); c.clip();
  // faixas do meio (o que dá o nome de tatu-bola)
  c.strokeStyle = T(TATU.band); c.lineWidth = 2;
  [-9, -3, 3, 9].forEach(bx=>{ c.beginPath(); c.moveTo(bx - 1, -40); c.quadraticCurveTo(bx + 1.5, -24, bx, -8); c.stroke(); });
  // escaminhas
  c.fillStyle = 'rgba(80,55,30,.35)';
  for(let ry = -32; ry < -12; ry += 7) for(let rx = -22; rx < 22; rx += 7){
    if(Math.abs(rx) < 12) continue;
    rr(c, rx, ry + (rx % 2 ? 2 : 0), 4.5, 4, 1.5); c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,.28)';
  c.beginPath(); c.ellipse(-8, -32, 10, 4, -.25, 0, Math.PI * 2); c.fill();
  c.restore();
  // barra do casco
  c.beginPath(); c.moveTo(-25, -10); c.lineTo(24, -10); c.lineTo(23, -7); c.lineTo(-24, -7); c.closePath(); fs(c, T(TATU.band));
  accBack(c, P, 'front', 17, -18, .85, -2, -37);
  // cabeça
  c.save(); c.translate(19, -20); c.rotate(run ? Math.sin(ph + 1) * .05 : 0);
  // orelhas em pé (redondinhas na ponta)
  [[-1, -9, -.45, true], [3, -10, -.1, false]].forEach(([ex, ey, ea, far])=>{
    c.beginPath(); c.ellipse(ex, ey, 3.8, 7.5, ea, 0, Math.PI * 2); fs(c, far ? T('#A8845C') : T(TATU.skin2));
    c.fillStyle = T('#E9A08A'); c.beginPath(); c.ellipse(ex + .3, ey, 1.7, 4.6, ea, 0, Math.PI * 2); c.fill();
  });
  // cabeça redonda + focinho, com um contorno só
  blob(c, ()=>{
    c.beginPath(); c.arc(5, 0, 9.5, 0, Math.PI * 2);
    c.moveTo(22, 2.5); c.ellipse(14.5, 2.5, 7.5, 5.2, .08, 0, Math.PI * 2);
  }, vgrad(c, -10, 9, T(TATU.skin), T(TATU.skin2)));
  c.fillStyle = 'rgba(255,255,255,.35)';
  c.beginPath(); c.ellipse(2, -6, 4.5, 2.2, -.3, 0, Math.PI * 2); c.fill();
  // narizinho
  c.beginPath(); c.ellipse(21.3, 2, 2.2, 1.9, 0, 0, Math.PI * 2); c.fillStyle = '#5B3A29'; c.fill();
  dot(c, 20.7, 1.3, .7, 'rgba(255,255,255,.7)');
  // sorrisinho
  c.lineWidth = 1.6; c.beginPath(); c.moveTo(14, 5.5); c.quadraticCurveTo(16.5, 7.8 + (P.happy || P.state === 'win' ? 1.5 : 0), 19, 5.5); c.stroke(); c.lineWidth = 2.1;
  eye(c, 7, -1, 4.6, P, T(TATU.out));
  c.fillStyle = 'rgba(244,114,182,.5)';
  c.beginPath(); c.ellipse(10, 5, 3.2, 2, 0, 0, Math.PI * 2); c.fill();
  accEyes(c, P, 7, -1, .9, false);
  accHead(c, P, 5, -8.5, .85);
  c.restore();
  c.restore();
  legs(true);
}

// ---------------- ROBOZINHO ----------------
const ROBO = {out:'#273449', metal1:'#F1F5F9', metal2:'#94A3B8', dark:'#475569', glow:'#22D3EE', accent:'#F59E0B'};

function drawRobo(c, P){
  const run = P.state === 'run', air = P.state === 'jump' || P.state === 'fall';
  const ph = P.t * 16, s1 = Math.sin(ph);
  const bob = run ? -Math.abs(s1) * 2.2 : Math.sin(P.t * 3) * 1;
  c.strokeStyle = T(ROBO.out); c.lineWidth = 2.1; c.lineJoin = 'round'; c.lineCap = 'round';

  // fogo do jato (pulo duplo)
  if(P.jet){
    const f = 10 + Math.random() * 8;
    [-6, 6].forEach(fx=>{
      const g = c.createLinearGradient(0, 0, 0, f);
      g.addColorStop(0, '#FDE047'); g.addColorStop(.5, '#FB923C'); g.addColorStop(1, 'rgba(239,68,68,0)');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(fx - 4, 0); c.quadraticCurveTo(fx, f * 1.6, fx + 4, 0); c.closePath(); c.fill();
    });
  }
  // pernas
  const la = run ? s1 * .6 : air ? .35 : 0;
  [[-6, la, false], [6, -la, true]].forEach(([lx, ang, near])=>{
    c.save(); c.translate(lx, -14 + bob); c.rotate(ang);
    rr(c, -3.5, 0, 7, 11, 3); fs(c, near ? T('#64748B') : T('#475569'));
    rr(c, -5, 9, 11, 6, 3); fs(c, near ? T('#334155') : '#1E293B');
    c.restore();
  });
  c.save(); c.translate(0, bob);
  accBack(c, P, 'behind', 0, -35, 1, -14, -27);
  // braço de lá
  const aa = run ? -s1 * .8 : air ? -2.2 : P.state === 'win' ? -2.6 : .1;
  const arm = (x, ang, near)=>{
    c.save(); c.translate(x, -30); c.rotate(ang);
    rr(c, -3, 0, 6, 13, 3); fs(c, near ? T('#94A3B8') : T('#64748B'));
    c.beginPath(); c.arc(0, 14, 4, 0, Math.PI * 2); fs(c, near ? T('#CBD5E1') : T('#94A3B8'));
    c.restore();
  };
  arm(-10, -aa, false);
  // corpo
  rr(c, -14, -36, 28, 24, 12);
  fs(c, vgrad(c, -36, -12, T('#E2E8F0'), T(ROBO.metal2)));
  rr(c, -8, -31, 16, 12, 6); fs(c, '#1E293B');
  // coração-luz no peito
  c.save(); c.shadowColor = '#F87171'; c.shadowBlur = 6;
  c.fillStyle = (P.t % 1) < .5 ? '#F87171' : '#FCA5A5';
  c.beginPath(); c.moveTo(0, -21); c.bezierCurveTo(-6, -25, -3, -30, 0, -27); c.bezierCurveTo(3, -30, 6, -25, 0, -21); c.fill();
  c.restore();
  accBack(c, P, 'front', 0, -35, 1, -14, -27);
  // cabeça
  c.save(); c.translate(1, -38 + (run ? Math.sin(ph + 1) : 0));
  c.rotate(P.state === 'jump' ? -.08 : 0);
  // antena
  c.beginPath(); c.moveTo(0, -24); c.lineTo(0, -32); c.stroke();
  c.save(); c.shadowColor = '#EF4444'; c.shadowBlur = (P.t % 1.2) < .6 ? 10 : 2;
  c.beginPath(); c.arc(0, -34, 4, 0, Math.PI * 2); fs(c, '#EF4444'); c.restore();
  rr(c, -18, -27, 36, 29, 14);
  fs(c, vgrad(c, -27, 2, T(ROBO.metal1), T('#A3B1C4')));
  // parafusos das orelhas
  c.beginPath(); c.arc(-17, -12, 4, 0, Math.PI * 2); fs(c, ROBO.accent);
  // visor
  rr(c, -12, -21, 28, 17, 8); fs(c, '#0F172A');
  // bochechas rosadas no visor
  c.fillStyle = 'rgba(244,114,182,.55)';
  c.beginPath(); c.ellipse(-7, -7.5, 3, 1.6, 0, 0, Math.PI * 2); c.ellipse(12.5, -7.5, 3, 1.6, 0, 0, Math.PI * 2); c.fill();
  c.save();
  c.shadowColor = ROBO.glow; c.shadowBlur = 8;
  c.strokeStyle = ROBO.glow; c.fillStyle = ROBO.glow; c.lineWidth = 2.4;
  const blink = (P.t % 3.4) > 3.25;
  if(P.state === 'hurt'){
    [-3, 8].forEach(ex=>{ c.beginPath(); c.moveTo(ex - 2.5, -15); c.lineTo(ex + 2.5, -10); c.moveTo(ex + 2.5, -15); c.lineTo(ex - 2.5, -10); c.stroke(); });
  } else if(P.happy || P.state === 'win'){
    [-3, 8].forEach(ex=>{ c.beginPath(); c.arc(ex, -11, 3, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); });
  } else if(blink){
    [-3, 8].forEach(ex=>{ c.fillRect(ex - 3, -13, 6, 1.6); });
  } else {
    [-3, 8].forEach(ex=>{ rr(c, ex - 3, -18, 6, 9, 3); c.fill(); });
    c.shadowBlur = 0; c.fillStyle = '#FFFFFF';
    [-3, 8].forEach(ex=>{ c.beginPath(); c.arc(ex + 1, -16, 1.1, 0, Math.PI * 2); c.fill(); });
  }
  c.restore();
  c.fillStyle = 'rgba(255,255,255,.55)';
  rr(c, -13, -23, 12, 4, 2); c.fill();
  accEyes(c, P, 2.5, -12.5, 1, true);
  accHead(c, P, 0, -24, 1.15);
  c.restore();
  // braço de cá
  arm(10, aa, true);
  c.restore();
}

const CHAR_DRAW = {capivara: drawCapivara, tatu: drawTatu, robo: drawRobo};

// desenha o personagem em (x, y) = pés. Aceita squash (achatar/esticar) e giro.
function drawChar(c, id, x, y, P, scale, squash){
  c.save();
  c.translate(x, y);
  if(scale) c.scale(scale, scale);
  if(squash) c.scale(squash[0], squash[1]);
  if(P.spin > 0 && P.spin < 1 && id !== 'tatu'){ // cambalhota no pulo duplo
    c.translate(0, -24); c.rotate(P.spin * Math.PI * 2); c.translate(0, 24);
  }
  P.eq = P.eq || equipOf(id);
  P.cid = id;
  const prevTint = TINT;
  TINT = COLOR_VARIANTS[P.eq.color] || null; // cor comprada na loja
  (CHAR_DRAW[id] || drawCapivara)(c, P);
  TINT = prevTint;
  c.restore();
}

// retrato do personagem num canvas pequeno (botões e trilha)
function portrait(canvas, id, t, state){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if(!canvas._w){ canvas._w = canvas.width; canvas._h = canvas.height; canvas.width = canvas._w * dpr; canvas.height = canvas._h * dpr; canvas._dpr = dpr; }
  const w = canvas._w, h = canvas._h;
  const c = canvas.getContext('2d');
  c.setTransform(canvas._dpr, 0, 0, canvas._dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  const s = Math.min(w / 78, h / 84);
  const center = {capivara:10, tatu:1, robo:0}[id] || 0; // meio de cada desenho
  drawChar(c, id, w / 2 - center * s, h - 8 * s, {t:t || 0, state:state || 'idle'}, s);
}

// ============================================================
// Acessórios da loja (chapéus, óculos, costas e efeitos)
// Cada um é desenhado no "ponto de encaixe" do personagem
// (topo da cabeça, olho, pescoço/costas), olhando para a direita.
// ============================================================
const OUT = '#2B2116';

const ACC_HEAD = {
  flor(c){
    c.save(); c.translate(-6, -1); c.rotate(-.3);
    c.fillStyle = '#F472B6'; c.strokeStyle = '#9D174D'; c.lineWidth = 1.4;
    for(let k = 0; k < 5; k++){ const a = k / 5 * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * 4.4, -5 + Math.sin(a) * 4.4, 3.6, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.beginPath(); c.arc(0, -5, 3, 0, Math.PI * 2); c.fillStyle = '#FACC15'; c.fill(); c.stroke();
    c.restore();
  },
  bone(c){
    c.strokeStyle = OUT; c.lineWidth = 2;
    c.beginPath(); c.ellipse(15, -1, 11, 3, 0, 0, Math.PI * 2); fs(c, '#B91C1C');
    c.beginPath(); c.moveTo(-11, 0); c.bezierCurveTo(-12, -16, 12, -16, 11, 0); c.closePath(); fs(c, vgrad(c, -13, 0, '#F87171', '#DC2626'));
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -6, 4.2, 3.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#DC2626'; c.font = '700 6px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('F', 0, -6);
    dot(c, 0, -12.5, 1.8, '#7F1D1D');
  },
  festa(c){
    c.save(); c.rotate(-.18);
    c.strokeStyle = OUT; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-9, 0); c.lineTo(1, -26); c.lineTo(10, 0); c.closePath();
    fs(c, vgrad(c, -26, 0, '#A78BFA', '#7C3AED'));
    c.save(); c.clip();
    c.fillStyle = '#FDE047';
    for(let k = 0; k < 4; k++){ c.beginPath(); c.arc(-3 + (k % 2) * 6, -4 - k * 6, 2, 0, Math.PI * 2); c.fill(); }
    c.restore();
    c.beginPath(); c.arc(1, -27, 4, 0, Math.PI * 2); fs(c, '#F472B6');
    c.restore();
  },
  pirata(c){
    c.strokeStyle = OUT; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-19, 0); c.quadraticCurveTo(-14, -6, -11, -13); c.quadraticCurveTo(0, -22, 11, -13);
    c.quadraticCurveTo(14, -6, 19, 0); c.quadraticCurveTo(0, -5, -19, 0); c.closePath();
    fs(c, vgrad(c, -20, 0, '#374151', '#111827'));
    c.strokeStyle = '#FACC15'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-16, -2); c.quadraticCurveTo(0, -7, 16, -2); c.stroke();
    dot(c, 0, -11, 3.6, '#fff'); dot(c, -1.3, -11.5, .9, '#111'); dot(c, 1.3, -11.5, .9, '#111');
    c.strokeStyle = '#fff'; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(-4, -6); c.lineTo(4, -8.5); c.moveTo(4, -6); c.lineTo(-4, -8.5); c.stroke();
  },
  mago(c){
    c.save(); c.rotate(-.12);
    c.strokeStyle = OUT; c.lineWidth = 2;
    c.beginPath(); c.ellipse(0, -1, 17, 4, 0, 0, Math.PI * 2); fs(c, '#1E3A8A');
    c.beginPath(); c.moveTo(-10, -2); c.quadraticCurveTo(-4, -18, 6, -30); c.quadraticCurveTo(5, -16, 10, -2); c.closePath();
    fs(c, vgrad(c, -30, 0, '#3B82F6', '#1E40AF'));
    c.fillStyle = '#FDE047';
    starPathP(c, -1, -12, 4, 1.8); c.fill();
    dot(c, 4, -21, 1.2, '#FDE047'); dot(c, -5, -5, 1, '#FDE047');
    c.restore();
  },
  coroa(c){
    c.save(); c.shadowColor = '#FDE047'; c.shadowBlur = 8;
    c.strokeStyle = '#92400E'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-11, 0); c.lineTo(-12, -14); c.lineTo(-6, -8); c.lineTo(0, -18); c.lineTo(6, -8); c.lineTo(12, -14); c.lineTo(11, 0); c.closePath();
    fs(c, vgrad(c, -18, 0, '#FEF08A', '#F59E0B'));
    c.restore();
    c.fillStyle = '#B45309'; c.fillRect(-11, -4, 22, 3);
    dot(c, 0, -7, 2.4, '#EF4444'); dot(c, -7, -6, 1.8, '#3B82F6'); dot(c, 7, -6, 1.8, '#22C55E');
    [-12, 0, 12].forEach((x, i) => dot(c, x, i === 1 ? -18 : -14, 2, '#FEF9C3'));
  },
};

// óculos: de lado (capivara, tatu) ou de frente (robô)
const ACC_EYES = {
  redondos(c, front){
    c.strokeStyle = '#7C2D12'; c.lineWidth = 2;
    const lens = x => { c.beginPath(); c.arc(x, 0, 5, 0, Math.PI * 2); c.fillStyle = 'rgba(219,234,254,.35)'; c.fill(); c.stroke(); };
    if(front){ lens(-5.5); lens(5.5); }
    else { lens(0); c.beginPath(); c.moveTo(-5, -1); c.lineTo(-13, -3); c.stroke(); }
  },
  escuros(c, front){
    c.strokeStyle = '#000'; c.lineWidth = 1.6;
    const lens = x => {
      rr(c, x - 6, -4, 12, 8, 3); c.fillStyle = '#111827'; c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x - 4, -2.5, 3, 1.4);
    };
    if(front){ lens(-6); lens(6); }
    else { lens(0); c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -2); c.lineTo(-13, -3); c.stroke(); }
  },
  coracao(c, front){
    const heart = x => {
      c.save(); c.translate(x, 0);
      c.beginPath(); c.moveTo(0, 5); c.bezierCurveTo(-9, -1, -5, -8, 0, -3); c.bezierCurveTo(5, -8, 9, -1, 0, 5); c.closePath();
      c.fillStyle = 'rgba(244,63,94,.85)'; c.fill(); c.strokeStyle = '#9F1239'; c.lineWidth = 1.6; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(-2.5, -2.5, 1.2, 0, Math.PI * 2); c.fill();
      c.restore();
    };
    if(front){ heart(-5.5); heart(5.5); }
    else { heart(0); c.strokeStyle = '#9F1239'; c.lineWidth = 2; c.beginPath(); c.moveTo(-5, -1); c.lineTo(-13, -3); c.stroke(); }
  },
};

// costas / pescoço. layer 'behind' = atrás do corpo; 'front' = na frente
const ACC_BACK = {
  cachecol:{layer:'front', draw(c, P){
    const fl = P.state === 'run' ? Math.sin(P.t * 14) * 3 : 0;
    c.strokeStyle = '#1E3A8A'; c.lineWidth = 1.8;
    c.save(); c.translate(-3, 2); c.rotate(.25);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-14, 6 + fl); c.lineTo(-13, 12 + fl); c.lineTo(2, 5); c.closePath(); fs(c, '#3B82F6');
    c.restore();
    c.beginPath(); c.ellipse(0, 0, 9, 4.5, -.2, 0, Math.PI * 2); fs(c, '#60A5FA');
    c.strokeStyle = '#fff'; c.lineWidth = 1.6;
    [-4, 2].forEach(x => { c.beginPath(); c.moveTo(x, -3.5); c.lineTo(x + 1, 3.5); c.stroke(); });
  }},
  // capa: no robô (fininho) fica atrás; nos bichos fica por cima das costas
  capa:{layer:P => P.cid === 'robo' ? 'behind' : 'front', draw(c, P){
    const fl = P.state === 'run' ? Math.sin(P.t * 14) * 4 : P.state === 'jump' || P.state === 'fall' ? -6 : Math.sin(P.t * 2) * 1.5;
    const big = P.cid === 'robo' ? 1 : 1.25;
    c.scale(big, big);
    c.strokeStyle = '#7F1D1D'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(3, -3); c.quadraticCurveTo(-18, -8 + fl * .3, -38, 0 + fl);
    c.lineTo(-32, 10 + fl * .6); c.lineTo(-40, 18 + fl); c.quadraticCurveTo(-18, 16, 2, 7); c.closePath();
    fs(c, vgrad(c, -6, 22, '#EF4444', '#991B1B'));
    c.fillStyle = '#FACC15'; c.beginPath(); c.arc(3, 2, 3.4, 0, Math.PI * 2); c.fill(); c.stroke();
  }},
};

// efeitos: o rastro aparece na corrida; aqui fica o desenho do ícone da loja
const ACC_EFFECT = {
  coracoes(c){ [[-8, 2, 1], [6, -6, 1.3], [9, 9, .8]].forEach(([x, y, s])=>{
    c.save(); c.translate(x, y); c.scale(s, s);
    c.beginPath(); c.moveTo(0, 5); c.bezierCurveTo(-9, -1, -5, -8, 0, -3); c.bezierCurveTo(5, -8, 9, -1, 0, 5); c.closePath();
    c.fillStyle = '#F43F5E'; c.fill(); c.strokeStyle = '#9F1239'; c.lineWidth = 1.4; c.stroke(); c.restore(); }); },
  estrelas(c){ c.fillStyle = '#FACC15'; c.strokeStyle = '#B45309'; c.lineWidth = 1.5;
    [[-10, 4, 6], [4, -6, 8], [10, 8, 5]].forEach(([x, y, r]) => { starPathP(c, x, y, r, r * .45); c.fill(); c.stroke(); }); },
  arcoiris(c){ ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#8B5CF6'].forEach((col, i)=>{
    c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(0, 10, 18 - i * 3, Math.PI, 0); c.stroke(); }); },
};

function starPathP(c, x, y, R, r){
  c.beginPath();
  for(let i = 0; i < 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  c.closePath();
}

function accHead(c, P, x, y, s){
  const f = P.eq && ACC_HEAD[P.eq.head];
  if(!f) return;
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round'; f(c, P); c.restore();
}
function accEyes(c, P, x, y, s, front){
  const f = P.eq && ACC_EYES[P.eq.eyes];
  if(!f || P.state === 'hurt') return;
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round'; f(c, front); c.restore();
}
function accBack(c, P, layer, nx, ny, s, bx, by){
  const a = P.eq && ACC_BACK[P.eq.back];
  if(!a) return;
  const l = typeof a.layer === 'function' ? a.layer(P) : a.layer;
  if(l !== layer && l !== 'both') return; // 'both' = desenha uma parte atrás e outra na frente
  c.save();
  if(a.atBack) c.translate(bx, by); else c.translate(nx, ny);
  const off = a.at && a.at[P.cid]; // ajuste fino do encaixe em cada personagem
  if(off) c.translate(off[0], off[1]);
  c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
  a.draw(c, P, layer);
  c.restore();
}

// o que cada personagem está usando (vem da loja; sem loja = nada)
function equipOf(id){
  return (typeof shopEquipOf === 'function' && shopEquipOf(id)) || {};
}

// ============================================================
// Mais acessórios (segunda leva da loja)
// ============================================================
Object.assign(ACC_HEAD, {
  gorro(c){
    c.strokeStyle = OUT; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-11, -3); c.bezierCurveTo(-12, -20, 12, -20, 11, -3); c.closePath();
    fs(c, vgrad(c, -18, -3, '#60A5FA', '#2563EB'));
    c.save(); c.clip(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2.4;
    [-6, 0, 6].forEach(x => { c.beginPath(); c.moveTo(x, -3); c.lineTo(x + 1, -18); c.stroke(); }); c.restore();
    c.strokeStyle = OUT; c.lineWidth = 2;
    rr(c, -13, -5, 26, 7, 3.5); fs(c, '#F8FAFC');
    c.beginPath(); c.arc(1, -19, 5, 0, Math.PI * 2); fs(c, '#fff');
  },
  orelhas(c, P){
    const w = Math.sin((P.t || 0) * 3) * .06;
    c.strokeStyle = OUT; c.lineWidth = 2;
    [[-6, -.25 + w], [5, .15 - w]].forEach(([x, a])=>{
      c.save(); c.translate(x, -2); c.rotate(a);
      c.beginPath(); c.ellipse(0, -14, 5, 14, 0, 0, Math.PI * 2); fs(c, '#FFFFFF');
      c.fillStyle = '#FBCFE8'; c.beginPath(); c.ellipse(0, -13, 2.4, 10, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    });
    c.beginPath(); c.moveTo(-12, 1); c.quadraticCurveTo(0, -5, 12, 1); c.lineWidth = 3.5; c.strokeStyle = '#F472B6'; c.stroke();
  },
  chef(c){
    c.strokeStyle = OUT; c.lineWidth = 2;
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(-7, -15, 7.5, 0, Math.PI * 2); c.arc(0, -20, 8.5, 0, Math.PI * 2); c.arc(7, -15, 7.5, 0, Math.PI * 2); c.fill(); c.stroke();
    rr(c, -10, -10, 20, 10, 3); fs(c, '#F8FAFC');
    c.strokeStyle = '#CBD5E1'; c.lineWidth = 1.2;
    [-4, 0, 4].forEach(x => { c.beginPath(); c.moveTo(x, -9); c.lineTo(x, -1); c.stroke(); });
  },
  fones(c, P){
    if(P && P.cid && P.cid !== 'robo'){ // de lado: um fone na orelha e o arco por cima da cabeça
      c.strokeStyle = '#1F2937'; c.lineWidth = 3.5;
      c.beginPath(); c.moveTo(-8, 0); c.bezierCurveTo(-8, -14, 10, -16, 13, 1); c.stroke();
      c.lineWidth = 2; rr(c, -14, -3, 11, 14, 5); c.fillStyle = '#EF4444'; c.fill(); c.stroke();
      dot(c, -8.5, 4, 2.4, '#FCA5A5');
      return;
    }
    c.strokeStyle = '#1F2937'; c.lineWidth = 3.5;
    c.beginPath(); c.arc(0, 4, 13, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    c.lineWidth = 2;
    [-13, 13].forEach(x=>{ rr(c, x - 4.5, 0, 9, 13, 4); c.fillStyle = '#EF4444'; c.fill(); c.strokeStyle = '#1F2937'; c.stroke(); dot(c, x, 6.5, 2, '#FCA5A5'); });
  },
  cauboi(c){
    c.strokeStyle = OUT; c.lineWidth = 2;
    c.beginPath(); c.ellipse(0, -1, 21, 4.5, -.05, 0, Math.PI * 2); fs(c, '#92400E');
    c.beginPath(); c.moveTo(-10, -2); c.lineTo(-9, -15); c.quadraticCurveTo(0, -10, 9, -15); c.lineTo(10, -2); c.closePath();
    fs(c, vgrad(c, -15, -2, '#C2783B', '#92400E'));
    c.fillStyle = '#7F1D1D'; c.fillRect(-10, -6, 20, 3.5);
    starPathP(c, 0, -4.5, 2.6, 1.1); c.fillStyle = '#FACC15'; c.fill();
  },
  aureola(c, P){
    const yy = -12 + Math.sin((P.t || 0) * 3) * 1.5;
    c.save(); c.shadowColor = '#FDE047'; c.shadowBlur = 12;
    c.strokeStyle = '#FACC15'; c.lineWidth = 3.4;
    c.beginPath(); c.ellipse(0, yy, 11, 3.5, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#FEF9C3'; c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(0, yy - .5, 10, 3, 0, Math.PI, Math.PI * 2); c.stroke();
    c.restore();
  },
  unicornio(c){
    c.save(); c.rotate(.3);
    c.strokeStyle = '#9D174D'; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-5, 0); c.lineTo(0, -26); c.lineTo(5, 0); c.closePath();
    const g = c.createLinearGradient(-5, 0, 5, -26); g.addColorStop(0, '#F9A8D4'); g.addColorStop(.5, '#C4B5FD'); g.addColorStop(1, '#FDE68A');
    fs(c, g);
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.6;
    [-4, -10, -16, -21].forEach((y, i) => { const w = 4.2 - i; c.beginPath(); c.moveTo(-w, y + 1.5); c.lineTo(w, y - 1.5); c.stroke(); });
    c.restore();
    dot(c, 9, -18, 1.5, '#FDE047'); dot(c, -6, -12, 1.2, '#F9A8D4');
  },
  astronauta(c){
    // capacete de vidro em volta da cabeça
    c.save();
    c.strokeStyle = '#64748B'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(4, 12, 24, 0, Math.PI * 2);
    c.fillStyle = 'rgba(186,230,253,.28)'; c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.65)';
    c.beginPath(); c.ellipse(-6, 0, 4, 9, .5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(-11, 10, 2, 0, Math.PI * 2); c.fill();
    // aro e antena
    rr(c, -18, 31, 44, 6, 3); c.fillStyle = '#E2E8F0'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(18, -6); c.lineTo(24, -16); c.stroke();
    dot(c, 24, -17, 3, '#EF4444');
    c.restore();
  },
});

Object.assign(ACC_EYES, {
  natacao(c, front){
    const lens = x => { rr(c, x - 5.5, -4, 11, 8, 4); c.fillStyle = 'rgba(45,212,191,.75)'; c.fill(); c.strokeStyle = '#0F766E'; c.lineWidth = 1.8; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(x - 3.5, -2.5, 3, 1.3); };
    if(front){ lens(-6); lens(6); }
    else { c.strokeStyle = '#0D9488'; c.lineWidth = 3; c.beginPath(); c.moveTo(-5, 0); c.lineTo(-16, -1); c.stroke(); lens(0); }
  },
  mascara(c, front){
    c.fillStyle = '#1E293B'; c.strokeStyle = '#000'; c.lineWidth = 1.4;
    c.beginPath();
    if(front){ rr(c, -13, -5, 26, 10, 5); c.ellipse(-6, 0, 3.6, 3, 0, 0, Math.PI * 2); c.ellipse(6, 0, 3.6, 3, 0, 0, Math.PI * 2); }
    else { rr(c, -9, -5, 17, 10, 5); c.ellipse(0, 0, 4, 3.4, 0, 0, Math.PI * 2); }
    c.fill('evenodd'); c.stroke();
    if(!front){ c.strokeStyle = '#1E293B'; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(-9, -1); c.quadraticCurveTo(-15, 0, -19, 4); c.moveTo(-9, 1); c.quadraticCurveTo(-14, 4, -16, 8); c.stroke(); }
  },
  oculos3d(c, front){
    const lens = (x, col) => { c.fillStyle = col; c.fillRect(x - 5, -3.5, 10, 7); };
    c.strokeStyle = '#F8FAFC'; c.lineWidth = 2.2;
    if(front){ lens(-6, 'rgba(239,68,68,.8)'); lens(6, 'rgba(34,211,238,.8)'); rr(c, -11.5, -4.5, 23, 9, 2); c.stroke(); c.strokeStyle = '#94A3B8'; c.lineWidth = 1; c.stroke(); }
    else { lens(0, 'rgba(34,211,238,.8)'); rr(c, -5.5, -4.5, 11, 9, 2); c.stroke(); c.strokeStyle = '#F8FAFC'; c.lineWidth = 2; c.beginPath(); c.moveTo(-5.5, -1); c.lineTo(-13, -3); c.stroke(); }
  },
  monoculo(c, front){
    const x = front ? 6 : 0;
    c.strokeStyle = '#CA8A04'; c.lineWidth = 2;
    c.beginPath(); c.arc(x, 0, 5.2, 0, Math.PI * 2); c.fillStyle = 'rgba(254,249,195,.3)'; c.fill(); c.stroke();
    c.lineWidth = 1.2; c.setLineDash([1.5, 1.5]);
    c.beginPath(); c.moveTo(x - 2, 5); c.quadraticCurveTo(x - 6, 14, x - 1, 18); c.stroke();
    c.setLineDash([]);
  },
});

Object.assign(ACC_BACK, {
  jetpack:{layer:'front', atBack:true, draw(c, P){
    c.strokeStyle = '#334155'; c.lineWidth = 1.8;
    [-4, 4].forEach(x=>{
      rr(c, x - 4, -8, 8, 18, 4); c.fillStyle = vgrad(c, -8, 10, '#E2E8F0', '#94A3B8'); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - 4, -6); c.lineTo(x, -12); c.lineTo(x + 4, -6); c.closePath(); c.fillStyle = '#EF4444'; c.fill(); c.stroke();
      if(P.state === 'jump' || P.state === 'fall' || P.jet){
        const f = 7 + Math.random() * 6;
        c.fillStyle = '#FB923C'; c.beginPath(); c.moveTo(x - 3, 10); c.quadraticCurveTo(x, 10 + f * 1.6, x + 3, 10); c.fill();
        c.fillStyle = '#FDE047'; c.beginPath(); c.moveTo(x - 1.6, 10); c.quadraticCurveTo(x, 10 + f, x + 1.6, 10); c.fill();
      }
    });
  }},
});

Object.assign(ACC_EFFECT, {
  bolhas(c){ c.strokeStyle = '#38BDF8'; c.lineWidth = 1.6; [[-8, 6, 7], [6, -6, 9], [10, 10, 4]].forEach(([x, y, r])=>{
    c.fillStyle = 'rgba(186,230,253,.45)'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
    dot(c, x - r * .35, y - r * .35, r * .25, '#fff'); }); },
  notas(c){ c.font = '700 20px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    [['♪', -8, 4, '#8B5CF6'], ['♫', 8, -5, '#EC4899'], ['♪', 10, 12, '#0EA5E9']].forEach(([t, x, y, col]) => { c.fillStyle = col; c.fillText(t, x, y); }); },
  brilho(c){ ['#F472B6', '#FACC15', '#38BDF8', '#A78BFA'].forEach((col, i)=>{
    const x = [-10, 6, 10, -2][i], y = [4, -8, 10, -14][i] + 4, r = [6, 8, 4, 4][i];
    c.fillStyle = col; c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); }); },
  fogo(c){ [['#EF4444', 12, 0], ['#F97316', 9, 2], ['#FACC15', 5, 4]].forEach(([col, r, dy])=>{
    c.fillStyle = col; c.beginPath(); c.moveTo(0, -r * 1.6 + dy); c.quadraticCurveTo(r, -r * .2 + dy, r * .7, r * .6 + dy);
    c.quadraticCurveTo(0, r * 1.2 + dy, -r * .7, r * .6 + dy); c.quadraticCurveTo(-r, -r * .2 + dy, 0, -r * 1.6 + dy); c.fill(); }); },
});

// ---------- mochila e asas (refeitas para encaixar nas costas de cada um) ----------
// Nos bichos (de lado) a mochila fica deitada nas costas, com a alça descendo
// pela barriga; as asas saem dos ombros, uma atrás e outra na frente do corpo.
// No robô (de frente) a mochila e as asas ficam atrás dele.
const WING_AT = {capivara:[3, 1], tatu:[1, 2], robo:[14, -3]};
function wingFlap(P){
  const air = P.state === 'jump' || P.state === 'fall';
  return Math.abs(Math.sin((P.t || 0) * (air ? 16 : 3.5))) * (air ? .45 : .12);
}
function butterflyWing(c, dark){
  c.strokeStyle = dark ? '#581C87' : '#6B21A8'; c.lineWidth = 1.6;
  // asa de cima (grande)
  c.beginPath(); c.moveTo(0, 0);
  c.bezierCurveTo(-16, -6, -26, -26, -12, -31);
  c.bezierCurveTo(0, -34, 5, -14, 0, 0);
  fs(c, vgrad(c, -32, 0, dark ? '#C084FC' : '#F0ABFC', dark ? '#7E22CE' : '#A855F7'));
  // asa de baixo (menor)
  c.beginPath(); c.moveTo(0, 0);
  c.bezierCurveTo(-14, 0, -20, 12, -11, 15);
  c.bezierCurveTo(-3, 17, 2, 8, 0, 0);
  fs(c, vgrad(c, 0, 16, dark ? '#FCD34D' : '#FDE68A', dark ? '#D97706' : '#F59E0B'));
  // pintinhas
  dot(c, -10, -22, 3.2, 'rgba(255,255,255,.85)'); dot(c, -5, -12, 1.8, 'rgba(255,255,255,.85)');
  dot(c, -9, 8, 2, 'rgba(255,255,255,.8)');
  c.strokeStyle = dark ? 'rgba(88,28,135,.5)' : 'rgba(107,33,168,.45)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-8, -14, -12, -28); c.moveTo(0, 0); c.quadraticCurveTo(-8, 4, -11, 13); c.stroke();
}
function angelWing(c, dark){
  c.strokeStyle = dark ? '#94A3B8' : '#A8B4C6'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(2, 0);
  c.bezierCurveTo(-2, -16, -18, -30, -34, -30);           // borda de cima
  c.quadraticCurveTo(-30, -24, -33, -20);                  // pontas das penas
  c.quadraticCurveTo(-26, -17, -28, -12);
  c.quadraticCurveTo(-20, -11, -21, -6);
  c.quadraticCurveTo(-13, -6, -12, -1);
  c.quadraticCurveTo(-5, -2, 2, 0);
  c.closePath();
  fs(c, vgrad(c, -30, 0, dark ? '#E2E8F0' : '#FFFFFF', dark ? '#CBD5E1' : '#E2E8F0'));
  c.strokeStyle = dark ? 'rgba(100,116,139,.45)' : 'rgba(148,163,184,.6)'; c.lineWidth = 1.1;
  [[-14, -20, -6, -6], [-22, -24, -10, -10], [-28, -27, -18, -16]].forEach(([x1, y1, x2, y2])=>{ c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2 + 2, (y1 + y2) / 2 + 1, x2, y2); c.stroke(); });
}
function drawWings(c, P, layer, wing, tilt = 0){ // tilt: inclinação extra (asas de anjo apontam para trás)
  const f = wingFlap(P);
  if(P.cid === 'robo'){ // de frente: as duas asas abertas atrás dele
    if(layer !== 'behind') return;
    [1, -1].forEach(side=>{ c.save(); c.scale(side * (1 - f), 1); c.rotate(tilt ? .05 : -.8); wing(c, false); c.restore(); });
    return;
  }
  c.save();
  if(layer === 'behind'){ c.translate(6, -2); c.scale(.85 * (1 - f * .6), .9); c.rotate(-.45 + tilt); wing(c, true); }
  else { c.globalAlpha = .93; c.scale(1 - f, 1); c.rotate(-.75 + tilt); wing(c, false); }
  c.restore();
}
Object.assign(ACC_BACK, {
  mochila:{layer:'both', atBack:true, at:{capivara:[5, 4], tatu:[1, 5], robo:[0, 0]}, draw(c, P, layer){
    c.strokeStyle = '#14532D'; c.lineWidth = 2;
    if(P.cid === 'robo'){
      if(layer === 'behind'){ rr(c, -9, -12, 15, 22, 5); fs(c, vgrad(c, -12, 10, '#4ADE80', '#16A34A')); rr(c, -9, -12, 15, 8, 4); fs(c, '#22C55E'); }
      else { c.lineWidth = 3; c.strokeStyle = '#15803D'; c.beginPath(); c.moveTo(3, -9); c.quadraticCurveTo(5, 2, 3, 12); c.stroke(); }
      return;
    }
    if(layer !== 'front') return;
    const strap = P.cid === 'tatu' ? 17 : 21;
    // alça descendo pelo lado do corpo até a barriga
    c.strokeStyle = '#15803D'; c.lineWidth = 3.2;
    c.beginPath(); c.moveTo(6, -2); c.quadraticCurveTo(9, strap * .5, 6, strap); c.stroke();
    c.strokeStyle = '#14532D'; c.lineWidth = 2;
    // a mochila deitada nas costas
    rr(c, -11, -13, 22, 15, 6); fs(c, vgrad(c, -13, 2, '#4ADE80', '#16A34A'));
    c.beginPath(); c.moveTo(-11, -6); c.quadraticCurveTo(0, -11, 11, -6); c.lineTo(11, -8); c.quadraticCurveTo(11, -13, 5, -13);
    c.lineTo(-5, -13); c.quadraticCurveTo(-11, -13, -11, -8); c.closePath(); fs(c, '#22C55E');
    rr(c, -6, -5, 11, 6, 2.5); fs(c, '#15803D');
    dot(c, 0, -7, 1.6, '#FACC15');
  }},
  asasBorboleta:{layer:'both', atBack:true, at:WING_AT, draw(c, P, layer){ drawWings(c, P, layer, butterflyWing); }},
  asasAnjo:{layer:'both', atBack:true, at:WING_AT, draw(c, P, layer){ drawWings(c, P, layer, angelWing, .95); }},
});

// ============================================================
// Terceira leva da loja
// ============================================================
Object.assign(ACC_HEAD, {
  laco(c){
    c.save(); c.translate(-4, -4); c.rotate(-.25);
    c.strokeStyle = '#9D174D'; c.lineWidth = 1.8;
    [-1, 1].forEach(side=>{
      c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(side * 6, -9, side * 15, -6, side * 13, 1); c.bezierCurveTo(side * 15, 8, side * 6, 9, 0, 0); c.closePath();
      fs(c, vgrad(c, -8, 8, '#F9A8D4', '#EC4899'));
    });
    c.beginPath(); c.arc(0, 0, 3.4, 0, Math.PI * 2); fs(c, '#DB2777');
    c.restore();
  },
  tiara(c){
    c.save(); c.shadowColor = '#F0ABFC'; c.shadowBlur = 6;
    c.strokeStyle = '#A1A1AA'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(-11, 0); c.quadraticCurveTo(0, -5, 11, 0); c.stroke();
    c.strokeStyle = '#71717A'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(-9, -1); c.lineTo(-6, -7); c.lineTo(-3, -3); c.lineTo(0, -12); c.lineTo(3, -3); c.lineTo(6, -7); c.lineTo(9, -1);
    c.fillStyle = vgrad(c, -12, 0, '#F4F4F5', '#D4D4D8'); c.fill(); c.stroke();
    c.restore();
    dot(c, 0, -7, 2.2, '#EC4899'); dot(c, -6, -4, 1.4, '#38BDF8'); dot(c, 6, -4, 1.4, '#38BDF8');
  },
  viking(c){
    c.strokeStyle = OUT; c.lineWidth = 2;
    [-1, 1].forEach(side=>{ // chifres
      c.beginPath(); c.moveTo(side * 9, -6); c.quadraticCurveTo(side * 20, -8, side * 19, -22); c.quadraticCurveTo(side * 15, -12, side * 7, -11); c.closePath();
      fs(c, vgrad(c, -22, -6, '#FEF3C7', '#D6B37A'));
    });
    c.beginPath(); c.moveTo(-12, 0); c.bezierCurveTo(-13, -19, 13, -19, 12, 0); c.closePath();
    fs(c, vgrad(c, -16, 0, '#CBD5E1', '#64748B'));
    rr(c, -13, -3, 26, 5, 2); fs(c, '#B45309');
    [-7, 0, 7].forEach(x => dot(c, x, -.5, 1.2, '#FDE68A'));
  },
  bruxa(c){
    c.save(); c.rotate(-.15);
    c.strokeStyle = OUT; c.lineWidth = 2;
    c.beginPath(); c.ellipse(0, -1, 19, 4, 0, 0, Math.PI * 2); fs(c, '#3B0764');
    c.beginPath(); c.moveTo(-10, -2); c.quadraticCurveTo(-6, -16, 2, -24); c.quadraticCurveTo(10, -30, 14, -24); c.quadraticCurveTo(6, -20, 10, -2); c.closePath();
    fs(c, vgrad(c, -28, 0, '#7E22CE', '#4C1D95'));
    c.fillStyle = '#22C55E'; c.fillRect(-10, -6, 20, 3.5);
    rr(c, -2.5, -7, 5, 5, 1); c.strokeStyle = '#FACC15'; c.lineWidth = 1.3; c.stroke();
    c.restore();
  },
  folhas(c){ // coroa de flores
    c.strokeStyle = '#166534'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(-12, 0); c.quadraticCurveTo(0, -6, 12, 0); c.stroke();
    [[-10, -1, '#F472B6'], [-4, -4, '#FDE047'], [3, -4, '#60A5FA'], [10, -1, '#F472B6']].forEach(([x, y, col])=>{
      c.fillStyle = '#4ADE80'; c.beginPath(); c.ellipse(x + 3, y + 1, 3, 1.6, .5, 0, Math.PI * 2); c.fill();
      for(let k = 0; k < 5; k++){ const a = k / 5 * Math.PI * 2; dot(c, x + Math.cos(a) * 2.4, y - 2 + Math.sin(a) * 2.4, 2, col); }
      dot(c, x, y - 2, 1.3, '#FFFFFF');
    });
  },
});

Object.assign(ACC_EYES, {
  estrela(c, front){
    const st = x => { starPathP(c, x, 0, 7, 3.6); c.fillStyle = 'rgba(250,204,21,.85)'; c.fill(); c.strokeStyle = '#B45309'; c.lineWidth = 1.6; c.stroke();
      dot(c, x - 1.5, -1.5, 1.2, 'rgba(255,255,255,.8)'); };
    if(front){ st(-6.5); st(6.5); }
    else { st(0); c.strokeStyle = '#B45309'; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -1); c.lineTo(-13, -3); c.stroke(); }
  },
  nerd(c, front){
    c.strokeStyle = '#111827'; c.lineWidth = 2.8;
    const lens = x => { rr(c, x - 5.5, -4.5, 11, 9, 2.5); c.fillStyle = 'rgba(219,234,254,.3)'; c.fill(); c.stroke(); };
    if(front){ lens(-6.5); lens(6.5); c.beginPath(); c.moveTo(-1, -1); c.lineTo(1, -1); c.stroke(); c.fillStyle = '#fff'; c.fillRect(-1.6, -2.2, 3.2, 2.4); }
    else { lens(0); c.beginPath(); c.moveTo(-5.5, -1); c.lineTo(-13, -3); c.stroke(); }
  },
});

function dragonWing(c, dark){
  c.strokeStyle = dark ? '#14532D' : '#166534'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(0, 0);
  c.lineTo(-6, -22); c.lineTo(-30, -28); // braço da asa
  c.quadraticCurveTo(-26, -20, -28, -14); c.quadraticCurveTo(-21, -14, -20, -8);
  c.quadraticCurveTo(-13, -8, -11, -2); c.quadraticCurveTo(-5, -3, 0, 0); c.closePath();
  fs(c, vgrad(c, -28, 0, dark ? '#4ADE80' : '#86EFAC', dark ? '#15803D' : '#22C55E'));
  c.strokeStyle = dark ? 'rgba(20,83,45,.6)' : 'rgba(22,101,52,.55)'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-6, -22); c.lineTo(-20, -8); c.moveTo(-6, -22); c.lineTo(-11, -2); c.moveTo(-6, -22); c.lineTo(-28, -14); c.stroke();
  dot(c, -30, -28, 1.8, dark ? '#14532D' : '#166534');
}

Object.assign(ACC_BACK, {
  asasDragao:{layer:'both', atBack:true, at:WING_AT, draw(c, P, layer){ drawWings(c, P, layer, dragonWing, .8); }},
  violao:{layer:'both', atBack:true, at:{capivara:[4, 2], tatu:[1, 3], robo:[0, 0]}, draw(c, P, layer){
    const body = ()=>{
      c.strokeStyle = '#78350F'; c.lineWidth = 1.8;
      rr(c, 6, -4, 20, 4, 1.5); fs(c, '#92400E');   // braço
      rr(c, 24, -5.5, 6, 7, 1.5); fs(c, '#78350F'); // cabeça das cravelhas
      c.beginPath(); c.arc(-8, -2, 8, 0, Math.PI * 2); c.arc(3, -2, 6.5, 0, Math.PI * 2); // caixa em formato de 8
      c.fillStyle = vgrad(c, -10, 6, '#FBBF24', '#D97706'); c.fill();
      c.beginPath(); c.arc(-8, -2, 8, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(3, -2, 6.5, -1.9, 1.9); c.stroke();
      dot(c, -2, -2, 2.6, '#451A03');
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = .7; c.beginPath(); c.moveTo(-8, -3); c.lineTo(28, -3); c.moveTo(-8, -1); c.lineTo(28, -1); c.stroke();
    };
    if(P.cid === 'robo'){ if(layer !== 'behind') return; c.save(); c.translate(2, 0); c.rotate(-1.1); body(); c.restore(); return; }
    if(layer !== 'front') return;
    c.save(); c.rotate(-.35); body(); c.restore();
    c.strokeStyle = '#7C2D12'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(8, -2); c.quadraticCurveTo(11, 9, 8, 18); c.stroke();
  }},
});

Object.assign(ACC_EFFECT, {
  flores(c){ [[-9, 4, '#F472B6'], [6, -6, '#FDE047'], [10, 9, '#60A5FA']].forEach(([x, y, col])=>{
    for(let k = 0; k < 5; k++){ const a = k / 5 * Math.PI * 2; dot(c, x + Math.cos(a) * 3.6, y + Math.sin(a) * 3.6, 3, col); }
    dot(c, x, y, 2.2, '#fff'); }); },
  neve(c){ c.strokeStyle = '#38BDF8'; c.lineWidth = 1.8; c.lineCap = 'round';
    [[-8, 4, 7], [7, -6, 8], [10, 10, 4.5]].forEach(([x, y, r])=>{ for(let k = 0; k < 3; k++){ const a = k / 3 * Math.PI;
      c.beginPath(); c.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke(); } }); },
});

// ============================================================
// Acessórios mais fofinhos: formas curvas, um contorno só e brilho
// (substituem os desenhos antigos mais "geométricos")
// ============================================================
function gloss(c, x, y, rx, ry, rot, a){
  c.save(); c.fillStyle = `rgba(255,255,255,${a || .55})`;
  c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); c.fill(); c.restore();
}
Object.assign(ACC_HEAD, {
  chef(c){
    c.strokeStyle = OUT; c.lineWidth = 1.8;
    // nuvem fofinha com um contorno só
    blob(c, ()=>{
      c.beginPath();
      c.arc(-8, -14, 7.5, 0, Math.PI * 2); c.moveTo(9, -21); c.arc(0, -21, 9, 0, Math.PI * 2);
      c.moveTo(15.5, -14); c.arc(8, -14, 7.5, 0, Math.PI * 2);
      c.moveTo(10, -8); c.ellipse(0, -8, 10, 6, 0, 0, Math.PI * 2);
    }, vgrad(c, -30, -4, '#FFFFFF', '#E2E8F0'), 1.8);
    // dobrinhas
    c.strokeStyle = 'rgba(148,163,184,.8)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-6, -16); c.quadraticCurveTo(-4, -12, -5, -9); c.moveTo(5, -18); c.quadraticCurveTo(6, -13, 4, -9); c.stroke();
    // faixa
    c.strokeStyle = OUT; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-10, -6); c.quadraticCurveTo(0, -9, 10, -6); c.lineTo(10, 0); c.quadraticCurveTo(0, -3, -10, 0); c.closePath();
    fs(c, vgrad(c, -8, 0, '#F8FAFC', '#CBD5E1'));
    gloss(c, -4, -24, 4, 2.2, -.4);
  },
  festa(c){
    c.save(); c.rotate(-.18);
    c.strokeStyle = OUT; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-10, 0);
    c.quadraticCurveTo(-7, -14, 1, -26);
    c.quadraticCurveTo(8, -14, 11, 0);
    c.quadraticCurveTo(0, 3, -10, 0); c.closePath();
    fs(c, vgrad(c, -26, 0, '#C4B5FD', '#7C3AED'));
    c.save(); c.clip();
    // listras curvas
    c.strokeStyle = 'rgba(253,224,71,.9)'; c.lineWidth = 3;
    [-6, -14].forEach(y => { c.beginPath(); c.moveTo(-12, y + 3); c.quadraticCurveTo(0, y - 2, 12, y + 3); c.stroke(); });
    c.restore();
    gloss(c, -3.5, -10, 1.6, 6, .25, .45);
    // pompom e babadinho
    c.strokeStyle = OUT; c.lineWidth = 1.6;
    c.beginPath(); c.arc(1, -27.5, 4.4, 0, Math.PI * 2); fs(c, '#F472B6'); gloss(c, -.3, -29, 1.4, 1, 0, .7);
    c.beginPath(); c.moveTo(-11, 0);
    for(let k = 0; k <= 6; k++){ const x = -11 + k * 3.7; c.quadraticCurveTo(x + 1.8, 3.8, x + 3.7, 0.5); }
    c.lineTo(11, 0); c.strokeStyle = '#DB2777'; c.lineWidth = 2; c.stroke();
    c.restore();
  },
  cauboi(c){
    c.strokeStyle = OUT; c.lineWidth = 1.8;
    // aba curvadinha para cima nas pontas
    c.beginPath(); c.moveTo(-22, -6);
    c.quadraticCurveTo(-18, 1, 0, 1); c.quadraticCurveTo(18, 1, 22, -6);
    c.quadraticCurveTo(16, -1.5, 0, -2.5); c.quadraticCurveTo(-16, -1.5, -22, -6); c.closePath();
    fs(c, vgrad(c, -6, 1, '#B45309', '#78350F'));
    // copa com amassadinho no meio
    c.beginPath(); c.moveTo(-10, -2);
    c.quadraticCurveTo(-11, -14, -6, -16); c.quadraticCurveTo(0, -12, 6, -16); c.quadraticCurveTo(11, -14, 10, -2);
    c.quadraticCurveTo(0, -4, -10, -2); c.closePath();
    fs(c, vgrad(c, -16, -2, '#D97706', '#92400E'));
    c.fillStyle = '#7F1D1D'; c.beginPath(); c.moveTo(-10, -5); c.quadraticCurveTo(0, -7.5, 10, -5); c.lineTo(10, -2.5); c.quadraticCurveTo(0, -5, -10, -2.5); c.fill();
    starPathP(c, 0, -4.5, 2.6, 1.1); c.fillStyle = '#FACC15'; c.fill();
    gloss(c, -5, -11, 2, 3.5, .3, .35);
  },
  tiara(c){
    c.save(); c.shadowColor = '#F0ABFC'; c.shadowBlur = 8;
    c.strokeStyle = '#A16207'; c.lineWidth = 1.6;
    // três arcos redondinhos
    c.beginPath(); c.moveTo(-12, 0);
    c.quadraticCurveTo(-12, -8, -7, -7); c.quadraticCurveTo(-4, -14, 0, -15);
    c.quadraticCurveTo(4, -14, 7, -7); c.quadraticCurveTo(12, -8, 12, 0);
    c.quadraticCurveTo(0, -4, -12, 0); c.closePath();
    fs(c, vgrad(c, -15, 0, '#FEF9C3', '#FACC15'));
    c.restore();
    // pedrinhas
    c.strokeStyle = '#9D174D'; c.lineWidth = 1;
    c.beginPath(); c.ellipse(0, -8, 2.8, 3.4, 0, 0, Math.PI * 2); fs(c, '#EC4899');
    [-7.5, 7.5].forEach(x => { c.beginPath(); c.arc(x, -4, 1.8, 0, Math.PI * 2); c.fillStyle = '#38BDF8'; c.fill(); });
    gloss(c, -.8, -9.2, .9, 1.2, 0, .8);
    [-6, 6].forEach(x => dot(c, x, -13, 1, '#FFFFFF'));
  },
  coroa(c){
    c.save(); c.shadowColor = '#FDE047'; c.shadowBlur = 8;
    c.strokeStyle = '#92400E'; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(-12, 0);
    c.quadraticCurveTo(-13, -8, -12, -14);
    c.quadraticCurveTo(-8, -8, -6, -9); c.quadraticCurveTo(-3, -15, 0, -18);
    c.quadraticCurveTo(3, -15, 6, -9); c.quadraticCurveTo(8, -8, 12, -14);
    c.quadraticCurveTo(13, -8, 12, 0);
    c.quadraticCurveTo(0, 2, -12, 0); c.closePath();
    fs(c, vgrad(c, -18, 0, '#FEF08A', '#F59E0B'));
    c.restore();
    c.fillStyle = '#B45309'; c.beginPath(); c.moveTo(-12, -4); c.quadraticCurveTo(0, -6, 12, -4); c.lineTo(12, -1.5); c.quadraticCurveTo(0, -3.5, -12, -1.5); c.fill();
    dot(c, 0, -8, 2.6, '#EF4444'); dot(c, -7, -6.5, 1.9, '#3B82F6'); dot(c, 7, -6.5, 1.9, '#22C55E');
    gloss(c, -.8, -8.8, .8, .8, 0, .8);
    [[-12, -14], [0, -18], [12, -14]].forEach(([x, y]) => { dot(c, x, y - 1, 2.3, '#FEF9C3'); });
    gloss(c, -6, -11, 1.4, 3, .5, .4);
  },
  bone(c){
    c.strokeStyle = OUT; c.lineWidth = 1.8;
    // aba
    c.beginPath(); c.moveTo(6, -1); c.quadraticCurveTo(18, -5, 26, -1); c.quadraticCurveTo(18, 3, 6, 2); c.closePath();
    fs(c, vgrad(c, -4, 3, '#DC2626', '#991B1B'));
    // copa redondinha
    c.beginPath(); c.moveTo(-11, 1); c.bezierCurveTo(-13, -17, 13, -17, 11, 1); c.quadraticCurveTo(0, 3, -11, 1); c.closePath();
    fs(c, vgrad(c, -14, 1, '#F87171', '#DC2626'));
    c.strokeStyle = 'rgba(127,29,29,.45)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, -13); c.quadraticCurveTo(-2, -6, -1, 1); c.stroke();
    c.beginPath(); c.ellipse(4, -6, 4.2, 3.4, 0, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
    c.fillStyle = '#DC2626'; c.font = '800 5.5px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('F', 4, -5.8);
    dot(c, 0, -13, 1.8, '#7F1D1D');
    gloss(c, -6, -8, 2, 3.4, .5, .4);
  },
});
