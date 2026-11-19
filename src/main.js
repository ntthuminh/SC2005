// ================= SHELL: navigation, routing, settings =================
(function boot() {
  const nav = document.getElementById('nav'), main = document.getElementById('main');
  const built = {}; let cur = -1;
  CHAPTERS.forEach((c, i) => nav.append(h('a', { href: '#c' + (i + 1), 'data-i': i }, h('span', { class: 'n' }, String(i + 1).padStart(2, '0')), h('span', null, c.short || c.t))));
  function buildChapter(i) {
    const c = CHAPTERS[i]; const wrap = h('div', { class: 'chap' });
    wrap.append(h('div', { class: 'ch-num' }, `CHAPTER ${i + 1} / ${CHAPTERS.length}`), h('h1', null, c.t), h('p', { class: 'ch-lead', html: c.lead }));
    if (i === 0) wrap.append(h('div', { class: 'intro-box', html: '<div><b>How to study.</b> Every section has a short “why” box (the problem that led people to invent this mechanism) and an animation that runs exactly what the OS does.</div><div><b>Controls.</b> ▶ play/pause, ◀ ▶| step back/forward, drag the bar to jump to any step, pick a speed from 0.25× to 4×. Click inside a frame, then use Space and ← →.</div><div><b>Experiment.</b> Most simulations let you edit the data (processes, reference strings, disk queues, Banker matrices…). Results are <i>actually computed</i>, not pre-drawn.</div><div><b>Exam prep.</b> “Exam trap” boxes flag the points most often asked as trick questions; every chapter ends with a multiple-choice quiz with explanations.</div>' }));
    const toc = h('nav', { class: 'toc', 'aria-label': 'Sections in this chapter' }); wrap.append(toc);
    c.sections.forEach((s, k) => { const id = `c${i + 1}-s${k + 1}`; toc.append(h('a', { href: '#' + id, onclick: e => { e.preventDefault(); document.getElementById(id).scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); } }, `${i + 1}.${k + 1} ${s.t.split(':')[0]}`)); card(wrap, { ...s, id, n: `${i + 1}.${k + 1}` }); });
    if (c.quiz) { const q = h('section', { class: 'card', id: `c${i + 1}-quiz` }); q.append(h('h2', null, h('span', { class: 'sn' }, `${i + 1}.Q`), 'Review quiz')); quizBlock(q, c.quiz); wrap.append(q); toc.append(h('a', { href: `#c${i + 1}-quiz`, onclick: e => { e.preventDefault(); q.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); } }, '✎ Review quiz')); }
    if (i < CHAPTERS.length - 1) wrap.append(h('a', { class: 'btn pri', href: '#c' + (i + 2), style: 'text-decoration:none;display:inline-block' }, `Next chapter: ${CHAPTERS[i + 1].t} →`));
    return wrap;
  }
  function show(i) {
    if (i === cur) return; PLAYERS.forEach(p => p.stop());
    main.querySelectorAll('.chap').forEach(x => x.style.display = 'none');
    if (!built[i]) { built[i] = buildChapter(i); main.append(built[i]); }
    built[i].style.display = ''; cur = i;
    nav.querySelectorAll('a').forEach(a => a.classList.toggle('on', +a.dataset.i === i));
    document.getElementById('mtitle').textContent = `${i + 1}. ${CHAPTERS[i].short || CHAPTERS[i].t}`;
    window.scrollTo(0, 0);
    built[i].querySelectorAll('.player').forEach(() => {});
    requestAnimationFrame(() => PLAYERS.forEach(p => { if (built[i].contains(p.root)) p.show(); }));
    document.getElementById('side').classList.remove('open');
  }
  function route() { const m = /^#c(\d+)$/.exec(location.hash); const i = m ? Math.min(CHAPTERS.length, Math.max(1, +m[1])) - 1 : (cur < 0 ? 0 : cur); show(i); }
  window.addEventListener('hashchange', route); route();
  const gs = document.getElementById('gspeed'); SPEEDS.forEach(s => gs.append(h('option', { value: s }, s + '×'))); gs.value = GSPEED;
  gs.onchange = e => { GSPEED = +e.target.value; PLAYERS.forEach(p => p.setSpeed(GSPEED)); };
  const th = document.getElementById('theme');
  try { const t = localStorage.getItem('oslab-theme'); if (t) { th.value = t; document.documentElement.setAttribute('data-theme', t); } } catch (e) {}
  th.onchange = e => { const v = e.target.value; if (v) document.documentElement.setAttribute('data-theme', v); else document.documentElement.removeAttribute('data-theme'); try { localStorage.setItem('oslab-theme', v); } catch (err) {} };
  document.getElementById('menuBtn').onclick = () => document.getElementById('side').classList.toggle('open');
})();
