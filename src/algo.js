// ================= PURE ALGORITHMS (no DOM) =================
'use strict';

// ---------- CPU scheduling (uni & multi-core, global) ----------
function schedSim(procs, opt) {
  const alg = opt.alg, q = opt.q || 4, cores = opt.cores || 1;
  const P = procs.map((p, i) => ({ ...p, i, rem: p.burst, first: null, fin: null }));
  const n = P.length; let t = 0; const ready = [];
  const run = Array(cores).fill(null), qleft = Array(cores).fill(0), open = Array(cores).fill(null);
  const segs = [], events = []; let done = 0, cs = 0;
  const pre = alg === 'SRTF' || alg === 'PRIO_P';
  const key = p => (alg === 'SJF' || alg === 'SRTF') ? [p.rem, p.arr, p.i] : (alg.startsWith('PRIO') ? [p.prio, p.arr, p.i] : [0]);
  const better = (a, b) => { const ka = key(a), kb = key(b); for (let j = 0; j < ka.length; j++) if (ka[j] !== kb[j]) return ka[j] < kb[j]; return false; };
  const bestIdx = () => { let bi = 0; if (alg === 'FCFS' || alg === 'RR') return 0; for (let j = 1; j < ready.length; j++) if (better(P[ready[j]], P[ready[bi]])) bi = j; return bi; };
  const kd = p => (alg === 'SJF' || alg === 'SRTF') ? `${p.rem} left` : alg.startsWith('PRIO') ? `priority ${p.prio}` : '';
  const closeSeg = c => { if (open[c]) { open[c].e = t; if (open[c].e > open[c].s) segs.push(open[c]); open[c] = null; } };
  while (done < n && t < 5000) {
    const log = [];
    for (let c = 0; c < cores; c++) { const pi = run[c]; if (pi != null && P[pi].rem === 0) { P[pi].fin = t; closeSeg(c); run[c] = null; done++; log.push(`<b>${P[pi].name}</b> finishes (Terminated)`); } }
    for (const p of P) if (p.arr === t) { ready.push(p.i); log.push(`<b>${p.name}</b> arrives in the Ready queue (burst ${p.burst}${alg.startsWith('PRIO') ? ', priority ' + p.prio : ''})`); }
    if (alg === 'RR') for (let c = 0; c < cores; c++) { const pi = run[c]; if (pi != null && qleft[c] === 0) { closeSeg(c); if (ready.length) { ready.push(pi); run[c] = null; log.push(`<b>${P[pi].name}</b> used up its quantum q=${q} → moved to the <i>tail</i> of the Ready queue (${P[pi].rem} left)`); } else { qleft[c] = q; log.push(`<b>${P[pi].name}</b> used up its quantum but the queue is empty → runs another quantum`); } } }
    if (done === n) break;
    for (let c = 0; c < cores; c++) if (run[c] == null && ready.length) { const pi = ready.splice(bestIdx(), 1)[0]; run[c] = pi; qleft[c] = q; if (P[pi].first == null) P[pi].first = t; cs++; log.push(`Scheduler picks <b>${P[pi].name}</b>${kd(P[pi]) ? ' (' + kd(P[pi]) + ')' : ''} → runs on core ${c + 1}`); }
    if (pre) while (ready.length && !run.some(x => x == null)) {
      const bi = bestIdx(); let wc = 0; for (let c = 1; c < cores; c++) if (better(P[run[wc]], P[run[c]])) wc = c;
      if (!better(P[ready[bi]], P[run[wc]])) break;
      const old = run[wc]; closeSeg(wc); const nw = ready.splice(bi, 1)[0]; ready.push(old); run[wc] = nw; qleft[wc] = q; cs++;
      if (P[nw].first == null) P[nw].first = t;
      log.push(`<b>${P[nw].name}</b> (${kd(P[nw])}) beats <b>${P[old].name}</b> (${kd(P[old])}) → <span class="bad">PREEMPT</span> ${P[old].name} back to Ready`);
    }
    if (log.length) events.push({ t, log, ready: [...ready], run: [...run], rem: P.map(p => p.rem) });
    for (let c = 0; c < cores; c++) { const pi = run[c]; if (pi != null) { if (!open[c] || open[c].p !== pi) { closeSeg(c); open[c] = { r: c, s: t, p: pi }; } P[pi].rem--; qleft[c]--; } else closeSeg(c); }
    t++;
  }
  for (let c = 0; c < cores; c++) closeSeg(c);
  events.push({ t, log: ['All processes have finished.'], ready: [], run: Array(cores).fill(null), rem: P.map(p => p.rem), end: true });
  P.forEach(p => { p.tat = p.fin - p.arr; p.wt = p.tat - p.burst; p.rt = p.first - p.arr; });
  const avg = k => P.reduce((a, p) => a + p[k], 0) / n;
  return { segs, events, P, T: t, avg: { wt: avg('wt'), tat: avg('tat'), rt: avg('rt') }, cs };
}

// ---------- Banker / Detection ----------
const vle = (a, b) => a.every((x, j) => x <= b[j]);
const vadd = (a, b) => a.map((x, j) => x + b[j]);
const vsub = (a, b) => a.map((x, j) => x - b[j]);
function safetyTrace(avail, alloc, need, detect) {
  const n = alloc.length; let work = [...avail];
  const fin = alloc.map(r => detect ? r.every(x => x === 0) : false);
  const trace = [], seq = []; let start = 0;
  while (true) {
    let found = false;
    for (let k = 0; k < n; k++) {
      const i = (start + k) % n; if (fin[i]) continue;
      const ok = vle(need[i], work);
      trace.push({ i, ok, work: [...work], fin: [...fin] });
      if (ok) { work = vadd(work, alloc[i]); fin[i] = true; seq.push(i); trace.push({ i, done: true, work: [...work], fin: [...fin] }); start = i + 1; found = true; break; }
    }
    if (!found) break;
  }
  return { trace, seq, safe: fin.every(x => x), fin, work };
}

// ---------- Page replacement ----------
function prSim(refs, nf, alg) {
  const slots = Array(nf).fill(null), R = Array(nf).fill(0), last = {}, out = [];
  let queue = [], hand = 0, faults = 0, stack = [];
  refs.forEach((pg, t) => {
    let slot = slots.indexOf(pg), fault = slot < 0, victim = null, info = {};
    if (!fault) { if (alg === 'CLOCK') R[slot] = 1; }
    else {
      faults++;
      const empty = slots.indexOf(null);
      if (empty >= 0) { slot = empty; if (alg === 'FIFO') queue.push(slot); }
      else {
        if (alg === 'FIFO') { slot = queue.shift(); queue.push(slot); }
        else if (alg === 'LRU') { let b = 0; for (let s = 1; s < nf; s++) if (last[slots[s]] < last[slots[b]]) b = s; slot = b; }
        else if (alg === 'OPT') {
          const nx = slots.map(p => { const k = refs.indexOf(p, t + 1); return k < 0 ? Infinity : k; });
          info.next = nx; let b = 0; for (let s = 1; s < nf; s++) if (nx[s] > nx[b]) b = s; slot = b;
        } else if (alg === 'CLOCK') {
          const sweep = [];
          while (R[hand] === 1) { R[hand] = 0; sweep.push(hand); hand = (hand + 1) % nf; }
          info.sweep = sweep; slot = hand; hand = (hand + 1) % nf;
        }
        victim = slots[slot];
      }
      slots[slot] = pg; if (alg === 'CLOCK') R[slot] = 0;
    }
    last[pg] = t;
    stack = [pg, ...stack.filter(x => x !== pg)];
    out.push({ t, pg, fault, slot, victim, slots: [...slots], R: [...R], hand, queue: [...queue], last: { ...last }, stack: [...stack], info });
  });
  return { steps: out, faults };
}

// ---------- Disk scheduling ----------
function diskSim(reqs, head, alg, dir, max) {
  let path = [head], order = [];
  const rest = [...reqs];
  const take = v => { const k = rest.indexOf(v); if (k >= 0) rest.splice(k, 1); order.push(v); path.push(v); };
  const asc = a => [...a].sort((x, y) => x - y);
  if (alg === 'FCFS') rest.slice().forEach(take);
  else if (alg === 'SSTF') { let cur = head; while (rest.length) { let b = 0; for (let j = 1; j < rest.length; j++) if (Math.abs(rest[j] - cur) < Math.abs(rest[b] - cur)) b = j; cur = rest[b]; take(cur); } }
  else {
    const lo = asc(rest.filter(x => x < head)), hi = asc(rest.filter(x => x >= head));
    const up = dir === 'up';
    if (alg === 'SCAN' || alg === 'LOOK') {
      const first = up ? hi : lo.reverse(), second = up ? lo.reverse() : hi;
      first.forEach(take);
      if (alg === 'SCAN' && second.length) path.push(up ? max : 0);
      second.forEach(take);
    } else { // C-SCAN, C-LOOK
      if (up) { hi.forEach(take); if (lo.length) { if (alg === 'C-SCAN') { path.push(max); path.push(0); } lo.forEach(take); } }
      else { const l2 = lo.reverse(); l2.forEach(take); const h2 = hi.reverse(); if (h2.length) { if (alg === 'C-SCAN') { path.push(0); path.push(max); } h2.forEach(take); } }
    }
  }
  let total = 0; for (let j = 1; j < path.length; j++) total += Math.abs(path[j] - path[j - 1]);
  return { path, order, total };
}

// ---------- Real-time scheduling ----------
function rtSim(tasks, alg, horizon, q) {
  q = q || 5; const jobs = [];
  tasks.forEach((tk, ti) => {
    if (tk.T) { for (let r = tk.ph || 0; r < horizon; r += tk.T) jobs.push({ ti, r, C: tk.C, rem: tk.C, d: r + tk.D, k: jobs.filter(j => j.ti === ti).length }); }
    else jobs.push({ ti, r: tk.R, C: tk.C, rem: tk.C, d: tk.R + tk.D, k: 0 });
  });
  jobs.forEach((j, idx) => j.id = idx);
  const segs = [], events = [], misses = []; let cur = null, open = null, readyQ = [], qleft = 0;
  const prioKey = j => alg === 'RM' ? [tasks[j.ti].T, j.ti] : alg === 'EDF' ? [j.d, j.r, j.ti] : alg === 'SJF' ? [j.C, j.r, j.ti] : [j.r, j.ti];
  const better = (a, b) => { const x = prioKey(a), y = prioKey(b); for (let k = 0; k < x.length; k++) if (x[k] !== y[k]) return x[k] < y[k]; return false; };
  const preemptive = alg === 'RM' || alg === 'EDF';
  const nm = j => tasks[j.ti].name + (tasks[j.ti].T ? `<sub>${j.k}</sub>` : '');
  for (let t = 0; t <= horizon; t++) {
    const log = [];
    if (cur && cur.rem === 0) { log.push(`${nm(cur)} completes at t=${t}${t <= cur.d ? ' (on time)' : ''}`); cur = null; }
    for (const j of jobs) if (j.rem > 0 && j.d === t && !j.missed) { j.missed = true; misses.push({ t, ti: j.ti, id: j.id }); log.push(`<span class="bad">DEADLINE MISS</span>: ${nm(j)} still needs ${j.rem} units but its deadline t=${j.d} has arrived!`); }
    for (const j of jobs) if (j.r === t) { readyQ.push(j); log.push(`${nm(j)} is released (C=${j.C}, absolute deadline ${j.d})`); }
    if (t === horizon) { if (log.length) events.push({ t, log, cur: null, ready: [] }); break; }
    if (alg === 'RR' && cur && qleft === 0 && readyQ.length) { readyQ.push(cur); log.push(`${nm(cur)} used up its quantum`); cur = null; }
    if (cur && preemptive) { let b = null; for (const j of readyQ) if (!b || better(j, b)) b = j; if (b && better(b, cur)) { log.push(`${nm(b)} has higher priority than ${nm(cur)} → preempt`); readyQ.push(cur); cur = null; } }
    if (!cur && readyQ.length) {
      let b; if (alg === 'RR' || alg === 'FCFS') b = alg === 'FCFS' ? readyQ.reduce((a, j) => better(j, a) ? j : a) : readyQ[0];
      else b = readyQ.reduce((a, j) => better(j, a) ? j : a);
      readyQ.splice(readyQ.indexOf(b), 1); cur = b; qleft = q;
      log.push(`Pick ${nm(b)} ${alg === 'RM' ? '(period T=' + tasks[b.ti].T + ')' : alg === 'EDF' ? '(deadline ' + b.d + ' earliest)' : ''}`);
    }
    if (log.length) events.push({ t, log, cur: cur ? cur.id : null, ready: readyQ.map(j => j.id) });
    if (cur) { if (!open || open.id !== cur.id) { if (open) { open.e = t; segs.push(open); } open = { id: cur.id, ti: cur.ti, s: t }; } cur.rem--; qleft--; }
    else if (open) { open.e = t; segs.push(open); open = null; }
  }
  if (open) { open.e = Math.min(horizon, open.s + 999); segs.push(open); }
  segs.forEach(s => { if (s.e == null) s.e = horizon; });
  return { jobs, segs, events, misses };
}

// ---------- Dynamic partition allocation ----------
function partSim(jobs, opt) {
  const total = opt.total, os = opt.os, fit = opt.fit;
  let mem = [{ s: os, z: total - os, p: null }];
  const Q = jobs.map((j, i) => ({ ...j, i })); const steps = []; let t = 0; const running = [];
  const snap = (msg, extra) => steps.push({ t, mem: mem.map(b => ({ ...b })), queue: Q.map(j => j.i), msg, ...extra });
  const merge = () => { mem.sort((a, b) => a.s - b.s); const m = []; for (const b of mem) { const l = m[m.length - 1]; if (l && !l.p && !b.p) l.z += b.z; else m.push({ ...b }); } mem = m; };
  const findHole = z => { const hs = mem.filter(b => !b.p && b.z >= z); if (!hs.length) return null; if (fit === 'first') return hs[0]; if (fit === 'best') return hs.reduce((a, b) => b.z < a.z ? b : a); return hs.reduce((a, b) => b.z > a.z ? b : a); };
  const tryAlloc = () => {
    while (Q.length) {
      const j = Q[0]; const hole = findHole(j.size);
      if (!hole) {
        const free = mem.filter(b => !b.p).reduce((a, b) => a + b.z, 0), big = Math.max(0, ...mem.filter(b => !b.p).map(b => b.z));
        if (free >= j.size) {
          snap(`<b>${j.name}</b> (${j.size}K) must wait: total free space = ${free}K ≥ ${j.size}K but the largest hole is only ${big}K → <span class="bad">external fragmentation</span>.`, { frag: true, hl: j.i });
          if (opt.compact) { let a = os; mem.sort((x, y) => x.s - y.s); const ps = mem.filter(b => b.p); ps.forEach(b => { b.s = a; a += b.z; }); mem = [...ps, { s: a, z: total - a, p: null }]; snap(`<b>Compaction</b>: the OS slides processes together (possible only because of <i>execution-time binding</i> – relative addresses + a base register). The holes merge into one ${total - a}K hole.`, { compact: true }); continue; }
        } else snap(`<b>${j.name}</b> (${j.size}K) does not fit any hole yet (largest ${big}K) → waits at the head of the queue (FCFS: later jobs must wait too).`, { hl: j.i });
        return;
      }
      Q.shift();
      const cand = mem.filter(b => !b.p && b.z >= j.size).map(b => b.s + ':' + b.z + 'K');
      const idx = mem.indexOf(hole); const blk = { s: hole.s, z: j.size, p: j.name, pi: j.i };
      const rest = hole.z - j.size; mem.splice(idx, 1, blk, ...(rest ? [{ s: hole.s + j.size, z: rest, p: null }] : []));
      running.push({ ...j, end: t + j.dur });
      snap(`${fit === 'first' ? 'First-fit' : fit === 'best' ? 'Best-fit' : 'Worst-fit'}: <b>${j.name}</b> (${j.size}K) placed in the hole at ${hole.s}K (size ${hole.z}K)${rest ? `, leaving a ${rest}K hole` : ''}. Big-enough holes: ${cand.length}. Runs until t=${t + j.dur}.`, { hl: j.i });
    }
  };
  snap('Initial memory: the OS occupies 0–400K, the rest is one big hole.');
  tryAlloc();
  let guard = 0;
  while (running.length && guard++ < 100) {
    t = Math.min(...running.map(r => r.end));
    const fin = running.filter(r => r.end === t);
    fin.forEach(r => { running.splice(running.indexOf(r), 1); const b = mem.find(x => x.p === r.name); b.p = null; delete b.pi; });
    merge();
    snap(`t=${t}: ${fin.map(r => '<b>' + r.name + '</b>').join(', ')} finishes → its memory becomes a hole (merged with adjacent holes if any).`);
    tryAlloc();
  }
  return steps;
}

// ---------- Multiprogramming vs batch (ch1) ----------
function mpSim(jobs, multi) {
  // jobs: [{name, b:[cpu,io,cpu,...]}]
  const J = jobs.map((j, i) => ({ ...j, i, k: 0, left: j.b[0], st: 'ready', ioEnd: -1 }));
  const cpu = [], io = J.map(() => []); let t = 0, cur = null; const ready = [];
  J.forEach(j => { if (multi || j.i === 0) ready.push(j.i); else j.st = 'new'; });
  let admitted = multi ? J.length : 1; const log = [];
  while (J.some(j => j.st !== 'done') && t < 200) {
    for (const j of J) if (j.st === 'io' && j.ioEnd === t) { j.st = 'ready'; j.k++; j.left = j.b[j.k]; ready.push(j.i); }
    if (cur == null && ready.length) cur = ready.shift();
    cpu.push(cur);
    J.forEach((j, i) => io[i].push(j.st === 'io'));
    if (cur != null) { const j = J[cur]; j.left--; if (j.left === 0) { j.k++; if (j.k < j.b.length) { j.st = 'io'; j.ioEnd = t + 1 + j.b[j.k]; } else { j.st = 'done'; if (!multi && admitted < J.length) { J[admitted].st = 'ready'; ready.push(admitted); admitted++; } } cur = null; } }
    t++;
  }
  const busy = cpu.filter(x => x != null).length;
  return { cpu, io, T: t, util: busy / t };
}

if (typeof module !== 'undefined') module.exports = { schedSim, safetyTrace, prSim, diskSim, rtSim, partSim, mpSim, vle, vadd, vsub };
