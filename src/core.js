// ================= CORE UI ENGINE =================
const SVGNS = 'http://www.w3.org/2000/svg';
function h(tag, a, ...kids) {
  const e = document.createElement(tag);
  if (a) for (const k in a) {
    const v = a[k]; if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(c)); }
  return e;
}
function svgEl(tag, a) { const e = document.createElementNS(SVGNS, tag); for (const k in a) e.setAttribute(k, a[k]); return e; }
const clone = o => JSON.parse(JSON.stringify(o));
const PCOL = ['#2f7fd8', '#e0662f', '#22a06b', '#a54fc4', '#c99a06', '#d6456b', '#139c9c', '#6a5ff0', '#7a8b2a', '#b5651d'];
const pcol = i => i < 0 ? '#8895a7' : PCOL[i % PCOL.length];
const range = n => Array.from({ length: n }, (_, i) => i);
const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let UID = 0;

// ---------- Stage: logical-coordinate canvas with keyed, animated boxes & lines ----------
class Stage {
  constructor(parent, W, H) {
    this.W = W; this.H = H;
    this.outer = h('div', { class: 'stage' }); this.inner = h('div', { class: 'stage-in' });
    this.inner.style.width = W + 'px'; this.inner.style.height = H + 'px';
    this.svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'stage-svg' });
    this.mid = 'mk' + (++UID);
    const defs = svgEl('defs', {});
    for (const c of ['ink', 'acc', 'hl', 'ok', 'bad', 'mut']) {
      const m = svgEl('marker', { id: this.mid + c, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
      m.append(svgEl('path', { d: 'M0,0 L10,5 L0,10 z', class: 'mk-' + c })); defs.append(m);
    }
    this.svg.append(defs); this.inner.append(this.svg); this.outer.append(this.inner); parent.append(this.outer);
    this.items = new Map(); this.touched = new Set();
    const fit = () => { const w = this.outer.clientWidth; if (!w) return; const s = Math.min(1.3, w / W); this.inner.style.transform = `scale(${s})`; this.outer.style.height = (H * s) + 'px'; };
    new ResizeObserver(fit).observe(this.outer); fit();
  }
  begin() { this.touched = new Set(); }
  _get(key, mk) { let e = this.items.get(key), fresh = false; if (!e) { e = mk(); this.items.set(key, e); fresh = true; } this.touched.add(key); return [e, fresh]; }
  box(key, o) {
    const [e, fresh] = this._get(key, () => h('div', { class: 'sbox' }));
    const cls = 'sbox ' + (o.cls || ''); if (e.className !== cls) e.className = cls;
    if (o.html !== undefined && e._h !== o.html) { e.innerHTML = '<div class="sbi">' + o.html + '</div>'; e._h = o.html; }
    const tf = `translate(${o.x}px,${o.y}px)`;
    if (fresh) {
      e.style.transition = 'none'; e.style.transform = o.from ? `translate(${o.from[0]}px,${o.from[1]}px)` : tf;
      e.style.opacity = '0'; e.style.width = o.w + 'px'; if (o.h) e.style.height = o.h + 'px';
      this.inner.append(e); void e.offsetWidth; e.style.transition = '';
    }
    e.style.transform = tf; e.style.width = o.w + 'px'; e.style.height = o.h ? o.h + 'px' : '';
    e.style.opacity = o.op ?? 1; e.style.zIndex = o.z || '';
    e.style.background = o.bg || ''; e.style.borderColor = o.bc || ''; e.style.color = o.fg || '';
    if (o.fs) e.style.fontSize = o.fs + 'px'; else e.style.fontSize = '';
    return e;
  }
  line(key, o) {
    const [e, fresh] = this._get(key, () => { const p = svgEl('path', {}); this.svg.append(p); return p; });
    const pts = o.pts || [[o.x1, o.y1], [o.x2, o.y2]]; let d;
    if (o.curve) { const [a, b] = pts; const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1]; d = `M${a[0]},${a[1]} Q${mx - dy * o.curve},${my + dx * o.curve} ${b[0]},${b[1]}`; }
    else d = 'M' + pts.map(p => p.join(',')).join(' L');
    e.setAttribute('d', d); const c = o.c || 'ink';
    e.setAttribute('class', 'sl sl-' + c + (o.dash ? ' dash' : '') + (o.thick ? ' thick' : ''));
    if (o.arrow) e.setAttribute('marker-end', `url(#${this.mid}${c})`); else e.removeAttribute('marker-end');
    if (o.arrow === 'both') e.setAttribute('marker-start', `url(#${this.mid}${c})`); else e.removeAttribute('marker-start');
    if (fresh) { e.style.opacity = 0; getComputedStyle(e).opacity; }
    e.style.opacity = o.op ?? 1; return e;
  }
  end() { for (const [k, e] of this.items) if (!this.touched.has(k)) { this.items.delete(k); e.style.opacity = '0'; setTimeout(() => e.remove(), 400); } }
}

// ---------- Player: precomputed or interactive steps, play/pause/step/speed ----------
const PLAYERS = new Set();
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
let GSPEED = 1;
function Player(host, cfg) {
  const P = { steps: [{ msg: '' }], i: 0, playing: false, speed: GSPEED, timer: null, cfg };
  const root = h('div', { class: 'player', tabindex: '0' });
  P.root = root; P.top = h('div', { class: 'p-top' }); P.viz = h('div', { class: 'p-viz' });
  P.act = h('div', { class: 'p-act' }); P.msg = h('div', { class: 'p-msg', 'aria-live': 'polite' });
  const bar = h('div', { class: 'p-bar' });
  const B = (t, title, fn, cls) => h('button', { class: 'pb ' + (cls || ''), title, 'aria-label': title, onclick: fn }, t);
  const bR = B('⏮', 'Back to start (Home)', () => { stop(); go(0); });
  const bP = B('◀', 'Step back (←)', () => { stop(); go(P.i - 1); });
  const bPl = B('▶', 'Play / Pause (Space)', () => toggle(), 'play');
  const bN = B('▶|', 'Step forward (→)', () => { stop(); go(P.i + 1); });
  const bE = B('⏭', 'Go to last step (End)', () => { stop(); go(P.steps.length - 1); });
  const scrub = h('input', { type: 'range', min: 0, max: 0, value: 0, 'aria-label': 'Step progress bar', oninput: e => { stop(); go(+e.target.value); } });
  const cnt = h('span', { class: 'p-cnt' });
  const spd = h('select', { 'aria-label': 'Speed', onchange: e => { P.speed = +e.target.value; if (P.playing) { clearTimeout(P.timer); sched(); } setDur(); } });
  SPEEDS.forEach(s => spd.append(h('option', { value: s }, s + '×')));
  spd.value = P.speed;
  bar.append(bR, bP, bPl, bN, bE, scrub, cnt, h('label', { class: 'p-spd' }, 'Speed', spd));
  root.append(P.top, P.viz, P.act, P.msg, bar); host.append(root);
  const setDur = () => root.style.setProperty('--dur', (REDUCED ? 0 : Math.round(Math.max(120, Math.min(700, 520 / P.speed)))) + 'ms');
  function show() {
    const s = P.steps[P.i]; setDur();
    try { cfg.render(s, P); } catch (err) { console.error(err); }
    P.msg.innerHTML = s.msg || '';
    cnt.textContent = `Step ${P.i + 1}/${P.steps.length}`;
    scrub.max = P.steps.length - 1; scrub.value = P.i;
    bR.disabled = bP.disabled = P.i === 0; bN.disabled = bE.disabled = P.i >= P.steps.length - 1;
    bPl.textContent = P.playing ? '❚❚' : '▶';
    if (cfg.after) cfg.after(P);
  }
  function go(k) { P.i = Math.max(0, Math.min(P.steps.length - 1, k)); show(); }
  function sched() { const s = P.steps[P.i]; P.timer = setTimeout(tick, (cfg.base || 1700) * (s.hold || 1) / P.speed); }
  function tick() { if (P.i < P.steps.length - 1) { P.i++; show(); if (P.i < P.steps.length - 1) sched(); else stop(); } else stop(); }
  function stop() { P.playing = false; clearTimeout(P.timer); bPl.textContent = '▶'; }
  function toggle() { if (P.playing) { stop(); return; } PLAYERS.forEach(o => o !== P && o.stop()); if (P.i >= P.steps.length - 1) go(0); P.playing = true; bPl.textContent = '❚❚'; sched(); }
  root.addEventListener('keydown', e => {
    if (e.target !== root) return;
    if (e.key === ' ') { e.preventDefault(); toggle(); } else if (e.key === 'ArrowRight') { e.preventDefault(); stop(); go(P.i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); go(P.i - 1); } else if (e.key === 'Home') { stop(); go(0); } else if (e.key === 'End') { stop(); go(P.steps.length - 1); }
  });
  P.stop = stop; P.go = go; P.show = show; P.play = () => { if (!P.playing) toggle(); };
  P.setSteps = (st, keep) => { stop(); P.steps = st.length ? st : [{ msg: '' }]; P.i = keep ? Math.min(P.i, P.steps.length - 1) : 0; show(); };
  P.rebuild = () => { if (cfg.build) P.setSteps(cfg.build(P)); };
  P.push = s => { stop(); P.steps = P.steps.slice(0, P.i + 1); P.steps.push(s); P.i++; show(); };
  P.cur = () => P.steps[P.i];
  P.setSpeed = s => { P.speed = s; spd.value = s; setDur(); };
  PLAYERS.add(P);
  if (cfg.setup) cfg.setup(P);
  if (cfg.build) P.rebuild(); else show();
  return P;
}

// ---------- small form helpers ----------
function fSel(label, opts, val, on) { const s = h('select', { onchange: e => on(e.target.value) }); opts.forEach(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; s.append(h('option', { value: v }, t)); }); s.value = val; const l = h('label', null, label, s); l.sel = s; return l; }
function fNum(label, val, min, max, on, step) { const i = h('input', { type: 'number', value: val, min, max, step: step || 1, onchange: e => { let v = +e.target.value; if (isNaN(v)) v = val; v = Math.max(min, Math.min(max, v)); e.target.value = v; on(v); } }); const l = h('label', null, label, i); l.inp = i; return l; }
function fTxt(label, val, on, w) { const i = h('input', { type: 'text', value: val, style: `width:${w || 220}px`, onchange: e => on(e.target.value) }); const l = h('label', null, label, i); l.inp = i; return l; }
function fChk(label, val, on) { const i = h('input', { type: 'checkbox', onchange: e => on(e.target.checked) }); i.checked = val; return h('label', null, i, label); }
function btn(t, fn, cls, title) { return h('button', { class: 'btn ' + (cls || ''), onclick: fn, title }, t); }
const pchip = (name, i, extra) => `<span class="chip p" style="background:${pcol(i)}">${name}${extra || ''}</span>`;

// ---------- Gantt chart (SVG string) ----------
function ganttSVG(o) {
  // o: rows:[label], segs:[{r,s,e,c(colorIdx),t,cls}], T, now, marks:[{x,r,kind}], W
  const W = o.W || 860, L = Math.max(64, 8 + 7.2 * Math.max(...o.rows.map(r => String(r).length))), rowH = 30, gap = 8, top = 6, T = Math.max(1, o.T);
  const sx = x => L + (W - L - 12) * x / T; const H = top + o.rows.length * (rowH + gap) + 26;
  let s = `<svg class="gantt" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;min-width:520px">`;
  o.rows.forEach((r, i) => { const y = top + i * (rowH + gap); s += `<text x="4" y="${y + 19}" style="font-weight:600;fill:var(--ink)">${r}</text><rect class="idle" x="${L}" y="${y}" width="${W - L - 12}" height="${rowH}" rx="4"/>`; });
  const ticks = new Set([0]);
  for (const g of o.segs) {
    if (o.now != null && g.s >= o.now) continue;
    const e = o.now != null ? Math.min(g.e, o.now) : g.e; const y = top + g.r * (rowH + gap);
    const x1 = sx(g.s), x2 = sx(e);
    s += `<rect x="${x1}" y="${y}" width="${Math.max(0, x2 - x1)}" height="${rowH}" fill="${g.col || pcol(g.c)}" stroke="var(--panel)" stroke-width="1.5" rx="3" ${g.cls ? `class="${g.cls}"` : ''}/>`;
    if (x2 - x1 > 18 && g.t) s += `<text class="gl" x="${(x1 + x2) / 2}" y="${y + 19}" text-anchor="middle">${g.t}</text>`;
    ticks.add(g.s); ticks.add(e);
  }
  (o.extraTicks || []).forEach(x => ticks.add(x));
  if (o.now == null) ticks.add(T);
  const yb = top + o.rows.length * (rowH + gap);
  let lastX = -99;
  [...ticks].sort((a, b) => a - b).forEach(t => { const x = sx(t); if (x - lastX < 16) return; lastX = x; s += `<line class="axis" x1="${x}" y1="${top}" x2="${x}" y2="${yb - 2}" stroke-dasharray="2 3"/><text x="${x}" y="${yb + 14}" text-anchor="middle">${t}</text>`; });
  (o.marks || []).forEach(m => {
    const x = sx(m.x), y = top + m.r * (rowH + gap);
    if (m.kind === 'rel') s += `<path d="M${x},${y + rowH + 3} L${x},${y - 4} M${x - 4},${y + 2} L${x},${y - 4} L${x + 4},${y + 2}" stroke="${m.col || 'var(--ok)'}" stroke-width="2" fill="none"/>`;
    if (m.kind === 'dl') s += `<path d="M${x},${y - 4} L${x},${y + rowH + 3} M${x - 4},${y + rowH - 3} L${x},${y + rowH + 3} L${x + 4},${y + rowH - 3}" stroke="${m.col || 'var(--muted)'}" stroke-width="2" fill="none"/>`;
    if (m.kind === 'miss') s += `<circle cx="${x}" cy="${y + rowH / 2}" r="8" fill="var(--bad)"/><text x="${x}" y="${y + rowH / 2 + 4}" text-anchor="middle" style="fill:#fff;font-weight:700">!</text>`;
  });
  if (o.now != null) { const x = sx(o.now); s += `<line class="now" x1="${x}" y1="${top - 4}" x2="${x}" y2="${yb}"/><text x="${x}" y="${yb + 24}" text-anchor="middle" style="fill:var(--hl);font-weight:700">t=${o.now}</text>`; }
  return s + '</svg>';
}

// ---------- Simple bar/line chart (SVG string) ----------
function barChart(o) {
  // o: labels, series:[{name,vals,col}], W,H, hi (index), yLabel
  const W = o.W || 520, H = o.H || 220, L = 40, B = 34, T = 14, R = 10;
  const max = Math.max(1, ...o.series.flatMap(s => s.vals)) * 1.12;
  const n = o.labels.length, gw = (W - L - R) / n, bw = Math.min(26, (gw - 8) / o.series.length);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" class="gantt">`;
  for (let k = 0; k <= 4; k++) { const v = max * k / 4, y = H - B - (H - B - T) * k / 4; s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-dasharray="${k ? '2 3' : ''}"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${Math.round(v * 10) / 10}</text>`; }
  o.labels.forEach((lb, i) => {
    const gx = L + gw * i + (gw - bw * o.series.length) / 2;
    if (o.hi === i) s += `<rect x="${L + gw * i + 1}" y="${T - 4}" width="${gw - 2}" height="${H - B - T + 4}" fill="var(--hl-soft)" rx="4"/>`;
    o.series.forEach((se, j) => { const v = se.vals[i], bh = (H - B - T) * v / max, x = gx + j * bw; s += `<rect x="${x}" y="${H - B - bh}" width="${bw - 2}" height="${bh}" fill="${se.col}" rx="2"/>`; if (o.showV) s += `<text x="${x + bw / 2 - 1}" y="${H - B - bh - 3}" text-anchor="middle" style="fill:var(--ink)">${v}</text>`; });
    s += `<text x="${L + gw * i + gw / 2}" y="${H - B + 15}" text-anchor="middle" style="${o.hi === i ? 'fill:var(--hl);font-weight:700' : ''}">${lb}</text>`;
  });
  if (o.xLabel) s += `<text x="${(W + L) / 2}" y="${H - 3}" text-anchor="middle">${o.xLabel}</text>`;
  return s + '</svg>';
}
const legend = series => `<div class="legend">${series.map(s => `<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${s.col};margin-right:4px"></span>${s.name}</span>`).join('')}</div>`;

// ---------- Quiz ----------
function quizBlock(container, qs) {
  const wrap = h('div', { class: 'quiz' }); let right = 0, answered = 0;
  const score = h('div', { class: 'qscore' });
  const upd = () => score.textContent = `Answered ${answered}/${qs.length} · Correct ${right}`;
  qs.forEach((q, qi) => {
    const box = h('div', { class: 'qq' }); box.append(h('div', { class: 'qt', html: `Q${qi + 1}. ${q.q}` }));
    const opts = q.o.map((t, k) => h('button', { class: 'qo', html: String.fromCharCode(65 + k) + '. ' + t, onclick: () => {
      if (box.classList.contains('done')) return; box.classList.add('done'); answered++;
      if (k === q.a) right++; else opts[k].classList.add('wrong'); opts[q.a].classList.add('right');
      opts.forEach(b => b.disabled = true); upd();
    } }));
    box.append(...opts, h('div', { class: 'qe', html: '<b>Explanation:</b> ' + q.e })); wrap.append(box);
  });
  upd(); container.append(score, wrap);
}

// ---------- Concurrent Code Stepper (for synchronization chapters) ----------
// conf: { procs:[{name, code:[{t, z:'entry'|'cs'|'exit'|'rem', spin?(st,me), run?(st,me) -> undefined|'block'|{goto}, say?(st,me,res)}]}],
//         init()->{vars:{}, sem:{name:{v, L:[]}}}, maxCS, presets:[{name, seq}], showVars:[...], extra?(st, el, conf), stayRem?:bool }
function semW(name) { return { t: `Wait(${name});`, run: (st, me) => { const s = st.sem[name]; s.v--; if (s.v < 0) { s.L.push(me); return 'block'; } }, say: (st, me, r) => r === 'block' ? `${name}.value drops to ${st.sem[name].v} &lt; 0 → <b>block()</b>: the process's PCB moves from the CPU into queue ${name}.L, state → Waiting.` : `${name}.value drops to ${st.sem[name].v} ≥ 0 → continue.` }; }
function semS(name) { return { t: `Signal(${name});`, run: (st) => { const s = st.sem[name]; s.v++; if (s.v <= 0) { const p = s.L.shift(); st.P[p].blocked = false; st.woke = p; } }, say: (st, me) => st.woke != null ? `${name}.value rises to ${st.sem[name].v} ≤ 0 → someone is waiting → <b>wakeup()</b> moves the head of queue L to Ready.` : `${name}.value rises to ${st.sem[name].v}; nobody is waiting.` }; }

function CCS(host, conf) {
  const n = conf.procs.length;
  const mkState = () => { const s = conf.init(); s.P = conf.procs.map(() => ({ pc: 0, blocked: false, spins: 0, cs: 0 })); s.cur = null; s.cs = 0; s.viol = false; s.dead = false; s.stuckRem = Array(n).fill(false); s.log = []; return s; };
  let cards = [];
  const stepState = (st0, i) => {
    const st = clone(st0); st.woke = null; const P = st.P[i], code = conf.procs[i].code;
    if (P.blocked || code[P.pc].end) return null;
    let msg = '';
    if (st.cur !== i && st.cur !== null) { st.cs++; msg += `<span class="why-chip">context switch</span>${conf.procs[st.cur].name} → ${conf.procs[i].name}. `; }
    st.cur = i;
    const ln = code[P.pc];
    if (ln.z === 'rem' && st.stuckRem[i]) { msg += `${conf.procs[i].name} stays in its remainder section (busy with something else for a long time).`; }
    else if (ln.spin && ln.spin(st, i)) { P.spins++; msg += `${conf.procs[i].name}: <code>${ln.t.trim()}</code> → condition still true → <b>spins (busy wait)</b>, wasting CPU.`; }
    else {
      const r = ln.run ? ln.run(st, i) : undefined;
      msg += `${conf.procs[i].name} executes <code>${ln.t.trim()}</code>` + (ln.say ? ' → ' + ln.say(st, i, r) : (ln.spin ? ' → condition false → leaves the loop.' : ''));
      if (r === 'block') P.blocked = true;
      if (r && r.goto != null) P.pc = r.goto; else P.pc = (P.pc + 1) % code.length;
      if (code[P.pc].z === 'cs') P.cs++;
    }
    const csl = range(n).filter(k => !st.P[k].blocked && conf.procs[k].code[st.P[k].pc].z === 'cs'); const inCS = csl.length;
    if (conf.viol ? conf.viol(csl, st) : inCS > (conf.maxCS || 1)) { st.viol = true; msg += ` <span class="bad">⚠ MUTUAL EXCLUSION VIOLATED: ${csl.map(k => conf.procs[k].name).join(' and ')} are in the critical section together!</span>`; }
    const live = range(n).filter(k => !st.P[k].blocked && !conf.procs[k].code[st.P[k].pc].end);
    const canMove = live.some(k => { const l = conf.procs[k].code[st.P[k].pc]; if (l.z === 'rem' && st.stuckRem[k]) return false; return !(l.spin && l.spin(st, k)); });
    const someoneRem = live.some(k => st.stuckRem[k]);
    if (!canMove && !someoneRem && (live.length || st.P.some(p => p.blocked))) { st.dead = true; msg += live.length ? ` <span class="bad">⚠ DEADLOCK/LIVELOCK: every process is waiting for a condition that never changes.</span>` : ` <span class="bad">⚠ DEADLOCK: every process is blocked in a semaphore queue.</span>`; }
    else st.dead = false;
    st.msg = msg; return st;
  };
  const P = Player(host, {
    base: 1300,
    setup(Pl) {
      const procs = h('div', { class: 'ccs-procs' }); const shared = h('div', { class: 'ccs-shared' });
      const extra = h('div'); const alerts = h('div');
      Pl.viz.append(procs, shared, extra, alerts); Pl._el = { procs, shared, extra, alerts };
      cards = conf.procs.map((pr, i) => {
        const pc = h('div', { class: 'ccs-pc' }, '➤');
        const lines = pr.code.map(l => h('div', { class: 'ccs-l z-' + (l.z || '') }, l.t));
        const st = h('span', { class: 'chip' });
        const card = h('div', { class: 'ccs-p' }, h('div', { class: 'ccs-ph', style: `background:${pcol(conf.colorOff ? i + conf.colorOff : i)}` }, pr.name, st), h('div', { class: 'ccs-code' }, pc, lines));
        procs.append(card); return { card, pc, lines, st };
      });
      // action buttons
      conf.procs.forEach((pr, i) => { const b = btn('▶ Run 1 instruction of ' + pr.name, () => { const s = stepState(Pl.cur(), i); if (s) Pl.push(s); }); b.style.borderColor = pcol(conf.colorOff ? i + conf.colorOff : i); Pl.act.append(b); cards[i].btn = b; });
      Pl.act.append(btn('🎲 Random ×1', () => rnd(1)), btn('🎲 ×10', () => rnd(10)));
      if (conf.stayRem) conf.procs.forEach((pr, i) => { const c = fChk(` ${pr.name} stuck in remainder forever`, false, v => { const s = clone(Pl.cur()); s.stuckRem[i] = v; s.msg = v ? `${pr.name} will stay in its remainder section for a long time (e.g. waiting for I/O).` : `${pr.name} may leave its remainder section.`; Pl.push(s); }); c.style.fontSize = '12.5px'; Pl.act.append(c); cards[i].stay = c.querySelector('input'); });
      function rnd(k) { let s = Pl.cur(); const seq = [];
        for (let j = 0; j < k; j++) { const cand = range(n).filter(x => !s.P[x].blocked && !conf.procs[x].code[s.P[x].pc].end && !(conf.procs[x].code[s.P[x].pc].z === 'rem' && s.stuckRem[x])); if (!cand.length) break; const i = cand[Math.floor(Math.random() * cand.length)]; const ns = stepState(s, i); if (!ns) break; seq.push(ns); s = ns; if (ns.viol || ns.dead) break; }
        seq.forEach(x => Pl.push(x)); }
      if (conf.presets) Pl.top.append(fSel('Scenario:', [['', '— choose step by step —'], ...conf.presets.map((p, k) => [k, p.name])], '', v => {
        if (v === '') { Pl.setSteps([{ ...mkState(), msg: 'Initial state. Press each process\'s “Run 1 instruction” button to decide the interleaving yourself.' }]); return; }
        const pr = conf.presets[+v]; let s = mkState(); (pr.stay || []).forEach(k => s.stuckRem[k] = true); s.msg = pr.intro || 'Initial state.'; const st = [s];
        for (const i of pr.seq) { const ns = stepState(s, i); if (!ns) continue; st.push(ns); s = ns; }
        if (pr.outro) st[st.length - 1] = { ...st[st.length - 1], msg: st[st.length - 1].msg + '<br>' + pr.outro, hold: 2 };
        Pl.setSteps(st);
      }));
      Pl.top.append(btn('↺ Reset', () => Pl.setSteps([{ ...mkState(), msg: 'Reset.' }])));
    },
    build() { const s = mkState(); s.msg = conf.intro || 'Initial state. Press each process\'s “Run 1 instruction” button to build your own interleaving, or pick a preset scenario and press ▶.'; return [s]; },
    render(st, Pl) {
      conf.procs.forEach((pr, i) => {
        const c = cards[i], p = st.P[i], ln = pr.code[p.pc];
        c.lines.forEach((l, k) => l.classList.toggle('cur', k === p.pc));
        c.pc.style.top = (c.lines[p.pc].offsetTop + 4) + 'px';
        let label = 'Ready', cls = '';
        if (p.blocked) { label = 'Blocked'; cls = 'bad'; } else if (st.cur === i) { label = 'Running'; cls = 'acc'; }
        if (!p.blocked && ln.z === 'cs') { label += ' · trong CS'; cls = 'hl'; }
        if (!p.blocked && ln.spin && ln.spin(st, i)) label += ' · spin';
        c.st.className = 'chip ' + cls; c.st.textContent = label;
        c.card.classList.toggle('run', st.cur === i && !p.blocked); c.card.classList.toggle('blk', p.blocked);
        if (ln.end) { label = 'Done'; cls = 'ok'; }
        if (c.btn) c.btn.disabled = p.blocked || !!ln.end; if (c.stay) c.stay.checked = st.stuckRem[i];
      });
      const prev = Pl.steps[Pl.i - 1];
      const box = (k, v, sub, changed) => `<div class="ccs-box ${changed ? 'flash' : ''}"><div class="lab">${k}</div><div class="v">${v}</div>${sub ? `<div class="mut" style="font-size:12px">${sub}</div>` : ''}</div>`;
      let sh = '';
      for (const k of (conf.showVars || Object.keys(st.vars || {}))) { const v = st.vars[k]; sh += box(k, Array.isArray(v) ? '[' + v.map(x => String(x)).join(', ') + ']' : String(v), '', prev && JSON.stringify(prev.vars[k]) !== JSON.stringify(v)); }
      for (const k in (st.sem || {})) { const s = st.sem[k]; const ch = prev && (prev.sem[k].v !== s.v || prev.sem[k].L.length !== s.L.length);
        sh += box('semaphore ' + k, s.v, 'L: ' + (s.L.length ? s.L.map(x => pchip(conf.procs[x].name, conf.colorOff ? x + conf.colorOff : x)).join(' ') : '<i>empty</i>'), ch); }
      sh += box('Context switch', st.cs, 'CPU: ' + (st.cur == null ? '—' : conf.procs[st.cur].name), false);
      Pl._el.shared.innerHTML = sh;
      if (conf.extra) conf.extra(st, Pl._el.extra, conf);
      Pl._el.alerts.innerHTML = (st.viol ? '<div class="alert bad">Mutual exclusion was violated in this run.</div>' : '') + (st.dead ? '<div class="alert bad">The system is stuck: no process can make progress.</div>' : '');
    }
  });
  return P;
}

// ---------- Section / chapter scaffolding ----------
function card(container, o) {
  const c = h('section', { class: 'card', id: o.id });
  c.append(h('h2', null, h('span', { class: 'sn' }, o.n || ''), o.t));
  if (o.why) { const w = h('div', { class: 'why' }); o.why.forEach(([k, v]) => w.append(h('b', { class: 'k' }, k), h('p', { html: v }))); c.append(w); }
  const body = h('div'); c.append(body); container.append(c);
  try { o.mount(body); } catch (e) { console.error(e); body.append(h('div', { class: 'alert bad' }, 'Error while building this section: ' + e.message)); }
  if (o.exam) c.append(h('div', { class: 'exam', html: '<b>Exam trap:</b> ' + o.exam }));
  return c;
}
const CHAPTERS = [];
function chapter(def) { CHAPTERS.push(def); }
