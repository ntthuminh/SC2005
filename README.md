# OS Lab – Operating Systems, Animated

Interactive, step-by-step animations of operating-system concepts, following the SC2005 lecture slides, plus a one-page formula sheet.

**Chapters:** Introduction · Processes & Threads · CPU Scheduling · Synchronization · Deadlocks · Real-Time OS · Virtualization · Memory Organization · Virtual Memory · File Systems · I/O & Disks · Formula sheet.

Every simulation (schedulers, Banker's algorithm, page replacement, disk scheduling, …) computes its results from the data you enter. Each player has play/pause, step back/forward, a scrubber and speed control (0.25×–4×).

## Project layout

```
src/          source: head.html (styles + shell), core.js (engine), algo.js (algorithms), ch*.js (chapters), main.js (routing)
build.py      concatenates src/ into a single self-contained page
public/       build output served by Vercel (index.html)
vercel.json   static deployment config (no build step needed)
```

## Build locally

```bash
python3 build.py        # writes public/index.html
open public/index.html  # or serve the folder with any static server
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. On vercel.com choose **Add New → Project**, import the repository and press **Deploy**.
   No framework or build command is needed: `vercel.json` serves the `public/` folder as is.

After editing anything in `src/`, run `python3 build.py` and commit the updated `public/index.html`.
