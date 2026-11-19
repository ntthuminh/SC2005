// ================= CHAPTER 11: I/O SYSTEM & DISK =================
chapter({
  t: 'I/O Systems & Disks', short: 'I/O & Disk',
  lead: 'I/O devices come in every variety and are far slower than the CPU and RAM. Two design goals: <b>efficiency</b> (I/O is often the bottleneck, especially the disk) and <b>generality</b> (handle every device in a uniform way). The device-driver layer hides the differences between controllers from the kernel\'s I/O subsystem.',
  sections: [
    {
      t: 'Blocking I/O vs asynchronous I/O',
      why: [['Blocking', '(1) The process issues an I/O request. (2) It is <b>waiting</b> while the device works. (3) When done it goes back to the ready queue.'], ['Asynchronous', '(1) Issue the request. (2) The system call <b>returns immediately</b> once the request is queued at the device. (3) The process keeps running its code. (4) When the I/O completes, the process is <b>notified</b> (signal).'], ['Why I/O is expensive', 'The CPU must run driver code, interrupts cause context switches, data must be copied between the controller and RAM, and requests pass through many software layers.']],
      mount(el) {
        let mode = 'block';
        const plan = { block: [['R', '-'], ['W', 'B'], ['W', 'B'], ['W', 'B'], ['Rd', '-'], ['R', '-']], async: [['R', '-'], ['R', 'B'], ['R', 'B'], ['R', 'B'], ['S', '-'], ['R', '-']] };
        const M = { block: ['The process runs.', '(1) Issue a read request → (2) move to <b>Waiting</b>; the CPU does other work.', 'The device is working; the process keeps waiting.', 'Still waiting…', '(3) I/O done → the process goes to the <b>ready queue</b> (it does not run immediately).', 'Dispatched; continues with the data now available.'], async: ['The process runs.', '(1) Issue the request → (2) the system call returns as soon as the request is queued.', '(3) The process <b>keeps running</b> in parallel with the device.', 'Still running in parallel.', '(4) I/O done → the process is <b>signalled</b> (callback/software interrupt).', 'Process the data that just arrived.'] };
        Player(el, { setup(P) { P.top.append(fSel('Type:', [['block', 'Blocking I/O'], ['async', 'Asynchronous I/O']], mode, v => { mode = v; P.rebuild(); })); }, build: () => plan[mode].map((_, k) => ({ k, msg: M[mode][k] })), base: 1500,
          render(s, P) { const p = plan[mode]; const segs = []; p.forEach(([a, b], t) => { segs.push({ r: 0, s: t, e: t + 1, c: 0, col: a === 'W' ? '#8a95a6' : a === 'Rd' ? 'var(--hl)' : a === 'S' ? 'var(--ok)' : pcol(0), t: { R: 'running', W: 'waiting', Rd: 'ready', S: 'signal' }[a] }); if (b === 'B') segs.push({ r: 1, s: t, e: t + 1, c: 2, t: 'busy' }); }); P.viz.innerHTML = ganttSVG({ rows: ['Process', 'Device'], segs, T: p.length, now: s.k + 1 }); } });
      }
    },
    {
      t: 'Buffering, double buffering, spooling',
      why: [['Buffering', 'Holds data in RAM while it moves between devices: smooths out differences in <b>speed</b> (slow modem → fast disk) and in <b>transfer size</b> (network packets).'], ['Double buffer', 'The device fills b1 while the process works on b2, then they swap roles. Combined with asynchronous I/O, device and CPU never wait for each other.'], ['Caching vs spooling', '<b>Cache</b>: a fast copy of data that is read/written again. <b>Spooling</b>: queues output for a device that can serve only one request at a time (a printer).']],
      mount(el) {
        switcher(el, 'Illustration:', [['db', 'Double buffering'], ['sp', 'Printer spooling']], (box, v) => {
          let S;
          if (v === 'db') {
            const st = []; let b = [{ d: '', f: 0 }, { d: '', f: 0 }];
            st.push({ b: clone(b), fill: 0, use: null, msg: 'A device (e.g. a network card) delivers data block by block. There are two buffers b1, b2 in memory.' });
            for (let k = 1; k <= 4; k++) { const fi = (k - 1) % 2, ui = k % 2; b[fi] = { d: 'block ' + k, f: 1 }; st.push({ b: clone(b), fill: fi, use: k > 1 ? ui : null, msg: k === 1 ? 'The device fills b1 with block 1. The process has nothing to work on yet.' : `The device fills b${fi + 1} with block ${k} <b>while</b> the process works on block ${k - 1} in b${ui + 1}.` }); b[ui] = { d: '', f: 0 }; }
            st.push({ b: clone(b), fill: null, use: 1, msg: 'The two sides keep swapping roles and neither waits for the other (as long as their speeds are similar).' });
            Player(box, { setup(P) { S = new Stage(P.viz, 900, 170); }, build: () => st, base: 1500, render(s) { S.begin(); S.box('dev', { x: 10, y: 50, w: 160, h: 70, cls: 'hw', html: 'Device' }); S.box('pr', { x: 730, y: 50, w: 160, h: 70, cls: 'user', html: 'Process' }); s.b.forEach((x, i) => { S.box('b' + i, { x: 330, y: 15 + i * 75, w: 240, h: 62, cls: s.fill === i ? 'hl' : s.use === i ? 'ok' : 'zone', html: `<b>b${i + 1}</b>&nbsp;${x.d || 'empty'}` }); }); if (s.fill != null) S.line('f', { x1: 170, y1: 85, x2: 330, y2: 46 + s.fill * 75, c: 'hl', arrow: true }); if (s.use != null) S.line('u', { x1: 570, y1: 46 + s.use * 75, x2: 730, y2: 85, c: 'ok', arrow: true }); S.end(); } });
          } else {
            const jobs = ['P1: report', 'P2: photo', 'P3: invoice']; const st = [];
            st.push({ q: [], pr: null, done: [], msg: 'Three processes print at once. The printer can serve only one request at a time.' });
            st.push({ q: [0, 1, 2], pr: null, done: [], msg: 'Each process writes its output into the <b>spool</b> (a temporary file on disk) and immediately goes on with other work, without waiting for the printer.' });
            for (let k = 0; k < 3; k++) { st.push({ q: [0, 1, 2].slice(k + 1), pr: k, done: [0, 1, 2].slice(0, k), msg: `The spooler sends job “${jobs[k]}” to the printer in turn.` }); }
            st.push({ q: [], pr: null, done: [0, 1, 2], msg: 'Done. The printouts are not mixed together.' });
            Player(box, { setup(P) { S = new Stage(P.viz, 900, 170); }, build: () => st, base: 1400, render(s) { S.begin(); S.box('sp', { x: 300, y: 20, w: 300, h: 130, cls: 'zone hw', html: 'spool on disk' }); S.box('pt', { x: 700, y: 50, w: 180, h: 70, cls: s.pr != null ? 'hl' : 'hw', html: 'Printer' }); jobs.forEach((j, i) => { let x = 20, y = 20 + i * 45; if (s.q.includes(i)) { x = 320; y = 45 + s.q.indexOf(i) * 34; } if (s.pr === i) { x = 710; y = 128; } if (s.done.includes(i)) { x = 710; y = 10 - 0; } S.box('j' + i, { x, y, w: 160, h: 30, cls: 'tok', bg: pcol(i), op: s.done.includes(i) ? 0.35 : 1, html: j }); }); S.end(); } });
          }
        });
      }
    },
    {
      t: 'Disk mechanics: seek + rotational latency + transfer',
      why: [['Structure', 'A disk is addressed as a <b>one-dimensional array of logical blocks</b> (the smallest unit of transfer, usually 512 B), mapped sequentially onto sectors of tracks/cylinders.'], ['Timing', 'Positioning = <b>seek</b> (move the head to the track, 5–25 ms) + <b>rotational latency</b> (wait for the sector to rotate under the head, half a turn on average). Transfer = (N / sectors per track) × time of one rotation.'], ['Consequence', 'Sequential reads are hundreds of times cheaper than random reads → the OS tries to lay data out contiguously and schedules the disk.']],
      mount(el) {
        let trk = 3;
        const steps = () => [{ arm: 0, rot: 0, msg: 'The head is on the outermost track (0). We need to read the red sector on track ' + trk + '.' }, { arm: trk, rot: 0, ph: 'seek', msg: '<b>Seek</b>: the arm moves the head to the right track. This is the most expensive part (~10 ms) and grows with distance.' }, { arm: trk, rot: 200, ph: 'rot', msg: '<b>Rotational latency</b>: wait for the disk to rotate the wanted sector under the head (half a turn on average ≈ 4 ms at 7500 rpm).' }, { arm: trk, rot: 230, ph: 'xfer', msg: '<b>Transfer</b>: the sector passes under the head. With 1024 sectors/track, one sector takes only 8/1024 ms.' }];
        let svg;
        Player(el, {
          setup(P) {
            P.top.append(fSel('Track to read:', [1, 2, 3, 4, 5].map(x => [x, 'track ' + x]), trk, v => { trk = +v; P.rebuild(); }));
            const cx = 160, cy = 150; let s = `<svg viewBox="0 0 520 300" width="100%" style="max-width:520px"><g class="plat" style="transform-origin:${cx}px ${cy}px;transition:transform calc(var(--dur)*3) ease-in-out">`;
            for (let r = 130; r >= 30; r -= 18) s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${r === 130 ? 'var(--panel2)' : 'none'}" stroke="var(--line)"/>`;
            for (let a = 0; a < 360; a += 30) s += `<line x1="${cx}" y1="${cy}" x2="${cx + 130 * Math.cos(a * Math.PI / 180)}" y2="${cy + 130 * Math.sin(a * Math.PI / 180)}" stroke="var(--line)"/>`;
            s += `<path class="sect" fill="var(--bad)" opacity=".85"/></g><circle cx="${cx}" cy="${cy}" r="8" fill="var(--muted)"/><g class="arm" style="transform-origin:420px 40px;transition:transform calc(var(--dur)*2) ease-in-out"><line x1="420" y1="40" x2="${cx + 130}" y2="${cy}" stroke="var(--acc)" stroke-width="6" stroke-linecap="round"/><circle cx="${cx + 130}" cy="${cy}" r="7" fill="var(--hl)"/></g><circle cx="420" cy="40" r="10" fill="var(--acc)"/><text x="420" y="22" text-anchor="middle" style="font-size:12px;fill:var(--muted)">actuator</text></svg>`;
            svg = h('div', { html: s }); const info = h('div', { class: 'grow' }); P._i = info; P.viz.append(h('div', { class: 'row' }, svg, info));
          },
          build: steps, base: 1900,
          render(s, P) {
            const cx = 160, cy = 150; const r = 130 - trk * 18 - 9; const a0 = 150 * Math.PI / 180, a1 = 165 * Math.PI / 180;
            const sect = svg.querySelector('.sect'); const ri = r - 8, ro = r + 8;
            sect.setAttribute('d', `M${cx + ri * Math.cos(a0)},${cy + ri * Math.sin(a0)} L${cx + ro * Math.cos(a0)},${cy + ro * Math.sin(a0)} A${ro},${ro} 0 0 1 ${cx + ro * Math.cos(a1)},${cy + ro * Math.sin(a1)} L${cx + ri * Math.cos(a1)},${cy + ri * Math.sin(a1)} A${ri},${ri} 0 0 0 ${cx + ri * Math.cos(a0)},${cy + ri * Math.sin(a0)}Z`);
            const px = 420, py = 40, hx0 = cx + 130, hy0 = cy, La = Math.hypot(hx0 - px, hy0 - py), phi0 = Math.atan2(hy0 - py, hx0 - px);
            const targetR = s.arm ? 130 - s.arm * 18 - 9 : 130; let best = 0, bd = 1e9;
            for (let th = 0; th <= 1.4; th += 0.001) { const x = px + La * Math.cos(phi0 + th), y = py + La * Math.sin(phi0 + th); const d = Math.abs(Math.hypot(x - cx, y - cy) - targetR); if (d < bd - 1e-9) { bd = d; best = th; } if (d < 0.3) break; }
            svg.querySelector('.arm').style.transform = `rotate(${best * 180 / Math.PI}deg)`;
            const hx = px + La * Math.cos(phi0 + best), hy = py + La * Math.sin(phi0 + best); const hAng = Math.atan2(hy - cy, hx - cx) * 180 / Math.PI;
            let need = ((hAng - 157.5) % 360 + 360) % 360; if (need < 30) need += 360;
            const rot = s.rot === 0 ? 0 : s.rot === 200 ? need : need + 25;
            svg.querySelector('.plat').style.transform = `rotate(${rot}deg)`;
            const ph = s.ph; P._i.innerHTML = `<div class="col">${[['seek', 'Seek', '10 ms'], ['rot', 'Rotational latency', '4 ms (½ of an 8 ms rotation)'], ['xfer', 'Transfer 1 sector', '8/1024 ms']].map(([k, n, v]) => `<div class="ccs-box" style="border-color:${ph === k ? 'var(--hl)' : 'var(--line)'};background:${ph === k ? 'var(--hl-soft)' : 'var(--panel)'}"><div class="lab">${n}</div><div>${v}</div></div>`).join('')}</div>`;
          }
        });
        const rnd = n => n * (10 + 4 + 8 / 1024), seq = n => { const tr = Math.ceil(n / 1024); return n <= 1024 ? 14 + n / 1024 * 8 : tr * 22; };
        el.append(h('div', { style: 'margin-top:12px;overflow-x:auto', html: `<div class="lab">Reading N sectors: random vs sequential (seek 10 ms, 1 rotation 8 ms, 1024 sectors/track, 512 B sectors)</div><table class="t"><tr><th>Size</th><th>Sectors</th><th>Random (one ~14 ms positioning per sector)</th><th>Sequential</th></tr>${[[4, '4 KB', 8], [128, '128 KB', 256], [1024, '1 MB', 2048]].map(([_, l, n]) => `<tr><td>${l}</td><td>${n}</td><td class="bad">${rnd(n) >= 1000 ? (rnd(n) / 1000).toFixed(1) + ' s' : Math.round(rnd(n)) + ' ms'}</td><td class="ok">${n <= 1024 ? (14 + n / 1024 * 8).toFixed(n < 100 ? 4 : 0) + ' ms' : '2 tracks × (14 + 8) = 44 ms (best case)'}</td></tr>`).join('')}</table>` }));
      }
    },
    {
      t: 'Disk scheduling: FCFS · SSTF · SCAN · C-SCAN · LOOK · C-LOOK',
      why: [['Goal', 'Reduce <b>seek time</b> (≈ the distance the head travels) and raise <b>bandwidth</b> (total bytes / time from the first request until the last one completes). Requests come from many concurrently running processes.'], ['Evolution', 'FCFS zigzags chaotically → SSTF picks the closest request (like SJF, can cause <b>starvation</b>) → SCAN sweeps like an elevator → C-SCAN serves in one direction only for more uniform waiting times → LOOK/C-LOOK do not go all the way to the edge if no requests remain there.']],
      exam: 'Slide (head at 53, queue 98, 183, 37, 122, 14, 124, 65, 67): FCFS = 640, SSTF = 236, SCAN (towards 0) = 236, C-SCAN = 382 (<b>including the 199 → 0 jump</b>), C-LOOK = 322 (including the 183 → 14 jump).',
      mount(el) {
        let q = [98, 183, 37, 122, 14, 124, 65, 67], hd = 53, alg = 'FCFS', dir = 'down', R;
        const DEF = { FCFS: 'up', SSTF: 'up', SCAN: 'down', LOOK: 'down', 'C-SCAN': 'up', 'C-LOOK': 'up' };
        Player(el, {
          base: 1000,
          setup(P) { const ds = fSel('Initial direction:', [['down', 'towards 0'], ['up', 'towards 199']], dir, v => { dir = v; P.rebuild(); }); P.top.append(fSel('Algorithm:', Object.keys(DEF).map(k => [k, k]), alg, v => { alg = v; dir = DEF[v]; ds.sel.value = dir; P.rebuild(); }), ds, fNum('Head at:', hd, 0, 199, v => { hd = v; P.rebuild(); }), fTxt('Queue:', q.join(','), v => { const r = v.split(/[ ,]+/).map(Number).filter(x => !isNaN(x) && x >= 0 && x <= 199); if (r.length) { q = r; P.rebuild(); } }, 220)); },
          build() {
            R = diskSim(q, hd, alg, dir, 199); let tot = 0; const st = [{ k: 0, tot: 0, msg: `The head is at cylinder ${hd}. ${alg === 'FCFS' ? 'Serve in arrival order.' : alg === 'SSTF' ? 'Always pick the closest request.' : alg.startsWith('C-') ? 'Serve in one direction only; at the end, jump back to the other end.' : 'Sweep in one direction, then reverse.'}` }];
            for (let k = 1; k < R.path.length; k++) { const a = R.path[k - 1], b = R.path[k]; tot += Math.abs(b - a); const served = q.includes(b) && R.order.includes(b); const isJump = alg.startsWith('C-') && ((a === 199 && b === 0) || (a === 0 && b === 199) || (alg === 'C-LOOK' && Math.abs(b - a) > 0 && ((dir === 'up' && b < a) || (dir === 'down' && b > a)))); st.push({ k, tot, msg: `${a} → ${b}: moves ${Math.abs(b - a)}${isJump ? ' (returning, <b>serving nothing</b> on the way, but the distance still counts)' : (!served ? ' (going to the edge of the disk)' : ' → serve ' + b)}. Total = <b>${tot}</b>.` }); }
            st.push({ k: R.path.length - 1, tot, fin: true, msg: `Total head movement: <b>${R.total}</b> cylinders.`, hold: 2 });
            return st;
          },
          render(s, P) {
            const W = 760, L = 30, T = 30, rowH = 26, Hh = T + (R.path.length) * rowH + 10; const sx = c => L + c * (W - L - 20) / 199;
            let g = `<svg viewBox="0 0 ${W} ${Hh}" width="100%" style="max-width:${W}px" class="gantt">`;
            [0, ...q, hd, 199].sort((a, b) => a - b).filter((v, i, a) => a.indexOf(v) === i).forEach(c => g += `<line x1="${sx(c)}" x2="${sx(c)}" y1="${T - 6}" y2="${Hh - 6}" stroke="var(--line)" stroke-dasharray="2 4"/><text x="${sx(c)}" y="${T - 10}" text-anchor="middle" style="${c === hd ? 'fill:var(--hl);font-weight:700' : ''}">${c}</text>`);
            const pts = R.path.slice(0, s.k + 1).map((c, i) => [sx(c), T + i * rowH]);
            g += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--acc)" stroke-width="2.5"/>`;
            pts.forEach((p, i) => { const c = R.path[i]; const req = i > 0 && R.order.includes(c) && q.includes(c); g += `<circle cx="${p[0]}" cy="${p[1]}" r="${i === s.k ? 7 : 4.5}" fill="${i === s.k ? 'var(--hl)' : req || i === 0 ? 'var(--acc)' : 'var(--panel)'}" stroke="var(--acc)" stroke-width="2"/>`; });
            g += '</svg>';
            const done = new Set(R.path.slice(1, s.k + 1));
            P.viz.innerHTML = `<div class="row" style="margin-bottom:6px"><div class="ccs-box"><div class="lab">Total movement</div><div class="v">${s.tot}</div></div><div class="grow"><div class="lab">Request queue</div><div class="qbox">${q.map(c => `<span class="chip ${done.has(c) ? 'ok' : ''}">${c}</span>`).join('')}</div></div></div>` + g;
          }
        });
        const cmp = h('div', { style: 'margin-top:10px' }); el.append(cmp);
        const ser = [{ name: 'Total distance (slide example)', vals: ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'].map(a => diskSim([98, 183, 37, 122, 14, 124, 65, 67], 53, a, DEF[a], 199).total), col: 'var(--acc)' }];
        cmp.innerHTML = '<div class="lab">Comparison on the slide example (SCAN, LOOK towards 0; C-SCAN, C-LOOK upwards)</div>' + barChart({ labels: ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'], series: ser, W: 560, H: 200, showV: true });
      }
    },
    {
      t: 'Reliability: striping, mirroring, RAID',
      why: [['Striping (RAID 0)', 'Split a file into blocks spread over n disks: block i → disk (i mod n) + 1. Parallel reads/writes make it fast, but there is no redundancy: losing 1 disk loses data.'], ['Mirroring (RAID 1)', 'Every disk has a copy. One logical disk = 2 physical disks. If one fails, the data can still be read from the other.'], ['Combined', '<b>RAID 0+1</b> (a mirror of stripes) and <b>RAID 1+0</b> (a stripe of mirrors): both fast and reliable. 1+0 tolerates failures better.']],
      mount(el) {
        let lvl = '0', nd = 4; const fail = new Set();
        const box = h('div');
        function layout() {
          const B = 8, place = [];
          for (let i = 0; i < B; i++) {
            if (lvl === '0') place.push([[i % nd, Math.floor(i / nd)]]);
            else if (lvl === '1') place.push(range(nd).map(d => [d, i]));
            else if (lvl === '01') { const half = nd / 2; place.push([[i % half, Math.floor(i / half)], [half + i % half, Math.floor(i / half)]]); }
            else { const pairs = nd / 2; const p = i % pairs; place.push([[2 * p, Math.floor(i / pairs)], [2 * p + 1, Math.floor(i / pairs)]]); }
          }
          return place;
        }
        function ok(i, pl) {
          if (lvl === '01') { const half = nd / 2; const setA = range(half).some(d => fail.has(d)), setB = range(half).some(d => fail.has(half + d)); return !setA || !setB; }
          return pl[i].some(([d]) => !fail.has(d));
        }
        function draw() {
          const pl = layout(); const rows = Math.max(...pl.flat().map(x => x[1])) + 1;
          const lost = pl.map((_, i) => !ok(i, pl));
          let s = `<div class="row" style="gap:8px">${range(nd).map(d => `<div class="ccs-box" style="min-width:120px;border-color:${fail.has(d) ? 'var(--bad)' : 'var(--line)'};background:${fail.has(d) ? 'var(--bad-soft)' : 'var(--panel)'}"><div class="lab">Disk ${d + 1}${lvl === '01' ? (d < nd / 2 ? ' · stripe A' : ' · stripe B') : lvl === '10' ? ' · pair ' + (Math.floor(d / 2) + 1) : ''}</div>${range(rows).map(r => { const i = pl.findIndex(p => p.some(([dd, rr]) => dd === d && rr === r)); return `<div class="chip p" style="display:flex;justify-content:center;margin:3px 0;background:${i < 0 ? 'var(--line)' : pcol(i)};opacity:${fail.has(d) ? 0.35 : 1}">${i < 0 ? '—' : 'Block ' + i}</div>`; }).join('')}<label style="font-size:12px"><input type="checkbox" data-d="${d}" ${fail.has(d) ? 'checked' : ''}> failed</label></div>`).join('')}</div>`;
          s += `<div class="alert ${lost.some(x => x) ? 'bad' : 'ok'}">${lost.some(x => x) ? `Data lost: block ${lost.map((x, i) => x ? i : null).filter(x => x != null).join(', ')}` : 'Every block is still readable.'}${lvl === '01' && fail.size ? ' (RAID 0+1: one failed disk makes its whole stripe set count as failed.)' : ''}</div>`;
          box.innerHTML = s; box.querySelectorAll('input[data-d]').forEach(c => c.onchange = e => { const d = +e.target.dataset.d; e.target.checked ? fail.add(d) : fail.delete(d); draw(); });
        }
        const ndSel = fSel('Disks:', [['2', '2'], ['3', '3'], ['4', '4']], '4', v => { nd = +v; fail.clear(); draw(); });
        el.append(h('div', { class: 'row', style: 'align-items:center;margin-bottom:8px' }, fSel('Configuration:', [['0', 'RAID 0 (striping)'], ['1', 'RAID 1 (mirroring)'], ['01', 'RAID 0+1 (mirror of stripes)'], ['10', 'RAID 1+0 (stripe of mirrors)']], '0', v => { lvl = v; if (v === '01' || v === '10') { nd = 4; ndSel.sel.value = '4'; } if (v === '1' && nd > 2) { nd = 2; ndSel.sel.value = '2'; } fail.clear(); draw(); }), ndSel, h('span', { class: 'mut', style: 'font-size:13px' }, 'Mark individual disks as “failed” to experiment.')), box); draw();
      }
    }
  ],
  quiz: [
    { q: 'Head at 53, queue 98, 183, 37, 122, 14, 124, 65, 67. Total SSTF movement?', o: ['640', '236', '208', '322'], a: 1, e: '53→65→67→37→14→98→122→124→183 = 236.' },
    { q: 'C-SCAN (upwards, max 199) for the same data?', o: ['236', '382', '322', '640'], a: 1, e: 'Up to 199, jump back to 0 (counting 199), serve 14, 37 → 382.' },
    { q: 'C-LOOK differs from C-SCAN in that it:', o: ['Serves both directions', 'Goes only as far as the last request, then returns to the smallest request, without going to the edge of the disk', 'Does not count the return trip', 'Prioritizes nearby requests'], a: 1, e: 'LOOK/C-LOOK “look” whether any requests remain before moving on.' },
    { q: 'Which disk algorithm can cause starvation?', o: ['FCFS', 'SSTF', 'C-SCAN', 'C-LOOK'], a: 1, e: 'SSTF is like SJF: a far request may never be served if nearby requests keep arriving.' },
    { q: 'Seek 10 ms, 1 rotation 8 ms, 1024 sectors/track. A random read of 1 sector takes about:', o: ['8 ms', '14 ms', '18 ms', '10 ms'], a: 1, e: '10 + 4 (½ rotation) + 8/1024 ≈ 14 ms.' },
    { q: 'With asynchronous I/O, when does the system call return?', o: ['Khi I/O xong', 'After the request is queued at the device', 'Never', 'Sau timeout'], a: 1, e: 'The process keeps running and is signalled when the I/O completes.' },
    { q: 'Striping over n = 4 disks: which disk holds block 9?', o: ['Disk 1', 'Disk 2', 'Disk 3', 'Disk 4'], a: 1, e: '(9 mod 4) + 1 = 2.' },
    { q: 'Spooling is used for:', o: ['Devices that serve one request at a time, such as printers', 'Speeding up re-reads of a file', 'Smoothing out network packet-size differences', 'Disk scheduling'], a: 0, e: 'A cache speeds up re-reads; a buffer smooths speed/size differences; a spool queues output.' }
  ]
});
