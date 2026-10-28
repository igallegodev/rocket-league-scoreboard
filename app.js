(() => {
  const params = new URLSearchParams(location.search);
  const PORT = parseInt(params.get('port') || '49124', 10);
  const WS_URL = `ws://127.0.0.1:${PORT}`;
  // The docs say uu/s, but real speed values already arrive in km/h

  const $ = id => document.getElementById(id);
  $('wsUrl').textContent = WS_URL;

  // ---------- State ----------
  let state = freshState();
  // ?me=Name sets who you are and turns off auto-detection
  const meParam = params.get('me') || '';
  let me = meParam || load('rl-me') || '';
  // Team name exactly as the game sends it
  function teamName(t) { return state.teams[t]?.Name || (t ? 'Orange' : 'Blue'); }

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
    [0, 1].forEach(t => {
      const hex = state.teams[t]?.Color || '';
      if (hex === appliedColors[t] && !force) return;
      appliedColors[t] = hex;
      const v = t ? 'orange' : 'blue';
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
  let ws = null, retry = null, demo = null;

  function freshState() {
    return {
      players: [], teams: [{ Name: 'Blue', Score: 0 }, { Name: 'Orange', Score: 0 }],
      time: 300, ot: false, ballTeam: 255, arena: '', winner: '', replay: false,
      maxHit: {}, feed: [], hasBoost: false, goalReplay: false, seen: {}, meLocked: false,
    };
  }
  function load(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function save(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} }

  // ---------- Connection ----------
  function setStatus(kind, text) {
    $('dot').className = 'dot' + (kind === 'ok' ? ' ok' : kind === 'wait' ? ' wait' : '');
    $('statusText').textContent = text;
  }

  function connect() {
    if (demo) return;
    clearTimeout(retry);
    setStatus('wait', 'Conectando…');
    if (ws) { ws.onclose = ws.onmessage = ws.onopen = null; try { ws.close(); } catch {} }
    try { ws = new WebSocket(WS_URL); }
    catch { scheduleRetry(); return; }
    ws.onopen = () => { setStatus('ok', 'Conectado al juego'); $('help').hidden = true; };
    ws.onmessage = e => handleRaw(e.data);
    ws.onclose = () => { if (!demo) { setStatus('bad', 'Sin conexión, reintentando'); $('help').hidden = false; scheduleRetry(); } };
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
        addFeed(`<span class="goal">Fin del partido.</span> Gana ${teamSpan(d.WinnerTeamNum, teamName(d.WinnerTeamNum))}`, 'end', { always: true, window: 30000 });
        break;
      case 'CrossbarHit': {
        const p = d.BallLastTouch?.Player;
        if (p) addFeed(`Larguero de ${playerSpan(p)}`, 'bar|' + p.Name, { window: 300 });
        break;
      }
      case 'GoalReplayStart': state.goalReplay = true; renderClock(); break;
      case 'GoalReplayEnd': case 'RoundStarted': case 'CountdownBegin': state.goalReplay = false; renderClock(); break;
    }
  }

  function onUpdate(d) {
    if (Array.isArray(d.Players)) {
      state.players = d.Players;
      state.hasBoost = d.Players.some(p => typeof p.Boost === 'number');
    }
    const g = d.Game || {};
    if (Array.isArray(g.Teams)) {
      g.Teams.forEach(t => {
        const old = state.teams[t.TeamNum];
        if (old && t.Score > old.Score) flashGoal(t.TeamNum);
        state.teams[t.TeamNum] = { Name: t.Name, Score: t.Score, Color: t.ColorPrimary };
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
    render();
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
    if (me !== name) { me = name; save('rl-me', me); }
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
    let speed = '';
    if (typeof d.GoalSpeed === 'number') {
      const kmh = d.GoalSpeed;
      speed = ` a ${Math.round(kmh)} km/h`;
    }
    const assist = d.Assister ? `, asistencia de ${playerSpan(d.Assister)}` : '';
    addFeed(`<span class="goal">Gol</span> de ${playerSpan(s)}${speed}${assist}`, 'goal|' + s.Name, { window: 300 });
  }

  const STAT_SKIP = new Set(['Goal', 'Shot', 'Assist', 'Win', 'MVP']);

  function onStat(d) {
    if (!d.MainTarget || STAT_SKIP.has(d.EventName)) return;
    // Text exactly as the game shows it (already in the game's language)
    const label = d.Type || d.EventName;
    const extra = d.SecondaryTarget && d.EventName === 'Demolish' ? ` a ${playerSpan(d.SecondaryTarget)}` : '';
    // Offline, the game can send the same stat event several times in the same
    // millisecond (up to 4 copies seen): only the first copy is kept.
    addFeed(`${label} de ${playerSpan(d.MainTarget)}${extra}`,
      'stat|' + d.EventName + '|' + d.MainTarget.Name + '|' + (d.SecondaryTarget?.Name || ''), { window: 300 });
  }

  // ---------- Render ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const teamSpan = (t, txt) => `<span class="${t === 0 ? 'b' : 'o'}">${esc(txt)}</span>`;
  const playerSpan = p => teamSpan(p.TeamNum, p.Name);

  function fmtClock(sec) {
    sec = Math.max(0, Math.floor(sec));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }

  function renderClock() {
    const c = $('clock');
    c.textContent = (state.ot ? '+' : '') + fmtClock(state.time);
    c.classList.toggle('ot', state.ot);
    let sub = '';
    if (state.winner) {
      const i = state.teams.findIndex(t => t && t.Name === state.winner);
      sub = `Ganador: ${i >= 0 ? teamName(i) : state.winner}`;
    }
    else if (inReplay()) sub = 'Repetición';
    else if (state.ot) sub = 'Prórroga';
    $('sub').textContent = sub;
  }

  function renderTouch() {
    const mark = $('touchMark');
    const t = state.ballTeam;
    if (t === 0) { mark.style.left = '0'; mark.style.background = 'var(--blue)'; $('touchText').textContent = teamName(0); }
    else if (t === 1) { mark.style.left = '50%'; mark.style.background = 'var(--orange)'; $('touchText').textContent = teamName(1); }
    else { mark.style.left = '25%'; mark.style.background = 'transparent'; $('touchText').textContent = '—'; }
  }

  function headHTML() {
    return `<tr>
      <th scope="col">Jugador</th><th scope="col" class="c-num">Puntos</th><th scope="col" class="c-num">Goles</th>
      <th scope="col" class="c-num">Asist.</th><th scope="col" class="c-num">Paradas</th><th scope="col" class="c-num">Tiros</th>
      <th scope="col" class="c-num">Toques</th><th scope="col" class="c-num">Demos</th><th scope="col" class="c-hit">Golpe máx.</th>
      <th scope="col" class="c-boost">Boost</th>
    </tr>`;
  }

  function rowsHTML(team) {
    const list = state.players.filter(p => p.TeamNum === team).sort((a, b) => (b.Score || 0) - (a.Score || 0));
    const cols = 10;
    if (!list.length) return `<tr class="empty-row"><td colspan="${cols}">Sin jugadores todavía</td></tr>`;
    return list.map(p => {
      const hit = state.maxHit[p.Name];
      // The game omits fields that are 0: bHasCar without Boost means 0. No bHasCar
      // means no data (online, opponents outside replays).
      const known = 'bHasCar' in p;
      const b = typeof p.Boost === 'number' ? Math.max(0, Math.min(100, Math.round(p.Boost))) : 0;
      const boost = `<td class="boost-cell"${known ? '' : ' title="Sin dato"'}><div class="boost-wrap"><span class="boost"><i style="width:${known ? b : 0}%"></i></span><span class="boost-num">${known ? b : '—'}</span></div></td>`;
      return `<tr class="${p.Name === me ? 'me' : ''}">
        <td><span class="name">${esc(p.Name)}</span></td>
        <td class="pts">${p.Score ?? 0}</td><td>${p.Goals ?? 0}</td><td>${p.Assists ?? 0}</td>
        <td>${p.Saves ?? 0}</td><td>${p.Shots ?? 0}</td><td>${p.Touches ?? 0}</td><td>${p.Demos ?? 0}</td>
        <td>${hit ? Math.round(hit) + ' km/h' : '–'}</td>${boost}
      </tr>`;
    }).join('');
  }

  function render() {
    [0, 1].forEach(t => {
      const team = state.teams[t] || {};
      $('n' + t).textContent = teamName(t);
      $('g' + t).textContent = team.Score ?? 0;
      $('head' + t).innerHTML = headHTML();
      $('rows' + t).innerHTML = rowsHTML(t);
    });
    $('arena').textContent = state.arena ? `Mapa: ${state.arena}` : '';
    const inMatch = state.players.some(p => p.Name === me);
    $('meStatus').innerHTML = me && inMatch ? `Eres <strong>${esc(me)}</strong>`
      : state.players.length ? 'Sin detectar quién eres' : '';
    renderClock();
    renderTouch();
  }

  function inReplay() { return state.replay || state.goalReplay; }
  function recentlySeen(key, ms) { const t = state.seen[key]; return t && Date.now() - t < ms; }

  // Avoids duplicates: ignores whatever happens during replays and
  // identical copies of the same event within the given window.
  function addFeed(html, key, opts = {}) {
    const win = opts.window || 1000;
    if (!opts.always && inReplay()) return;
    if (key && recentlySeen(key, win)) return;
    if (key) state.seen[key] = Date.now();
    state.feed.unshift({ time: (state.ot ? '+' : '') + fmtClock(state.time), html, key, at: Date.now() });
    drawFeed();
  }
  function drawFeed() {
    state.feed = state.feed.slice(0, 12);
    $('feed').innerHTML = state.feed.map(f => `<li><time>${f.time}</time><span>${f.html}</span></li>`).join('');
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
    btn.textContent = !recording ? 'Grabar registro'
      : log.length >= LOG_MAX ? 'Registro lleno' : 'Detener grabación';
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

  // ---------- Demo mode ----------
  $('demoBtn').addEventListener('click', () => {
    if (demo) { stopDemo(); connect(); }
    else { if (ws) { ws.onclose = null; ws.close(); } clearTimeout(retry); startDemo(); }
  });

  function startDemo() {
    $('demoBtn').setAttribute('aria-pressed', 'true');
    $('help').hidden = true;
    setStatus('ok', 'Modo demo (datos simulados)');
    const names = [['Nova', 0], ['Rafa_RL', 0], ['Lucía', 0], ['Kaiser', 1], ['NoPressure', 1], ['Turbo99', 1]];
    const P = names.map(([Name, TeamNum], i) => ({ Name, TeamNum, Shortcut: i + 1, Score: 0, Goals: 0, Shots: 0, Assists: 0, Saves: 0, Touches: 0, CarTouches: 0, Demos: 0 }));
    const sim = { time: 300, ot: false, score: [0, 0], ticks: 0 };
    const send = (Event, Data) => handleRaw(JSON.stringify({ Event, Data }), true);
    const ref = p => ({ Name: p.Name, Shortcut: p.Shortcut, TeamNum: p.TeamNum });
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    send('MatchCreated', {});
    demo = setInterval(() => {
      sim.ticks++;
      if (sim.ticks % 10 === 0) {
        if (!sim.ot) { sim.time -= 1; if (sim.time <= 0) { if (sim.score[0] === sim.score[1]) { sim.ot = true; sim.time = 0; } else { send('MatchEnded', { WinnerTeamNum: sim.score[0] > sim.score[1] ? 0 : 1 }); sim.time = 300; sim.score = [0, 0]; P.forEach(p => Object.assign(p, { Score: 0, Goals: 0, Shots: 0, Assists: 0, Saves: 0, Touches: 0, Demos: 0 })); state.maxHit = {}; } } }
        else sim.time += 1;
      }
      if (Math.random() < 0.25) {
        const p = pick(P); p.Touches++; p.Score += 2;
        send('BallHit', { Players: [ref(p)], Ball: { PreHitSpeed: 30, PostHitSpeed: 20 + Math.random() * 140, Location: { X: (Math.random() * 2 - 1) * 3600, Y: (p.TeamNum ? -1 : 1) * (Math.random() * 1.4 - 0.5) * 4600, Z: 100 } } });
      }
      if (Math.random() < 0.006) { const p = pick(P); p.Shots++; p.Score += 10; }
      if (Math.random() < 0.004) { const p = pick(P); p.Saves++; p.Score += 50; send('StatfeedEvent', { EventName: 'Save', Type: 'Salvada', MainTarget: ref(p) }); }
      if (Math.random() < 0.003) { const a = pick(P), v = pick(P.filter(x => x.TeamNum !== a.TeamNum)); a.Demos++; a.Score += 15; send('StatfeedEvent', { EventName: 'Demolish', Type: 'Demolición', MainTarget: ref(a), SecondaryTarget: ref(v) }); }
      if (Math.random() < 0.004) {
        const s = pick(P); s.Goals++; s.Shots++; s.Score += 100; sim.score[s.TeamNum]++;
        const mates = P.filter(x => x.TeamNum === s.TeamNum && x !== s);
        const as = Math.random() < 0.5 ? pick(mates) : null;
        if (as) { as.Assists++; as.Score += 50; }
        send('GoalScored', { GoalSpeed: 60 + Math.random() * 60, ImpactLocation: { X: (Math.random() * 2 - 1) * 800, Y: (s.TeamNum ? -1 : 1) * 5200, Z: 200 }, Scorer: ref(s), Assister: as ? ref(as) : undefined, BallLastTouch: { Player: ref(s), Speed: 100 } });
        if (sim.ot) { send('MatchEnded', { WinnerTeamNum: s.TeamNum }); sim.ot = false; sim.time = 300; sim.score = [0, 0]; P.forEach(p => Object.assign(p, { Score: 0, Goals: 0, Shots: 0, Assists: 0, Saves: 0, Touches: 0, Demos: 0 })); state.maxHit = {}; }
      }
      if (sim.ticks % 3 === 0) {
        send('UpdateState', {
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
          Game: { Teams: [{ Name: 'Night Owls', TeamNum: 0, Score: sim.score[0], ColorPrimary: '7B2CBF', ColorSecondary: 'FFD60A' }, { Name: 'Naranja', TeamNum: 1, Score: sim.score[1], ColorPrimary: 'FF7F00', ColorSecondary: 'AA4400' }], TimeSeconds: sim.time, bOvertime: sim.ot, Ball: { Speed: 900, TeamNum: state.ballTeam }, bReplay: false, bHasWinner: false, Winner: '', Arena: 'Stadium_P', bHasTarget: true, Target: { Name: 'Nova', Shortcut: 1, TeamNum: 0 } },
        });
      }
    }, 100);
  }

  function stopDemo() {
    clearInterval(demo); demo = null;
    $('demoBtn').setAttribute('aria-pressed', 'false');
    state = freshState(); applyTeamColors();
    $('feed').innerHTML = ''; $('feedEmpty').hidden = false;
    render();
  }

  render();
  if (params.has('demo')) startDemo(); else connect();
})();
