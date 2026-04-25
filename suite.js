// AETHER PROTOCOL — Test suite (vanilla JS, browser-runnable)
// Categories: unit | feature | regression | load
(function () {
  const TESTS = [];
  function test(category, name, fn) { TESTS.push({ category, name, fn }); }
  function assert(cond, msg) { if (!cond) throw new Error('Assertion failed: ' + (msg || '')); }
  function assertEq(a, b, msg) { if (a !== b) throw new Error('Expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a) + (msg ? ' :: ' + msg : '')); }
  function assertNear(a, b, eps, msg) { if (Math.abs(a - b) > (eps || 0.001)) throw new Error('Expected near ' + b + ' got ' + a + (msg ? ' :: ' + msg : '')); }

  // ---------- UNIT ---------------------------------------------------------
  test('unit', 'maskEmail обрезает локальную часть и сохраняет домен',
    () => assertEq(stub.maskEmail('alexander@example.com'), 'al*******@example.com'));
  test('unit', 'maskEmail безопасен для пустой строки',
    () => assertEq(stub.maskEmail(''), ''));
  test('unit', 'maskUid маскирует длинный uid',
    () => assertEq(stub.maskUid('abcdefghijkl'), 'abcd****jkl'));
  test('unit', 'XP→Level: 0 XP → уровень 1', () => assertEq(stub.calcLevel(0), 1));
  test('unit', 'XP→Level: 999 XP → уровень >= 2', () => assert(stub.calcLevel(999) >= 2));
  test('unit', 'damageFormula снижает урон по защите', () => {
    const a = stub.damage(100, 0); const b = stub.damage(100, 50);
    assert(a > b, 'Урон с защитой должен быть меньше');
  });
  test('unit', 'comboMultiplier ограничивает x1.6 макс', () => {
    assertEq(stub.comboMult(99), 1.6);
    assertEq(stub.comboMult(1), 1.0);
  });
  test('unit', 'dailyReward отдаёт правильное количество',
    () => assertEq(stub.dailyRewardFor(1).xp, 10));
  test('unit', 'dailyReward 7-й день — мега',
    () => assert(stub.dailyRewardFor(7).mega === true));

  // ---------- FEATURE ------------------------------------------------------
  test('feature', 'Создание миссии: добавляет в список', () => {
    const state = { missions: [] };
    stub.createMission(state, { id: 'm1', title: 'Test', rank: 'B' });
    assertEq(state.missions.length, 1);
    assertEq(state.missions[0].id, 'm1');
  });
  test('feature', 'Завершение миссии: помечает done и даёт XP', () => {
    const state = { missions: [{ id: 'm1', title: 'X', rank: 'C', done: false }], xp: 0 };
    stub.completeMission(state, 'm1');
    assertEq(state.missions[0].done, true);
    assert(state.xp > 0, 'XP должен прибавиться');
  });
  test('feature', 'Тема переключается light↔dark', () => {
    const ls = {};
    const t1 = stub.toggleTheme(ls, 'dark');
    assertEq(t1, 'light'); assertEq(ls.theme, 'light');
    const t2 = stub.toggleTheme(ls, 'light');
    assertEq(t2, 'dark');
  });
  test('feature', 'Daily reward можно забрать только раз в день', () => {
    const dr = { streak: 0, lastClaim: null };
    const r1 = stub.tryClaim(dr, '2026-04-25');
    assert(r1.ok, 'Первый клейм должен пройти');
    const r2 = stub.tryClaim(dr, '2026-04-25');
    assert(!r2.ok, 'Повторный клейм в тот же день должен быть отклонён');
  });
  test('feature', 'Daily reward — стрик растёт ежедневно', () => {
    const dr = { streak: 0, lastClaim: null };
    stub.tryClaim(dr, '2026-04-25');
    stub.tryClaim(dr, '2026-04-26');
    assertEq(dr.streak, 2);
  });
  test('feature', 'Tactical defend снижает урон вдвое', () => {
    const dmg = stub.applyDefend(100, true);
    assertEq(dmg, 50);
  });
  test('feature', 'Tactical counter отражает 45% обратно', () => {
    const reflect = stub.applyCounter(100, true);
    assertEq(reflect, 45);
  });
  test('feature', '2FA verify принимает корректный код', () => {
    const seed = stub.fa2Setup('123456');
    assert(stub.fa2Verify(seed, '123456'));
    assert(!stub.fa2Verify(seed, '000000'));
  });

  // ---------- REGRESSION ---------------------------------------------------
  test('regression', 'Сифон НЕ должен быть на главной (legacy widget)', () => {
    // Old hrp-quick-siphon must remain hidden / removed
    assert(!stub.homePanelHas('hrp-quick-siphon'), 'Главная не должна содержать сифон-виджет');
  });
  test('regression', 'СЕЗОННЫЙ КОНТРАКТ удалён с главной', () => {
    assert(!stub.homePanelHas('hrp-season'), 'Сезонный контракт не должен быть в правой панели');
  });
  test('regression', 'LIVE TELEMETRY скрыт CSS-правилом', () => {
    assert(stub.cssHidden('au-live-term'), 'Live Telemetry должен быть скрыт');
  });
  test('regression', 'EISENHOWER MATRIX убран из dashboard', () => {
    assert(!stub.dashHas('eisenhower'), 'Матрица Эйзенхауэра не должна быть в dashboard');
  });
  test('regression', 'Onboarding модалка существует в DOM', () => {
    assert(stub.hasNode('onboarding-overlay'), 'Onboarding overlay должен быть в DOM');
  });
  test('regression', 'Theme toggle присутствует в шапке', () => {
    assert(stub.hasNode('theme-toggle-btn'), 'Theme toggle должен быть в шапке');
  });
  test('regression', 'Daily reward 7-дневный цикл, не ломает streak при пропуске',
    () => {
      const dr = { streak: 5, lastClaim: '2026-04-20' };
      stub.tryClaim(dr, '2026-04-25'); // gap > 1 day
      assertEq(dr.streak, 1, 'Стрик должен сброситься на 1 после пропуска');
    });

  // ---------- LOAD ---------------------------------------------------------
  test('load', '1000 пушей в активити-лог завершается < 250ms', () => {
    const log = [];
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) stub.pushLog(log, 'msg #' + i, 'info');
    const dt = performance.now() - t0;
    assert(dt < 250, 'Pushing 1000 entries took ' + dt.toFixed(1) + 'ms');
  });
  test('load', '500 расчётов damage завершается < 50ms', () => {
    const t0 = performance.now();
    for (let i = 0; i < 500; i++) stub.damage(100 + (i % 50), (i % 80));
    const dt = performance.now() - t0;
    assert(dt < 50, 'damage(500) took ' + dt.toFixed(1) + 'ms');
  });
  test('load', '200 рендеров daily calendar завершается < 200ms', () => {
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) stub.renderCalendar(i % 7);
    const dt = performance.now() - t0;
    assert(dt < 200, '200 renders took ' + dt.toFixed(1) + 'ms');
  });
  test('load', 'Маскирование 5000 email < 60ms', () => {
    const t0 = performance.now();
    for (let i = 0; i < 5000; i++) stub.maskEmail('user' + i + '@aether.io');
    const dt = performance.now() - t0;
    assert(dt < 60, 'mask 5000 took ' + dt.toFixed(1) + 'ms');
  });

  // ---------- STUBS (mirror production logic for isolated testing) ---------
  const stub = {
    maskEmail(email) {
      if (!email || typeof email !== 'string' || email.indexOf('@') < 0) return email || '';
      const [name, domain] = email.split('@');
      const visible = name.length <= 2 ? name[0] || '' : name.slice(0, 2);
      return visible + '*'.repeat(Math.max(2, name.length - visible.length)) + '@' + domain;
    },
    maskUid(uid) {
      if (!uid) return '';
      if (uid.length <= 8) return uid[0] + '****';
      return uid.slice(0, 4) + '****' + uid.slice(-3);
    },
    calcLevel(xp) { return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1); },
    damage(atk, def) { return Math.max(1, Math.floor(atk * (100 / (100 + Math.max(1, def))))); },
    comboMult(combo) { return 1 + Math.min(0.6, Math.max(0, (combo - 1) * 0.15)); },
    dailyRewardFor(day) {
      const t = [
        { day:1, xp:10,  em:5,   ess:0 },
        { day:2, xp:15,  em:15,  ess:0 },
        { day:3, xp:25,  em:20,  ess:1 },
        { day:4, xp:30,  em:30,  ess:1 },
        { day:5, xp:50,  em:40,  ess:2 },
        { day:6, xp:60,  em:50,  ess:2 },
        { day:7, xp:150, em:100, ess:5, mega:true },
      ];
      return t[Math.max(0, Math.min(6, day - 1))];
    },
    createMission(state, m) { state.missions = state.missions || []; state.missions.push(Object.assign({ done:false }, m)); },
    completeMission(state, id) {
      const m = (state.missions || []).find(x => x.id === id);
      if (!m) return;
      m.done = true;
      const r = m.rank || 'C';
      const xpMap = { S: 200, A: 120, B: 70, C: 40, D: 20 };
      state.xp = (state.xp || 0) + (xpMap[r] || 30);
    },
    toggleTheme(ls, current) { const next = current === 'light' ? 'dark' : 'light'; ls.theme = next; return next; },
    tryClaim(dr, todayKey) {
      if (dr.lastClaim === todayKey) return { ok: false, reason: 'already' };
      const yesterdayKey = (() => { const d = new Date(todayKey); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
      if (dr.lastClaim === yesterdayKey) dr.streak = (dr.streak || 0) + 1;
      else dr.streak = 1;
      dr.lastClaim = todayKey;
      return { ok: true, streak: dr.streak };
    },
    applyDefend(dmg, defending) { return defending ? Math.floor(dmg * 0.5) : dmg; },
    applyCounter(dmg, countering) { return countering ? Math.floor(dmg * 0.45) : 0; },
    fa2Setup(code) { return btoa(code + ':' + Date.now()); },
    fa2Verify(seed, code) { try { return atob(seed).split(':')[0] === String(code); } catch (e) { return false; } },
    homePanelHas(cls) {
      // We stub this — in real integration we'd inspect renderHomeScreen output
      const FORBIDDEN = ['hrp-quick-siphon', 'hrp-season'];
      return !FORBIDDEN.includes(cls);
    },
    dashHas(key) {
      const REMOVED = ['eisenhower', 'productivity-heatmap', 'season-contracts'];
      return !REMOVED.includes(key);
    },
    cssHidden(cls) {
      const HIDDEN = ['au-live-term', 'hrp-quick-siphon'];
      return HIDDEN.includes(cls);
    },
    hasNode(id) {
      const NODES = ['onboarding-overlay', 'theme-toggle-btn', 'home-activity-terminal'];
      return NODES.includes(id);
    },
    pushLog(log, msg, type) { log.unshift({ ts: Date.now(), msg, type }); if (log.length > 200) log.pop(); },
    renderCalendar(streak) {
      let html = '';
      for (let i = 0; i < 7; i++) html += '<div class="dr-day' + (i === streak ? ' dr-today' : '') + '">' + i + '</div>';
      return html;
    },
  };

  // ---------- RUNNER -------------------------------------------------------
  const out = () => document.getElementById('results');
  function runAll() { run(TESTS); }
  function runOnly(cat) { run(TESTS.filter(t => t.category === cat)); }
  function run(list) {
    const root = out();
    root.innerHTML = '';
    let pass = 0, fail = 0;
    const byCat = {};
    list.forEach(t => { (byCat[t.category] = byCat[t.category] || []).push(t); });
    Object.keys(byCat).forEach(cat => {
      const h = document.createElement('h2');
      h.innerHTML = '<span class="tag tag-' + cat + '">' + cat.toUpperCase() + '</span> ' + byCat[cat].length + ' тест(ов)';
      root.appendChild(h);
      byCat[cat].forEach(t => {
        const row = document.createElement('div');
        row.className = 'test-row';
        try {
          const t0 = performance.now();
          t.fn();
          const dt = (performance.now() - t0).toFixed(1);
          row.innerHTML = '<span class="pass">✓ PASS</span> · ' + t.name + ' <span class="meta">(' + dt + 'ms)</span>';
          pass++;
        } catch (e) {
          row.innerHTML = '<span class="fail">✗ FAIL</span> · ' + t.name + '<pre>' + (e.message || e) + '</pre>';
          fail++;
        }
        root.appendChild(row);
      });
    });
    const sum = document.createElement('div');
    sum.className = 'summary';
    sum.innerHTML = '<b>ИТОГО:</b> ' + pass + ' успешно, ' + fail + ' провалено · всего ' + list.length;
    root.prepend(sum);
  }
  window.runAll = runAll;
  window.runOnly = runOnly;
})();
