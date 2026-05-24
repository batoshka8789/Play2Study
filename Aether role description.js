const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
  WidthType,
  LevelFormat,
  PageOrientation,
  PageBreak,
} = require("docx");
const fs = require("fs");

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 24 }, // 12pt default
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "10B981" },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "6366F1" },
        paragraph: { spacing: { before: 280, after: 180 }, outlineLevel: 1 },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "475569" },
        paragraph: { spacing: { before: 200, after: 140 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: {
            width: 12240,
            height: 15840,
          },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        // ЗАГОЛОВОК ДОКУМЕНТА
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          children: [new TextRun("AETHER PROTOCOL")],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 360 },
          children: [
            new TextRun({
              text: "Описание роли автора в проекте",
              size: 24,
              color: "94A3B8",
              italics: true,
            }),
          ],
        }),

        // ОБЩАЯ ИНФОРМАЦИЯ О ПРОЕКТЕ
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Информация о проекте")],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Название: ",
              bold: true,
            }),
            new TextRun("AETHER PROTOCOL — Алхимический Терминал"),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Версия: ",
              bold: true,
            }),
            new TextRun("6.04"),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Тип проекта: ",
              bold: true,
            }),
            new TextRun(
              "Геймифицированный планировщик задач (Task Tracker) с элементами RPG",
            ),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Технологический стек: ",
              bold: true,
            }),
            new TextRun(
              "Vanilla JavaScript, HTML5, CSS3, Firebase (аутентификация, база данных), PostHog Analytics",
            ),
          ],
        }),
        new Paragraph({
          spacing: { after: 360 },
          children: [
            new TextRun({
              text: "Концепция: ",
              bold: true,
            }),
            new TextRun(
              "Продуктивность через геймификацию — превращение повседневных задач в эпические миссии с системой прогрессии, боссами, артефактами и мультиплеерными элементами.",
            ),
          ],
        }),

        // РОЛЬ В ПРОЕКТЕ
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Роль в проекте")],
        }),
        new Paragraph({
          spacing: { after: 360 },
          children: [
            new TextRun({
              text: "Product Vision & Concept Design",
              bold: true,
              size: 26,
            }),
          ],
        }),

        // КОНЦЕПТУАЛЬНАЯ РОЛЬ
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun("1. Концептуальная и стратегическая роль")],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun(
              "Автор проекта отвечает за общую концепцию и стратегическое направление AETHER PROTOCOL. Это включает:",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Разработку уникальной концепции геймификации продуктивности",
              bold: false,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun(
              'Формирование философии "Левиафана" — глобального босса как метафоры прокрастинации и внешних вызовов',
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun(
              "Дизайн системы прогрессии: миссии с рангами (S/A/B/C/D), опыт (XP), изумруды (валюта), артефакты различной редкости",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun(
              "Создание нарратива и лора: алхимики, эфир, тактическая боевая система, гильдии",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 360 },
          children: [
            new TextRun(
              "Определение пользовательского опыта (UX): темные и светлые темы, терминальная эстетика, киберпанк-визуал",
            ),
          ],
        }),

        // ПРОДУКТОВАЯ РОЛЬ
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun("2. Продуктовая роль (Product Design)")],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun(
              "Автор выступает как главный продуктовый дизайнер, определяя функциональность и пользовательский интерфейс:",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Проектирование всех основных модулей:",
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 120, after: 0, left: 1440 },
          children: [
            new TextRun(
              "— Dashboard (главная панель) с показателями прогресса",
            ),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 0, left: 1440 },
          children: [
            new TextRun(
              "— Missions (система задач с приоритетами и дедлайнами)",
            ),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 0, left: 1440 },
          children: [new TextRun("— Arena (тактические PvE-бои с боссами)")],
        }),
        new Paragraph({
          spacing: { before: 0, after: 0, left: 1440 },
          children: [new TextRun("— Shop (лаборатория артефактов)")],
        }),
        new Paragraph({
          spacing: { before: 0, after: 120, left: 1440 },
          children: [new TextRun("— Guild (мультиплеерные элементы)")],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun(
              "Разработка игровых механик: комбо-система, тайминг атак (PERFECT/GOOD/MISS), стойки (Normal/Heavy/Defend), ультимативные способности",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun(
              "Дизайн системы ежедневных наград (Daily Rewards) с прогрессией и streak-механикой",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun(
              "Создание онбординга — интерактивного туториала из 6 шагов, объясняющего все механики",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 360 },
          children: [
            new TextRun(
              "Формулирование требований к UI/UX: glassmorphism-эффекты, анимации, адаптивность, dark/light темы",
            ),
          ],
        }),

        // РАБОТА С AI
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun("3. Работа с AI-ассистентом (Claude)")],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun(
              "Все техническое исполнение проекта выполнено автором самостоятельно, однако для генерации идей, промптов и структурирования концепции использовался AI-ассистент Claude от Anthropic. Автор применял Claude для:",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Структурирование идей:",
              bold: true,
            }),
            new TextRun(
              " формулирование концепций, создание описаний механик, генерация названий для артефактов и боссов",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Проработка нарратива:",
              bold: true,
            }),
            new TextRun(
              ' создание лора вселенной AETHER PROTOCOL, описание роли "алхимиков", история Левиафана',
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Валидация решений:",
              bold: true,
            }),
            new TextRun(
              " обсуждение геймдизайнерских решений, баланса механик, пользовательских сценариев",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Создание контента:",
              bold: true,
            }),
            new TextRun(
              " генерация описаний миссий, артефактов, способностей героев",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: "Документирование:",
              bold: true,
            }),
            new TextRun(
              " помощь в написании README, changelog, описаний для пользователей",
            ),
          ],
        }),
        new Paragraph({
          spacing: { after: 360 },
          children: [
            new TextRun({
              text: "КРИТИЧЕСКИ ВАЖНО: Вся техническая реализация — код, архитектура, интеграция Firebase, UI/UX-имплементация, тестирование — выполнена автором полностью самостоятельно.",
              bold: true,
              color: "EF4444",
            }),
          ],
        }),

        // ТЕХНИЧЕСКОЕ ИСПОЛНЕНИЕ
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun("4. Техническое исполнение")],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Автор проекта лично реализовал весь технический стек:",
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Frontend-разработка:",
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 120, after: 0, left: 1440 },
          children: [
            new TextRun("— ~13 700 строк чистого JavaScript (index.html)"),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 0, left: 1440 },
          children: [
            new TextRun(
              "— Архитектура: модульная система с глобальным состоянием (GS)",
            ),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 0, left: 1440 },
          children: [
            new TextRun(
              "— Реализация всех view-модулей: dashboard, missions, arena, shop, guild, profile",
            ),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 120, left: 1440 },
          children: [
            new TextRun(
              "— Advanced CSS: CSS Custom Properties, glassmorphism, анимации, адаптивность",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Backend & Firebase:",
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 120, after: 0, left: 1440 },
          children: [
            new TextRun(
              "— Интеграция Firebase Authentication (Email/Password, Google, Apple)",
            ),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 0, left: 1440 },
          children: [
            new TextRun(
              "— Firestore database schema: пользователи, миссии, гильдии, левиафан, активность",
            ),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 120, left: 1440 },
          children: [
            new TextRun(
              "— Реализация real-time синхронизации для мирового босса",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Игровая логика:",
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 120, after: 0, left: 1440 },
          children: [
            new TextRun(
              "— Формулы расчета урона, защиты, комбо-мультипликаторов",
            ),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 0, left: 1440 },
          children: [
            new TextRun(
              "— Система прогрессии: level = f(xp), ранги миссий, редкость артефактов",
            ),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 0, left: 1440 },
          children: [
            new TextRun(
              "— AI боссов: паттерны атак, условные способности, health management",
            ),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 120, left: 1440 },
          children: [
            new TextRun(
              "— Тактическая боевая система: stance switching, timing precision, combo chains",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Тестирование:",
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 120, after: 0, left: 1440 },
          children: [
            new TextRun(
              "— Написание test suite (suite.js): 40+ unit/feature/regression/load тестов",
            ),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 0, left: 1440 },
          children: [
            new TextRun(
              "— Покрытие: формулы урона, валидация никнеймов, OAuth flows, daily rewards",
            ),
          ],
        }),
        new Paragraph({
          spacing: { before: 0, after: 120, left: 1440 },
          children: [
            new TextRun(
              "— Performance testing: 1000 log pushes, 500 damage calculations, 200 calendar renders",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 360 },
          children: [
            new TextRun({
              text: "Analytics & Monitoring:",
              bold: true,
            }),
            new TextRun(
              " интеграция PostHog для отслеживания пользовательского поведения, session recording, feature flags",
            ),
          ],
        }),

        // КЛЮЧЕВЫЕ ДОСТИЖЕНИЯ
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun("5. Ключевые достижения проекта")],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Масштаб:",
              bold: true,
            }),
            new TextRun(
              " Single-file приложение объемом 600+ KB (index.html), полностью функциональное без внешних зависимостей",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Production-ready:",
              bold: true,
            }),
            new TextRun(
              " Progressive Web App (PWA) с manifest, offline support, mobile-first дизайн",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "UX-полировка:",
              bold: true,
            }),
            new TextRun(
              " keyboard shortcuts (1-4, Q, W, Space для арены), toast notifications, floating damage numbers, timing indicators",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Визуальный язык:",
              bold: true,
            }),
            new TextRun(
              " уникальный cyberpunk-terminal стиль с матрицей, scanlines, glow-эффектами, rarity-подсветкой",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Социальный слой:",
              bold: true,
            }),
            new TextRun(
              " концепция гильдий, мировой босс как общая цель, leaderboards (в разработке)",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 360 },
          children: [
            new TextRun({
              text: "Onboarding:",
              bold: true,
            }),
            new TextRun(
              " отдельный интерактивный туториал (aether_onboarding-2_1777076408699.html), объясняющий все механики через практику",
            ),
          ],
        }),

        // ВКЛАД В ИНДУСТРИЮ
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Вклад в индустрию продуктивности")],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun(
              "AETHER PROTOCOL представляет собой инновационный подход к gamification of productivity, объединяя:",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Глубину RPG-систем",
              bold: true,
            }),
            new TextRun(
              " (прогрессия, лут, boss fights) с практичностью task manager",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Эстетику AAA-игр",
              bold: true,
            }),
            new TextRun(
              " (полировка UI, visual effects, sound design концепты) с легковесностью web-приложения",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 360 },
          children: [
            new TextRun({
              text: "Социальные механики",
              bold: true,
            }),
            new TextRun(
              " (гильдии, мировой босс) с персональной продуктивностью",
            ),
          ],
        }),
        new Paragraph({
          spacing: { after: 360 },
          children: [
            new TextRun(
              "Проект демонстрирует, что серьезная геймификация может быть реализована без тяжелых фреймворков, оставаясь при этом масштабируемой и maintainable.",
            ),
          ],
        }),

        // ТЕХНИЧЕСКИЕ КОМПЕТЕНЦИИ
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Технические компетенции автора")],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun(
              "Проект AETHER PROTOCOL демонстрирует следующие навыки автора:",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Архитектура:",
              bold: true,
            }),
            new TextRun(
              " проектирование сложных single-page applications, модульная архитектура, state management",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Vanilla JavaScript:",
              bold: true,
            }),
            new TextRun(
              " глубокое знание нативного JS, event handling, DOM manipulation, async programming",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "CSS мастерство:",
              bold: true,
            }),
            new TextRun(
              " custom properties, animations, glassmorphism, responsive design, theme switching",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Firebase:",
              bold: true,
            }),
            new TextRun(
              " Authentication, Firestore, Real-time Database, Security Rules",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Game Design:",
              bold: true,
            }),
            new TextRun(
              " балансировка механик, формулы прогрессии, reward systems, player psychology",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Testing:",
              bold: true,
            }),
            new TextRun(
              " написание unit/feature/regression/load тестов, TDD-подход",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "UX/UI Design:",
              bold: true,
            }),
            new TextRun(
              " пользовательские сценарии, onboarding, визуальная иерархия, accessibility",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 360 },
          children: [
            new TextRun({
              text: "Product Management:",
              bold: true,
            }),
            new TextRun(
              " MVP-подход, feature prioritization, user research (через PostHog)",
            ),
          ],
        }),

        // ЗАКЛЮЧЕНИЕ
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun("Заключение")],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Роль автора в AETHER PROTOCOL:",
              bold: true,
              size: 26,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Визионер и Product Owner:",
              bold: true,
            }),
            new TextRun(
              " создание концепции, определение направления развития",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Архитектор:",
              bold: true,
            }),
            new TextRun(
              " проектирование системы, выбор технологий, создание структуры",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Главный разработчик:",
              bold: true,
            }),
            new TextRun(
              " 100% кода написано лично (frontend, backend integration, game logic)",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Game Designer:",
              bold: true,
            }),
            new TextRun(
              " все игровые механики, формулы баланса, reward systems",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "UI/UX Designer:",
              bold: true,
            }),
            new TextRun(
              " визуальный стиль, все интерфейсы, анимации, onboarding",
            ),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          spacing: { after: 360 },
          children: [
            new TextRun({
              text: "QA Engineer:",
              bold: true,
            }),
            new TextRun(" написание и поддержка тестового покрытия"),
          ],
        }),

        new Paragraph({
          spacing: { before: 240, after: 0 },
          border: {
            top: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: "10B981",
              space: 1,
            },
          },
          children: [],
        }),
        new Paragraph({
          spacing: { before: 240 },
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "Claude (AI) использовался исключительно как инструмент для структурирования идей и генерации контента.",
              italics: true,
              color: "94A3B8",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 360 },
          children: [
            new TextRun({
              text: "Вся техническая реализация выполнена автором самостоятельно.",
              bold: true,
              color: "10B981",
              size: 24,
            }),
          ],
        }),

        // МЕТАДАННЫЕ
        new Paragraph({
          spacing: { before: 480 },
          border: {
            top: {
              style: BorderStyle.SINGLE,
              size: 2,
              color: "E2E8F0",
              space: 1,
            },
          },
          children: [],
        }),
        new Paragraph({
          spacing: { before: 120 },
          children: [
            new TextRun({
              text: "Дата создания документа: ",
              size: 20,
              color: "94A3B8",
            }),
            new TextRun({
              text: "27 апреля 2026",
              size: 20,
              color: "E2E8F0",
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Версия проекта: ",
              size: 20,
              color: "94A3B8",
            }),
            new TextRun({
              text: "AETHER PROTOCOL v6.04",
              size: 20,
              color: "E2E8F0",
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Документ подготовлен с помощью: ",
              size: 20,
              color: "94A3B8",
            }),
            new TextRun({
              text: "Claude (Anthropic) + docx-js",
              size: 20,
              color: "E2E8F0",
            }),
          ],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(
    "/mnt/user-data/outputs/AETHER_PROTOCOL_Role_Description.docx",
    buffer,
  );
  console.log("✓ Document created successfully!");
});
