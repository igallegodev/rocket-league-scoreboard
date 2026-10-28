(() => {
  const params = new URLSearchParams(location.search);
  const PORT = parseInt(params.get('port') || '49124', 10);
  const WS_URL = `ws://127.0.0.1:${PORT}`;
  // The docs say uu/s, but real speed values already arrive in km/h

  const $ = id => document.getElementById(id);

  // ---------- Language ----------
  // Only the panel's own texts are translated. Team names and play types
  // (StatfeedEvent.Type) are shown exactly as the game sends them, in the game's language.
  const I18N = {
    es: {
      title: 'Marcador RL', langGroup: 'Idioma',
      notConnected: 'Sin conexión', connecting: 'Conectando…', connected: 'Conectado al juego',
      retrying: 'Sin conexión, reintentando', demoStatus: 'Modo demo (datos simulados)',
      demo: 'Modo demo', record: 'Grabar registro', stopRecord: 'Detener grabación', logFull: 'Registro lleno',
      download: 'Descargar registro',
      recordTitle: 'Graba todo lo que envía el juego para poder descargarlo. Consume memoria: actívalo solo cuando lo necesites.',
      boardAria: 'Marcador', touchAria: 'Último toque del balón', lastTouch: 'Último toque',
      blue: 'Azul', orange: 'Naranja',
      helpTitle: 'Esperando al juego',
      help1: 'Abre Rocket League con la Stats API activada. El panel se conecta solo a {ws} y lo reintenta cada 2 segundos.',
      help2: 'Para activarla, edita <code>TAGame\\Config\\TAStatsAPI.ini</code> (o <code>DefaultStatsAPI.ini</code>) en la carpeta de instalación del juego, con el juego cerrado:',
      help3: '<code>Port=0</code> cierra el socket TCP (49123) que el juego abre además del WebSocket; el panel no lo usa.',
      help4: 'Pulsa “Modo demo” para ver el panel con datos simulados.',
      map: 'Mapa: {v}', youAre: 'Eres <strong>{v}</strong>', notDetected: 'Sin detectar quién eres', youBadge: 'Tú',
      winner: 'Ganador: {v}', replay: 'Repetición', overtime: 'Prórroga',
      hPlayer: 'Jugador', hScore: 'Puntos', hGoals: 'Goles', hAssists: 'Asist.', hSaves: 'Paradas', hShots: 'Tiros',
      hTouches: 'Toques', hDemos: 'Demos', hHit: 'Golpe máx.', hBoost: 'Boost',
      noPlayers: 'Sin jugadores todavía', noData: 'Sin dato',
      feedTitle: 'Jugadas', feedEmpty: 'Aquí aparecerán los goles, paradas y demoliciones.',
      fGoal: '<span class="goal">Gol</span> de {p}', fSpeed: ' a {v} km/h', fAssist: ', asistencia de {p}',
      fStat: '{label} de {p}', fDemoOn: ' a {p}', fBar: 'Larguero de {p}',
      fEnd: '<span class="goal">Fin del partido.</span> Gana {team}',
      sessTitle: 'Sesión', sessAria: 'Sesión', newSession: 'Nueva sesión',
      newSessionTitle: 'Borra el historial y empieza una sesión nueva',
      newSessionConfirm: '¿Empezar una sesión nueva? Se borrará el historial de esta sesión.',
      sessEmpty: 'Aquí aparecerán las partidas online que termines.',
      winLetter: 'V', lossLetter: 'D', win: 'Victoria', loss: 'Derrota', abandoned: 'Abandonada', abandonedShort: 'aband.',
      pct: '{n} %', streakW1: 'Racha: 1 victoria', streakWn: 'Racha: {n} victorias',
      streakL1: 'Racha: 1 derrota', streakLn: 'Racha: {n} derrotas', best: 'Mejor: {n}',
      mvpLine: 'MVP: {n} · Tiros a gol: {v}', lastMatches: 'Últimas partidas', total: 'Total', perMatch: 'Por partida',
      sGoals: 'Goles', sAssists: 'Asist.', sSaves: 'Paradas', sDemos: 'Demos',
      demoSave: 'Salvada', demoDemolish: 'Demolición',
    },
    en: {
      title: 'RL Scoreboard', langGroup: 'Language',
      notConnected: 'Not connected', connecting: 'Connecting…', connected: 'Connected to the game',
      retrying: 'Disconnected, retrying', demoStatus: 'Demo mode (simulated data)',
      demo: 'Demo mode', record: 'Record log', stopRecord: 'Stop recording', logFull: 'Log full',
      download: 'Download log',
      recordTitle: 'Records everything the game sends so you can download it. Uses memory: only turn it on when you need it.',
      boardAria: 'Scoreboard', touchAria: 'Last ball touch', lastTouch: 'Last touch',
      blue: 'Blue', orange: 'Orange',
      helpTitle: 'Waiting for the game',
      help1: 'Open Rocket League with the Stats API enabled. The panel connects to {ws} on its own and retries every 2 seconds.',
      help2: 'To enable it, edit <code>TAGame\\Config\\TAStatsAPI.ini</code> (or <code>DefaultStatsAPI.ini</code>) in the game\'s install folder, with the game closed:',
      help3: '<code>Port=0</code> closes the TCP socket (49123) that the game opens besides the WebSocket; the panel doesn\'t use it.',
      help4: 'Press “Demo mode” to see the panel with simulated data.',
      map: 'Map: {v}', youAre: 'You are <strong>{v}</strong>', notDetected: 'Couldn\'t detect who you are', youBadge: 'You',
      winner: 'Winner: {v}', replay: 'Replay', overtime: 'Overtime',
      hPlayer: 'Player', hScore: 'Score', hGoals: 'Goals', hAssists: 'Assists', hSaves: 'Saves', hShots: 'Shots',
      hTouches: 'Touches', hDemos: 'Demos', hHit: 'Max hit', hBoost: 'Boost',
      noPlayers: 'No players yet', noData: 'No data',
      feedTitle: 'Plays', feedEmpty: 'Goals, saves and demolitions will show up here.',
      fGoal: '<span class="goal">Goal</span> by {p}', fSpeed: ' at {v} km/h', fAssist: ', assisted by {p}',
      fStat: '{label} by {p}', fDemoOn: ' on {p}', fBar: 'Crossbar hit by {p}',
      fEnd: '<span class="goal">Match over.</span> {team} wins',
      sessTitle: 'Session', sessAria: 'Session', newSession: 'New session',
      newSessionTitle: 'Clears the history and starts a new session',
      newSessionConfirm: 'Start a new session? This session\'s history will be deleted.',
      sessEmpty: 'Online matches you finish will show up here.',
      winLetter: 'W', lossLetter: 'L', win: 'Win', loss: 'Loss', abandoned: 'Abandoned', abandonedShort: 'left',
      pct: '{n}%', streakW1: 'Streak: 1 win', streakWn: 'Streak: {n} wins',
      streakL1: 'Streak: 1 loss', streakLn: 'Streak: {n} losses', best: 'Best: {n}',
      mvpLine: 'MVP: {n} · Shooting: {v}', lastMatches: 'Last matches', total: 'Total', perMatch: 'Per match',
      sGoals: 'Goals', sAssists: 'Assists', sSaves: 'Saves', sDemos: 'Demos',
      demoSave: 'Save', demoDemolish: 'Demolition',
    },
  };
  // ?lang=en|es, then the saved choice, then the browser language (English unless it is Spanish)
  const pickLang = l => (l in I18N ? l : null);
  let lang = pickLang(params.get('lang')) || pickLang(load('rl-lang')) || (/^es\b/i.test(navigator.language || '') ? 'es' : 'en');
  // Dictionary strings are trusted HTML; vars must already be escaped
  function t(key, vars) {
    let s = I18N[lang][key] ?? I18N.es[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    return s;
  }

  // ---------- State ----------
  let state = freshState();
  // ?me=Name sets who you are and turns off auto-detection
  const meParam = params.get('me') || '';
  let me = meParam || load('rl-me') || '';
  // Team name exactly as the game sends it
  function teamName(i) { return state.teams[i]?.Name || t(i ? 'orange' : 'blue'); }

  // ---------- Team colors ----------
  // Uses the game's ColorPrimary. If a color blends into the background
  // (e.g. a black club color in dark mode), it is lightened or darkened just enough to be readable.
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  const hexToRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  function readable(rgb) {
    const dark = darkMQ.matches;
    const bg = dark ? [24, 32, 43] : [255, 255, 255];
    const target = dark ? [255, 255, 255] : [0, 0, 0];
    const text = dark ? [232, 237, 244] : [24, 32, 43];
    const step = (c, to) => c.map((v, k) => Math.round(v + (to[k] - v) * .12));
    let c = rgb.slice();
    for (let i = 0; i < 20 && contrast(c, bg) < 3; i++) c = step(c, target);
    // If it blends into the text color (e.g. a near-black club in light mode), move it
    // toward the background without dropping below the minimum contrast, so it stands out in the feed.
    for (let i = 0; i < 20 && contrast(c, text) < 3; i++) {
      const n = step(c, bg);
      if (contrast(n, bg) < 3) break;
      c = n;
    }
    return c;
  }
  const appliedColors = ['', ''];
  function applyTeamColors(force) {
    const root = document.documentElement.style;
    [0, 1].forEach(i => {
      const hex = state.teams[i]?.Color || '';
      if (hex === appliedColors[i] && !force) return;
      appliedColors[i] = hex;
      const v = i ? 'orange' : 'blue';
      const rgb = hexToRgb(hex);
      if (!rgb) { root.removeProperty('--' + v); root.removeProperty('--' + v + '-soft'); return; }
      const c = readable(rgb);
      root.setProperty('--' + v, `rgb(${c.join(',')})`);
      root.setProperty('--' + v + '-soft', `rgba(${c.join(',')},.2)`);
    });
  }
  darkMQ.addEventListener?.('change', () => applyTeamColors(true));
  const log = [];
  let recording = false; // off by default to avoid piling up memory
  const LOG_MAX = 60000; // ~33 min at 30 messages/s, ~70 MB of JSON without repeated Loadouts
  let ws = null, retry = null, demo = null, realSession = null;

  function freshState() {
    return {
      players: [], teams: [null, null],
      time: 300, ot: false, ballTeam: 255, arena: '', winner: '', replay: false,
      maxHit: {}, feed: [], hasBoost: false, goalReplay: false, seen: {}, meLocked: false,
      guid: '', ended: false, mvp: false,
    };
  }
  function load(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function save(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} }

  // ---------- Connection ----------
  let statusKind = 'bad', statusKey = 'notConnected';
  function setStatus(kind, key) {
    statusKind = kind; statusKey = key;
    $('dot').className = 'dot' + (kind === 'ok' ? ' ok' : kind === 'wait' ? ' wait' : '');
    $('statusText').textContent = t(key);
  }

  function connect() {
    if (demo) return;
    clearTimeout(retry);
    setStatus('wait', 'connecting');
    if (ws) { ws.onclose = ws.onmessage = ws.onopen = null; try { ws.close(); } catch {} }
    try { ws = new WebSocket(WS_URL); }
    catch { scheduleRetry(); return; }
    ws.onopen = () => { setStatus('ok', 'connected'); $('help').hidden = true; };
    ws.onmessage = e => handleRaw(e.data);
    ws.onclose = () => { if (!demo) { setStatus('bad', 'retrying'); $('help').hidden = false; scheduleRetry(); } };
    ws.onerror = () => {};
  }
  function scheduleRetry() { retry = setTimeout(connect, 2000); }

  // Each player's Loadout takes up most of the message and repeats in every
  // UpdateState: the log only keeps it the first time it appears.
  const loggedLoadout = new Set();
  function slim(msg) {
    const ps = msg.Event === 'UpdateState' && msg.Data?.Players;
    if (!Array.isArray(ps)) return msg;
    return { ...msg, Data: { ...msg.Data, Players: ps.map(p => {
      if (!('Loadout' in p)) return p;
      if (!loggedLoadout.has(p.Name)) { loggedLoadout.add(p.Name); return p; }
      const { Loadout, ...rest } = p;
      return rest;
    }) } };
  }

  // Messages generated by demo mode are not recorded in the log
  function handleRaw(raw, fromDemo) {
    if (typeof raw !== 'string') return;
    const rec = recording && !fromDemo;
    // In case several JSON objects arrive glued together in a single frame
    const chunks = raw.includes('}{') ? raw.replace(/}\s*{/g, '}\u0000{').split('\u0000') : [raw];
    for (const c of chunks) {
      let msg;
      try { msg = JSON.parse(c); } catch { continue; }
      if (msg && typeof msg.Data === 'string') { try { msg.Data = JSON.parse(msg.Data); } catch {} }
      if (rec && log.length < LOG_MAX) log.push({ t: Date.now(), ...slim(msg) });
      handle(msg);
    }
    if (rec) updateLogUI();
  }

  // ---------- Events ----------
  function handle(msg) {
    const d = msg.Data || {};
    switch (msg.Event) {
      case 'UpdateState': onUpdate(d); break;
      case 'MatchCreated':
      case 'MatchInitialized':
        if (msg.Event === 'MatchCreated') { state = freshState(); applyTeamColors(); }
        render(); break;
      case 'ClockUpdatedSeconds':
        state.time = d.TimeSeconds ?? state.time; state.ot = !!d.bOvertime; renderClock(); break;
      case 'BallHit': onHit(d); break;
      case 'GoalScored': onGoal(d); break;
      case 'StatfeedEvent': onStat(d); break;
      case 'MatchEnded':
        addFeed({ k: 'end', team: d.WinnerTeamNum, name: teamName(d.WinnerTeamNum) }, 'end', { always: true, window: 30000 });
        state.ended = true;
        recordMatch(d.WinnerTeamNum);
        break;
      // Destroyed without MatchEnded: you left before the end (unverified with a real log)
      case 'MatchDestroyed':
        if (!state.ended) recordMatch(null);
        break;
      case 'CrossbarHit': {
        const p = d.BallLastTouch?.Player;
        if (p) addFeed({ k: 'bar', p }, 'bar|' + p.Name, { window: 300, who: [p.Name] });
        break;
      }
      case 'GoalReplayStart': state.goalReplay = true; renderClock(); break;
      case 'GoalReplayEnd': case 'RoundStarted': case 'CountdownBegin': state.goalReplay = false; renderClock(); break;
    }
  }

  function onUpdate(d) {
    // MatchGuid only comes online; a new one means a new match even without MatchCreated
    if (d.MatchGuid && d.MatchGuid !== state.guid) Object.assign(state, { guid: d.MatchGuid, ended: false, mvp: false });
    if (Array.isArray(d.Players)) {
      state.players = d.Players;
      state.hasBoost = d.Players.some(p => typeof p.Boost === 'number');
    }
    const g = d.Game || {};
    let scored = false;
    if (Array.isArray(g.Teams)) {
      g.Teams.forEach(tm => {
        const old = state.teams[tm.TeamNum];
        if (tm.Score > (old?.Score ?? 0)) { flashGoal(tm.TeamNum); scored = true; }
        state.teams[tm.TeamNum] = { Name: tm.Name, Score: tm.Score, Color: tm.ColorPrimary };
      });
    }
    if (typeof g.TimeSeconds === 'number') state.time = g.TimeSeconds;
    state.ot = !!g.bOvertime;
    if (g.Ball && typeof g.Ball.TeamNum === 'number') state.ballTeam = g.Ball.TeamNum;
    if (g.Arena) state.arena = g.Arena;
    state.winner = g.bHasWinner ? g.Winner : '';
    state.replay = !!g.bReplay;
    detectMe(g);
    applyTeamColors();
    // A goal is drawn at once, in sync with its animation; the rest is throttled
    if (scored) render(); else scheduleRender();
  }

  // Detects who you are: while you play, the camera follows you. Takes the
  // first player the camera follows in each match (outside replays) and
  // keeps it until the next match, so a demolition or a camera change
  // doesn't reassign you.
  function detectMe(g) {
    if (meParam || state.meLocked || !g.bHasTarget || g.bReplay || inReplay()) return;
    const name = g.Target?.Name;
    if (!name || !state.players.some(p => p.Name === name)) return;
    state.meLocked = true;
    if (me !== name) { me = name; save('rl-me', me); drawFeed(); }
  }

  function onHit(d) {
    if (inReplay()) return;
    const speed = d.Ball?.PostHitSpeed;
    (d.Players || []).forEach(p => {
      if (typeof speed === 'number') {
        const kmh = speed;
        if (!state.maxHit[p.Name] || kmh > state.maxHit[p.Name]) state.maxHit[p.Name] = kmh;
      }
      state.ballTeam = p.TeamNum;
    });
    renderTouch();
  }

  function onGoal(d) {
    const s = d.Scorer;
    // Online, every goal replay ends with an extra GoalScored with no scorer and 0 km/h
    if (!s?.Name) return;
    const speed = typeof d.GoalSpeed === 'number' ? Math.round(d.GoalSpeed) : null;
    addFeed({ k: 'goal', p: s, assister: d.Assister || null, speed }, 'goal|' + s.Name,
      { window: 300, who: [s.Name, d.Assister?.Name] });
  }

  const STAT_SKIP = new Set(['Goal', 'Shot', 'Assist', 'Win']);

  function onStat(d) {
    if (!d.MainTarget || STAT_SKIP.has(d.EventName)) return;
    const isMvp = d.EventName === 'MVP';
    if (isMvp && d.MainTarget.Name === me) {
      state.mvp = true;
      // In the online log MVP arrives just before MatchEnded; if it ever comes after, fix the saved match
      const last = session.matches.at(-1);
      if (last && last.id === state.guid && !last.mvp) { last.mvp = true; saveSession(); renderSession(); }
    }
    // Text exactly as the game shows it (already in the game's language)
    const label = d.Type || d.EventName;
    const sec = d.SecondaryTarget && d.EventName === 'Demolish' ? d.SecondaryTarget : null;
    // Offline, the game can send the same stat event several times in the same
    // millisecond (up to 4 copies seen): only the first copy is kept.
    addFeed({ k: 'stat', label, p: d.MainTarget, sec },
      'stat|' + d.EventName + '|' + d.MainTarget.Name + '|' + (d.SecondaryTarget?.Name || ''),
      // MVP arrives at the very end, while the last goal replay is still flagged
      { window: 300, who: [d.MainTarget.Name], always: isMvp });
  }

  // ---------- Session ----------
  // Online matches you finish, kept in localStorage. A new session starts after
  // 6 h without playing or with the "New session" button.
  const SESSION_KEY = 'rl-session', SESSION_IDLE = 6 * 3600e3;
  const newSession = () => ({ started: Date.now(), last: Date.now(), matches: [] });
  function loadSession() {
    try {
      const s = JSON.parse(load(SESSION_KEY));
      if (s && Array.isArray(s.matches) && Date.now() - s.last < SESSION_IDLE) return s;
    } catch {}
    return newSession();
  }
  let session = loadSession();
  let sessionPersist = true; // false in demo mode, which uses its own throwaway session
  function saveSession() { if (sessionPersist) save(SESSION_KEY, JSON.stringify(session)); }

  // winner: WinnerTeamNum from MatchEnded, or null if the match was abandoned.
  // Only online matches (they have a MatchGuid) where you were detected.
  function recordMatch(winner) {
    if (!state.guid || session.matches.some(m => m.id === state.guid)) return;
    const p = state.players.find(x => x.Name === me);
    if (!p) return;
    const tn = p.TeamNum;
    if (Date.now() - session.last >= SESSION_IDLE) session = newSession();
    session.matches.push({
      id: state.guid, at: Date.now(), won: winner === tn, abandoned: winner === null,
      my: state.teams[tn]?.Score ?? 0, opp: state.teams[1 - tn]?.Score ?? 0,
      goals: p.Goals || 0, assists: p.Assists || 0, saves: p.Saves || 0,
      shots: p.Shots || 0, demos: p.Demos || 0, score: p.Score || 0, mvp: state.mvp,
    });
    session.last = Date.now();
    saveSession();
    renderSession();
  }

  const fmt1 = n => n.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  function renderSession() {
    const ms = session.matches, n = ms.length;
    if (!n) { $('sessBody').innerHTML = `<p class="sess-empty">${t('sessEmpty')}</p>`; return; }
    const wins = ms.filter(m => m.won).length;
    let streak = 0;
    for (let i = n - 1; i >= 0 && ms[i].won === ms[n - 1].won; i--) streak++;
    let best = 0, run = 0;
    ms.forEach(m => { run = m.won ? run + 1 : 0; best = Math.max(best, run); });
    const sum = k => ms.reduce((a, m) => a + m[k], 0);
    const goals = sum('goals'), shots = sum('shots');
    const rows = [['sGoals', 'goals'], ['sAssists', 'assists'], ['sSaves', 'saves'], ['sDemos', 'demos']]
      .map(([label, k]) => `<tr><th scope="row">${t(label)}</th><td>${sum(k)}</td><td>${fmt1(sum(k) / n)}</td></tr>`).join('');
    const list = ms.slice(-10).reverse().map(m =>
      `<li class="${m.won ? 'w' : 'l'}" title="${t(m.abandoned ? 'abandoned' : m.won ? 'win' : 'loss')} ${m.my}-${m.opp}">
        <b>${t(m.won ? 'winLetter' : 'lossLetter')}</b> ${m.my}-${m.opp}${m.abandoned ? ` <small>${t('abandonedShort')}</small>` : ''}${m.mvp ? ' <small>MVP</small>' : ''}</li>`).join('');
    const streakTxt = t((ms[n - 1].won ? 'streakW' : 'streakL') + (streak === 1 ? '1' : 'n'), { n: streak });
    const shooting = shots ? t('pct', { n: Math.round(goals / shots * 100) }) : '–';
    // Three columns side by side (summary, last results, your stats); they stack on narrow screens
    $('sessBody').innerHTML = `
      <div class="sess-col">
        <div class="sess-wl"><span class="w">${wins}${t('winLetter')}</span><span class="l">${n - wins}${t('lossLetter')}</span><span class="pct">${t('pct', { n: Math.round(wins / n * 100) })}</span></div>
        <p class="sess-line">${streakTxt} · ${t('best', { n: best })}</p>
        <p class="sess-line">${t('mvpLine', { n: sum('mvp'), v: shooting })}</p>
      </div>
      <div class="sess-col"><h3>${t('lastMatches')}</h3><ol class="sess-list">${list}</ol></div>
      <div class="sess-col"><table class="sess-stats"><thead><tr><th></th><th scope="col">${t('total')}</th><th scope="col">${t('perMatch')}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  $('sessReset').addEventListener('click', () => {
    if (!confirm(t('newSessionConfirm'))) return;
    session = newSession(); saveSession(); renderSession();
  });

  // ---------- Render ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const teamSpan = (tn, txt) => `<span class="${tn === 0 ? 'b' : 'o'}">${esc(txt)}</span>`;
  const playerSpan = p => teamSpan(p.TeamNum, p.Name);

  // Platform from PrimaryId ("Steam|123|0"). Offline bots come as "Unknown|0|0".
  const PLATFORMS = { Steam: 'Steam', Epic: 'Epic', PS4: 'PS', PS5: 'PS', XboxOne: 'Xbox', Switch: 'Switch' };
  const platform = id => id === 'Unknown|0|0' ? 'Bot' : PLATFORMS[String(id || '').split('|')[0]] || '';

  function fmtClock(sec) {
    sec = Math.max(0, Math.floor(sec));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }

  function renderClock() {
    setText('clock', (state.ot ? '+' : '') + fmtClock(state.time));
    $('clock').classList.toggle('ot', state.ot);
    let sub = '';
    if (state.winner) {
      const i = state.teams.findIndex(tm => tm && tm.Name === state.winner);
      sub = t('winner', { v: i >= 0 ? teamName(i) : state.winner });
    }
    else if (inReplay()) sub = t('replay');
    else if (state.ot) sub = t('overtime');
    setText('sub', sub);
  }

  function renderTouch() {
    const mark = $('touchMark');
    const tn = state.ballTeam;
    const key = tn + '|' + teamName(tn);
    if (drawn.touch === key) return;
    drawn.touch = key;
    if (tn === 0) { mark.style.left = '0'; mark.style.background = 'var(--blue)'; $('touchText').textContent = teamName(0); }
    else if (tn === 1) { mark.style.left = '50%'; mark.style.background = 'var(--orange)'; $('touchText').textContent = teamName(1); }
    else { mark.style.left = '25%'; mark.style.background = 'transparent'; $('touchText').textContent = '—'; }
  }

  function headHTML() {
    return `<tr>
      <th scope="col">${t('hPlayer')}</th><th scope="col" class="c-num">${t('hScore')}</th><th scope="col" class="c-num">${t('hGoals')}</th>
      <th scope="col" class="c-num">${t('hAssists')}</th><th scope="col" class="c-num">${t('hSaves')}</th><th scope="col" class="c-num">${t('hShots')}</th>
      <th scope="col" class="c-num">${t('hTouches')}</th><th scope="col" class="c-num">${t('hDemos')}</th><th scope="col" class="c-hit">${t('hHit')}</th>
      <th scope="col" class="c-boost">${t('hBoost')}</th>
    </tr>`;
  }

  function rowsHTML(team) {
    const list = state.players.filter(p => p.TeamNum === team).sort((a, b) => (b.Score || 0) - (a.Score || 0));
    const cols = 10;
    if (!list.length) return `<tr class="empty-row"><td colspan="${cols}">${t('noPlayers')}</td></tr>`;
    return list.map(p => {
      const hit = state.maxHit[p.Name];
      const plat = platform(p.PrimaryId);
      // The game omits fields that are 0: bHasCar without Boost means 0. No bHasCar
      // means no data (online, opponents outside replays).
      const known = 'bHasCar' in p;
      const b = typeof p.Boost === 'number' ? Math.max(0, Math.min(100, Math.round(p.Boost))) : 0;
      const boost = `<td class="boost-cell"${known ? '' : ` title="${t('noData')}"`}><div class="boost-wrap"><span class="boost"><i style="width:${known ? b : 0}%"></i></span><span class="boost-num">${known ? b : '—'}</span></div></td>`;
      return `<tr class="${p.Name === me ? 'me' : ''}">
        <td><span class="name">${esc(p.Name)}</span>${plat ? `<span class="plat">${plat}</span>` : ''}</td>
        <td class="pts">${p.Score ?? 0}</td><td>${p.Goals ?? 0}</td><td>${p.Assists ?? 0}</td>
        <td>${p.Saves ?? 0}</td><td>${p.Shots ?? 0}</td><td>${p.Touches ?? 0}</td><td>${p.Demos ?? 0}</td>
        <td>${hit ? Math.round(hit) + ' km/h' : '–'}</td>${boost}
      </tr>`;
    }).join('');
  }

  // UpdateState arrives ~30 times/s, but redrawing the tables more than ~10 times/s
  // adds nothing visible and costs CPU on a PC that is running the game (and maybe OBS).
  const RENDER_MS = 100;
  let renderTimer = null, lastRender = 0;
  function scheduleRender() {
    if (renderTimer) return;
    renderTimer = setTimeout(render, Math.max(0, lastRender + RENDER_MS - performance.now()));
  }

  // Only touch the DOM when the content actually changes
  const drawn = {};
  function setHTML(id, html) { if (drawn[id] !== html) { drawn[id] = html; $(id).innerHTML = html; } }
  function setText(id, txt) { txt = String(txt); if (drawn[id] !== txt) { drawn[id] = txt; $(id).textContent = txt; } }

  function render() {
    clearTimeout(renderTimer); renderTimer = null;
    lastRender = performance.now();
    [0, 1].forEach(i => {
      setText('n' + i, teamName(i));
      setText('g' + i, state.teams[i]?.Score ?? 0);
      setHTML('rows' + i, rowsHTML(i));
    });
    setText('arena', state.arena ? t('map', { v: state.arena }) : '');
    const inMatch = state.players.some(p => p.Name === me);
    setHTML('meStatus', me && inMatch ? t('youAre', { v: esc(me) })
      : state.players.length ? t('notDetected') : '');
    renderClock();
    renderTouch();
  }

  function inReplay() { return state.replay || state.goalReplay; }
  function recentlySeen(key, ms) { const ts = state.seen[key]; return ts && Date.now() - ts < ms; }

  // Avoids duplicates: ignores whatever happens during replays and
  // identical copies of the same event within the given window.
  // Plays are stored as data and turned into text on each draw, so they follow the language.
  function addFeed(item, key, opts = {}) {
    const win = opts.window || 1000;
    if (!opts.always && inReplay()) return;
    if (key && recentlySeen(key, win)) return;
    if (key) state.seen[key] = Date.now();
    state.feed.unshift({ time: (state.ot ? '+' : '') + fmtClock(state.time), item, key, at: Date.now(), who: opts.who || [] });
    drawFeed();
  }
  function feedHTML(it) {
    switch (it.k) {
      case 'goal':
        return t('fGoal', { p: playerSpan(it.p) })
          + (it.speed !== null ? t('fSpeed', { v: it.speed }) : '')
          + (it.assister ? t('fAssist', { p: playerSpan(it.assister) }) : '');
      case 'stat':
        return t('fStat', { label: esc(it.label), p: playerSpan(it.p) }) + (it.sec ? t('fDemoOn', { p: playerSpan(it.sec) }) : '');
      case 'bar': return t('fBar', { p: playerSpan(it.p) });
      case 'end': return t('fEnd', { team: teamSpan(it.team, it.name) });
    }
    return '';
  }
  function drawFeed() {
    state.feed = state.feed.slice(0, 12);
    // Your own plays are highlighted; checked on each draw because "you" may be detected later
    $('feed').innerHTML = state.feed.map(f =>
      `<li${me && f.who.includes(me) ? ' class="mine"' : ''}><time>${f.time}</time><span>${feedHTML(f.item)}</span></li>`).join('');
    $('feedEmpty').hidden = state.feed.length > 0;
  }

  function flashGoal(team) {
    const el = $('g' + team);
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  // Log download
  function updateLogUI() {
    $('logCount').textContent = log.length;
    $('logBtn').disabled = log.length === 0;
    const btn = $('recBtn');
    btn.setAttribute('aria-pressed', String(recording));
    btn.textContent = t(!recording ? 'record' : log.length >= LOG_MAX ? 'logFull' : 'stopRecord');
  }
  $('recBtn').addEventListener('click', () => {
    recording = !recording;
    // Starting a new recording discards the previous one
    if (recording) { log.length = 0; loggedLoadout.clear(); }
    updateLogUI();
  });

  $('logBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(log)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rl-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  // ---------- Static texts and language switch ----------
  function applyLanguage() {
    const root = document.documentElement;
    root.lang = lang;
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml, { ws: `<code>${esc(WS_URL)}</code>` }); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    // The "You" badge is drawn by CSS (::after)
    root.style.setProperty('--me-label', JSON.stringify(t('youBadge')));
    [0, 1].forEach(i => { $('head' + i).innerHTML = headHTML(); });
    setStatus(statusKind, statusKey);
    updateLogUI();
    drawn.touch = null; // team fallback names depend on the language
    render();
    drawFeed();
    renderSession();
  }
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.lang === lang) return;
    lang = b.dataset.lang;
    save('rl-lang', lang);
    applyLanguage();
  }));

  // ---------- Demo mode ----------
  $('demoBtn').addEventListener('click', () => {
    if (demo) { stopDemo(); connect(); }
    else { if (ws) { ws.onclose = null; ws.close(); } clearTimeout(retry); startDemo(); }
  });

  function startDemo() {
    $('demoBtn').setAttribute('aria-pressed', 'true');
    $('help').hidden = true;
    setStatus('ok', 'demoStatus');
    // Demo mode uses its own throwaway session, seeded with a few results
    realSession = session; sessionPersist = false;
    session = newSession();
    [[3, 1, 1, 1, 2, 3, 0, true], [2, 4, 1, 0, 1, 4, 1, false], [2, 1, 0, 2, 3, 1, 0, false]].forEach(([my, opp, goals, assists, saves, shots, demos, mvp], i) =>
      session.matches.push({ id: 'demo-seed-' + i, at: Date.now(), won: my > opp, abandoned: false, my, opp, goals, assists, saves, shots, demos, score: 0, mvp }));
    renderSession();
    // The game sends play types and team names in its own language: the demo uses the panel's
    const gameText = { save: t('demoSave'), demolish: t('demoDemolish'), orange: t('orange') };
    const names = [['Nova', 0, 'Steam'], ['Rafa_RL', 0, 'Epic'], ['Lucía', 0, 'PS4'], ['Kaiser', 1, 'XboxOne'], ['NoPressure', 1, 'Steam'], ['Turbo99', 1, 'Switch']];
    const P = names.map(([Name, TeamNum, plat], i) => ({ Name, PrimaryId: `${plat}|${1000 + i}|0`, TeamNum, Shortcut: i + 1, Score: 0, Goals: 0, Shots: 0, Assists: 0, Saves: 0, Touches: 0, CarTouches: 0, Demos: 0 }));
    const sim = { time: 300, ot: false, score: [0, 0], ticks: 0, match: 1 };
    const send = (Event, Data) => handleRaw(JSON.stringify({ Event, Data }), true);
    const ref = p => ({ Name: p.Name, Shortcut: p.Shortcut, TeamNum: p.TeamNum });
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    // Same order as online: MVP, then MatchEnded; then a new match with a new MatchGuid
    const endMatch = winner => {
      const mvp = P.filter(p => p.TeamNum === winner).sort((a, b) => b.Score - a.Score)[0];
      send('StatfeedEvent', { EventName: 'MVP', Type: 'MVP', MainTarget: ref(mvp) });
      send('MatchEnded', { WinnerTeamNum: winner });
      Object.assign(sim, { time: 300, ot: false, score: [0, 0], match: sim.match + 1 });
      P.forEach(p => Object.assign(p, { Score: 0, Goals: 0, Shots: 0, Assists: 0, Saves: 0, Touches: 0, Demos: 0 }));
      state.maxHit = {};
    };
    send('MatchCreated', {});
    demo = setInterval(() => {
      sim.ticks++;
      if (sim.ticks % 10 === 0) {
        if (!sim.ot) { sim.time -= 1; if (sim.time <= 0) { if (sim.score[0] === sim.score[1]) { sim.ot = true; sim.time = 0; } else endMatch(sim.score[0] > sim.score[1] ? 0 : 1); } }
        else sim.time += 1;
      }
      if (Math.random() < 0.25) {
        const p = pick(P); p.Touches++; p.Score += 2;
        send('BallHit', { Players: [ref(p)], Ball: { PreHitSpeed: 30, PostHitSpeed: 20 + Math.random() * 105, Location: { X: (Math.random() * 2 - 1) * 3600, Y: (p.TeamNum ? -1 : 1) * (Math.random() * 1.4 - 0.5) * 4600, Z: 100 } } });
      }
      if (Math.random() < 0.006) { const p = pick(P); p.Shots++; p.Score += 10; }
      if (Math.random() < 0.004) { const p = pick(P); p.Saves++; p.Score += 50; send('StatfeedEvent', { EventName: 'Save', Type: gameText.save, MainTarget: ref(p) }); }
      if (Math.random() < 0.003) { const a = pick(P), v = pick(P.filter(x => x.TeamNum !== a.TeamNum)); a.Demos++; a.Score += 15; send('StatfeedEvent', { EventName: 'Demolish', Type: gameText.demolish, MainTarget: ref(a), SecondaryTarget: ref(v) }); }
      if (Math.random() < 0.004) {
        const s = pick(P); s.Goals++; s.Shots++; s.Score += 100; sim.score[s.TeamNum]++;
        const mates = P.filter(x => x.TeamNum === s.TeamNum && x !== s);
        const as = Math.random() < 0.5 ? pick(mates) : null;
        if (as) { as.Assists++; as.Score += 50; }
        send('GoalScored', { GoalSpeed: 60 + Math.random() * 60, ImpactLocation: { X: (Math.random() * 2 - 1) * 800, Y: (s.TeamNum ? -1 : 1) * 5200, Z: 200 }, Scorer: ref(s), Assister: as ? ref(as) : undefined, BallLastTouch: { Player: ref(s), Speed: 100 } });
        if (sim.ot) endMatch(s.TeamNum);
      }
      if (sim.ticks % 3 === 0) {
        send('UpdateState', {
          MatchGuid: 'demo-' + sim.match,
          // Like online: car and boost only for your own team, and Boost omitted when 0
          Players: P.map(p => {
            const o = { ...p };
            if (p.TeamNum === 0) {
              p.boost = Math.max(0, Math.min(100, (p.boost ?? 33) + (Math.random() < 0.1 ? 40 : -Math.random() * 6)));
              o.bHasCar = true;
              if (Math.round(p.boost)) o.Boost = Math.round(p.boost);
            }
            delete o.boost;
            return o;
          }),
          Game: { Teams: [{ Name: 'Night Owls', TeamNum: 0, Score: sim.score[0], ColorPrimary: '7B2CBF', ColorSecondary: 'FFD60A' }, { Name: gameText.orange, TeamNum: 1, Score: sim.score[1], ColorPrimary: 'FF7F00', ColorSecondary: 'AA4400' }], TimeSeconds: sim.time, bOvertime: sim.ot, Ball: { Speed: 900, TeamNum: state.ballTeam }, bReplay: false, bHasWinner: false, Winner: '', Arena: 'Stadium_P', bHasTarget: true, Target: { Name: 'Nova', Shortcut: 1, TeamNum: 0 } },
        });
      }
    }, 100);
  }

  function stopDemo() {
    clearInterval(demo); demo = null;
    $('demoBtn').setAttribute('aria-pressed', 'false');
    state = freshState(); applyTeamColors();
    session = realSession; sessionPersist = true; renderSession();
    $('feed').innerHTML = ''; $('feedEmpty').hidden = false;
    render();
  }

  applyLanguage();
  if (params.has('demo')) startDemo(); else connect();
})();
