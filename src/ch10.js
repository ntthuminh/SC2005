// ================= CHAPTER 10: FILE SYSTEMS =================
chapter({
  t: 'File Systems', short: 'File Systems',
  lead: 'A file system is layered: the <b>logical file system</b> (directories, protection) → the <b>file-organization module</b> (logical block → physical block, free-space management) → the <b>basic file system</b> (buffers, cache, block read/write commands) → <b>I/O control</b> (drivers, interrupt handlers). A UNIX/MS-DOS file is an unstructured byte stream, accessed sequentially or directly.',
  sections: [
    {
      t: 'One read() call through the file-system layers',
      why: [['Why layers', 'Each layer solves one job and hides the details from the layer above. The application only knows “byte 5100 of the file”; by the time it reaches the disk it is “sector 1234”.']],
      mount(el) {
        let S;
        const L = [['app', 'Application', 'read(fd, buf, 200) at position 5100'], ['lfs', 'Logical file system', 'fd → open-file table → FCB; check r permission'], ['fom', 'File-organization module', 'byte 5100 / 1000 = logical block 5 → physical block 1234 (tra inode/FAT)'], ['bfs', 'Basic file system', 'is block 1234 in the buffer cache? No → command “read block 1234”'], ['ioc', 'I/O control', 'the device driver writes the command to the controller; waits for an interrupt'], ['dev', 'Disk', 'the head seeks to the track and reads the sector']];
        const steps = [...L.map((l, i) => ({ k: i, msg: `<b>${l[1]}</b>: ${l[2]}.` })), { k: 6, msg: 'An interrupt signals completion → data lands in the buffer cache → 200 bytes are copied into the application\'s <code>buf</code>; the current position pointer advances to 5300.' }];
        Player(el, { setup(P) { S = new Stage(P.viz, 900, 330); }, build: () => steps, base: 1700,
          render(s) { S.begin(); L.forEach((l, i) => { S.box('l' + i, { x: 20, y: 8 + i * 53, w: 260, h: 46, cls: (i === 0 ? 'user' : i === 5 ? 'hw' : 'kern') + (s.k === i || (s.k === 6 && i === 0) ? ' hl' : ''), html: `<b>${l[1]}</b>` }); S.box('d' + i, { x: 300, y: 8 + i * 53, w: 580, h: 46, cls: 'lbl l', op: s.k >= i ? 1 : 0.25, html: l[2] }); }); S.box('tok', { x: 230, y: 18 + Math.min(s.k, 5) * 53, w: 40, h: 26, cls: 'tok', bg: s.k === 6 ? 'var(--ok)' : 'var(--hl)', html: s.k === 6 ? '✓' : '▼', z: 5 }); S.end(); } });
      }
    },
    {
      t: 'In-memory data structures for open() and read()',
      why: [['Problem', 'Searching the on-disk directory for the file name on every read would be far too slow.'], ['Idea', '<code>open()</code> finds the file <b>once</b>, copies its <b>FCB</b> (file control block: permissions, owner, size, block locations…) into the <b>system-wide open-file table</b> (shared, with an open count), creates an entry in the <b>per-process open-file table</b> (per process: current position pointer, access mode) and returns an <b>index</b> (file descriptor). Later reads need only the index.']],
      exam: 'Two processes open the same file: two per-process entries (each with its own position pointer) point to <b>one</b> system-wide entry with open count = 2. <code>close()</code> decrements the count; at 0 the entry is removed and the FCB is written back to disk.',
      mount(el) {
        let S;
        const st = [];
        let s = { pp: [[], []], sw: null, step: '', hl: '' };
        const push = (o, msg) => { s = { ...s, ...o }; st.push({ ...clone(s), msg }); };
        push({}, 'Initial state: no process has opened <code>report.txt</code>.');
        push({ step: 'o1', hl: 'p0' }, '① P0 calls <code>open("report.txt")</code>.');
        push({ step: 'o2', hl: 'dir' }, '② The kernel searches the <b>directory structure</b> (cached in the kernel; read from disk if not yet cached).');
        push({ step: 'o3', hl: 'sw', sw: { cnt: 1 } }, '③ Copy the <b>FCB</b> into the <b>system-wide open-file table</b>, open count = 1.');
        push({ step: 'o4', hl: 'pp0', pp: [[{ pos: 0 }], []] }, '④ Create an entry in P0\'s per-process table: <b>current position = 0</b>, access mode, a pointer to the system-wide entry.');
        push({ step: 'o5', hl: 'p0' }, '⑤ Return the <b>index</b> (fd = 3) to P0.');
        push({ step: 'r1', hl: 'pp0', pp: [[{ pos: 200 }], []] }, '<code>read(3, buf, 200)</code>: fd → per-process entry (position 0) → system-wide (FCB) → compute the block, read the data block → position = 200.');
        push({ step: 'o3', hl: 'sw', sw: { cnt: 2 }, pp: [[{ pos: 200 }], [{ pos: 0 }]] }, 'P1 opens the file too: the directory is already cached; <b>open count = 2</b>; P1 has its own position = 0.');
        push({ step: 'c', hl: 'sw', sw: { cnt: 1 }, pp: [[], [{ pos: 0 }]] }, 'P0 <code>close(3)</code>: P0\'s per-process entry is removed, open count = 1. The system-wide entry remains because P1 is using it.');
        Player(el, { setup(P) { S = new Stage(P.viz, 900, 300); }, build: () => st, base: 1800,
          render(s) {
            S.begin();
            S.box('uz', { x: 10, y: 10, w: 200, h: 280, cls: 'zone user', html: 'User' });
            [0, 1].forEach(i => S.box('p' + i, { x: 25, y: 50 + i * 120, w: 170, h: 70, cls: 'tok', bg: pcol(i), html: `P${i}${s.pp[i].length ? '<br>fd = 3' : ''}`, op: s.hl === 'p' + i ? 1 : 0.85 }));
            S.box('kz', { x: 230, y: 10, w: 420, h: 280, cls: 'zone kern', html: 'Kernel memory' });
            [0, 1].forEach(i => { S.box('ppt' + i, { x: 245, y: 50 + i * 120, w: 170, h: 70, cls: 'kern ' + (s.hl === 'pp' + i ? 'hl' : ''), html: `<div><b>per-process (P${i})</b><br>${s.pp[i].length ? 'position = ' + s.pp[i][0].pos + '<br>mode: r' : '<span class="s">empty</span>'}</div>`, fs: 12 }); if (s.pp[i].length) S.line('pl' + i, { x1: 415, y1: 85 + i * 120, x2: 450, y2: 150, c: 'acc', arrow: true }); });
            S.box('sw', { x: 450, y: 110, w: 185, h: 80, cls: 'kern ' + (s.hl === 'sw' ? 'hl' : ''), html: s.sw ? `<div><b>system-wide</b><br>FCB report.txt<br>open count = <b>${s.sw.cnt}</b></div>` : '<span class="s">system-wide: empty</span>', fs: 12 });
            S.box('cd', { x: 450, y: 210, w: 185, h: 50, cls: 'kern ' + (s.hl === 'dir' ? 'hl' : ''), html: 'cache directory', fs: 12 });
            S.box('dz', { x: 670, y: 10, w: 220, h: 280, cls: 'zone hw', html: 'Disk' });
            S.box('dd', { x: 685, y: 50, w: 190, h: 50, cls: 'hw ' + (s.hl === 'dir' ? 'hl' : ''), html: 'directory structure' });
            S.box('df', { x: 685, y: 120, w: 190, h: 50, cls: 'hw', html: 'FCB' });
            S.box('db', { x: 685, y: 190, w: 190, h: 50, cls: 'hw ' + (s.step === 'r1' ? 'hl' : ''), html: 'data blocks' });
            if (s.step === 'o2') S.line('a2', { x1: 685, y1: 75, x2: 635, y2: 235, c: 'hl', arrow: true });
            if (s.step === 'o3') S.line('a3', { x1: 685, y1: 145, x2: 635, y2: 150, c: 'hl', arrow: true });
            if (s.step === 'r1') S.line('a4', { x1: 635, y1: 150, x2: 685, y2: 215, c: 'ok', arrow: true });
            S.end();
          } });
      }
    },
    {
      t: 'Directories, paths and links (hard link vs symbolic link)',
      why: [['Tree-structured directory', 'Fast lookup by path, the same name allowed in different directories, grouping by property. An <b>absolute path</b> starts at the root; a <b>relative path</b> starts at the current directory.'], ['Acyclic graph', 'Allows sharing files. <b>Symbolic link</b>: an entry holding a path that must be resolved again (slower). <b>Hard link</b>: the file\'s information duplicated in several directories (same inode).'], ['Problem', 'A traversal may meet a shared file several times (skip links while traversing). Deleting a shared file can leave a <b>dangling pointer</b>: find and delete the links, leave them until used, or keep the file until no references remain.']],
      mount(el) {
        let S, sc = 'abs';
        const N = { root: [420, 10, '/'], spell: [200, 80, 'spell'], bin: [420, 80, 'bin'], prog: [640, 80, 'programs'], mail: [120, 150, 'mail'], copy: [280, 150, 'copy'], prt: [60, 220, 'prt'], exp: [180, 220, 'exp'], first: [60, 290, 'first'], ls: [420, 150, 'ls'], p: [640, 150, 'p'] };
        const E = [['root', 'spell'], ['root', 'bin'], ['root', 'prog'], ['spell', 'mail'], ['spell', 'copy'], ['mail', 'prt'], ['mail', 'exp'], ['prt', 'first'], ['bin', 'ls'], ['prog', 'p']];
        const SC = {
          abs: { msg0: 'Look up <code>/spell/mail/prt/first</code> (absolute path, from the root).', path: ['root', 'spell', 'mail', 'prt', 'first'] },
          rel: { msg0: 'Current directory: <code>/spell/mail</code>. Look up <code>prt/first</code> (relative path).', path: ['mail', 'prt', 'first'], cwd: 'mail' },
          hard: { link: 'hard' }, sym: { link: 'sym' }
        };
        function build() {
          const c = SC[sc];
          if (c.path) return [{ vis: [], cwd: c.cwd, msg: c.msg0 }, ...c.path.map((n, i) => ({ vis: c.path.slice(0, i + 1), cwd: c.cwd, msg: i === 0 ? `Start at <b>${N[n][2]}</b>.` : `Look up the entry “${N[n][2]}” in directory ${N[c.path[i - 1]][2]} → found.` }))];
          const hard = c.link === 'hard';
          return [
            { link: 0, msg: 'File <code>/spell/mail/prt/first</code> has inode #60 (link count = 1).' },
            { link: 1, hard, msg: hard ? 'Create a <b>hard link</b> <code>/bin/first2</code>: a new entry pointing directly to <b>the same inode #60</b> → link count = 2.' : 'Create a <b>symbolic link</b> <code>/bin/first2</code>: a small file containing the string <code>"/spell/mail/prt/first"</code>.' },
            { link: 1, hard, acc: true, msg: hard ? 'Opening /bin/first2 → inode #60 immediately.' : 'Opening /bin/first2 → read the path inside → resolve again from the root → inode #60 (a few more directory lookups, slower).' },
            { link: 2, hard, msg: hard ? 'Delete /spell/mail/prt/first: only that entry goes, link count = 1. <span class="ok">The data is intact</span>; it is freed only when the count reaches 0.' : 'Delete /spell/mail/prt/first: inode #60 is freed.' },
            { link: 2, hard, acc: true, msg: hard ? 'Opening /bin/first2 still works.' : '<span class="bad">Opening /bin/first2 → the path no longer exists: a dangling link.</span>' }
          ];
        }
        Player(el, { setup(P) { P.top.append(fSel('Scenario:', [['abs', 'Absolute path'], ['rel', 'Relative path'], ['hard', 'Hard link, then delete the original'], ['sym', 'Symbolic link, then delete the original']], sc, v => { sc = v; P.rebuild(); })); S = new Stage(P.viz, 900, 340); }, build, base: 1600,
          render(s) {
            S.begin();
            E.forEach(([a, b]) => { if (s.link === 2 && b === 'first') return; S.line(a + b, { x1: N[a][0] + 50, y1: N[a][1] + 34, x2: N[b][0] + 50, y2: N[b][1], c: s.vis && s.vis.includes(a) && s.vis.includes(b) ? 'hl' : 'mut', arrow: true, thick: s.vis && s.vis.includes(b) }); });
            for (const k in N) { if (s.link === 2 && k === 'first') continue; S.box('n' + k, { x: N[k][0], y: N[k][1], w: 100, h: 34, cls: (s.vis && s.vis.includes(k) ? 'hl' : k === s.cwd ? 'acc' : ['first', 'ls', 'p'].includes(k) ? 'hw' : 'user'), html: N[k][2] + (k === s.cwd ? ' (cwd)' : '') }); }
            if (s.link != null) {
              S.box('ino', { x: 230, y: 290, w: 160, h: 40, cls: s.link === 2 && !s.hard ? 'bad' : 'kern', html: s.link === 2 && !s.hard ? 'inode #60 (deleted)' : `inode #60 · links = ${s.hard ? (s.link === 1 ? 2 : 1) : 1}` });
              if (s.link < 2) S.line('fi', { x1: 110, y1: 324, x2: 230, y2: 310, c: 'acc', arrow: true });
              if (s.link >= 1) { S.box('nf2', { x: 560, y: 220, w: 140, h: 34, cls: s.acc ? (s.link === 2 && !s.hard ? 'bad' : 'ok') : 'hw', html: s.hard ? 'first2 (hard)' : 'first2 → "/spell/…/first"' }); S.line('bf', { x1: 470, y1: 114, x2: 610, y2: 220, c: 'mut', arrow: true }); S.line('f2i', s.hard ? { x1: 600, y1: 254, x2: 390, y2: 310, c: 'acc', arrow: true } : { x1: 580, y1: 254, x2: 110, y2: 290, c: s.link === 2 ? 'bad' : 'hl', arrow: true, dash: true }); }
            }
            S.end();
          } });
      }
    },
    {
      t: 'UNIX file protection: rwx for owner / group / public',
      why: [['Model', '3 permissions (read, write, execute) × 3 user classes = 9 bits, written compactly as 3 octal digits: <code>rwx r-x --x</code> = 7 5 1.'], ['For directories', '<b>x</b> is essential: without x you cannot run any command on the directory or access anything in that subtree. Without r you cannot list it. Without w you cannot create/delete files in it.']],
      mount(el) {
        let bits = [1, 1, 1, 1, 0, 1, 0, 0, 1], dir = false, who = 0;
        const box = h('div');
        const draw = () => {
          const str = bits.map((b, i) => b ? 'rwx'[i % 3] : '-').join(''); const oct = [0, 1, 2].map(c => bits[c * 3] * 4 + bits[c * 3 + 1] * 2 + bits[c * 3 + 2]).join('');
          const has = k => bits[who * 3 + k];
          const ops = dir ? [['ls (list)', has(0) && has(2), 'needs r (+x)'], ['cd into / open a file inside', has(2), 'needs x'], ['create/delete files in the directory', has(1) && has(2), 'needs w + x']] : [['read the file (cat)', has(0), 'needs r'], ['modify the file', has(1), 'needs w'], ['run as a program', has(2), 'needs x']];
          box.innerHTML = `<div class="formula" style="font-size:15px">${dir ? 'd' : '-'}${str}  1 smith  58  Mar 3 3:04  ${dir ? 'games' : 'game1'}   <span class="mut">→ chmod ${oct}</span></div>
          <table class="t" style="margin-top:8px"><tr><th>Operation (as ${['owner', 'group', 'public'][who]})</th><th>Result</th><th></th></tr>${ops.map(o => `<tr><td style="text-align:left">${o[0]}</td><td class="${o[1] ? 'ok' : 'bad'}">${o[1] ? 'allowed' : 'denied'}</td><td class="mut">${o[2]}</td></tr>`).join('')}</table>`;
        };
        const grid = h('div', { class: 'row', style: 'gap:16px' });
        ['Owner', 'Group', 'Public'].forEach((c, ci) => grid.append(h('div', { class: 'ccs-box' }, h('div', { class: 'lab' }, c), ...['r', 'w', 'x'].map((p, pi) => fChk(' ' + p, bits[ci * 3 + pi], v => { bits[ci * 3 + pi] = v ? 1 : 0; draw(); })))));
        el.append(h('div', { class: 'row', style: 'align-items:center;margin-bottom:8px' }, fSel('Object:', [['0', 'Regular file'], ['1', 'Directory']], '0', v => { dir = v === '1'; draw(); }), fSel('Try as:', [['0', 'owner'], ['1', 'group'], ['2', 'public']], '0', v => { who = +v; draw(); })), grid, box); draw();
      }
    },
    {
      t: 'Disk block allocation: contiguous · linked · indexed (and address translation)',
      why: [['Contiguous', 'Needs only (start, length). Supports random access. But like dynamic partitioning: <b>external fragmentation</b>, hard for growing files, and over-estimating causes internal fragmentation.'], ['Linked', 'Each block holds a pointer to the next (its first 4 bytes). No wasted space, files can grow arbitrarily. But <b>no random access</b>: reaching block Q means walking through the Q blocks before it (FAT gathers the pointers into one table to soften this).'], ['Indexed', 'An <b>index block</b> holds all the pointers, like a page table for the file. Random access, no external fragmentation; costs an index block.']],
      exam: 'Contiguous: LA = Q×512 + R → block start + Q, offset R. Linked: LA = Q×508 + R → the (Q+1)-th block in the chain, offset R + 4. Indexed: LA = Q×512 + R → index[Q], offset R. Max file 128 KB, 512 B blocks → 256 pointers × 4 B = 1024 B = <b>2 index blocks</b>.',
      mount(el) {
        let S, m = 'cont', la = 2333;
        const chain = [9, 16, 1, 10, 25];
        const FILES = { cont: [['count', 0, 2], ['f', 6, 2], ['tr', 14, 3], ['mail', 19, 6], ['list', 28, 4]] };
        function build() {
          const st = []; const reads = []; const push = (o, msg) => st.push({ ...o, reads: [...reads], msg });
          if (m === 'cont') {
            const Q = Math.floor(la / 512), R = la % 512; push({}, `File <b>mail</b>: start = 19, length = 6. LA = ${la} = <b>${Q}</b> × 512 + <b>${R}</b>.`);
            if (Q >= 6) { push({}, `<span class="bad">Q = ${Q} ≥ length 6 → past the end of the file.</span>`); return st; }
            reads.push(19 + Q); push({ hl: [19 + Q] }, `Block = start + Q = 19 + ${Q} = <b>${19 + Q}</b>, byte ${R}. Only <b>1 disk read</b>, computed with one addition.`);
          } else if (m === 'link') {
            const Q = Math.floor(la / 508), R = la % 508; push({}, `File <b>jeep</b> starts at block 9. Each block has a 4-byte pointer → 508 bytes of data left. LA = ${la} = <b>${Q}</b> × 508 + <b>${R}</b> → we need block number ${Q + 1} in the chain.`);
            if (Q >= chain.length) { push({}, '<span class="bad">Past the end of the file.</span>'); return st; }
            for (let k = 0; k <= Q; k++) { reads.push(chain[k]); push({ hl: chain.slice(0, k + 1), cur: chain[k] }, k < Q ? `Read block ${chain[k]} just to get the pointer → next block ${chain[k + 1]}.` : `Block number ${Q + 1} = <b>${chain[k]}</b>, offset = R + 4 = <b>${R + 4}</b>. Total <b>${Q + 1} disk reads</b>: no random access.`); }
          } else {
            const Q = Math.floor(la / 512), R = la % 512; push({}, `File <b>jeep</b>, index block = 19, containing [9, 16, 1, 10, 25]. LA = ${la} = <b>${Q}</b> × 512 + <b>${R}</b>.`);
            reads.push(19); push({ hl: [19], cur: 19 }, `Read index block 19, take entry [${Q}].`);
            if (Q >= chain.length) { push({}, '<span class="bad">Empty entry, past the end of the file.</span>'); return st; }
            reads.push(chain[Q]); push({ hl: [19, chain[Q]], cur: chain[Q] }, `index[${Q}] = <b>${chain[Q]}</b>, byte ${R}. <b>2 reads</b> (1 if the index block is cached). Random access works.`);
          }
          return st;
        }
        Player(el, { setup(P) { const a = fNum('Logical address (byte):', la, 0, 3000, v => { la = v; P.rebuild(); }); P.top.append(fSel('Method:', [['cont', 'Contiguous'], ['link', 'Linked'], ['idx', 'Indexed']], m, v => { m = v; P.rebuild(); }), a); S = new Stage(P.viz, 900, 260); }, build, base: 1700,
          render(s) {
            S.begin(); const bx = b => 20 + (b % 8) * 82, by = b => 10 + Math.floor(b / 8) * 60;
            const owner = {}; if (m === 'cont') FILES.cont.forEach(([n, st, len], fi) => range(len).forEach(k => owner[st + k] = [n, fi])); else { chain.forEach((b, k) => owner[b] = ['jeep', 0, k]); if (m === 'idx') owner[19] = ['index', 3]; }
            range(32).forEach(b => { const o = owner[b]; const hl = s.hl && s.hl.includes(b); S.box('b' + b, { x: bx(b), y: by(b), w: 76, h: 52, cls: hl ? (b === s.cur || m === 'cont' ? 'hl' : 'acc') : o ? 'tok sq' : 'zone', bg: !hl && o ? pcol(o[1]) : '', html: `<div><span style="font-size:10px;opacity:.8">#${b}</span><br>${o ? o[0] + (m === 'link' && o[0] === 'jeep' ? (o[2] < 4 ? ' →' + chain[o[2] + 1] : ' end') : '') : ''}</div>`, fs: 12 }); });
            if (m !== 'cont') chain.forEach((b, k) => { if (m === 'link' && k < chain.length - 1) S.line('c' + k, { x1: bx(b) + 38, y1: by(b) + 26, x2: bx(chain[k + 1]) + 38, y2: by(chain[k + 1]) + 26, c: s.hl && s.hl.includes(chain[k + 1]) ? 'hl' : 'mut', arrow: true, curve: 0.15 }); if (m === 'idx') S.line('i' + k, { x1: bx(19) + 38, y1: by(19) + 26, x2: bx(b) + 38, y2: by(b) + 26, c: s.hl && s.hl.includes(b) ? 'hl' : 'mut', arrow: true, curve: 0.12 }); });
            S.box('rd', { x: 690, y: 10, w: 200, h: 60, cls: 'big', html: `${s.reads.length} read(s)` });
            S.end();
          } });
      }
    },
    {
      t: 'UNIX inode: 12 direct + single/double/triple indirect',
      why: [['Idea', '<b>Adaptive</b> indexed allocation: small files (the common case) need only the direct pointers in the inode, no extra blocks; large files use additional indirect levels.'], ['Maximum size', 'Each block holds n = block / pointer pointers. Max = (12 + n + n² + n³) × block. With 4 KB blocks and 4 B pointers: n = 2<sup>10</sup> → 48 KB + 4 MB + 4 GB + 4 TB.']],
      mount(el) {
        let bs = 4096, ps = 4, off = 5000000, S;
        function build() {
          const n = bs / ps, L = Math.floor(off / bs), r = off % bs; const st = [{ lv: -1, msg: `Byte ${off.toLocaleString('vi-VN')} → logical block L = ⌊${off}/${bs}⌋ = <b>${L}</b>, offset ${r}. Each block holds n = ${bs}/${ps} = <b>${n}</b> pointers.` }];
          let lv, idx = [];
          if (L < 12) { lv = 0; idx = [L]; } else if (L < 12 + n) { lv = 1; idx = [L - 12]; } else if (L < 12 + n + n * n) { lv = 2; const x = L - 12 - n; idx = [Math.floor(x / n), x % n]; } else { lv = 3; const x = L - 12 - n - n * n; idx = [Math.floor(x / (n * n)), Math.floor(x / n) % n, x % n]; }
          const nm = ['direct', 'single indirect', 'double indirect', 'triple indirect'][lv];
          st.push({ lv, idx, k: 0, msg: lv === 0 ? `L = ${L} &lt; 12 → pointer <b>direct[${L}]</b> right in the inode.` : `L = ${L} ≥ 12${lv > 1 ? ` + ${n}` : ''}${lv > 2 ? ` + ${n}²` : ''} → use the <b>${nm}</b>. Indices in the indirect blocks: [${idx.join(', ')}].` });
          for (let k = 1; k <= lv; k++) st.push({ lv, idx, k, msg: `Read the level-${k} indirect block, take entry [${idx[k - 1]}].` });
          st.push({ lv, idx, k: lv + 1, msg: `Read the data block. Total: <b>${lv + 1} disk read(s)</b> (not counting the inode). Max file = ${fmtB((12 + n + n * n + n * n * n) * bs)}.` });
          return st;
        }
        const fmtB = b => { const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']; let i = 0; while (b >= 1024 && i < 5) { b /= 1024; i++; } return (+b.toFixed(2)) + ' ' + u[i]; };
        Player(el, { setup(P) { const o = fNum('Byte offset:', off, 0, 1e13, v => { off = v; P.rebuild(); }); o.inp.style.width = '130px'; P.top.append(fSel('Block size:', [['1000', '1000 B (slide)'], ['1024', '1 KB'], ['4096', '4 KB']], String(bs), v => { bs = +v; P.rebuild(); }), fNum('Pointer (B):', ps, 2, 8, v => { ps = v; P.rebuild(); }), o, btn('Slide: 1000 B, position 5100', () => { bs = 1000; off = 5100; o.inp.value = 5100; P.top.querySelector('select').value = '1000'; P.rebuild(); })); S = new Stage(P.viz, 900, 300); }, build, base: 1600,
          render(s) {
            S.begin(); S.box('ino', { x: 10, y: 10, w: 170, h: 280, cls: 'zone kern', html: 'inode' });
            S.box('attr', { x: 20, y: 34, w: 150, h: 26, cls: 'kern', html: 'file attributes', fs: 11 });
            range(12).forEach(i => S.box('d' + i, { x: 20, y: 64 + i * 15, w: 150, h: 14, cls: 'code ' + (s.lv === 0 && s.idx[0] === i ? 'hl' : ''), html: 'direct ' + i, fs: 10 }));
            ['single', 'double', 'triple'].forEach((t, i) => S.box('ind' + i, { x: 20, y: 248 + i * 14, w: 150, h: 13, cls: 'code ' + (s.lv === i + 1 ? 'hl' : ''), html: t + ' indirect', fs: 10 }));
            if (s.lv >= 0) {
              let px = 180, py = s.lv === 0 ? 72 + s.idx[0] * 15 : 254 + (s.lv - 1) * 14;
              for (let k = 1; k <= s.lv; k++) { const x = 200 + (k - 1) * 170; S.box('ib' + k, { x, y: 100, w: 150, h: 110, cls: s.k >= k ? (s.k === k ? 'hl' : 'kern') : 'zone', html: `<div>level-${k} indirect block<br><b>[${s.idx[k - 1]}]</b></div>`, fs: 12 }); S.line('il' + k, { x1: px, y1: py, x2: x, y2: 155, c: s.k >= k ? 'hl' : 'mut', arrow: true }); px = x + 150; py = 155; }
              const dx = 200 + s.lv * 170; S.box('data', { x: Math.min(dx, 740), y: 120, w: 150, h: 70, cls: s.k > s.lv ? 'ok' : 'zone', html: 'data block' }); S.line('dl', { x1: px, y1: py, x2: Math.min(dx, 740), y2: 155, c: s.k > s.lv ? 'ok' : 'mut', arrow: true });
            }
            S.end();
          } });
      }
    },
    {
      t: 'Resolving the path /usr/ast/mbox with inodes',
      why: [['Structure', 'A UNIX directory entry is just <b>(name, inode number)</b>. Each inode sits at a fixed place on disk, so knowing its number means it can be read right away.'], ['Lookup', 'Alternate two steps: read a directory to get an inode number, read the inode to learn which block holds the child directory/file. Assume only the root directory is in memory at first.']],
      mount(el) {
        let S;
        const blocks = [['Root directory (in RAM)', [[1, '.'], [1, '..'], [4, 'bin'], [7, 'dev'], [14, 'lib'], [9, 'etc'], [6, 'usr'], [8, 'tmp']], 'usr'], ['Block 132 = /usr', [[6, '.'], [1, '..'], [19, 'dick'], [30, 'erik'], [51, 'jim'], [26, 'ast'], [45, 'bal']], 'ast'], ['Block 406 = /usr/ast', [[26, '.'], [6, '..'], [64, 'grants'], [92, 'books'], [60, 'mbox'], [81, 'minix'], [17, 'src']], 'mbox']];
        const inodes = [['i-node 6', '/usr is in block 132'], ['i-node 26', '/usr/ast is in block 406'], ['i-node 60', 'file mbox']];
        const steps = [{ k: 0, part: 0, msg: 'Look up “usr” in the root directory → <b>i-node 6</b>.' }, { k: 0, part: 1, msg: 'Read i-node 6: directory /usr is in <b>block 132</b>.' }, { k: 1, part: 0, msg: 'Read block 132, look up “ast” → <b>i-node 26</b>.' }, { k: 1, part: 1, msg: 'Read i-node 26: /usr/ast is in <b>block 406</b>.' }, { k: 2, part: 0, msg: 'Read block 406, look up “mbox” → <b>i-node 60</b>.' }, { k: 2, part: 1, msg: 'I-node 60 holds mbox\'s attributes and block pointers. In total 5 disk reads (i-node 6, block 132, i-node 26, block 406, i-node 60) just to locate the file. That is why the OS caches directories and inodes.' }];
        Player(el, { setup(P) { S = new Stage(P.viz, 900, 300); }, build: () => steps, base: 1700,
          render(s) { S.begin(); blocks.forEach(([t, ents, find], b) => { const x = 10 + b * 300; S.box('bt' + b, { x, y: 4, w: 180, h: 16, cls: 'ttl', html: t, op: b <= s.k ? 1 : 0.3 }); ents.forEach(([n, nm], i) => S.box(`e${b}_${i}`, { x, y: 24 + i * 26, w: 140, h: 24, cls: 'code ' + (b === s.k && nm === find ? 'hl' : b < s.k && nm === find ? 'acc' : ''), op: b <= s.k ? 1 : 0.3, html: `${String(n).padStart(2)}  ${nm}`, fs: 12 })); if (b <= s.k && (b < s.k || s.part)) { S.box('in' + b, { x: x + 150, y: 120, w: 130, h: 60, cls: b === s.k ? 'hl' : 'kern', html: `<div><b>${inodes[b][0]}</b><br><span style="font-size:11px">${inodes[b][1]}</span></div>` }); S.line('l' + b, { x1: x + 140, y1: 36 + ents.findIndex(e => e[1] === find) * 26, x2: x + 150, y2: 150, c: 'hl', arrow: true }); if (b < 2) S.line('n' + b, { x1: x + 280, y1: 150, x2: x + 300, y2: 30, c: 'acc', arrow: true }); } }); S.end(); } });
      }
    },
    {
      t: 'Free-space management: bit map vs linked list, and choosing the block size',
      why: [['Bit map', '1 bit per block: <b>0 = free, 1 = allocated</b> (the slide\'s convention). Finding a free block is easy; it costs space: a 16 GB disk (2<sup>34</sup>) with 512 B blocks (2<sup>9</sup>) → 2<sup>25</sup> bits = <b>2<sup>22</sup> bytes = 4 MB</b>. Efficient only when the whole bit map is in RAM (it must be written back to disk periodically).'], ['Linked list', 'Chain the free blocks together and keep a pointer to the first free block. No extra space, but traversal is inefficient.'], ['Block size', 'Large blocks: fewer blocks and fast reads, but the tail is wasted. Small blocks: save space, but many blocks → low speed. A compromise is needed.']],
      mount(el) {
        let S; const N = 24;
        const used0 = [0, 1, 2, 5, 6, 9, 10, 11, 15, 18, 19, 22];
        const ops = [['alloc', 3], ['free', [5, 6]], ['alloc', 2]];
        const steps = (() => { let used = new Set(used0); const st = [{ used: [...used], msg: 'Disk state: 24 blocks. The bit map keeps 1 bit per block; the linked list chains the free blocks.' }];
          for (const [op, a] of ops) { if (op === 'alloc') { const got = range(N).filter(b => !used.has(b)).slice(0, a); got.forEach(b => used.add(b)); st.push({ used: [...used], hl: got, msg: `Allocate ${a} block(s): the bit map scans for a 0 bit → block ${got.join(', ')}; the linked list takes its first ${a} element(s) (following pointers on disk).` }); } else { a.forEach(b => used.delete(b)); st.push({ used: [...used], hl: a, msg: `Free block ${a.join(', ')}: set its bit = 0; insert it at the head of the free list.` }); } }
          return st; })();
        Player(el, { setup(P) { S = new Stage(P.viz, 900, 230); }, build: () => steps, base: 1900,
          render(s) { S.begin(); const u = new Set(s.used); const bx = b => 20 + (b % 12) * 72, by = b => 10 + Math.floor(b / 12) * 62; const free = range(N).filter(b => !u.has(b));
            range(N).forEach(b => S.box('b' + b, { x: bx(b), y: by(b), w: 64, h: 50, cls: (s.hl && s.hl.includes(b)) ? 'hl' : u.has(b) ? 'tok sq' : 'zone', bg: u.has(b) && !(s.hl && s.hl.includes(b)) ? '#7d8ba0' : '', html: `<div><span style="font-size:10px">#${b}</span><br><b>${u.has(b) ? 1 : 0}</b></div>` }));
            free.forEach((b, i) => { if (i < free.length - 1) S.line('f' + b, { x1: bx(b) + 32, y1: by(b) + 50, x2: bx(free[i + 1]) + 32, y2: by(free[i + 1]) + 50, c: 'acc', arrow: true, curve: 0.25, dash: true }); });
            S.box('bm', { x: 20, y: 140, w: 860, h: 30, cls: 'code', html: 'bit map: ' + range(N).map(b => u.has(b) ? '1' : '0').join('') });
            S.box('hd', { x: 20, y: 180, w: 860, h: 30, cls: 'lbl l', html: `free-list head → #${free[0]} → … (${free.length} free blocks, dashed green arrows)` }); S.end(); } });
        const cb = h('div', { style: 'margin-top:12px' }); el.append(cb);
        const sizes = [512, 1024, 2048, 4096, 8192, 16384, 32768];
        const files = range(400).map(i => Math.round(Math.exp(6 + 3.2 * Math.sin(i * 12.9898) * Math.sin(i * 78.233 + 1) + 1.5)));
        const util = sizes.map(bs => { const used = files.reduce((a, f) => a + f, 0), alloc = files.reduce((a, f) => a + Math.ceil(f / bs) * bs, 0); return Math.round(100 * used / alloc); });
        const rate = sizes.map(bs => { const t = 14 + bs / (100 * 1048576) * 1000; return +((bs / 1048576) / (t / 1000)).toFixed(2); });
        cb.innerHTML = '<div class="lab">Block-size trade-off (model: median file of a few KB; 14 ms positioning; 100 MB/s transfer)</div><div class="row"><div class="grow">' + barChart({ labels: sizes.map(b => b >= 1024 ? b / 1024 + 'K' : b), series: [{ name: 'Space utilization (%)', vals: util, col: 'var(--ok)' }], W: 420, H: 190, showV: true }) + '<div class="mut" style="font-size:12px">Space utilization (%) falls as blocks grow</div></div><div class="grow">' + barChart({ labels: sizes.map(b => b >= 1024 ? b / 1024 + 'K' : b), series: [{ name: 'Speed (MB/s)', vals: rate, col: 'var(--acc)' }], W: 420, H: 190, showV: true }) + '<div class="mut" style="font-size:12px">Speed of reading one block (MB/s) rises as blocks grow</div></div></div>';
      }
    }
  ],
  quiz: [
    { q: 'Which information is in the per-process open-file table (per the slides)?', o: ['File open count', 'A copy of the FCB', 'Current position pointer', 'Directory structure'], a: 2, e: 'Per-process: the current position pointer (and access mode). System-wide: the open count and a copy of the FCB.' },
    { q: 'Linked allocation, 512 B blocks (4 B pointer), file starts at block 9, chain 9→16→1→10→25. Where is byte 2333?', o: ['Block 10, offset 285', 'Block 25, offset 305', 'Block 25, offset 301', 'Block 1, offset 305'], a: 1, e: '2333 = 4×508 + 301 → the 5th block = 25, offset 301 + 4 = 305.' },
    { q: 'Max file 128 KB, 512 B blocks, 4 B pointers. How many index blocks are needed?', o: ['1', '2', '4', '256'], a: 1, e: '128 KB / 512 = 256 blocks → 256 × 4 B = 1024 B = 2 blocks.' },
    { q: 'Inode: 4 KB blocks, 4 B pointers. Maximum file size with only direct + single indirect?', o: ['48 KB', '48 KB + 4 MB', '4 MB', '48 KB + 4 GB'], a: 1, e: '12 × 4 KB = 48 KB; single: 1024 pointers × 4 KB = 4 MB.' },
    { q: 'A directory gives you <code>r--</code> (no x). You can:', o: ['cd into it and read the files inside', 'List (some of) the names but not access the files inside', 'Create a new file', 'Do nothing at all, not even list the names'], a: 1, e: 'Without x you cannot access anything in that subtree; r only lets you read the list of names.' },
    { q: 'The original file is deleted while a symbolic link points to it. What happens?', o: ['The file remains and the link still works', 'The link becomes dangling', 'The link deletes itself', 'The file cannot be deleted'], a: 1, e: 'A symbolic link only holds a path, and that path no longer exists.' },
    { q: 'The bit map for a 16 GB disk with 512 B blocks takes:', o: ['2^25 byte', '2^22 byte (4 MB)', '2^34 bit', '512 KB'], a: 1, e: '2^34 / 2^9 = 2^25 block = 2^25 bit = 2^22 byte.' },
    { q: 'Which method does NOT support efficient random access?', o: ['Contiguous', 'Linked', 'Indexed', 'inode'], a: 1, e: 'Reaching block Q requires reading the Q blocks before it to follow the pointers.' }
  ]
});
