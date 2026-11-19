// ================= CHAPTER 5: DEADLOCKS =================
chapter({
  t: 'Deadlock', short: 'Deadlocks',
  lead: 'A deadlock is a set of blocked processes, each holding a resource and waiting for a resource held by another process in the set. This chapter goes from an intuitive picture → a graph model → the 4 conditions → prevention → avoidance (the Banker\'s algorithm).',
  sections: [
    {
      t: 'The one-lane bridge example',
      why: [['Picture', 'Each half of the bridge is a resource. Cars come from both sides; each car occupies one half and needs the other half to cross.'], ['Resolving it', 'One car must <b>back up</b> (release its resource, rollback). If other cars are queued behind it, several must back up. <b>Starvation</b> is possible if one side always has to give way.']],
      mount(el) {
        let S;
        const st = [
          { a1: 40, a2: -60, b1: 760, b2: 860, msg: 'The bridge has 1 lane. The left half (R1) and right half (R2) are two resources.' },
          { a1: 300, a2: 170, b1: 520, b2: 650, hlL: 'A1', hlR: 'B1', msg: 'A1 takes the left half (R1), B1 takes the right half (R2). More cars queue behind.' },
          { a1: 370, a2: 240, b1: 450, b2: 580, hlL: 'A1', hlR: 'B1', dead: true, msg: '<b>Deadlock</b>: A1 holds R1 and waits for R2, B1 holds R2 and waits for R1. Mutual exclusion (one car per lane) · hold & wait · no preemption (you cannot lift a car away) · circular wait.' },
          { a1: 370, a2: 240, b1: 680, b2: 810, hlL: 'A1', msg: 'Resolve: B1 <b>backs up</b> (releases R2). B2 behind it must back up too. That is the cost of rollback.' },
          { a1: 700, a2: 560, b1: 780, b2: 900, msg: 'A1, A2 cross. If cars keep arriving on the left and always get priority, the right side starves.' }
        ];
        Player(el, {
          setup(P) { S = new Stage(P.viz, 900, 200); }, build: () => st, base: 1900,
          render(s) {
            S.begin();
            S.box('wl', { x: 0, y: 70, w: 290, h: 70, cls: 'hw', html: '' }); S.box('wr', { x: 610, y: 70, w: 290, h: 70, cls: 'hw', html: '' });
            S.box('bL', { x: 290, y: 85, w: 160, h: 40, cls: s.hlL ? 'hl' : 'acc', html: 'R1 · left half' }); S.box('bR', { x: 450, y: 85, w: 160, h: 40, cls: s.hlR ? 'hl' : 'acc', html: 'R2 · right half' });
            S.box('river', { x: 290, y: 150, w: 320, h: 40, cls: 'lbl', html: '〰 river 〰' });
            const car = (k, x, i, dir) => S.box(k, { x, y: 92, w: 70, h: 26, cls: s.dead && (k === 'A1' || k === 'B1') ? 'bad' : 'tok', bg: s.dead && (k === 'A1' || k === 'B1') ? '' : pcol(i), html: (dir > 0 ? '' : '◀ ') + k + (dir > 0 ? ' ▶' : ''), z: 5 });
            car('A1', s.a1, 0, 1); car('A2', s.a2, 0, 1); car('B1', s.b1, 1, -1); car('B2', s.b2, 1, -1);
            S.end();
          }
        });
      }
    },
    {
      t: 'Resource-Allocation Graph (RAG) and graph reduction',
      why: [['Model', 'Circles = processes, rectangles = resource types (each dot is an instance). <b>Request edge</b> Pi → Rj, <b>assignment edge</b> Rj → Pi.'], ['Rules', 'No cycle ⇒ no deadlock. With a cycle: if every resource type has 1 instance ⇒ deadlock; with several instances ⇒ <i>possibly</i> deadlock. To know for sure, <b>reduce</b>: find a process whose requests can all be granted, let it finish and release everything, then repeat.']],
      exam: 'A cycle does not guarantee deadlock (example 3). Exams often ask for “a completion order”: the reduction order is the answer (P3→P2→P1 for example 1, P2→P4→P3→P1 for example 3).',
      mount(el) {
        const PRE = {
          a: { n: 'Example 1: no deadlock', P: { P1: [140, 150], P2: [430, 150], P3: [720, 150] }, R: { R1: [270, 30, 1], R3: [560, 30, 1], R2: [270, 260, 2], R4: [560, 260, 3] }, E: [['P1', 'R1', 'req'], ['R1', 'P2', 'asg'], ['R2', 'P1', 'asg'], ['R2', 'P2', 'asg'], ['P2', 'R3', 'req'], ['R3', 'P3', 'asg']] },
          b: { n: 'Example 2: deadlock (add P3 → R2)', P: { P1: [140, 150], P2: [430, 150], P3: [720, 150] }, R: { R1: [270, 30, 1], R3: [560, 30, 1], R2: [270, 260, 2], R4: [560, 260, 3] }, E: [['P1', 'R1', 'req'], ['R1', 'P2', 'asg'], ['R2', 'P1', 'asg'], ['R2', 'P2', 'asg'], ['P2', 'R3', 'req'], ['R3', 'P3', 'asg'], ['P3', 'R2', 'req']] },
          c: { n: 'Example 3: cycle but no deadlock', P: { P1: [140, 150], P2: [430, 30], P3: [720, 150], P4: [430, 270] }, R: { R1: [430, 120, 2], R2: [430, 200, 2] }, E: [['P1', 'R1', 'req'], ['R1', 'P2', 'asg'], ['R1', 'P3', 'asg'], ['P3', 'R2', 'req'], ['R2', 'P1', 'asg'], ['R2', 'P4', 'asg']] }
        };
        let g = clone(PRE.a), S, edl;
        function reduce() {
          const st = [], E = g.E.map(e => [...e]), done = [];
          const avail = () => { const a = {}; for (const r in g.R) a[r] = g.R[r][2] - E.filter(e => e[0] === r && e[2] === 'asg').length; return a; };
          const cyc = findCycle(E);
          st.push({ E: clone(E), done: [], hl: null, cyc, msg: `Initial graph. ${cyc ? '<b>Cycle found</b>: ' + cyc.join(' → ') + '. ' + (Object.values(g.R).every(r => r[2] === 1) ? 'Every resource has 1 instance ⇒ definitely deadlock.' : 'Some resource has several instances ⇒ <i>not necessarily</i> deadlock; try reducing.') : 'No cycle ⇒ no deadlock.'}` });
          while (true) {
            const a = avail(); const cand = Object.keys(g.P).filter(p => !done.includes(p)).find(p => { const need = {}; E.filter(e => e[0] === p).forEach(e => need[e[1]] = (need[e[1]] || 0) + 1); return Object.keys(need).every(r => need[r] <= a[r]); });
            if (!cand) break;
            const reqs = E.filter(e => e[0] === cand).map(e => e[1]);
            st.push({ E: clone(E), done: [...done], hl: cand, cyc: null, msg: `<b>${cand}</b> ${reqs.length ? 'xin ' + reqs.join(', ') + ' and ' + (reqs.length > 1 ? 'they are' : 'it is') + ' free (available: ' + reqs.map(r => r + '=' + a[r]).join(', ') + ')' : 'waits for no resource'} → can run to completion.` });
            for (let i = E.length - 1; i >= 0; i--) if (E[i][0] === cand || E[i][1] === cand) E.splice(i, 1);
            done.push(cand);
            st.push({ E: clone(E), done: [...done], hl: cand, cyc: null, msg: `${cand} finishes and releases all its resources → remove its edges.` });
          }
          const left = Object.keys(g.P).filter(p => !done.includes(p));
          st.push({ E: clone(E), done, hl: null, dead: left, cyc: null, msg: left.length ? `<span class="bad">No further reduction → DEADLOCK</span> among ${left.join(', ')}.` : `Fully reduced → <span class="ok">no deadlock</span>. Completion order: <b>${done.join(' → ')}</b>.`, hold: 2 });
          return st;
        }
        function findCycle(E) {
          const adj = {}; E.forEach(([a, b]) => (adj[a] = adj[a] || []).push(b));
          const stack = [], on = new Set(), vis = new Set(); let res = null;
          const dfs = u => { if (res) return; vis.add(u); on.add(u); stack.push(u); for (const v of adj[u] || []) { if (on.has(v)) { res = stack.slice(stack.indexOf(v)).concat(v); return; } if (!vis.has(v)) dfs(v); if (res) return; } on.delete(u); stack.pop(); };
          Object.keys(adj).forEach(u => { if (!vis.has(u)) dfs(u); });
          return res;
        }
        function drawEditor(P) {
          edl.innerHTML = '';
          const ps = h('select', { 'aria-label': 'Process' }), ty = h('select', { 'aria-label': 'Edge type' }), rs = h('select', { 'aria-label': 'Resource' });
          Object.keys(g.P).forEach(p => ps.append(h('option', null, p))); Object.keys(g.R).forEach(r => rs.append(h('option', null, r)));
          ty.append(h('option', { value: 'req' }, 'request (P → R)'), h('option', { value: 'asg' }, 'held (R → P)'));
          edl.append(h('span', { class: 'mut' }, 'Add edge: '), ps, ty, rs, btn('+', () => {
            const e = ty.value === 'req' ? [ps.value, rs.value, 'req'] : [rs.value, ps.value, 'asg'];
            if (e[2] === 'asg' && g.E.filter(x => x[0] === e[0] && x[2] === 'asg').length >= g.R[e[0]][2]) return;
            g.E.push(e); drawEditor(P); P.rebuild();
          }), ...g.E.map((e, i) => h('button', { class: 'chip', title: 'Click to delete', onclick: () => { g.E.splice(i, 1); drawEditor(P); P.rebuild(); } }, `${e[0]}→${e[1]} ✕`)));
        }
        Player(el, {
          base: 1700,
          setup(P) {
            P.top.append(fSel('Graph:', Object.entries(PRE).map(([k, v]) => [k, v.n]), 'a', v => { g = clone(PRE[v]); drawEditor(P); P.rebuild(); }));
            edl = h('div', { class: 'row', style: 'padding:8px 12px;gap:6px;align-items:center;border-bottom:1px solid var(--line);background:var(--panel)' }); P.top.after(edl); drawEditor(P);
            S = new Stage(P.viz, 900, 340);
          },
          build: reduce,
          render(s) {
            S.begin();
            for (const r in g.R) { const [x, y0, n] = g.R[r]; const y = y0 + 22; S.box('r' + r, { x: x - 45, y: y - 20, w: 90, h: 40, cls: 'hw', html: '' }); S.box('rl' + r, { x: x - 45, y: y - 38, w: 90, h: 16, cls: 'lbl', html: `<b>${r}</b> (${n})` }); range(n).forEach(k => S.box(`d${r}${k}`, { x: x - n * 9 + k * 18 - 4, y: y - 5, w: 10, h: 10, cls: 'tok', bg: 'var(--ink)', html: '' })); }
            for (const p in g.P) { const [x, y0] = g.P[p]; const y = y0 + 22; const dead = s.dead && s.dead.includes(p); S.box('p' + p, { x: x - 30, y: y - 22, w: 60, h: 44, cls: dead ? 'bad' : s.done.includes(p) ? 'ok' : s.hl === p ? 'hl' : 'acc', html: `<b>${p}</b>`, op: s.done.includes(p) && s.hl !== p ? 0.45 : 1 }); }
            const cnt = {};
            s.E.forEach((e, i) => {
              const [a, b, t] = e; const A0 = t === 'req' ? g.P[a] : g.R[a], B0 = t === 'req' ? g.R[b] : g.P[b]; const A = [A0[0], A0[1] + 22], B = [B0[0], B0[1] + 22];
              const k = a + b; cnt[k] = (cnt[k] || 0) + 1; const off = (cnt[k] - 1) * 10;
              const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
              const sA = t === 'req' ? 32 : 18, sB = t === 'req' ? 26 : 32;
              const inC = s.cyc && s.cyc.some((n, j) => j < s.cyc.length - 1 && n === a && s.cyc[j + 1] === b);
              S.line('e' + i + a + b, { x1: A[0] + ux * sA - uy * off, y1: A[1] + uy * sA + ux * off, x2: B[0] - ux * sB - uy * off, y2: B[1] - uy * sB + ux * off, c: inC ? 'bad' : t === 'req' ? 'hl' : 'acc', arrow: true, dash: t === 'req', thick: inC });
            });
            S.end();
          }
        });
        el.append(h('div', { class: 'legend' }, h('span', { html: '<b style="color:var(--hl)">- - →</b> request edge (P → R)' }), h('span', { html: '<b style="color:var(--acc)">——→</b> assignment edge (R → P)' }), h('span', { html: '<b style="color:var(--bad)">——</b> edge on a cycle' })));
      }
    },
    {
      t: 'The 4 necessary conditions & ways to handle deadlock',
      why: [['4 conditions', '<b>Mutual exclusion</b> · <b>Hold and wait</b> · <b>No preemption</b> · <b>Circular wait</b>. Deadlock is possible only when all 4 hold <i>simultaneously</i>. These are necessary, not sufficient.'], ['3 approaches', '(1) Ensure deadlock never happens: <b>prevention</b> (break ≥ 1 condition) or <b>avoidance</b> (grant only if still safe). (2) Let it happen, then detect and recover. (3) Ignore it: most OSes, including UNIX, do this.']],
      mount(el) {
        const C = [
          ['Mutual exclusion', 'A resource can be used by only one process at a time.', 'Usually <b>cannot be broken</b>: a chopstick (or a printer) is inherently non-shareable.'],
          ['Hold and wait', 'Holding at least one resource while waiting for more.', 'Request only when holding nothing, or request <b>everything at once</b> (a philosopher picks up only when both chopsticks are free). Downside: waste, possible starvation.'],
          ['No preemption', 'Resources are released only voluntarily.', 'If the second resource is unavailable, <b>release what you hold</b> (the philosopher puts the chopstick down). Suits resources whose state can be saved/restored, like CPU and memory.'],
          ['Circular wait', 'P0 waits for P1, P1 waits for P2, …, Pn waits for P0.', '<b>Number</b> the resources and request only in increasing order (lower-numbered chopstick first), odd-even, or at most 4 philosophers hungry at once.']
        ];
        const steps = [{ k: -1, msg: 'Deadlock occurs only when <b>all 4</b> conditions hold. Press ▶ to see each condition and how to break it. The Dining Philosophers section in Chapter 4 lets you try each fix.' }, ...C.map((c, k) => ({ k, msg: `<b>${c[0]}</b>: ${c[1]} → How to break it: ${c[2]}` }))];
        Player(el, {
          build: () => steps, base: 2600,
          render(s, P) { P.viz.innerHTML = `<div class="row">${C.map((c, k) => `<div class="ccs-box grow" style="min-width:180px;border-color:${s.k === k ? 'var(--hl)' : 'var(--line)'};background:${s.k === k ? 'var(--hl-soft)' : 'var(--panel)'};transition:all var(--dur)"><div class="lab">Condition ${k + 1}</div><b>${c[0]}</b><div class="mut" style="font-size:13px">${c[1]}</div>${s.k >= k ? `<div style="font-size:13px;margin-top:6px">✂ ${c[2]}</div>` : ''}</div>`).join('')}</div>`; }
        });
      }
    },
    {
      t: 'Safe state: a safe completion sequence',
      why: [['Definitions', 'A sequence &lt;P1, …, Pn&gt; is safe if each Pi\'s request can be satisfied by <b>Available + the resources held by all Pj (j &lt; i)</b>. The system is in a <b>safe state</b> if <i>at least one</i> safe sequence exists.'], ['Relationship', 'Safe ⇒ no deadlock. Unsafe ⇒ <i>possible</i> deadlock (not certain, since processes may release resources early). Deadlock avoidance = never enter an unsafe state.']],
      mount(el) {
        const H = [1, 1, 1], Rq = [1, 2, 3], A0 = 1; let order = [0, 1, 2];
        const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
        const check = o => { let w = A0; for (const i of o) { if (Rq[i] > w) return false; w += H[i]; } return true; };
        function build() {
          const st = [{ w: A0, k: -1, msg: `Available = ${A0}. Checking sequence &lt;${order.map(i => 'P' + (i + 1)).join(', ')}&gt;.` }]; let w = A0;
          for (let j = 0; j < 3; j++) { const i = order[j]; const ok = Rq[i] <= w; st.push({ w, k: j, ok, msg: `P${i + 1} needs ${Rq[i]}, Work = ${w} → ${ok ? '<span class="ok">enough</span>: runs to completion and returns ' + H[i] + ' → Work = ' + (w + H[i]) : '<span class="bad">not enough → the sequence is NOT safe</span>'}` }); if (!ok) return st; w += H[i]; }
          st.push({ w, k: 3, ok: true, msg: '<span class="ok">Safe sequence.</span> Since a safe sequence exists, the system is in a safe state.' }); return st;
        }
        Player(el, {
          setup(P) { P.top.append(h('span', { class: 'mut' }, 'Pick a sequence:'), ...perms.map(p => btn(p.map(i => 'P' + (i + 1)).join('→') + (check(p) ? ' ✓' : ' ✗'), () => { order = p; P.rebuild(); }))); },
          build, base: 1600,
          render(s, P) { P.viz.innerHTML = `<table class="t"><tr><th>Process</th><th>Hold</th><th>Request</th></tr>${[0, 1, 2].map(i => `<tr><td>${pchip('P' + (i + 1), i)}</td><td>${H[i]}</td><td class="${s.k >= 0 && order[s.k] === i ? (s.ok ? 'ok' : 'bad') : ''}">${Rq[i]}</td></tr>`).join('')}</table><div class="row" style="margin-top:10px"><div class="ccs-box"><div class="lab">Work</div><div class="v">${s.w}</div></div><div class="qbox grow">${order.map((i, j) => pchip('P' + (i + 1), i, j < s.k || (j === s.k && s.ok) ? ' ✓' : j === s.k ? ' ✗' : '')).join(' → ')}</div></div>`; }
        });
      }
    },
    {
      t: 'The Banker\'s algorithm: safety & resource-request (and detection)',
      why: [['Assumptions', 'Each process declares its <b>Max</b> for every resource type in advance and returns resources within finite time.'], ['Structure', 'Available[m], Max[n×m], Allocation[n×m], <b>Need = Max − Allocation</b>.'], ['Safety', 'Work = Available; find an unfinished i with Need[i] ≤ Work → Work += Allocation[i], Finish[i] = true; repeat. All Finish true ⇒ safe.'], ['Request', '(1) Request ≤ Need, otherwise error: exceeds Max. (2) Request ≤ Available, otherwise wait. (3) <b>Pretend to allocate</b>. (4) Run safety: safe → grant for real; unsafe → restore the old state and make it wait.']],
      exam: 'When several i qualify at once, any choice works: there can be many safe sequences. Here we keep scanning round-robin from the last pick, so snapshot T0 gives &lt;P1, P3, P4, P0, P2&gt;; the slide shows &lt;P1, P3, P4, P2, P0&gt;; both are correct. <b>Detection</b> (not examined) uses Request instead of Need and initializes Finish[i] = true if Allocation[i] = 0.',
      mount(el) {
        const T0 = { alloc: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]], max: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]], avail: [3, 3, 2] };
        const T1 = { alloc: [[0, 1, 0], [3, 0, 2], [3, 0, 2], [2, 1, 1], [0, 0, 2]], max: T0.max, avail: [2, 3, 0] };
        const D0 = { alloc: [[0, 1, 0], [2, 0, 0], [3, 0, 3], [2, 1, 1], [0, 0, 2]], max: [[0, 0, 0], [2, 0, 2], [0, 0, 0], [1, 0, 0], [0, 0, 2]], avail: [0, 0, 0] };
        const D1 = { ...D0, max: [[0, 0, 0], [2, 0, 2], [0, 0, 1], [1, 0, 0], [0, 0, 2]] };
        const PRE = { s0: ['Safety · snapshot T0 (slide)', 'safe', T0], r1: ['Request · P1 xin (1,0,2)', 'req', T0, 1, [1, 0, 2]], r2: ['Request · after granting P1: P0 requests (0,2,0)', 'req', T1, 0, [0, 2, 0]], r3: ['Request · after granting P1: P4 requests (3,3,0)', 'req', T1, 4, [3, 3, 0]], r4: ['Request · after granting P1: P4 requests (2,3,0)', 'req', T1, 4, [2, 3, 0]], r5: ['Request · after granting P1: P1 requests another (1,0,2)', 'req', T1, 1, [1, 0, 2]], d0: ['Detection (not examined) · slide, no deadlock', 'det', D0], d1: ['Detection (not examined) · P2 requests 1 more C', 'det', D1] };
        let mode, D, rp, rv; const load = k => { const p = PRE[k]; mode = p[1]; D = clone(p[2]); rp = p[3] ?? 1; rv = p[4] ? [...p[4]] : [1, 0, 2]; };
        load('s0'); let dataEl;
        const R = ['A', 'B', 'C'], fmt = v => v.join(' ');
        function drawData(P) {
          dataEl.innerHTML = '';
          const t = h('table', { class: 't' }); const m2 = mode === 'det' ? 'Request' : 'Max';
          t.append(h('tr', null, h('th', null, ''), h('th', { colspan: 3 }, 'Allocation'), h('th', { colspan: 3 }, m2)));
          D.alloc.forEach((row, i) => { const tr = h('tr', null, h('td', { html: pchip('P' + i, i) })); [['alloc', row], ['max', D.max[i]]].forEach(([k, r]) => r.forEach((v, j) => tr.append(h('td', null, h('input', { type: 'number', min: 0, value: v, 'aria-label': `${k} P${i} ${R[j]}`, onchange: e => { D[k][i][j] = Math.max(0, +e.target.value || 0); P.rebuild(); } }))))); t.append(tr); });
          const av = h('div', { class: 'row', style: 'align-items:center;margin-top:6px;gap:6px' }, h('span', { class: 'mut' }, 'Available:'), ...D.avail.map((v, j) => h('input', { type: 'number', min: 0, value: v, style: 'width:50px', 'aria-label': 'Available ' + R[j], onchange: e => { D.avail[j] = Math.max(0, +e.target.value || 0); P.rebuild(); } })));
          if (mode === 'req') av.append(h('span', { class: 'mut', style: 'margin-left:14px' }, 'Request of'), (() => { const s = h('select', { 'aria-label': 'Requesting process', onchange: e => { rp = +e.target.value; P.rebuild(); } }); D.alloc.forEach((_, i) => s.append(h('option', { value: i }, 'P' + i))); s.value = rp; return s; })(), ...rv.map((v, j) => h('input', { type: 'number', min: 0, value: v, style: 'width:50px', 'aria-label': 'Request ' + R[j], onchange: e => { rv[j] = Math.max(0, +e.target.value || 0); P.rebuild(); } })));
          dataEl.append(t, av);
        }
        function build() {
          const n = D.alloc.length, st = [];
          let alloc = clone(D.alloc), avail = [...D.avail]; const need0 = mode === 'det' ? clone(D.max) : D.max.map((m, i) => vsub(m, alloc[i]));
          let need = clone(need0);
          const base = (o, msg) => st.push({ alloc: clone(alloc), need: clone(need), avail: [...avail], ...o, msg });
          if (mode !== 'det') base({ showNeed: true }, '<b>Need = Max − Allocation</b> is computed for each process.');
          else base({}, 'Detection: use the current <b>Request</b> matrix instead of Need. Finish[i] = true initially if Allocation[i] = 0.');
          if (mode === 'req') {
            const i = rp;
            if (!vle(rv, need[i])) { base({ hlRow: i, bad: true }, `Step 1: Request<sub>${i}</sub> (${fmt(rv)}) ≤ Need<sub>${i}</sub> (${fmt(need[i])})? → <span class="bad">FALSE → error: the process exceeded its declared Max</span>. Rejected immediately.`); return st; }
            base({ hlRow: i }, `Step 1: Request<sub>${i}</sub> (${fmt(rv)}) ≤ Need<sub>${i}</sub> (${fmt(need[i])}) → <span class="ok">true</span>.`);
            if (!vle(rv, avail)) { base({ hlAvail: true, bad: true }, `Step 2: Request (${fmt(rv)}) ≤ Available (${fmt(avail)})? → <span class="bad">FALSE → not enough resources, P${i} must wait</span>.`); return st; }
            base({ hlAvail: true }, `Step 2: Request (${fmt(rv)}) ≤ Available (${fmt(avail)}) → <span class="ok">true</span>.`);
            const save = { alloc: clone(alloc), need: clone(need), avail: [...avail] };
            avail = vsub(avail, rv); alloc[i] = vadd(alloc[i], rv); need[i] = vsub(need[i], rv);
            base({ hlRow: i, hlAvail: true, pretend: true }, `Step 3: <b>Pretend to allocate</b>: Available = ${fmt(avail)}, Allocation<sub>${i}</sub> = ${fmt(alloc[i])}, Need<sub>${i}</sub> = ${fmt(need[i])}.`);
            const r = safetyTrace(avail, alloc, need, false); pushTrace(r);
            if (r.safe) base({ fin: r.fin, seq: r.seq, done: true }, `Step 4: safe (&lt;${r.seq.map(x => 'P' + x).join(', ')}&gt;) → <span class="ok">GRANT P${i} for real</span>.`);
            else { alloc = save.alloc; need = save.need; avail = save.avail; base({ fin: r.fin, bad: true, done: true }, `Step 4: <span class="bad">UNSAFE</span> → P${i} must wait; <b>restore</b> the old state.`); }
            return st;
          }
          const r = safetyTrace(avail, alloc, need, mode === 'det'); pushTrace(r);
          if (mode === 'det') base({ fin: r.fin, seq: r.seq, done: true, bad: !r.safe }, r.safe ? `All Finish = true → <span class="ok">no deadlock</span> (sequence &lt;${r.seq.map(x => 'P' + x).join(', ')}&gt;).` : `<span class="bad">DEADLOCK</span> among the processes with Finish = false: ${r.fin.map((f, i) => f ? null : 'P' + i).filter(Boolean).join(', ')}.`);
          else base({ fin: r.fin, seq: r.seq, done: true, bad: !r.safe }, r.safe ? `The system is <span class="ok">SAFE</span>, safe sequence &lt;${r.seq.map(x => 'P' + x).join(', ')}&gt;.` : '<span class="bad">UNSAFE</span>: no process has Need ≤ Work.');
          return st;
          function pushTrace(r) {
            const seq = [];
            r.trace.forEach(tr => {
              if (tr.done) { seq.push(tr.i); base({ work: tr.work, fin: tr.fin, hlRow: tr.i, ok: true, seq: [...seq] }, `P${tr.i} finishes and returns Allocation<sub>${tr.i}</sub> = ${fmt(alloc[tr.i])} → Work = <b>${fmt(tr.work)}</b>, Finish[${tr.i}] = true.`); }
              else base({ work: tr.work, fin: tr.fin, hlRow: tr.i, cmp: true, ok: tr.ok, seq: [...seq] }, `Finish[${tr.i}] = false. ${mode === 'det' ? 'Request' : 'Need'}<sub>${tr.i}</sub> = ${fmt(need[tr.i])} ≤ Work = ${fmt(tr.work)}? → ${tr.ok ? '<span class="ok">true</span>' : '<span class="bad">false, skip</span>'}`);
            });
          }
        }
        Player(el, {
          base: 1500,
          setup(P) { P.top.append(fSel('Example:', Object.entries(PRE).map(([k, v]) => [k, v[0]]), 's0', v => { load(v); drawData(P); P.rebuild(); })); dataEl = h('div', { style: 'padding:10px 12px;border-bottom:1px solid var(--line);background:var(--panel);overflow-x:auto' }); P.top.after(dataEl); drawData(P); },
          build,
          render(s, P) {
            const nl = mode === 'det' ? 'Request' : 'Need';
            let t = `<table class="t"><tr><th></th><th>Allocation<br>A B C</th><th>${nl}<br>A B C</th><th>Finish</th></tr>`;
            s.alloc.forEach((a, i) => { const hl = s.hlRow === i; t += `<tr><td>${pchip('P' + i, i)}</td><td class="${hl && (s.pretend || s.ok && !s.cmp) ? 'hl' : ''}">${fmt(a)}</td><td class="${hl ? (s.cmp ? (s.ok ? 'ok' : 'bad') : (s.bad ? 'bad' : 'hl')) : s.showNeed ? 'acc' : ''}">${fmt(s.need[i])}</td><td>${s.fin ? (s.fin[i] ? '<span class="ok">T</span>' : (s.done ? '<span class="bad">F</span>' : 'F')) : 'F'}</td></tr>`; });
            t += '</table>';
            P.viz.innerHTML = `<div class="row"><div>${t}</div><div class="col"><div class="ccs-box ${s.hlAvail ? 'flash' : ''}" style="${s.hlAvail ? 'border-color:var(--hl)' : ''}"><div class="lab">Available</div><div class="v">${fmt(s.avail)}</div></div>${s.work ? `<div class="ccs-box"><div class="lab">Work</div><div class="v">${fmt(s.work)}</div></div>` : ''}${s.seq ? `<div><div class="lab">Sequence so far</div><div class="qbox">${s.seq.map(i => pchip('P' + i, i)).join(' → ') || '<span class="mut">empty</span>'}</div></div>` : ''}</div></div>`;
          }
        });
      }
    }
  ],
  quiz: [
    { q: 'A RAG has a cycle and every resource type has several instances. Conclusion?', o: ['Definitely deadlock', 'Definitely no deadlock', 'Possibly deadlock', 'The graph is invalid'], a: 2, e: 'A cycle is sufficient only when every type has 1 instance. With several instances you must reduce to find out.' },
    { q: 'Snapshot T0 (Avail 3 3 2). P1 requests (1,0,2). Banker\'s result?', o: ['Rejected: exceeds Need', 'Wait: not enough Available', 'Granted, the system stays safe', 'Unsafe'], a: 2, e: 'Request ≤ Need (1 2 2) and ≤ Available (3 3 2); pretend to allocate → Available 2 3 0; safety finds &lt;P1, P3, P4, P0, P2&gt;.' },
    { q: 'After granting P1 (Available 2 3 0), P0 requests (0,2,0). Result?', o: ['Granted', 'Wait because unsafe', 'Error: exceeds Max', 'Wait because Available is insufficient'], a: 1, e: 'Pretend to allocate → Available 2 1 0; no process has Need ≤ Work → unsafe → restore and wait.' },
    { q: 'After granting P1, P4 requests (3,3,0). Result?', o: ['Granted', 'Wait because Available is insufficient', 'Error: exceeds Max', 'Unsafe'], a: 1, e: 'Need4 = 4 3 1, so step 1 passes; but Available = 2 3 0 lacks 3 A → wait right at step 2.' },
    { q: 'An unsafe state means:', o: ['Currently deadlocked', 'Will certainly deadlock', 'May deadlock', 'Starvation'], a: 2, e: 'Unsafe only means possible. Processes may release resources early and avoid deadlock.' },
    { q: 'Picking up chopsticks in increasing numbered order breaks which condition?', o: ['Mutual exclusion', 'Hold and wait', 'No preemption', 'Circular wait'], a: 3, e: 'A global order makes a waiting cycle impossible.' },
    { q: 'How do most OSes (including UNIX) handle deadlock?', o: ['Banker', 'Prevention', 'Detect and recover', 'Ignore it'], a: 3, e: 'Slide: “Ignore the problem and pretend that deadlocks never occur… used by most operating systems, including UNIX”.' },
    { q: 'Avail = 1; P1 (hold 1, req 1), P2 (hold 1, req 2), P3 (hold 1, req 3). Is &lt;P3, P2, P1&gt; safe?', o: ['Yes', 'No, because P3 needs 3 > 1', 'No, because P1 is last', 'Undetermined'], a: 1, e: 'P3 must run first but only 1 is available. &lt;P1, P2, P3&gt; is safe, so the system is still safe.' }
  ]
});
