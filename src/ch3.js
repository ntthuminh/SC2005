// ================= CHAPTER 3: CPU SCHEDULING =================
chapter({
  t: 'CPU Scheduling', short: 'CPU Scheduling',
  lead: 'Processes alternate between CPU bursts and I/O bursts. The short-term scheduler picks who runs next from the ready queue. Every algorithm below is genuinely simulated on the data you enter: the Gantt chart, queues and metrics are computed, not pre-drawn.',
  sections: [
    {
      t: 'Three metrics of a process: turnaround, waiting, response',
      why: [['Why it matters', 'Users care about “how long until it\'s done” (turnaround), “how long it sat waiting for nothing” (waiting) and “how long until the first response” (response). Each algorithm optimizes a different metric.'], ['Definitions', 'Turnaround = Terminated − Admitted. Waiting = turnaround − CPU burst − I/O burst − event wait, i.e. only the time spent in <b>Ready</b>. Response = first time Running − Admitted.']],
      exam: 'Time spent waiting for I/O is <b>not</b> counted as waiting time. Waiting time is only the time in the ready queue.',
      mount(el) {
        let S;
        const parts = [['Ready', 0, 3], ['Running', 3, 6], ['Waiting (I/O)', 6, 9], ['Ready', 9, 11], ['Running', 11, 14]];
        const col = { Ready: 'var(--hl)', Running: 'var(--acc)', 'Waiting (I/O)': '#8a95a6' };
        const steps = [
          { k: 1, br: [], msg: 'The process is admitted at t=0 but the CPU is busy → it sits in <b>Ready</b> for 3 units.' },
          { k: 2, br: ['resp'], msg: 't=3: it runs for the first time → <b>Response time = 3</b>.' },
          { k: 3, br: ['resp'], msg: 't=6: it requests I/O → <b>Waiting</b> for 3 units. This is an I/O burst and is <i>not</i> counted as waiting time.' },
          { k: 4, br: ['resp'], msg: 't=9: I/O done → back to Ready, waits 2 more units.' },
          { k: 5, br: ['resp', 'tat'], msg: 't=14: runs to completion and terminates → <b>Turnaround = 14</b>.' },
          { k: 5, br: ['resp', 'tat', 'wt'], msg: '<b>Waiting = 14 − 6 (CPU) − 3 (I/O) = 5</b> = the sum of the Ready periods (3 + 2).', hold: 2 }
        ];
        Player(el, {
          setup(P) { S = new Stage(P.viz, 900, 210); }, build: () => steps,
          render(s) {
            S.begin(); const x = t => 40 + t * 58;
            parts.slice(0, s.k).forEach(([n, a, b], i) => S.box('p' + i, { x: x(a), y: 40, w: (b - a) * 58 - 2, h: 46, cls: 'tok', bg: col[n], html: n, from: [x(a), 40] }));
            range(15).forEach(t => S.box('t' + t, { x: x(t) - 15, y: 90, w: 30, h: 16, cls: 'lbl', html: t }));
            const br = (k, a, b, y, t, c) => { if (!s.br.includes(k)) return; S.line('b' + k, { pts: [[x(a), y - 6], [x(a), y], [x(b), y], [x(b), y - 6]], c }); S.box('bl' + k, { x: x(a), y: y + 2, w: (b - a) * 58, h: 18, cls: 'lbl', fg: `var(--${c})`, html: t }); };
            br('resp', 0, 3, 125, 'Response = 3', 'acc'); br('tat', 0, 14, 160, 'Turnaround = 14', 'ink');
            if (s.br.includes('wt')) { S.box('w1', { x: x(0), y: 10, w: 3 * 58 - 2, h: 22, cls: 'hl', html: 'wait 3' }); S.box('w2', { x: x(9), y: 10, w: 2 * 58 - 2, h: 22, cls: 'hl', html: 'wait 2' }); }
            S.end();
          }
        });
      }
    },
    {
      t: 'Scheduling simulator: FCFS · SJF · SRTF · Priority · Round Robin · multi-core',
      why: [['FCFS', 'Simple and non-preemptive, but suffers the <b>convoy effect</b>: short jobs wait behind long ones.'], ['SJF / SRTF', 'Prefers short bursts to avoid convoys. <b>Optimal</b> for average waiting time, but burst lengths must be known in advance. SRTF is the preemptive version.'], ['Priority', 'Smaller number = higher priority. Can cause <b>starvation</b>; the fix is <b>aging</b> (gradually raise the priority of long-waiting processes).'], ['Round Robin', 'Each process runs at most q, then goes to the back of the queue. Waits at most (n−1)q; good response. Large q → becomes FCFS; small q → many context switches.']],
      exam: 'SRTF preempts only when the new process\'s burst is <b>strictly smaller</b> than the running process\'s remaining time (equal does not preempt). Non-preemptive FCFS and SJF schedule only on Running → Waiting or Running → Terminated.',
      mount(el) {
        const PRE = {
          fcfs: { n: 'Slide FCFS: P1=24, P2=3, P3=3', alg: 'FCFS', c: 1, p: [[0, 24], [0, 3], [0, 3]] },
          fcfs2: { n: 'Slide FCFS reordered: P2, P3, P1', alg: 'FCFS', c: 1, p: [[0, 3], [0, 3], [0, 24]], names: ['P2', 'P3', 'P1'] },
          sjf: { n: 'Slide SJF/SRTF: (0,7) (2,4) (4,1) (5,4)', alg: 'SJF', c: 1, p: [[0, 7], [2, 4], [4, 1], [5, 4]] },
          srtf: { n: 'Slide SRTF (preemptive)', alg: 'SRTF', c: 1, p: [[0, 7], [2, 4], [4, 1], [5, 4]] },
          prio: { n: 'Priority (textbook): 10/3, 1/1, 2/4, 1/5, 5/2', alg: 'PRIO_NP', c: 1, p: [[0, 10, 3], [0, 1, 1], [0, 2, 4], [0, 1, 5], [0, 5, 2]] },
          rr: { n: 'Slide RR q=20: 53, 17, 68, 24', alg: 'RR', q: 20, c: 1, p: [[0, 53], [0, 17], [0, 68], [0, 24]] },
          srtf2: { n: 'Slide SRTF dual-core', alg: 'SRTF', c: 2, p: [[0, 7], [2, 4], [4, 1], [5, 4]] },
          rr2: { n: 'Slide RR q=20 dual-core', alg: 'RR', q: 20, c: 2, p: [[0, 53], [0, 17], [0, 68], [0, 24]] }
        };
        let cfg = { alg: 'FCFS', q: 4, cores: 1 }, procs = [];
        const loadPreset = k => { const p = PRE[k]; cfg = { alg: p.alg, q: p.q || cfg.q, cores: p.c }; procs = p.p.map((x, i) => ({ name: p.names ? p.names[i] : 'P' + (i + 1), arr: x[0], burst: x[1], prio: x[2] ?? 1 })); };
        loadPreset('fcfs');
        let tableEl, ctrls = {}, res;
        const ALG = [['FCFS', 'FCFS'], ['SJF', 'SJF (non-preemptive)'], ['SRTF', 'SRTF (SJF preemptive)'], ['PRIO_NP', 'Priority non-preemptive'], ['PRIO_P', 'Priority preemptive'], ['RR', 'Round Robin']];
        function drawTable(P) {
          tableEl.innerHTML = '';
          const t = h('table', { class: 't' }); t.append(h('tr', null, ...['Process', 'Arrival', 'Burst', 'Priority', ''].map(x => h('th', null, x))));
          procs.forEach((p, i) => {
            const inp = (k, min) => h('input', { type: 'number', min, value: p[k], 'aria-label': p.name + ' ' + k, onchange: e => { p[k] = Math.max(min, +e.target.value || 0); P.rebuild(); } });
            t.append(h('tr', null, h('td', { html: pchip(p.name, i) }), h('td', null, inp('arr', 0)), h('td', null, inp('burst', 1)), h('td', null, inp('prio', 0)), h('td', null, btn('✕', () => { if (procs.length > 1) { procs.splice(i, 1); drawTable(P); P.rebuild(); } }, '', 'Delete'))));
          });
          tableEl.append(t, h('div', { style: 'margin-top:6px' }, btn('+ Add process', () => { procs.push({ name: 'P' + (procs.length + 1), arr: 0, burst: 3, prio: 1 }); drawTable(P); P.rebuild(); })));
        }
        Player(el, {
          base: 1600,
          setup(P) {
            ctrls.pre = fSel('Example:', [['', '— pick a slide example —'], ...Object.entries(PRE).map(([k, v]) => [k, v.n])], '', v => { if (!v) return; loadPreset(v); ctrls.alg.sel.value = cfg.alg; ctrls.q.inp.value = cfg.q; ctrls.c.sel.value = cfg.cores; drawTable(P); P.rebuild(); });
            ctrls.alg = fSel('Algorithm:', ALG, cfg.alg, v => { cfg.alg = v; P.rebuild(); });
            ctrls.q = fNum('q =', cfg.q, 1, 100, v => { cfg.q = v; P.rebuild(); });
            ctrls.c = fSel('Cores:', [['1', '1 core'], ['2', '2 cores (global SMP)']], '1', v => { cfg.cores = +v; P.rebuild(); });
            P.top.append(ctrls.pre, ctrls.alg, ctrls.q, ctrls.c);
            tableEl = h('div', { style: 'padding:10px 12px;border-bottom:1px solid var(--line);background:var(--panel)' }); P.top.after(tableEl); drawTable(P);
            P._g = h('div'); P._live = h('div', { class: 'row', style: 'margin-top:10px' }); P._m = h('div', { style: 'margin-top:10px;overflow-x:auto' });
            P.viz.append(P._g, P._live, P._m);
          },
          build() {
            res = schedSim(procs, cfg);
            const st = res.events.map(ev => ({ t: ev.t, ev, msg: `<b>t = ${ev.t}</b> · ` + ev.log.join(' · ') }));
            st.push({ t: res.T, final: true, msg: `Done. <b>Average waiting = ${+res.avg.wt.toFixed(2)}</b>, average turnaround = ${+res.avg.tat.toFixed(2)}, average response = ${+res.avg.rt.toFixed(2)}. Dispatches: ${res.cs}.`, hold: 2 });
            return st;
          },
          render(s, P) {
            const rows = range(cfg.cores).map(c => 'Core ' + (c + 1));
            P._g.innerHTML = ganttSVG({ rows, segs: res.segs.map(g => ({ ...g, c: g.p, t: procs[g.p].name })), T: res.T, now: s.final ? null : s.t });
            const ev = s.ev || res.events[res.events.length - 1];
            const rq = ev.ready.map(i => pchip(procs[i].name, i, ` <span style="opacity:.8">(${ev.rem[i]})</span>`)).join('');
            const cores = ev.run.map((r, c) => `<div class="ccs-box"><div class="lab">Core ${c + 1}</div><div>${r == null ? '<span class="mut">idle</span>' : pchip(procs[r].name, r, ' left ' + ev.rem[r])}</div></div>`).join('');
            P._live.innerHTML = `${cores}<div class="grow"><div class="lab">Ready queue ${cfg.alg === 'RR' || cfg.alg === 'FCFS' ? '(head → tail)' : '(picked by ' + (cfg.alg.startsWith('PRIO') ? 'priority' : 'remaining burst') + ')'}</div><div class="qbox">${rq || '<span class="mut">empty</span>'}</div></div>`;
            const show = p => s.final || (p.fin != null && p.fin <= s.t);
            P._m.innerHTML = `<table class="t"><tr><th>Process</th><th>Arrival</th><th>Burst</th>${cfg.alg.startsWith('PRIO') ? '<th>Prio</th>' : ''}<th>Finish</th><th>Turnaround<br><span class="mut">fin − arr</span></th><th>Waiting<br><span class="mut">TAT − burst</span></th><th>Response<br><span class="mut">first − arr</span></th></tr>` +
              res.P.map(p => `<tr><td>${pchip(p.name, p.i)}</td><td>${p.arr}</td><td>${p.burst}</td>${cfg.alg.startsWith('PRIO') ? `<td>${p.prio}</td>` : ''}<td>${show(p) ? p.fin : '…'}</td><td>${show(p) ? p.tat : '…'}</td><td class="${show(p) ? 'acc' : ''}">${show(p) ? p.wt : '…'}</td><td>${s.final || (p.first != null && p.first <= s.t) ? p.rt : '…'}</td></tr>`).join('') +
              (s.final ? `<tr><th colspan="${cfg.alg.startsWith('PRIO') ? 5 : 4}">Average</th><td>${+res.avg.tat.toFixed(2)}</td><td class="hl">${+res.avg.wt.toFixed(2)}</td><td>${+res.avg.rt.toFixed(2)}</td></tr>` : '') + '</table>';
          }
        });
      }
    },
    {
      t: 'Choosing the Round Robin quantum q',
      why: [['Trade-off', 'Small q: fast response but many context switches (overhead). Large q: few switches but degenerates into FCFS.'], ['Surprising fact', 'Average turnaround does <b>not</b> change monotonically with q. Once q ≥ the longest burst, RR is identical to FCFS, so turnaround stops changing.']],
      mount(el) {
        const pr = [6, 3, 1, 7].map((b, i) => ({ name: 'P' + (i + 1), arr: 0, burst: b, prio: 0 }));
        const R = range(7).map(k => schedSim(pr, { alg: 'RR', q: k + 1 }));
        const steps = R.map((r, k) => ({ k, msg: `q = ${k + 1}: average turnaround = <b>${r.avg.tat}</b>, dispatches = ${r.cs}.${k + 1 >= 7 ? ' q ≥ longest burst (7) → RR behaves like FCFS.' : ''}` }));
        Player(el, {
          build: () => steps, base: 1600,
          render(s, P) {
            const ser = [{ name: 'Average turnaround', vals: R.map(r => r.avg.tat), col: 'var(--acc)' }, { name: 'Dispatches', vals: R.map(r => r.cs), col: 'var(--hl)' }];
            const r = R[s.k];
            P.viz.innerHTML = `<div class="row"><div class="grow"><div class="lab">P1=6, P2=3, P3=1, P4=7 (all arrive at 0)</div>${barChart({ labels: range(7).map(k => 'q=' + (k + 1)), series: ser, hi: s.k, showV: true, W: 520, H: 230 })}${legend(ser)}</div></div><div class="lab" style="margin-top:8px">Gantt with q = ${s.k + 1}</div>` +
              ganttSVG({ rows: ['CPU'], segs: r.segs.map(g => ({ ...g, c: g.p, t: pr[g.p].name })), T: r.T });
          }
        });
      }
    },
    {
      t: 'Multilevel queue: foreground (RR) and background (FCFS)',
      why: [['Problem', 'Interactive (foreground) processes need fast response, so they use RR. Background processes need no interaction, so they use FCFS for low overhead. A single shared queue cannot serve both.'], ['Idea', 'Split the ready queue into several queues, each with its own algorithm. Between queues: <b>fixed priority</b> (foreground first; background may starve) or <b>time-slice</b> (e.g. 80% / 20%).']],
      mount(el) {
        let mode = 'fixed';
        const F = [['F1', 0, 3], ['F2', 1, 3], ['F3', 5, 4], ['F4', 9, 3], ['F5', 12, 3]], B = [['B1', 0, 5], ['B2', 0, 3]];
        function sim() {
          const J = [...F.map(x => ({ n: x[0], a: x[1], r: x[2], fg: 1 })), ...B.map(x => ({ n: x[0], a: x[1], r: x[2], fg: 0 }))];
          J.forEach((j, i) => j.i = i);
          const fq = [], bq = []; let cur = null, ql = 0, t = 0; const segs = [], snaps = [];
          while (J.some(j => j.r > 0) && t < 60) {
            J.filter(j => j.a === t).forEach(j => (j.fg ? fq : bq).push(j.i));
            if (cur != null && J[cur].r === 0) cur = null;
            if (cur != null && J[cur].fg && ql === 0) { fq.push(cur); cur = null; }
            const pref = mode === 'fixed' ? 'F' : (t % 5 < 4 ? 'F' : 'B');
            if (cur != null && !J[cur].fg && fq.length && pref === 'F') { bq.unshift(cur); cur = null; }
            if (cur != null && J[cur].fg && pref === 'B' && bq.length) { fq.unshift(cur); cur = null; }
            if (cur == null) { if ((pref === 'F' && fq.length) || !bq.length) { if (fq.length) { cur = fq.shift(); ql = 2; } } else { cur = bq.shift(); } }
            snaps.push({ t, fq: [...fq], bq: [...bq], cur, pref });
            if (cur != null) { const l = segs[segs.length - 1]; if (l && l.c === cur && l.e === t) l.e++; else segs.push({ r: J[cur].fg ? 0 : 1, s: t, e: t + 1, c: cur, t: J[cur].n }); J[cur].r--; ql--; }
            t++;
          }
          return { J, segs, snaps, T: t };
        }
        let R;
        Player(el, {
          base: 900,
          setup(P) { P.top.append(fSel('Scheduling between queues:', [['fixed', 'Fixed priority (FG always first)'], ['slice', 'Time-slice 80% FG / 20% BG']], mode, v => { mode = v; P.rebuild(); })); },
          build() {
            R = sim();
            const st = R.snaps.map(s => ({ ...s, msg: `t=${s.t}: ${s.cur != null ? 'runs <b>' + R.J[s.cur].n + '</b>' : 'idle'}. ` + (mode === 'slice' ? `This time slice belongs to the <b>${s.pref === 'F' ? 'foreground' : 'background'}</b> queue.` : (s.bq.length && s.cur != null && R.J[s.cur].fg ? '<span class="bad">Background still has to wait</span> because foreground has work left.' : '')) }));
            const bStart = Math.min(...R.segs.filter(g => g.r === 1).map(g => g.s));
            st.push({ t: R.T, fin: true, msg: mode === 'fixed' ? `Background runs for the first time only at t=${bStart}. If foreground jobs keep arriving, background can <b>starve</b>.` : `Background runs from t=${bStart} thanks to its fixed 20% slice → no starvation; in exchange foreground is slightly slower.`, hold: 2 });
            return st;
          },
          render(s, P) {
            P.viz.innerHTML = ganttSVG({ rows: ['FG', 'BG'], segs: R.segs, T: R.T, now: s.fin ? null : s.t }) +
              (s.fin ? '' : `<div class="row" style="margin-top:8px"><div class="grow"><div class="lab">Foreground queue (RR)</div><div class="qbox">${s.fq.map(i => pchip(R.J[i].n, i)).join('') || '<span class="mut">empty</span>'}</div></div><div class="grow"><div class="lab">Background queue (FCFS)</div><div class="qbox">${s.bq.map(i => pchip(R.J[i].n, i)).join('') || '<span class="mut">empty</span>'}</div></div></div>`);
          }
        });
      }
    },
    {
      t: 'Multi-core: Partitioned (AMP) vs Global (SMP)',
      why: [['Partitioned', 'Each process is pinned to one core when created; each core schedules independently like a single core. Simple and low overhead, but assigning for balanced load is an <b>NP-hard</b> problem (like knapsack).'], ['Global', 'One shared queue; whichever core is free takes the next process. No assignment problem, but the implementation is more complex and processes may migrate between cores (taking their core-private cache data along).']],
      mount(el) {
        const pr = [['A', 8], ['B', 6], ['C', 2], ['D', 2], ['E', 2]].map(([n, b]) => ({ name: n, arr: 0, burst: b, prio: 0 }));
        const part = [[0, 1], [2, 3, 4]];
        const segP = part.flatMap((ids, c) => schedSim(ids.map(i => pr[i]), { alg: 'FCFS' }).segs.map(g => ({ r: c, s: g.s, e: g.e, c: ids[g.p], t: pr[ids[g.p]].name })));
        const G = schedSim(pr, { alg: 'FCFS', cores: 2 });
        const segG = G.segs.map(g => ({ ...g, c: g.p, t: pr[g.p].name }));
        const T = 14;
        const steps = range(T + 1).map(t => ({ t, msg: t === 0 ? 'Partitioned: core 1 gets {A, B}, core 2 gets {C, D, E} (a poor assignment). Global: one FCFS queue for both cores.' : t === 6 ? 't=6: under partitioned, <span class="bad">core 2 runs out of work and sits idle</span> while core 1 still has 8 units of work. Under global, the free core immediately takes the next job.' : t === 10 ? 't=10: global has finished everything.' : t === 14 ? 'Partitioned finishes at t=14, global at t=10. Same work, only distributed differently.' : `t=${t}` }));
        Player(el, {
          build: () => steps, base: 800,
          render(s, P) { P.viz.innerHTML = '<div class="lab">Partitioned (AMP)</div>' + ganttSVG({ rows: ['Core 1', 'Core 2'], segs: segP, T, now: s.t }) + '<div class="lab" style="margin-top:10px">Global (SMP)</div>' + ganttSVG({ rows: ['Core 1', 'Core 2'], segs: segG, T, now: s.t }); }
        });
      }
    }
  ],
  quiz: [
    { q: 'P1=24, P2=3, P3=3 arrive together in that order, FCFS. Average waiting time?', o: ['3', '17', '13', '27'], a: 1, e: '(0 + 24 + 27)/3 = 17. Reordering to P2, P3, P1 gives only 3: that is the convoy effect.' },
    { q: 'P1(0,7), P2(2,4), P3(4,1), P4(5,4). Average waiting time under SRTF?', o: ['4', '3', '2.5', '6'], a: 1, e: 'Gantt: P1 0–2, P2 2–4, P3 4–5, P2 5–7, P4 7–11, P1 11–16. Waiting = 9, 1, 0, 2 → 12/4 = 3.' },
    { q: 'With n processes in the ready queue and RR quantum q, how long at most does a process wait before its next CPU turn?', o: ['nq', '(n−1)q', 'q', 'n/q'], a: 1, e: 'It must wait for n−1 other processes, each using at most q.' },
    { q: 'Which algorithm is optimal for average waiting time (with known bursts)?', o: ['FCFS', 'RR', 'SJF/SRTF', 'Priority'], a: 2, e: 'SJF (its preemptive version is SRTF) is provably optimal for average waiting time.' },
    { q: 'On which state transitions does a non-preemptive scheduler run?', o: ['Running→Ready do timer', 'Running→Waiting and Running→Terminated (and when a core is idle and a process enters Ready)', 'Always on Waiting→Ready', 'At any time'], a: 1, e: 'Non-preemptive: a process gives up the CPU only when it terminates or waits for I/O/an event. If a core is idle and a process enters Ready, scheduling must happen too.' },
    { q: 'How is starvation fixed in priority scheduling?', o: ['Increase the quantum', 'Aging', 'Use FCFS', 'Disable preemption'], a: 1, e: 'Aging: gradually raise the priority of processes that have waited a long time.' },
    { q: 'RR with q larger than every CPU burst is equivalent to:', o: ['SJF', 'FCFS', 'SRTF', 'Priority'], a: 1, e: 'Nobody gets preempted, so the order is arrival order: FCFS.' },
    { q: 'Main drawback of partitioned scheduling (AMP)?', o: ['Clocks must be synchronized across cores', 'Assigning processes to cores can unbalance the load (an NP-hard problem)', 'Processes must move their cache between cores', 'RR cannot be used'], a: 1, e: 'Clock synchronization and cache migration are problems of global scheduling. AMP suffers from unbalanced assignment.' },
    { q: 'CPU utilization on a 2-core system over 10 time units, with total execution time on the cores = 15. Utilization?', o: ['150%', '75%', '66.7%', '50%'], a: 1, e: 'Utilization = total execution time / (total time × number of cores) = 15 / 20 = 75%.' }
  ]
});
