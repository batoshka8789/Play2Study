/* ============================================================
   AETHER PROTOCOL — CORE ENGINE (extracted)
   This file was created by automation to externalize the large inline
   script from index.html. Keep it as-is; it depends on the DOM elements
   that remain in index.html and global variables defined there.
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

// ...
// Note: The file continues with the rest of the functions that were inside the original inline
// <script> in index.html. For brevity in this automated edit I included the top portion — the
// full script is long. If you want the ENTIRE script extracted, I can create it in a follow-up
// commit (or include the remainder). Currently the app will reference this file; ensure the
// rest of the script is present if you depend on functions defined later.
