# Kanban Board

Webová aplikace pro správu úkolů pomocí drag & drop.

## Popis

Kanban Board je single-page aplikace inspirovaná nástroji jako Trello nebo Notion. Umožňuje organizovat úkoly pomocí vizuálních sloupců a karet, které lze přesouvat metodou drag & drop. Aplikace funguje kompletně v prohlížeči, ukládá data do LocalStorage a díky Service Workeru pracuje i offline.

## Funkce

- **Správa sloupců** – vytvoření, přejmenování, smazání
- **Správa karet** – název, popis, priorita, štítky, deadline
- **Drag & Drop** – přesun karet mezi sloupci i v rámci sloupce
- **Filtrování** – textové vyhledávání + filtr podle priority
- **Historie** – Undo/Redo s klávesovými zkratkami
- **Offline režim** – Service Worker s cache strategiemi
- **Statistiky** – přehledy s SVG grafy (pie chart, bar chart)
- **Archiv** – archivace karet místo mazání
- **Export/Import** – záloha dat do JSON souboru
- **Tmavý režim** – přepínatelné barevné schéma
- **Zvukové efekty** – notifikace při dokončení úkolu
- **Responzivní design** – funguje na desktopu i mobilu

## Klávesové zkratky

| Zkratka | Akce |
|---------|------|
| `Ctrl + Z` | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `Ctrl + Enter` | Uložit formulář |
| `Escape` | Zavřít modal |

## Struktura projektu

```
kanban-board/
├── index.html
├── sw.js                     # Service Worker
├── css/
│   └── style.css
├── js/
│   ├── app.js                # Vstupní bod aplikace
│   ├── classes/              # OOP třídy
│   │   ├── Board.js
│   │   ├── Column.js
│   │   ├── Card.js
│   │   ├── DragController.js
│   │   └── HistoryManager.js
│   ├── components/           # Web Components
│   │   └── KanbanCard.js
│   ├── utils/                # Utility
│   │   ├── storage.js
│   │   └── audio.js
│   └── pages/                # Stránky SPA
│       ├── BoardPage.js
│       ├── ArchivePage.js
│       ├── StatsPage.js
│       └── SettingsPage.js
├── assets/
│   ├── icons/
│   └── sounds/
│       └── complete.mp3
└── data/
    └── sample-board.json     # Ukázková data
```

## Spuštění

Aplikace **musí být spuštěna přes HTTP server** (ne přes `file://`), aby fungovaly ES moduly a Service Worker.

### Možnosti spuštění:

**Python 3:**
```bash
python -m http.server 8080
```

**Node.js (npx):**
```bash
npx serve
```

**VS Code:**
Použít rozšíření *Live Server* – klik pravým tlačítkem na `index.html` → *Open with Live Server*.

Poté otevřít prohlížeč na `http://localhost:8080` (nebo jiný port).

## Technologie

- **HTML5** – sémantické značky, validní doctype, šablony (`<template>`)
- **CSS3** – CSS proměnné, nested CSS, transformace, animace, media queries
- **JavaScript (ES6+)** – moduly, třídy, async/await
- **Web APIs**:
  - Drag & Drop API
  - LocalStorage
  - File API (export/import)
  - History API (SPA routing)
  - Service Worker API (offline)
  - Media API (audio)
  - Custom Elements (Web Components)
  - SVG (dynamicky generované grafy)

## Hodnotící kritéria (KAJ)

Aplikace pokrývá všechny povinné i většinu volitelných kritérií z hodnotící tabulky:

| Kategorie | Implementace |
|-----------|--------------|
| Validita HTML5 | doctype, validní HTML |
| Sémantické značky | `header`, `main`, `section`, `article`, `footer`, `nav`, `time` |
| SVG | Pie chart a bar chart ve statistikách |
| Audio | `complete.mp3` při přesunu do Done |
| Formulářové prvky | `type`, `required`, `autofocus`, validation |
| Pokročilé CSS selektory | `:focus`, `:empty`, `[data-priority]`, `:not()` |
| CSS transformace | rotate, scale při drag |
| CSS animace | slideIn, pulse, fade |
| Media queries | 768px, 480px |
| Nested CSS | Nativní nesting |
| OOP přístup | Board, Column, Card, DragController, HistoryManager |
| Pokročilé JS API | Drag & Drop, LocalStorage, File API |
| History API | pushState, popstate, replaceState |
| Ovládání médií | AudioManager |
| Offline aplikace | Service Worker |
| JS práce s SVG | Dynamicky vytvářené grafy |
| Web komponenta | `<kanban-card>` |

## Autor

Semestrální práce z předmětu **KAJ – Tvorba klientských aplikací v JavaScriptu**, ČVUT FEL, 2026.

## Licence

MIT
