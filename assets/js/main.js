/* =========================================================
   Likith Srinath · Observability portfolio
   Vanilla JS canvas animations. No dependencies.
   ========================================================= */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);

  /* ---------- Year ---------- */
  $('year').textContent = new Date().getFullYear();

  /* ---------- Typewriter role ---------- */
  (() => {
    const el = $('typewriter');
    if (!el) return;
    const phrases = [
      'Observability Engineer',
      'Logs & Events @ scale',
      'ex-SRE, forever reliable',
      'signal > noise',
    ];
    if (reduced) { el.textContent = phrases[0]; return; }
    let p = 0, i = 0, deleting = false;
    const tick = () => {
      const full = phrases[p];
      el.textContent = full.slice(0, i);
      if (!deleting && i < full.length) { i++; setTimeout(tick, 55); }
      else if (!deleting && i === full.length) { deleting = true; setTimeout(tick, 1600); }
      else if (deleting && i > 0) { i--; setTimeout(tick, 28); }
      else { deleting = false; p = (p + 1) % phrases.length; setTimeout(tick, 350); }
    };
    tick();
  })();

  /* ---------- Helper: hi-dpi canvas sizing ---------- */
  const fit = (canvas) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, r.width * dpr);
    canvas.height = Math.max(1, r.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  };

  /* ---------- Background log stream ---------- */
  (() => {
    const canvas = $('log-stream');
    if (!canvas || reduced) return;
    let ctx, w, h, cols, drops;
    const LEVELS = [
      { t: 'INFO ', c: '#4ade80', p: 0.62 },
      { t: 'DEBUG', c: '#38bdf8', p: 0.2 },
      { t: 'WARN ', c: '#fbbf24', p: 0.13 },
      { t: 'ERROR', c: '#f87171', p: 0.05 },
    ];
    const SVC = ['auth', 'ingest', 'router', 'query', 'kafka', 'index', 'api-gw', 'cache'];
    const MSG = ['request handled', 'flush batch', 'ack offset', 'retry backoff',
      'gc pause', 'shard rebalance', 'span exported', 'rate limited',
      'connection reset', 'cache miss', 'schema validated', 'segment sealed'];
    const rnd = (a) => a[(Math.random() * a.length) | 0];
    const pickLevel = () => {
      let r = Math.random();
      for (const l of LEVELS) { if ((r -= l.p) <= 0) return l; }
      return LEVELS[0];
    };
    const line = () => {
      const l = pickLevel();
      const ts = new Date().toISOString().slice(11, 23);
      return { c: l.c, s: `${ts} ${l.t} [${rnd(SVC)}] ${rnd(MSG)}` };
    };
    const setup = () => {
      const d = fit(canvas); ctx = d.ctx; w = d.w; h = d.h;
      const fontH = 15, colW = 250;
      cols = Math.ceil(w / colW);
      drops = Array.from({ length: cols }, (_, i) => ({
        x: i * colW + 12,
        y: Math.random() * h,
        speed: 0.4 + Math.random() * 0.9,
        fontH,
        lines: Array.from({ length: Math.ceil(h / fontH) + 2 }, line),
      }));
    };
    setup();
    window.addEventListener('resize', setup);
    ctx.font = '13px "JetBrains Mono", monospace';
    let acc = 0;
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = '13px "JetBrains Mono", monospace';
      for (const col of drops) {
        col.y += col.speed;
        if (col.y > col.fontH) {
          col.y -= col.fontH;
          col.lines.pop();
          col.lines.unshift(line());
        }
        for (let k = 0; k < col.lines.length; k++) {
          const yy = col.y + k * col.fontH;
          if (yy < -col.fontH || yy > h + col.fontH) continue;
          const fade = 1 - Math.abs(yy - h * 0.5) / (h * 0.7);
          ctx.globalAlpha = Math.max(0.08, Math.min(0.9, fade));
          ctx.fillStyle = col.lines[k].c;
          ctx.fillText(col.lines[k].s, col.x, yy);
        }
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  })();

  /* ---------- Event pipeline visualization ---------- */
  (() => {
    const canvas = $('pipeline');
    if (!canvas || reduced) return;
    let ctx, w, h, nodeR = 13, labelFont = 11, stagger = false;
    const stages = [
      { name: 'services', color: '#4ade80' },
      { name: 'collector', color: '#38e1ff' },
      { name: 'stream', color: '#a78bfa' },
      { name: 'store', color: '#38e1ff' },
      { name: 'query', color: '#7c5cff' },
    ];
    let nodes = [], packets = [];
    const setup = () => {
      const d = fit(canvas); ctx = d.ctx; w = d.w; h = d.h;
      const pad = Math.max(26, Math.min(70, w * 0.1));
      const span = (w - pad * 2) / (stages.length - 1);
      nodeR = Math.max(7, Math.min(13, span * 0.26));
      labelFont = Math.max(8, Math.min(11, span / 5.2));
      stagger = span < 82; // tight layout: alternate labels above/below
      nodes = stages.map((s, i) => ({ ...s, x: pad + i * span, y: h / 2 }));
      packets = [];
    };
    setup();
    window.addEventListener('resize', setup);

    const spawn = () => {
      const isErr = Math.random() < 0.08;
      packets.push({
        seg: 0,
        t: 0,
        speed: 0.008 + Math.random() * 0.01,
        r: 2.5 + Math.random() * 2,
        color: isErr ? '#f87171' : (Math.random() < 0.4 ? '#a78bfa' : '#4ade80'),
        wob: Math.random() * Math.PI * 2,
      });
    };
    let spawnAcc = 0;
    const draw = (ts) => {
      ctx.clearRect(0, 0, w, h);
      // edges
      for (let i = 0; i < nodes.length - 1; i++) {
        const a = nodes[i], b = nodes[i + 1];
        const g = ctx.createLinearGradient(a.x, 0, b.x, 0);
        g.addColorStop(0, 'rgba(120,150,200,0.15)');
        g.addColorStop(1, 'rgba(120,150,200,0.15)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // packets
      spawnAcc += 1;
      if (spawnAcc > 6) { spawnAcc = 0; spawn(); if (Math.random() < 0.5) spawn(); }
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.t += p.speed;
        if (p.t >= 1) { p.t = 0; p.seg++; if (p.seg >= nodes.length - 1) { packets.splice(i, 1); continue; } }
        const a = nodes[p.seg], b = nodes[p.seg + 1];
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + Math.sin(ts * 0.002 + p.wob) * 10;
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 10;
        ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      // nodes
      nodes.forEach((n, i) => {
        const pulse = 1 + Math.sin(ts * 0.003 + n.x) * 0.12;
        ctx.beginPath();
        ctx.fillStyle = '#0a0e17';
        ctx.strokeStyle = n.color; ctx.lineWidth = 2;
        ctx.shadowColor = n.color; ctx.shadowBlur = 14;
        ctx.arc(n.x, n.y, nodeR * pulse, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(230,236,245,0.72)';
        ctx.font = `${labelFont}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        const below = !stagger || i % 2 === 0;
        const ly = below ? n.y + nodeR + labelFont + 5 : n.y - nodeR - 8;
        ctx.fillText(n.name, n.x, ly);
      });
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  })();

  /* ---------- Live metrics + sparkline ---------- */
  (() => {
    const ingest = $('m-ingest'), lat = $('m-latency'), vol = $('m-volume'), err = $('m-errors');
    const spark = $('sparkline');
    if (!ingest) return;
    const fmt = (n) => n.toLocaleString('en-US');
    let base = { ing: 84200, lat: 42, vol: 12.4, err: 0.02 };
    const jitter = (v, amt) => v + (Math.random() - 0.5) * amt;

    const history = [];
    let sctx, sw, sh;
    const setupSpark = () => { if (!spark || reduced) return; const d = fit(spark); sctx = d.ctx; sw = d.w; sh = d.h; };
    setupSpark();
    window.addEventListener('resize', setupSpark);

    const update = () => {
      base.ing = Math.max(60000, jitter(base.ing, 6000));
      base.lat = Math.max(18, jitter(base.lat, 8));
      base.vol = Math.max(8, jitter(base.vol, 0.6));
      base.err = Math.max(0, jitter(base.err, 0.02));
      ingest.textContent = fmt(Math.round(base.ing));
      lat.textContent = Math.round(base.lat);
      vol.textContent = base.vol.toFixed(1);
      err.textContent = base.err.toFixed(2);
      history.push(base.ing);
      if (history.length > 60) history.shift();
      drawSpark();
    };
    const drawSpark = () => {
      if (!sctx || reduced) return;
      sctx.clearRect(0, 0, sw, sh);
      if (history.length < 2) return;
      const min = Math.min(...history), max = Math.max(...history), range = max - min || 1;
      sctx.beginPath();
      history.forEach((v, i) => {
        const x = (i / (history.length - 1)) * sw;
        const y = sh - ((v - min) / range) * (sh * 0.8) - sh * 0.1;
        i === 0 ? sctx.moveTo(x, y) : sctx.lineTo(x, y);
      });
      sctx.strokeStyle = '#38e1ff'; sctx.lineWidth = 1.5; sctx.stroke();
      sctx.lineTo(sw, sh); sctx.lineTo(0, sh); sctx.closePath();
      const g = sctx.createLinearGradient(0, 0, 0, sh);
      g.addColorStop(0, 'rgba(56,225,255,0.25)'); g.addColorStop(1, 'rgba(56,225,255,0)');
      sctx.fillStyle = g; sctx.fill();
    };
    update();
    setInterval(update, reduced ? 3000 : 1200);
  })();

  /* ---------- Focus card mini-visuals ---------- */
  const miniCanvas = (host) => {
    const c = document.createElement('canvas');
    c.style.width = '100%'; c.style.height = '100%';
    host.appendChild(c);
    return c;
  };

  // Logs: streaming bars
  (() => {
    const host = $('viz-logs'); if (!host || reduced) return;
    const canvas = miniCanvas(host); let ctx, w, h, bars;
    const cols = ['#4ade80', '#38bdf8', '#fbbf24', '#f87171'];
    const setup = () => { const d = fit(canvas); ctx = d.ctx; w = d.w; h = d.h;
      bars = Array.from({ length: 22 }, () => ({ v: Math.random(), c: cols[(Math.random() * cols.length) | 0] })); };
    setup(); window.addEventListener('resize', setup);
    let acc = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      if (++acc > 8) { acc = 0; bars.shift(); bars.push({ v: Math.random(), c: cols[(Math.random() * cols.length) | 0] }); }
      const bw = w / bars.length;
      bars.forEach((b, i) => {
        const bh = b.v * h * 0.85 + 4;
        ctx.fillStyle = b.c; ctx.globalAlpha = 0.75;
        ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh);
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  })();

  // Events: orbiting nodes
  (() => {
    const host = $('viz-events'); if (!host || reduced) return;
    const canvas = miniCanvas(host); let ctx, w, h;
    const setup = () => { const d = fit(canvas); ctx = d.ctx; w = d.w; h = d.h; };
    setup(); window.addEventListener('resize', setup);
    const dots = Array.from({ length: 5 }, (_, i) => ({ a: i * 1.25, r: 18 + i * 6, s: 0.01 + i * 0.004 }));
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      ctx.strokeStyle = 'rgba(167,139,250,0.15)';
      dots.forEach((d) => { ctx.beginPath(); ctx.arc(cx, cy, d.r, 0, Math.PI * 2); ctx.stroke(); });
      ctx.fillStyle = '#a78bfa'; ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
      dots.forEach((d) => {
        d.a += d.s;
        const x = cx + Math.cos(d.a) * d.r, y = cy + Math.sin(d.a) * d.r;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      });
      ctx.shadowBlur = 0;
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  })();

  // Reliability: SLO gauge line
  (() => {
    const host = $('viz-rel'); if (!host || reduced) return;
    const canvas = miniCanvas(host); let ctx, w, h;
    const setup = () => { const d = fit(canvas); ctx = d.ctx; w = d.w; h = d.h; };
    setup(); window.addEventListener('resize', setup);
    const pts = Array.from({ length: 40 }, () => 0.5);
    let acc = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      if (++acc > 4) { acc = 0; pts.shift(); pts.push(Math.max(0.1, Math.min(0.9, pts[pts.length - 1] + (Math.random() - 0.5) * 0.3))); }
      // SLO threshold line
      ctx.strokeStyle = 'rgba(248,113,113,0.4)'; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, h * 0.25); ctx.lineTo(w, h * 0.25); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      pts.forEach((p, i) => { const x = (i / (pts.length - 1)) * w, y = h - p * h; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.strokeStyle = '#38e1ff'; ctx.lineWidth = 2; ctx.stroke();
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  })();

  /* ---------- Stack grid ---------- */
  (() => {
    const grid = $('stack-grid'); if (!grid) return;
    const stack = [
      ['Kafka', '#a78bfa'], ['FluentBit', '#fb923c'], ['Azure Data Explorer', '#38bdf8'],
      ['Kusto / KQL', '#38e1ff'], ['Azure Blob', '#7c5cff'], ['Terraform', '#a78bfa'],
      ['Spark', '#fb923c'], ['Kubernetes', '#38bdf8'], ['Go', '#38e1ff'],
      ['Python', '#4ade80'], ['C', '#94a3b8'], ['MySQL', '#fbbf24'],
      ['GitHub Actions', '#e6ecf5'], ['Event Grid', '#7c5cff'], ['LLMs / Claude', '#4ade80'], ['MELT', '#f87171'],
    ];
    grid.innerHTML = stack.map(([n, c]) =>
      `<div class="stack-item"><span class="sdot" style="background:${c};box-shadow:0 0 8px ${c}"></span>${n}</div>`
    ).join('');
  })();

  /* ---------- Work grid (curated across repos/orgs) ---------- */
  (() => {
    const grid = $('work-grid'); if (!grid) return;
    const langColor = (l) => ({
      TypeScript: '#38bdf8', JavaScript: '#fbbf24', Python: '#4ade80',
      Go: '#38e1ff', Java: '#f87171', 'C++': '#a78bfa', HTML: '#fb923c',
      C: '#94a3b8', EJS: '#a91e50', Kotlin: '#a97bff',
    }[l] || '#8a97ad');
    const card = (r) => `
      <a class="work-card" href="${r.html_url}" target="_blank" rel="noopener">
        <div class="work-top">
          <span class="work-name">${r.name}</span>
          ${r.owner ? `<span class="work-owner">${r.owner}</span>` : ''}
        </div>
        <p class="work-desc">${r.description}</p>
        <div class="work-lang"><span class="sdot" style="width:9px;height:9px;border-radius:50%;background:${langColor(r.language)}"></span>${r.language || 'code'}</div>
      </a>`;

    const curated = [
      { name: 'pdf-tools', owner: 'likithsrinath2000', html_url: 'https://github.com/likithsrinath2000/pdf-tools', language: 'TypeScript',
        description: 'Production-ready web app with 30+ PDF and image tools. Built with React, Express and PostgreSQL.' },
      { name: 'Metro-Project', owner: 'likithsrinath2000', html_url: 'https://github.com/likithsrinath2000/Metro-Project', language: 'HTML',
        description: 'Automatic metro ticketing system using facial recognition. Node.js, Express, EJS and MySQL.' },
      { name: 'Bedsore-FE', owner: 'the-Doers', html_url: 'https://github.com/the-Doers/Bedsore-FE', language: 'EJS',
        description: 'Frontend for a bedsore (pressure-ulcer) detection and monitoring system.' },
      { name: 'Stress_Detection', owner: 'ODU-Internship', html_url: 'https://github.com/ODU-Internship/Stress_Detection', language: 'Python',
        description: 'Machine-learning stress detection from physiological signals (ODU research internship).' },
      { name: 'Sentiment_Analysis', owner: 'ODU-Internship', html_url: 'https://github.com/ODU-Internship/Sentiment_Analysis', language: 'Python',
        description: 'NLP sentiment-analysis models and pipeline built during the ODU research internship.' },
      { name: 'Fall', owner: 'ODU-Internship', html_url: 'https://github.com/ODU-Internship/Fall', language: 'Kotlin',
        description: 'Fall-detection Android app for elderly-care research (ODU internship).' },
    ];
    grid.innerHTML = curated.map(card).join('');
  })();

  /* ---------- Scroll reveal ---------- */
  (() => {
    const targets = document.querySelectorAll('.section, .card, .work-card, .about-grid');
    if (reduced || !('IntersectionObserver' in window)) { targets.forEach((t) => t.classList.add('in')); return; }
    targets.forEach((t) => t.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
  })();
})();

/* =========================================================
   Experience · career log explorer
   ========================================================= */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const rows = $('log-rows');
  if (!rows) return;

  const CAREER = [
    { ts: 'Oct 2025 → now', dur: '9 mos', level: 'ACTIVE', company: 'LinkedIn', role: 'Senior Software Engineer, Observability',
      tags: ['linkedin', 'fulltime', 'current', 'observability'],
      msg: 'Logs & Events (MELT), 5PB+/day, 15.3M events/day',
      details: [
        'Scale & ingestion: own telemetry pipelines processing 5PB+ of data daily; built a resilient Change Events pipeline ingesting 15.3M events/day into Azure Data Explorer with under 10s lag',
        'Cost & cloud: delivered $550K/yr in confirmed savings via Azure Storage Actions, batching policy changes, log hygiene, structured logging and stopping dual writes; cut multi-PB trace storage 30% with Terraform',
        'High-performance: built a Go-native direct-to-Kafka log shipping library from scratch, cutting shipping overhead 88% via async enrichment at under 200ns/op across 157 Go services',
        'AI-driven observability: built custom Claude skills and plugins to automate log hygiene and debugging; shipped an end-to-end log-table snapshotting platform for internal AI eval pipelines',
        'Reliability & migrations: enabled a zero-downtime cutover of 800 Kafka topics to a next-gen messaging fabric; resolved a major SEV across 4000 production hosts and eliminated 10% data loss on critical tables',
        'Leadership: mentored interns and junior engineers; authored 500+ PRs in FY26; recognized globally as Champion Interviewer and Feedback Ninja' ] },
    { ts: 'Jun 2023 → Oct 2025', dur: '2 yrs 4 mos', level: 'INFO', company: 'LinkedIn', role: 'Software Engineer, Observability',
      tags: ['linkedin', 'fulltime', 'observability'],
      msg: 'Centralized logging platform & events store',
      details: [
        'Centralized logging: owned operational health of the centralized logging platform and events store; improved data handling, accessibility and reliability across stakeholders',
        'Log enrichment: built a custom Fluent Bit plugin on Kubernetes to enrich logs and ship change events across the cluster',
        'Cloud infrastructure: designed robust processing pipelines on Azure Data Explorer, Azure Blob Storage and Azure Event Grid',
        'Developer productivity: automated onboarding setup and wrote clear docs, significantly reducing onboarding effort and mentoring new hires' ] },
    { ts: 'Aug 2022 → Jun 2023', dur: '10 mos', level: 'INFO', company: 'LinkedIn', role: 'Site Reliability Engineer, Observability',
      tags: ['linkedin', 'fulltime', 'observability'],
      msg: 'Reliability for Events store & GCNS; Python 3.10 migration',
      details: [
        'Infrastructure reliability: guaranteed production availability for the Events store and GCNS notification systems; ran incident response and proactive maintenance',
        'Performance: spearheaded migration of core applications to Python 3.10 and deprecated legacy code, significantly reducing load and response times',
        'Tooling & analytics: built a Vendor Recommendation dashboard in PowerBI and shipped fixes to the reliability dashboard' ] },
    { ts: 'Jan 2022 → Jun 2022', dur: '5 mos', level: 'INFO', company: 'Johnson Controls', role: 'ERP Consultant',
      tags: ['fulltime'],
      msg: 'ERP data migration to Oracle Fusion',
      details: [
        'Data migration: built pipelines with Informatica Intelligent Cloud Services and Azure Data Factory to migrate enterprise data into Oracle Fusion',
        'Collaboration: partnered with the Infosys team to validate data mappings and ensure timely, well-documented delivery',
        'Knowledge sharing: ran training sessions to drive adoption of newly introduced tooling' ] },
    { ts: 'Sep 2021 → Mar 2022', dur: '6 mos', level: 'DEBUG', company: 'Vaave', role: 'Product Development Intern',
      tags: ['internship'],
      msg: 'Full-stack product development & PDF reporting',
      details: [
        'Full-stack: built an internal success-tracker application and supported hosted apps with new functional requirements',
        'Feature engineering: engineered dynamic reporting that auto-generates and exports complex business reports as PDF documents' ] },
  ];

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const rowHtml = (e, i) => `
    <div class="log-row" data-i="${i}" data-tags="${e.tags.join(' ')}">
      <span class="lr-ts">${e.ts}</span>
      <span class="lr-lvl lvl-${e.level}">${e.level}</span>
      <span class="lr-svc">${esc(e.company)}</span>
      <span class="lr-msg"><span class="lr-caret">▸</span><span class="role">${esc(e.role)}</span> · ${esc(e.msg)}<span class="lr-dur">${e.dur}</span></span>
      <div class="lr-details">${e.details.length ? `<ul>${e.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : '<ul><li>n/a</li></ul>'}</div>
    </div>`;

  rows.innerHTML = CAREER.map(rowHtml).join('');

  // expand/collapse
  rows.querySelectorAll('.log-row').forEach((r) => {
    r.addEventListener('click', () => r.classList.toggle('open'));
  });

  // filters
  const filters = $('filters');
  const kqlFilter = $('kql-filter');
  const stats = $('query-stats');
  const FILTER_KQL = {
    all: '',
    current: '\n| where tags has "current"',
    observability: '\n| where domain == "observability"',
    linkedin: '\n| where company == "LinkedIn"',
    fulltime: '\n| where tags has "fulltime"',
    internship: '\n| where tags has "internship"',
  };
  const applyFilter = (f) => {
    let shown = 0;
    rows.querySelectorAll('.log-row').forEach((r) => {
      const match = f === 'all' || r.dataset.tags.split(' ').includes(f);
      r.style.display = match ? '' : 'none';
      if (match) shown++;
    });
    kqlFilter.textContent = FILTER_KQL[f] || '';
    stats.innerHTML = `<span class="qs-hi">${shown}</span> role${shown === 1 ? '' : 's'} returned · 3 yrs 11 mos total · scanned ${CAREER.length} records in <span class="qs-hi">${(3 + Math.random() * 4).toFixed(1)}ms</span>`;
  };
  filters.querySelectorAll('.filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.querySelectorAll('.filter').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilter(btn.dataset.f);
    });
  });
  applyFilter('all');

  // tenure histogram: one bar per role, height = time spent in that role
  const histo = $('histo');
  if (histo) {
    const parseMonths = (d) => {
      let m = 0;
      const y = d.match(/(\d+)\s*yr/); if (y) m += parseInt(y[1], 10) * 12;
      const mo = d.match(/(\d+)\s*mo/); if (mo) m += parseInt(mo[1], 10);
      return m || 1;
    };
    const barColor = (e) => {
      if (e.level === 'ACTIVE') return '#38e1ff';           // current role
      if (e.tags.includes('observability')) return '#4ade80'; // o11y tenure
      if (e.tags.includes('internship')) return '#5f6b80';    // internships
      return '#a78bfa';                                        // other full-time
    };
    const chrono = [...CAREER].reverse(); // oldest -> newest (left -> right)
    const maxM = Math.max(...chrono.map((e) => parseMonths(e.dur)));
    histo.innerHTML = chrono.map((e) => {
      const m = parseMonths(e.dur);
      const h = Math.max(8, (m / maxM) * 100);
      const c = barColor(e);
      return `<div class="histo-bar" style="height:${h}%;background:linear-gradient(180deg, ${c}, ${c}22)" title="${e.company} · ${e.role} · ${e.dur}"></div>`;
    }).join('');
  }
})();

/* =========================================================
   Impact stats: count-up on scroll
   ========================================================= */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wrap = document.getElementById('impact');
  if (!wrap) return;

  const fmt = (v, dec, prefix, suffix) =>
    `${prefix}${dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')}${suffix}`;

  const run = (el) => {
    const target = parseFloat(el.dataset.target);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const out = el.querySelector('.stat-val');
    if (reduced) { out.textContent = fmt(target, dec, prefix, suffix); return; }
    const dur = 1400, t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      out.textContent = fmt(target * ease(p), dec, prefix, suffix);
      if (p < 1) requestAnimationFrame(step);
      else out.textContent = fmt(target, dec, prefix, suffix);
    };
    requestAnimationFrame(step);
  };

  const stats = [...wrap.querySelectorAll('.stat')];
  if (reduced || !('IntersectionObserver' in window)) { stats.forEach(run); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.4 });
  stats.forEach((s) => io.observe(s));
})();
