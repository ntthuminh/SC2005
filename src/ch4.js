// ================= CHAPTER 4: SYNCHRONIZATION =================
function switcher(el, label, opts, make) {
  const box = h('div'); let cur = opts[0][0];
  const sel = fSel(label, opts, cur, v => { cur = v; box.innerHTML = ''; make(box, v); });
  sel.style.marginBottom = '8px'; sel.style.display = 'flex';
  el.append(sel, box); make(box, cur);
}
chapter({
  t: 'Process Synchronization', short: 'Synchronization',
  lead: 'The hardest part of the course. Every animation here executes <b>one instruction at a time</b>. You choose which process runs the next instruction (i.e. you decide where context switches happen), or pick a preset scenario, and the system detects mutual-exclusion violations and deadlocks by itself.',
  sections: [
    {
      t: 'Race condition: counter++ and counter-- lose an update',
      why: [['Problem', '<code>counter++</code> looks like one statement but the CPU executes <b>3 machine instructions</b>: load into a register, add, store back. A context switch can happen <i>between</i> them.'], ['Consequence', 'The final value depends on how the processes interleave (a race condition). We need a mechanism that orders reads/writes of shared data → the critical-section problem.']],
      exam: 'Each process has its own “register” because on a context switch the register values are <b>saved in the PCB</b>. The two processes do not overwrite each other\'s registers; they overwrite the <code>counter</code> variable in memory.',
      mount(el) {
        let S;
        const code = [['register1 = counter', 'register1 = register1 + 1', 'counter = register1'], ['register2 = counter', 'register2 = register2 - 1', 'counter = register2']];
        const init = () => ({ mem: 5, ax: null, cur: null, pcb: [null, null], pc: [0, 0], ev: null, msg: 'counter = 5. P0 will run counter++, P1 will run counter--. The correct result is 5.' });
        function act(s0, i) {
          const out = []; let s = clone(s0); if (s.pc[i] >= 3) return out;
          if (s.cur !== i) {
            if (s.cur != null) s.pcb[s.cur] = s.ax;
            const from = s.cur; s.cur = i; s.ax = s.pcb[i]; s.ev = 'cs';
            s.msg = from == null ? `The CPU starts running P${i}.` : `<span class="why-chip">context switch</span> Save P${from}'s register (= ${s.pcb[from] ?? '–'}) into PCB${from}, load P${i}'s register from PCB${i} (= ${s.ax ?? '–'}).`;
            out.push(s); s = clone(s);
          }
          const k = s.pc[i]; s.ev = 'x' + k;
          if (k === 0) { s.ax = s.mem; s.msg = `P${i}: <code>${code[i][0]}</code> → loads counter = ${s.mem} into the register.`; }
          if (k === 1) { s.ax += i ? -1 : 1; s.msg = `P${i}: <code>${code[i][1]}</code> → register = ${s.ax}. Memory has <b>not</b> changed yet.`; }
          if (k === 2) { s.mem = s.ax; s.msg = `P${i}: <code>${code[i][2]}</code> → writes ${s.ax} into counter.`; }
          s.pc[i]++;
          if (s.pc[0] === 3 && s.pc[1] === 3) s.msg += s.mem === 5 ? ' <span class="ok">Result 5: correct.</span>' : ` <span class="bad">Result ${s.mem} ≠ 5: an update was lost!</span>`;
          out.push(s); return out;
        }
        const PRE = { slide: [0, 0, 1, 1, 0, 1], seq: [0, 0, 0, 1, 1, 1], six: [0, 0, 1, 1, 1, 0] };
        const run = seq => { let s = init(); const st = [s]; seq.forEach(i => act(s, i).forEach(x => { st.push(x); s = x; })); return st; };
        let pre = 'slide', bt = [];
        Player(el, {
          base: 1500,
          setup(P) {
            P.top.append(fSel('Interleaving:', [['slide', 'As on the slide → gives 4'], ['six', 'Variant → gives 6'], ['seq', 'Sequential P0 then P1 → gives 5'], ['', 'Step through instructions yourself']], pre, v => { pre = v; P.setSteps(v ? run(PRE[v]) : [init()]); }));
            bt = [0, 1].map(i => btn(`▶ Next instruction of P${i}`, () => act(P.cur(), i).forEach(x => P.push(x))));
            P.act.append(...bt, btn('↺ Reset', () => P.setSteps([init()])));
            S = new Stage(P.viz, 900, 300);
          },
          build: () => run(PRE[pre]),
          after(P) { const s = P.cur(); bt.forEach((b, i) => b.disabled = s.pc[i] >= 3); },
          render(s) {
            S.begin();
            S.box('cpu', { x: 340, y: 8, w: 220, h: 92, cls: 'hw', html: '' });
            S.box('cpuT', { x: 350, y: 12, w: 200, h: 16, cls: 'ttl', html: 'CPU' + (s.cur != null ? ' · running P' + s.cur : '') });
            S.box('ax', { x: 360, y: 36, w: 180, h: 50, cls: 'big ' + (s.ev && s.ev[0] === 'x' ? 'hl' : ''), html: `<span style="font-size:12px;font-weight:500;margin-right:8px">register</span>${s.ax ?? '–'}` });
            S.box('kz', { x: 10, y: 120, w: 880, h: 70, cls: 'zone kern', html: 'Kernel space' });
            [0, 1].forEach(i => S.box('pcb' + i, { x: i ? 640 : 40, y: 135, w: 220, h: 44, cls: s.ev === 'cs' ? 'hl' : 'kern', html: `PCB${i} · saved register = <b>${s.pcb[i] ?? '–'}</b>` }));
            S.box('uz', { x: 10, y: 200, w: 880, h: 92, cls: 'zone user', html: 'User space (shared memory)' });
            S.box('ctr', { x: 360, y: 225, w: 180, h: 56, cls: 'big ' + (s.ev === 'x2' || s.ev === 'x0' ? 'hl' : 'user'), html: `<span style="font-size:12px;font-weight:500;margin-right:8px">counter</span>${s.mem}` });
            [0, 1].forEach(i => code[i].forEach((c, k) => S.box(`c${i}${k}`, { x: i ? 630 : 20, y: 8 + k * 32, w: 250, h: 28, cls: 'code ' + (s.cur === i && s.pc[i] - 1 === k && s.ev !== 'cs' ? 'hl' : s.pc[i] > k ? 'dim' : ''), html: (s.pc[i] === k ? '➤ ' : '  ') + c, bc: pcol(i) })));
            if (s.ev === 'x0') S.line('rd', { pts: [[450, 225], [450, 86]], c: 'acc', arrow: true });
            if (s.ev === 'x2') S.line('wr', { pts: [[450, 86], [450, 225]], c: 'hl', arrow: true, thick: true });
            if (s.ev === 'cs') S.line('sw', { pts: [[360, 100], [s.cur ? 640 : 260, 140]], c: 'hl', arrow: 'both', dash: true });
            S.end();
          }
        });
      }
    },
    {
      t: 'Critical section in software: Algorithms 1, 2, 3 (Peterson)',
      why: [['Khung chung', '<code>entry section → critical section → exit section → remainder section</code>. The entry/exit sections must be designed to satisfy 3 properties.'], ['3 properties', '<b>Mutual exclusion</b>: at most 1 process in the CS. <b>Progress</b>: if the CS is free and someone wants in, the choice cannot be postponed forever (processes in their remainder cannot block it). <b>Bounded waiting</b>: after requesting entry, the number of times others go first is bounded.'], ['Evolution', 'Alg 1 uses <code>turn</code> → breaks progress because it does not know whether the other side wants in. Alg 2 uses <code>flag[]</code> to know who wants in → breaks progress because both raise their flags and defer to each other forever. Alg 3 combines both: raise your flag <i>and</i> give away the turn, so <code>turn</code> arbitrates under contention → all 3 properties hold.']],
      exam: 'In Alg 3, each process sets <code>turn = k</code> (giving way to the other). Whoever writes <code>turn</code> <b>last</b> must wait. Alg 1\'s progress fails because turns are forced to alternate strictly.',
      mount(el) {
        const mk = alg => [0, 1].map(i => {
          const k = 1 - i, cs = { t: 'critical section', z: 'cs' }, rem = { t: 'remainder section', z: 'rem' };
          if (alg === '1') return { name: 'P' + i, code: [{ t: `while (turn != ${i});`, z: 'entry', spin: st => st.vars.turn !== i }, cs, { t: `turn = ${k};`, z: 'exit', run: st => { st.vars.turn = k; } }, rem] };
          if (alg === '2') return { name: 'P' + i, code: [{ t: `flag[${i}] = true;`, z: 'entry', run: st => { st.vars.flag[i] = true; } }, { t: `while (flag[${k}]);`, z: 'entry', spin: st => st.vars.flag[k] }, cs, { t: `flag[${i}] = false;`, z: 'exit', run: st => { st.vars.flag[i] = false; } }, rem] };
          return { name: 'P' + i, code: [{ t: `flag[${i}] = true;`, z: 'entry', run: st => { st.vars.flag[i] = true; } }, { t: `turn = ${k};`, z: 'entry', run: st => { st.vars.turn = k; } }, { t: `while (flag[${k}] && turn == ${k});`, z: 'entry', spin: st => st.vars.flag[k] && st.vars.turn === k }, cs, { t: `flag[${i}] = false;`, z: 'exit', run: st => { st.vars.flag[i] = false; } }, rem] };
        });
        const PRE = {
          '1': [{ name: 'Progress violated', seq: [0, 0, 0, 1, 1, 1, 1, 1, 1, 1], stay: [0], intro: 'turn = 0. P0 will enter the CS, leave, then stay in its remainder for a <b>very long time</b>.', outro: '<b>Progress ✗</b>: the CS is free and only P1 wants in, but P1 must wait for P0 (in its remainder) to hand back the turn. A process in its remainder has blocked someone else.' }, { name: 'Normal alternation', seq: [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0] }],
          '2': [{ name: 'Deadlock (both raise flags)', seq: [0, 1, 0, 1, 0, 1], intro: 'Watch what happens when a context switch occurs right after P0 sets its flag.', outro: '<b>Progress ✗</b>: both set flag = true and wait for the other to lower it → they spin forever.' }, { name: 'No contention', seq: [0, 0, 0, 0, 0, 1, 1, 1, 1] }],
          '3': [{ name: 'Simultaneous contention', seq: [0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1], intro: 'Both want to enter at almost the same time.', outro: '<b>Turn</b> arbitrates: P1 wrote turn last (turn = 0), so P1 yields and P0 goes first. When P0 leaves (flag[0]=false), P1 enters immediately. ME, progress and bounded waiting all hold.' }, { name: 'P1 is in its remainder, P0 enters freely', seq: [0, 0, 0, 0, 0, 0, 0, 0, 0], stay: [1] }]
        };
        const BADGE = { '1': ['✓', '✗', '✓'], '2': ['✓', '✗', '✓'], '3': ['✓', '✓', '✓'] };
        switcher(el, 'Algorithm:', [['3', 'Algorithm 3 (Peterson): flag + turn'], ['2', 'Algorithm 2: flag[]'], ['1', 'Algorithm 1: turn']], (box, a) => {
          const b = BADGE[a]; box.append(h('div', { class: 'row', style: 'margin-bottom:8px', html: ['Mutual exclusion', 'Progress', 'Bounded waiting'].map((t, k) => `<span class="chip ${b[k] === '✓' ? 'ok' : 'bad'}">${b[k]} ${t}</span>`).join(' ') }));
          CCS(box, { procs: mk(a), init: () => ({ vars: a === '1' ? { turn: 0 } : a === '2' ? { flag: [false, false] } : { flag: [false, false], turn: 0 } }), presets: PRE[a], stayRem: true });
        });
      }
    },
    {
      t: 'Hardware support: atomic TestAndSet',
      why: [['Problem', 'Software solutions are hard to extend beyond 2 processes.'], ['Idea', 'The CPU provides an <b>atomic</b> instruction (cannot be interrupted midway): <code>TestAndSet</code> reads the old value, writes <code>true</code> and returns the old value in one indivisible step. Whoever gets <code>false</code> has acquired the lock.'], ['Limitation', 'It achieves mutual exclusion and progress but does <b>not</b> guarantee bounded waiting: the process releasing the lock may grab it again before the waiting process gets to run.']],
      mount(el) {
        const procs = [0, 1].map(i => ({ name: 'P' + i, code: [
          { t: 'while (TestAndSet(&lock));', z: 'entry', spin: st => st.vars.lock, run: st => { st.vars.lock = true; }, say: () => 'TestAndSet reads lock = <b>false</b>, writes true, returns false — <b>one atomic instruction</b> (interrupts disabled) → enter the CS.' },
          { t: 'critical section', z: 'cs' }, { t: 'lock = false;', z: 'exit', run: st => { st.vars.lock = false; } }, { t: 'remainder section', z: 'rem' }] }));
        const seq = [0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1];
        CCS(el, {
          procs, init: () => ({ vars: { lock: false } }),
          presets: [{ name: 'Bounded waiting fails (RR quantum expires while P0 holds the lock)', seq, intro: 'Suppose the RR quantum always switches P0 out <b>exactly while it holds the lock</b>.', outro: 'P1 has spun many times while P0 enters the CS again and again. There is no bound → <b>bounded waiting ✗</b>.' }, { name: 'Two processes compete for the lock', seq: [0, 1, 1, 0, 0, 1, 1, 1] }],
          extra(st, e) { e.innerHTML = `<div class="formula" style="margin-top:10px">boolean TestAndSet(boolean *target) {   <span class="mut">// the whole function = 1 atomic machine instruction</span><br>&nbsp;&nbsp;boolean rv = *target;  <span class="mut">// take the old value</span><br>&nbsp;&nbsp;*target = true;       <span class="mut">// always write true</span><br>&nbsp;&nbsp;return rv;            <span class="mut">// false ⇒ I just got the lock</span><br>}</div><div class="mut" style="font-size:13px;margin-top:4px">CS entries: ${st.P.map((p, i) => 'P' + i + ' = ' + p.cs).join(', ')} · Spins: ${st.P.map((p, i) => 'P' + i + ' = ' + p.spins).join(', ')}</div>`; }
        });
      }
    },
    {
      t: 'Semaphore: busy waiting vs blocking (see how CPU is wasted)',
      why: [['Semaphore', 'An integer S accessed only through 2 atomic operations, <b>Wait</b> and <b>Signal</b>. A binary semaphore (≤ 1) works as a mutex; a counting semaphore counts resources.'], ['Busy waiting', '<code>while (S &lt;= 0); S--;</code>. No context switch cost, but it <b>burns CPU</b> when the CS is long.'], ['Blocking', 'Semaphore = <code>{value, list L}</code>. Wait: <code>value--; if (value &lt; 0) block();</code>. Signal: <code>value++; if (value &lt;= 0) wakeup(P);</code>. When value is negative, |value| = number of processes waiting in L.']],
      exam: 'With a blocking semaphore, S.value = −2 means <b>2</b> processes are in L. In Wait, the decrement <code>value--</code> must come <b>before</b> the test; if it came after block(), a context switch would be needed between the two and mutual exclusion would break.',
      mount(el) {
        let mode = 'block', S0 = 1, R;
        const PR = ['W', 'C', 'C', 'C', 'S', 'X'];
        function sim() {
          const n = 3, Q = 2; const P = range(n).map(i => ({ pc: 0, st: 'ready' })); const ready = range(n); let cur = null, ql = 0, sv = S0; const L = []; const segs = []; const snaps = []; let waste = 0;
          for (let t = 0; t < 80 && P.some(p => p.st !== 'done'); t++) {
            if (cur == null && ready.length) { cur = ready.shift(); ql = Q; P[cur].st = 'run'; }
            if (cur == null) { snaps.push({ t, cur, sv, L: [...L], ready: [...ready], P: clone(P), msg: `t=${t}: CPU idle (every process is waiting).` }); continue; }
            const p = P[cur], op = PR[p.pc]; let msg = `t=${t}: P${cur} `, kind = op;
            if (op === 'W') {
              if (mode === 'busy') { if (sv <= 0) { kind = 'spin'; waste++; msg += `Wait(S): S = ${sv} ≤ 0 → <b class="bad">spins, burning CPU</b>.`; } else { sv--; p.pc++; msg += `Wait(S): S = ${sv + 1} > 0 → S-- = ${sv}, enter the CS.`; } }
              else { sv--; p.pc++; if (sv < 0) { L.push(cur); p.st = 'blk'; msg += `Wait(S): S.value-- = ${sv} &lt; 0 → <b>block()</b>: joins queue L and gives up the CPU (no further CPU cost).`; kind = 'blk'; } else msg += `Wait(S): S.value-- = ${sv} ≥ 0 → enter the CS.`; }
            } else if (op === 'C') { p.pc++; msg += 'is in the critical section.'; }
            else if (op === 'S') { sv++; p.pc++; msg += `Signal(S): S = ${sv}.`; if (mode === 'block' && sv <= 0) { const w = L.shift(); P[w].st = 'ready'; ready.push(w); msg += ` value ≤ 0 → <b>wakeup(P${w})</b> → Ready.`; } }
            else if (op === 'X') { p.st = 'done'; msg += 'finished.'; }
            const l = segs[segs.length - 1]; const col = kind === 'spin' ? 'var(--bad)' : null;
            if (l && l.c === cur && l.e === t && l.spin === (kind === 'spin')) l.e++; else segs.push({ r: 0, s: t, e: t + 1, c: cur, t: kind === 'spin' ? 'spin' : 'P' + cur, col, spin: kind === 'spin' });
            ql--;
            if (p.st === 'done' || p.st === 'blk') cur = null; else if (ql === 0 && ready.length) { p.st = 'ready'; ready.push(cur); cur = null; msg += ' Quantum expired → back to Ready.'; }
            snaps.push({ t: t + 1, cur, sv, L: [...L], ready: [...ready], P: clone(P), msg, waste });
          }
          return { segs, snaps, T: snaps.length, waste };
        }
        Player(el, {
          base: 1300,
          setup(P) { P.top.append(fSel('Implementation:', [['block', 'Blocking (value + queue L)'], ['busy', 'Busy waiting (spinlock)']], mode, v => { mode = v; P.rebuild(); }), fSel('Initial S:', [['1', '1 (mutex)'], ['2', '2 (counting)']], '1', v => { S0 = +v; P.rebuild(); })); P.viz.append(h('div', { class: 'mut', style: 'font-size:13px;margin-bottom:6px', html: 'Three processes, each running: <code>Wait(S); CS (3 units); Signal(S);</code>. Single-core CPU with RR, quantum = 2.' })); P._v = h('div'); P.viz.append(P._v); },
          build() { R = sim(); const st = [{ t: 0, sv: S0, L: [], ready: [0, 1, 2], P: range(3).map(() => ({ pc: 0, st: 'ready' })), cur: null, msg: 'Start. Press ▶.' }, ...R.snaps]; st.push({ ...st[st.length - 1], fin: true, msg: `Done at t=${R.T}. CPU wasted spinning: <b>${R.waste}</b> units. ${mode === 'busy' ? 'Busy waiting burns CPU while waiting.' : 'Blocking wastes no CPU on waiting; the price is context switches.'}`, hold: 2 }); return st; },
          render(s, P) {
            const segs = R.segs;
            P._v.innerHTML = ganttSVG({ rows: ['CPU'], segs, T: R.T, now: s.fin ? null : s.t }) +
              `<div class="row" style="margin-top:8px"><div class="ccs-box"><div class="lab">S.value</div><div class="v" style="color:${s.sv < 0 ? 'var(--bad)' : 'inherit'}">${s.sv}</div><div class="mut" style="font-size:12px">${s.sv < 0 ? `= −${-s.sv} → ${-s.sv} process(es) waiting` : ''}</div></div>` +
              `<div class="grow"><div class="lab">Semaphore queue L</div><div class="qbox">${s.L.map(i => pchip('P' + i, i)).join('') || '<span class="mut">empty</span>'}</div><div class="lab" style="margin-top:6px">Ready queue</div><div class="qbox">${s.ready.map(i => pchip('P' + i, i)).join('') || '<span class="mut">empty</span>'}</div></div>` +
              `<div class="col">${s.P.map((p, i) => `<div>${pchip('P' + i, i)} ${p.st === 'done' ? '<span class="chip ok">xong</span>' : p.st === 'blk' ? '<span class="chip bad">blocked</span>' : s.cur === i ? '<span class="chip acc">running</span>' : '<span class="chip">ready</span>'} ${p.pc >= 1 && p.pc <= 4 && p.st !== 'blk' ? '<span class="chip hl">trong CS</span>' : ''}</div>`).join('')}</div></div>`;
          }
        });
      }
    },
    {
      t: 'Why Wait() must be atomic',
      why: [['Experiment', 'Wait(S) implemented in ordinary assembly (ldr, cmp, sub, str) is <b>not</b> atomic. Pick a scenario and press ▶ to watch two processes both slip into the CS.'], ['Conclusion', 'Every update and test of S must be atomic. The OS guarantees it by disabling interrupts (single core) or using an instruction like TestAndSet (multi-core).']],
      mount(el) {
        const procs = [0, 1].map(i => ({ name: 'P' + i, code: [
          { t: 'loop1: ldr ax, [S]', z: 'entry', run: (st, me) => { st.P[me].ax = st.vars.S; }, say: (st, me) => `ax = ${st.P[me].ax} (private to P${me}, saved in the PCB on a switch)` },
          { t: '       cmp ax, 0 ; jle loop1', z: 'entry', run: (st, me) => st.P[me].ax <= 0 ? { goto: 0 } : undefined, say: (st, me) => st.P[me].ax <= 0 ? 'ax ≤ 0 → back to loop1' : 'ax > 0 → continue' },
          { t: '       sub ax, 1', z: 'entry', run: (st, me) => { st.P[me].ax--; }, say: (st, me) => `ax = ${st.P[me].ax}` },
          { t: '       str [S], ax', z: 'entry', run: (st, me) => { st.vars.S = st.P[me].ax; }, say: st => `S = ${st.vars.S}` },
          { t: 'critical section', z: 'cs' }, { t: 'Signal(S)  // S++', z: 'exit', run: st => { st.vars.S++; } }, { t: 'remainder', z: 'rem' }] }));
        CCS(el, { procs, init: () => ({ vars: { S: 1 } }), presets: [{ name: 'Switch right after P0 tests S', seq: [0, 0, 1, 1, 1, 1, 0, 0], intro: 'S = 1: only 1 process may enter the CS.', outro: 'Both read S = 1 before either writes → <b>both enter the CS</b>.' }], extra(st, e) { e.innerHTML = `<div class="mut" style="font-size:13px;margin-top:6px">Saved ax registers: ${st.P.map((p, i) => `P${i}: ${p.ax ?? '–'}`).join(' · ')}</div>`; } });
      }
    },
    {
      t: 'Semaphores as a synchronization tool: enforcing order, and deadlock from misuse',
      why: [['Enforcing order', 'To make B (in Pk) run only after A (in Pi): use <code>flag = 0</code>; Pi runs <code>A; Signal(flag)</code>, Pk runs <code>Wait(flag); B</code>.'], ['Misuse', 'Two semaphores S, Q (both = 1) acquired in <b>opposite orders</b> by two processes → possible deadlock. A LIFO or priority-ordered queue can cause <b>starvation</b>.']],
      mount(el) {
        switcher(el, 'Example:', [['dl', 'Deadlock: Wait(S);Wait(Q) vs Wait(Q);Wait(S)'], ['ord', 'Enforce A before B']], (box, v) => {
          if (v === 'dl') CCS(box, { procs: [{ name: 'P0', code: [semW('S'), semW('Q'), { t: 'critical section', z: 'cs' }, semS('S'), semS('Q'), { t: 'remainder', z: 'rem' }] }, { name: 'P1', code: [semW('Q'), semW('S'), { t: 'critical section', z: 'cs' }, semS('Q'), semS('S'), { t: 'remainder', z: 'rem' }] }], init: () => ({ vars: {}, sem: { S: { v: 1, L: [] }, Q: { v: 1, L: [] } } }), presets: [{ name: 'Interleaving from the slide', seq: [0, 1, 1, 0], outro: 'P0 holds S and waits for Q, P1 holds Q and waits for S → <b>deadlock</b>.' }, { name: 'Lucky: no switch', seq: [0, 0, 0, 0, 0, 1, 1] }] });
          else CCS(box, { procs: [{ name: 'Pi', code: [{ t: 'remainder...', z: 'rem' }, { t: 'A: x = compute();', run: st => { st.vars.x = 42; } }, semS('flag'), { t: 'done', end: true }] }, { name: 'Pk', code: [semW('flag'), { t: 'B: print(x);', say: st => `in ra x = ${st.vars.x}` }, { t: 'done', end: true }] }], init: () => ({ vars: { x: '?' }, sem: { flag: { v: 0, L: [] } } }), presets: [{ name: 'Pk runs first', seq: [1, 0, 0, 0, 1], outro: 'Even though Pk runs first, B still runs only after A.' }] });
        });
      }
    },
    {
      t: 'Bounded buffer (producer–consumer) with 3 semaphores',
      why: [['Step 1: identify', 'Shared data: <code>buffer</code>, <code>in</code>, <code>out</code>. Shared resources: empty slots and full slots.'], ['Step 2: protect the data', 'A binary semaphore <code>mutex = 1</code> around buffer operations.'], ['Step 3: manage resources', 'Counting semaphores <code>empty = n</code> (empty slots) and <code>full = 0</code> (full slots). Take a resource → Wait, return a resource → Signal. No <code>counter</code> is needed because empty and full do the counting.']],
      exam: 'Reordering the consumer to <code>Wait(mutex); Wait(full);</code> → deadlock when the buffer is empty: the consumer holds mutex and sleeps on full, and the producer cannot get mutex to add an item.',
      mount(el) {
        const n = 3;
        const prod = { name: 'Producer', code: [{ t: 'produce nextProduced;', z: 'rem', run: st => { st.vars.next = 'x' + (++st.vars.k); }, say: st => `produce ${st.vars.next}` }, semW('empty'), semW('mutex'), { t: 'buffer[in] = item; in = (in+1)%n;', z: 'cs', run: st => { st.vars.buffer[st.vars.in] = st.vars.next; st.vars.in = (st.vars.in + 1) % n; } }, semS('mutex'), semS('full')] };
        const consumerCode = sw => [...(sw ? [semW('mutex'), semW('full')] : [semW('full'), semW('mutex')]), { t: 'item = buffer[out]; out = (out+1)%n;', z: 'cs', run: st => { st.vars.got = st.vars.buffer[st.vars.out]; st.vars.buffer[st.vars.out] = '·'; st.vars.out = (st.vars.out + 1) % n; }, say: st => `consume ${st.vars.got}` }, semS('mutex'), semS('empty'), { t: 'consume item;', z: 'rem' }];
        switcher(el, 'Consumer:', [['ok', 'Correct: Wait(full); Wait(mutex);'], ['sw', 'Sai: Wait(mutex); Wait(full);']], (box, v) => {
          CCS(box, {
            procs: [prod, { name: 'Consumer', code: consumerCode(v === 'sw') }], showVars: ['in', 'out'],
            init: () => ({ vars: { buffer: Array(n).fill('·'), in: 0, out: 0, k: 0, next: null, got: null }, sem: { mutex: { v: 1, L: [] }, empty: { v: n, L: [] }, full: { v: 0, L: [] } } }),
            presets: v === 'sw' ? [{ name: 'Empty buffer, consumer runs first → deadlock', seq: [1, 1, 0, 0, 0], outro: 'The consumer holds mutex and sleeps on full; the producer sleeps on mutex → <b>deadlock</b>.' }] : [{ name: 'Fill the buffer, then the producer is blocked', seq: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0], outro: 'The producer blocks when empty = 0 and is woken by the consumer\'s Signal(empty).' }, { name: 'Consumer runs before anything is produced', seq: [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1] }],
            extra(st, e) {
              const b = st.vars.buffer;
              e.innerHTML = `<div class="lab" style="margin-top:10px">Bounded buffer (n = ${n})</div><div class="row">${b.map((x, i) => `<div style="width:76px;text-align:center"><div class="ccs-box" style="min-width:0;text-align:center;background:${x !== '·' ? 'var(--acc-soft)' : 'var(--panel)'}"><div class="v">${x}</div></div><div class="mut" style="font-size:12px">[${i}] ${st.vars.in === i ? '<b class="acct">in</b>' : ''} ${st.vars.out === i ? '<b class="hlt">out</b>' : ''}</div></div>`).join('')}</div>`;
            }
          });
        });
      }
    },
    {
      t: 'Dining philosophers & ways to prevent deadlock',
      why: [['The problem', '5 philosophers, 5 chopsticks (each a binary semaphore). To eat, one must hold both the left chopstick <code>chopstick[i]</code> and the right one <code>chopstick[(i+1)%5]</code>.'], ['Naive solution', 'Everyone picks up the left chopstick first. If all 5 pick up their left one and then a context switch happens → each holds 1 chopstick and waits for the other → <b>deadlock</b>.'], ['Fixes', 'At most 4 hungry at once; pick up only when both are free; odd/even asymmetry; pick up in numbered order; release the first if the second is unavailable. Each fix breaks one deadlock condition (see Chapter 5).']],
      mount(el) {
        const N = 5, cn = i => 'c' + i;
        const chW = c => ({ t: `Wait(chopstick[${c}]);`, z: 'entry', run: (st, me) => { const s = st.sem[cn(c)]; s.v--; if (s.v < 0) { s.L.push(me); return 'block'; } st.vars.own[c] = me; }, say: (st, me, r) => r === 'block' ? `chopstick ${c} is held by P${st.vars.own[c]} → <b>block</b>` : `pick up chopstick ${c}` });
        const chS = c => ({ t: `Signal(chopstick[${c}]);`, z: 'exit', run: st => { const s = st.sem[cn(c)]; s.v++; st.vars.own[c] = null; if (s.v <= 0) { const p = s.L.shift(); st.P[p].blocked = false; st.vars.own[c] = p; st.woke = p; } }, say: (st) => st.woke != null ? `put the chopstick down → handed straight to the waiting P${st.woke}` : 'put the chopstick down' });
        const think = { t: 'think;', z: 'rem' }, eat = { t: 'eat;', z: 'cs' };
        function mk(strat) {
          return range(N).map(i => {
            const l = i, r = (i + 1) % N; let a = l, b = r;
            if (strat === 'asym' && i % 2 === 0) { a = r; b = l; }
            if (strat === 'order') { a = Math.min(l, r); b = Math.max(l, r); }
            let code;
            if (strat === 'max4') code = [think, semW('room'), chW(a), chW(b), eat, chS(a), chS(b), semS('room')];
            else if (strat === 'both') code = [think, { t: 'take both chopsticks if both are free (atomically)', z: 'entry', spin: st => !(st.sem[cn(l)].v > 0 && st.sem[cn(r)].v > 0), run: (st, me) => { st.sem[cn(l)].v--; st.sem[cn(r)].v--; st.vars.own[l] = me; st.vars.own[r] = me; }, say: () => `pick up chopsticks ${l} and ${r} together` }, eat, chS(l), chS(r)];
            else if (strat === 'pre') code = [think, chW(l), { t: `if (chopstick ${r} busy) { release chopstick ${l}; go back to think }`, z: 'entry', run: (st, me) => { if (st.sem[cn(r)].v <= 0) { st.sem[cn(l)].v++; st.vars.own[l] = null; if (st.sem[cn(l)].v <= 0) { const p = st.sem[cn(l)].L.shift(); st.P[p].blocked = false; st.vars.own[l] = p; } return { goto: 0 }; } st.sem[cn(r)].v--; st.vars.own[r] = me; }, say: (st, me) => st.vars.own[r] === me ? `got chopstick ${r}` : `chopstick ${r} busy → <b>voluntarily releases</b> chopstick ${l} (allows preemption)` }, eat, chS(l), chS(r)];
            else code = [think, chW(a), chW(b), eat, chS(a), chS(b)];
            return { name: 'P' + i, code };
          });
        }
        switcher(el, 'Strategy:', [['naive', 'Naive: left then right'], ['max4', 'At most 4 hungry (semaphore room = 4)'], ['both', 'Pick up only when both are free (breaks hold & wait)'], ['pre', 'Release chopstick 1 if chopstick 2 is unavailable (breaks no preemption)'], ['asym', 'Odd: left→right, even: right→left (breaks circular wait)'], ['order', 'Lower-numbered chopstick first (breaks circular wait)']], (box, strat) => {
          const sem = {}; range(N).forEach(i => sem[cn(i)] = { v: 1, L: [] }); if (strat === 'max4') sem.room = { v: 4, L: [] };
          CCS(box, {
            procs: mk(strat), maxCS: 5, showVars: [],
            init: () => ({ vars: { own: Array(N).fill(null) }, sem: clone(sem) }),
            presets: [{ name: 'All 5 get hungry at once', seq: [0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 0, 1, 2, 3, 4], intro: 'Each one runs one instruction in turn: exactly the interleaving that deadlocks on the slide.' }],
            extra(st, e, conf) {
              const cx = 160, cy = 150, R = 105; let s = `<svg viewBox="0 0 320 300" width="320" style="max-width:100%;margin-top:10px"><circle cx="${cx}" cy="${cy}" r="62" fill="var(--panel2)" stroke="var(--line)"/>`;
              range(N).forEach(i => { const ang = (-90 + 72 * i) * Math.PI / 180; const x = cx + R * Math.cos(ang), y = cy + R * Math.sin(ang); const P = st.P[i], ln = conf.procs[i].code[P.pc];
                const eating = !P.blocked && ln.z === 'cs'; const held = st.vars.own.filter(o => o === i).length;
                const fill = P.blocked ? 'var(--bad)' : eating ? 'var(--ok)' : held ? 'var(--hl)' : 'var(--muted)';
                s += `<circle cx="${x}" cy="${y}" r="26" fill="${fill}"/><text x="${x}" y="${y + 5}" text-anchor="middle" style="fill:#fff;font-weight:700;font-size:14px">P${i}</text>`;
                s += `<text x="${x}" y="${y + (y > cy ? 44 : -32)}" text-anchor="middle" style="font-size:11px;fill:var(--muted)">${P.blocked ? 'waiting' : eating ? 'EATING' : held ? 'holds ' + held + ' chopstick(s)' : 'thinking'}</text>`; });
              range(N).forEach(c => { const o = st.vars.own[c]; let ang = (-90 + 72 * c - 36) * Math.PI / 180, r1 = 52, r2 = 82, col = 'var(--ink)';
                if (o != null) { const pa = (-90 + 72 * o) * Math.PI / 180; ang = pa + (c === o ? -0.33 : 0.33); r1 = 74; r2 = 100; col = pcol(o); }
                s += `<line x1="${cx + r1 * Math.cos(ang)}" y1="${cy + r1 * Math.sin(ang)}" x2="${cx + r2 * Math.cos(ang)}" y2="${cy + r2 * Math.sin(ang)}" stroke="${col}" stroke-width="6" stroke-linecap="round"/><text x="${cx + 40 * Math.cos(ang)}" y="${cy + 40 * Math.sin(ang) + 4}" text-anchor="middle" style="font-size:11px;fill:var(--muted)">${c}</text>`; });
              e.innerHTML = s + '</svg>';
            }
          });
        });
      }
    },
    {
      t: 'Readers–Writers (reader priority)',
      why: [['Requirement', 'Many readers may read concurrently; a writer needs exclusive access.'], ['Trick', 'Only the <b>first reader</b> blocks writers (<code>Wait(wrt)</code>) and only the <b>last reader</b> releases them (<code>Signal(wrt)</code>). The counter <code>readcount</code> is shared data, so it is protected by <code>mutex</code>.'], ['Consequence', 'Readers have priority: if readers keep arriving, a writer can <b>starve</b>.']],
      exam: 'While a writer is writing: the first reader blocks on <code>wrt</code> <b>while still holding mutex</b>, so later readers block on <code>mutex</code>, not on wrt.',
      mount(el) {
        const reader = nm => ({ name: nm, code: [semW('mutex'), { t: 'readcount++;', run: st => { st.vars.readcount++; } }, { t: 'if (readcount == 1) Wait(wrt);', run: (st, me) => { if (st.vars.readcount === 1) { const s = st.sem.wrt; s.v--; if (s.v < 0) { s.L.push(me); return 'block'; } } }, say: (st, me, r) => st.vars.readcount === 1 ? (r === 'block' ? 'first reader, writer is writing → <b>blocks on wrt (still holding mutex!)</b>' : 'first reader → locks wrt, keeping writers out') : 'not the first reader → skip' }, semS('mutex'), { t: 'reading...', z: 'cs' }, semW('mutex'), { t: 'readcount--;', run: st => { st.vars.readcount--; } }, { t: 'if (readcount == 0) Signal(wrt);', run: st => { if (st.vars.readcount === 0) { const s = st.sem.wrt; s.v++; if (s.v <= 0) { const p = s.L.shift(); st.P[p].blocked = false; st.woke = p; } } }, say: st => st.vars.readcount === 0 ? 'last reader → releases wrt' + (st.woke != null ? ', waking whoever is waiting' : '') : 'readers remain → keep wrt' }, semS('mutex'), { t: 'remainder', z: 'rem' }] });
        const writer = { name: 'W1', code: [semW('wrt'), { t: 'writing...', z: 'cs' }, semS('wrt'), { t: 'remainder', z: 'rem' }] };
        CCS(el, {
          procs: [reader('R1'), reader('R2'), writer], showVars: ['readcount'],
          viol: (csl) => csl.includes(2) && csl.length > 1,
          init: () => ({ vars: { readcount: 0 }, sem: { mutex: { v: 1, L: [] }, wrt: { v: 1, L: [] } } }),
          presets: [{ name: 'Two readers read together, the writer must wait', seq: [0, 0, 0, 0, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2], outro: 'R1 and R2 read concurrently. W1 waits on wrt until the last reader leaves.' }, { name: 'A writer is writing, two readers arrive', seq: [2, 0, 0, 0, 1, 2, 2, 0, 0, 1, 1, 1, 0], outro: 'Mid-scenario: R1 blocks on wrt (still holding mutex), so R2 blocks on mutex. When W1 finishes, R1 then R2 are woken in turn and read together.' }],
          extra(st, e, conf) { const inside = range(3).filter(k => !st.P[k].blocked && conf.procs[k].code[st.P[k].pc].z === 'cs'); e.innerHTML = `<div class="ccs-box" style="margin-top:10px;max-width:360px"><div class="lab">Database</div><div>${inside.length ? inside.map(k => pchip(conf.procs[k].name + (k === 2 ? ' ✍ ghi' : ' 📖 reading'), k)).join(' ') : '<span class="mut">free</span>'}</div></div>`; }
        });
      }
    }
  ],
  quiz: [
    { q: 'counter = 5, P0 runs counter++ and P1 runs counter-- concurrently (each is 3 machine instructions). The set of possible results?', o: ['{5}', '{4, 6}', '{4, 5, 6}', '{3, 4, 5, 6, 7}'], a: 2, e: 'Sequential gives 5; if one of the writes is overwritten you get 4 or 6.' },
    { q: 'Which property does Algorithm 1 (turn only) violate?', o: ['Mutual exclusion', 'Progress', 'Bounded waiting', 'None'], a: 1, e: 'If turn = 0 and P0 stays in its remainder for a long time, P1 cannot enter even though the CS is free.' },
    { q: 'When can Algorithm 2 (flag[]) get both processes stuck?', o: ['When both set flag = true before testing', 'Khi turn sai', 'When a process dies inside the CS', 'Never'], a: 0, e: 'P0: flag[0] = true → switch → P1: flag[1] = true → both loop on while(flag[k]) forever.' },
    { q: 'Which properties does TestAndSet guarantee?', o: ['All three', 'Mutual exclusion and progress, not bounded waiting', 'Only mutual exclusion', 'Progress and bounded waiting'], a: 1, e: 'The process that just released the lock can grab it again immediately, so another process may wait without bound.' },
    { q: 'A blocking semaphore has S.value = −3. This means:', o: ['An error', '3 processes are waiting in L', '3 resources are free', '3 processes are in the CS'], a: 1, e: 'Each Wait with no resource left decrements value and puts the process into L.' },
    { q: 'In the bounded buffer, if the consumer does Wait(mutex); Wait(full); then:', o: ['It is still correct', 'Deadlock when the buffer is empty', 'Deadlock when the buffer is full', 'Mutual exclusion is lost'], a: 1, e: 'The consumer holds mutex and sleeps on full; the producer needs mutex to add an item → nobody progresses.' },
    { q: 'Readers–writers (reader priority): a writer is writing, then R1 and R2 arrive. R2 blocks on:', o: ['wrt', 'mutex', 'readcount', 'it does not block'], a: 1, e: 'R1 takes mutex, readcount = 1, calls Wait(wrt) and blocks while still holding mutex. So R2 blocks at Wait(mutex).' },
    { q: 'Advantage of a busy-waiting semaphore over a blocking one?', o: ['No context switch overhead', 'No CPU waste', 'Avoids deadlock', 'Guarantees bounded waiting'], a: 0, e: 'From the slide: Pros: no context switch overhead; Cons: wastes CPU when the CS is long.' },
    { q: 'Which deadlock condition does the dining-philosophers fix “at most 4 hungry at once” break?', o: ['Mutual exclusion', 'Hold and wait', 'No preemption', 'Circular wait'], a: 3, e: 'The slide groups it (with odd-even and numbered chopsticks) under breaking circular wait: with 4 people and 5 chopsticks, someone is guaranteed to get both.' }
  ]
});
