// ================= CHAPTER 8: MEMORY ORGANIZATION =================
chapter({
  t: 'Memory Organization', short: 'Memory Org',
  lead: 'A program must be in memory to run. The recurring question: when and how does an <b>address in the code</b> (logical) become an <b>address in RAM</b> (physical)? And how do we fit many processes into RAM without wasting space?',
  sections: [
    {
      t: 'Address binding: compile time, load time hay execution time',
      why: [['Pipeline', 'Compiler → object module → linker (adds libraries) → load module → loader (creates the process image, allocates memory, loads it into RAM).'], ['Question', 'In <code>LOAD X</code>, what kind of address is X? The <b>later</b> it is bound to a physical address, the more flexible: execution-time binding lets a running process be moved, which is the basis of compaction, swapping and paging.']],
      exam: 'Compile/load-time binding: the process image uses <b>absolute addresses</b>; legal when base ≤ addr &lt; base + limit. Execution time: uses <b>relative addresses</b>; legal when addr &lt; limit, then physical = addr + base. With execution-time binding the logical address space always starts at 0.',
      mount(el) {
        let S, mode = 'exec';
        function build() {
          const st = []; const push = (o, msg) => st.push({ ...o, msg });
          const img = mode === 'compile' ? ['…', 'JUMP 1424', 'LOAD 1824'] : ['…', 'JUMP 400', 'LOAD 800'];
          push({ img, mem: null, base: 1024 }, mode === 'compile' ? 'The compiler <b>knows in advance</b> the program will be loaded at 1024 → generates <b>absolute code</b>: LOAD 1824.' : 'The compiler generates <b>relocatable code</b> with addresses from 0: data Y at offset 800, a jump label at 400.');
          const memImg = mode === 'exec' ? img : ['…', 'JUMP 1424', 'LOAD 1824'];
          push({ img, mem: memImg, base: 1024, ld: true }, mode === 'load' ? 'The <b>loader</b> loads at 1024 and <b>adds 1024 to every address</b> in the code: 800 → 1824 (binding at load time).' : mode === 'compile' ? 'The loader copies it verbatim to exactly 1024.' : 'The loader copies the relative address (800) <b>as is</b> into memory and sets the <b>base (relocation) register = 1024</b>, limit = 1000.');
          if (mode === 'exec') push({ img, mem: memImg, base: 1024, cpu: 800, chk: 'lim', phys: 1824 }, 'The CPU executes LOAD 800: it issues logical address 800. The MMU checks 800 &lt; limit (1000), then adds base: <b>800 + 1024 = 1824</b>.');
          else push({ img, mem: memImg, base: 1024, cpu: 1824, chk: 'abs', phys: 1824 }, 'The CPU issues address 1824 (absolute). The hardware only checks 1024 ≤ 1824 &lt; 2024 and adds nothing.');
          push({ img, mem: memImg, base: 3000, moved: true }, 'The OS needs to <b>move the process</b> to 3000 (e.g. for compaction, or after swapping out and reloading elsewhere).');
          if (mode === 'exec') push({ img, mem: memImg, base: 3000, moved: true, cpu: 800, chk: 'lim', phys: 3800, ok: true }, 'Just set base = 3000. LOAD 800 → 800 + 3000 = <b>3800</b>, still the right place. <span class="ok">Execution-time binding allows relocation.</span>');
          else push({ img, mem: memImg, base: 3000, moved: true, cpu: 1824, chk: 'abs', phys: 1824, bad: true }, `The code in memory still says LOAD 1824 → points at the old area (now someone else's). <span class="bad">Wrong!</span> You must ${mode === 'compile' ? '<b>recompile</b>' : '<b>reload</b> (the loader recomputes)'}.`);
          return st;
        }
        Player(el, {
          setup(P) { P.top.append(fSel('Binding at:', [['compile', 'Compile time'], ['load', 'Load time'], ['exec', 'Execution time']], mode, v => { mode = v; P.rebuild(); })); S = new Stage(P.viz, 900, 300); }, build, base: 2000,
          render(s) {
            S.begin();
            S.box('dk', { x: 10, y: 10, w: 230, h: 150, cls: 'zone hw', html: 'Process image on disk' });
            s.img.forEach((l, i) => S.box('i' + i, { x: 25, y: 40 + i * 36, w: 200, h: 30, cls: 'code', html: `<span class="mut">${[0, 400, 800][i]}:</span> ${l}` }));
            S.box('cpu', { x: 10, y: 190, w: 230, h: 90, cls: 'hw', html: '' });
            S.box('cpuT', { x: 20, y: 194, w: 210, h: 16, cls: 'ttl', html: 'CPU + MMU' });
            S.box('reg', { x: 20, y: 216, w: 210, h: 26, cls: 'code ' + (s.moved ? 'hl' : ''), html: mode === 'exec' ? `base=${s.base}  limit=1000` : `base=${s.base}  limit=1000` });
            if (s.cpu != null) S.box('ad', { x: 20, y: 248, w: 210, h: 26, cls: 'code ' + (s.bad ? 'bad' : s.ok ? 'ok' : 'hl'), html: s.chk === 'lim' ? `${s.cpu} &lt; 1000 ✓ → ${s.cpu}+${s.base}` : `${s.cpu} (absolute)` });
            const MX = 560, y = a => 10 + 280 * a / 4200;
            S.box('mem', { x: MX, y: 10, w: 160, h: 280, cls: 'zone', html: '' });
            [0, 1024, 2024, 3000, 4000].forEach(a => S.box('a' + a, { x: MX - 60, y: y(a) - 8, w: 54, h: 16, cls: 'lbl', html: a }));
            if (s.mem) s.mem.forEach((l, i) => S.box('m' + i, { x: MX + 6, y: y(s.base) + 6 + i * 26, w: 148, h: 22, cls: 'code user', html: l, fs: 11 }));
            if (s.mem) S.box('pr', { x: MX + 2, y: y(s.base), w: 156, h: y(1000) - y(0), cls: 'zone user', html: '', z: -1 });
            S.box('Y', { x: MX + 170, y: y(s.base + 800) - 10, w: 120, h: 20, cls: 'lbl l', html: '← data Y is here' });
            if (s.phys) { S.box('pt', { x: MX + 170, y: y(s.phys) - 10, w: 150, h: 20, cls: 'lbl l', fg: s.bad ? 'var(--bad)' : 'var(--ok)', html: `◀ access ${s.phys}` }); S.line('acc', { x1: 240, y1: 260, x2: MX, y2: y(s.phys), c: s.bad ? 'bad' : 'ok', arrow: true }); }
            if (s.ld) S.line('ld', { x1: 240, y1: 80, x2: MX, y2: y(s.base) + 20, c: 'acc', arrow: true, dash: true });
            S.end();
          }
        });
      }
    },
    {
      t: 'Contiguous allocation, dynamic partitioning: first-fit, best-fit, worst-fit',
      why: [['Fixed partitioning', 'Fixed partitions set up in advance → a small process wastes the leftover inside its partition (<b>internal fragmentation</b>).'], ['Dynamic partitioning', 'Allocate exactly the requested size from a big-enough <b>hole</b>; the OS tracks allocated areas and holes. Over time memory breaks into many small holes: enough in total but not contiguous (<b>external fragmentation</b>).'], ['Fix', '<b>Compaction</b>: slide processes together to merge the holes. Only possible with execution-time binding.']],
      exam: 'First-fit is fast (stops at the first big-enough hole). Best-fit leaves the smallest leftover hole. Worst-fit leaves the largest leftover hole. Best and worst must scan the whole list (unless it is sorted by size).',
      mount(el) {
        let S, fit = 'first', comp = false;
        const jobs = [['P1', 600, 10], ['P2', 1000, 5], ['P3', 300, 20], ['P4', 700, 8], ['P5', 500, 15]].map(([name, size, dur]) => ({ name, size, dur }));
        Player(el, {
          setup(P) { P.top.append(fSel('Strategy:', [['first', 'First-fit'], ['best', 'Best-fit'], ['worst', 'Worst-fit']], fit, v => { fit = v; P.rebuild(); }), fChk(' Automatic compaction', comp, v => { comp = v; P.rebuild(); })); S = new Stage(P.viz, 900, 330); },
          build: () => partSim(jobs, { total: 2560, os: 400, fit, compact: comp }), base: 1900,
          render(s) {
            S.begin(); const X = 350, y = a => 10 + 310 * a / 2560;
            S.box('os', { x: X, y: y(0), w: 200, h: y(400) - y(0), cls: 'kern', html: 'OS (400K)' });
            s.mem.forEach(b => { if (b.p) S.box('p' + b.p, { x: X, y: y(b.s), w: 200, h: y(b.s + b.z) - y(b.s) - 1, cls: 'tok sq', bg: pcol(b.pi), html: `${b.p} · ${b.z}K`, z: 3 }); else S.box('h' + b.s, { x: X, y: y(b.s), w: 200, h: y(b.s + b.z) - y(b.s) - 1, cls: 'zone ' + (s.frag ? 'bad' : ''), html: `hole ${b.z}K` }); });
            [0, 400, 1000, 2000, 2300, 2560].forEach(a => S.box('ax' + a, { x: X - 56, y: y(a) - 8, w: 50, h: 16, cls: 'lbl', html: a + 'K' }));
            S.box('qT', { x: 10, y: 10, w: 260, h: 18, cls: 'ttl', html: `Job queue (FCFS) · t = ${s.t}` });
            jobs.forEach((j, i) => { const k = s.queue.indexOf(i); S.box('q' + i, { x: 10, y: 36 + i * 36, w: 260, h: 30, cls: k < 0 ? 'dim' : s.hl === i ? 'hl' : '', html: `${pchip(j.name, i)} ${j.size}K · ${j.dur} units ${k < 0 ? '✓ allocated' : ''}`, bc: pcol(i) }); });
            const free = s.mem.filter(b => !b.p), tot = free.reduce((a, b) => a + b.z, 0), big = Math.max(0, ...free.map(b => b.z));
            S.box('st', { x: 560, y: 20, w: 320, h: 120, cls: 'zone', html: `<div style="width:100%;text-align:left;color:var(--ink);font-weight:500">Holes: <b>${free.length}</b><br>Total free: <b>${tot}K</b><br>Largest hole: <b>${big}K</b><br>${tot > big ? `<span class="bad">External fragmentation: ${tot - big}K cannot serve a contiguous request</span>` : ''}</div>` });
            S.end();
          }
        });
      }
    },
    {
      t: 'Paging: translating logical → physical addresses',
      why: [['Problem', 'Contiguous allocation causes external fragmentation and makes it hard to find a fitting hole.'], ['Idea', 'Divide RAM into <b>frames</b> and the logical space into <b>pages</b> of the same size (a power of 2). A process is scattered into any free frames; the <b>page table</b> records which page is in which frame. No external fragmentation; only internal fragmentation in the last page.'], ['Why a power of 2', 'With page size 2<sup>n</sup> and address space 2<sup>m</sup>: the low n bits are the <b>offset d</b>, the high m−n bits are the <b>page number p</b>. No division needed, just split the bits. Physical = frame · 2<sup>n</sup> + d, i.e. concatenate the bits of f and d.']],
      mount(el) {
        let S, la = 7; const PT = [5, 6, 1, 2], L = 'abcdefghijklmnop';
        const bin = (v, n) => v.toString(2).padStart(n, '0');
        function build() {
          const p = la >> 2, d = la & 3, f = PT[p], pa = f * 4 + d;
          return [
            { ph: 0, msg: `Logical address = <b>${la}</b> = <code>${bin(la, 4)}</code> (16-byte space → m = 4 bits; 4-byte page → n = 2 bits).` },
            { ph: 1, msg: `Split the bits: <b>p</b> = <code>${bin(p, 2)}</code> = ${p} (2 high bits), <b>d</b> = <code>${bin(d, 2)}</code> = ${d} (2 low bits). This byte is '${L[la]}'.` },
            { ph: 2, msg: `Tra page table[${p}] → frame <b>${f}</b>.` },
            { ph: 3, msg: `Physical = f·4 + d = ${f}·4 + ${d} = <b>${pa}</b> = <code>${bin(f, 3)}|${bin(d, 2)}</code>: just concatenate f and d. RAM[${pa}] = '${L[la]}' ✓` }
          ];
        }
        Player(el, {
          setup(P) { const a = fNum('Logical address (0–15):', la, 0, 15, v => { la = v; P.rebuild(); }); P.top.append(a, btn('Slide example: 0111', () => { la = 7; a.inp.value = 7; P.rebuild(); }), btn('Random', () => { la = Math.floor(Math.random() * 16); a.inp.value = la; P.rebuild(); })); S = new Stage(P.viz, 900, 340); },
          build, base: 1700,
          render(s) {
            S.begin(); const p = la >> 2, d = la & 3, f = PT[p];
            S.box('lt', { x: 10, y: 4, w: 160, h: 16, cls: 'ttl', html: 'Logical memory' });
            range(16).forEach(i => S.box('l' + i, { x: 10 + (i >> 2) * 0 + 40, y: 24 + i * 19, w: 70, h: 18, cls: 'code ' + (i === la && s.ph >= 1 ? 'hl' : (i >> 2) === p && s.ph >= 1 ? 'acc' : ''), html: `${i}: ${L[i]}`, fs: 11 }));
            range(4).forEach(k => S.box('lp' + k, { x: 10, y: 24 + k * 76 + 28, w: 28, h: 18, cls: 'lbl', html: 'pg' + k }));
            S.box('ptT', { x: 250, y: 90, w: 140, h: 16, cls: 'ttl', html: 'Page table' });
            PT.forEach((fr, k) => S.box('pt' + k, { x: 250, y: 110 + k * 34, w: 140, h: 30, cls: 'code ' + (k === p && s.ph >= 2 ? 'hl' : ''), html: `page ${k} → frame ${fr}` }));
            S.box('ab', { x: 430, y: 20, w: 200, h: 46, cls: 'big', html: s.ph >= 1 ? `<span style="color:var(--acc)">${bin(p, 2)}</span>|<span style="color:var(--hl)">${bin(d, 2)}</span>` : bin(la, 4) });
            S.box('abl', { x: 430, y: 68, w: 200, h: 16, cls: 'lbl', html: s.ph >= 1 ? 'p | d' : 'logical (4 bit)' });
            if (s.ph >= 3) { S.box('pb', { x: 430, y: 250, w: 200, h: 46, cls: 'big ok', html: `<span style="color:var(--acc)">${bin(f, 3)}</span>|<span style="color:var(--hl)">${bin(d, 2)}</span>` }); S.box('pbl', { x: 430, y: 298, w: 200, h: 16, cls: 'lbl', html: 'physical (5 bit) = ' + (f * 4 + d) }); }
            S.box('pmT', { x: 700, y: 4, w: 190, h: 16, cls: 'ttl', html: 'Physical memory (8 frame)' });
            range(8).forEach(fr => { const pg = PT.indexOf(fr); S.box('f' + fr, { x: 700, y: 24 + fr * 39, w: 190, h: 36, cls: (fr === f && s.ph >= 2) ? 'hl' : pg >= 0 ? 'user' : 'zone', html: `frame ${fr}: ${pg >= 0 ? range(4).map(k => (fr === f && k === d && s.ph >= 3) ? `<b style="color:var(--bad)">${L[pg * 4 + k]}</b>` : L[pg * 4 + k]).join(' ') : '<span class="mut">free</span>'}`, fs: 12 }); });
            if (s.ph >= 2) S.line('l1', { x1: 120, y1: 24 + la * 19 + 9, x2: 250, y2: 125 + p * 34, c: 'acc', arrow: true });
            if (s.ph >= 2) S.line('l2', { x1: 390, y1: 125 + p * 34, x2: 700, y2: 42 + f * 39, c: 'hl', arrow: true });
            S.end();
          }
        });
      }
    },
    {
      t: 'The page table lives in RAM → a TLB avoids 2 memory accesses',
      why: [['Problem', 'The page table is too big for registers, so it lives in RAM (PTBR points to it, PTLR gives its size). Every data access becomes <b>2</b> RAM accesses: one for the page table, one for the data. EAT = 2µ.'], ['Idea', 'A hardware cache searched in parallel for recently used page → frame mappings: the <b>TLB</b> (associative registers). Hit: µ + ε. Miss: 2µ + ε.']],
      exam: 'EAT = (µ + ε)α + (2µ + ε)(1 − α) = (2 − α)µ + ε. E.g. µ = 100 ns, ε = 20 ns, α = 0.8: EAT = 1.2·100 + 20 = 140 ns.',
      mount(el) {
        let refs = [0, 1, 0, 2, 0, 1, 3, 0, 2, 3, 0, 1], cap = 2, mu = 100, eps = 20;
        function build() {
          let tlb = [], hits = 0, t = 0; const st = [{ tlb: [], k: -1, hits: 0, acc: 0, msg: `The TLB has ${cap} entries (LRU replacement). Each reference: look up the TLB first (ε = ${eps} ns), then access RAM (µ = ${mu} ns).` }];
          refs.forEach((p, k) => {
            const hit = tlb.includes(p); let msg;
            if (hit) { hits++; tlb = [p, ...tlb.filter(x => x !== p)]; t += mu + eps; msg = `Page ${p}: <span class="ok">TLB hit</span> → frame found immediately, only 1 RAM access: ${eps} + ${mu} = ${eps + mu} ns.`; }
            else { const ev = tlb.length >= cap ? tlb[tlb.length - 1] : null; tlb = [p, ...tlb].slice(0, cap); t += 2 * mu + eps; msg = `Page ${p}: <span class="bad">TLB miss</span> → read the page table in RAM (${mu} ns more), then the data: ${eps} + 2·${mu} = ${eps + 2 * mu} ns. Load it into the TLB${ev != null ? ', evicting page ' + ev + ' ra' : ''}.`; }
            st.push({ tlb: [...tlb], k, hit, hits, acc: t, msg });
          });
          const a = hits / refs.length; st.push({ ...st[st.length - 1], fin: true, msg: `Hit ratio α = ${hits}/${refs.length} = ${a.toFixed(2)}. EAT = (2 − α)µ + ε = ${((2 - a) * mu + eps).toFixed(1)} ns, versus 2µ = ${2 * mu} ns without a TLB. In practice, thanks to locality, α is usually above 0.9.`, hold: 2 });
          return st;
        }
        Player(el, {
          setup(P) { P.top.append(fTxt('Page string:', refs.join(','), v => { const r = v.split(/[ ,]+/).map(Number).filter(x => !isNaN(x)); if (r.length) { refs = r; P.rebuild(); } }, 200), fNum('TLB entries:', cap, 1, 6, v => { cap = v; P.rebuild(); }), fNum('µ (ns):', mu, 1, 1000, v => { mu = v; P.rebuild(); }), fNum('ε (ns):', eps, 0, 500, v => { eps = v; P.rebuild(); })); },
          build, base: 1400,
          render(s, P) {
            P.viz.innerHTML = `<div class="lab">Page reference string</div><div class="row" style="gap:4px">${refs.map((p, k) => `<span class="chip ${k === s.k ? (s.hit ? 'ok' : 'bad') : k < s.k ? '' : ''}" style="${k > s.k ? 'opacity:.4' : ''}">${p}</span>`).join('')}</div>
            <div class="row" style="margin-top:10px"><div><div class="lab">TLB (recent → old)</div><div class="qbox" style="min-width:200px">${s.tlb.map(p => `<span class="chip acc">page ${p} → frame ${[5, 6, 1, 2, 7, 3, 0, 4][p % 8]}</span>`).join('') || '<span class="mut">empty</span>'}</div></div>
            <div class="ccs-box"><div class="lab">Hits</div><div class="v">${s.hits}/${Math.max(0, s.k + 1)}</div></div><div class="ccs-box"><div class="lab">Total time</div><div class="v">${s.acc} ns</div></div></div>
            <div class="formula" style="margin-top:10px">EAT = (µ+ε)·α + (2µ+ε)·(1−α) = (2−α)·µ + ε</div>`;
          }
        });
      }
    },
    {
      t: 'Two-level page table (32-bit, 4 KB pages)',
      why: [['Problem', '32-bit, 4 KB pages → 12-bit offset, 20-bit page number → 2<sup>20</sup> entries × 4 B = a <b>4 MB</b> page table per process, which must also be contiguous in RAM.'], ['Idea', '<b>Page the page table itself</b>: cut the 4 MB into 2<sup>10</sup> pages of 4 KB (each holding 2<sup>10</sup> entries). An outer table (2<sup>10</sup> entries = exactly 1 page) points to those pages. Address = p1 (10) | p2 (10) | d (12). The price: one more RAM access.']],
      mount(el) {
        let hex = '00403A7C';
        const fr = (seed) => ((seed * 2654435761) >>> 0) % 50000 + 100;
        function build() {
          const a = parseInt(hex, 16) >>> 0; const p1 = a >>> 22, p2 = (a >>> 12) & 1023, d = a & 4095; const F1 = fr(p1 + 7), F2 = fr(p1 * 1024 + p2 + 13);
          const b = a.toString(2).padStart(32, '0');
          const show = `<code><span style="color:var(--acc)">${b.slice(0, 10)}</span> <span style="color:var(--ok)">${b.slice(10, 20)}</span> <span style="color:var(--hl)">${b.slice(20)}</span></code>`;
          return [
            { ph: 0, a, p1, p2, d, F1, F2, msg: `Logical 0x${hex.toUpperCase()} = ${show}` },
            { ph: 1, a, p1, p2, d, F1, F2, msg: `p1 = ${p1}, p2 = ${p2}, d = ${d}. The <b>PTBR</b> points to the outer page table (1 page, 1024 entries).` },
            { ph: 2, a, p1, p2, d, F1, F2, msg: `RAM access #1: outer[${p1}] = frame <b>F#1 = ${F1}</b>, which holds the inner page-table page.` },
            { ph: 3, a, p1, p2, d, F1, F2, msg: `RAM access #2: inner(F#1)[${p2}] = frame <b>F#2 = ${F2}</b>.` },
            { ph: 4, a, p1, p2, d, F1, F2, msg: `Physical = F#2 · 4096 + d = ${F2}·4096 + ${d} = <b>${F2 * 4096 + d}</b>. RAM access #3 fetches the data. A TLB hit skips #1 and #2.` }
          ];
        }
        let S;
        Player(el, {
          setup(P) { P.top.append(fTxt('Hex address (32-bit):', hex, v => { if (/^[0-9a-fA-F]{1,8}$/.test(v)) { hex = v.padStart(8, '0'); P.rebuild(); } }, 110)); S = new Stage(P.viz, 900, 260); }, build, base: 1700,
          render(s) {
            S.begin();
            S.box('a1', { x: 20, y: 10, w: 110, h: 40, cls: 'acc', html: `p1 = ${s.p1}<span class="s">10 bit</span>` }); S.box('a2', { x: 135, y: 10, w: 110, h: 40, cls: 'ok', html: `p2 = ${s.p2}<span class="s">10 bit</span>` }); S.box('a3', { x: 250, y: 10, w: 110, h: 40, cls: 'hl', html: `d = ${s.d}<span class="s">12 bit</span>` });
            S.box('ptbr', { x: 20, y: 90, w: 110, h: 34, cls: 'kern', html: 'PTBR' });
            S.box('ot', { x: 200, y: 80, w: 170, h: 160, cls: 'zone kern', html: 'outer page table<br>(1024 entry)' });
            if (s.ph >= 2) S.box('oe', { x: 210, y: 150, w: 150, h: 28, cls: 'code hl', html: `[${s.p1}] → F#1 ${s.F1}` });
            S.box('it', { x: 440, y: 80, w: 190, h: 160, cls: 'zone kern', op: s.ph >= 2 ? 1 : 0.3, html: `page-table page<br>in frame ${s.ph >= 2 ? s.F1 : '?'}` });
            if (s.ph >= 3) S.box('ie', { x: 450, y: 170, w: 170, h: 28, cls: 'code hl', html: `[${s.p2}] → F#2 ${s.F2}` });
            S.box('pf', { x: 700, y: 80, w: 180, h: 160, cls: 'zone user', op: s.ph >= 3 ? 1 : 0.3, html: `data page<br>in frame ${s.ph >= 3 ? s.F2 : '?'}` });
            if (s.ph >= 4) S.box('pe', { x: 710, y: 190, w: 160, h: 28, cls: 'code ok', html: `+ ${s.d} → ${s.F2 * 4096 + s.d}` });
            if (s.ph >= 1) S.line('l0', { x1: 130, y1: 107, x2: 200, y2: 110, c: 'ink', arrow: true });
            if (s.ph >= 2) S.line('l1', { x1: 360, y1: 164, x2: 440, y2: 130, c: 'acc', arrow: true });
            if (s.ph >= 3) S.line('l2', { x1: 620, y1: 184, x2: 700, y2: 140, c: 'ok', arrow: true });
            S.end();
          }
        });
        el.append(h('div', { class: 'formula', style: 'margin-top:10px', html: 'One level: 2<sup>20</sup> entries × 4 B = 4 MB (must be contiguous).<br>Two levels: outer = 4 MB / 4 KB = 2<sup>10</sup> entries → p1 = 10 bits; each inner page holds 4 KB / 4 B = 2<sup>10</sup> entries → p2 = 10 bits; d = 12 bits.' }));
      }
    },
    {
      t: 'Inverted page table',
      why: [['Problem', 'One page table per process, sized by the <i>logical</i> space → the page tables add up to a lot.'], ['Idea', 'A <b>single table</b> for the whole system, <b>one entry per physical frame</b> &lt;pid, page&gt;. Look up &lt;pid, p&gt;; a match at entry i gives physical = &lt;i, d&gt;. The price is a <b>search</b>, because the table is ordered by physical frame but queried by logical page.']],
      mount(el) {
        const IPT = [[2, 0], [1, 3], [1, 0], [3, 2], [2, 1], [1, 1], [3, 0], [2, 4]]; let pid = 1, pg = 1, off = 9;
        function build() {
          const st = [{ k: -1, msg: `Look up &lt;pid=${pid}, page=${pg}&gt; with offset d=${off}.` }];
          for (let i = 0; i < IPT.length; i++) { const m = IPT[i][0] === pid && IPT[i][1] === pg; st.push({ k: i, m, msg: `Entry ${i}: &lt;${IPT[i][0]}, ${IPT[i][1]}&gt; ${m ? `<span class="ok">match!</span> → physical = &lt;frame ${i}, ${off}&gt;` : '≠ → keep comparing'}` }); if (m) return st; }
          st.push({ k: 99, msg: '<span class="bad">No entry matches</span> → the page is not in RAM (page fault) or the access is illegal.' }); return st;
        }
        Player(el, {
          setup(P) { P.top.append(fNum('pid:', pid, 1, 3, v => { pid = v; P.rebuild(); }), fNum('page:', pg, 0, 5, v => { pg = v; P.rebuild(); }), fNum('offset:', off, 0, 4095, v => { off = v; P.rebuild(); })); }, build, base: 900,
          render(s, P) { P.viz.innerHTML = `<table class="t"><tr><th>Entry i (= frame)</th><th>pid</th><th>page</th></tr>${IPT.map((e, i) => `<tr><td>${i}</td><td class="${i === s.k ? (s.m ? 'ok' : 'hl') : ''}">${e[0]}</td><td class="${i === s.k ? (s.m ? 'ok' : 'hl') : ''}">${e[1]}</td></tr>`).join('')}</table>`; }
        });
      }
    },
    {
      t: 'Segmentation: dividing by logical units',
      why: [['Idea', 'Programmers think in logical units: main, functions, the stack, arrays… A <b>segment</b> has variable size; an address = &lt;segment-no, offset&gt;. The segment table stores (base, limit) per segment; STBR points to the table, STLR = number of segments.'], ['Cost', 'Segments have different lengths, so allocation works like dynamic partitioning (first/best fit) → <b>external fragmentation</b> returns.']],
      mount(el) {
        const ST = [[1000, 1400], [400, 6300], [400, 4300], [1100, 3200], [1000, 4700]]; let sg = 3, d = 128, S;
        function build() {
          const st = [{ ph: 0, msg: `Logical &lt;${sg}, ${d}&gt;.` }];
          if (sg >= ST.length) { st.push({ ph: 9, msg: `s = ${sg} ≥ STLR (5) → <span class="bad">trap: invalid segment</span>.` }); return st; }
          const [lim, base] = ST[sg];
          st.push({ ph: 1, msg: `(1) Tra segment table[${sg}] (STBR + ${sg}) → base = ${base}, limit = ${lim}.` });
          if (d >= lim) { st.push({ ph: 9, msg: `(2) ${d} &lt; ${lim}? <span class="bad">Sai → trap: addressing error</span>.` }); return st; }
          st.push({ ph: 2, msg: `(2) ${d} &lt; ${lim} ✓` }); st.push({ ph: 3, msg: `(3) Physical = base + d = ${base} + ${d} = <b>${base + d}</b>.` }); return st;
        }
        Player(el, {
          setup(P) { const a = fNum('segment:', sg, 0, 6, v => { sg = v; P.rebuild(); }), b = fNum('offset:', d, 0, 5000, v => { d = v; P.rebuild(); }); P.top.append(a, b, btn('Slide: <3,128>', () => { sg = 3; d = 128; a.inp.value = 3; b.inp.value = 128; P.rebuild(); }), btn('<2,500> (error)', () => { sg = 2; d = 500; a.inp.value = 2; b.inp.value = 500; P.rebuild(); })); S = new Stage(P.viz, 900, 300); },
          build, base: 1600,
          render(s) {
            S.begin();
            S.box('stT', { x: 10, y: 6, w: 260, h: 16, cls: 'ttl', html: 'Segment table (limit, base)' });
            ST.forEach(([l, b], i) => S.box('st' + i, { x: 10, y: 28 + i * 34, w: 260, h: 30, cls: 'code ' + (i === sg && s.ph >= 1 ? (s.ph === 9 ? 'bad' : 'hl') : ''), html: `seg ${i}: limit ${l}, base ${b}` }));
            if (s.ph === 9) S.box('tr', { x: 300, y: 120, w: 200, h: 44, cls: 'bad', html: '<b>TRAP</b> → OS' });
            const X = 640, y = a => 10 + 280 * a / 7000;
            S.box('pm', { x: X, y: 10, w: 160, h: 280, cls: 'zone', html: '' });
            ST.forEach(([l, b], i) => S.box('ps' + i, { x: X + 2, y: y(b), w: 156, h: y(b + l) - y(b) - 1, cls: 'tok sq', bg: pcol(i), op: i === sg ? 1 : 0.55, html: `seg ${i}` }));
            [0, 1400, 2400, 3200, 4300, 4700, 5700, 6300, 6700].forEach(a => S.box('pa' + a, { x: X + 166, y: y(a) - 8, w: 60, h: 16, cls: 'lbl l', html: a }));
            if (s.ph === 3) { const pa = ST[sg][1] + d; S.box('pp', { x: X - 160, y: y(pa) - 12, w: 150, h: 24, cls: 'ok', html: '◀ ' + pa }); S.line('pl', { x1: 270, y1: 43 + sg * 34, x2: X - 160, y2: y(pa), c: 'ok', arrow: true }); }
            S.end();
          }
        });
      }
    }
  ],
  quiz: [
    { q: 'Compaction is possible only when:', o: ['Using compile-time binding', 'Using load-time binding', 'Using relocatable addresses and execution-time binding', 'Using fixed partitioning'], a: 2, e: 'Moving a running process only requires changing the base register when addresses are bound at execution time.' },
    { q: 'Holes: 100K, 500K, 200K, 300K, 600K (in order). For a 212K request, which hole does best-fit choose?', o: ['500K', '300K', '600K', '200K'], a: 1, e: 'Best-fit: the smallest hole that fits (≥ 212K) is 300K. First-fit picks 500K, worst-fit picks 600K.' },
    { q: 'Which kind of fragmentation does paging eliminate?', o: ['Internal', 'External', 'Both', 'Neither'], a: 1, e: 'All frames are the same size, so there is no external fragmentation. Internal fragmentation remains in the last page.' },
    { q: 'Page size 4 byte, page table [5, 6, 1, 2]. Logical address 13 → physical?', o: ['9', '13', '21', '5'], a: 0, e: '13 = page 3, offset 1 → frame 2 → 2·4 + 1 = 9.' },
    { q: 'µ = 100 ns, ε = 20 ns, α = 0.9. EAT?', o: ['120 ns', '130 ns', '210 ns', '200 ns'], a: 1, e: '(2 − 0.9)·100 + 20 = 130 ns.' },
    { q: '32-bit system, 4 KB pages, 4 B entries, two levels 10|10|12. How big is the outer page table?', o: ['4 MB', '4 KB', '1 KB', '16 KB'], a: 1, e: '2^10 entries × 4 B = 4 KB, exactly one page.' },
    { q: 'Main drawback of an inverted page table?', o: ['It uses more memory', 'Slow lookup, because it must search by &lt;pid, page&gt;', 'It cannot support multiple processes', 'It causes external fragmentation'], a: 1, e: 'The table is ordered by physical frame but queried by logical page → a search is needed.' },
    { q: 'Segment 3 has base 3200, limit 1100. Address &lt;3, 1100&gt;?', o: ['4300', '3200', 'Trap', '1100'], a: 2, e: 'We need d < limit; 1100 is not < 1100 → trap.' }
  ]
});
