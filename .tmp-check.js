
/* ============================================================
   AETHER PROTOCOL — CORE ENGINE
   ============================================================ */
'use strict';

// ============================================================
// CONSTANTS
// ============================================================
const RANK_CONFIG = {
  D: { xp: 5,   emeralds: 2,  label: 'D',  burnout: false, burnoutChance: 0 },
  C: { xp: 15,  emeralds: 5,  label: 'C',  burnout: false, burnoutChance: 0 },
  B: { xp: 30,  emeralds: 12, label: 'B',  burnout: false, burnoutChance: 0.1 },
  A: { xp: 60,  emeralds: 25, label: 'A',  burnout: true,  burnoutChance: 0.2 },
  S: { xp: 150, emeralds: 60, label: 'S',  burnout: true,  burnoutChance: 0.35 }
};

const XP_PER_LEVEL = (lvl) => Math.floor(100 * Math.pow(1.35, lvl - 1));

const ARTIFACT_CATALOG = [
  {
    id: 'shield_of_silence',
    name: 'Щит Безмолвия',
    tier: 'rare',
    cost: 50,
    desc: 'Реагирует на угрозу провала. Блокирует один удар.',
    effect: 'При провале ОДНОЙ миссии или дистилляции: потеря HP отменяется. Одноразовое.',
    power: 15,
    charges: 1,
    effectFn: (state) => { state.shieldActive = true; return state; }
  },
  {
    id: 'prism_of_focus',
    name: 'Призма Концентрации',
    tier: 'common',
    cost: 20,
    desc: 'Усиливает ментальные потоки. +20% XP за следующую сессию.',
    effect: '+20% XP от следующей завершённой дистилляции.',
    power: 8,
    charges: 3,
    effectFn: (state) => { state.xpBoostCharges = (state.xpBoostCharges || 0) + 1; return state; }
  },
  {
    id: 'mercury_of_speed',
    name: 'Ртуть Ускорения',
    tier: 'common',
    cost: 15,
    desc: 'Катализирует реакции. Время дистилляции -5 минут на следующий цикл.',
    effect: 'Следующий цикл фокуса сокращается на 5 минут.',
    power: 5,
    charges: 2,
    effectFn: (state) => { state.focusTimeReduction = (state.focusTimeReduction || 0) + 5; return state; }
  },
  {
    id: 'obsidian_core',
    name: 'Обсидиановый Кор',
    tier: 'epic',
    cost: 120,
    desc: 'Твёрдое ядро воли. Предотвращает Нейронное Выгорание.',
    effect: 'Нейронное Выгорание не срабатывает при провале S-ранга (3 применения).',
    power: 30,
    charges: 3,
    effectFn: (state) => { state.burnoutImmunity = (state.burnoutImmunity || 0) + 3; return state; }
  },
  {
    id: 'emerald_lens',
    name: 'Изумрудная Линза',
    tier: 'rare',
    cost: 60,
    desc: 'Преломляет добычу. Удваивает изумруды со следующих 5 миссий.',
    effect: 'x2 изумруды за следующие 5 выполненных миссий.',
    power: 20,
    charges: 5,
    effectFn: (state) => { state.emeraldDoubleCharges = (state.emeraldDoubleCharges || 0) + 5; return state; }
  },
  {
    id: 'void_sigil',
    name: 'Печать Пустоты',
    tier: 'relic',
    cost: 250,
    desc: 'Запечатывает пространство-время. Заморозить Левиафана на 24 часа.',
    effect: 'Левиафан не атакует 24 часа, даже при невыполненной квоте.',
    power: 50,
    charges: 1,
    effectFn: (state) => { state.leviathanFrozenUntil = Date.now() + 86400000; return state; }
  },
  {
    id: 'aether_conduit',
    name: 'Проводник Эфира',
    tier: 'epic',
    cost: 180,
    desc: 'Канал чистого эфира. +30 к боевой мощи в Арене.',
    effect: '+30 к силе атаки в дуэлях Арены.',
    power: 30,
    charges: -1,
    effectFn: (state) => { state.arenaPowerBonus = (state.arenaPowerBonus || 0) + 30; return state; }
  },
  {
    id: 'temporal_crystal',
    name: 'Темпоральный Кристалл',
    tier: 'legendary',
    cost: 500,
    desc: 'Осколок иного времени. Восстанавливает 30% здоровья немедленно.',
    effect: 'Немедленное восстановление 30% HP. Одноразовое.',
    power: 80,
    charges: 1,
    effectFn: (state) => {
      state.hp = Math.min(100, state.hp + 30);
      return state;
    }
  }
];

const COMPANION_CATALOG = [
  {
    id: 'chronocatcher',
    name: 'ХРОНОТКАЧ',
    title: 'Искажённый Странник',
    rarity: 'epic',
    cost: 200,
    portrait: '🜂',
    lore: 'Существо, сотканное из разрывов во времени. Его нити прошивают вероятности будущего.',
    passive: '+10% скорость способностей',
    active: '+8% уклонение',
    atkScale: 0.08,
    buff: { type: 'evasion', value: 0.08 }
  },
  {
    id: 'etherwatcher',
    name: 'ЭФИРНЫЙ НАБЛЮДАТЕЛЬ',
    title: 'Безликий Скиталец',
    rarity: 'rare',
    cost: 150,
    portrait: '⟡',
    lore: 'Существо из чистого эфира и шума. Видит за завесой, где никто не решается смотреть.',
    passive: '+10% шанс крит. удара',
    active: '+10% дальность обзора',
    atkScale: 0.07,
    buff: { type: 'crit', value: 0.1 }
  },
  {
    id: 'plasmareaper',
    name: 'ПЛАЗМЕННЫЙ ЖНЕЦ',
    title: 'Собиратель Долгов',
    rarity: 'relic',
    cost: 500,
    portrait: '⚚',
    lore: 'Воин, выкованный в плазме и долге. Его оружие поглощает волю поверженных.',
    passive: '+20% урон в ближнем бою',
    active: '+10% вампиризм',
    atkScale: 0.12,
    buff: { type: 'lifesteal', value: 0.1 }
  },
  {
    id: 'shadowarchitect',
    name: 'ТЕНЕВОЙ АРХИТЕКТОР',
    title: 'Строитель Реальностей',
    rarity: 'legendary',
    cost: 1200,
    portrait: '☬',
    lore: 'Сущность, переписавшая саму ткань пространства. Его чертеж становится кошмаром врага.',
    passive: '+25% урон способностей',
    active: '+15% шанс наложить хаос',
    atkScale: 0.16,
    buff: { type: 'chaos', value: 0.15 }
  },
  {
    id: 'voidoracle',
    name: 'ОРАКУЛ ПУСТОТЫ',
    title: 'Немой Пророк',
    rarity: 'epic',
    cost: 340,
    portrait: '◈',
    lore: 'Слышит эхо ещё не случившихся битв.',
    passive: '+6% крит',
    active: '+5% уклонение',
    atkScale: 0.09,
    buff: { type: 'crit', value: 0.06 }
  },
  {
    id: 'crystalwarden',
    name: 'КРИСТАЛЬНЫЙ СТРАЖ',
    title: 'Хранитель Осколков',
    rarity: 'rare',
    cost: 220,
    portrait: '✥',
    lore: 'Контролирует кристаллические шипы и отражения.',
    passive: '+6% защита',
    active: '+6% вампиризм',
    atkScale: 0.08,
    buff: { type: 'lifesteal', value: 0.06 }
  },
  {
    id: 'flamewraith',
    name: 'ПЛАМЕННЫЙ ПРИЗРАК',
    title: 'Пепельный Разлом',
    rarity: 'relic',
    cost: 620,
    portrait: '✶',
    lore: 'Горит, не сгорая, и оставляет за собой разрывы.',
    passive: '+12% урон',
    active: '+8% хаос',
    atkScale: 0.12,
    buff: { type: 'chaos', value: 0.08 }
  }
];


const COMPANION_ARTIFACT_CATALOG = [
  { id: 'rift_blade', slot: 'weapon', name: 'Клинок Разлома', cost: 260, compatible: ['chronocatcher','flamewraith','shadowarchitect'], bonuses: { flatPower: 28, heavyBonus: 0.12 }, desc: '+28 мощи, +12% к тяжёлому удару.' },
  { id: 'oracle_eye', slot: 'sigil', name: 'Око Оракула', cost: 220, compatible: ['etherwatcher','voidoracle'], bonuses: { crit: 0.12, burstBonus: 0.1 }, desc: '+12% крит, +10% burst.' },
  { id: 'blood_crystal', slot: 'core', name: 'Кровавый Кристалл', cost: 280, compatible: ['plasmareaper','crystalwarden'], bonuses: { lifesteal: 0.1, flatPower: 18 }, desc: '+10% вампиризм, +18 мощи.' },
  { id: 'veil_shard', slot: 'sigil', name: 'Осколок Завесы', cost: 190, compatible: ['chronocatcher','voidoracle','shadowarchitect'], bonuses: { evasion: 0.1, chaos: 0.06 }, desc: '+10% уклонение, +6% хаос.' },
  { id: 'abyss_core', slot: 'core', name: 'Ядро Бездны', cost: 360, compatible: ['shadowarchitect','plasmareaper','flamewraith'], bonuses: { chaos: 0.14, flatPower: 32 }, desc: '+14% хаос, +32 мощи.' }
];

const GUILD_DAILY_QUOTA = 5;
const STORAGE_KEY = 'aether_protocol_v2';
const USER_STORAGE_PREFIX = 'aether_protocol_uid_';
const FOCUS_PRESETS = {
  classic: { focus: 25, rest: 5 },
  deep: { focus: 50, rest: 10 },
  flow: { focus: 90, rest: 15 }
};
const DISTILLATION_TYPES = {
  coding: { xp: 1.25, emeralds: 1.15, essence: 1.2 },
  reading: { xp: 1.05, emeralds: 1, essence: 1.05 },
  creative: { xp: 1.15, emeralds: 1.1, essence: 1.25 },
  language: { xp: 1.1, emeralds: 1, essence: 1.1 },
  research: { xp: 1.2, emeralds: 1.05, essence: 1.2 }
};
const PRIORITY_ENERGY_COST = { urgent: 18, high: 12, normal: 8, low: 5 };
const ACHIEVEMENT_DEFS = [
  { id: 'profile_init', title: 'Пробуждение', desc: 'Создать профиль алхимика.', reward: { xp: 20, emeralds: 5 }, check: (gs) => !!gs.player.name },
  { id: 'mission_1', title: 'Первый Захват', desc: 'Завершить 1 миссию.', reward: { xp: 35, essences: 2 }, check: (gs) => (gs.player.totalMissions || 0) >= 1 },
  { id: 'streak_3', title: 'Пульс Эфира', desc: 'Набрать серию 3.', reward: { xp: 40, emeralds: 10 }, check: (gs) => (gs.player.streak || 0) >= 3 },
  { id: 'arena_1', title: 'Аренный Контур', desc: 'Победить в дуэли Арены.', reward: { xp: 50, emeralds: 15 }, check: (gs) => (gs.player.arenaWins || 0) >= 1 },
  { id: 'artifact_1', title: 'Лаб-Ритуал', desc: 'Провести трансмутацию.', reward: { essences: 8 }, check: (gs) => (gs.ownedArtifacts || []).length > 0 },
  { id: 'guild_quota', title: 'Квота Гильдии', desc: 'Закрыть дневную квоту.', reward: { xp: 60, emeralds: 20 }, check: (gs) => (gs.guild.dailyEnergy || 0) >= GUILD_DAILY_QUOTA },
  { id: 'daily_5', title: 'Оператор Дня', desc: 'Сделать 5 миссий за сутки.', reward: { xp: 80, essences: 6 }, check: (gs) => {
    const today = new Date().toISOString().slice(0,10);
    const doneToday = (gs.missions || []).filter(m => m.completedAt && m.completedAt.startsWith(today)).length;
    return doneToday >= 5;
  }},
  { id: 'void_sigil', title: 'Тишина Пустоты', desc: 'Открыть реликвию пустоты.', reward: { emeralds: 50 }, check: (gs) => (gs.ownedArtifacts || []).includes('void_sigil') }
];

// ============================================================
// GLOBAL STATE
// ============================================================
let GS = {
  player: {
    name: 'АЛХИМИК',
    hp: 100,
    maxHp: 100,
    energy: 100,
    maxEnergy: 100,
    lastEnergyTick: Date.now(),
    xp: 0,
    level: 1,
    emeralds: 0,
    totalMissions: 0,
    failedFocus: 0,
    streak: 0,
    avatar: ''
  },
  missions: [],
  essences: 0,
  achievements: {},
  auth: { uid: null, email: null },
  daily: { arenaChallengeDate: null, challengeCompleted: false, challengeRewardClaimed: false, restRecoveredOn: null },
  calendar: {},
  taskHistory: [],
  activityLog: [],
  ui: { flowState: false, presentationMode: true },
  season: { tier: 1, seasonXp: 0, weeklyContracts: [] },
  focus: {
    sessions: 0,
    cycle: 1,
    xpGained: 0,
    failCount: 0
  },
  guild: {
    exists: false,
    name: '',
    members: [],
    leviathanHp: 5000,
    leviathanMaxHp: 5000,
    dailyEnergy: 0,
    lastResetDate: null,
    weekly: { id: '', startDate: '', endDate: '', bossMaxHp: 30000, bossHp: 30000, lastStrikeDate: '', dailyNorm: 3 }
  },
  ownedArtifacts: [],
  ownedCompanions: [],
  activeCompanionId: null,
  ownedCompanionArtifacts: [],
  companionLoadouts: {},
  activeArtifactEffects: {},
  shieldActive: false,
  xpBoostCharges: 0,
  focusTimeReduction: 0,
  burnoutImmunity: 0,
  emeraldDoubleCharges: 0,
  leviathanFrozenUntil: 0,
  arenaPowerBonus: 0,
  arena: {
    combatLog: [],
    playerHp: 100,
    enemyHp: 100,
    playerMaxHp: 100,
    enemyMaxHp: 100,
    enemyName: 'АЛХИМИК ВАРАШ',
    inProgress: false,
    playerTurn: true
  },
  lastSave: null
};

// ============================================================
// PERSISTENCE
// ============================================================
function saveState() {
  try {
    GS.lastSave = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(GS));
    if (GS.auth && GS.auth.uid) {
      localStorage.setItem(`${USER_STORAGE_PREFIX}${GS.auth.uid}`, JSON.stringify(GS));
    }
  } catch(e) { console.warn('Ошибка сохранения:', e); }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      GS = deepMerge(GS, saved);
    }
  } catch(e) { console.warn('Ошибка загрузки:', e); }
}

function deepMerge(target, source) {
  const result = Object.assign({}, target);
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function loadUserScopedState(uid) {
  try {
    const scoped = localStorage.getItem(`${USER_STORAGE_PREFIX}${uid}`);
    if (!scoped) return;
    GS = deepMerge(GS, JSON.parse(scoped));
  } catch (e) { console.warn('Ошибка user-state:', e); }
}

let firebaseAuth = null;
let firebaseProviders = {};
let authMode = 'login';
let authReady = false;
let authInFlight = false;

function showAuthScreen(show) {
  const el = document.getElementById('auth-screen');
  if (!el) return;
  document.body.classList.toggle('auth-locked', !!show);
  el.classList.toggle('visible', !!show);
}

function setAuthMode(mode) {
  authMode = mode === 'register' ? 'register' : 'login';
  document.getElementById('auth-submit-btn').textContent = authMode === 'register' ? 'СОЗДАТЬ АККАУНТ' : 'ВХОД';
  document.getElementById('auth-error').textContent = '';
}

function setAuthError(msg) {
  document.getElementById('auth-error').textContent = msg || '';
}

async function initFirebaseAuth() {
  try {
    const appMod = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js');
    const authMod = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js');
    const firebaseConfig = {
      apiKey: 'AIzaSyCmcfcLqvVCG5rWbzvFf7Oblc8ipmBlVWQ',
      authDomain: 'aetherprotocol-310c0.firebaseapp.com',
      projectId: 'aetherprotocol-310c0',
      storageBucket: 'aetherprotocol-310c0.firebasestorage.app',
      messagingSenderId: '635629853210',
      appId: '1:635629853210:web:be471118edd7b56f884fa3',
      measurementId: 'G-0JBF2FJT7K'
    };
    const app = appMod.initializeApp(firebaseConfig);
    firebaseAuth = authMod.getAuth(app);
    firebaseProviders.google = new authMod.GoogleAuthProvider();
    authReady = true;
    authMod.onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        GS.auth.uid = null;
        GS.auth.email = null;
        document.getElementById('hdr-user-email').textContent = 'OFFLINE';
        showAuthScreen(true);
        return;
      }
      GS.auth.uid = user.uid;
      GS.auth.email = user.email || 'anonymous@aether';
      document.getElementById('hdr-user-email').textContent = GS.auth.email;
      loadState();
      loadUserScopedState(user.uid);
      saveState();
      hydrateRecurringMissions();
      hydrateEnergyRegen();
      renderAll();
      showAuthScreen(false);
      toast('СИНХРОНИЗАЦИЯ УСПЕШНА', `UID привязан: ${user.uid.slice(0, 8)}...`, 'success');
    });
  } catch (e) {
    showAuthScreen(true);
    setAuthError('Firebase не инициализирован: ' + (e.message || 'Unknown error'));
  }
}

async function submitAuth() {
  if (!authReady || authInFlight) return;
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { setAuthError('Введите email и пароль.'); return; }
  try {
    authInFlight = true;
    setAuthError('');
    const authMod = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js');
    if (authMode === 'register') await authMod.createUserWithEmailAndPassword(firebaseAuth, email, password);
    else await authMod.signInWithEmailAndPassword(firebaseAuth, email, password);
  } catch (e) {
    setAuthError(e.message || 'Ошибка авторизации');
  } finally {
    authInFlight = false;
  }
}

async function signInWithGoogle() {
  if (!authReady || authInFlight) return;
  try {
    authInFlight = true;
    const authMod = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js');
    setAuthError('');
    await authMod.signInWithPopup(firebaseAuth, firebaseProviders.google);
  } catch (e) {
    setAuthError(e.message || 'Google auth error');
  } finally {
    authInFlight = false;
  }
}

async function signOutUser() {
  if (!authReady || !firebaseAuth) return;
  const authMod = await import('https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js');
  await authMod.signOut(firebaseAuth);
}

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
function toast(title, msg, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <div class="toast-type-bar"></div>
    <div class="toast-title">${title}</div>
    <div class="toast-msg">${msg}</div>
  `;
  container.appendChild(el);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('show'));
  });
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, duration);
}

// ============================================================
// NAVIGATION
// ============================================================
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`${viewId}-view`).classList.add('active');
  document.querySelector(`.dock-btn[data-view="${viewId}"]`).classList.add('active');

  if (viewId === 'dashboard') { renderMissions(); renderCalendar(); }
  if (viewId === 'armory') { renderArmory(); }
  if (viewId === 'guild') { renderGuild(); }
  if (viewId === 'leviathan') { switchView('guild'); return; }
  if (viewId === 'profile') { renderProfile(); }
  if (viewId === 'arena') { renderArena(); }
  if (viewId === 'lab') { renderLab(); }
}

// ============================================================
// MODAL SYSTEM
// ============================================================
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Close modals on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ============================================================
// HP & RESOURCE MANAGEMENT
// ============================================================
function modifyHP(delta, reason = '') {
  if (delta < 0 && GS.shieldActive) {
    GS.shieldActive = false;
    toast('ЩИТ БЕЗМОЛВИЯ', 'Артефакт поглотил входящий урон!', 'info');
    return;
  }
  GS.player.hp = Math.max(0, Math.min(GS.player.maxHp, GS.player.hp + delta));
  updateHeader();
  saveState();

  if (delta < 0) {
    triggerExplosion();
    if (GS.player.hp <= 20) {
      document.body.classList.add('burnout-warning');
      toast('КРИТИЧЕСКОЕ СОСТОЯНИЕ', `ЖИЗНЬ КРИТИЧЕСКИ НИЗКАЯ: ${GS.player.hp}%. ${reason}`, 'danger', 5000);
    } else {
      toast('НЕЙРОННОЕ ВЫГОРАНИЕ', `Потеряно ${Math.abs(delta)} HP. ${reason}`, 'danger');
    }
  } else if (delta > 0) {
    if (GS.player.hp > 20) document.body.classList.remove('burnout-warning');
    toast('РЕГЕНЕРАЦИЯ ПРОТОКОЛА', `Восстановлено ${delta} HP.`, 'success');
  }
}

function modifyEmeralds(delta) {
  GS.player.emeralds = Math.max(0, GS.player.emeralds + delta);
  updateHeader();
  saveState();
}

function spendEnergy(cost, reason) {
  hydrateEnergyRegen();
  if (GS.player.energy < cost) {
    toast('НЕДОСТАТОЧНО ВОЛИ', `Требуется ${cost}. Доступно ${GS.player.energy}. ${reason || ''}`, 'warning');
    return false;
  }
  GS.player.energy -= cost;
  updateHeader();
  saveState();
  return true;
}

function gainEssence(amount) {
  GS.essences = Math.max(0, (GS.essences || 0) + amount);
  const el = document.getElementById('lab-essence-count');
  if (el) el.textContent = GS.essences;
  saveState();
  checkAchievements('arena_end');
}

function ensureAchievementState() {
  if (!GS.achievements || typeof GS.achievements !== 'object') GS.achievements = {};
}

function claimAchievementReward(reward) {
  if (!reward) return;
  if (reward.xp) addXP(reward.xp);
  if (reward.emeralds) modifyEmeralds(reward.emeralds);
  if (reward.essences) gainEssence(reward.essences);
}

function checkAchievements(trigger = '') {
  ensureAchievementState();
  let unlocked = 0;
  ACHIEVEMENT_DEFS.forEach(def => {
    const st = GS.achievements[def.id] || { unlocked: false, unlockedAt: null, trigger: '' };
    if (st.unlocked || !def.check(GS)) return;
    GS.achievements[def.id] = { unlocked: true, unlockedAt: Date.now(), trigger };
    claimAchievementReward(def.reward);
    const rewardText = [
      def.reward?.xp ? `+${def.reward.xp} XP` : '',
      def.reward?.emeralds ? `+${def.reward.emeralds} EMR` : '',
      def.reward?.essences ? `+${def.reward.essences} ESS` : ''
    ].filter(Boolean).join(' / ');
    toast('ДОСТИЖЕНИЕ', `${def.title}${rewardText ? ` (${rewardText})` : ''}`, 'success', 4200);
    unlocked++;
  });
  if (unlocked > 0) {
    saveState();
    updateDashboardStats();
  }
}

function addXP(amount) {
  const boosted = GS.xpBoostCharges > 0 ? Math.floor(amount * 1.2) : amount;
  if (GS.xpBoostCharges > 0) GS.xpBoostCharges--;

  GS.player.xp += boosted;
  GS.focus.xpGained += boosted;
  document.getElementById('focus-xp-gained').textContent = GS.focus.xpGained;

  checkLevelUp();
  updateHeader();
  saveState();
  return boosted;
}

function checkLevelUp() {
  const needed = XP_PER_LEVEL(GS.player.level);
  if (GS.player.xp >= needed) {
    GS.player.xp -= needed;
    GS.player.level++;
    GS.player.hp = Math.min(GS.player.maxHp, GS.player.hp + 20);
    showLevelUp(GS.player.level);
    toast('ПОВЫШЕНИЕ УРОВНЯ', `Достигнут Уровень ${GS.player.level}. +20 HP. Продолжайте операции.`, 'info', 5000);
    updateHeader();
  }
}

function showLevelUp(level) {
  const el = document.createElement('div');
  el.className = 'levelup-msg';
  el.innerHTML = `
    <div class="levelup-text">УРОВЕНЬ ${level}</div>
    <div class="levelup-sub">ПРОТОКОЛ ПОВЫШЕН</div>
  `;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.5s';
    setTimeout(() => el.remove(), 600);
  }, 2500);
}

function triggerExplosion() {
  const el = document.getElementById('explosion-overlay');
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), 300);
}

function updateHeader() {
  document.getElementById('hdr-hp').textContent = GS.player.hp;
  document.getElementById('hdr-energy').textContent = Math.floor(GS.player.energy || 0);
  document.getElementById('hdr-emeralds').textContent = GS.player.emeralds;
  document.getElementById('hdr-xp').textContent = GS.player.xp;
  document.getElementById('hdr-level').textContent = GS.player.level;
  document.getElementById('hdr-user-email').textContent = (GS.auth && GS.auth.email) ? GS.auth.email : 'OFFLINE';

  const hpPct = (GS.player.hp / GS.player.maxHp) * 100;
  const bar = document.getElementById('hdr-hp-bar');
  bar.style.width = hpPct + '%';
  if (hpPct <= 25) {
    bar.style.background = 'linear-gradient(90deg, #7f1d1d, var(--crimson))';
    bar.style.boxShadow = '0 0 6px rgba(239,68,68,0.6)';
  } else if (hpPct <= 50) {
    bar.style.background = 'linear-gradient(90deg, var(--amber-dim, #b45309), var(--amber))';
    bar.style.boxShadow = '0 0 6px rgba(245,158,11,0.5)';
  } else {
    bar.style.background = 'linear-gradient(90deg, var(--emerald-dim), var(--emerald))';
    bar.style.boxShadow = '0 0 6px var(--emerald)';
  }
}

function hydrateEnergyRegen() {
  const now = Date.now();
  const last = GS.player.lastEnergyTick || now;
  const delta = now - last;
  const points = Math.floor(delta / 300000);
  if (points > 0) {
    GS.player.energy = Math.min(GS.player.maxEnergy, GS.player.energy + points);
    GS.player.lastEnergyTick = last + (points * 300000);
  } else {
    GS.player.lastEnergyTick = now;
  }
}

// ====================== MODULE: TASK TRACKER ======================
function addMission() {
  const title = document.getElementById('m-title').value.trim();
  const desc = document.getElementById('m-desc').value.trim();
  const rank = document.getElementById('m-rank').value;
  const deadline = document.getElementById('m-deadline').value;
  const category = document.getElementById('m-category').value;
  const priority = document.getElementById('m-priority').value;
  const recurrence = document.getElementById('m-recurrence').value;
  const recurrenceCustomDays = parseInt(document.getElementById('m-recurrence-custom')?.value || '14', 10);
  const workMode = document.getElementById('m-work-mode')?.value || 'normal';
  const tags = document.getElementById('m-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  const subtasks = document.getElementById('m-subtasks').value.split('\n').map(t => t.trim()).filter(Boolean).map((row, idx) => {
    const [stTitle, stPriority, stDeadline] = row.split('|').map(v => (v || '').trim());
    return { id: Date.now() + idx, title: stTitle || row, done: false, priority: stPriority || 'normal', deadline: stDeadline || '' };
  });

  if (!title) { toast('ОШИБКА ВВОДА', 'Введите наименование операции.', 'warning'); return; }

  const cfg = RANK_CONFIG[rank];
  const mission = {
    id: Date.now(),
    title,
    desc,
    rank,
    deadline,
    category,
    priority,
    recurrence,
    recurrenceCustomDays,
    tags,
    subtasks,
    workMode,
    started: false,
    startedAt: null,
    acceptedCost: PRIORITY_ENERGY_COST[priority] || 8,
    xp: cfg.xp,
    emeralds: cfg.emeralds,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  GS.missions.unshift(mission);
  pushActivity(`Директива создана: ${title}`, 'task');
  saveState();
  closeModal('mission-modal');
  renderMissions();
  updateDashboardStats();

  document.getElementById('m-title').value = '';
  document.getElementById('m-desc').value = '';
  document.getElementById('m-tags').value = '';
  document.getElementById('m-subtasks').value = '';

  toast('МИССИЯ ЗАРЕГИСТРИРОВАНА', `Операция "${title}" [${rank}] добавлена в матрицу.`, 'success');
  checkAchievements('mission_created');
}

function startMission(id) {
  const mission = GS.missions.find(m => m.id === id);
  if (!mission || mission.completed || mission.started) return;
  const cost = mission.acceptedCost || PRIORITY_ENERGY_COST[mission.priority || 'normal'] || 8;
  if (!spendEnergy(cost, 'Запуск миссии')) return;
  mission.started = true;
  mission.startedAt = new Date().toISOString();
  mission.flowState = !!(GS.ui && GS.ui.flowState);
  pushActivity(`Старт директивы: ${mission.title}`, "task");
  saveState();
  renderMissions();
  toast('МИССИЯ АКТИВИРОВАНА', `Операция запущена. Затрачено ${cost} Воли.`, 'info');
}

function completeMission(id) {
  const mission = GS.missions.find(m => m.id === id);
  if (!mission || mission.completed) return;
  if (!mission.started) { toast('СНАЧАЛА ЗАПУСК', 'Активируйте миссию перед завершением.', 'warning'); return; }

  mission.completed = true;
  mission.completedAt = new Date().toISOString();

  const cfg = RANK_CONFIG[mission.rank];
  const startedAt = mission.startedAt ? new Date(mission.startedAt).getTime() : Date.now();
  const spentMin = Math.max(1, Math.floor((Date.now() - startedAt) / 60000));
  const speedMult = spentMin <= 30 ? 1.2 : spentMin <= 90 ? 1 : 0.85;
  const consistencyMult = 1 + Math.min(0.35, (GS.player.streak || 0) * 0.02);
  const modeMult = mission.workMode === 'flow' ? 1.25 : mission.workMode === 'deep' ? 1.15 : 1;

  // Logarithmic XP scaling with difficulty
  const logScale = 1 + Math.log(cfg.xp) / 10;
  const xpGain = Math.floor(cfg.xp * logScale * speedMult * consistencyMult * modeMult);

  // Emerald gain (double if boost active)
  let emGain = cfg.emeralds;
  if (GS.emeraldDoubleCharges > 0) {
    emGain *= 2;
    GS.emeraldDoubleCharges--;
  }

  // Burnout check for high-rank missions
  let burnoutHit = false;
  if (cfg.burnout && Math.random() < cfg.burnoutChance) {
    if (GS.burnoutImmunity > 0) {
      GS.burnoutImmunity--;
      toast('ОБСИДИАНОВЫЙ КОР', 'Нейронное Выгорание заблокировано артефактом!', 'info');
    } else {
      burnoutHit = true;
    }
  }

  const gained = addXP(xpGain);
  modifyEmeralds(emGain);
  gainEssence(Math.max(1, Math.floor((cfg.xp / 12) * (DISTILLATION_TYPES.research.essence || 1))));

  GS.player.totalMissions++;
  GS.season.seasonXp = (GS.season.seasonXp || 0) + xpGain;
  GS.taskHistory.push({ missionId: mission.id, title: mission.title, startedAt: mission.startedAt, completedAt: mission.completedAt, spentMin, xpGain, workMode: mission.workMode || "normal" });
  pushActivity(`Завершена директива: ${mission.title} (+${xpGain} XP, ${spentMin}m)`, "success");
  GS.focus.sessions++;
  GS.player.streak++;

  // Claim today in calendar
  const today = getTodayKey();
  const weekdayIdx = (new Date().getDay() + 6) % 7;
  if (!GS.calendar[today]) GS.calendar[today] = { claimed: false, tasks: 0 };
  GS.calendar[today].tasks = (GS.calendar[today].tasks || 0) + 1;
  if (GS.calendar[today].tasks >= 1) GS.calendar[today].claimed = true;

  // Guild energy contribution
  GS.guild.dailyEnergy = (GS.guild.dailyEnergy || 0) + 1;
  checkGuildQuota();

  saveState();
  renderMissions();
  renderTaskTrackerHub();
  renderCalendar();
  updateDashboardStats();

  let msg = `Добыто ${gained} XP и ${emGain} изумрудов. Сектор захвачен.`;
  toast(`ОПЕРАЦИЯ ЗАВЕРШЕНА [${mission.rank}]`, msg, 'success');

  if (burnoutHit) {
    setTimeout(() => modifyHP(-15, `S-ранг вызвал Нейронное Выгорание.`), 500);
  }
  if (mission.recurrence && mission.recurrence !== 'none') {
    mission.completed = true;
  }
  checkAchievements('mission_completed');
}

function deleteMission(id) {
  GS.missions = GS.missions.filter(m => m.id !== id);
  saveState();
  renderMissions();
  updateDashboardStats();
}

function renderMissions() {
  const list = document.getElementById('mission-list');
  const empty = document.getElementById('mission-empty');
  if (!list || !empty) return;
  const active = GS.missions.filter(m => !m.completed);
  const done = GS.missions.filter(m => m.completed);
  const all = filterMissions([...active, ...done]);

  if (all.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = all.map(m => {
    const cfg = RANK_CONFIG[m.rank];
    const deadlineStr = m.deadline
      ? `<span style="font-size:9px;color:var(--text-muted)">${m.deadline}</span>` : '';
    const pr = m.priority || 'normal';
    const tagHtml = (m.tags || []).map(t => `<span class="mission-tag">${escHtml(t)}</span>`).join('');
    const subtasks = (m.subtasks || []).map(st => `<label class="subtask-item"><input type="checkbox" ${st.done ? 'checked' : ''} onchange="toggleSubtask(${m.id}, ${st.id})"> <span>${escHtml(st.title)}</span><span style="margin-left:6px;color:var(--text-muted);font-size:9px">${escHtml(st.priority || 'normal')} ${st.deadline ? '• ' + escHtml(st.deadline) : ''}</span></label>`).join('');
    const startBtn = (!m.completed && !m.started) ? `<button class="btn btn-violet btn-sm" onclick="startMission(${m.id})">СТАРТ</button>` : '';
    return `
      <div class="mission-item${m.completed ? ' completed' : ''}" data-rank="${m.rank}">
        <div class="mission-check${m.completed ? ' checked' : ''}" onclick="completeMission(${m.id})">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="mission-info">
          <div class="mission-title">${escHtml(m.title)}</div>
          <div class="mission-meta">
            <span class="rank-badge rank-${m.rank}">${m.rank}-РАНГ</span>
            <span class="mission-priority priority-${pr}">${String(pr).toUpperCase()}</span>
            <span class="mission-reward">+${cfg.xp} XP / +${cfg.emeralds} EMR</span>
            ${deadlineStr}
          </div>
          ${tagHtml ? `<div class="mission-tags">${tagHtml}</div>` : ''}
          ${subtasks ? `<div class="subtask-list">${subtasks}</div>` : ''}
        </div>
        <div class="mission-actions">
          ${startBtn}
          <button class="btn btn-ghost btn-sm" onclick="deleteMission(${m.id})">x</button>
        </div>
      </div>
    `;
  }).join('');

  const artifactGrid = document.getElementById('artifact-grid');
  if (artifactGrid) {
    artifactGrid.innerHTML = ARTIFACT_CATALOG.map(art => {
      const ownedA = GS.ownedArtifacts.includes(art.id);
      return `<div class="artifact-card tier-${art.tier}${ownedA ? ' owned' : ''}"><div class="artifact-tier-bar"></div><div class="artifact-header"><div class="artifact-name">${art.name}</div><div class="artifact-tier-badge">${tierLabel(art.tier)}</div></div><div class="artifact-desc">${art.desc}</div><div class="artifact-effect">${art.effect}</div><div style="display:flex;justify-content:space-between;align-items:center"><div class="artifact-cost">${art.cost} EMR</div>${!ownedA ? `<button class=\"btn btn-emerald btn-sm\" onclick=\"transmute('${art.id}')\">ПОЛУЧИТЬ</button>` : ''}</div></div>`;
    }).join('');
  }
}


const missionFilters = { search: '', priority: 'all', category: 'all' };
function setMissionSearch(v) { missionFilters.search = String(v || '').toLowerCase(); renderMissions(); }
function setMissionPriorityFilter(v) { missionFilters.priority = v || 'all'; renderMissions(); }
function setMissionCategoryFilter(v) { missionFilters.category = v || 'all'; renderMissions(); }
function filterMissions(list) {
  return list.filter(m => {
    if (missionFilters.priority !== 'all' && (m.priority || 'normal') !== missionFilters.priority) return false;
    if (missionFilters.category !== 'all' && (m.category || 'special') !== missionFilters.category) return false;
    if (!missionFilters.search) return true;
    const hay = `${m.title} ${(m.tags || []).join(' ')} ${m.desc || ''}`.toLowerCase();
    return hay.includes(missionFilters.search);
  });
}
function toggleSubtask(missionId, subId) {
  const m = GS.missions.find(x => x.id === missionId);
  if (!m || !m.subtasks) return;
  const st = m.subtasks.find(x => x.id === subId);
  if (!st) return;
  st.done = !st.done;
  saveState();
}

function hydrateRecurringMissions() {
  const today = getTodayKey();
  GS.missions.forEach(m => {
    if (!m.recurrence || m.recurrence === 'none' || !m.completedAt) return;
    const doneDate = m.completedAt.slice(0, 10);
    if (m.recurrence === 'daily' && doneDate !== today) {
      m.completed = false;
      m.started = false;
      m.completedAt = null;
      (m.subtasks || []).forEach(st => { st.done = false; });
    }
    if (m.recurrence === 'weekly') {
      const prev = new Date(doneDate).getTime();
      if (Date.now() - prev >= 7 * 86400000) {
        m.completed = false;
        m.started = false;
        m.completedAt = null;
        (m.subtasks || []).forEach(st => { st.done = false; });
      }
    }
    if (m.recurrence === 'monthly') {
      const prev = new Date(doneDate);
      const now = new Date();
      if (prev.getMonth() !== now.getMonth() || prev.getFullYear() !== now.getFullYear()) {
        m.completed = false; m.started = false; m.completedAt = null;
        (m.subtasks || []).forEach(st => { st.done = false; });
      }
    }
    if (m.recurrence === 'custom') {
      const prev = new Date(doneDate).getTime();
      const span = (m.recurrenceCustomDays || 14) * 86400000;
      if (Date.now() - prev >= span) {
        m.completed = false; m.started = false; m.completedAt = null;
        (m.subtasks || []).forEach(st => { st.done = false; });
      }
    }
  });
}

// ====================== MODULE: VISUAL EFFECTS & ANIMATIONS ======================
function pushActivity(message, type = 'info') {
  GS.activityLog = GS.activityLog || [];
  GS.activityLog.unshift({ ts: Date.now(), message, type });
  if (GS.activityLog.length > 250) GS.activityLog.length = 250;
}

function setFlowState(enabled) {
  GS.ui = GS.ui || {};
  GS.ui.flowState = !!enabled;
  pushActivity(enabled ? 'Flow State активирован' : 'Flow State отключен', 'info');
  saveState();
}

function getTaskIntelligenceSuggestion() {
  const active = GS.missions.filter(m => !m.completed);
  if (!active.length) return 'AI: добавьте новую директиву и начните серию.';
  const now = Date.now();
  const scored = active.map(m => {
    const urgency = m.deadline ? Math.max(0, 5 - Math.floor((new Date(m.deadline).getTime() - now) / 86400000)) : 1;
    const importance = (m.rank === 'S' ? 5 : m.rank === 'A' ? 4 : m.rank === 'B' ? 3 : 2) + (m.priority === 'urgent' ? 3 : m.priority === 'high' ? 2 : 1);
    return { m, score: urgency + importance + ((m.workMode === 'flow' || m.workMode === 'deep') ? 1 : 0) };
  }).sort((a,b) => b.score - a.score);
  const top = scored[0].m;
  return `AI: Следующая лучшая цель — ${top.title} [${top.rank}] (${top.priority}).`;
}

function getProductivityStats() {
  const hist = GS.taskHistory || [];
  if (!hist.length) return { bestHour: '--', bestDay: '--', avgSession: 0, longestStreak: GS.player.streak || 0 };
  const hours = Array(24).fill(0);
  const days = Array(7).fill(0);
  let totalMin = 0;
  hist.forEach(h => {
    const dt = new Date(h.completedAt || Date.now());
    hours[dt.getHours()]++;
    days[(dt.getDay() + 6) % 7]++;
    totalMin += h.spentMin || 0;
  });
  const bh = hours.indexOf(Math.max(...hours));
  const bdIdx = days.indexOf(Math.max(...days));
  const bd = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'][bdIdx];
  const avg = Math.round(totalMin / Math.max(1, hist.length));
  return { bestHour: `${String(bh).padStart(2,'0')}:00`, bestDay: bd, avgSession: avg, longestStreak: GS.player.streak || 0 };
}

function renderEisenhowerMatrix() {
  const grid = document.getElementById('eisenhower-grid');
  if (!grid) return;
  const active = GS.missions.filter(m => !m.completed);
  const groups = { do: [], plan: [], delegate: [], eliminate: [] };
  active.forEach(m => {
    const important = ['S','A'].includes(m.rank) || ['urgent','high'].includes(m.priority);
    const urgent = m.deadline ? (new Date(m.deadline).getTime() - Date.now() < 2*86400000) : ['urgent'].includes(m.priority);
    const key = urgent && important ? 'do' : !urgent && important ? 'plan' : urgent && !important ? 'delegate' : 'eliminate';
    groups[key].push(m.title);
  });
  const cell = (title, arr) => `<div class="eis-cell"><div class="eis-title">${title}</div>${arr.slice(0,5).map(t=>`<div class="eis-item">${escHtml(t)}</div>`).join('') || '<div class="eis-item" style="color:var(--text-muted)">пусто</div>'}</div>`;
  grid.innerHTML = cell('DO FIRST', groups.do) + cell('SCHEDULE', groups.plan) + cell('DELEGATE', groups.delegate) + cell('ELIMINATE', groups.eliminate);
}

function renderProductivityHeatmap() {
  const el = document.getElementById('prod-heatmap');
  if (!el) return;
  const now = new Date();
  const y = now.getFullYear(); const m = now.getMonth();
  const days = new Date(y, m+1, 0).getDate();
  let html = '';
  for (let d=1; d<=days; d++) {
    const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const tasks = (GS.calendar[key]?.tasks || 0);
    const cls = tasks >= 4 ? 'l3' : tasks >= 2 ? 'l2' : tasks >= 1 ? 'l1' : '';
    html += `<div class="heat-dot ${cls}" title="${key}: ${tasks}"></div>`;
  }
  el.innerHTML = html;
}

function ensureContracts() {
  GS.season = GS.season || { tier: 1, seasonXp: 0, weeklyContracts: [] };
  GS.ownedCompanionArtifacts = Array.isArray(GS.ownedCompanionArtifacts) ? GS.ownedCompanionArtifacts : [];
  GS.companionLoadouts = GS.companionLoadouts || {};
  Object.keys(GS.companionLoadouts).forEach(k => {
    const l = GS.companionLoadouts[k];
    if (Array.isArray(l.artifacts)) {
      GS.companionLoadouts[k] = { weapon: l.artifacts[0] || null, core: l.artifacts[1] || null, sigil: null };
    }
    if (typeof GS.companionLoadouts[k] !== 'object') GS.companionLoadouts[k] = { weapon: null, core: null, sigil: null };
  });
  GS.guild = GS.guild || {};
  GS.guild.weekly = GS.guild.weekly || { id: '', startDate: '', endDate: '', bossMaxHp: 30000, bossHp: 30000, lastStrikeDate: '', dailyNorm: 3 };
  GS.season.tier = Math.max(1, Math.floor((GS.season.seasonXp || 0) / 600) + 1);
  const weekId = `${new Date().getFullYear()}-${Math.ceil((new Date().getDate())/7)}`;
  if (!GS.season.weeklyContracts.length || GS.season.weeklyContractsWeek !== weekId) {
    GS.season.weeklyContractsWeek = weekId;
    GS.season.weeklyContracts = [
      { id: 'w1', title: 'Завершить 12 миссий', target: 12, progress: 0, reward: '120 EMR' },
      { id: 'w2', title: 'Провести 5 Deep/Flow сессий', target: 5, progress: 0, reward: '180 XP' }
    ];
  }
  const deepFlow = (GS.taskHistory || []).filter(x => ['deep','flow'].includes(x.workMode)).length;
  GS.season.weeklyContracts.forEach(c => {
    if (c.id === 'w1') c.progress = Math.min(c.target, GS.player.totalMissions || 0);
    if (c.id === 'w2') c.progress = Math.min(c.target, deepFlow);
  });
}

function renderTaskTrackerHub() {
  const sug = document.getElementById('smart-next-task');
  if (sug) sug.textContent = getTaskIntelligenceSuggestion();
  renderEisenhowerMatrix();
  renderProductivityHeatmap();
  const stats = getProductivityStats();
  setText('prod-best-hour', stats.bestHour);
  setText('prod-best-day', stats.bestDay);
  setText('prod-longest-streak', stats.longestStreak);
  setText('prod-avg-session', `${stats.avgSession}m`);
  ensureContracts();
  setText('season-tier', `T${GS.season.tier}`);
  setText('season-xp', GS.season.seasonXp || 0);
  const cl = document.getElementById('contract-list');
  if (cl) cl.innerHTML = (GS.season.weeklyContracts || []).map(c => `<div class="contract-item"><span>${escHtml(c.title)}</span><b>${c.progress}/${c.target}</b></div>`).join('');
  const log = document.getElementById('activity-log');
  if (log) log.innerHTML = (GS.activityLog || []).slice(0,60).map(a => `<div class="activity-line">[${new Date(a.ts).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}] <b>${escHtml(a.type.toUpperCase())}</b> ${escHtml(a.message)}</div>`).join('');
}

function updateDashboardStats() {
  const active = GS.missions.filter(m => !m.completed).length;
  const today = getTodayKey();
  const doneToday = GS.missions.filter(m => {
    if (!m.completedAt) return false;
    return m.completedAt.startsWith(new Date().toISOString().slice(0,10));
  }).length;
  const dailyGoal = 5;
  const quota = GUILD_DAILY_QUOTA;
  const qNow = GS.guild.dailyEnergy || 0;
  const needed = XP_PER_LEVEL(GS.player.level);
  const xpPct = Math.min(100, (GS.player.xp / needed) * 100);
  const levPct = GS.guild.leviathanMaxHp > 0 ? Math.max(0, (GS.guild.leviathanHp / GS.guild.leviathanMaxHp) * 100) : 0;
  const arenaWins = GS.player.arenaWins || 0;
  const focusSessions = GS.focus.sessions || 0;

  setText('stat-streak', GS.player.streak);
  setText('dash-profile-name', GS.player.name);
  setText('dash-profile-level', GS.player.level);
  setText('dash-profile-class', getClassLabel(GS.player.level));
  setText('dash-class-label', getClassLabel(GS.player.level).split('—')[0].trim());
  setText('dash-rank-label', getRankTitleByLevel(GS.player.level));
  setText('dash-head-rank', getRankCodeByLevel(GS.player.level));
  setText('dash-head-xp', `${GS.player.xp}/${needed}`);
  setText('dash-head-level', GS.player.level);
  setText('dash-head-emeralds', GS.player.emeralds);
  setText('dash-head-streak', GS.player.streak);
  setText('dash-level-xp-label', `${GS.player.xp} / ${needed}`);
  setText('dash-lev-hp-label', `${GS.guild.leviathanHp} / ${GS.guild.leviathanMaxHp}`);
  setText('dash-lev-quota-label', `КВОТА: ${qNow} / ${quota}`);
  setText('dash-daily-missions', `${doneToday} / ${dailyGoal}`);
  setText('dash-daily-damage', `${Math.min(200, qNow * 40)} / 200`);
  setText('dash-daily-focus', `${Math.min(4, GS.focus.cycle || 1)} / 4`);
  setText('dash-daily-date', formatRuDate(new Date()));
  setBar('dash-level-progress', xpPct);
  setBar('dash-lev-hp-bar', levPct);
  setBar('dash-quota-fill', Math.min(100, (qNow / quota) * 100));
  renderDashboardStatCards([
    { label: 'Миссии', value: active, color: 'var(--emerald)' },
    { label: 'Всего ОП', value: GS.player.totalMissions || 0, color: 'var(--violet)' },
    { label: 'Серия', value: GS.player.streak || 0, color: 'var(--amber)' },
    { label: 'Сессий Фокуса', value: focusSessions, color: 'var(--ice)' },
    { label: 'Победы Арены', value: arenaWins, color: 'var(--crimson)' },
    { label: 'Изумруды', value: GS.player.emeralds || 0, color: 'var(--emerald)' }
  ]);
  renderDashboardAchievements(doneToday);
  renderTaskTrackerHub();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}
function setBar(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}
function getRankCodeByLevel(level) {
  if (level >= 50) return 'SS';
  if (level >= 35) return 'S';
  if (level >= 20) return 'A';
  if (level >= 10) return 'B';
  if (level >= 5) return 'C';
  return 'D';
}
function getRankTitleByLevel(level) {
  if (level >= 50) return 'Архонт';
  if (level >= 35) return 'Мастер';
  if (level >= 20) return 'Командор';
  if (level >= 10) return 'Ветеран';
  if (level >= 5) return 'Адепт';
  return 'Новобранец';
}
function formatRuDate(date) {
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}
function renderDashboardStatCards(cards) {
  const row = document.getElementById('dash-stats-row');
  if (!row) return;
  row.innerHTML = cards.map(c => `
    <div class="dash-stat-card">
      <div class="dash-stat-label">${escHtml(c.label)}</div>
      <div class="dash-stat-value" style="color:${c.color}">${escHtml(c.value)}</div>
    </div>
  `).join('');
}
function renderDashboardAchievements(doneToday) {
  const grid = document.getElementById('dash-achievements-grid');
  if (!grid) return;
  ensureAchievementState();
  grid.innerHTML = ACHIEVEMENT_DEFS.map(def => {
    const st = GS.achievements[def.id] || { unlocked: false, unlockedAt: null };
    const rewardText = [
      def.reward?.xp ? `XP ${def.reward.xp}` : '',
      def.reward?.emeralds ? `EMR ${def.reward.emeralds}` : '',
      def.reward?.essences ? `ESS ${def.reward.essences}` : ''
    ].filter(Boolean).join(' / ');
    return `
    <div class="dash-achv-card ${st.unlocked ? 'unlocked' : 'locked'}">
      <div class="dash-achv-title">${escHtml(def.title)}</div>
      <div class="dash-achv-desc">${escHtml(def.desc)}</div>
      <div class="dash-achv-date">${rewardText ? `Награда: ${rewardText}` : 'Награда: --'}</div>
      <div class="dash-achv-date">${st.unlocked ? `Разблокировано: ${new Date(st.unlockedAt || Date.now()).toLocaleDateString('ru-RU')}` : 'Статус: заблокировано'}</div>
    </div>
  `;
  }).join('');

  const hpLabel = document.getElementById('guild-weekly-hp');
  if (hpLabel) hpLabel.textContent = `${lev.weekly?.bossHp || lev.leviathanHp} / ${lev.weekly?.bossMaxHp || lev.leviathanMaxHp}`;
  const daysEl = document.getElementById('guild-week-days');
  if (daysEl) {
    const labels = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];
    const board = lev.weekly?.board || {};
    daysEl.innerHTML = labels.map((d, i) => {
      const key = `${lev.weekly?.id || 'W'}-${i}`;
      const st = board[key] || { status: 'idle', who: '' };
      const cls = st.status === 'hit' ? 'hit' : st.status === 'miss' ? 'miss' : '';
      return `<div class="guild-day ${cls}"><div style="font-family:var(--font-tact);font-size:9px">${d}</div><div style="margin-top:4px">${st.status === 'hit' ? 'Удар' : st.status === 'miss' ? 'Пропуск' : '—'}</div><div style="margin-top:3px;font-size:9px;color:var(--text-muted)">${escHtml(st.who || '')}</div></div>`;
    }).join('');
  }
}


// ============================================================
// CHRONOS GRID (CALENDAR)
// ============================================================
function getTodayKey() {
  return new Date().toISOString().slice(0,10);
}

function renderCalendar() {
  const monthEl = document.getElementById('chronos-month');
  const gridEl = document.getElementById('calendar-grid');
  if (!monthEl || !gridEl) return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                      'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  monthEl.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const startOffset = (firstDay + 6) % 7; // Monday start

  const dayNames = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];
  let html = dayNames.map(d => `<div class="cal-day-name">${d}</div>`).join('');

  for (let i = 0; i < startOffset; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const data = GS.calendar[key] || {};
    const isToday = d === today;
    const claimed = data.claimed;
    const yielded = d < today && !claimed;
    const tasks = data.tasks || 0;

    let cls = 'cal-day';
    if (isToday) cls += ' today';
    if (claimed) cls += ' claimed';
    else if (yielded) cls += ' yielded';

    const dots = tasks > 0 ? Array(Math.min(tasks, 3)).fill('<div class="cal-dot"></div>').join('') : '';

    html += `
      <div class="${cls}" title="${key}">
        <span class="cal-day-num">${d}</span>
        <div class="cal-day-dots">${dots}</div>
      </div>
    `;
  }

  gridEl.innerHTML = html;
}

// ============================================================
// FOCUS SIPHON ENGINE
// ============================================================
let focusTimer = null;
let audioCtx = null;
let focusState = {
  running: false,
  paused: false,
  onBreak: false,
  timeLeft: 0,
  totalTime: 0,
  deviations: 0
};

function alchemyTone(freq, dur = 0.12, type = 'sine') {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    gain.gain.linearRampToValueAtTime(0.05, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t);
    osc.stop(t + dur);
  } catch (_) {}
}

function applyFocusPreset(preset) {
  const cfg = FOCUS_PRESETS[preset] || FOCUS_PRESETS.classic;
  document.getElementById('focus-duration-input').value = cfg.focus;
  document.getElementById('break-duration-input').value = cfg.rest;
}

function focusControl(action) {
  if (action === 'start') {
    if (!spendEnergy(10, 'Запуск дистилляции')) return;
    const mins = parseInt(document.getElementById('focus-duration-input').value) || 25;
    const reduction = GS.focusTimeReduction || 0;
    const actualMins = Math.max(1, mins - reduction);
    if (reduction > 0) {
      GS.focusTimeReduction = 0;
      toast('РТУТЬ УСКОРЕНИЯ', `Время дистилляции сокращено на ${reduction} мин.`, 'info');
    }
    focusState.totalTime = actualMins * 60;
    focusState.timeLeft = focusState.totalTime;
    focusState.running = true;
    focusState.paused = false;
    focusState.onBreak = false;
    focusState.deviations = 0;

    updateFocusUI();
    startFocusTick();
    logFocus('ИНИЦИАЛИЗАЦИЯ', `Дистилляция начата. Продолжительность: ${actualMins} мин.`, 'success');
    alchemyTone(330, 0.12, 'triangle');

    document.getElementById('focus-start-btn').style.display = 'none';
    document.getElementById('focus-pause-btn').style.display = 'inline-flex';
    document.getElementById('focus-abort-btn').style.display = 'inline-flex';

    document.getElementById('distill-phase').textContent = 'АКТИВНАЯ ДИСТИЛЛЯЦИЯ';
    document.getElementById('distill-phase').className = 'distill-phase active';

  } else if (action === 'pause') {
    if (focusState.paused) {
      focusState.paused = false;
      startFocusTick();
      document.getElementById('focus-pause-btn').textContent = 'ПАУЗА';
      logFocus('ВОЗОБНОВЛЕНИЕ', 'Дистилляция возобновлена.', 'success');
      alchemyTone(280, 0.08);
    } else {
      focusState.paused = true;
      clearInterval(focusTimer);
      document.getElementById('focus-pause-btn').textContent = 'ПРОДОЛЖИТЬ';
      logFocus('ПАУЗА', 'Дистилляция приостановлена.', 'warn');
      alchemyTone(180, 0.1, 'square');
    }

  } else if (action === 'abort') {
    clearInterval(focusTimer);
    focusState.running = false;

    // 25% HP loss on abort
    const hpLoss = Math.floor(GS.player.maxHp * 0.25);
    const emLoss = Math.floor(GS.player.emeralds * 0.05);
    modifyHP(-hpLoss, 'Прерванная дистилляция.');
    modifyEmeralds(-emLoss);
    GS.player.failedFocus++;
    GS.player.streak = 0;

    logFocus('ВЗРЫВ', `ДИСТИЛЛЯЦИЯ ПРЕРВАНА. Потеряно ${hpLoss} HP и ${emLoss} изумрудов.`, 'danger');
    alchemyTone(110, 0.24, 'sawtooth');
    resetFocusUI();
    saveState();
  }
}

function startFocusTick() {
  clearInterval(focusTimer);
  focusTimer = setInterval(() => {
    if (!focusState.paused && focusState.running) {
      focusState.timeLeft--;
      updateFocusRing();
      updateFocusTimerDisplay();

      if (focusState.timeLeft <= 0) {
        onFocusComplete();
      }
    }
  }, 1000);
}

function onFocusComplete() {
  clearInterval(focusTimer);

  if (focusState.onBreak) {
    focusState.onBreak = false;
    GS.focus.cycle++;
    document.getElementById('focus-cycle').textContent = GS.focus.cycle;
    logFocus('ОТДЫХ ЗАВЕРШЁН', 'Перерыв закончен. Готов к следующему циклу.', 'success');
    resetFocusUI();
    toast('ПЕРЕРЫВ ЗАВЕРШЁН', 'Дистилляция перезарядилась. Цикл ' + GS.focus.cycle, 'info');
    alchemyTone(420, 0.08);
  } else {
    // Successful focus session
    const xpGain = 40 + (GS.focus.cycle * 5);
    const distType = document.getElementById('focus-type-input').value || 'coding';
    const mult = DISTILLATION_TYPES[distType] || DISTILLATION_TYPES.coding;
    const streakMult = 1 + Math.min(0.5, (GS.player.streak || 0) * 0.03);
    const gained = addXP(Math.floor(xpGain * mult.xp * streakMult));
    GS.focus.sessions++;
    modifyEmeralds(Math.floor(3 * mult.emeralds));
    gainEssence(Math.max(1, Math.floor(2 * mult.essence)));
    document.getElementById('focus-sessions').textContent = GS.focus.sessions;
    GS.player.streak++;
    document.getElementById('stat-streak').textContent = GS.player.streak;

    logFocus('ДИСТИЛЛЯЦИЯ ЗАВЕРШЕНА', `Успешная сессия. Добыто ${gained} XP. Переход на перерыв.`, 'success');
    toast('ДИСТИЛЛЯЦИЯ ЗАВЕРШЕНА', `Цикл ${GS.focus.cycle} завершён. +${gained} XP. Перерыв начат.`, 'success');
    alchemyTone(520, 0.1);

    // Start break
    const breakMins = parseInt(document.getElementById('break-duration-input').value) || 5;
    focusState.onBreak = true;
    focusState.totalTime = breakMins * 60;
    focusState.timeLeft = focusState.totalTime;
    focusState.running = true;
    focusState.paused = false;

    document.getElementById('distill-phase').textContent = 'ФАЗА РЕГЕНЕРАЦИИ';
    document.getElementById('distill-phase').className = 'distill-phase';
    document.getElementById('ring-fill-el').classList.remove('danger');

    startFocusTick();

    // Claim today in calendar on successful focus
    const today = getTodayKey();
    if (!GS.calendar[today]) GS.calendar[today] = { claimed: false, tasks: 0 };
    GS.calendar[today].claimed = true;
    renderCalendar();
  }

  saveState();
}

function resetFocusUI() {
  focusState.running = false;
  clearInterval(focusTimer);
  document.getElementById('focus-start-btn').style.display = 'inline-flex';
  document.getElementById('focus-pause-btn').style.display = 'none';
  document.getElementById('focus-abort-btn').style.display = 'none';
  document.getElementById('focus-pause-btn').textContent = 'ПАУЗА';
  document.getElementById('distill-phase').textContent = 'ОЖИДАНИЕ';
  document.getElementById('distill-phase').className = 'distill-phase';
  document.getElementById('distill-time').textContent = '25:00';
  document.getElementById('ring-fill-el').style.strokeDashoffset = '0';
  document.getElementById('ring-fill-el').classList.remove('danger');
}

function updateFocusUI() {
  updateFocusRing();
  updateFocusTimerDisplay();
}

function updateFocusTimerDisplay() {
  const mins = Math.floor(focusState.timeLeft / 60);
  const secs = focusState.timeLeft % 60;
  document.getElementById('distill-time').textContent =
    String(mins).padStart(2,'0') + ':' + String(secs).padStart(2,'0');

  // Warning state
  if (focusState.timeLeft < 60 && !focusState.onBreak) {
    document.getElementById('ring-fill-el').classList.add('danger');
  }
}

function updateFocusRing() {
  const circumference = 628.3;
  const pct = focusState.timeLeft / focusState.totalTime;
  const offset = circumference * (1 - pct);
  document.getElementById('ring-fill-el').style.strokeDashoffset = offset;
}

function logFocus(event, msg, type = '') {
  const log = document.getElementById('focus-log');
  const now = new Date();
  const timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  const item = document.createElement('div');
  item.className = `focus-log-item${type ? ' event-'+type : ''}`;
  item.innerHTML = `<span class="flog-time">${timeStr}</span><span class="flog-msg">[${event}] ${msg}</span>`;
  log.insertBefore(item, log.firstChild);
  while (log.children.length > 50) log.removeChild(log.lastChild);
}

// Page Visibility / Focus deviation detection
document.addEventListener('visibilitychange', () => {
  if (document.hidden && focusState.running && !focusState.paused && !focusState.onBreak) {
    handleFocusDeviation('Переключение вкладки');
  }
});

window.addEventListener('blur', () => {
  if (focusState.running && !focusState.paused && !focusState.onBreak) {
    handleFocusDeviation('Потеря фокуса окна');
  }
});

function handleFocusDeviation(reason) {
  focusState.deviations++;
  const hpLoss = Math.floor(GS.player.maxHp * 0.25);
  const emLoss = Math.floor(GS.player.emeralds * 0.05);

  clearInterval(focusTimer);
  focusState.running = false;

  triggerExplosion();
  logFocus('ВЗРЫВ РЕАКТОРА', `ОТКЛОНЕНИЕ: ${reason}. Потеряно ${hpLoss} HP и ${emLoss} изумрудов.`, 'danger');

  modifyHP(-hpLoss, `Отклонение во время дистилляции: ${reason}`);
  if (emLoss > 0) modifyEmeralds(-emLoss);
  GS.player.failedFocus++;
  GS.player.streak = 0;

  resetFocusUI();
  saveState();

  setTimeout(() => {
    toast('ДИСТИЛЛЯЦИЯ ПРЕРВАНА', `${reason} вызвал взрыв реактора. -${hpLoss} HP, -${emLoss} изумрудов.`, 'danger', 5000);
  }, 100);
}

// ====================== MODULE: ARENA ENGINE ======================
function renderArena() {
  document.getElementById('arena-setup').style.display = 'block';
  hydrateDailyChallenge();
  renderArenaSelection();
  renderArenaCombatants();
}

function hydrateDailyChallenge() {
  const today = getTodayKey();
  if (GS.daily.arenaChallengeDate !== today) {
    GS.daily.arenaChallengeDate = today;
    GS.daily.challengeCompleted = false;
    GS.daily.challengeRewardClaimed = false;
  }
}


function getPortraitPositionByCompanionId(id) {
  return id === 'chronocatcher' ? '0px 0px' : id === 'etherwatcher' ? '-200px 0px' : id === 'plasmareaper' ? '-400px 0px' : id === 'shadowarchitect' ? '-600px 0px' : id === 'voidoracle' ? '0px -250px' : id === 'crystalwarden' ? '-200px -250px' : '-400px -250px';
}

function getActiveCompanion() {
  const owned = getOwnedCompanionDefs();
  const activeComp = getActiveCompanion();
  const activeArt = activeComp ? getCompanionArtifactStats(activeComp.id) : { flatPower: 0, crit: 0, lifesteal: 0, evasion: 0, chaos: 0, heavyBonus: 0, burstBonus: 0 };
  if (!owned.length) return null;
  if (GS.activeCompanionId && owned.some(c => c.id === GS.activeCompanionId)) return owned.find(c => c.id === GS.activeCompanionId);
  GS.activeCompanionId = owned[0].id;
  return owned[0];
}

function getCompanionLoadout(compId) {
  GS.companionLoadouts = GS.companionLoadouts || {};
  if (!GS.companionLoadouts[compId]) GS.companionLoadouts[compId] = { weapon: null, core: null, sigil: null };
  return GS.companionLoadouts[compId];
}

function getCompanionArtifactDefs(compId) {
  return COMPANION_ARTIFACT_CATALOG.filter(a => a.compatible.includes(compId));
}

function getEquippedCompanionArtifacts(compId) {
  const owned = new Set(GS.ownedCompanionArtifacts || []);
  const load = getCompanionLoadout(compId);
  return ['weapon','core','sigil'].map(slot => load[slot]).filter(id => owned.has(id)).map(id => COMPANION_ARTIFACT_CATALOG.find(a => a.id === id)).filter(Boolean);
}

function getCompanionArtifactStats(compId) {
  return getEquippedCompanionArtifacts(compId).reduce((acc, art) => {
    Object.entries(art.bonuses || {}).forEach(([k,v]) => { acc[k] = (acc[k] || 0) + v; });
    return acc;
  }, { flatPower: 0, crit: 0, lifesteal: 0, evasion: 0, chaos: 0, heavyBonus: 0, burstBonus: 0 });
}

function buyCompanionArtifact(artifactId) {
  const art = COMPANION_ARTIFACT_CATALOG.find(a => a.id === artifactId);
  if (!art) return;
  GS.ownedCompanionArtifacts = GS.ownedCompanionArtifacts || [];
  if (GS.ownedCompanionArtifacts.includes(artifactId)) return;
  if (GS.player.emeralds < art.cost) { toast('АРТЕФАКТ', `Нужно ${art.cost} изумрудов.`, 'warning'); return; }
  modifyEmeralds(-art.cost);
  GS.ownedCompanionArtifacts.push(artifactId);
  epicLootBurst();
  pushActivity(`Куплен артефакт спутника: ${art.name}`, 'loot');
  saveState();
  renderArmory();
}

function equipCompanionArtifact(compId, artifactId) {
  const art = COMPANION_ARTIFACT_CATALOG.find(a => a.id === artifactId);
  if (!art || !art.compatible.includes(compId)) return;
  if (!(GS.ownedCompanionArtifacts || []).includes(artifactId)) { toast('АРТЕФАКТ', 'Сначала купите артефакт.', 'warning'); return; }
  const load = getCompanionLoadout(compId);
  const slot = art.slot || 'sigil';
  if (load[slot] === artifactId) load[slot] = null;
  else load[slot] = artifactId;
  saveState();
  renderArmory();
  if (document.getElementById('arena-field')) renderArenaCombatants();
}

function setActiveCompanion(compId) {
  GS.activeCompanionId = compId;
  saveState();
  renderArmory();
  if (document.getElementById('arena-field')) renderArenaCombatants();
}


function renderArenaSelection() {
  const wrap = document.getElementById('arena-roster-select');
  const portrait = document.getElementById('arena-main-pick-portrait');
  const nameEl = document.getElementById('arena-main-pick-name');
  if (!wrap) return;
  const owned = getOwnedCompanionDefs();
  if (!owned.length) {
    wrap.innerHTML = `<div style="color:var(--text-muted);font-family:var(--font-tact);font-size:10px">Купите героя в Лаборатории, чтобы открыть Арену.</div>`;
    if (portrait) portrait.style.backgroundPosition = '0px 0px';
    if (nameEl) nameEl.textContent = 'Не выбран';
    return;
  }
  const active = getActiveCompanion();
  if (portrait && active) portrait.style.backgroundPosition = getPortraitPositionByCompanionId(active.id);
  if (nameEl && active) nameEl.textContent = active.name;
  wrap.innerHTML = owned.map(c => `<div class="arena-team-pick ${active && active.id===c.id ? 'active':''}" onclick="setActiveCompanion('${c.id}');renderArenaSelection()"><div style="height:80px;background-image:url('assets/companions-sheet.png');background-size:800px 500px;background-position:${getPortraitPositionByCompanionId(c.id)}"></div><div style="margin-top:6px;font-family:var(--font-tact);font-size:10px">${c.name}</div></div>`).join('');
}

function triggerAbilityAnimation(kind) {
  const host = document.getElementById('arena-field-wrap');
  if (!host) return;
  const fx = document.createElement('div');
  fx.className = `ability-vfx ${kind}`;
  host.appendChild(fx);
  setTimeout(() => fx.remove(), 700);
}

function getCompanionAbilityPack(comp) {
  const map = {
    chronocatcher: [{ key:'ability1', name:'КРИСТАЛЬНЫЙ ДОЖДЬ', mult:0.2, vfx:'rain', cd:2 }, { key:'ability2', name:'ВЗГЛЯД ПУСТОТЫ', mult:0.16, vfx:'void', cd:2 }],
    etherwatcher: [{ key:'ability1', name:'ПРОБИВАЮЩИЙ ЛУЧ', mult:0.22, vfx:'rain', cd:2 }, { key:'ability2', name:'ЭФИРНЫЙ РАЗРЕЗ', mult:0.15, vfx:'void', cd:2 }],
    plasmareaper: [{ key:'ability1', name:'ПОЖИРАНИЕ РЕАЛЬНОСТИ', mult:0.24, vfx:'devour', cd:3 }, { key:'ability2', name:'ПЛАЗМЕННЫЙ УДАР', mult:0.18, vfx:'rain', cd:2 }],
    shadowarchitect: [{ key:'ability1', name:'КОЛЛАПС МАТРИЦЫ', mult:0.27, vfx:'devour', cd:3 }, { key:'ability2', name:'ТЕНЕВОЙ КОНТУР', mult:0.17, vfx:'void', cd:2 }]
  };
  return map[comp?.id] || [{ key:'ability1', name:'КРИСТАЛЬНЫЙ ДОЖДЬ', mult:0.2, vfx:'rain', cd:2 }, { key:'ability2', name:'ВЗГЛЯД ПУСТОТЫ', mult:0.16, vfx:'void', cd:2 }];
}

function renderArenaCombatants() {
  const arena = GS.arena;
  const activeComp = getActiveCompanion();
  const activeArtStats = activeComp ? getCompanionArtifactStats(activeComp.id) : { flatPower: 0 };
  const companionStats = getArenaCompanionStats();
  const playerPowerBase = (GS.player.level * 10) + (GS.player.totalMissions * 2) + (GS.arenaPowerBonus || 0) + companionStats.powerBonus + (activeArtStats.flatPower || 0);
  const enemyPowerBase = arena.enemyPower || 50;
  const portraitPos = activeComp ? getPortraitPositionByCompanionId(activeComp.id) : '0px 0px';
  const eqArts = activeComp ? getEquippedCompanionArtifacts(activeComp.id) : [];

  document.getElementById('arena-field').innerHTML = `
    <div class="combatant player">
      <div class="combatant-name">${escHtml(GS.player.name)} ${activeComp ? '— ' + escHtml(activeComp.name) : ''}</div>
      <div class="arena-hero-portrait" style="background-image:url('assets/companions-sheet.png');background-position:${portraitPos}"></div>
      <div>${eqArts.map(a => `<span class='arena-art-chip'>${escHtml(a.name)}</span>`).join('')}</div>
      <div class="combatant-hp-bar">
        <div class="combatant-hp-fill player" id="player-hp-fill" style="width:${(arena.playerHp/arena.playerMaxHp)*100}%"></div>
      </div>
      <div class="combatant-hp-val" id="player-hp-val">${arena.playerHp} / ${arena.playerMaxHp}</div>
      <div class="combatant-power">МОЩЬ: <span>${playerPowerBase}</span></div>
      <div class="combatant-team">
        ${renderArenaCompanions()}
      </div>
      <div class="combatant-sprites" id="player-sprites" style="margin-top:14px">
        ${renderPlayerArtifacts()}
      </div>
    </div>
    <div class="vs-divider"><span class="vs-text">VS</span></div>
    <div class="combatant enemy">
      <div class="combatant-name" id="enemy-name">${escHtml(arena.enemyName)}</div>
      <div class="combatant-hp-bar">
        <div class="combatant-hp-fill enemy" id="enemy-hp-fill" style="width:${(arena.enemyHp/arena.enemyMaxHp)*100}%"></div>
      </div>
      <div class="combatant-hp-val" id="enemy-hp-val">${arena.enemyHp} / ${arena.enemyMaxHp}</div>
      <div class="combatant-power">МОЩЬ: <span id="enemy-power-val">${enemyPowerBase}</span></div>
      <div class="combatant-sprites">
        <span class="sprite artifact">Кинетик</span>
        <span class="sprite potion">Яд Мрака</span>
      </div>
    </div>
  `;

  renderArenaActions();
}

function renderArenaCompanions() {
  return getOwnedCompanionDefs().map(comp => {
    const shortName = comp.name.split(' ')[0].slice(0, 4);
    const portraitPos = comp.id === 'chronocatcher' ? '0px 0px' : comp.id === 'etherwatcher' ? '-200px 0px' : comp.id === 'plasmareaper' ? '-400px 0px' : comp.id === 'shadowarchitect' ? '-600px 0px' : comp.id === 'voidoracle' ? '0px -250px' : comp.id === 'crystalwarden' ? '-200px -250px' : '-400px -250px';
    return `<div class="companion-token" id="arena-comp-${comp.id}" data-short="${escHtml(shortName)}" style="background-image:url('assets/companions-sheet.png');background-size:800px 500px;background-position:${portraitPos};background-color:rgba(3,6,12,0.7);font-size:0"></div>`;
  }).join('');
}

function getOwnedCompanionDefs() {
  const ownedIds = GS.ownedCompanions || [];
  return COMPANION_CATALOG.filter(c => ownedIds.includes(c.id));
}

function getArenaCompanionStats() {
  const owned = getOwnedCompanionDefs();
  const stats = {
    powerBonus: 0,
    crit: 0,
    lifesteal: 0,
    evasion: 0,
    chaos: 0
  };
  owned.forEach(comp => {
    stats.powerBonus += Math.floor((GS.player.level * 3) + comp.cost * 0.02);
    if (comp.buff?.type === 'crit') stats.crit += comp.buff.value;
    if (comp.buff?.type === 'lifesteal') stats.lifesteal += comp.buff.value;
    if (comp.buff?.type === 'evasion') stats.evasion += comp.buff.value;
    if (comp.buff?.type === 'chaos') stats.chaos += comp.buff.value;
  });

  // Companion synergies (premium combos)
  const ids = new Set(owned.map(c => c.id));
  if (ids.has('chronocatcher') && ids.has('etherwatcher')) {
    stats.crit += 0.08;
    stats.powerBonus += 14;
  }
  if (ids.has('plasmareaper') && ids.has('shadowarchitect')) {
    stats.chaos += 0.1;
    stats.lifesteal += 0.05;
  }
  if (ids.has('voidoracle') && ids.has('flamewraith')) {
    stats.evasion += 0.08;
  }

  stats.powerBonus += activeArt.flatPower || 0;
  stats.crit += activeArt.crit || 0;
  stats.lifesteal += activeArt.lifesteal || 0;
  stats.evasion += activeArt.evasion || 0;
  stats.chaos += activeArt.chaos || 0;
  stats.heavyBonus = (stats.heavyBonus || 0) + (activeArt.heavyBonus || 0);
  stats.burstBonus = (stats.burstBonus || 0) + (activeArt.burstBonus || 0);
  return stats;
}

function triggerCompanionAbilityPulse(companionId, color = 'var(--emerald)') {
  const el = document.getElementById(`arena-comp-${companionId}`);
  if (!el) return;
  el.classList.remove('companion-aura');
  el.style.boxShadow = `0 0 14px ${color}`;
  void el.offsetWidth;
  el.classList.add('companion-aura');
  setTimeout(() => {
    el.classList.remove('companion-aura');
    el.style.boxShadow = '';
  }, 600);
}

function resolveCompanionTurnDamage() {
  if (!GS.arena.inProgress) return 0;
  const arena = GS.arena;
  const companions = getOwnedCompanionDefs();
  let total = 0;
  companions.forEach(comp => {
    const dealt = Math.max(2, Math.floor(arena.playerPower * comp.atkScale * (0.8 + Math.random() * 0.6)));
    total += dealt;
    addTacticalLog(`${comp.name} активирует поддержку — `, 'player', `${dealt} урона`, 'dmg');
    triggerCompanionAbilityPulse(comp.id, 'rgba(16,185,129,0.8)');
  });
  if (total > 0) {
    showCombatFlash('emerald');
  }
  return total;
}

function renderPlayerArtifacts() {
  return GS.ownedArtifacts.slice(0, 4).map(aid => {
    const art = ARTIFACT_CATALOG.find(a => a.id === aid);
    if (!art) return '';
    return `<span class="sprite artifact" onclick="useArtifactInCombat('${aid}')">${art.name.split(' ')[0]}</span>`;
  }).join('') + `<span class="sprite potion" onclick="usePotionInCombat()">Эликсир</span>`;
}

function renderArenaActions() {
  const btns = document.getElementById('arena-action-btns');
  if (!GS.arena.inProgress) {
    btns.innerHTML = '';
    return;
  }

  if (!GS.arena.playerTurn) {
    btns.innerHTML = `<span style="font-family:var(--font-tact);font-size:11px;color:var(--text-muted)">ХОД ПРОТИВНИКА...</span>`;
    return;
  }

  const ab = getCompanionAbilityPack(getActiveCompanion());
  btns.innerHTML = `
    <button class="btn btn-emerald ability-btn" onclick="arenaAttack('normal')" ${arenaCd('normal')}>АТАКА ЭФИРОМ</button>
    <button class="btn btn-violet ability-btn" onclick="arenaAttack('heavy')" ${arenaCd('heavy')}>ТЯЖЁЛЫЙ УДАР</button>
    <button class="btn btn-ghost ability-btn" onclick="arenaAttack('defend')" ${arenaCd('defend')}>ОБОРОНА</button>
    <button class="btn btn-crimson ability-btn" onclick="arenaAttack('burst')" ${arenaCd('burst')}>ЭЛЕМ. ВСПЛЕСК</button>
    <button class="btn btn-violet ability-btn" onclick="arenaAttack('ability1')" ${arenaCd('ability1')}>${ab[0].name}</button>
    <button class="btn btn-violet ability-btn" onclick="arenaAttack('ability2')" ${arenaCd('ability2')}>${ab[1].name}</button>
  `;
}
function arenaCd(key) {
  const cds = GS.arena.cooldowns || {};
  return cds[key] && cds[key] > 0 ? 'disabled' : '';
}

function initCombat() {
  document.getElementById('arena-setup').style.display = 'block';
  renderArenaSelection();
}

function startDuel() {
  const name = document.getElementById('opponent-name-input').value.trim() || 'АЛХИМИК ВАРАШ';
  const tier = parseInt(document.getElementById('opponent-tier-input').value);
  const playerElement = document.getElementById('player-element-input').value || 'aether';
  const tierMult = [0, 0.8, 1.0, 1.3, 1.7, 2.5][tier];

  const compStats = getArenaCompanionStats();
  const playerPower = (GS.player.level * 10) + (GS.player.totalMissions * 2) + (GS.arenaPowerBonus || 0) + compStats.powerBonus;
  const enemyPower = Math.floor(playerPower * tierMult);

  GS.arena = {
    combatLog: [],
    playerHp: 100,
    enemyHp: 100,
    playerMaxHp: 100,
    enemyMaxHp: 100,
    playerPower: playerPower,
    enemyPower: enemyPower,
    enemyName: name,
    inProgress: true,
    playerTurn: true,
    playerDefending: false,
    playerElement: playerElement,
    enemyElement: ['aether','flame','void','crystal'][Math.floor(Math.random() * 4)],
    cooldowns: { normal: 0, heavy: 0, defend: 0, burst: 0, ability1: 0, ability2: 0 }
  };

  document.getElementById('arena-setup').style.display = 'none';
  renderArenaCombatants();
  renderArenaActions();

  const log = document.getElementById('tactical-log');
  log.innerHTML = '';
  addTacticalLog(`Дуэль начата. ${GS.player.name} против ${name}.`, 'system');
  addTacticalLog(`Сила игрока: ${playerPower}. Сила противника: ${enemyPower}.`, 'system');

  saveState();
}

function arenaAttack(type) {
  if (!GS.arena.inProgress || !GS.arena.playerTurn) return;

  const arena = GS.arena;
  let dmg = 0;
  let miss = false;

  GS.arena.cooldowns = GS.arena.cooldowns || { normal: 0, heavy: 0, defend: 0, burst: 0 };
  if (GS.arena.cooldowns[type] && GS.arena.cooldowns[type] > 0) return;
  if (type === 'normal') {
    dmg = Math.floor(arena.playerPower * (0.15 + Math.random() * 0.1));
    addTacticalLog(`${GS.player.name} наносит удар Эфиром — `, 'player', `${dmg} урона`, 'dmg');
  } else if (type === 'heavy') {
    if (Math.random() < 0.3) {
      miss = true;
      addTacticalLog(`${GS.player.name} промахивается с тяжёлым ударом!`, 'player');
    } else {
      const cStats = getArenaCompanionStats();
      dmg = Math.floor(arena.playerPower * (0.25 + Math.random() * 0.15) * (1 + (cStats.heavyBonus || 0)));
      addTacticalLog(`${GS.player.name} наносит ТЯЖЁЛЫЙ УДАР — `, 'player', `${dmg} урона`, 'dmg');
    }
  } else if (type === 'defend') {
    arena.playerDefending = true;
    addTacticalLog(`${GS.player.name} принимает оборонительную стойку (-50% входящего урона).`, 'player');
  } else if (type === 'burst') {
    const adv = getElementAdvantage(arena.playerElement, arena.enemyElement);
    const mult = adv > 0 ? 1.35 : adv < 0 ? 0.75 : 1;
    const cStats = getArenaCompanionStats();
    dmg = Math.floor(arena.playerPower * (0.22 + Math.random() * 0.1) * mult * (1 + (cStats.burstBonus || 0)));
    addTacticalLog(`${GS.player.name} высвобождает ${arena.playerElement.toUpperCase()} импульс — `, 'player', `${dmg} урона`, 'dmg');
    GS.arena.cooldowns.burst = 3;
  } else if (type === 'ability1' || type === 'ability2') {
    const pack = getCompanionAbilityPack(getActiveCompanion());
    const ab = type === 'ability1' ? pack[0] : pack[1];
    dmg = Math.floor(arena.playerPower * (ab.mult + Math.random() * 0.08));
    addTacticalLog(`${getActiveCompanion()?.name || 'Спутник'} применяет ${ab.name} — `, 'player', `${dmg} урона`, 'dmg');
    triggerAbilityAnimation(ab.vfx);
    GS.arena.cooldowns[type] = ab.cd;
  }

  const companionStats = getArenaCompanionStats();
  if (dmg > 0 && Math.random() < companionStats.crit) {
    const bonusCrit = Math.floor(dmg * 0.35);
    dmg += bonusCrit;
    addTacticalLog(`Синергия спутников усиливает удар на ${bonusCrit}.`, 'system');
  }

  if (dmg > 0) {
    arena.enemyHp = Math.max(0, arena.enemyHp - dmg);
    showCombatFlash('emerald');
  }

  const companionDmg = resolveCompanionTurnDamage();
  if (companionDmg > 0) {
    arena.enemyHp = Math.max(0, arena.enemyHp - companionDmg);
  }

  if ((dmg + companionDmg) > 0) {
    updateArenaHPBars();
  }

  if (arena.enemyHp <= 0) {
    onCombatEnd(true);
    return;
  }

  arena.playerTurn = false;
  Object.keys(GS.arena.cooldowns).forEach(k => {
    if (GS.arena.cooldowns[k] > 0) GS.arena.cooldowns[k]--;
  });
  renderArenaActions();

  // Enemy turn after delay
  setTimeout(() => enemyTurn(), 1200);
}

function getElementAdvantage(a, b) {
  const chart = {
    aether: { void: 1, flame: -1 },
    flame: { crystal: 1, aether: -1 },
    crystal: { aether: 1, void: -1 },
    void: { flame: 1, crystal: -1 }
  };
  if (!chart[a] || !chart[a][b]) return 0;
  return chart[a][b];
}

function enemyTurn() {
  const arena = GS.arena;
  if (!arena.inProgress) return;

  const actions = ['attack', 'attack', 'attack', 'heavy', 'special'];
  const action = actions[Math.floor(Math.random() * actions.length)];
  let dmg = 0;

  if (action === 'attack') {
    dmg = Math.floor(arena.enemyPower * (0.12 + Math.random() * 0.08));
    addTacticalLog(`${arena.enemyName} атакует — `, 'enemy', `${dmg} урона`, 'dmg');
  } else if (action === 'heavy') {
    dmg = Math.floor(arena.enemyPower * (0.2 + Math.random() * 0.15));
    addTacticalLog(`${arena.enemyName} наносит мощный удар — `, 'enemy', `${dmg} урона`, 'dmg');
  } else {
    dmg = Math.floor(arena.enemyPower * 0.25);
    addTacticalLog(`${arena.enemyName} применяет Яд Мрака — `, 'enemy', `${dmg} урона`, 'dmg');
  }

  const companionStats = getArenaCompanionStats();
  if (arena.playerDefending) {
    dmg = Math.floor(dmg * 0.5);
    addTacticalLog(`Оборонительная стойка снизила урон вдвое: ${dmg}`, 'system');
    arena.playerDefending = false;
  }

  if (Math.random() < companionStats.evasion) {
    dmg = Math.floor(dmg * 0.65);
    addTacticalLog(`Спутники уводят атаку в сторону. Снижение урона до ${dmg}.`, 'system');
  }

  if (Math.random() < companionStats.chaos) {
    const backfire = Math.floor(arena.enemyPower * 0.08);
    arena.enemyHp = Math.max(0, arena.enemyHp - backfire);
    addTacticalLog(`Хаос-эффект отражает ${backfire} урона обратно врагу.`, 'player');
    showCombatFlash('violet');
  }

  if (dmg > 0) {
    arena.playerHp = Math.max(0, arena.playerHp - dmg);
    showCombatFlash('crimson');

    if (companionStats.lifesteal > 0) {
      const heal = Math.max(1, Math.floor(dmg * companionStats.lifesteal));
      arena.playerHp = Math.min(arena.playerMaxHp, arena.playerHp + heal);
      if (heal > 0) addTacticalLog(`Спутники возвращают ${heal} HP через вампиризм.`, 'player');
    }

    updateArenaHPBars();
  }

  if (arena.playerHp <= 0) {
    onCombatEnd(false);
    return;
  }

  arena.playerTurn = true;
  renderArenaActions();
  saveState();
}

function onCombatEnd(playerWon) {
  GS.arena.inProgress = false;

  if (playerWon) {
    const xpGain = Math.floor(GS.arena.enemyPower * 1.5);
    const emGain = Math.floor(GS.arena.enemyPower * 0.8);
    addXP(xpGain);
    modifyEmeralds(emGain);
    addTacticalLog(`ПОБЕДА. ${GS.player.name} одержал верх. +${xpGain} XP, +${emGain} изумрудов.`, 'system');
    toast('ПОБЕДА В ДУЭЛИ', `${GS.arena.enemyName} повержен. +${xpGain} XP.`, 'success');
    GS.player.arenaWins = (GS.player.arenaWins || 0) + 1;
    if (!GS.daily.challengeCompleted) {
      GS.daily.challengeCompleted = true;
      modifyEmeralds(25);
      gainEssence(5);
      toast('DAILY CHALLENGE', 'Ежедневный вызов Арены выполнен. +25 EMR, +5 ESS.', 'info');
    }
  } else {
    const hpLoss = 20;
    modifyHP(-hpLoss, 'Поражение в дуэли Арены.');
    addTacticalLog(`ПОРАЖЕНИЕ. ${GS.arena.enemyName} одержал победу. -${hpLoss} HP.`, 'system');
    toast('ПОРАЖЕНИЕ В ДУЭЛИ', `Вы проиграли дуэль. -${hpLoss} HP.`, 'danger');
  }

  document.getElementById('arena-action-btns').innerHTML = `
    <button class="btn btn-emerald" onclick="initCombat()">НОВАЯ ДУЭЛЬ</button>
  `;

  saveState();
}

function addTacticalLog(msg, type, extra = '', extraType = '') {
  const log = document.getElementById('tactical-log');
  const time = new Date().toLocaleTimeString('ru', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  const line = document.createElement('div');
  line.className = 'tlog-line';
  line.innerHTML = `<span class="tl-time">[${time}]</span> <span class="tl-${type}">${msg}</span>${extra ? `<span class="tl-${extraType}">${extra}</span>` : ''}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
  while (log.children.length > 100) log.removeChild(log.firstChild);
}

function updateArenaHPBars() {
  const a = GS.arena;
  document.getElementById('player-hp-fill').style.width = Math.max(0, (a.playerHp/a.playerMaxHp)*100) + '%';
  document.getElementById('enemy-hp-fill').style.width = Math.max(0, (a.enemyHp/a.enemyMaxHp)*100) + '%';
  document.getElementById('player-hp-val').textContent = `${a.playerHp} / ${a.playerMaxHp}`;
  document.getElementById('enemy-hp-val').textContent = `${a.enemyHp} / ${a.enemyMaxHp}`;
}

function showCombatFlash(color) {
  if (['crimson','violet'].includes(color)) triggerScreenShake(220);
  const el = document.createElement('div');
  el.className = 'combat-flash';
  el.style.background = `linear-gradient(90deg, transparent, var(--${color}), transparent)`;
  el.style.boxShadow = `0 0 10px var(--${color})`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 400);
}

function triggerScreenShake(duration = 180) {
  document.body.animate([{ transform: 'translate(0,0)' },{ transform: 'translate(-2px,2px)' },{ transform: 'translate(2px,-2px)' },{ transform: 'translate(0,0)' }], { duration, iterations: 1 });
}

function playUiSfx(type = 'tick') {
  const tone = type === 'loot' ? 640 : type === 'crit' ? 520 : 320;
  alchemyTone(tone, 0.09, type === 'crit' ? 'square' : 'triangle');
}

function epicLootBurst() {
  playUiSfx('loot');
  const fx = document.createElement('div');
  fx.className = 'combat-flash';
  fx.style.width = '340px';
  fx.style.height = '5px';
  fx.style.background = 'linear-gradient(90deg, transparent, var(--amber), transparent)';
  document.body.appendChild(fx);
  setTimeout(() => fx.remove(), 600);
}

function useArtifactInCombat(artifactId) {
  const art = ARTIFACT_CATALOG.find(a => a.id === artifactId);
  if (!art || !GS.arena.inProgress) return;

  if (artifactId === 'prism_of_focus') {
    const bonus = Math.floor(GS.arena.playerPower * 0.2);
    GS.arena.playerPower += bonus;
    addTacticalLog(`${GS.player.name} активирует ${art.name}: +${bonus} к силе.`, 'player');
    renderArenaCombatants();
  } else if (artifactId === 'shield_of_silence') {
    GS.arena.playerDefending = true;
    addTacticalLog(`${GS.player.name} активирует ${art.name}: урон блокирован.`, 'player');
  } else {
    addTacticalLog(`${GS.player.name} активирует ${art.name}.`, 'player');
  }
  toast(`АРТЕФАКТ АКТИВИРОВАН`, `${art.name} применён в бою.`, 'info');
}

function usePotionInCombat() {
  if (!GS.arena.inProgress) return;
  const heal = Math.floor(30 + Math.random() * 20);
  GS.arena.playerHp = Math.min(GS.arena.playerMaxHp, GS.arena.playerHp + heal);
  updateArenaHPBars();
  addTacticalLog(`${GS.player.name} использует Эликсир. +${heal} HP.`, 'player');
  if (GS.player.emeralds >= 5) modifyEmeralds(-5);
}

// ====================== MODULE: GUILD & LEVIATHAN ======================
function guildParallax(e) {
  const host = e.currentTarget;
  const rect = host.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
  const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
  const p1 = host.querySelector('.p1');
  const p2 = host.querySelector('.p2');
  if (p1) p1.style.transform = `translate(${x}px, ${y}px)`;
  if (p2) p2.style.transform = `translate(${-x}px, ${-y}px)`;
}

function renderGuild() {
  checkGuildDailyReset();

  const lev = GS.guild;
  ensureGuildWeekQuest();
  const hpPct = lev.leviathanMaxHp > 0 ? Math.max(0, (lev.leviathanHp / lev.leviathanMaxHp) * 100) : 0;
  const dailyDmg = (lev.weekly?.bossMaxHp || lev.leviathanMaxHp) - (lev.weekly?.bossHp || lev.leviathanHp);

  setBar('lev-main-hpbar', hpPct);
  setText('lev-main-hplabel', `${lev.leviathanHp} / ${lev.leviathanMaxHp}`);
  setText('lev-main-dmg', `Урон сегодня: ${dailyDmg}`);
  setText('guild-quota-display', `${getTodayCompletedMissionsCount()} / ${lev.weekly?.dailyNorm || 3}`);
  setText('guild-total-dmg', dailyDmg);

  const frozen = GS.leviathanFrozenUntil > Date.now();
  const siegeText = frozen ? 'ЗАМОРОЖЕН' : (lev.dailyEnergy >= GUILD_DAILY_QUOTA ? 'ФАЗА ПОДАВЛЕНИЯ' : 'КРИТИЧЕСКАЯ УГРОЗА');
  setText('guild-siege-status', siegeText);

  const attackBtn = document.getElementById('guild-attack-btn');
  if (attackBtn) attackBtn.textContent = 'ЕЖЕДНЕВНЫЙ УДАР (1 РАЗ/ДЕНЬ)';

  const list = document.getElementById('guild-members-list');
  if (!list) return;
  if (!lev.exists) {
    list.innerHTML = `<div style="text-align:center;color:var(--text-muted);font-family:var(--font-tact);font-size:11px;padding:20px">Гильдия не создана.<br><div style="margin-top:10px"><button class='btn btn-emerald btn-sm' onclick='createGuild()'>СОЗДАТЬ ГИЛЬДИЮ</button></div></div>`;
    return;
  }
  if (!lev.members || lev.members.length === 0) {
    list.innerHTML = `<div style="text-align:center;color:var(--text-muted);font-family:var(--font-tact);font-size:11px;padding:20px">Гильдия создана: ${escHtml(lev.name || 'Без названия')}<br><div style="margin-top:10px"><button class='btn btn-violet btn-sm' onclick='inviteGuildPlayers()'>ПРИГЛАСИТЬ ИГРОКОВ</button></div></div>`;
    return;
  }

  list.innerHTML = lev.members.map(m => {
    const energyPct = Math.min(100, ((m.energy || 0) / 7) * 100);
    const initials = m.name.slice(0, 2).toUpperCase();
    return `
      <div class="guild-member">
        <div class="member-avatar">${initials}</div>
        <div class="member-info">
          <div class="member-name">${escHtml(m.name)}</div>
          <div class="member-contribution">${m.class} — Энергия: ${(m.energy || 0)}/${GUILD_DAILY_QUOTA}</div>
        </div>
        <div>
          <div class="member-energy-bar">
            <div class="member-energy-fill" style="width:${energyPct}%"></div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="removeGuildMember('${m.id}')">x</button>
      </div>
    `;
  }).join('');
}

function renderLeviathanView() {
  // Compatibility proxy: Leviathan UI is now part of guild-view.
  renderGuild();
}

function addGuildMember() {
  const name = document.getElementById('gm-name').value.trim();
  const cls = document.getElementById('gm-class').value;
  if (!name) { toast('ОШИБКА', 'Введите позывной бойца.', 'warning'); return; }

  const classNames = {
    transmuter: 'ТРАНСМУТАТОР',
    distiller: 'ДИСТИЛЛЯТОР',
    crystallizer: 'КРИСТАЛЛИЗАТОР',
    voidseer: 'ПРОВИДЕЦ ПУСТОТЫ'
  };

  GS.guild.members.push({
    id: Date.now().toString(),
    name,
    class: classNames[cls],
    energy: 0,
    joinedAt: new Date().toISOString()
  });

  saveState();
  closeModal('guild-member-modal');
  renderGuild();
  document.getElementById('gm-name').value = '';

  toast('РЕКРУТ ПРИНЯТ', `${name} (${classNames[cls]}) зачислен в гильдию.`, 'success');
}

function removeGuildMember(id) {
  GS.guild.members = GS.guild.members.filter(m => m.id !== id);
  saveState();
  renderGuild();
}

function getTodayCompletedMissionsCount() {
  const today = getTodayKey();
  return (GS.missions || []).filter(m => (m.completedAt || '').startsWith(today)).length;
}

function getWeekId() {
  const d = new Date();
  return `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;
}

function ensureGuildWeekQuest() {
  const weekId = getWeekId();
  GS.guild.weekly = GS.guild.weekly || { id: '', startDate: '', endDate: '', bossMaxHp: 30000, bossHp: 30000, lastStrikeDate: '', dailyNorm: 3 };
  if (GS.guild.weekly.id !== weekId) {
    GS.guild.weekly = { id: weekId, startDate: getTodayKey(), endDate: '', bossMaxHp: 30000, bossHp: 30000, lastStrikeDate: '', dailyNorm: 3, board: {} };
    GS.guild.leviathanMaxHp = GS.guild.weekly.bossMaxHp;
    GS.guild.leviathanHp = GS.guild.weekly.bossHp;
    GS.guild.dailyEnergy = 0;
  }
}

function createGuild() {
  const name = prompt('Введите название гильдии:');
  if (!name) return;
  GS.guild.exists = true;
  GS.guild.name = name.trim().slice(0, 28);
  ensureGuildWeekQuest();
  pushActivity(`Создана гильдия: ${GS.guild.name}`, 'guild');
  saveState();
  renderGuild();
}

function inviteGuildPlayers() {
  if (!GS.guild.exists) { toast('ГИЛЬДИЯ', 'Сначала создайте гильдию.', 'warning'); return; }
  const sample = ['VEX','NOVA','ORION','KITE','MARA','SABLE'];
  const toAdd = sample.filter(n => !(GS.guild.members || []).some(m => m.name === n)).slice(0, 2);
  toAdd.forEach((n, i) => GS.guild.members.push({ id: `${Date.now()}_${i}`, name: n, class: 'СОЮЗНИК', energy: 0, joinedAt: new Date().toISOString() }));
  pushActivity(`В гильдию вступили игроки: ${toAdd.join(', ') || 'нет новых'}`, 'guild');
  saveState();
  renderGuild();
}

function processGuildDailyStrike(trigger = 'manual') {
  if (!GS.guild.exists) { toast('ГИЛЬДИЯ', 'Создайте гильдию для рейда.', 'warning'); return false; }
  ensureGuildWeekQuest();
  const today = getTodayKey();
  if (GS.guild.weekly.lastStrikeDate === today) {
    if (trigger === 'manual') toast('РЕЙД', 'Урон на сегодня уже засчитан.', 'info');
    return false;
  }
  const doneToday = getTodayCompletedMissionsCount();
  const norm = GS.guild.weekly.dailyNorm || 3;
  if (doneToday < norm) {
    GS.guild.weekly.board = GS.guild.weekly.board || {};
    GS.guild.weekly.board[`${GS.guild.weekly.id}-${weekdayIdx}`] = { status: 'miss', who: '' };
    if (trigger === 'manual') toast('РЕЙД', `Норма дня не выполнена: ${doneToday}/${norm}.`, 'warning');
    saveState();
    renderGuild();
    return false;
  }

  const memberCount = Math.max(1, GS.guild.members.length);
  const dmg = Math.floor(120 + memberCount * 55 + GS.player.level * 8 + (GS.player.streak || 0) * 5);
  GS.guild.weekly.bossHp = Math.max(0, GS.guild.weekly.bossHp - dmg);
  GS.guild.leviathanHp = GS.guild.weekly.bossHp;
  GS.guild.weekly.lastStrikeDate = today;
  GS.guild.weekly.board = GS.guild.weekly.board || {};
  GS.guild.weekly.board[`${GS.guild.weekly.id}-${weekdayIdx}`] = { status: 'hit', who: GS.player.name };
  GS.guild.dailyEnergy = (GS.guild.dailyEnergy || 0) + 1;
  GS.guild.members.forEach(m => { m.energy = Math.min(7, (m.energy || 0) + 1); });

  pushActivity(`Гильдейский удар по Левиафану: -${dmg} HP`, 'raid');
  toast('РЕЙДОВЫЙ УДАР', `Нанесено ${dmg} урона. Засчитан ежедневный вход.`, 'success');

  if (GS.guild.weekly.bossHp <= 0) {
    addXP(500);
    modifyEmeralds(260);
    toast('НЕДЕЛЬНЫЙ КВЕСТ ЗАВЕРШЕН', 'Левиафан повержен. Награды выданы всей гильдии.', 'success', 7000);
    GS.guild.weekly.id = '';
    ensureGuildWeekQuest();
  }

  saveState();
  renderGuild();
  return true;
}

function contributeEnergy() {
  processGuildDailyStrike('manual');
}

function checkGuildQuota() {
  return;
}

function checkGuildDailyReset() {
  ensureGuildWeekQuest();
}


// ====================== MODULE: COMPANION SYSTEM ======================
function renderArmory() {
  const emEl = document.getElementById('armory-emerald-count');
  if (emEl) emEl.textContent = GS.player.emeralds;
  const totalEl = document.getElementById('companion-total-count');
  const ownEl = document.getElementById('companion-owned-count');
  if (totalEl) totalEl.textContent = COMPANION_CATALOG.length;
  if (ownEl) ownEl.textContent = (GS.ownedCompanions || []).length;

  const grid = document.getElementById('companion-grid');
  if (!grid) return;

  grid.innerHTML = COMPANION_CATALOG.map(comp => {
    const owned = (GS.ownedCompanions || []).includes(comp.id);
    const rarityLabel = comp.rarity === 'rare' ? 'РЕДКИЙ' : comp.rarity === 'epic' ? 'ЭПИК' : comp.rarity === 'relic' ? 'РЕЛИКВИЯ' : 'ЛЕГЕНД.';
    const load = getCompanionLoadout(comp.id);
    return `
      <div class="companion-card ${comp.rarity}${owned ? ' owned' : ''}">
        <span class="companion-rarity">${rarityLabel}</span>
        <div class="companion-portrait" style="background-image:url('assets/companions-sheet.png');background-size:800px 500px;background-position:${comp.id==='chronocatcher'?'0px 0px':comp.id==='etherwatcher'?'-200px 0px':comp.id==='plasmareaper'?'-400px 0px':comp.id==='shadowarchitect'?'-600px 0px':comp.id==='voidoracle'?'0px -250px':comp.id==='crystalwarden'?'-200px -250px':'-400px -250px'};">${comp.portrait}</div>
        <div class="companion-name">${comp.name}</div>
        <div class="companion-title">${comp.title}</div>
        <div class="companion-lore">${comp.lore}</div>
        <div class="companion-bonuses">
          Пассив: ${comp.passive}<br>
          Актив: ${comp.active}
        </div>
        <div class="companion-buy-row">
          <div class="companion-cost">${comp.cost} ИЗУ</div>
          ${owned ? `<button class="btn btn-violet btn-sm" onclick="setActiveCompanion('${comp.id}')">${GS.activeCompanionId === comp.id ? 'АКТИВЕН' : 'СДЕЛАТЬ ОСНОВНЫМ'}</button>` : `<button class="btn btn-emerald btn-sm" onclick="purchaseCompanion('${comp.id}')">ПОЛУЧИТЬ</button>`}
        </div>
        ${owned ? `<div style='margin-top:8px'>${getCompanionArtifactDefs(comp.id).map(a => `<div style='display:flex;justify-content:space-between;gap:8px;margin-bottom:4px'><span style='font-size:10px;color:var(--text-sec)'>[${a.slot.toUpperCase()}] ${a.name}</span><span>${(GS.ownedCompanionArtifacts||[]).includes(a.id) ? `<button class=\"btn btn-ghost btn-sm\" onclick=\"equipCompanionArtifact('${comp.id}','${a.id}')\">${load[a.slot]===a.id ? 'СНЯТЬ' : 'ЭКИП'}</button>` : `<button class=\"btn btn-emerald btn-sm\" onclick=\"buyCompanionArtifact('${a.id}')\">${a.cost} ИЗУ</button>`}</span></div>`).join('')}</div>` : ''}
      </div>
    `;
  }).join('');
}

function purchaseCompanion(companionId) {
  const comp = COMPANION_CATALOG.find(c => c.id === companionId);
  if (!comp) return;

  GS.ownedCompanions = GS.ownedCompanions || [];
  if (GS.ownedCompanions.includes(companionId)) {
    toast('УЖЕ ПОЛУЧЕН', 'Этот персонаж уже состоит в вашей боевой команде.', 'warning');
    return;
  }

  if (GS.player.emeralds < comp.cost) {
    const alert = document.getElementById('armory-alert');
    if (alert) {
      alert.style.display = 'flex';
      setTimeout(() => { alert.style.display = 'none'; }, 3000);
    }
    toast('НЕДОСТАТОЧНО РЕСУРСОВ', `Требуется ${comp.cost} изумрудов. Доступно: ${GS.player.emeralds}.`, 'warning');
    return;
  }

  modifyEmeralds(-comp.cost);
  GS.ownedCompanions.push(companionId);
  GS.companionLoadouts = GS.companionLoadouts || {};
  if (!GS.companionLoadouts[companionId]) GS.companionLoadouts[companionId] = { artifacts: [] };
  if (!GS.activeCompanionId) GS.activeCompanionId = companionId;
  saveState();
  renderArmory();
  renderArenaCombatants();
  epicLootBurst();
  toast('СПУТНИК ПРИЗВАН', `${comp.name} присоединяется к вашей команде Арены.`, 'success');
}

function tierLabel(tier) {
  const labels = {
    common: 'ОБЫЧНЫЙ',
    rare: 'РЕДКИЙ',
    epic: 'ЭПИЧЕСКИЙ',
    relic: 'РЕЛИКВИЯ',
    legendary: 'ЛЕГЕНДАРНЫЙ'
  };
  return labels[tier] || tier;
}

function transmute(artifactId) {
  const art = ARTIFACT_CATALOG.find(a => a.id === artifactId);
  if (!art) return;

  if (GS.ownedArtifacts.includes(artifactId)) {
    toast('УЖЕ ПОЛУЧЕН', 'Артефакт уже находится в вашем арсенале.', 'warning');
    return;
  }

  if (GS.player.emeralds < art.cost) {
    document.getElementById('armory-alert').style.display = 'flex';
    setTimeout(() => document.getElementById('armory-alert').style.display = 'none', 3000);
    toast('НЕДОСТАТОЧНО РЕСУРСОВ', `Необходимо ${art.cost} изумрудов. Имеется: ${GS.player.emeralds}.`, 'warning');
    return;
  }

  modifyEmeralds(-art.cost);
  GS.ownedArtifacts.push(artifactId);

  // Apply artifact effect
  try {
    art.effectFn(GS);
  } catch(e) { console.warn('Ошибка применения артефакта:', e); }

  saveState();
  renderArmory();
  document.getElementById('armory-emerald-count').textContent = GS.player.emeralds;

  toast(`ТРАНСМУТАЦИЯ ЗАВЕРШЕНА`, `Артефакт "${art.name}" получен и активирован.`, 'success', 4000);

  // Immediate effects
  if (artifactId === 'temporal_crystal') {
    modifyHP(30, 'Темпоральный Кристалл активирован.');
  }
  checkAchievements('artifact_transmute');
}

function renderLab() {
  const ess = document.getElementById('lab-essence-count');
  if (ess) ess.textContent = GS.essences || 0;
}

function craftInLab(recipe) {
  if (recipe === 'focus_resin') {
    if (GS.player.emeralds < 30 || (GS.essences || 0) < 8) {
      toast('ЛАБОРАТОРИЯ', 'Недостаточно ресурсов для Focus Resin.', 'warning');
      return;
    }
    modifyEmeralds(-30);
    GS.essences -= 8;
    GS.xpBoostCharges = (GS.xpBoostCharges || 0) + 1;
    document.getElementById('lab-status').textContent = 'РЕАКЦИЯ СТАБИЛЬНА: Focus Resin получен.';
  } else if (recipe === 'will_tonic') {
    if (GS.player.emeralds < 20 || (GS.essences || 0) < 6) {
      toast('ЛАБОРАТОРИЯ', 'Недостаточно ресурсов для Will Tonic.', 'warning');
      return;
    }
    modifyEmeralds(-20);
    GS.essences -= 6;
    GS.player.energy = Math.min(GS.player.maxEnergy, GS.player.energy + 25);
    document.getElementById('lab-status').textContent = 'РЕАКЦИЯ ЗАВЕРШЕНА: Воля восстановлена.';
  }
  const el = document.getElementById('lab-reaction');
  el.style.boxShadow = '0 0 32px rgba(99,102,241,0.35), inset 0 0 24px rgba(16,185,129,0.25)';
  setTimeout(() => { el.style.boxShadow = ''; }, 700);
  saveState();
  renderLab();
  updateHeader();
}

// ====================== MODULE: PROFILE & AVATAR ======================
function renderProfile() {
  const p = GS.player;
  const initials = p.name.slice(0, 2).toUpperCase();

  if (!GS.player.avatar) document.getElementById('profile-avatar').textContent = initials;
  document.getElementById('profile-name').textContent = p.name;
  document.getElementById('profile-name-input').value = p.name;

  const classLabel = getClassLabel(p.level);
  document.getElementById('profile-class').textContent = classLabel;

  document.getElementById('profile-level-num').textContent = p.level;
  document.getElementById('hdr-level').textContent = p.level;

  const needed = XP_PER_LEVEL(p.level);
  const pct = Math.min(100, (p.xp / needed) * 100);
  document.getElementById('profile-xp-fill').style.width = pct + '%';
  document.getElementById('profile-xp-label').textContent = `${p.xp} / ${needed} XP`;

  document.getElementById('prof-total-missions').textContent = p.totalMissions;
  document.getElementById('prof-failed-focus').textContent = p.failedFocus;
  document.getElementById('prof-claimed-days').textContent = Object.values(GS.calendar).filter(d => d.claimed).length;
  document.getElementById('prof-artifacts').textContent = GS.ownedArtifacts.length;
  applyAvatarToUI();
}

function getClassLabel(level) {
  if (level < 5) return 'НОВОБРАНЕЦ — КЛАСС D';
  if (level < 10) return 'РЕКРУТ — КЛАСС C';
  if (level < 20) return 'ВЕТЕРАН — КЛАСС B';
  if (level < 35) return 'ЭЛИТА — КЛАСС A';
  if (level < 50) return 'КОМАНДОР — КЛАСС S';
  return 'ЛЕГЕНДА — КЛАСС SS';
}

function uploadAvatar(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('АВАТАР', 'Выберите изображение.', 'warning'); return; }
  if (file.size > 1.5 * 1024 * 1024) { toast('АВАТАР', 'Файл слишком большой (макс 1.5MB).', 'warning'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    GS.player.avatar = String(reader.result || '');
    applyAvatarToUI();
    saveState();
    pushActivity('Аватар обновлён', 'profile');
    toast('АВАТАР ОБНОВЛЁН', 'Новый образ алхимика активирован.', 'success');
  };
  reader.readAsDataURL(file);
}

function applyAvatarToUI() {
  const av = GS.player.avatar || '';
  const profile = document.getElementById('profile-avatar');
  const preview = document.getElementById('profile-avatar-preview');
  const header = document.getElementById('hdr-avatar');
  [profile, preview, header].forEach(el => {
    if (!el) return;
    if (av) { el.style.backgroundImage = `url(${av})`; el.style.backgroundSize = "cover"; el.style.backgroundPosition = "center"; el.textContent = ""; }
    else { el.style.backgroundImage = ""; }
  });
}

function saveProfile() {
  const name = document.getElementById('profile-name-input').value.trim();
  if (!name) { toast('ОШИБКА', 'Введите позывной.', 'warning'); return; }
  GS.player.name = name;
  saveState();
  renderProfile();
  toast('ДАННЫЕ ОБНОВЛЕНЫ', `Позывной изменён на "${name}".`, 'success');
  checkAchievements('profile_saved');
}

function confirmReset() {
  openModal('reset-modal');
}

function executeReset() {
  localStorage.removeItem(STORAGE_KEY);
  if (GS.auth && GS.auth.uid) localStorage.removeItem(`${USER_STORAGE_PREFIX}${GS.auth.uid}`);
  closeModal('reset-modal');
  location.reload();
}

// ============================================================
// UTILITY
// ============================================================
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// INITIALIZATION
// ============================================================
function init() {
  loadState();
  GS.ownedCompanions = Array.isArray(GS.ownedCompanions) ? GS.ownedCompanions : [];
  GS.taskHistory = Array.isArray(GS.taskHistory) ? GS.taskHistory : [];
  GS.activityLog = Array.isArray(GS.activityLog) ? GS.activityLog : [];
  GS.season = GS.season || { tier: 1, seasonXp: 0, weeklyContracts: [] };
  if (!GS.activityLog.length) pushActivity('Система активирована', 'system');
  ensureAchievementState();
  hydrateEnergyRegen();
  renderAll();
  checkGuildDailyReset();
  processGuildDailyStrike('login');

  // Set today's date as default for mission deadline
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('m-deadline').value = today;

  // Burnout warning check
  if (GS.player.hp <= 20) {
    document.body.classList.add('burnout-warning');
  }

  // Welcome toast
  const lastSave = GS.lastSave;
  if (!lastSave) {
    toast('ТЕРМИНАЛ АКТИВИРОВАН', 'Добро пожаловать в AETHER PROTOCOL. Введите первую директиву.', 'info', 5000);
  } else {
    const diff = Date.now() - lastSave;
    const hrs = Math.floor(diff / 3600000);
    if (hrs > 0) {
      toast('СЕАНС ВОССТАНОВЛЕН', `Отсутствовали ${hrs}ч. Статус: ${GS.player.hp} HP, ${GS.player.emeralds} изумрудов.`, 'info', 4000);
    }
  }

  // Auto-save every 30s
  setInterval(() => {
    hydrateEnergyRegen();
    saveState();
    updateHeader();
  }, 30000);

  setInterval(() => {
    hydrateEnergyRegen();
    updateHeader();
  }, 15000);

  setAuthMode('login');
  initFirebaseAuth();
  checkAchievements('init');

  console.log('%cAETHER PROTOCOL — Система инициализирована', 'color:#10B981;font-family:JetBrains Mono;font-size:14px;font-weight:bold');
  console.log('%cv4.6 | Алхимический Терминал', 'color:#6366F1;font-family:JetBrains Mono;font-size:11px');
}

function renderAll() {
  updateHeader();
  renderMissions();
  renderCalendar();
  renderArmory();
  renderGuild();
  renderLeviathanView();
  renderProfile();
  renderLab();
  updateDashboardStats();
}

// Boot sequence
document.addEventListener('DOMContentLoaded', init);
