// ================= CHAPTER 2: PROCESSES & THREADS =================
chapter({
  t: 'Processes & Threads', short: 'Process & Thread',
  lead: 'A process is a program in execution: its code plus all execution state (PC, registers, stack, heap, open files). The OS manages each process through a PCB and moves it between queues. A thread is a smaller unit of CPU use; threads of the same process share code, data and files.',
  sections: [
    {
      t: 'A process in memory: text, data, heap, stack',
      why: [['Problem', 'A program needs room for code, global variables, a dynamically allocated area (size unknown in advance) and nested function calls.'], ['Idea', 'Split the process image into 4 regions by <b>data lifetime</b>. Text and data are fixed at load time. The heap grows on <code>new</code>. The stack grows and shrinks with function calls. Heap and stack grow <b>towards each other</b>, so the gap between them can serve either.']],
      mount(el) {
        let S;
        const code = ['int g = 7;', 'int main() {', '  int x = 3;', '  int *a = new int[10];', '  f(x);', '}', 'void f(int p) {', '  int y = p * 2;', '}'];
        const steps = [
          { ln: 1, data: true, frames: [], heap: false, msg: 'The loader builds the <b>process image</b>: machine code into <b>text</b>, global variable <code>g</code> into <b>data</b>. The PC points at <code>main</code>.' },
          { ln: 2, data: true, frames: [['main', 'x = 3']], heap: false, msg: 'Calling <code>main</code> → pushes a <b>stack frame</b>. Local variable <code>x</code> lives in the frame.' },
          { ln: 3, data: true, frames: [['main', 'x = 3', 'a = ●']], heap: true, msg: '<code>new int[10]</code> allocates 40 bytes on the <b>heap</b> (dynamic, lives until delete). Pointer <code>a</code> is a local variable, so it sits on the stack and points into the heap.' },
          { ln: 4, data: true, frames: [['main', 'x = 3', 'a = ●'], ['f', 'p = 3 (parameter)', 'return address']], heap: true, msg: 'Calling <code>f(x)</code> → pushes a new frame holding <b>parameter</b> <code>p</code> and the return address. The stack grows towards the heap.' },
          { ln: 7, data: true, frames: [['main', 'x = 3', 'a = ●'], ['f', 'p = 3 (parameter)', 'return address', 'y = 6']], heap: true, msg: '<code>y</code> is a local variable of f → lives in f\'s frame.' },
          { ln: 8, data: true, frames: [['main', 'x = 3', 'a = ●']], heap: true, msg: 'f returns → its frame is <b>popped</b>; <code>p</code> and <code>y</code> vanish. The heap array survives because it is not tied to a function call.' },
          { ln: 5, data: true, frames: [['main', 'x = 3', 'a = ●']], heap: true, msg: 'The whole range [Base, Base+Limit) belongs to the process. The base and limit registers (saved in the PCB) let the hardware block accesses outside it.' }
        ];
        Player(el, {
          setup(P) { S = new Stage(P.viz, 900, 360); },
          build: () => steps, base: 1900,
          render(s) {
            S.begin();
            code.forEach((c, i) => S.box('c' + i, { x: 10, y: 20 + i * 32, w: 300, h: 28, cls: 'code ' + (s.ln === i ? 'hl' : ''), html: c }));
            const X = 470, W = 250;
            S.box('lo', { x: X + W + 10, y: 12, w: 160, h: 16, cls: 'lbl l', html: 'Base · low address' });
            S.box('hi', { x: X + W + 10, y: 332, w: 160, h: 16, cls: 'lbl l', html: 'Base+Limit · high address' });
            S.box('text', { x: X, y: 10, w: W, h: 50, cls: 'hw', html: '<b>text</b><span class="s">program code</span>' });
            S.box('data', { x: X, y: 62, w: W, h: 44, cls: 'user', html: '<b>data</b> · g = 7' });
            S.box('heap', { x: X, y: 108, w: W, h: s.heap ? 54 : 26, cls: s.heap && s.ln === 3 ? 'hl' : 'zone', html: s.heap ? '<b>heap</b> · int[10] (40 B) ↓ grows down' : 'heap (empty)' });
            S.box('gap', { x: X + 70, y: 180, w: 110, h: 20, cls: 'lbl', html: '⇅ free gap' });
            let y = 350;
            s.frames.forEach((f, k) => { const hh = 22 + f.length * 18; y -= hh + 2; S.box('fr' + f[0], { x: X, y, w: W, h: hh, cls: (k === s.frames.length - 1 ? 'acc' : 'user'), html: `<div style="width:100%"><b>frame ${f[0]}()</b><br>${f.slice(1).join('<br>')}</div>`, from: [X, y - 30] }); });
            S.box('stk', { x: X - 110, y: 300, w: 100, h: 30, cls: 'lbl', html: '<b>stack</b> ↑ grows up' });
            if (s.heap && s.frames.length) { const mf = s.frames[0]; const hh = 22 + mf.length * 18; S.line('ptr', { pts: [[X + W - 6, 350 - hh + 40], [X + W + 40, 300], [X + W + 40, 135], [X + W, 135]], c: 'acc', arrow: true }); }
            S.end();
          }
        });
      }
    },
    {
      t: 'Process state diagram (trigger the events yourself)',
      why: [['Problem', 'There are dozens of processes but only one CPU (one core). The OS must know who is running, who is ready and who is waiting for what.'], ['Idea', 'Every process is in <b>exactly one of 5 states</b>: New, Ready, Running, Waiting, Terminated. Each arrow corresponds to a specific event. In a multiprogrammed system, the <b>timer interrupt</b> forces the running process back to Ready so others get to run.']],
      exam: 'There is no Waiting → Running arrow and no Ready → Waiting arrow. To wait for I/O a process must be running (it has to execute the I/O request). When the I/O completes it goes back to Ready, not straight to running.',
      mount(el) {
        let S;
        const SP = { none: [20, 300], new: [30, 40], ready: [250, 150], running: [560, 150], waiting: [400, 270], term: [770, 40] };
        const names = ['P1', 'P2', 'P3', 'P4'];
        const init = () => ({ st: names.map(() => 'none'), ready: [], wait: [], run: null, edge: null, msg: 'No processes yet. Use the event buttons below or press ▶ to watch a sample scenario.' });
        const A = {
          create: s => { const i = s.st.indexOf('none'); if (i < 0) return null; s.st[i] = 'new'; s.edge = null; s.msg = `<b>${names[i]}</b> is created (New): the OS allocates a PCB and loads the program.`; return s; },
          admit: s => { const i = s.st.indexOf('new'); if (i < 0) return null; s.st[i] = 'ready'; s.ready.push(i); s.edge = 'admit'; s.msg = `<b>admitted</b>: ${names[i]} enters the Ready queue.${s.run == null ? ' The CPU is free → the scheduler will pick right away.' : ''}`; return s; },
          dispatch: s => { if (s.run != null || !s.ready.length) return null; const i = s.ready.shift(); s.st[i] = 'running'; s.run = i; s.edge = 'dispatch'; s.msg = `<b>scheduler dispatch</b>: the short-term scheduler picks ${names[i]} (head of queue) → loads its context from the PCB → Running.`; return s; },
          timer: s => { if (s.run == null) return null; const i = s.run; s.st[i] = 'ready'; s.ready.push(i); s.run = null; s.edge = 'int'; s.msg = `<b>timer interrupt</b>: ${names[i]} used up its time slice → moved to the <i>tail</i> of Ready. (Preemptive: the CPU is taken back.)`; return s; },
          io: s => { if (s.run == null) return null; const i = s.run; s.st[i] = 'waiting'; s.wait.push(i); s.run = null; s.edge = 'io'; s.msg = `<b>I/O or event wait</b>: ${names[i]} gives up the CPU and joins a device queue. CPU free → scheduling is <b>mandatory</b>.`; return s; },
          iodone: s => { if (!s.wait.length) return null; const i = s.wait.shift(); s.st[i] = 'ready'; s.ready.push(i); s.edge = 'iodone'; s.msg = `<b>I/O completion</b>: a device interrupt → ${names[i]} goes back to Ready (it does not run immediately).`; return s; },
          exit: s => { if (s.run == null) return null; const i = s.run; s.st[i] = 'term'; s.run = null; s.edge = 'exit'; s.msg = `<b>exit</b>: ${names[i]} terminates; the OS reclaims its resources. CPU free → scheduling is <b>mandatory</b>.`; return s; }
        };
        const LBL = { create: '+ Create process', admit: 'Admit', dispatch: 'Dispatch', timer: 'Timer interrupt', io: 'Request I/O', iodone: 'I/O completes', exit: 'Exit' };
        const demo = ['create', 'create', 'create', 'admit', 'admit', 'dispatch', 'admit', 'timer', 'dispatch', 'io', 'dispatch', 'iodone', 'exit', 'dispatch', 'timer', 'dispatch', 'exit', 'dispatch', 'exit'];
        const btns = {};
        Player(el, {
          setup(P) { S = new Stage(P.viz, 900, 340); for (const k in A) { btns[k] = btn(LBL[k], () => { const s = A[k](clone(P.cur())); if (s) P.push(s); }); P.act.append(btns[k]); } P.act.append(btn('↺ Reset', () => P.setSteps([init()]))); },
          build() { let s = init(); const st = [s]; for (const a of demo) { const n = A[a](clone(s)); if (n) { st.push(n); s = n; } } return st; },
          after(P) { const s = P.cur(); for (const k in A) btns[k].disabled = !A[k](clone(s)); },
          render(s) {
            S.begin();
            const node = (k, t, x, y, w) => S.box('n' + k, { x, y, w, h: 70, cls: 'zone ' + (k === 'running' && s.run != null ? 'acc' : ''), html: t });
            node('new', 'NEW', 20, 20, 150); node('ready', 'READY', 230, 130, 230); node('running', 'RUNNING (CPU)', 540, 130, 150); node('waiting', 'WAITING', 380, 250, 230); node('term', 'TERMINATED', 740, 20, 150);
            const E = [['admit', [170, 55], [240, 130], 'admitted'], ['dispatch', [460, 150], [540, 150], 'scheduler dispatch'], ['int', [540, 190], [460, 190], 'interrupt'], ['io', [615, 200], [560, 250], 'I/O or event wait'], ['iodone', [400, 250], [360, 200], 'I/O completion'], ['exit', [690, 140], [760, 90], 'exit']];
            E.forEach(([k, a, b, t]) => { S.line('e' + k, { pts: [a, b], c: s.edge === k ? 'hl' : 'ink', arrow: true, thick: s.edge === k }); S.box('el' + k, { x: (a[0] + b[0]) / 2 - 60, y: (a[1] + b[1]) / 2 + (k === 'int' ? 4 : k === 'dispatch' ? -20 : -8), w: 120, h: 16, cls: 'lbl', fg: s.edge === k ? 'var(--hl)' : '', html: t }); });
            names.forEach((n, i) => {
              const st = s.st[i]; let x, y;
              if (st === 'ready') { x = 240 + s.ready.indexOf(i) * 52; y = 160; } else if (st === 'waiting') { x = 390 + s.wait.indexOf(i) * 52; y = 280; }
              else if (st === 'running') { x = 590; y = 160; } else { const k = names.filter((_, j) => j < i && s.st[j] === st).length; const b = SP[st]; x = b[0] + 10 + k * 48; y = b[1] + 10 + (st === 'none' ? 0 : 0); if (st === 'none') { x = 20 + i * 48; y = 300; } }
              S.box('p' + i, { x, y, w: 44, h: 28, cls: 'tok', bg: pcol(i), op: st === 'none' ? 0.25 : st === 'term' ? 0.5 : 1, html: n, z: 4 });
            });
            S.box('rq', { x: 650, y: 280, w: 240, h: 50, cls: 'lbl l', html: `Ready queue: ${s.ready.map(i => names[i]).join(' → ') || '∅'}<br>Device queue: ${s.wait.map(i => names[i]).join(' → ') || '∅'}` });
            S.end();
          }
        });
      }
    },
    {
      t: 'Context switch: saving and reloading the PCB',
      why: [['Problem', 'To pause P0 and later resume it at exactly the right spot, everything in the CPU must be remembered: PC, registers, stack pointer.'], ['Idea', 'Each process has a <b>PCB</b> in kernel memory (state, pid, PC, registers, priority, base/limit, open-file list…). A context switch copies the CPU state into the old PCB, then loads from the new PCB. During that time the system does <b>no useful work</b>: it is pure overhead.']],
      mount(el) {
        let S;
        const C0 = { PC: '0x40A', R1: '12', SP: '0x7F0' }, C1 = { PC: '0x81C', R1: '99', SP: '0x6E0' };
        const st = [];
        const push = (o, msg) => st.push({ ...clone(o), msg });
        let s = { cpu: { ...C0 }, pcb0: { state: 'Running', PC: '?', R1: '?', SP: '?' }, pcb1: { state: 'Ready', ...C1 }, mode: 'user · P0', tl: [['P0', 4]], fly: null };
        push(s, 'P0 is running. The values in the CPU are P0\'s <b>context</b>. PCB1 holds the saved context of P1 (Ready).');
        s.mode = 'kernel · OS'; s.tl.push(['OS', 1]); push(s, '<b>Timer interrupt</b> → the CPU enters the kernel. From here until P1 runs is <b>overhead</b> (grey on the timeline).');
        s.pcb0.PC = C0.PC; s.fly = ['PC', 0]; s.tl[1][1] = 2; push(s, 'Save P0\'s PC into PCB0.');
        s.pcb0.R1 = C0.R1; s.pcb0.SP = C0.SP; s.fly = ['R1', 0]; s.tl[1][1] = 3; push(s, 'Save the registers (R1, SP…) into PCB0. Set PCB0.state = Ready and put it in the ready queue.');
        s.pcb0.state = 'Ready'; s.fly = null; s.tl[1][1] = 4; push(s, 'The short-term scheduler picks P1 from the ready queue.');
        s.cpu = { ...C1 }; s.fly = ['PC', 1]; s.tl[1][1] = 5; push(s, 'Load PC, R1, SP from PCB1 into the CPU.');
        s.pcb1.state = 'Running'; s.mode = 'user · P1'; s.fly = null; s.tl.push(['P1', 4]); push(s, 'Back to user mode: P1 resumes <b>at instruction 0x81C</b> as if it had never stopped.');
        s.tl.push(['OS', 5]); s.tl.push(['P0', 3]); s.cpu = { ...C0 }; s.pcb1 = { state: 'Ready', ...C1 }; s.pcb0.state = 'Running'; s.mode = 'user · P0'; push(s, 'The next interrupt does the reverse: save P1, load P0. The more often context switches happen (e.g. a too-small RR quantum), the more time is wasted.');
        Player(el, {
          setup(P) { S = new Stage(P.viz, 900, 330); }, build: () => st, base: 1700,
          render(s) {
            S.begin();
            const regs = (pre, o, x, y, hl) => ['PC', 'R1', 'SP'].forEach((k, i) => S.box(pre + k, { x: x + i * 72, y, w: 66, h: 40, cls: 'code ' + (hl && hl[0] === k ? 'hl' : ''), html: `<div style="width:100%;text-align:center">${k}<br><b>${o[k]}</b></div>` }));
            S.box('cpu', { x: 320, y: 10, w: 250, h: 90, cls: 'hw', html: '' }); S.box('cput', { x: 330, y: 14, w: 230, h: 16, cls: 'ttl', html: 'CPU · ' + s.mode });
            regs('c', s.cpu, 335, 40, s.fly);
            S.box('kz', { x: 10, y: 130, w: 880, h: 110, cls: 'zone kern', html: 'KERNEL MEMORY' });
            [['pcb0', 'PCB0 (P0)', 40, s.pcb0], ['pcb1', 'PCB1 (P1)', 640, s.pcb1]].forEach(([k, t, x, o], i) => {
              S.box(k, { x, y: 150, w: 230, h: 80, cls: s.fly && s.fly[1] === i ? 'hl' : 'kern', html: '' });
              S.box(k + 't', { x: x + 8, y: 154, w: 214, h: 16, cls: 'ttl', html: t + ' · state: ' + o.state });
              regs(k, o, x + 10, 180);
            });
            if (s.fly) S.line('fly', { pts: s.fly[1] === 0 ? [[340, 100], [200, 150]] : [[700, 150], [540, 100]], c: 'hl', arrow: true, thick: true });
            let x = 10; S.box('tlL', { x: 10, y: 252, w: 300, h: 16, cls: 'lbl l', html: 'Timeline (grey = OS overhead)' });
            s.tl.forEach(([who, w], i) => { const ww = w * 38; S.box('tl' + i, { x, y: 272, w: ww, h: 40, cls: who === 'OS' ? 'hw' : 'tok sq', bg: who === 'P0' ? pcol(0) : who === 'P1' ? pcol(1) : '', html: who === 'OS' ? 'save/load' : who + ' running' }); x += ww + 2; });
            S.end();
          }
        });
      }
    },
    {
      t: 'Queues & the three schedulers',
      why: [['Problem', 'Three decisions at very different frequencies: which job to bring from disk into memory, who gets the CPU <i>right now</i>, and whom to push out to disk when overloaded.'], ['Idea', '<b>Long-term</b> (seconds/minutes): sets the initial degree of multiprogramming. <b>Short-term</b> (~100 ms): picks from the ready queue and must be very fast. <b>Medium-term</b>: swaps partially executed processes out/in to adjust the load. The queues are lists of PCBs in kernel memory.']],
      mount(el) {
        let S; const N = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
        const st = []; let L = { pool: [0, 1, 2, 3, 4, 5], ready: [], cpu: [], disk: [], term: [], swap: [] }, hl = '';
        const push = (msg) => st.push({ L: clone(L), hl, msg });
        hl = ''; push('The job pool on disk has 6 jobs. Memory is empty.');
        L.pool = [4, 5]; L.ready = [0, 1, 2, 3]; hl = 'long'; push('The <b>long-term scheduler</b> (runs rarely, every few seconds/minutes) loads P1–P4 into memory → ready queue. Degree of multiprogramming = 4.');
        L.ready = [1, 2, 3]; L.cpu = [0]; hl = 'short'; push('The <b>short-term scheduler</b> picks P1 for the CPU. It runs very often, so it must be extremely fast.');
        L.cpu = [1]; L.ready = [2, 3]; L.disk = [0]; hl = 'short'; push('P1 requests a disk read → PCB P1 moves to the <b>disk device queue</b>. Short-term picks P2.');
        L.cpu = [2]; L.ready = [3, 1]; hl = 'short'; push('Timer interrupt: P2 goes to the tail of the ready queue. Pick P3.');
        L.cpu = [3]; L.ready = [1]; L.term = [2]; hl = 'short'; push('P3 waits for the keyboard → <b>terminal queue</b>. Pick P4.');
        L.ready = []; L.swap = [1]; hl = 'med'; push('Memory is overloaded → the <b>medium-term scheduler</b> swaps out P2 (partially executed) to the swap area on disk. Degree of multiprogramming drops to 3.');
        L.disk = []; L.ready = [0]; hl = ''; push('Disk done → P1 moves from the device queue back to the ready queue.');
        L.swap = []; L.ready = [0, 1]; hl = 'med'; push('Load drops → medium-term swaps P2 back into memory; P2 resumes where it stopped (its PCB still holds the context).');
        Player(el, {
          setup(P) { S = new Stage(P.viz, 900, 330); }, build: () => st, base: 1900,
          render(s) {
            S.begin();
            S.box('disk', { x: 10, y: 10, w: 170, h: 310, cls: 'zone hw', html: 'DISK' });
            S.box('poolL', { x: 20, y: 36, w: 150, h: 16, cls: 'lbl l', html: 'job pool' });
            S.box('swapL', { x: 20, y: 200, w: 150, h: 16, cls: 'lbl l', html: 'swap area' });
            S.box('mem', { x: 230, y: 10, w: 660, h: 310, cls: 'zone', html: 'MAIN MEMORY (PCB queues in the kernel)' });
            S.box('rqL', { x: 250, y: 50, w: 200, h: 16, cls: 'lbl l', html: 'ready queue' }); S.box('rq', { x: 250, y: 68, w: 330, h: 44, cls: 'kern', html: '' });
            S.box('cpu', { x: 700, y: 60, w: 170, h: 60, cls: 'hw ' + (s.hl === 'short' ? 'hl' : ''), html: '' }); S.box('cpuL', { x: 705, y: 40, w: 160, h: 16, cls: 'lbl', html: 'CPU' });
            S.box('dqL', { x: 250, y: 150, w: 200, h: 16, cls: 'lbl l', html: 'disk device queue' }); S.box('dq', { x: 250, y: 168, w: 330, h: 44, cls: 'kern', html: '' });
            S.box('tqL', { x: 250, y: 235, w: 200, h: 16, cls: 'lbl l', html: 'terminal queue' }); S.box('tq', { x: 250, y: 253, w: 330, h: 44, cls: 'kern', html: '' });
            S.line('lt', { pts: [[180, 80], [250, 90]], c: s.hl === 'long' ? 'hl' : 'ink', arrow: true, thick: s.hl === 'long' }); S.box('ltL', { x: 172, y: 96, w: 80, h: 30, cls: 'lbl', html: 'long-term' });
            S.line('st', { pts: [[580, 90], [700, 90]], c: s.hl === 'short' ? 'hl' : 'ink', arrow: true }); S.box('stL', { x: 590, y: 64, w: 100, h: 16, cls: 'lbl', html: 'short-term' });
            S.line('mt', { pts: [[250, 110], [180, 230]], c: s.hl === 'med' ? 'hl' : 'ink', arrow: 'both', dash: true }); S.box('mtL', { x: 175, y: 150, w: 80, h: 30, cls: 'lbl', html: 'medium-term' });
            const pos = { pool: (k) => [20 + (k % 3) * 50, 60 + Math.floor(k / 3) * 36], swap: k => [20 + k * 50, 222], ready: k => [258 + k * 54, 76], cpu: () => [755, 76], disk: k => [258 + k * 54, 176], term: k => [258 + k * 54, 261] };
            for (const loc in s.L) s.L[loc].forEach((p, k) => { const [x, y] = pos[loc](k); S.box('p' + p, { x, y, w: 46, h: 28, cls: 'tok', bg: pcol(p), html: N[p], z: 4 }); });
            S.end();
          }
        });
      }
    },
    {
      t: 'Process creation: fork(), the process tree and wait()',
      why: [['Problem', 'Shells, browsers with many tabs and background services all need to spawn new processes that run concurrently.'], ['Idea', 'A parent creates a child with <code>fork()</code> → forming a <b>process tree</b>. The parent can run <b>concurrently</b> with the child, or <b>wait</b> for it with <code>wait()/join()</code>. Termination: <b>exit</b> (the child asks to be deleted and may return data to its parent) or <b>abort</b> (the parent kills the child when it exceeds its resources, its task is no longer needed, or the parent is exiting).']],
      mount(el) {
        let S;
        const nodes = { root: [380, 10, 'Root process'], c1: [140, 90, 'Console 1'], c2: [380, 90, 'Console 2'], bg: [640, 90, 'Background'], sw: [570, 170, 'swap'], fl: [720, 170, 'flush'], uz: [140, 170, 'Unzip'], se: [380, 170, 'Search'] };
        const par = { c1: 'root', c2: 'root', bg: 'root', sw: 'bg', fl: 'bg', uz: 'c1', se: 'c2' };
        const order = ['root', 'c1', 'c2', 'bg', 'sw', 'fl', 'uz', 'se'];
        const steps = [];
        order.forEach((k, i) => steps.push({ n: order.slice(0, i + 1), code: null, msg: i === 0 ? 'Boot: the root process.' : `<b>${nodes[par[k]][2]}</b> calls fork() → spawns <b>${nodes[k][2]}</b>.` }));
        const base = order;
        steps.push({ n: base, code: 0, msg: 'Zoom in on Console 1 creating Unzip. Console 1 runs <code>pid = fork();</code>' });
        steps.push({ n: base, code: 1, msg: 'The kernel duplicates: a new PCB + a copy of the address space. fork() <b>returns twice</b>: the parent gets the child\'s pid (1234), the child gets 0.' });
        steps.push({ n: base, code: 2, msg: 'The child (pid==0) takes the if branch and runs unzip. The parent takes the else branch and calls <code>wait()</code> → the parent goes to <b>Waiting</b>.' });
        steps.push({ n: base, code: 3, msg: 'The child finishes and calls <code>exit(0)</code>: the exit code goes to the parent and the OS reclaims the child\'s resources.' });
        steps.push({ n: base, code: 4, msg: 'The parent is woken (Ready → Running) and continues after <code>wait()</code>. Without <code>wait()</code>, parent and child run concurrently and independently.' });
        const CP = ['pid = fork();', 'if (pid == 0) { exec("unzip"); exit(0); }', 'else { wait(NULL); printf("xong"); }'];
        Player(el, {
          setup(P) { S = new Stage(P.viz, 900, 360); }, build: () => steps, base: 1500,
          render(s) {
            S.begin();
            s.n.forEach((k, i) => { const [x, y, t] = nodes[k]; S.box('n' + k, { x, y, w: 150, h: 40, cls: (k === 'uz' || k === 'c1') && s.code != null ? 'hl' : 'user', html: t, from: par[k] ? [nodes[par[k]][0], nodes[par[k]][1]] : null }); if (par[k]) { const [px, py] = nodes[par[k]]; S.line('l' + k, { x1: px + 75, y1: py + 40, x2: x + 75, y2: y, c: 'ink', arrow: true }); } });
            if (s.code != null) {
              const c = s.code; const pst = c >= 2 && c < 4 ? 'Waiting (trong wait)' : 'Running';
              S.box('pc', { x: 20, y: 240, w: 420, h: 110, cls: 'zone', html: `Cha · Console 1 · <b>${pst}</b>` });
              S.box('cc', { x: 460, y: 240, w: 420, h: 110, cls: 'zone', op: c >= 1 ? 1 : 0.2, html: c >= 3 ? 'Con · Unzip · <b>Terminated</b>' : 'Con · Unzip · <b>Running</b>' });
              CP.forEach((l, i) => { S.box('pl' + i, { x: 30, y: 262 + i * 28, w: 400, h: 24, cls: 'code ' + ((c === 0 && i === 0) || (c >= 2 && i === 2) ? 'hl' : ''), html: l }); S.box('cl' + i, { x: 470, y: 262 + i * 28, w: 400, h: 24, op: c >= 1 ? 1 : 0.2, cls: 'code ' + (c >= 2 && c <= 3 && i === 1 ? 'hl' : ''), html: l }); });
              if (c >= 1) { S.box('pv', { x: 330, y: 240, w: 100, h: 18, cls: 'lbl', html: 'pid = 1234' }); S.box('cv', { x: 770, y: 240, w: 100, h: 18, cls: 'lbl', html: 'pid = 0' }); }
              if (c === 3) S.line('ex', { pts: [[460, 320], [440, 320]], c: 'ok', arrow: true });
            }
            S.end();
          }
        });
      }
    },
    {
      t: 'Inter-process communication (IPC): message passing vs shared memory',
      why: [['Problem', 'Each process has its own address space (protected by base/limit), so they cannot read each other\'s variables. Cooperating processes still need to exchange data.'], ['Idea', '<b>Message passing</b>: the kernel relays data via <code>send/receive</code> (each is a system call; safe, synchronization built in). <b>Shared memory</b>: the kernel sets up a common region <i>once</i>; afterwards both sides read and write directly, very fast, but they must synchronize themselves (see Chapter 4).']],
      exam: 'Mailbox (port) = indirect: <code>send(A,msg)</code>. Direct: <code>send(P,msg)</code> must name the process. The producer–consumer example on the slides uses a mailbox, so it is <b>indirect</b>.',
      mount(el) {
        let S, mode = 'msg';
        function build() {
          const st = []; let box = [], prod = 'run', cons = 'run', sh = [], fly = null, k = 1;
          const push = (msg, ex) => st.push({ box: [...box], prod, cons, sh: [...sh], fly, msg, ...ex });
          if (mode === 'msg') {
            push('Producer A and consumer B communicate through a <b>mailbox</b> of capacity 3 inside the kernel.');
            for (; k <= 3; k++) { fly = ['A', 'K']; box.push('m' + k); push(`A calls <code>send(mailbox, m${k})</code> → traps into the kernel, which copies m${k} into the mailbox.`); }
            fly = null; prod = 'blk'; push('A wants to send m4 but the mailbox is <b>full</b> → A blocks (waits).');
            fly = ['K', 'B']; box.shift(); push('B calls <code>receive(mailbox, m)</code> → the kernel copies m1 into B\'s memory. The mailbox has a free slot.');
            prod = 'run'; fly = ['A', 'K']; box.push('m4'); push('A is woken and m4 enters the mailbox.');
            for (let j = 0; j < 3; j++) { fly = ['K', 'B']; const m = box.shift(); push(`B receives ${m}.`); }
            fly = null; cons = 'blk'; push('Mailbox <b>empty</b> → B\'s <code>receive</code> blocks. Every exchange goes through the kernel (2 system calls per message): safe but costly.');
          } else {
            push('A makes a system call (e.g. <code>shmget/shmat</code>) so the kernel creates a shared region and <b>maps</b> it into both A\'s and B\'s address spaces. The kernel is involved only <b>once</b>.', { shm: 1 });
            for (k = 1; k <= 3; k++) { fly = ['A', 'S']; sh.push('x' + k); push(`A writes x${k} straight into the shared region with an ordinary store; no trap into the kernel.`, { shm: 1 }); }
            fly = ['S', 'B']; sh.shift(); push('B reads it directly. Very fast.', { shm: 1 });
            fly = null; push('But if A and B both update a <code>counter</code> in the shared region, the result can be wrong (race condition). Synchronization is the programmer\'s job; see Chapter 4.', { shm: 1, warn: 1 });
          }
          return st;
        }
        Player(el, {
          setup(P) { P.top.append(fSel('Model:', [['msg', 'Message passing (qua kernel)'], ['shm', 'Shared memory']], mode, v => { mode = v; P.rebuild(); })); S = new Stage(P.viz, 900, 300); }, build, base: 1500,
          render(s) {
            S.begin();
            S.box('uz', { x: 10, y: 10, w: 880, h: 150, cls: 'zone user', html: 'USER SPACE' });
            S.box('kz', { x: 10, y: 175, w: 880, h: 115, cls: 'zone kern', html: 'KERNEL SPACE' });
            S.box('A', { x: 40, y: 50, w: 200, h: 90, cls: s.prod === 'blk' ? 'bad' : 'hw', html: '<b>Process A</b><span class="s">producer' + (s.prod === 'blk' ? ' · BLOCKED' : '') + '</span>' });
            S.box('B', { x: 660, y: 50, w: 200, h: 90, cls: s.cons === 'blk' ? 'bad' : 'hw', html: '<b>Process B</b><span class="s">consumer' + (s.cons === 'blk' ? ' · BLOCKED' : '') + '</span>' });
            if (mode === 'msg') {
              S.box('mb', { x: 320, y: 205, w: 260, h: 60, cls: 'kern', html: '' }); S.box('mbl', { x: 320, y: 188, w: 260, h: 16, cls: 'lbl', html: 'mailbox (capacity 3)' });
              s.box.forEach((m, i) => S.box('m_' + m, { x: 332 + i * 82, y: 218, w: 70, h: 34, cls: 'tok', bg: pcol(+m.slice(1) - 1), html: m, from: [140, 90], z: 4 }));
              if (s.fly) S.line('fl', { pts: s.fly[0] === 'A' ? [[200, 140], [340, 205]] : [[560, 205], [700, 140]], c: 'hl', arrow: true, thick: true });
            } else {
              S.box('sm', { x: 300, y: 50, w: 300, h: 90, cls: s.warn ? 'bad' : 'acc', html: '' }); S.box('sml', { x: 300, y: 30, w: 300, h: 16, cls: 'lbl', html: 'shared memory region (mapped into both A and B)' });
              s.sh.forEach((m, i) => S.box('s_' + m, { x: 315 + i * 92, y: 78, w: 80, h: 34, cls: 'tok', bg: pcol(+m.slice(1) + 3), html: m, from: [140, 90], z: 4 }));
              S.box('ks', { x: 330, y: 210, w: 240, h: 50, cls: 'kern', html: 'the kernel only sets up the mapping' });
              if (s.fly) S.line('fl', { pts: s.fly[0] === 'A' ? [[240, 95], [300, 95]] : [[600, 95], [660, 95]], c: 'hl', arrow: true, thick: true });
            }
            S.end();
          }
        });
      }
    },
    {
      t: 'Threads: one process, many flows of execution',
      why: [['Problem', 'A single-threaded editor freezes while auto-saving (waiting for the disk); keystrokes get no response. Multiple processes are heavy because each has its own address space.'], ['Idea', 'A <b>thread</b> (lightweight process) owns only: thread id, PC, register set, stack. Threads <b>share</b> code, data and OS resources (open files). If one thread blocks, others keep running, so throughput and responsiveness improve.']],
      mount(el) {
        let S, mode = 'multi';
        const T = 10;
        const plan = { multi: [['UI (typing)', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R'], ['Autosave', '-', '-', 'R', 'B', 'B', 'B', 'B', 'R', '-', '-'], ['Spell check', 'R', '-', 'R', 'R', '-', 'R', 'R', '-', 'R', 'R']], single: [['Single thread', 'R', 'R', 'R', 'B', 'B', 'B', 'B', 'R', 'R', 'R']] };
        const build = () => range(T + 1).map(t => {
          const rows = plan[mode]; const blk = rows.some(r => r[t + 1] === 'B');
          let msg = t === 0 ? (mode === 'multi' ? '3 threads share code/data/files; each has its own PC, registers and stack.' : 'A single thread of control does everything.') :
            mode === 'single' ? (blk ? `t=${t}: the only thread is waiting for the disk → <span class="bad">the whole program freezes</span>, keystrokes queue up.` : `t=${t}: the program runs.`) :
              (blk ? `t=${t}: the Autosave thread is blocked on the disk, but UI and Spell check <b>keep running</b>.` : `t=${t}: the threads take turns on the CPU.`);
          return { t, msg };
        });
        Player(el, {
          setup(P) { P.top.append(fSel('Design:', [['multi', 'Multithreaded'], ['single', 'Single-threaded']], mode, v => { mode = v; P.rebuild(); })); S = new Stage(P.viz, 900, 190); },
          build, base: 1000,
          render(s, P) {
            S.begin(); const rows = plan[mode];
            S.box('pr', { x: 10, y: 10, w: 880, h: 170, cls: 'zone', html: 'PROCESS' });
            ['code', 'data', 'files'].forEach((k, i) => S.box('sh' + k, { x: 30 + i * 140, y: 40, w: 130, h: 34, cls: 'acc', html: k + ' <span class="s">shared</span>' }));
            rows.forEach((r, i) => { const stt = r[s.t + 1]; S.box('th' + i, { x: 30 + i * 280, y: 95, w: 260, h: 74, cls: stt === 'B' ? 'bad' : stt === 'R' ? 'ok' : '', html: `<div><b>${r[0]}</b><br><span class="s">own: PC · registers · stack</span>${stt === 'B' ? 'BLOCKED (waiting for disk)' : stt === 'R' ? 'running' : 'idle'}</div>` }); });
            S.end();
            const segs = []; rows.forEach((r, i) => { for (let t = 0; t < T; t++) if (r[t + 1] !== '-') segs.push({ r: i, s: t, e: t + 1, c: i, col: r[t + 1] === 'B' ? 'var(--bad)' : pcol(i), t: r[t + 1] === 'B' ? 'waiting' : '' }); });
            let g = P.viz.querySelector('.gwrap'); if (!g) { g = h('div', { class: 'gwrap' }); P.viz.append(g); }
            g.innerHTML = ganttSVG({ rows: rows.map(r => r[0].split(' ')[0]), segs, T, now: s.t });
          }
        });
      }
    },
    {
      t: 'Mapping models: user threads → kernel threads',
      why: [['Paradox', 'Users want to create as many threads as they like, but the kernel can only afford a limited number.'], ['Idea', 'Two layers: <b>user threads</b> (logical, cheap to create in user space) and <b>kernel threads</b> (physical, scheduled by the OS). The OS maintains the mapping between them. There is no one-to-many model because mapping one user thread onto many kernel threads wastes resources.']],
      exam: 'Many-to-one: if one user thread makes a blocking system call, <b>all</b> user threads on that kernel thread block, and multiple cores cannot be used. One-to-one: good parallelism, but every user thread costs a kernel thread. Many-to-many: best of both, but the mapping is hard to decide.',
      mount(el) {
        let S, mode = 'm1';
        const maps = { m1: [0, 0, 0, 0], '11': [0, 1, 2, 3], mm: [0, 1, 0, 1] };
        const nk = { m1: 1, '11': 4, mm: 2 };
        function build() {
          const m = maps[mode], st = [];
          st.push({ map: m, blk: [], kb: [], msg: { m1: '<b>Many-to-one</b>: 4 user threads share 1 kernel thread. The OS sees only one thread, so it runs on just 1 core.', '11': '<b>One-to-one</b> (Windows NT/2000, OS/2): each user thread has its own kernel thread and can run in parallel on 2 cores.', mm: '<b>Many-to-many</b> (goroutines, C++20 coroutines): 4 user threads share 2 kernel threads that the OS creates as needed.' }[mode] });
          st.push({ map: m, blk: [1], kb: [], msg: 'U2 calls a blocking <code>read()</code> (an I/O system call)...' });
          const kb = [m[1]]; const blk = range(4).filter(i => m[i] === m[1]);
          if (mode === 'mm') {
            st.push({ map: m, blk, kb, msg: 'Kernel thread K1 (carrying U2) blocks. U1 is also on K1, so it stalls too.' });
            st.push({ map: [1, 0, 1, 1], blk: [1], kb, k3: true, msg: 'The thread library <b>remaps</b> U1, U3, U4 onto K2 (the OS can create more kernel threads). Only U2 waits.' });
          } else st.push({ map: m, blk, kb, msg: mode === 'm1' ? '<span class="bad">K1 blocks → all 4 user threads stall</span>, even though U1, U3, U4 do no I/O.' : 'Only K2 blocks → only U2 waits. U1, U3, U4 keep running on 2 cores. The price: every user thread needs a matching kernel thread, and too many burden the system.' });
          return st;
        }
        Player(el, {
          setup(P) { P.top.append(fSel('Model:', [['m1', 'Many-to-One'], ['11', 'One-to-One'], ['mm', 'Many-to-Many']], mode, v => { mode = v; P.rebuild(); })); S = new Stage(P.viz, 900, 300); }, build, base: 1900,
          render(s) {
            S.begin();
            S.box('uz', { x: 10, y: 6, w: 880, h: 80, cls: 'zone user', html: 'user space' });
            S.box('kz', { x: 10, y: 120, w: 880, h: 80, cls: 'zone kern', html: 'kernel space' });
            const ux = i => 120 + i * 190, kn = nk[mode] + (s.k3 ? 0 : 0), kx = j => 450 - (kn - 1) * 95 + j * 190;
            range(4).forEach(i => { S.box('u' + i, { x: ux(i), y: 30, w: 100, h: 40, cls: s.blk.includes(i) ? 'bad' : 'tok', bg: s.blk.includes(i) ? '' : pcol(i), html: 'U' + (i + 1) }); S.line('m' + i, { x1: ux(i) + 50, y1: 70, x2: kx(s.map[i]) + 50, y2: 142, c: s.blk.includes(i) ? 'bad' : 'ink', arrow: true }); });
            range(kn).forEach(j => S.box('k' + j, { x: kx(j), y: 142, w: 100, h: 40, cls: s.kb.includes(j) ? 'bad' : 'hw', html: 'K' + (j + 1) }));
            [0, 1].forEach(c => S.box('core' + c, { x: 300 + c * 200, y: 240, w: 100, h: 40, cls: 'hw', html: 'Core ' + (c + 1) }));
            range(kn).forEach(j => { if (j < 2 && !s.kb.includes(j)) S.line('kc' + j, { x1: kx(j) + 50, y1: 182, x2: 350 + j * 200, y2: 240, c: 'acc', dash: true }); });
            S.end();
          }
        });
      }
    }
  ],
  quiz: [
    { q: 'Which field is NOT in the PCB according to the lecture?', o: ['Program counter', 'Base/limit (memory-management information)', 'List of open files', 'The program\'s source code'], a: 3, e: 'Program code lives in the process\'s text region. The PCB holds only management information: state, pid, PC, registers, priority, base/limit, open files, pointers to other PCBs.' },
    { q: 'A process is Waiting (for I/O) and the I/O completes. It moves to:', o: ['Running', 'Ready', 'New', 'Terminated'], a: 1, e: 'There is no Waiting → Running arrow. It goes to Ready and waits for the scheduler to dispatch it.' },
    { q: 'Which scheduler controls the degree of multiprogramming after the initial stage?', o: ['Long-term', 'Short-term', 'Medium-term', 'Dispatcher'], a: 2, e: 'Initially the long-term scheduler, afterwards the medium-term one (swap out under heavy load, swap in under light load).' },
    { q: 'Which of the following does a thread NOT own privately?', o: ['Program counter', 'Stack', 'Register set', 'List of open files'], a: 3, e: 'Open files are an OS resource shared by all threads of the same process (same code and data).' },
    { q: 'In the many-to-one model, one user thread makes a blocking system call. What happens?', o: ['Only that thread blocks', 'Every user thread mapped to that kernel thread blocks', 'The kernel creates another kernel thread', 'Nothing happens'], a: 1, e: 'The kernel sees only one kernel thread. If it blocks, every user thread on it stalls.' },
    { q: 'Why is a context switch overhead?', o: ['Because it flushes the cache', 'Because the system does no useful work while saving/loading context', 'Because it needs to read the disk', 'Because a new PCB must be created'], a: 1, e: 'Lecture: “The system does NO useful work while switching”. No new PCB is created; it only saves and loads.' },
    { q: 'Programs exchange data through shared memory. Which statement is true?', o: ['Every write must go through a system call', 'The kernel is involved only in the setup; afterwards access is direct and must be synchronized by the programs', 'A race condition cannot occur', 'It only works for threads'], a: 1, e: 'Shared memory is fast because there is no trap on each access, but the programmer must synchronize.' },
    { q: 'Why is there no one-to-many model?', o: ['Because the hardware does not support it', 'Because mapping one user thread onto many kernel threads wastes OS resources', 'Because it violates mutual exclusion', 'Because user threads cannot make system calls'], a: 1, e: 'A user thread is a single sequential flow of execution. Giving it several kernel threads is pure waste.' }
  ]
});
