// ================= CHAPTER 9: VIRTUAL MEMORY =================
chapter({
  t: 'Virtual Memory', short: 'Virtual Memory',
  lead: 'Separates the size of logical memory from real RAM: a program can be larger than RAM, and only the part in use needs to be in RAM. Implemented mainly with <b>demand paging</b>: a page is loaded only when it is referenced.',
  sections: [
    {
      t: 'Demand paging: what happens on a page fault (with replacement and the dirty bit)',
      why: [['Valid–invalid bit', 'Each page-table entry has a <b>v</b> bit (page is in RAM, the entry holds the frame) or an <b>i</b> bit (not in RAM, the entry holds the disk address). Initially every entry is i. The backing store always holds the whole process image.'], ['Page fault', 'Referencing a page with bit i → trap to the OS → find a frame → read from disk → update the table → <b>restart that same instruction</b>.'], ['Dirty bit', 'When a page (the victim) must be evicted, only a <b>modified</b> page has to be written back to disk. A clean page only needs to be marked i, saving one disk write.']],
      mount(el) {
        let S; const PG = ['A', 'B', 'C', 'D', 'E', 'F'], NF = 3;
        const refs = [['A', 0], ['B', 1], ['C', 0], ['A', 0], ['D', 0], ['E', 0], ['D', 1]];
        function build() {
          const st = []; const pt = PG.map(() => ({ f: null, v: 0, d: 0 })); const fr = Array(NF).fill(null); const fifo = []; let s = {};
          const push = (o, msg) => st.push({ pt: clone(pt), fr: [...fr], ...o, msg });
          push({}, 'The process has 6 pages (A–F) but RAM has only 3 frames. Initially every entry is <b>i</b>. The whole process image is on the backing store.');
          refs.forEach(([p, w]) => {
            const i = PG.indexOf(p), ins = `${w ? 'store' : 'load'} ${p}`;
            if (pt[i].v) { if (w) pt[i].d = 1; push({ ins, hl: i, stage: 'hit' }, `<code>${ins}</code>: page table[${p}] = <b>v</b>, frame ${pt[i].f} → direct access, no fault.${w ? ' Ghi → dirty = 1.' : ''}`); return; }
            push({ ins, hl: i, stage: 'chk' }, `<code>${ins}</code>: MMU tra page table[${p}] → bit <b>i</b>.`);
            push({ ins, hl: i, stage: 'trap' }, '<b>Trap → OS</b> (page fault). The process state is saved; the OS checks that the reference is legal and takes the page\'s disk address from the entry.');
            let f = fr.indexOf(null);
            if (f < 0) {
              f = fifo.shift(); const vp = fr[f], vi = PG.indexOf(vp);
              push({ ins, hl: i, stage: 'vict', vf: f, vi }, `No free frame → the replacement algorithm (FIFO) chooses victim <b>${vp}</b> in frame ${f}.`);
              if (pt[vi].d) push({ ins, hl: i, stage: 'out', vf: f, vi }, `${vp} has <b>dirty = 1</b> → it must be <b>paged out</b>: written to the backing store first (one more disk I/O!).`);
              else push({ ins, hl: i, stage: 'clean', vf: f, vi }, `${vp} is clean (dirty = 0) → <b>no disk write needed</b>; the copy on disk is still correct.`);
              pt[vi] = { f: null, v: 0, d: 0 }; fr[f] = null;
              push({ ins, hl: i, stage: 'inv', vf: f, vi }, `Set ${vp}'s entry to <b>i</b>.`);
            } else push({ ins, hl: i, stage: 'free', vf: f }, `Take frame ${f} from the free-frame list.`);
            push({ ins, hl: i, stage: 'in', vf: f }, `Schedule a disk read: <b>page in</b> ${p} → frame ${f}. The process moves to Waiting; the CPU is given to another process (context switch).`);
            fr[f] = p; fifo.push(f); pt[i] = { f, v: 1, d: 0 };
            push({ ins, hl: i, stage: 'upd', vf: f }, `Read complete (interrupt): page table[${p}] = frame ${f}, bit <b>v</b>.`);
            if (w) pt[i].d = 1;
            push({ ins, hl: i, stage: 'restart' }, `Restore the state and <b>restart the instruction</b> <code>${ins}</code> → this time it succeeds.${w ? ' Ghi → dirty = 1.' : ''}`);
          });
          return st;
        }
        Player(el, {
          setup(P) { S = new Stage(P.viz, 900, 330); }, build, base: 1500,
          render(s) {
            S.begin(); const vfY = f => 60 + f * 70;
            S.box('cpu', { x: 10, y: 10, w: 150, h: 70, cls: 'hw ' + (s.stage === 'trap' ? 'kern' : ''), html: `<b>CPU</b><br><code>${s.ins || ''}</code>` });
            S.box('os', { x: 10, y: 110, w: 150, h: 60, cls: 'kern ' + (['trap', 'vict', 'free'].includes(s.stage) ? 'hl' : ''), html: 'OS<span class="s">page-fault handler</span>' });
            S.box('ptT', { x: 200, y: 10, w: 230, h: 16, cls: 'ttl', html: 'Page table (frame · v/i · dirty)' });
            PG.forEach((p, i) => { const e = s.pt[i]; S.box('pt' + i, { x: 200, y: 30 + i * 46, w: 230, h: 40, cls: 'code ' + (i === s.hl ? (e.v ? 'ok' : 'hl') : i === s.vi ? 'bad' : ''), html: `${p}: ${e.v ? 'frame ' + e.f : 'disk  '} │ <b>${e.v ? 'v' : 'i'}</b> │ d=${e.d}` }); });
            S.box('pmT', { x: 480, y: 30, w: 170, h: 16, cls: 'ttl', html: 'RAM (3 frame)' });
            s.fr.forEach((p, f) => S.box('f' + f, { x: 480, y: vfY(f), w: 170, h: 58, cls: f === s.vf ? (s.stage === 'out' || s.stage === 'vict' ? 'bad' : 'hl') : p ? 'user' : 'zone', html: `frame ${f}<br><b>${p || '—'}</b>` }));
            S.box('bsT', { x: 720, y: 10, w: 170, h: 16, cls: 'ttl', html: 'Backing store' });
            PG.forEach((p, i) => S.box('bs' + i, { x: 720, y: 30 + i * 46, w: 170, h: 40, cls: 'hw ' + (i === s.hl && s.stage === 'in' ? 'hl' : i === s.vi && s.stage === 'out' ? 'bad' : ''), html: 'trang ' + p }));
            if (s.stage === 'chk' || s.stage === 'hit') S.line('c', { x1: 160, y1: 40, x2: 200, y2: 50 + s.hl * 46, c: s.stage === 'hit' ? 'ok' : 'hl', arrow: true });
            if (s.stage === 'trap') S.line('t', { x1: 85, y1: 80, x2: 85, y2: 110, c: 'bad', arrow: true, thick: true });
            if (s.stage === 'in') S.line('in', { x1: 720, y1: 50 + s.hl * 46, x2: 650, y2: vfY(s.vf) + 29, c: 'acc', arrow: true, thick: true });
            if (s.stage === 'out') S.line('out', { x1: 650, y1: vfY(s.vf) + 29, x2: 720, y2: 50 + s.vi * 46, c: 'bad', arrow: true, thick: true });
            if (s.stage === 'restart' || s.stage === 'hit') { const f = s.pt[s.hl].f; S.line('r', { x1: 430, y1: 50 + s.hl * 46, x2: 480, y2: vfY(f) + 29, c: 'ok', arrow: true }); }
            S.end();
          }
        });
      }
    },
    {
      t: 'Performance of demand paging',
      why: [['Formula', 'EAT = (1 − p) × memory access + p × page fault time. Page-fault time includes the trap, context switch, disk I/O (possibly a page-out too) and restarting the instruction: on the order of <b>milliseconds</b>, while a RAM access takes <b>nanoseconds</b>.'], ['Consequence', 'p must be tiny. With 200 ns and 8 ms, keeping the slowdown under 10% requires p &lt; 1/400 000.']],
      mount(el) {
        let ma = 200, pf = 8, p = 0.001; const box = h('div');
        const draw = () => { const eat = (1 - p) * ma + p * pf * 1e6; box.innerHTML = `<div class="formula">EAT = (1 − ${p}) × ${ma} ns + ${p} × ${pf} ms = <b>${eat >= 1000 ? (eat / 1000).toFixed(2) + ' µs' : eat.toFixed(1) + ' ns'}</b> → <b class="${eat / ma > 1.1 ? 'bad' : 'ok'}">${(eat / ma).toFixed(1)}×</b> slower than with no faults.<br>For a slowdown &lt; 10%: p &lt; ${(0.1 * ma / (pf * 1e6 - ma)).toExponential(2)} (≈ 1 / ${Math.round((pf * 1e6 - ma) / (0.1 * ma)).toLocaleString('vi-VN')})</div>`; };
        const pin = h('input', { type: 'range', min: -7, max: -1, step: 0.1, value: -3, 'aria-label': 'log10 of p', oninput: e => { p = +(10 ** +e.target.value).toPrecision(2); lab.textContent = 'p = ' + p; draw(); } });
        const lab = h('span', { class: 'mono' }, 'p = ' + p);
        el.append(h('div', { class: 'row', style: 'align-items:center;margin-bottom:8px' }, fNum('Memory access (ns):', ma, 1, 1000, v => { ma = v; draw(); }), fNum('Page-fault service (ms):', pf, 1, 50, v => { pf = v; draw(); }), h('label', null, 'Fault probability ', pin, lab)), box); draw();
      }
    },
    {
      t: 'Page replacement: FIFO · Optimal · LRU · Second-chance (Clock)',
      why: [['Goal', 'Fewest page faults. Evaluated by running on a <b>reference string</b> and counting faults. The slide\'s standard string: 1,2,3,4,1,2,5,1,2,3,4,5.'], ['FIFO', 'Evict the page loaded longest ago. Simple, but suffers <b>Belady’s anomaly</b>: more frames can mean more faults (3 frames: 9, 4 frames: 10).'], ['Optimal', 'Evict the page that <b>will not be used for the longest time</b>. Theoretically best, but the OS cannot see the future → used only as a benchmark.'], ['LRU', 'Like Optimal but <b>looking backwards</b>: evict the page unused for the longest time. Implemented with counters (time-of-use) or a stack. Exact implementation is expensive.'], ['Clock', 'Approximates LRU with a <b>reference bit R</b> set by hardware. The hand points at the oldest page: if R = 1, clear it to 0, give it a “second chance” and move on; if R = 0, evict it. If every R is 1 it degenerates into FIFO.']],
      exam: 'Optimal and LRU do <b>not</b> suffer Belady’s anomaly thanks to the inclusion property: the set of pages in n frames is always a subset of the set in n+1 frames.',
      mount(el) {
        let refs = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5], nf = 3, alg = 'FIFO', R;
        Player(el, {
          base: 1300,
          setup(P) {
            const fr = fNum('Frames:', nf, 1, 7, v => { nf = v; P.rebuild(); });
            P.top.append(fSel('Algorithm:', [['FIFO', 'FIFO'], ['OPT', 'Optimal'], ['LRU', 'LRU'], ['CLOCK', 'Second-chance (Clock)']], alg, v => { alg = v; P.rebuild(); }), fr, fTxt('Reference string:', refs.join(','), v => { const r = v.split(/[ ,]+/).map(Number).filter(x => !isNaN(x)); if (r.length) { refs = r; P.rebuild(); } }, 240), btn('Belady: 3 → 4 frame', () => { alg = 'FIFO'; P.top.querySelector('select').value = 'FIFO'; nf = nf === 3 ? 4 : 3; fr.inp.value = nf; P.rebuild(); }));
            P._g = h('div', { style: 'overflow-x:auto' }); P._d = h('div', { style: 'margin-top:10px' }); P._b = h('div', { style: 'margin-top:12px' }); P.viz.append(P._g, P._d, P._b);
          },
          build() {
            R = prSim(refs, nf, alg);
            const st = [{ k: -1, msg: `${nf} free frames. Press ▶.` }];
            R.steps.forEach(s => {
              let why = '';
              if (s.fault && s.victim != null) {
                if (alg === 'FIFO') why = `Page ${s.victim} was loaded earliest → evict.`;
                if (alg === 'LRU') why = `Last used: ${Object.entries(s.last).filter(([p]) => s.slots.includes(+p) || +p === s.victim).filter(([p]) => +p !== s.pg).map(([p, t]) => `${p}@${t}`).join(', ')} → ${s.victim} unused the longest → evict.`;
                if (alg === 'OPT') why = `Next use: ${s.info.next.map((n, i) => `${R.steps[s.t - 1].slots[i]}→${n === Infinity ? '∞' : 'position ' + n}`).join(', ')} → ${s.victim} is furthest away → evict.`;
                if (alg === 'CLOCK') why = (s.info.sweep.length ? `The hand meets ${s.info.sweep.map(x => 'frame ' + x).join(', ')} with R = 1 → clear R and give it a second chance; ` : '') + `meets page ${s.victim} with R = 0 → evict.`;
              }
              st.push({ k: s.t, msg: `Reference <b>${s.pg}</b>: ${s.fault ? `<span class="bad">PAGE FAULT</span>${s.victim != null ? ` — ${why} Load ${s.pg} into frame ${s.slot}.` : ` — frame ${s.slot} is still free.`}` : `<span class="ok">hit</span>${alg === 'CLOCK' ? ' → set R = 1' : ''}.`} (total faults: ${R.steps.slice(0, s.t + 1).filter(x => x.fault).length})` });
            });
            st.push({ k: refs.length - 1, fin: true, msg: `Total <b>${R.faults} page faults</b> with ${nf} frames (${alg}).`, hold: 2 });
            return st;
          },
          render(s, P) {
            let t = `<table class="t"><tr><th>Ref</th>${refs.map((r, i) => `<th style="${i === s.k ? 'background:var(--hl-soft)' : ''}">${r}</th>`).join('')}</tr>`;
            range(nf).forEach(f => { t += `<tr><th>F${f + 1}</th>${refs.map((_, i) => { if (i > s.k) return '<td></td>'; const st = R.steps[i]; const v = st.slots[f]; const isNew = st.fault && st.slot === f; return `<td class="${isNew ? (i === s.k ? 'hl' : 'acc') : ''}">${v ?? ''}${alg === 'CLOCK' && v != null ? `<sub>${st.R[f]}</sub>` : ''}${alg === 'CLOCK' && st.hand === f ? '◂' : ''}</td>`; }).join('')}</tr>`; });
            t += `<tr><th>Fault</th>${refs.map((_, i) => `<td class="${i <= s.k && R.steps[i].fault ? 'bad' : ''}">${i <= s.k && R.steps[i].fault ? 'P' : ''}</td>`).join('')}</tr></table>`;
            P._g.innerHTML = t + (alg === 'CLOCK' ? '<div class="mut" style="font-size:12px">Subscript = R bit; ◂ = clock hand position.</div>' : '');
            const cur = s.k >= 0 ? R.steps[s.k] : null; let d = '';
            if (cur) {
              if (alg === 'FIFO') d = `<div class="lab">FIFO queue (old → new)</div><div class="qbox">${cur.queue.map(f => `<span class="chip acc">${cur.slots[f]}</span>`).join(' → ')}</div>`;
              if (alg === 'LRU') d = `<div class="lab">LRU stack (top = just used; bottom = next victim)</div><div class="qbox">${cur.stack.filter(p => cur.slots.includes(p)).map((p, i, a) => `<span class="chip ${i === a.length - 1 ? 'bad' : i === 0 ? 'ok' : ''}">${p}</span>`).join('')}</div>`;
              if (alg === 'OPT') { const nx = cur.slots.map(p => { const k = refs.indexOf(p, s.k + 1); return k < 0 ? '∞' : k - s.k; }); d = `<div class="lab">Distance to next use</div><div class="qbox">${cur.slots.map((p, i) => p == null ? '' : `<span class="chip">${p}: ${nx[i]}</span>`).join('')}</div>`; }
              if (alg === 'CLOCK') d = `<div class="lab">Circular queue (hand ▼)</div><div class="row" style="gap:6px">${cur.slots.map((p, f) => `<div style="text-align:center"><div style="height:16px;color:var(--hl)">${cur.hand === f ? '▼' : ''}</div><div class="ccs-box" style="min-width:56px;text-align:center"><div class="v" style="font-size:16px">${p ?? '—'}</div><div class="mut" style="font-size:12px">R = ${cur.R[f]}</div></div></div>`).join('')}</div>`;
            }
            P._d.innerHTML = d;
            if (!P._bk || P._bk !== refs.join()) { P._bk = refs.join(); const ser = ['FIFO', 'OPT', 'LRU', 'CLOCK'].map((a, i) => ({ name: a, vals: range(7).map(n => prSim(refs, n + 1, a).faults), col: ['var(--bad)', 'var(--ok)', 'var(--acc)', 'var(--hl)'][i] })); P._b.innerHTML = '<div class="lab">Faults by number of frames (Belady’s anomaly: the FIFO bar rises when frames are added)</div>' + barChart({ labels: range(7).map(n => (n + 1) + ' fr'), series: ser, W: 640, H: 220, showV: false }) + legend(ser); }
          }
        });
      }
    },
    {
      t: 'Frame allocation: local vs global replacement',
      why: [['Fixed vs variable', 'Fixed: each process gets a fixed number of frames (equal or proportional) and replaces within its own share. Variable: the number of frames changes over time.'], ['Local vs global', '<b>Global</b>: choose the victim among <i>all</i> frames, possibly another process\'s → one process\'s performance depends on others. <b>Local</b>: choose only among its own frames → it may keep rarely used pages that another process needs.']],
      mount(el) {
        const D = { A0: 10, A1: 7, A2: 5, A3: 4, A4: 6, A5: 3, B0: 9, B1: 4, B2: 6, B3: 2, B4: 5, B5: 6, B6: 12, C1: 3, C2: 5, C3: 6 };
        let mode = 'local';
        const steps = () => { const vict = mode === 'local' ? 'A5' : 'B3'; return [{ msg: 'Each frame records its page and last access time. Process A references A6 → page fault, using LRU.' }, { v: vict, msg: mode === 'local' ? 'Local LRU: consider only A\'s pages → A5 (t=3) is oldest → replaced by A6. A keeps 6 frames.' : 'Global LRU: consider every frame → B3 (t=2) is the oldest system-wide → replaced by A6. A now has 7 frames, B has 6.' }, { v: vict, done: true, msg: mode === 'local' ? 'Each process\'s frame count stays fixed.' : 'Frame counts change with the behaviour of all processes (variable allocation).' }]; };
        Player(el, { setup(P) { P.top.append(fSel('Mode:', [['local', 'Local replacement'], ['global', 'Global replacement']], mode, v => { mode = v; P.rebuild(); })); }, build: steps, base: 1900,
          render(s, P) { P.viz.innerHTML = `<div class="row" style="gap:6px">${Object.entries(D).map(([k, t]) => { const isV = s.v === k; const lab = isV && s.done ? 'A6' : k; const proc = lab[0]; return `<div class="ccs-box" style="min-width:76px;text-align:center;border-color:${isV ? 'var(--bad)' : 'var(--line)'};background:${isV ? (s.done ? 'var(--ok-soft)' : 'var(--bad-soft)') : 'var(--panel)'}"><div class="v" style="font-size:16px;color:${pcol('ABC'.indexOf(proc))}">${lab}</div><div class="mut" style="font-size:12px">t = ${isV && s.done ? 13 : t}</div></div>`; }).join('')}</div>`; } });
      }
    },
    {
      t: 'Thrashing: adding processes makes the CPU idler',
      why: [['Vicious circle', 'Processes lack frames → constant faults → waiting on disk → CPU utilization drops → the OS (thinking there is too little work) <b>raises the degree of multiprogramming</b> → each process gets even fewer frames → even more faults.'], ['Definitions', 'Thrashing: processes are busy swapping pages in and out and get no useful work done.']],
      exam: 'Adding processes while thrashing makes things <b>worse</b>. The right move is to <b>lower</b> the degree of multiprogramming (suspend/swap out a process).',
      mount(el) {
        const WSS = [12, 15, 10, 14, 13, 11, 16, 12], M = 60; let pol = false;
        const util = n => { const D = WSS.slice(0, n).reduce((a, b) => a + b, 0); const base = 1 - Math.pow(0.45, n); return D <= M ? base : base * Math.pow(M / D, 6); };
        const steps = () => range(8).map(i => { let n = i + 1, sus = 0; if (pol) while (WSS.slice(0, n - sus).reduce((a, b) => a + b, 0) > M) sus++; const act = n - sus; const D = WSS.slice(0, act).reduce((a, b) => a + b, 0); return { n, act, sus, D, u: util(act), msg: `Degree of multiprogramming ${n}${sus ? ` (working-set policy: <b>suspend ${sus}</b> process(es))` : ''}: D = ΣWSS = ${D} frames, m = ${M}. ${D > M ? '<span class="bad">D > m → THRASHING</span>: processes steal each other\'s frames.' : 'D ≤ m: every process has its working set.'} CPU utilization ≈ ${Math.round(util(act) * 100)}%.` }; });
        Player(el, { setup(P) { P.top.append(fChk(' Enable the working-set policy (suspend when D > m)', pol, v => { pol = v; P.rebuild(); })); }, build: steps, base: 1700,
          render(s, P) {
            const W = 520, H = 200, L = 40; const sx = n => L + (n - 1) * (W - L - 20) / 7, sy = u => H - 26 - u * (H - 40);
            let g = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" class="gantt"><line x1="${L}" y1="${H - 26}" x2="${W - 10}" y2="${H - 26}" stroke="var(--line)"/><line x1="${L}" y1="10" x2="${L}" y2="${H - 26}" stroke="var(--line)"/>`;
            const pts = range(8).map(i => { let n = i + 1, act = n; if (pol) { act = 0; let D = 0; for (const w of WSS.slice(0, n)) { if (D + w > M) break; D += w; act++; } } return [sx(n), sy(util(act))]; });
            g += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--acc)" stroke-width="2.5"/>` + pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === s.n - 1 ? 7 : 3}" fill="${i === s.n - 1 ? 'var(--hl)' : 'var(--acc)'}"/><text x="${p[0]}" y="${H - 10}" text-anchor="middle">${i + 1}</text>`).join('') + `<text x="${W / 2}" y="${H}" text-anchor="middle">degree of multiprogramming</text><text x="6" y="14">CPU %</text><text x="${L - 4}" y="${sy(1) + 4}" text-anchor="end">100</text><text x="${L - 4}" y="${sy(0.5) + 4}" text-anchor="end">50</text></svg>`;
            let x = 0; const bar = WSS.slice(0, s.act).map((w, i) => { const seg = `<div title="P${i + 1}: WSS ${w}" style="position:absolute;left:${x / Math.max(M, s.D) * 100}%;width:${w / Math.max(M, s.D) * 100}%;top:0;bottom:0;background:${pcol(i)};border-right:2px solid var(--panel);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">P${i + 1}</div>`; x += w; return seg; }).join('');
            P.viz.innerHTML = `<div class="row"><div class="grow">${g}<div class="mut" style="font-size:12px">Illustrative model (assumes each process waits on I/O 45% of the time).</div></div><div class="grow"><div class="lab">Frame demand D vs RAM m = ${M}</div><div style="position:relative;height:40px;border:2px solid ${s.D > M ? 'var(--bad)' : 'var(--line)'};border-radius:6px;overflow:hidden">${bar}<div style="position:absolute;left:${M / Math.max(M, s.D) * 100}%;top:-2px;bottom:-2px;border-left:3px dashed var(--ink)"></div></div><div class="mut" style="font-size:12px;margin-top:4px">Dashed line = m. ${s.sus ? s.sus + ' process(es) suspended (swapped out).' : ''}</div></div></div>`;
          } });
      }
    },
    {
      t: 'Working-set model',
      why: [['Locality', 'Processes reference pages in clusters: <b>temporal</b> (just used will be used again, like sum in a loop) and <b>spatial</b> (nearby cells, like consecutive a[i] or sequential instructions).'], ['Working set', 'WS(t, Δ) = the set of pages referenced in the most recent Δ references. WSS<sub>i</sub> = |WS| of Pi. D = ΣWSS<sub>i</sub> is the total demand. If D > m (frames) ⇒ thrashing ⇒ suspend a process.']],
      mount(el) {
        const R = [2, 6, 1, 5, 7, 7, 7, 7, 5, 1, 6, 2, 3, 4, 1, 2, 3, 4, 4, 4, 3, 4, 3, 4, 4, 4, 1, 3, 2, 3, 4, 4, 4, 3, 4, 4, 4]; let D = 10;
        const steps = () => range(R.length - D + 1).map(k => { const t = k + D - 1; const ws = [...new Set(R.slice(t - D + 1, t + 1))].sort((a, b) => a - b); return { t, ws, msg: `t = ${t + 1} (Δ = ${D}): WS = {${ws.join(', ')}}, WSS = ${ws.length}.${t === 9 ? ' Same as the slide: WS(t1) = {1, 2, 5, 6, 7}.' : ''}${t === 25 ? ' Same as the slide: WS(t2) = {3, 4}. The process has moved to a different locality.' : ''}` }; });
        Player(el, { setup(P) { P.top.append(fNum('Δ =', D, 2, 20, v => { D = v; P.rebuild(); })); }, build: steps, base: 700,
          render(s, P) {
            const all = steps();
            P.viz.innerHTML = `<div class="row" style="gap:3px">${R.map((p, i) => `<span class="chip" style="${i > s.t - D && i <= s.t ? 'background:var(--acc-soft);border-color:var(--acc)' : 'opacity:.55'};${i === s.t ? 'font-weight:800;border-color:var(--hl)' : ''}">${p}</span>`).join('')}</div><div class="row" style="margin-top:10px"><div class="ccs-box"><div class="lab">Working set</div><div class="v">{${s.ws.join(', ')}}</div></div><div class="grow">` +
              barChart({ labels: all.map(x => x.t + 1), series: [{ name: 'WSS', vals: all.map(x => x.ws.length), col: 'var(--acc)' }], hi: s.t - D + 1, W: 600, H: 160 }) + '</div></div>';
          } });
      }
    },
    {
      t: 'Page-fault frequency (PFF)',
      why: [['Idea', 'Measure each process\'s fault rate directly and keep it within an acceptable band: too <b>high</b> → give it another frame; too <b>low</b> → take a frame away.'], ['When frames run out', 'The fault rate is still high and no frame is free → <b>suspend</b> (swap out) a process.']],
      mount(el) {
        const rate = (f, shift) => Math.min(1, 3.2 / Math.pow(Math.max(0.5, f - shift + 1), 1.2));
        const UP = 0.4, LO = 0.12; const plan = [];
        let f = 2, sh = 0, free = 5;
        for (let k = 0; k < 14; k++) {
          if (k === 8) { sh = 4; plan.push({ f, sh, free, msg: 'The process moves to a new locality (the curve shifts right) → faults spike.' }); continue; }
          const r = rate(f, sh);
          if (r > UP) { if (free > 0) { f++; free--; plan.push({ f, sh, free, msg: `Rate ${r.toFixed(2)} > upper bound → <b>add 1 frame</b> (${free} free frames left).` }); } else { plan.push({ f, sh, free, sus: true, msg: '<span class="bad">Faults still high but no free frame → suspend a process</span> to free frames.' }); free += 4; } }
          else if (r < LO) { f--; free++; plan.push({ f, sh, free, msg: `Rate ${r.toFixed(2)} < lower bound → <b>take away 1 frame</b>.` }); }
          else plan.push({ f, sh, free, msg: `Rate ${r.toFixed(2)} is within the acceptable band → keep as is.` });
        }
        Player(el, { build: () => plan, base: 1500,
          render(s, P) {
            const W = 560, H = 220, L = 44, sx = x => L + x * (W - L - 16) / 14, sy = y => H - 28 - y * (H - 44);
            let g = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" class="gantt"><rect x="${L}" y="${sy(UP)}" width="${W - L - 16}" height="${sy(LO) - sy(UP)}" fill="var(--ok-soft)"/><line x1="${L}" x2="${W - 16}" y1="${sy(UP)}" y2="${sy(UP)}" stroke="var(--bad)" stroke-dasharray="5 4"/><text x="${W - 18}" y="${sy(UP) - 4}" text-anchor="end" style="fill:var(--bad)">upper bound</text><line x1="${L}" x2="${W - 16}" y1="${sy(LO)}" y2="${sy(LO)}" stroke="var(--acc)" stroke-dasharray="5 4"/><text x="${W - 18}" y="${sy(LO) + 13}" text-anchor="end" style="fill:var(--acc)">lower bound</text>`;
            const pts = []; for (let x = 1; x <= 14; x += 0.25) pts.push([sx(x), sy(rate(x, s.sh))]);
            g += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--ink)" stroke-width="2"/><circle cx="${sx(s.f)}" cy="${sy(rate(s.f, s.sh))}" r="8" fill="${s.sus ? 'var(--bad)' : 'var(--hl)'}"/>` + range(14).map(x => `<text x="${sx(x + 1)}" y="${H - 12}" text-anchor="middle">${x + 1}</text>`).join('') + `<text x="${W / 2}" y="${H}" text-anchor="middle">frames given to the process</text><text x="4" y="14">fault rate</text></svg>`;
            P.viz.innerHTML = `<div class="row"><div class="grow">${g}</div><div class="ccs-box"><div class="lab">Free frames in the system</div><div class="v">${s.free}</div></div></div>`;
          } });
      }
    }
  ],
  quiz: [
    { q: 'String 1,2,3,4,1,2,5,1,2,3,4,5 with FIFO: how many faults with 3 frames and with 4 frames?', o: ['9 and 8', '9 and 10', '10 and 9', '8 and 8'], a: 1, e: 'Belady’s anomaly: 9 with 3 frames, 10 with 4 frames.' },
    { q: 'Same string with 4 frames: Optimal and LRU?', o: ['6 and 8', '8 and 6', '6 and 6', '7 and 8'], a: 0, e: 'OPT = 6 (the ideal benchmark), LRU = 8.' },
    { q: 'The victim page has dirty bit = 0. On replacement:', o: ['It must be written to disk', 'No disk write is needed', 'It cannot be replaced', 'It must be removed from the backing store'], a: 1, e: 'An unmodified page is identical to the backing-store copy → just mark it i.' },
    { q: 'After handling a page fault, what does the CPU do?', o: ['Runs the next instruction', 'Re-executes the instruction that faulted', 'Terminates the process', 'Calls the scheduler to run another process forever'], a: 1, e: 'Step 6: restore the state and restart the instruction, now that the page is in RAM.' },
    { q: 'What does the Clock algorithm degenerate into when every reference bit is 1?', o: ['LRU', 'Optimal', 'FIFO', 'Random'], a: 2, e: 'The hand sweeps once clearing every R, then comes back to the oldest page → FIFO.' },
    { q: 'The system is thrashing. The right action?', o: ['Raise the degree of multiprogramming', 'Lower the degree of multiprogramming (suspend processes)', 'Increase the quantum', 'Disable the TLB'], a: 1, e: 'D > m → total demand must be reduced by swapping out some processes.' },
    { q: 'Memory 200 ns, fault service 8 ms, p = 0.001. EAT?', o: ['≈ 200 ns', '≈ 8.2 µs', '≈ 8 ms', '≈ 1 µs'], a: 1, e: '0.999·200 + 0.001·8 000 000 ≈ 8 199.8 ns ≈ 8.2 µs, about 40 times slower.' },
    { q: 'Global replacement has the drawback that:', o: ['A process cannot take another process\'s frames', 'One process\'s performance depends on the behaviour of others', 'It causes Belady\'s anomaly', 'It cannot be used with LRU'], a: 1, e: 'Slide: “Performance depends on external circumstances (other processes)”.' }
  ]
});
