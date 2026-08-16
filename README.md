<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="InnerLoop — AI-Powered Student Productivity & Personal Growth Platform. Built by Kunal Choudhary." />
  <title>InnerLoop — AI-Powered Student Productivity Platform</title>
  <style>
    /* ============ RESET & TOKENS ============ */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #0a0e17;
      --bg-soft: #0f1522;
      --surface: rgba(255, 255, 255, 0.04);
      --surface-strong: rgba(255, 255, 255, 0.07);
      --border: rgba(255, 255, 255, 0.09);
      --border-strong: rgba(255, 255, 255, 0.16);
      --text: #e8ecf4;
      --text-muted: #9aa5b8;
      --text-faint: #6b7689;
      --accent: #6c8cff;
      --accent-2: #9d6cff;
      --accent-3: #4fd1c5;
      --gradient: linear-gradient(135deg, #6c8cff 0%, #9d6cff 55%, #c86cff 100%);
      --gradient-soft: linear-gradient(135deg, rgba(108,140,255,0.14), rgba(157,108,255,0.10));
      --radius: 16px;
      --radius-sm: 10px;
      --mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      --shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Helvetica Neue", Arial, sans-serif;
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    /* Ambient background glows */
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background:
        radial-gradient(ellipse 60% 40% at 15% 0%, rgba(108, 140, 255, 0.10), transparent 60%),
        radial-gradient(ellipse 50% 40% at 85% 10%, rgba(157, 108, 255, 0.09), transparent 60%),
        radial-gradient(ellipse 60% 50% at 50% 100%, rgba(79, 209, 197, 0.05), transparent 60%);
      pointer-events: none;
      z-index: 0;
    }

    main, header, footer, nav { position: relative; z-index: 1; }

    .container { max-width: 1080px; margin: 0 auto; padding: 0 24px; }

    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ============ NAV ============ */
    .nav {
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      background: rgba(10, 14, 23, 0.72);
      border-bottom: 1px solid var(--border);
    }
    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 24px;
      max-width: 1080px;
      margin: 0 auto;
    }
    .nav-brand {
      font-weight: 800;
      font-size: 1.05rem;
      letter-spacing: 0.02em;
      background: var(--gradient);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .nav-links { display: flex; gap: 22px; flex-wrap: wrap; }
    .nav-links a {
      color: var(--text-muted);
      font-size: 0.86rem;
      font-weight: 500;
      transition: color 0.2s;
    }
    .nav-links a:hover { color: var(--text); text-decoration: none; }

    /* ============ HERO ============ */
    .hero {
      text-align: center;
      padding: 96px 24px 80px;
      position: relative;
    }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 999px;
      border: 1px solid var(--border-strong);
      background: var(--surface);
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 28px;
      letter-spacing: 0.04em;
    }
    .hero h1 {
      font-size: clamp(3rem, 8vw, 5rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      background: var(--gradient);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.05;
    }
    .hero .subtitle {
      margin-top: 18px;
      font-size: clamp(1.1rem, 2.5vw, 1.4rem);
      font-weight: 600;
      color: var(--text);
    }
    .hero .description {
      margin: 20px auto 0;
      max-width: 640px;
      color: var(--text-muted);
      font-size: 1.02rem;
    }
    .hero .author-line {
      margin-top: 26px;
      font-size: 0.92rem;
      color: var(--text-faint);
    }
    .hero .author-line strong { color: var(--text); font-weight: 600; }

    .hero-actions {
      margin-top: 44px;
      display: flex;
      justify-content: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: var(--radius-sm);
      font-size: 0.92rem;
      font-weight: 600;
      border: 1px solid var(--border-strong);
      background: var(--surface);
      color: var(--text);
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
    }
    .btn:hover {
      transform: translateY(-2px);
      background: var(--surface-strong);
      border-color: rgba(255, 255, 255, 0.28);
      text-decoration: none;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
    }
    .btn-primary {
      background: var(--gradient);
      border: none;
      color: #fff;
    }
    .btn-primary:hover {
      background: var(--gradient);
      box-shadow: 0 8px 28px rgba(124, 108, 255, 0.35);
    }

    /* ============ SECTIONS ============ */
    section { padding: 72px 0; }
    section:nth-of-type(even) { background: rgba(255, 255, 255, 0.014); }

    .section-label {
      display: inline-block;
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 12px;
    }
    h2 {
      font-size: clamp(1.6rem, 4vw, 2.2rem);
      font-weight: 750;
      letter-spacing: -0.02em;
      margin-bottom: 18px;
    }
    h3 { font-size: 1.08rem; font-weight: 650; margin-bottom: 10px; }
    .lead { color: var(--text-muted); max-width: 720px; font-size: 1.02rem; }

    /* ============ CARDS / GRIDS ============ */
    .grid {
      display: grid;
      gap: 20px;
      margin-top: 36px;
    }
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 26px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: rgba(124, 140, 255, 0.35);
      background: var(--surface-strong);
      box-shadow: var(--shadow);
    }
    .card .icon {
      font-size: 1.6rem;
      display: inline-flex;
      width: 48px;
      height: 48px;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: var(--gradient-soft);
      border: 1px solid var(--border);
      margin-bottom: 16px;
    }
    .card ul { list-style: none; margin-top: 6px; }
    .card ul li {
      color: var(--text-muted);
      font-size: 0.9rem;
      padding: 4px 0 4px 20px;
      position: relative;
    }
    .card ul li::before {
      content: "›";
      position: absolute;
      left: 4px;
      color: var(--accent);
      font-weight: 700;
    }
    .card p { color: var(--text-muted); font-size: 0.92rem; }

    /* ============ AI ASSISTANT ============ */
    .ai-panel {
      margin-top: 36px;
      background: var(--gradient-soft);
      border: 1px solid rgba(124, 140, 255, 0.28);
      border-radius: 20px;
      padding: 40px;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
    .chat {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 24px;
      max-width: 620px;
    }
    .bubble {
      align-self: flex-start;
      background: rgba(10, 14, 23, 0.65);
      border: 1px solid var(--border-strong);
      border-radius: 14px 14px 14px 4px;
      padding: 12px 18px;
      font-family: var(--mono);
      font-size: 0.86rem;
      color: var(--text);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .bubble:hover { transform: translateX(4px); border-color: var(--accent); }
    .ai-domains {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 28px;
    }
    .chip {
      padding: 7px 16px;
      border-radius: 999px;
      background: rgba(10, 14, 23, 0.55);
      border: 1px solid var(--border-strong);
      font-size: 0.83rem;
      color: var(--text-muted);
      transition: color 0.2s, border-color 0.2s;
    }
    .chip:hover { color: var(--text); border-color: var(--accent); }

    /* ============ FLOW / PIPELINE ============ */
    .flow {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      margin-top: 36px;
    }
    .flow-step {
      width: 100%;
      max-width: 460px;
      text-align: center;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 14px 22px;
      font-weight: 600;
      font-size: 0.94rem;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: border-color 0.25s ease, transform 0.25s ease;
    }
    .flow-step:hover { border-color: var(--accent); transform: scale(1.02); }
    .flow-step small { display: block; font-weight: 400; color: var(--text-faint); font-size: 0.78rem; margin-top: 2px; }
    .flow-arrow {
      color: var(--accent);
      font-size: 1.2rem;
      line-height: 1;
      padding: 8px 0;
      user-select: none;
    }
    .flow-step.highlight {
      background: var(--gradient-soft);
      border-color: rgba(124, 140, 255, 0.4);
    }

    /* ============ TECH TABLE ============ */
    .tech-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-top: 36px;
    }
    .tech-item {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 16px 18px;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .tech-item:hover { transform: translateY(-3px); border-color: var(--border-strong); }
    .tech-item .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--gradient);
      flex-shrink: 0;
    }
    .tech-item div strong { display: block; font-size: 0.92rem; }
    .tech-item div span { font-size: 0.78rem; color: var(--text-faint); }

    /* ============ CODE BLOCKS ============ */
    .code-block {
      background: #0b0f1a;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 20px 24px;
      font-family: var(--mono);
      font-size: 0.86rem;
      color: #c9d4e8;
      overflow-x: auto;
      margin-top: 20px;
      line-height: 1.8;
    }
    .code-block .cmt { color: var(--text-faint); }
    .code-block .kw { color: var(--accent-3); }
    .code-title {
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-faint);
      margin-top: 28px;
    }

    /* ============ CHECKLIST / ROADMAP ============ */
    .roadmap-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 18px 20px;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .roadmap-item:hover { transform: translateY(-3px); border-color: rgba(124, 140, 255, 0.35); }
    .roadmap-item .box {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      border: 2px solid var(--text-faint);
      flex-shrink: 0;
      margin-top: 3px;
    }
    .roadmap-item span { font-size: 0.92rem; color: var(--text); }
    .roadmap-item small { display: block; color: var(--text-faint); font-size: 0.76rem; margin-top: 2px; }

    /* ============ SCREENSHOTS ============ */
    .shot {
      background: var(--surface);
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius);
      aspect-ratio: 16 / 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: var(--text-faint);
      transition: border-color 0.25s ease, transform 0.25s ease;
    }
    .shot:hover { border-color: var(--accent); transform: translateY(-3px); }
    .shot .shot-icon { font-size: 1.8rem; opacity: 0.8; }
    .shot strong { color: var(--text-muted); font-size: 0.95rem; }
    .shot em { font-style: normal; font-size: 0.78rem; }

    /* ============ SECURITY LIST ============ */
    .security-list { list-style: none; margin-top: 28px; display: grid; gap: 12px; }
    .security-list li {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 16px 20px;
      font-size: 0.92rem;
      color: var(--text-muted);
    }
    .security-list li strong { color: var(--text); }
    .security-list .lock { flex-shrink: 0; }

    .note {
      margin-top: 24px;
      padding: 16px 20px;
      border-left: 3px solid var(--accent-3);
      background: rgba(79, 209, 197, 0.06);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      font-size: 0.9rem;
      color: var(--text-muted);
    }
    .note.warn {
      border-left-color: #ffb454;
      background: rgba(255, 180, 84, 0.06);
    }

    /* ============ AUTHOR ============ */
    .author-card {
      margin-top: 36px;
      display: flex;
      align-items: center;
      gap: 24px;
      background: var(--gradient-soft);
      border: 1px solid rgba(124, 140, 255, 0.28);
      border-radius: 20px;
      padding: 36px;
    }
    .avatar {
      width: 84px;
      height: 84px;
      border-radius: 50%;
      background: var(--gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.9rem;
      font-weight: 800;
      color: #fff;
      flex-shrink: 0;
      letter-spacing: -0.02em;
    }
    .author-card h3 { font-size: 1.3rem; margin-bottom: 4px; }
    .author-card p { color: var(--text-muted); font-size: 0.95rem; }

    /* ============ FOOTER ============ */
    footer {
      border-top: 1px solid var(--border);
      padding: 56px 24px;
      text-align: center;
    }
    footer .footer-brand {
      font-size: 1.4rem;
      font-weight: 800;
      background: var(--gradient);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    footer .tagline {
      margin-top: 10px;
      color: var(--text-muted);
      font-style: italic;
      font-size: 0.96rem;
    }
    footer .built-by {
      margin-top: 20px;
      color: var(--text-faint);
      font-size: 0.85rem;
    }
    footer .built-by strong { color: var(--text-muted); }

    /* ============ RESPONSIVE ============ */
    @media (max-width: 900px) {
      .grid-3, .grid-4, .tech-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 620px) {
      .grid-2, .grid-3, .grid-4, .tech-grid { grid-template-columns: 1fr; }
      .hero { padding: 64px 20px 56px; }
      section { padding: 56px 0; }
      .nav-links { display: none; }
      .ai-panel { padding: 26px; }
      .author-card { flex-direction: column; text-align: center; }
    }
  </style>
</head>
<body>

  <!-- ============ NAV ============ -->
  <nav class="nav" aria-label="Primary navigation">
    <div class="nav-inner">
      <span class="nav-brand">⟳ InnerLoop</span>
      <div class="nav-links">
        <a href="#features">Features</a>
        <a href="#ai-assistant">AI Assistant</a>
        <a href="#architecture">Architecture</a>
        <a href="#tech-stack">Tech Stack</a>
        <a href="#getting-started">Getting Started</a>
        <a href="#roadmap">Roadmap</a>
      </div>
    </div>
  </nav>

  <!-- ============ 1. HERO ============ -->
  <header class="hero">
    <span class="hero-badge">✦ AI-Powered Productivity Platform</span>
    <h1>InnerLoop</h1>
    <p class="subtitle">AI-Powered Student Productivity &amp; Personal Growth Platform</p>
    <p class="description">
      InnerLoop brings tasks, habits, timetable, exercise, sleep tracking, analytics,
      reminders, and an AI assistant together in one intelligent workspace.
    </p>
    <p class="author-line">Built by <strong>Kunal Choudhary</strong></p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="#features">✨ Features</a>
      <a class="btn" href="#ai-assistant">🤖 AI Assistant</a>
      <a class="btn" href="#architecture">🏗️ Architecture</a>
      <a class="btn" href="#getting-started">🚀 Getting Started</a>
    </div>
  </header>

  <main>

    <!-- ============ 2. ABOUT ============ -->
    <section id="about">
      <div class="container">
        <span class="section-label">About</span>
        <h2>What is InnerLoop?</h2>
        <p class="lead">
          InnerLoop is designed to help students organize their academic and personal
          routines while using AI to make productivity more intelligent and personalized.
          Instead of juggling separate apps for tasks, schedules, habits, and wellness,
          InnerLoop unifies everything into a single workspace — with a conversational
          AI assistant that can act on your data through natural language.
        </p>
      </div>
    </section>

    <!-- ============ 3. VISION ============ -->
    <section id="vision">
      <div class="container">
        <span class="section-label">Vision</span>
        <h2>One platform for the whole loop</h2>
        <p class="lead">InnerLoop exists to close the loop between planning, doing, and understanding.</p>
        <div class="grid grid-3">
          <div class="card"><span class="icon">🎓</span><h3>Organize academic life</h3><p>Keep assignments, deadlines, and study plans in one structured place.</p></div>
          <div class="card"><span class="icon">🔁</span><h3>Build consistent habits</h3><p>Turn intentions into routines with simple, trackable habit loops.</p></div>
          <div class="card"><span class="icon">⏰</span><h3>Manage time</h3><p>Plan days and weeks with a flexible, editable timetable.</p></div>
          <div class="card"><span class="icon">📋</span><h3>Track routines</h3><p>Log exercise and sleep alongside tasks for a complete picture.</p></div>
          <div class="card"><span class="icon">📊</span><h3>Understand productivity</h3><p>See patterns and progress through built-in analytics.</p></div>
          <div class="card"><span class="icon">🤖</span><h3>AI as a personal assistant</h3><p>Use natural language and voice to manage everything hands-free.</p></div>
        </div>
      </div>
    </section>

    <!-- ============ 4. FEATURES ============ -->
    <section id="features">
      <div class="container">
        <span class="section-label">Features</span>
        <h2>Everything a student needs, unified</h2>
        <div class="grid grid-3">
          <div class="card">
            <span class="icon">✅</span>
            <h3>Tasks</h3>
            <ul>
              <li>Create tasks</li>
              <li>Update tasks</li>
              <li>Delete tasks</li>
              <li>Complete tasks</li>
              <li>Manage upcoming work</li>
            </ul>
          </div>
          <div class="card">
            <span class="icon">🔁</span>
            <h3>Habits</h3>
            <ul>
              <li>Create habits</li>
              <li>Track habits</li>
              <li>Log completion</li>
              <li>Monitor consistency</li>
            </ul>
          </div>
          <div class="card">
            <span class="icon">🗓️</span>
            <h3>Timetable</h3>
            <ul>
              <li>Daily timetable</li>
              <li>Weekly timetable</li>
              <li>Create / edit / delete slots</li>
              <li>Copy schedules</li>
              <li>Plan study sessions</li>
            </ul>
          </div>
          <div class="card">
            <span class="icon">💪</span>
            <h3>Exercise</h3>
            <ul>
              <li>Add exercise</li>
              <li>Track workouts</li>
              <li>Log exercise</li>
              <li>View exercise history</li>
            </ul>
          </div>
          <div class="card">
            <span class="icon">😴</span>
            <h3>Sleep</h3>
            <ul>
              <li>Record sleep</li>
              <li>Track sleep duration</li>
              <li>Manage sleep logs</li>
              <li>Analyze sleep patterns</li>
            </ul>
          </div>
          <div class="card">
            <span class="icon">📈</span>
            <h3>Analytics</h3>
            <ul>
              <li>Daily summaries</li>
              <li>Weekly productivity</li>
              <li>Habit analytics</li>
              <li>Sleep analytics</li>
              <li>Exercise analytics</li>
              <li>Dashboard insights</li>
            </ul>
          </div>
          <div class="card">
            <span class="icon">🔔</span>
            <h3>Notifications</h3>
            <ul>
              <li>Reminders</li>
              <li>Activity notifications</li>
              <li>Important schedule alerts</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 5. AI ASSISTANT ============ -->
    <section id="ai-assistant">
      <div class="container">
        <span class="section-label">AI Assistant</span>
        <h2>🤖 Talk to your productivity</h2>
        <p class="lead">
          InnerLoop AI understands natural language and can interact directly with your
          InnerLoop data. Ask it to create tasks, plan your timetable, log habits, or
          summarize your day — it translates your words into real actions.
        </p>

        <div class="ai-panel">
          <h3>Example commands</h3>
          <div class="chat" role="list" aria-label="Example AI commands">
            <div class="bubble" role="listitem">"Add drinking water as a daily habit."</div>
            <div class="bubble" role="listitem">"Create a task to finish my chemistry assignment tomorrow."</div>
            <div class="bubble" role="listitem">"Add DSA tomorrow from 7 PM to 8 PM."</div>
            <div class="bubble" role="listitem">"Show my tasks for today."</div>
            <div class="bubble" role="listitem">"Set up my timetable for tomorrow."</div>
          </div>

          <h3 style="margin-top: 32px;">The AI can work with</h3>
          <div class="ai-domains">
            <span class="chip">✅ Tasks</span>
            <span class="chip">🔁 Habits</span>
            <span class="chip">🗓️ Timetable</span>
            <span class="chip">💪 Exercise</span>
            <span class="chip">😴 Sleep</span>
            <span class="chip">📈 Analytics</span>
            <span class="chip">🔔 Notifications</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 6. VOICE ASSISTANT ============ -->
    <section id="voice">
      <div class="container">
        <span class="section-label">Voice Assistant</span>
        <h2>🎙️ Hands-free by design</h2>
        <p class="lead">
          Voice interaction is designed to make InnerLoop hands-free and conversational.
          Speak naturally — InnerLoop listens, acts, and answers back.
        </p>

        <div class="flow" aria-label="Voice interaction pipeline">
          <div class="flow-step">🎙️ User speaks</div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step">Speech Recognition</div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step highlight">AI Processing</div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step">InnerLoop Action</div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step highlight">AI Response</div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step">🔊 Text-to-Speech</div>
        </div>
      </div>
    </section>

    <!-- ============ 7. AI ARCHITECTURE ============ -->
    <section id="architecture">
      <div class="container">
        <span class="section-label">Architecture</span>
        <h2>🏗️ How the AI pipeline works</h2>
        <p class="lead">
          Every AI request flows through an authenticated, server-side pipeline —
          keeping secrets off the client and data scoped to the signed-in user.
        </p>

        <div class="flow" aria-label="AI architecture diagram">
          <div class="flow-step">👤 User</div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step">InnerLoop Frontend<small>React application</small></div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step">Authenticated Request<small>User session token</small></div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step highlight">Supabase Edge Function<small>Server-side gateway</small></div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step highlight">AI Model<small>Natural language understanding</small></div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step highlight">Function / Tool Calling<small>Structured actions</small></div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step">Supabase Database<small>PostgreSQL with RLS</small></div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step">Result</div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step">AI Response</div>
          <div class="flow-arrow" aria-hidden="true">↓</div>
          <div class="flow-step">🖥️ Frontend / 🔊 Voice</div>
        </div>
      </div>
    </section>

    <!-- ============ 8. TECHNOLOGY STACK ============ -->
    <section id="tech-stack">
      <div class="container">
        <span class="section-label">Technology Stack</span>
        <h2>🧰 Built with a modern stack</h2>
        <div class="tech-grid">
          <div class="tech-item"><span class="dot" aria-hidden="true"></span><div><strong>React</strong><span>UI framework</span></div></div>
          <div class="tech-item"><span class="dot" aria-hidden="true"></span><div><strong>Vite</strong><span>Build tooling</span></div></div>
          <div class="tech-item"><span class="dot" aria-hidden="true"></span><div><strong>JavaScript / TypeScript</strong><span>Application language</span></div></div>
          <div class="tech-item"><span class="dot" aria-hidden="true"></span><div><strong>Tailwind CSS</strong><span>Styling</span></div></div>
          <div class="tech-item"><span class="dot" aria-hidden="true"></span><div><strong>Supabase</strong><span>Backend platform</span></div></div>
          <div class="tech-item"><span class="dot" aria-hidden="true"></span><div><strong>PostgreSQL</strong><span>Database</span></div></div>
          <div class="tech-item"><span class="dot" aria-hidden="true"></span><div><strong>Supabase Auth</strong><span>Authentication</span></div></div>
          <div class="tech-item"><span class="dot" aria-hidden="true"></span><div><strong>Supabase Edge Functions</strong><span>Server-side logic</span></div></div>
          <div class="tech-item"><span class="dot" aria-hidden="true"></span><div><strong>React Query</strong><span>Data fetching &amp; caching</span></div></div>
          <div class="tech-item"><span class="dot" aria-hidden="true"></span><div><strong>Web Speech API</strong><span>Voice input &amp; output</span></div></div>
          <div class="tech-item"><span class="dot" aria-hidden="true"></span><div><strong>AI API Integration</strong><span>Natural language &amp; tool calling</span></div></div>
        </div>
      </div>
    </section>

    <!-- ============ 9. SECURITY ============ -->
    <section id="security">
      <div class="container">
        <span class="section-label">Security</span>
        <h2>🔐 Security by default</h2>
        <ul class="security-list">
          <li><span class="lock" aria-hidden="true">🔑</span><span><strong>Supabase Authentication</strong> — every request is tied to a verified user session.</span></li>
          <li><span class="lock" aria-hidden="true">🛡️</span><span><strong>Row Level Security (RLS)</strong> — database policies enforce access at the row level.</span></li>
          <li><span class="lock" aria-hidden="true">👤</span><span><strong>User-scoped database access</strong> — users can only read and write their own data.</span></li>
          <li><span class="lock" aria-hidden="true">📡</span><span><strong>Authenticated requests</strong> — all API and AI calls require a valid session token.</span></li>
          <li><span class="lock" aria-hidden="true">🖥️</span><span><strong>Server-side AI API keys</strong> — AI credentials live only in Edge Functions, never in the browser.</span></li>
          <li><span class="lock" aria-hidden="true">🚫</span><span><strong>No service-role key in the frontend</strong> — privileged keys are never shipped to the client.</span></li>
          <li><span class="lock" aria-hidden="true">🗂️</span><span><strong>Environment variables for secrets</strong> — all sensitive configuration stays out of source code.</span></li>
        </ul>
        <div class="note warn">
          ⚠️ Real API keys, service-role keys, and secrets are never displayed in documentation
          or committed to version control.
        </div>
      </div>
    </section>

    <!-- ============ 10. PROJECT STRUCTURE ============ -->
    <section id="structure">
      <div class="container">
        <span class="section-label">Project Structure</span>
        <h2>📁 Simplified project structure</h2>
        <p class="lead">A high-level view of how the codebase is organized. (Simplified — not an exhaustive listing.)</p>
        <pre class="code-block" aria-label="Project directory tree">
src/
├── components/
├── context/
├── pages/
├── lib/
├── types/
├── Layout.jsx
└── App.jsx

supabase/
└── functions/
    └── innerloop-ai/</pre>
      </div>
    </section>

    <!-- ============ 11. GETTING STARTED ============ -->
    <section id="getting-started">
      <div class="container">
        <span class="section-label">Getting Started</span>
        <h2>🚀 Run InnerLoop locally</h2>

        <p class="code-title">Installation</p>
        <pre class="code-block"><span class="cmt"># Clone the repository</span>
<span class="kw">git clone</span> &lt;repository-url&gt;
<span class="kw">cd</span> innerloop

<span class="cmt"># Install dependencies</span>
<span class="kw">npm install</span>

<span class="cmt"># Start the development server</span>
<span class="kw">npm run dev</span></pre>

        <p class="code-title">Environment variables</p>
        <pre class="code-block"><span class="cmt"># .env (do not commit)</span>
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=</pre>

        <div class="note warn">
          ⚠️ Server-side AI secrets are configured in the Supabase Edge Function environment
          and must <strong>never</strong> be committed to GitHub or exposed in frontend code.
        </div>
      </div>
    </section>

    <!-- ============ 12. BUILD ============ -->
    <section id="build">
      <div class="container">
        <span class="section-label">Build</span>
        <h2>📦 Production build</h2>
        <pre class="code-block"><span class="kw">npm run build</span></pre>
      </div>
    </section>

    <!-- ============ 13. DATABASE & SECURITY ============ -->
    <section id="database">
      <div class="container">
        <span class="section-label">Database &amp; Security</span>
        <h2>🗄️ Supabase PostgreSQL + RLS</h2>
        <p class="lead">
          InnerLoop stores all data in Supabase-managed PostgreSQL. Every table is protected
          by Row Level Security policies, so each authenticated user can only access their
          own records. Even if a query is crafted maliciously from the client, the database
          itself refuses to return data belonging to another user.
        </p>
        <div class="note">
          ✅ The rule is simple: <strong>users should only ever access their own data</strong> —
          and that rule is enforced at the database layer, not just in application code.
        </div>
      </div>
    </section>

    <!-- ============ 14. ROADMAP ============ -->
    <section id="roadmap">
      <div class="container">
        <span class="section-label">Roadmap</span>
        <h2>🧭 What's next</h2>
        <p class="lead">Planned improvements — these are upcoming, not yet completed.</p>
        <div class="grid grid-2">
          <div class="roadmap-item"><span class="box" aria-hidden="true"></span><div><span>AI-powered timetable planning</span><small>Planned</small></div></div>
          <div class="roadmap-item"><span class="box" aria-hidden="true"></span><div><span>Smarter productivity recommendations</span><small>Planned</small></div></div>
          <div class="roadmap-item"><span class="box" aria-hidden="true"></span><div><span>Advanced analytics</span><small>Planned</small></div></div>
          <div class="roadmap-item"><span class="box" aria-hidden="true"></span><div><span>Improved voice conversations</span><small>Planned</small></div></div>
          <div class="roadmap-item"><span class="box" aria-hidden="true"></span><div><span>AI productivity coaching</span><small>Planned</small></div></div>
          <div class="roadmap-item"><span class="box" aria-hidden="true"></span><div><span>Mobile / PWA improvements</span><small>Planned</small></div></div>
          <div class="roadmap-item"><span class="box" aria-hidden="true"></span><div><span>Better notification system</span><small>Planned</small></div></div>
          <div class="roadmap-item"><span class="box" aria-hidden="true"></span><div><span>Personalized recommendations</span><small>Planned</small></div></div>
        </div>
      </div>
    </section>

    <!-- ============ 15. SCREENSHOTS ============ -->
    <section id="screenshots">
      <div class="container">
        <span class="section-label">Screenshots</span>
        <h2>🖼️ A look at InnerLoop</h2>
        <div class="grid grid-3">
          <div class="shot"><span class="shot-icon" aria-hidden="true">📊</span><strong>Dashboard</strong><em>Screenshot coming soon</em></div>
          <div class="shot"><span class="shot-icon" aria-hidden="true">🗓️</span><strong>Timetable</strong><em>Screenshot coming soon</em></div>
          <div class="shot"><span class="shot-icon" aria-hidden="true">🔁</span><strong>Habits</strong><em>Screenshot coming soon</em></div>
          <div class="shot"><span class="shot-icon" aria-hidden="true">📈</span><strong>Analytics</strong><em>Screenshot coming soon</em></div>
          <div class="shot"><span class="shot-icon" aria-hidden="true">🤖</span><strong>AI Assistant</strong><em>Screenshot coming soon</em></div>
        </div>
      </div>
    </section>

    <!-- ============ 16. CONTRIBUTING ============ -->
    <section id="contributing">
      <div class="container">
        <span class="section-label">Contributing</span>
        <h2>🤝 Contributing</h2>
        <p class="lead">Contributions, ideas, and feedback are welcome. To contribute:</p>
        <pre class="code-block"><span class="cmt"># 1. Fork the repository</span>
<span class="cmt"># 2. Create a feature branch</span>
<span class="kw">git checkout -b</span> feature/your-feature-name

<span class="cmt"># 3. Make your changes and commit</span>
<span class="kw">git commit -m</span> "Describe your change"

<span class="cmt"># 4. Push and open a Pull Request</span>
<span class="kw">git push origin</span> feature/your-feature-name</pre>
        <div class="note">
          💡 Please keep pull requests focused, describe your changes clearly, and never
          include secrets or credentials in commits.
        </div>
      </div>
    </section>

    <!-- ============ 17. LICENSE ============ -->
    <section id="license">
      <div class="container">
        <span class="section-label">License</span>
        <h2>📄 License</h2>
        <p class="lead">License information will be added as the project is finalized.</p>
      </div>
    </section>

    <!-- ============ 18. AUTHOR ============ -->
    <section id="author">
      <div class="container">
        <span class="section-label">Author</span>
        <h2>👨‍💻 About the author</h2>
        <div class="author-card">
          <div class="avatar" aria-hidden="true">KC</div>
          <div>
            <h3>Kunal Choudhary</h3>
            <p>AI &amp; Data Science engineering student building AI-powered products and developer tools.</p>
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- ============ 19. FOOTER ============ -->
  <footer>
    <div class="footer-brand">⟳ InnerLoop</div>
    <p class="tagline">"Making productivity more intentional, personalized, and intelligent."</p>
    <p class="built-by">Built by <strong>Kunal Choudhary</strong></p>
  </footer>

</body>
</html>
