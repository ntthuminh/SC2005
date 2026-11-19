// ================= CHAPTER 6: REAL-TIME OS =================
function rtCard(el, PRE, algs) {
  let pk = Object.keys(PRE)[0], tasks, alg, H, tblEl, res;
  const load = k => { const p = PRE[k]; tasks = clone(p.tasks); alg = p.alg; H = p.H; };
  load(pk);
  const periodic = () => tasks.some(t => t.T);
  function drawTbl(P) {
    tblEl.innerHTML = ''; const per = periodic(); const cols = per ? ['T', 'C', 'D'] : ['R', 'C', 'D'];
    const t = h('table', { class: 't' }, h('tr', null, h('th', null, 'Process'), ...cols.map(c => h('th', null, c)), h('th', null, per ? 'meaning' : '')));
    tasks.forEach((tk, i) => t.append(h('tr', null, h('td', { html: pchip(tk.name, i) }), ...cols.map(c => h('td', null, h('input', { type: 'number', min: c === 'R' ? 0 : 1, value: tk[c], 'aria-label': tk.name + ' ' + c, onchange: e => { tk[c] = Math.max(c === 'R' ? 0 : 1, +e.target.value || 0); P.rebuild(); } }))), h('td', { class: 'mut', style: 'font-size:12px' }, per ? `released every ${tk.T}, needs ${tk.C}, deadline = release + ${tk.D}` : `needs ${tk.C} within [${tk.R}, ${tk.R + tk.D})`))));
    tblEl.append(t);
    if (per) { const U = tasks.reduce((a, t) => a + t.C / t.T, 0); tblEl.append(h('div', { class: 'mut', style: 'font-size:12.5px;margin-top:4px' }, `Utilization U = Σ C/T = ${U.toFixed(3)} (for reference)`)); }
  }
  Player(el, {
    base: 1500,
    setup(P) {
      const as = fSel('Scheduler:', algs.map(a => [a, { RM: 'Rate Monotonic (fixed priority)', EDF: 'Earliest Deadline First', FCFS: 'FCFS', SJF: 'SJF', RR: 'Round Robin q=5' }[a]]), alg, v => { alg = v; P.rebuild(); });
      const hz = fNum('Simulate until t =', H, 10, 120, v => { H = v; P.rebuild(); });
      P.top.append(fSel('Process set:', Object.entries(PRE).map(([k, v]) => [k, v.n]), pk, v => { pk = v; load(v); as.sel.value = alg; hz.inp.value = H; drawTbl(P); P.rebuild(); }), as, hz);
      tblEl = h('div', { style: 'padding:10px 12px;border-bottom:1px solid var(--line);background:var(--panel);overflow-x:auto' }); P.top.after(tblEl); drawTbl(P);
    },
    build() {
      res = rtSim(tasks, alg, H, 5);
      const st = res.events.map(e => ({ t: e.t, msg: `<b>t = ${e.t}</b> · ` + e.log.join(' · ') }));
      st.push({ t: H, fin: true, msg: res.misses.length ? `<span class="bad">${res.misses.length} deadline miss(es)</span> (${res.misses.map(m => tasks[m.ti].name + ' at t=' + m.t).join(', ')}).` : '<span class="ok">Every deadline is met in the simulated window.</span>', hold: 2 });
      return st;
    },
    render(s, P) {
      const now = s.fin ? null : s.t, lim = x => now == null || x <= now;
      const marks = [];
      res.jobs.forEach(j => { if (lim(j.r)) marks.push({ x: j.r, r: j.ti, kind: 'rel', col: pcol(j.ti) }); if (j.d <= H && lim(j.d)) marks.push({ x: j.d, r: j.ti, kind: 'dl' }); });
      res.misses.forEach(m => { if (lim(m.t)) marks.push({ x: m.t, r: m.ti, kind: 'miss' }); });
      P.viz.innerHTML = ganttSVG({ rows: tasks.map(t => t.name), segs: res.segs.map(g => ({ r: g.ti, s: g.s, e: g.e, c: g.ti, t: tasks[g.ti].name + (tasks[g.ti].T ? '' : '') })), T: H, now, marks, extraTicks: res.jobs.filter(j => j.d <= H).map(j => j.d) }) +
        '<div class="legend"><span><b style="color:var(--ok)">↑</b> release</span><span><b>↓</b> deadline</span><span><b style="color:var(--bad)">●!</b> deadline miss</span></div>';
    }
  });
}
chapter({
  t: 'Real-Time Operating Systems (RTOS)', short: 'Real-Time OS',
  lead: 'Cyber-physical systems (airbags, pacemakers, flight control) collect sensor data, compute control laws and command actuators within a reasonable time, over and over. Their correctness also depends on <b>when</b> the result is produced.',
  sections: [
    {
      t: 'Real-time ≠ fast: real-time = predictable even in the worst case',
      why: [['Misconception', '“A system that is fast on average is good enough for real-time.” The joke “a man drowned in a river with an average depth of 20 cm” shows that the average says nothing about the deepest spot.'], ['Metric', 'An RTOS is judged by <b>timeliness / predictability</b> with respect to deadlines. The <b>worst case</b> matters more than the average case.']],
      mount(el) {
        const A = [3, 4, 3, 5, 3, 4, 25, 3], B = [8, 9, 8, 9, 8, 9, 9, 8], DL = 15;
        const steps = range(A.length + 1).map(k => ({ k, msg: k === 0 ? `Two systems each handle 8 requests, each with a deadline of ${DL} ms.` : k < A.length ? `Request ${k}: A answers in ${A[k - 1]} ms, B in ${B[k - 1]} ms.` : `Average: A = ${(A.reduce((a, b) => a + b) / 8).toFixed(2)} ms (faster), B = ${(B.reduce((a, b) => a + b) / 8).toFixed(2)} ms. But A once took <b class="bad">25 ms > deadline</b>. For an airbag, missing once is a failure. B is the real-time system.` }));
        Player(el, {
          build: () => steps, base: 1100,
          render(s, P) {
            const draw = (arr, name) => { const W = 400, Hh = 170, sc = 5; let g = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" style="max-width:${W}px" class="gantt"><text x="4" y="14" style="fill:var(--ink);font-weight:700">${name}</text>`;
              arr.slice(0, s.k).forEach((v, i) => { const bh = v * sc, x = 30 + i * 44; g += `<rect x="${x}" y="${Hh - 20 - bh}" width="34" height="${bh}" fill="${v > DL ? 'var(--bad)' : 'var(--acc)'}" rx="3"/><text x="${x + 17}" y="${Hh - 24 - bh}" text-anchor="middle" style="fill:var(--ink)">${v}</text>`; });
              g += `<line x1="24" x2="${W}" y1="${Hh - 20 - DL * sc}" y2="${Hh - 20 - DL * sc}" stroke="var(--hl)" stroke-width="2" stroke-dasharray="6 4"/><text x="${W - 4}" y="${Hh - 24 - DL * sc}" text-anchor="end" style="fill:var(--hl)">deadline ${DL}</text><line x1="24" x2="${W}" y1="${Hh - 20}" y2="${Hh - 20}" stroke="var(--line)"/></svg>`; return g; };
            P.viz.innerHTML = `<div class="row"><div class="grow">${draw(A, 'System A: fast on average')}</div><div class="grow">${draw(B, 'System B: slower but steady')}</div></div>`;
          }
        });
      }
    },
    {
      t: 'Specifying real-time processes: ⟨R, C, D⟩ and periodic ⟨T, C, D⟩',
      why: [['One-shot', '<b>⟨R, C, D⟩</b>: release time R, needs C units of CPU, relative deadline D → must receive all of C within [R, R+D).'], ['Periodic', 'Control systems repeat regularly (sensors send data periodically) → <b>⟨T, C, D⟩</b>: released at 0, T, 2T…; each instance is an ⟨R, C, D⟩. The absolute deadline of instance k = kT + D.']],
      mount(el) { rtCard(el, { a: { n: 'Slide: P1⟨0,5,10⟩, P2⟨5,10,35⟩, P3⟨20,10,30⟩', alg: 'EDF', H: 50, tasks: [{ name: 'P1', R: 0, C: 5, D: 10 }, { name: 'P2', R: 5, C: 10, D: 35 }, { name: 'P3', R: 20, C: 10, D: 30 }] }, b: { n: 'Slide: periodic P⟨10,5,7⟩', alg: 'EDF', H: 40, tasks: [{ name: 'P', T: 10, C: 5, D: 7 }] } }, ['EDF', 'FCFS']); }
    },
    {
      t: 'Why FCFS, SJF and RR fail for real-time',
      why: [['Reason', 'Classic algorithms optimize average waiting/turnaround and <b>ignore deadlines</b>. An urgent job (small D) can still be queued behind a long one.'], ['Try it', 'Same 5-process set as the slide: switch schedulers and count deadline misses.']],
      mount(el) { rtCard(el, { a: { n: 'Slide: P1⟨0,20,30⟩ P2⟨0,5,10⟩ P3⟨5,10,35⟩ P4⟨20,10,30⟩ P5⟨25,5,10⟩', alg: 'FCFS', H: 55, tasks: [{ name: 'P1', R: 0, C: 20, D: 30 }, { name: 'P2', R: 0, C: 5, D: 10 }, { name: 'P3', R: 5, C: 10, D: 35 }, { name: 'P4', R: 20, C: 10, D: 30 }, { name: 'P5', R: 25, C: 5, D: 10 }] } }, ['FCFS', 'SJF', 'RR', 'EDF']); }
    },
    {
      t: 'Rate Monotonic vs Earliest Deadline First',
      why: [['RM (fixed priority)', 'Priority by period T: <b>shorter T → higher priority</b>, fixed for every instance. Simple to implement (one queue per periodic process) and predictable for high-priority processes even under overload → very popular in industry.'], ['EDF (dynamic priority)', 'Prioritizes the instance with the earliest <b>absolute deadline</b> (not the parameter D). More powerful than RM, but the queue must be sorted online, and behaviour under overload is hard to predict.']],
      exam: 'RM ignores deadlines: with P3⟨20,2,14⟩, RM still gives P3 the lowest priority (largest T = 20), so P3 misses its deadline at t = 14. EDF handles it.',
      mount(el) {
        rtCard(el, {
          a: { n: 'Slide: P1⟨10,6,10⟩ P2⟨19,4,19⟩ P3⟨20,2,20⟩', alg: 'RM', H: 40, tasks: [{ name: 'P1', T: 10, C: 6, D: 10 }, { name: 'P2', T: 19, C: 4, D: 19 }, { name: 'P3', T: 20, C: 2, D: 20 }] },
          b: { n: 'Slide: change to P3⟨20,2,14⟩ → RM misses a deadline', alg: 'RM', H: 40, tasks: [{ name: 'P1', T: 10, C: 6, D: 10 }, { name: 'P2', T: 19, C: 4, D: 19 }, { name: 'P3', T: 20, C: 2, D: 14 }] },
          c: { n: 'Slide EDF: P1⟨10,6,10⟩ P2⟨19,4,17⟩ P3⟨20,2,14⟩', alg: 'EDF', H: 40, tasks: [{ name: 'P1', T: 10, C: 6, D: 10 }, { name: 'P2', T: 19, C: 4, D: 17 }, { name: 'P3', T: 20, C: 2, D: 14 }] }
        }, ['RM', 'EDF']);
      }
    }
  ],
  quiz: [
    { q: 'The main performance metric of an RTOS is:', o: ['Average throughput', 'Average waiting time', 'Timeliness/predictability with respect to deadlines (worst case)', 'CPU utilization'], a: 2, e: 'Real-time = predictable even in the worst case.' },
    { q: 'Periodic process ⟨T=10, C=5, D=7⟩. Absolute deadline of the 3rd instance (3rd release)?', o: ['27', '30', '37', '21'], a: 0, e: 'Releases at 0, 10, 20. The 3rd instance is released at 20 → deadline 20 + 7 = 27.' },
    { q: 'RM assigns priorities based on:', o: ['Absolute deadline', 'Period T (shorter = higher)', 'C', 'Arrival time'], a: 1, e: 'Rate monotonic: higher rate (shorter T) → higher, fixed priority.' },
    { q: 'EDF prioritizes by:', o: ['Smallest parameter D', 'Earliest absolute deadline of an instance', 'Smallest T', 'Smallest C'], a: 1, e: 'The slide stresses: by the instance\'s deadline, NOT the parameter D.' },
    { q: 'Advantage of RM over EDF?', o: ['Always meets more deadlines', 'Simple implementation, predictable for high-priority processes under overload', 'Dynamic priorities', 'No need to know T'], a: 1, e: 'EDF is more powerful but needs online sorting and is hard to predict under overload.' },
    { q: 'With P1⟨10,6,10⟩, P2⟨19,4,19⟩, P3⟨20,2,14⟩ under RM, who misses a deadline first, and when?', o: ['P2 at 19', 'P3 at 14', 'P1 at 10', 'Nobody'], a: 1, e: 'RM: P1 0–6, P2 6–10, P1 10–16; P3 only starts at 16, already past its deadline 14.' }
  ]
});

// ================= CHAPTER 7: VIRTUALIZATION =================
chapter({
  t: 'Virtualization', short: 'Virtualization',
  lead: '“All problems in computer science can be solved by another level of indirection” (David Wheeler). Virtualization is a layer of indirection that exports an abstraction <b>compatible</b> with the layer below while hiding physical names for isolation.',
  sections: [
    {
      t: 'Three virtualization mechanisms: multiplexing, aggregation, emulation',
      why: [['Multiplexing', 'One physical resource shared by many virtual entities (CPU, memory).'], ['Aggregation', 'Many physical resources look like one (RAID combining disks, a memory controller combining DIMMs, link aggregation).'], ['Emulation', 'A physical resource looks like a different kind, even one that does not exist: RAM disk, JVM, Rosetta, localhost.']],
      mount(el) {
        switcher(el, 'Mechanism:', [['mux', 'Multiplexing: 8 vCPUs on 4 cores'], ['agg', 'Aggregation: RAID combining disks'], ['emu', 'Emulation: Rosetta translating instructions']], (box, v) => {
          if (v === 'mux') {
            let S; const steps = range(5).map(k => ({ k, msg: k === 0 ? '4 VMs × 2 vCPUs = 8 vCPUs on a 4-core server (<b>overcommitment</b>). The host OS treats each vCPU as a process/thread and schedules it on real cores. Inside, each guest OS schedules its own processes onto its vCPUs.' : `Time slice ${k}: the host scheduler places vCPUs ${[0, 1, 2, 3].map(c => 'v' + ((c + (k - 1) * 4) % 8)).join(', ')} on the 4 cores. The other vCPUs wait. Overcommit works because not every VM is busy at the same time.` }));
            Player(box, { setup(P) { S = new Stage(P.viz, 900, 250); }, build: () => steps, base: 1700, render(s) { S.begin(); range(4).forEach(vm => { S.box('vm' + vm, { x: 10 + vm * 222, y: 10, w: 210, h: 90, cls: 'zone user', html: `VM${vm + 1} · guest OS` }); }); range(4).forEach(c => S.box('c' + c, { x: 40 + c * 222, y: 185, w: 150, h: 50, cls: 'hw', html: 'Core ' + (c + 1) })); range(8).forEach(v => { const vm = v >> 1; const slot = s.k ? (v - (s.k - 1) * 4 + 16) % 8 : -1; const on = s.k && slot < 4; S.box('v' + v, { x: on ? 55 + slot * 222 + (0) : 25 + vm * 222 + (v % 2) * 100, y: on ? 192 : 45, w: 90, h: 36, cls: 'tok', bg: pcol(vm), html: `v${v} <span style="font-weight:400;font-size:10px">(VM${vm + 1})</span>`, z: 3 }); }); S.box('hs', { x: 10, y: 120, w: 880, h: 40, cls: 'kern', html: 'Host OS / VMM: schedules vCPUs onto real cores (multiplexing in time and space)' }); S.end(); } });
          } else if (v === 'agg') {
            let S, mode = 'stripe';
            const build = () => { const st = [{ blk: [], msg: { stripe: 'Striping (RAID 0): N disks × capacity n → volume M = N·n. Fast thanks to parallel reads/writes, but losing 1 disk loses data.', mirror: 'Mirroring (RAID 1): 2 identical disks, M = N. Losing 1 disk still leaves all the data.', parity: 'Distributed parity (RAID 5): n ≥ 3 disks, M = N·(n−1). Each row has one parity block (XOR); losing 1 disk can still be recovered.' }[mode] }]; const blk = [];
              for (let b = 0; b < 6; b++) { if (mode === 'stripe') blk.push({ n: 'B' + b, d: b % 3, row: Math.floor(b / 3) }); else if (mode === 'mirror') { blk.push({ n: 'B' + b, d: 0, row: b }, { n: 'B' + b, d: 1, row: b, cp: true }); } else { const row = Math.floor(b / 2), pd = 2 - (row % 3), ds = [0, 1, 2].filter(x => x !== pd); blk.push({ n: 'B' + b, d: ds[b % 2], row }); if (b % 2) blk.push({ n: 'P' + row, d: pd, row, par: true }); } st.push({ blk: blk.map(x => ({ ...x })), msg: `Write B${b} to the virtual volume → the RAID controller places it on ${mode === 'stripe' ? 'disk ' + (b % 3 + 1) + ' (block i → disk (i mod n) + 1)' : mode === 'mirror' ? 'both disks' : 'one data disk' + (b % 2 ? ' and update parity P' + Math.floor(b / 2) : '')}.` }); if (mode === 'mirror' && b === 3) break; }
              return st; };
            Player(box, { setup(P) { P.top.append(fSel('Type:', [['stripe', 'Striping'], ['mirror', 'Mirroring'], ['parity', 'Distributed parity']], mode, v => { mode = v; P.rebuild(); })); S = new Stage(P.viz, 900, 260); }, build, base: 1200,
              render(s) { S.begin(); S.box('vol', { x: 250, y: 6, w: 400, h: 40, cls: 'acc', html: 'The single virtual volume the OS sees' }); const nd = mode === 'mirror' ? 2 : 3; range(3).forEach(d => S.box('d' + d, { x: 120 + d * 230, y: 70, w: 200, h: 180, cls: 'zone hw', op: d < nd ? 1 : 0, html: 'Disk ' + (d + 1) })); s.blk.forEach(b => S.box(`b${b.n}${b.d}`, { x: 140 + b.d * 230, y: 96 + b.row * 34, w: 160, h: 28, cls: 'tok sq', bg: b.par ? 'var(--hl)' : pcol(+b.n.slice(1)), op: b.cp ? 0.75 : 1, html: b.n + (b.cp ? ' (copy)' : ''), from: [430, 14] })); S.end(); } });
          } else {
            let S; const X = ['mov eax, [rbx]', 'add eax, 5', 'mov [rbx], eax']; const A = ['ldr w0, [x1]', 'add w0, w0, #5', 'str w0, [x1]'];
            const st = [{ k: -1, msg: 'An x86-64 app running on an ARM Mac: there is no real x86 CPU. <b>Rosetta</b> emulates an x86 CPU (P = ARM, V = x86-64).' }, ...X.map((x, k) => ({ k, msg: `The x86 instruction <code>${x}</code> is dynamically translated into the ARM instruction <code>${A[k]}</code> and runs on a real ARM core.` })), { k: 3, msg: 'Other examples: <b>RAM disk</b> (DRAM pretending to be a disk for /tmp), <b>JVM</b> (a real CPU pretending to be a Java bytecode processor), <b>127.0.0.1</b> (no hardware, emulates a network card).' }];
            Player(box, { setup(P) { S = new Stage(P.viz, 900, 200); }, build: () => st, base: 1700, render(s) { S.begin(); S.box('l', { x: 10, y: 6, w: 280, h: 18, cls: 'ttl', html: 'x86-64 code (virtual resource)' }); S.box('r', { x: 610, y: 6, w: 280, h: 18, cls: 'ttl', html: 'ARM code actually running (physical resource)' }); X.forEach((x, k) => { S.box('x' + k, { x: 10, y: 30 + k * 40, w: 280, h: 32, cls: 'code ' + (s.k === k ? 'hl' : ''), html: x }); if (s.k >= k) S.box('a' + k, { x: 610, y: 30 + k * 40, w: 280, h: 32, cls: 'code ' + (s.k === k ? 'ok' : ''), html: A[k], from: [330, 30 + k * 40] }); }); S.box('tr', { x: 340, y: 50, w: 220, h: 70, cls: 'kern', html: '<b>Rosetta</b><span class="s">dynamic binary translation</span>' }); if (s.k >= 0 && s.k < 3) { S.line('i', { x1: 290, y1: 46 + s.k * 40, x2: 340, y2: 85, c: 'hl', arrow: true }); S.line('o', { x1: 560, y1: 85, x2: 610, y2: 46 + s.k * 40, c: 'ok', arrow: true }); } S.end(); } });
          }
        });
      }
    },
    {
      t: 'Virtual machines, Type 1 / Type 2 hypervisors, full vs para-virtualization',
      why: [['Definition (Popek & Goldberg, 1974)', 'A VM is an <b>efficient, isolated duplicate</b> of the real machine. The VMM (hypervisor) always keeps full control of the system and lets programs run directly on the hardware with only a minor slowdown.'], ['Why it took off', 'OS compatibility, server consolidation, multi-tenant platforms, VMs are easier to provision than real machines → the foundation of the cloud.']],
      mount(el) {
        let S, mode = 't1';
        const L = { t1: [['App', 'App', 'App'], ['Guest OS A', 'Guest OS B'], ['VMM = Host OS (Xen, vSphere)'], ['Hardware']], t2: [['App', 'App', 'App outside VMs'], ['Guest OS A', 'Guest OS B'], ['VMM (module KVM)', 'Host OS (Linux)'], ['Hardware']] };
        const steps = () => [{ msg: mode === 't1' ? '<b>Type 1</b> (bare-metal): the VMM is the host OS and runs directly on the hardware.' : '<b>Type 2</b>: the VMM is an extension of the host OS (KVM in Linux). Ordinary applications still run alongside the VMs.' }, { para: 1, msg: '<b>Full virtualization</b>: the guest OS runs unmodified, unaware of the hypervisor (VMware ESXi). <b>Para-virtualization</b>: the guest OS is <i>modified</i> to call the VMM\'s own API (hypercalls) (Xen), so the VMM need not virtualize the hard parts of the instruction set → more efficient.' }];
        Player(el, { setup(P) { P.top.append(fSel('Architecture:', [['t1', 'Type 1'], ['t2', 'Type 2']], mode, v => { mode = v; P.rebuild(); })); S = new Stage(P.viz, 900, 240); }, build: steps, base: 2500,
          render(s) { S.begin(); const lay = L[mode]; const cls = ['user', 'acc', 'kern', 'hw']; lay.forEach((row, r) => { const w = 880 / row.length; row.forEach((t, c) => S.box(`${r}_${c}_${t}`, { x: 10 + c * w, y: 10 + r * 56, w: w - 8, h: 48, cls: cls[r] + (s.para && r === 1 ? ' hl' : ''), html: t + (s.para && r === 1 ? ' <span class="s">para: modified, makes hypercalls</span>' : '') })); }); S.end(); } });
      }
    },
    {
      t: 'Limited direct execution: which instructions run directly, which trap',
      why: [['Bare-metal', 'Applications run unprivileged instructions directly on the CPU; system calls → kernel; privileged instructions trap to the OS.'], ['Trong VM', 'The same trick extended to the system level: the app <i>and the guest OS</i> run directly on the CPU (non-root mode). Only some privileged instructions of the guest OS <b>trap to the VMM</b>, which emulates them on the virtual hardware state. The result is both fast and isolated.']],
      mount(el) {
        let S, sc = 'add';
        const SC = {
          add: [['app', 'An application in the VM runs <code>add r1, r2</code>.'], ['cpu', 'An unprivileged instruction → runs <b>directly on the real CPU</b>, with no intervention. Almost as fast as a real machine.']],
          sys: [['app', 'The application makes the system call <code>read()</code>.'], ['gos', 'Trap into the <b>guest kernel</b> (still in non-root mode). The guest OS handles it as on a real machine.'], ['gos', 'The guest OS needs to command the disk → touches hardware (a privileged instruction)...'], ['vmm', '...<b>traps to the VMM</b> (VM exit). The VMM emulates it on a <b>virtual disk</b>, possibly mapped to an image file on the real disk.'], ['gos', 'The VMM returns the result (VM entry). The guest OS believes it just drove a real disk.'], ['app', 'The result goes back to the application.']],
          priv: [['gos', 'The guest OS executes a privileged instruction, e.g. changing the page-table base register or disabling interrupts.'], ['vmm', 'Because the guest OS runs in non-root mode, the instruction traps to the VMM. The VMM updates that VM\'s <b>virtual CPU</b> state without touching other VMs → <b>isolation</b>.'], ['gos', 'Back to the guest OS.']],
          para: [['gos', 'Para-virtualization: the modified guest OS makes a <b>hypercall</b> directly instead of executing a privileged instruction and trapping.'], ['vmm', 'The VMM handles the request explicitly, avoiding having to catch and decode hard-to-virtualize instructions.'], ['gos', 'Back to the guest OS.']]
        };
        Player(el, { setup(P) { P.top.append(fSel('Scenario:', [['add', 'Ordinary instruction (add)'], ['sys', 'System call needing I/O'], ['priv', 'Guest OS runs a privileged instruction'], ['para', 'Para-virt: hypercall']], sc, v => { sc = v; P.rebuild(); })); S = new Stage(P.viz, 900, 270); }, build: () => SC[sc].map(([at, msg]) => ({ at, msg })), base: 1700,
          render(s) { S.begin(); const Y = { app: 20, gos: 85, vmm: 150, cpu: 215 }; [['app', 'Application (guest user)', 'user'], ['gos', 'Guest OS (guest kernel) · non-root mode', 'acc'], ['vmm', 'VMM / Host OS · root mode', 'kern'], ['cpu', 'Real CPU', 'hw']].forEach(([k, t, c]) => S.box('L' + k, { x: 150, y: Y[k], w: 600, h: 50, cls: c + (s.at === k ? ' hl' : ''), html: t })); S.box('tok', { x: 770, y: Y[s.at] + 10, w: 110, h: 30, cls: 'tok', bg: 'var(--hl)', html: 'you are here', z: 5 }); S.end(); } });
      }
    }
  ],
  quiz: [
    { q: 'RAID combining several disks into one volume is an example of:', o: ['Multiplexing', 'Aggregation', 'Emulation', 'Para-virtualization'], a: 1, e: 'Many resources into one virtual resource = aggregation.' },
    { q: 'A RAM disk used for /tmp is an example of:', o: ['Multiplexing', 'Aggregation', 'Emulation', 'Partitioning'], a: 2, e: 'DRAM (P) is made to look like a disk (V): emulation.' },
    { q: 'What kind of hypervisor is KVM in Linux?', o: ['Type 1', 'Type 2', 'Para-virtual', 'Not a hypervisor'], a: 1, e: 'Slide: Type 2 = the VMM is an optional extension of the host OS, e.g. KVM and Linux.' },
    { q: 'The key difference of para-virtualization?', o: ['The guest OS needs no modification', 'The guest OS must be modified to use a dedicated guest–VMM API', 'No VMM is needed', 'Only works for Type 2'], a: 1, e: 'Full virtualization: the guest is unmodified and unaware of the hypervisor. Para: the guest is modified for efficiency.' },
    { q: 'A 4-core server runs 8 VMs with 2 vCPUs each. This is:', o: ['Impossible', 'CPU overcommitment', 'Aggregation', 'Emulation'], a: 1, e: 'Overcommit: total vCPUs > real cores, based on the assumption that not every VM is busy at once.' },
    { q: 'Inside a VM, which instructions trap to the VMM?', o: ['Every application instruction', 'Every guest OS instruction', 'Some privileged instructions issued by the guest OS', 'None'], a: 2, e: 'System-level limited direct execution: the app and guest OS use the CPU directly; only (some) privileged instructions trap.' },
    { q: 'Distributed parity with n = 4 disks of N GB each. Volume capacity?', o: ['4N', '3N', '2N', 'N'], a: 1, e: 'M = N·(n−1) = 3N, because each row reserves one block for parity.' }
  ]
});
