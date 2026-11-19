// ================= CHAPTER 1: INTRO =================
chapter({
  t: 'Introduction & computer architecture', short: 'Introduction',
  lead: 'The OS is an intermediary between the user and the hardware, with two goals: convenience for the user and efficient use of the hardware. These goals can conflict. This chapter shows how the OS “really” runs: interrupts, dual mode, system calls and memory protection.',
  sections: [
    {
      t: 'A request travelling through the system layers',
      why: [['Problem', 'Programmers do not want to drive the disk head, interrupts and memory themselves.'], ['Idea', 'Put an OS layer in between: hide complexity with <b>abstractions</b> (files, processes), decide how to share resources with <b>policy</b>, and enforce it with <b>mechanism</b>. The kernel is the core that is always running, ready to take requests from users and hardware.']],
      mount(el) {
        let S;
        const L = { user: 30, app: 105, os: 180, hw: 262 };
        const steps = [
          { tok: null, hl: [], msg: '4 components: <b>Users</b> → <b>Application programs</b> → <b>Operating System</b> → <b>Hardware</b>. Press ▶ to follow a “Save file” action.' },
          { tok: 'user', hl: ['user'], msg: 'The user clicks “Save” in the editor.' },
          { tok: 'app', hl: ['app'], msg: 'The application calls the library function <code>fwrite()</code>. This is still user code (user mode); no hardware is touched yet.' },
          { tok: 'os', hl: ['os', 'cp'], msg: 'The library issues a <b>system call</b> → the CPU switches to kernel mode. The OS acts as a <b>control program</b>: does the file exist, may this process write to it?' },
          { tok: 'os', hl: ['os', 'ra'], msg: 'The OS acts as a <b>resource allocator</b>: picks a free disk block, queues the request for the disk, allocates a buffer in memory.' },
          { tok: 'disk', hl: ['hw', 'disk'], msg: 'The driver commands the disk controller. While the (very slow) disk writes, the CPU is given to another process.' },
          { tok: 'os', hl: ['os', 'kn'], msg: 'The disk finishes → raises an <b>interrupt</b>. The (always resident) kernel handles it and marks the application process as ready.' },
          { tok: 'app', hl: ['app'], msg: 'The system call returns and the CPU goes back to user mode. The application continues.' },
          { tok: 'user', hl: ['user'], msg: 'The user sees “Saved”. The application never knew which disk block was used: that is the <b>abstraction</b> the OS provides.' }
        ];
        Player(el, {
          setup(P) { S = new Stage(P.viz, 900, 320); },
          build: () => steps,
          render(s) {
            S.begin(); const on = k => s.hl.includes(k);
            S.box('user', { x: 20, y: L.user - 18, w: 860, h: 52, cls: 'zone ' + (on('user') ? 'hl' : ''), html: 'USERS · people, machines, other computers' });
            S.box('app', { x: 20, y: L.app - 18, w: 860, h: 52, cls: 'zone user ' + (on('app') ? 'hl' : ''), html: 'APPLICATION PROGRAMS · editors, compilers, games, databases' });
            S.box('os', { x: 20, y: L.os - 18, w: 860, h: 62, cls: 'zone kern ' + (on('os') ? 'hl' : ''), html: 'OPERATING SYSTEM' });
            [['cp', 'Control program'], ['ra', 'Resource allocator'], ['kn', 'Kernel']].forEach(([k, t], i) => S.box('r' + k, { x: 360 + i * 175, y: L.os - 4, w: 160, h: 30, cls: on(k) ? 'hl' : 'kern', html: t }));
            S.box('hw', { x: 20, y: L.hw - 18, w: 860, h: 70, cls: 'zone hw ' + (on('hw') ? 'hl' : ''), html: 'HARDWARE' });
            ['CPU', 'Memory', 'Disk', 'Keyboard'].forEach((t, i) => S.box('h' + i, { x: 360 + i * 130, y: L.hw - 4, w: 115, h: 36, cls: (t === 'Disk' && on('disk')) ? 'hl' : '', html: t }));
            if (s.tok) { const pos = { user: [200, L.user - 6], app: [200, L.app - 6], os: [200, L.os], disk: [640, L.hw - 30] }[s.tok]; S.box('tok', { x: pos[0], y: pos[1], w: 110, h: 26, cls: 'tok', bg: 'var(--hl)', html: 'Save request', z: 5 }); }
            S.end();
          }
        });
      }
    },
    {
      t: 'Batch vs multiprogramming: why the CPU must not sit waiting for I/O',
      why: [['Problem', 'A batch system has <b>only one job in memory</b>. When the job waits for I/O, the CPU idles.'], ['Idea', 'Keep <b>several jobs in memory</b> at once; when one waits for I/O the CPU runs another. This requires memory management, CPU scheduling and I/O device scheduling in the OS.']],
      exam: 'Multiprogramming raises <i>CPU utilization</i> and throughput, but it does not make a single job run faster. Each job\'s completion time may even be longer.',
      mount(el) {
        const jobs = [{ name: 'J1', b: [3, 4, 2] }, { name: 'J2', b: [2, 3, 3] }, { name: 'J3', b: [4, 2, 1] }];
        const A = mpSim(jobs, false), B = mpSim(jobs, true);
        const segsOf = (arr, row, mapC) => { const out = []; let s = 0; for (let t = 1; t <= arr.length; t++) if (t === arr.length || arr[t] !== arr[s]) { if (arr[s] != null && arr[s] !== false) out.push({ r: row, s, e: t, c: mapC(arr[s]), t: mapC(arr[s]) >= 0 ? jobs[mapC(arr[s])].name : '' }); s = t; } return out; };
        const build = R => [...segsOf(R.cpu, 0, x => x), ...R.io.flatMap((io, j) => segsOf(io, j + 1, () => j).map(g => ({ ...g, t: 'I/O', col: pcol(j) + '88' })))];
        const gA = build(A), gB = build(B), T = Math.max(A.T, B.T);
        const steps = range(T + 1).map(t => {
          const u = (R) => { const k = Math.min(t, R.T); const busy = R.cpu.slice(0, k).filter(x => x != null).length; return k ? Math.round(100 * busy / k) : 0; };
          const wa = t < A.T ? (A.cpu[t] == null ? '<span class="bad">CPU idle</span> because the only job in memory is waiting for I/O' : `CPU runs ${jobs[A.cpu[t]].name}`) : 'done';
          const wb = t < B.T ? (B.cpu[t] == null ? 'CPU idle' : `CPU runs ${jobs[B.cpu[t]].name}`) : 'done';
          return { t, msg: t === 0 ? 'Three jobs, each alternating CPU bursts and I/O bursts. Batch: the next job is loaded only when the previous one ends. Multiprogramming: all three are in memory.' : `t=${t}. Batch: ${wa}. Multiprogramming: ${wb}.`, ua: u(A), ub: u(B) };
        });
        steps.push({ t: T, msg: `Result: batch finishes at t=${A.T}, CPU busy ${Math.round(A.util * 100)}%. Multiprogramming finishes at t=${B.T}, CPU busy ${Math.round(B.util * 100)}%. Same work, just arranged differently.`, ua: Math.round(A.util * 100), ub: Math.round(B.util * 100), hold: 2 });
        Player(el, {
          build: () => steps, base: 900,
          render(s, P) {
            const rows = ['CPU', 'I/O J1', 'I/O J2', 'I/O J3'];
            P.viz.innerHTML = `<div class="lab">Batch (1 job in memory) · CPU utilization ${s.ua}%</div>` + ganttSVG({ rows, segs: gA, T, now: s.t }) +
              `<div class="lab" style="margin-top:10px">Multiprogramming (several jobs) · CPU utilization ${s.ub}%</div>` + ganttSVG({ rows, segs: gB, T, now: s.t });
          }
        });
      }
    },
    {
      t: 'Interrupts and DMA: how a device notifies the CPU',
      why: [['Problem', 'If the CPU must keep <i>asking</i> the device “done yet?” (polling), CPU time is wasted. If a fast device still needs the CPU to copy every byte, the CPU is interrupted constantly.'], ['Idea', '<b>Interrupt</b>: the device signals on its own, so CPU and I/O run in parallel (the OS is <i>interrupt driven</i>). <b>DMA</b>: the controller copies the whole block into memory itself and interrupts <b>once per block</b> instead of once per byte.']],
      exam: 'While one interrupt is being handled, incoming interrupts are <b>disabled</b> so none are lost. A trap is an interrupt generated by the CPU/software (a program error or a system call request).',
      mount(el) {
        let S, mode = 'int';
        const POS = { dev: (k) => [690 + k * 42, 268], ctrl: (k) => [690 + k * 42, 120], cpu: () => [100, 120], mem: (k) => [380 + k * 42, 178] };
        function build() {
          const st = []; let d = ['dev', 'dev', 'dev', 'dev'], cpu = 'Job 1', irq = false, ints = 0, vec = false, save = false, cmd = false;
          const push = (msg, ex) => st.push({ d: [...d], cpu, irq, ints, vec, save, cmd, msg, ...ex });
          push('Job 1 is running on the CPU. The device (disk) holds 4 bytes D0..D3 that Job 1 needs.');
          cmd = true; cpu = 'OS'; push('Job 1 calls <code>read()</code> (a system call). The OS writes the command into the <b>device controller</b>\'s registers' + (mode === 'dma' ? ', and also programs the DMA unit with the <i>destination memory address</i> and <i>byte count = 4</i>.' : '.'));
          cmd = false; cpu = 'Job 2'; push('Job 1 moves to Waiting. The CPU <b>does not wait</b>: the OS runs Job 2. CPU and device now work <b>in parallel</b>.');
          if (mode === 'int') {
            for (let k = 0; k < 4; k++) {
              d[k] = 'ctrl'; push(`The controller reads D${k} from the device into its <b>local buffer</b>. The CPU keeps running Job 2.`);
              irq = true; push('The controller is done → raises the <b>interrupt</b> line to the CPU.', { hold: 1 });
              save = true; cpu = 'OS'; ints++; push('The CPU finishes the current instruction, <b>saves the PC and registers</b> of Job 2, and temporarily <b>disables interrupts</b>.');
              vec = true; push('The CPU looks up the <b>interrupt vector</b> by interrupt number → address of the disk\'s <b>interrupt service routine (ISR)</b>.');
              d[k] = 'cpu'; irq = false; push(`The ISR copies D${k} from the controller buffer into a CPU register...`);
              d[k] = 'mem'; vec = false; push(`...then writes D${k} into the destination memory. Every byte costs the CPU one interrupt + copy.`);
              save = false; cpu = 'Job 2'; push(`Restore state, re-enable interrupts, Job 2 continues. Interrupts so far: <b>${ints}</b>.`);
            }
          } else {
            for (let k = 0; k < 4; k++) { d[k] = 'ctrl'; push(`The controller reads D${k} into its buffer. The CPU keeps running Job 2, undisturbed.`); }
            d = d.map(() => 'mem'); push('The controller uses the bus to copy <b>the whole block</b> straight into memory (Direct Memory Access); the CPU does no copying.');
            irq = true; push('Whole block done → a <b>single</b> interrupt.');
            save = true; cpu = 'OS'; ints++; vec = true; irq = false; push('The CPU saves Job 2\'s state, looks up the vector, runs the ISR. The ISR only marks “block arrived”; it copies no data.');
            save = false; vec = false; cpu = 'Job 2'; push('Job 2 resumes. Only <b>1</b> interrupt in total.');
          }
          push(`The data is in memory; Job 1 goes Waiting → Ready. <b>Total interrupts: ${ints}</b> ${mode === 'int' ? '(one interrupt per byte). A 4 KB block would mean 4096 interrupts!' : '(one interrupt per block). This is why DMA is used for high-speed devices.'}`, { hold: 2 });
          return st;
        }
        Player(el, {
          setup(P) { P.top.append(fSel('Mechanism:', [['int', 'Interrupt-driven I/O (interrupt per byte)'], ['dma', 'DMA (interrupt per block)']], mode, v => { mode = v; P.rebuild(); })); S = new Stage(P.viz, 900, 320); },
          build, base: 1400,
          render(s) {
            S.begin();
            S.box('cpu', { x: 20, y: 40, w: 230, h: 150, cls: 'hw ' + (s.cpu === 'OS' ? 'kern' : ''), html: '' });
            S.box('cpuT', { x: 30, y: 46, w: 200, h: 20, cls: 'ttl', html: 'CPU' });
            S.box('cpuR', { x: 30, y: 72, w: 210, h: 34, cls: s.cpu === 'OS' ? 'hl' : 'acc', html: 'running: <b>' + s.cpu + '</b>' });
            S.box('save', { x: 30, y: 150, w: 210, h: 30, cls: s.save ? 'hl' : 'dim', html: s.save ? 'Job 2 PC, regs saved · interrupts OFF' : 'interrupts: ON' });
            S.box('mem', { x: 330, y: 20, w: 270, h: 230, cls: 'zone', html: 'MAIN MEMORY' });
            S.box('vec', { x: 345, y: 48, w: 240, h: 30, cls: s.vec ? 'hl' : 'kern', html: 'Interrupt vector → ISR' });
            S.box('jobs', { x: 345, y: 86, w: 240, h: 30, cls: 'user', html: 'Job 1 · Job 2' });
            S.box('dst', { x: 345, y: 168, w: 240, h: 46, cls: 'zone user', html: 'destination buffer' });
            S.box('ctl', { x: 660, y: 40, w: 220, h: 150, cls: 'hw ' + (s.cmd ? 'hl' : ''), html: '' });
            S.box('ctlT', { x: 670, y: 46, w: 200, h: 20, cls: 'ttl', html: mode === 'dma' ? 'Device controller + DMA' : 'Device controller' });
            S.box('ctlB', { x: 680, y: 112, w: 180, h: 40, cls: 'zone', html: 'local buffer' });
            S.box('dev', { x: 680, y: 255, w: 180, h: 50, cls: 'hw', html: '' });
            S.box('devT', { x: 690, y: 236, w: 160, h: 16, cls: 'lbl', html: 'Device (disk)' });
            S.line('bus', { x1: 20, y1: 222, x2: 880, y2: 222, c: 'mut', thick: true });
            S.box('busT', { x: 260, y: 225, w: 60, h: 16, cls: 'lbl', html: 'BUS' });
            S.line('irq', { pts: [[660, 70], [252, 70]], c: s.irq ? 'bad' : 'mut', dash: true, arrow: true, thick: s.irq });
            S.box('irqT', { x: 360, y: 0, w: 240, h: 16, cls: 'lbl', html: s.irq ? '<b style="color:var(--bad)">INTERRUPT!</b>' : 'interrupt line' });
            if (s.cmd) S.line('cmd', { pts: [[250, 160], [660, 160]], c: 'acc', arrow: true });
            s.d.forEach((loc, k) => { const p = POS[loc](k); S.box('d' + k, { x: p[0], y: p[1], w: 36, h: 26, cls: 'tok', bg: pcol(k), html: 'D' + k, z: 6 }); });
            S.box('ints', { x: 30, y: 270, w: 220, h: 40, cls: 'big', html: 'Interrupts: ' + s.ints });
            S.end();
          }
        });
      }
    },
    {
      t: 'Dual mode & system calls',
      why: [['Problem', 'If user programs could issue I/O, disable interrupts or modify the vector table themselves, a single bug could crash the machine and touch other users\' data.'], ['Idea', 'The hardware has a <b>mode bit</b>: monitor/kernel = <b>0</b>, user = <b>1</b>. Privileged instructions only run when the bit = 0. The only way into the kernel is through a <b>trap/interrupt</b>, where the hardware sets the bit to 0 and jumps to predefined OS code.']],
      exam: 'All I/O instructions are privileged. A root/admin account is <b>not</b> kernel mode: root\'s processes still run in user mode; root is only allowed to <i>ask</i> the kernel to do more (e.g. load a kernel module).',
      mount(el) {
        let S, sc = 'call';
        const A = {
          call: [
            { pc: 'main', mode: 1, msg: 'The program is running in <b>user mode</b> (mode bit = 1).' },
            { pc: 'fopen', mode: 1, msg: '<code>fopen()</code> is an <b>API</b> function of the C standard library: still user code, still mode 1.' },
            { pc: 'open', mode: 1, msg: '<code>open()</code> loads the system call number into a register and executes a <b>trap</b> instruction.' },
            { pc: 'trap', mode: 0, tok: 'k', msg: 'The <b>hardware</b> flips the mode bit → 0 and jumps to the trap handler from the vector. The user cannot choose the jump address, so there is no sneaking into the kernel.' },
            { pc: 'tbl', mode: 0, msg: 'Kernel tra <b>system call table</b>[SYS_open] → <code>sys_open()</code>.' },
            { pc: 'sys', mode: 0, msg: '<code>sys_open()</code> checks permissions, finds the file, may command the disk (a privileged I/O instruction, legal because we are in mode 0).', disk: true },
            { pc: 'ret', mode: 1, msg: 'The kernel switches back to <b>user mode</b> (“set user mode” is privileged) and returns the fd to <code>open()</code>.' },
            { pc: 'main', mode: 1, msg: 'The program continues with a valid <code>fp</code>. Each system call = 2 mode switches, so a system call costs more than an ordinary function call.' }
          ],
          priv: [
            { pc: 'main', mode: 1, msg: 'A user program tries to write straight to the disk\'s I/O port (<code>out 0x1F0, al</code>) to bypass the OS.' },
            { pc: 'bad', mode: 1, msg: 'The CPU decodes the instruction, sees it is <b>privileged</b>, checks mode bit = 1.' },
            { pc: 'trap', mode: 0, tok: 'k', msg: 'Illegal → the CPU raises a <b>trap</b> (software/error interrupt). Mode bit → 0, jump into the OS.' },
            { pc: 'kill', mode: 0, msg: 'The OS handles the error: reports “Illegal instruction” and terminates the process. The disk is never touched.' }
          ],
          root: [
            { pc: 'main', mode: 1, msg: 'The same program, but run by the <b>root</b> account.' },
            { pc: 'bad', mode: 1, msg: 'The mode bit is still 1. Root is an <i>OS</i> concept (an account); the mode bit belongs to the <i>hardware</i>.' },
            { pc: 'trap', mode: 0, tok: 'k', msg: 'It traps just the same. Root may only do more <b>through system calls</b> (e.g. loading a kernel module, whose code then runs in kernel mode).' },
            { pc: 'kill', mode: 0, msg: 'Conclusion: root ≠ kernel mode.' }
          ]
        };
        const U = [['main', 'main(): fp = fopen("a.txt","r");'], ['fopen', 'libc fopen(): fd = open(...);'], ['open', 'open(): mov eax,SYS_open ; trap'], ['bad', 'main(): out 0x1F0, al   // I/O instruction']];
        const K = [['trap', 'Trap handler (from vector)'], ['tbl', 'System call table[SYS_open]'], ['sys', 'sys_open(): check permissions, read disk'], ['ret', 'set user mode; return fd'], ['kill', 'Error! kill process']];
        Player(el, {
          setup(P) { P.top.append(fSel('Scenario:', [['call', 'Call the open() system call'], ['priv', 'User runs a privileged instruction'], ['root', 'Root runs a privileged instruction']], sc, v => { sc = v; P.rebuild(); })); S = new Stage(P.viz, 900, 300); },
          build: () => A[sc], base: 1700,
          render(s) {
            S.begin();
            S.box('uz', { x: 10, y: 50, w: 420, h: 235, cls: 'zone user', html: 'USER SPACE' });
            S.box('kz', { x: 470, y: 50, w: 420, h: 235, cls: 'zone kern', html: 'KERNEL SPACE' });
            U.forEach(([k, t], i) => S.box('u' + k, { x: 25, y: 80 + i * 48, w: 390, h: 38, cls: 'code ' + (s.pc === k ? 'hl' : ''), html: t }));
            K.forEach(([k, t], i) => S.box('k' + k, { x: 485, y: 80 + i * 40, w: 390, h: 32, cls: 'code ' + (s.pc === k ? (k === 'kill' ? 'bad' : 'hl') : ''), html: t }));
            S.box('mb', { x: 300, y: 4, w: 300, h: 38, cls: 'big ' + (s.mode ? 'user' : 'kern'), html: `mode bit = ${s.mode} <span style="font-size:13px;font-weight:500">(${s.mode ? 'user' : 'kernel'})</span>` });
            if (s.tok) S.line('tr', { pts: [[415, 190], [485, 98]], c: 'hl', arrow: true, thick: true });
            S.end();
          }
        });
      }
    },
    {
      t: 'Memory protection with base & limit registers',
      why: [['Problem', 'Many programs share memory. One program must be stopped from reading/writing another program\'s area and the OS\'s (vector table, ISRs).'], ['Idea', 'Two registers: <b>base</b> = first legal physical address, <b>limit</b> = size of the legal range. The hardware checks <i>every</i> user-mode address: legal when base ≤ addr &lt; base + limit, otherwise trap. Loading base/limit is privileged.']],
      mount(el) {
        let S, addr = 350000, base = 300040, limit = 120900;
        function build() {
          const st = [], hi = base + limit, ok1 = addr >= base, ok2 = addr < hi;
          st.push({ ph: 0, msg: `The process (user mode) issues address <b>${addr}</b>. Legal range: [${base}, ${hi}).` });
          st.push({ ph: 1, r1: ok1, msg: `Check 1: ${addr} ≥ base (${base})? → <b class="${ok1 ? 'ok' : 'bad'}">${ok1 ? 'true' : 'sai'}</b>` });
          if (!ok1) { st.push({ ph: 3, r1: false, msg: 'False → the CPU <b>traps</b> to the OS: “addressing error”. The instruction is not executed.' }); return st; }
          st.push({ ph: 2, r1: true, r2: ok2, msg: `Check 2: ${addr} &lt; base + limit (${hi})? → <b class="${ok2 ? 'ok' : 'bad'}">${ok2 ? 'true' : 'sai'}</b>` });
          st.push(ok2 ? { ph: 4, r1: true, r2: true, msg: 'Both true → the memory access goes ahead. The check is in hardware and runs on every load/store, so it costs almost nothing.' } : { ph: 3, r1: true, r2: false, msg: 'False → <b>trap</b> to the OS. The program cannot touch another process\'s area.' });
          return st;
        }
        Player(el, {
          setup(P) {
            const a = fNum('Address:', addr, 0, 600000, v => { addr = v; P.rebuild(); }, 1000); a.inp.style.width = '100px';
            P.top.append(a, btn('Try 299000', () => { addr = 299000; a.inp.value = addr; P.rebuild(); }), btn('Try 420940', () => { addr = 420940; a.inp.value = addr; P.rebuild(); }), btn('Try 400000', () => { addr = 400000; a.inp.value = addr; P.rebuild(); }));
            S = new Stage(P.viz, 900, 250);
          },
          build, base: 1500,
          render(s) {
            S.begin(); const hi = base + limit;
            S.box('cpu', { x: 10, y: 95, w: 110, h: 60, cls: 'hw', html: '<b>CPU</b><span class="s">user mode</span>' });
            S.box('ad', { x: 130, y: 60, w: 100, h: 26, cls: 'tok', bg: 'var(--hl)', html: addr, z: 3 });
            S.box('c1', { x: 250, y: 95, w: 130, h: 60, cls: s.ph >= 1 ? (s.r1 ? 'ok' : 'bad') : '', html: `≥ base?<span class="s">base = ${base}</span>` });
            S.box('c2', { x: 430, y: 95, w: 140, h: 60, cls: s.ph >= 2 ? (s.r2 ? 'ok' : 'bad') : '', html: `&lt; base+limit?<span class="s">= ${hi}</span>` });
            S.box('mem', { x: 640, y: 10, w: 90, h: 230, cls: 'zone', html: '' });
            const y = v => 10 + 230 * v / 600000;
            S.box('os', { x: 642, y: y(0), w: 86, h: y(256000) - y(0), cls: 'kern', html: 'OS' });
            S.box('pa', { x: 642, y: y(256000), w: 86, h: y(base) - y(256000), cls: 'hw', html: 'other P' });
            S.box('me', { x: 642, y: y(base), w: 86, h: y(hi) - y(base), cls: s.ph === 4 ? 'ok' : 'user', html: 'this process' });
            S.box('pb', { x: 642, y: y(hi), w: 86, h: y(600000) - y(hi), cls: 'hw', html: 'other P' });
            S.box('lb', { x: 735, y: y(base) - 8, w: 150, h: 16, cls: 'lbl l', html: '← base ' + base });
            S.box('lh', { x: 735, y: y(hi) - 8, w: 150, h: 16, cls: 'lbl l', html: '← base+limit ' + hi });
            S.box('la', { x: 735, y: y(Math.min(600000, addr)) - 8, w: 150, h: 16, cls: 'lbl l', html: '<b style="color:var(--hl)">◀ addr ' + addr + '</b>' });
            S.line('a1', { x1: 120, y1: 125, x2: 250, y2: 125, c: 'ink', arrow: true });
            S.line('a2', { x1: 380, y1: 125, x2: 430, y2: 125, c: s.ph >= 2 ? 'ok' : 'mut', arrow: true });
            S.line('a3', { x1: 570, y1: 125, x2: 640, y2: 125, c: s.ph === 4 ? 'ok' : 'mut', arrow: true });
            if (s.ph === 3) { S.box('trap', { x: 330, y: 190, w: 200, h: 40, cls: 'bad', html: '<b>TRAP</b> → OS (addressing error)' }); S.line('t', { x1: s.r1 ? 500 : 315, y1: 155, x2: 430, y2: 190, c: 'bad', arrow: true }); }
            S.end();
          }
        });
      }
    }
  ],
  quiz: [
    { q: 'How does a device controller tell the CPU it has finished an operation?', o: ['The CPU polls a status register', 'It raises an interrupt', 'It writes into the PCB', 'It makes a system call'], a: 1, e: 'The controller raises an interrupt. The CPU uses the interrupt vector to find the ISR. An “interrupt-driven” OS needs no polling.' },
    { q: 'How many interrupts does reading one 4 KB block with DMA cause?', o: ['4096', '8', '1', '0'], a: 2, e: 'DMA copies the block straight from the controller buffer into memory and interrupts only once for the whole block.' },
    { q: 'A process running as root executes an I/O instruction directly. What happens?', o: ['It runs, because root has full power', 'The CPU traps because the process is still in user mode', 'The mode bit switches to 0 automatically', 'The OS allows it if the file belongs to root'], a: 1, e: 'Root is an account; the mode bit is hardware. Root\'s processes still run in user mode, so a privileged instruction still traps.' },
    { q: 'Which of the following does <b>not</b> need to be privileged?', o: ['Loading the base/limit registers', 'Disabling interrupts', 'Reading the system clock (read clock)', 'I/O instructions'], a: 2, e: 'Reading the clock cannot break protection. Loading base/limit, disabling interrupts and I/O must all be privileged, otherwise a user could bypass protection.' },
    { q: 'Why are incoming interrupts disabled while another interrupt is being handled?', o: ['To speed things up', 'So interrupts are not lost / saved state is not corrupted', 'Because the CPU has only one register', 'To enter user mode'], a: 1, e: 'From the lecture: “Incoming interrupts are disabled while another interrupt is being processed to prevent any loss of interrupts.”' },
    { q: 'With base = 300040, limit = 120900, which address is legal?', o: ['300039', '420940', '420939', '120900'], a: 2, e: 'Legal when base ≤ addr < base+limit = 420940. 420939 is the largest legal address; 420940 is already outside.' },
    { q: 'Which feature is NOT required to support multiprogramming according to the lecture?', o: ['Memory management', 'CPU scheduling', 'I/O device scheduling', 'A graphical user interface'], a: 3, e: 'The three required features: memory management (many jobs), CPU scheduling (choose a job), I/O device scheduling.' },
    { q: 'Which is NOT an advantage of a (tightly coupled) multiprocessor system?', o: ['Higher throughput', 'Economy of scale from shared memory and I/O', 'Higher reliability through redundancy', 'Every single-threaded process runs N times faster'], a: 3, e: 'More cores raise system throughput; they do not make a single-threaded process run faster.' }
  ]
});
