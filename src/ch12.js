// ================= CHAPTER 12: FORMULA SHEET =================
(() => {
  const F = lines => `<div class="formula fs-f">${lines.join('<br>')}</div>`;
  const T = (head, rows) => `<div class="fs-tw"><table class="t fs-t"><tr>${head.map(x => `<th>${x}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</table></div>`;
  const P = html => `<p class="fs-p">${html}</p>`;
  const H = t => `<h3 class="fs-h">${t}</h3>`;
  const SEE = (n, label) => `<a class="fs-see" href="#c${n}">↗ Animated in Chapter ${n}: ${label}</a>`;
  const sec = (t, why, html, exam) => ({ t, why, exam, mount(el) { el.innerHTML = html; } });

  chapter({
    t: 'Formula sheet', short: 'Formula sheet',
    lead: 'Every formula, rule of thumb and worked value from the slides and tutorials on one page. Each block links back to the chapter where the mechanism is animated, so you can jump from “what to compute” to “why it works”.',
    sections: [
      sec('Quick maths & units', [['How to use', 'Memory sizes are powers of 2; times are powers of 10. Most exam arithmetic is just splitting bits and counting entries.']],
        T(['Power', 'Value', 'Power', 'Value'], [['2^9', '512', '2^20', '1 M'], ['2^10', '1 K (1024)', '2^22', '4 M'], ['2^11', '2 K', '2^29', '512 M'], ['2^12', '4 K', '2^30', '1 G'], ['2^16', '64 K', '2^32', '4 G']]) +
        F(['bits needed to number N items = log₂ N', 'number of units = size of region / size of one unit', '1 s = 10³ ms = 10⁶ µs = 10⁹ ns']) +
        P('Memory uses powers of 2 (1 KB = 1024 B). Exception: Tutorial 11 uses 1000 B blocks, so compute with exactly 1000.')),

      sec('CPU scheduling', [['Per process', 'Turnaround, waiting and response time; averages are over all processes.'], ['System', 'CPU utilization counts every core.']],
        F(['Turnaround = Finish − Arrival', 'Waiting    = Turnaround − Σ CPU bursts − Σ I/O bursts − event wait', '           = total time spent in the ready queue', 'Response   = first time Running − Arrival', 'Average X  = (1/n) · Σ Xᵢ']) +
        F(['CPU utilization = Σ execution time on every core / (total time × number of cores)', 'RR: maximum wait before the next turn = (n − 1) · q']) +
        H('CPU efficiency under RR (Tutorial 3 Q4)') +
        P('A process runs T then blocks for I/O; each switch costs S (the first switch counts).') +
        F(['efficiency = T / (T + S × #switches)']) +
        T(['Quantum Q', '#switches', 'Efficiency'], [['Q = ∞', '1', 'T / (T + S)'], ['Q > T', '1', 'T / (T + S)'], ['S < Q < T', '⌈T/Q⌉', 'T / (T + S·⌈T/Q⌉)'], ['Q = S', '⌈T/S⌉', 'T / (T + S·⌈T/S⌉) ≈ 1/2'], ['Q → 0', '→ ∞', '→ 0']]) +
        H('Results to remember') +
        T(['Problem', 'Result'], [['FCFS, bursts 24, 3, 3', 'avg waiting = (0 + 24 + 27)/3 = <b>17</b>; order 3, 3, 24 → (6 + 0 + 3)/3 = <b>3</b>'], ['(arrival, burst) = (0,7) (2,4) (4,1) (5,4)', 'SJF = (0 + 6 + 3 + 7)/4 = <b>4</b> · SRTF = (9 + 1 + 0 + 2)/4 = <b>3</b> · SRTF dual-core = (1 + 0 + 0 + 1)/4 = <b>0.5</b>'], ['Tutorial 3 Q2, RR q = 2', 'TAT 19, 3, 8, 3, 13 · waiting 7, 2, 5, 2, 6'], ['Tutorial 3 Q2, global SRTF on 2 cores', 'TAT 13, 1, 4, 1, 7 · waiting 1, 0, 0, 0, 0']]) +
        SEE(3, 'scheduling simulator'),
        'SRTF preempts only when the newcomer’s remaining time is <b>strictly smaller</b>; on a tie the earlier arrival wins. Waiting time never includes I/O time.'),

      sec('Real-time scheduling', [['Specification', 'One-shot ⟨R, C, D⟩ and periodic ⟨T, C, D⟩ processes.'], ['Check', 'Compute U first, then draw the schedule over one hyperperiod.']],
        F(['⟨R, C, D⟩ : needs C units of CPU within [R, R + D)', '⟨T, C, D⟩ : instance k released at kT, absolute deadline = kT + D', 'U = Σ Cᵢ / Tᵢ          U > 1 ⇒ no algorithm can meet every deadline', 'EDF with D = T : schedulable ⇔ U ≤ 1', 'Hyperperiod = lcm(T₁, T₂, …)   (one hyperperiod is enough to check)']) +
        P('RM: fixed priority, <b>shorter T = higher priority</b>. The slides give no utilization test for RM, so draw the schedule; U ≤ 1 does not guarantee RM succeeds. EDF: dynamic priority by the nearest <b>absolute deadline</b>.') +
        T(['Problem', 'U', 'Result'], [['Tutorial 7 Q3: ⟨5,2,5⟩, ⟨10,3,10⟩, ⟨20,5,20⟩', '0.4 + 0.3 + 0.25 = <b>0.95</b>', 'EDF schedulable; 4 valid EDF schedules because of 3 deadline ties'], ['⟨5,2,5⟩, ⟨7,4,7⟩', '0.4 + 0.571 = <b>0.971</b>', 'RM: P2 misses at t = 7 · EDF: all deadlines met (hyperperiod 35)'], ['Slide: P1⟨10,6,10⟩, P2⟨19,4,19⟩, P3⟨20,2,14⟩', '–', 'RM: P3 misses at t = 14']]) +
        SEE(6, 'RM vs EDF'),
        'EDF compares the absolute deadline kT + D of each instance, not the parameter D.'),

      sec('Synchronization & deadlock', [['Semaphores', 'Track the value to know how many processes wait.'], ['Banker', 'Need, safety, then resource-request in four steps.']],
        F(['Wait(S)  : S.v ← S.v − 1; if S.v < 0, block in S.L', 'Signal(S): S.v ← S.v + 1; if S.v ≤ 0, wake one process from S.L', 'S.v < 0 ⇒ |S.v| = number of waiting processes', 'S.v now = S.v initial + #Signal − #Wait']) +
        T(['Purpose', 'Initial value'], [['Mutex (critical section)', '1'], ['Force A before B', '0 (A; Signal → Wait; B)'], ['Wait for k events (S3 after S1 and S2)', '0, the waiter calls Wait k times'], ['Bounded buffer of n slots', 'mutex = 1, empty = n, full = 0'], ['Dining philosophers', 'chopstick[i] = 1']]) +
        P('Race condition: <code>counter++</code> and <code>counter--</code> run concurrently on counter = 5 → result can be <b>4, 5 or 6</b>.') +
        F(['Needᵢ     = Maxᵢ − Allocationᵢ', 'Available = Total − Σ Allocationᵢ', 'Safety    : Work = Available; find unfinished i with Needᵢ ≤ Work', '            ⇒ Work ← Work + Allocationᵢ; repeat until all finish', 'Requestᵢ  : (1) Req ≤ Needᵢ (else error)   (2) Req ≤ Available (else wait)', '            (3) Available −= Req, Allocationᵢ += Req, Needᵢ −= Req', '            (4) run Safety: safe → grant; unsafe → roll back and wait']) +
        T(['Problem', 'Result'], [['Tutorial 6 Q2 (Available = 2)', 'P4 requests 1 → Available 1, every Need ≥ 2 → <b>unsafe</b> · P3 requests 1 → <b>safe</b>, ⟨P3, P2, P1, P4⟩'], ['Tutorial 6 Q3 (Available = (0, x, y, 1))', '<b>x = 2, y = 2</b>, safe sequence ⟨P1, P2, P3, P0, P4⟩'], ['Slide T0 (Available 3 3 2), P1 requests (1,0,2)', 'granted, ⟨P1, P3, P4, P0, P2⟩']]) +
        SEE(4, 'semaphores') + ' ' + SEE(5, 'Banker'),
        'Several safe sequences can all be correct. Unsafe only means deadlock is <i>possible</i>.'),

      sec('Memory: paging, page tables, TLB', [['Notation', 'Logical address m bits, page 2ⁿ bytes, RAM 2ʳ bytes, page-table entry e bytes, µ = memory access, ε = TLB lookup, α = TLB hit ratio, k = page-table levels.']],
        F(['Base/limit (absolute)     : base ≤ addr < base + limit', 'Execution-time binding    : addr < limit, physical = base + addr', 'Segmentation ⟨s, d⟩       : s < STLR and d < limit[s] ⇒ physical = base[s] + d (else trap)']) +
        F(['d = low n bits, p = high (m − n) bits', 'p = ⌊addr / 2ⁿ⌋, d = addr mod 2ⁿ', 'physical = f · 2ⁿ + d   (f = PageTable[p]),   f has r − n bits', '#entries (page table)          = 2^(m−n),   size = 2^(m−n) × e', '#entries (inverted page table) = #frames = 2^(r−n)']) +
        H('Two-level page table (each table fits one page)') +
        F(['entries per page = 2ⁿ / e  ⇒  p₂ = n − log₂ e', 'p₁ = (m − n) − p₂,   outer entries = 2^p₁ = 2^(m−n) × e / 2ⁿ', 'Tutorial 9 Q2 (p = x, d = y, e = 4): format (x − y + 2) | (y − 2) | y']) +
        H('Access time') +
        F(['no TLB = (k + 1) · µ          (one level: 2µ)', 'EAT = α (ε + µ) + (1 − α) (ε + (k + 1) µ)', 'one level: EAT = (µ + ε) α + (2µ + ε)(1 − α) = (2 − α) µ + ε']) +
        T(['Problem', 'Result'], [['Slide: 32-bit, 4 KB pages', 'p = 20 | d = 12 · table 2²⁰ × 4 B = 4 MB · two-level 10 | 10 | 12 · outer 2¹⁰ entries = 4 KB'], ['Slide: µ = 100, ε = 20, α = 0.8', 'EAT = 1.2 × 100 + 20 = <b>140 ns</b>'], ['Tutorial 8 Q2: µ = 200, TLB 75%, ε = 0', 'no TLB 400 ns · EAT = 0.75 × 200 + 0.25 × 400 = <b>250 ns</b>'], ['Tutorial 8 Q3: 32-bit, 1 KB pages, 1 GB RAM', 'p 22 | d 10 · f 20 | d 10 · 2²² entries · inverted 2²⁰'], ['32-bit, 2 KB pages, 512 MB RAM, e = 4 B', '21 | 11 · f 18 · 8 MB · two-level 12 | 9 | 11 · µ 100, ε 10, α 0.9 → <b>130 ns</b>']]) +
        P('<b>Contiguous allocation</b> (Tutorial 8 Q1, 4800-word memory): place each process at the start of a hole; leftover = hole − request. Best-fit must move 2050 words, first-fit 1200 words.') +
        SEE(8, 'memory organization'),
        'Segmentation needs d strictly less than the limit: d = limit traps. Paging removes external fragmentation but keeps internal fragmentation in the last page.'),

      sec('Virtual memory', [['Cost of a fault', 'Page-fault time is in milliseconds while a memory access is in nanoseconds, so p must be tiny.']],
        F(['EAT = (1 − p) × memory access + p × page-fault time', 'slowdown below x  ⇔  p < x · memory access / (page-fault time − memory access)', 'WSSᵢ = number of distinct pages in the last Δ references', 'D = Σ WSSᵢ,   D > m (frames) ⇒ thrashing ⇒ suspend a process']) +
        P('Slide: 200 ns access, 8 ms fault, p = 1/1000 → EAT ≈ 8.2 µs (40× slower). For less than 10% slowdown, p < 1/400 000.') +
        H('Counting page faults') +
        `<ul class="fs-ul"><li>With empty frames at the start, #faults ≥ number of distinct pages in the string.</li><li>Working set (Tutorial 10 Q2): a reference at time t faults if its page is not among the Δ references just before t.</li><li>Clock in the tutorials: a newly loaded page has R = 0; a hit sets R = 1.</li></ul>` +
        T(['Reference string', 'Frames', 'FIFO', 'OPT', 'LRU', 'Clock'], [['Slide: 1 2 3 4 1 2 5 1 2 3 4 5', '3', '9', '–', '–', '–'], ['Same string (Belady)', '4', '10', '6', '8', '8'], ['Tutorial 9 Q3: 0 1 6 0 3 4 0 1 0 3 4 6 3 4', '4', '10', '–', '7', '7'], ['2 3 2 1 5 2 4 5 3 2 5 2', '3', '9', '6', '7', '6'], ['Tutorial 10 Q2: 4 0 0 0 2 4 2 1 0 3 2', '4', '–', '–', '4', 'WS (Δ = 4): 7']]) +
        SEE(9, 'page replacement'),
        'Only FIFO suffers Belady’s anomaly. When thrashing, lower the degree of multiprogramming; never raise it.'),

      sec('File systems', [['Notation', 'B = block size, P = pointer size, n = B / P (pointers per block), LA = logical address (byte offset).']],
        F(['Contiguous: LA = B·Q + R        ⇒ block = start + Q, offset R', 'Linked    : LA = (B − P)·Q + R  ⇒ the (Q + 1)-th block in the chain, offset R + P', 'Indexed   : LA = B·Q + R        ⇒ index[Q], offset R', 'Bytes a … b lie in blocks ⌊a/B⌋ … ⌊b/B⌋']) +
        P('Reads to fetch block Q: contiguous 1 · linked Q + 1 · indexed 2 (index block + data).') +
        F(['#index blocks = (max file / B) × P / B        (128 KB, 512 B, 4 B ⇒ 256 × 4 / 512 = 2)']) +
        H('inode (D direct, 1 single, 1 double, 1 triple indirect)') +
        F(['Max file = (D + n + n² + n³) × B', 'L = ⌊LA / B⌋ :  L < D ⇒ direct', '              D ≤ L < D + n ⇒ single, entry L − D', '              D + n ≤ L < D + n + n² ⇒ double, entries ⌊(L − D − n)/n⌋ and (L − D − n) mod n']) +
        P('Disk reads for one data block (inode already in memory): direct 1 · single 2 · double 3 · triple 4. <code>seek</code> reads nothing.') +
        F(['open("/a/b/file") reads = 2 × (directories on the path, excluding root) + 1', 'bit map (bits) = disk size / B        2³⁴ / 2⁹ = 2²⁵ bits = 4 MB']) +
        T(['Problem', 'Result'], [['Slide: LA = 2333, B = 512', 'contiguous (start 19) → block 23, byte 285 · linked → 5th block (25), offset 305 · indexed → index[4], byte 285'], ['Slide: B = 4 KB, P = 4 B, 12 direct', '48 KB + 4 MB + 4 GB + 4 TB'], ['Tutorial 11 Q2: 6 direct + single, B = 1000', 'open /usr/ast/mbox = <b>5</b> · read 200 B at 5900 = <b>3</b> · 2 B entries → (6 + 500) × 1000 = <b>506 000 B</b>'], ['Tutorial 11 Q3: read 200 B from byte 1900', 'contiguous 2 · linked 3 · indexed 3'], ['10 direct + single + double, B = 2 KB, P = 4 B', '(10 + 512 + 512²) × 2048 = <b>537 939 968 B</b>']]) +
        SEE(10, 'file systems'),
        'Linked allocation stores the pointer at the start of each block, so the offset is R + P, not R.'),

      sec('Disks & RAID', [['Timing', 'Positioning (seek + rotational latency) dominates; transfer is tiny for a few sectors.'], ['Scheduling', 'Seek time ≈ seek distance, so compare total head movement.']],
        F(['T = (T_seek + T_rotational latency) + T_transfer', 'T_rotational latency = ½ × time of one rotation', 'T_transfer(N) = N / (sectors per track) × time of one rotation', 'reading a whole track = positioning + one rotation']) +
        P('Slide (seek 10 ms, rotation 8 ms, 1024 sectors/track, 512 B sectors): 4 KB = 8 sectors → 14 + 0.0625 ≈ <b>14 ms</b> · 128 KB = 256 sectors → 14 + 2 = <b>16 ms</b> · 1 MB sequential = 2 tracks × 22 ms = <b>44 ms</b>.') +
        H('Total seek distance') +
        P('Disk 0 … Max, head at h moving <b>up</b>, lowest request a, highest request b, highest request below h is c (requests on both sides). Moving down is symmetric, e.g. SCAN = h + b, LOOK = (h − a) + (b − a).') +
        F(['FCFS, SSTF = Σ |cᵢ − cᵢ₋₁| in service order', 'SCAN   = (Max − h) + (Max − a)', 'LOOK   = (b − h) + (b − a)', 'C-SCAN = (Max − h) + Max + c        (the jump back to 0 counts)', 'C-LOOK = (b − h) + (b − a) + (c − a)']) +
        T(['Problem', 'FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'], [['Slide: h = 53, queue 98 183 37 122 14 124 65 67', '640', '236', '236 (down)', '382 (up)', '208 (down)', '322 (up)'], ['h = 100 moving up, queue 23 89 132 42 187 150 9 110', '700', '307', '289', '387', '–', '345']]) +
        P('<b>Tutorial 12 Q4</b> (seek = 20 + 0.1 × cylinders, latency 2 ms, transfer 8 ms): service time = 30 + 0.1 × distance. SSTF picks only among requests that have arrived → total 322.4 ms, average <b>32.24 ms</b>.') +
        H('RAID / volume capacity (n disks of size N)') +
        F(['M_striping (RAID 0) = N · n      M_mirroring (RAID 1) = N  (n = 2)      M_parity = N · (n − 1), n ≥ 3', 'Striping: block i lives on disk (i mod n) + 1']) +
        SEE(11, 'disk scheduling'),
        'C-SCAN and C-LOOK still count the distance of the return jump.')
    ]
  });
})();
