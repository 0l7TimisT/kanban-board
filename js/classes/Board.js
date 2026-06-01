// Board je hlavní datový model celé aplikace.
// Drží seznam sloupců a poskytuje metody pro práci s nimi i s kartami.
// Také se stará o ukládání dat do localStorage.

import { Column } from './Column.js';
import { Storage, STORAGE_KEYS } from '../utils/storage.js';

export class Board {
  constructor({ id = crypto.randomUUID(), title = 'Moje nástěnka', columns = [] }) {
    this.id = id;
    this.title = title;
    // Stejně jako v Column — převedeme prosté objekty na instance třídy Column
    this.columns = columns.map(c => c instanceof Column ? c : new Column(c));
  }

  // Vytvoří novou nástěnku s výchozími třemi sloupci — používá se při prvním spuštění
  static getDefault() {
    return new Board({
      title: 'Moje nástěnka',
      columns: [
        new Column({ title: 'To Do' }),
        new Column({ title: 'In Progress' }),
        new Column({ title: 'Done' })
      ]
    });
  }

  // Načte nástěnku z localStorage, nebo vrátí výchozí pokud tam nic není
  static load() {
    const data = Storage.load(STORAGE_KEYS.BOARD);
    return data ? new Board(data) : Board.getDefault();
  }

  // Uloží aktuální stav nástěnky do localStorage
  save() {
    Storage.save(STORAGE_KEYS.BOARD, this.toJSON());
  }

  // Přidá nový sloupec na konec nástěnky, uloží a vrátí ho
  addColumn(title) {
    const column = new Column({ title });
    this.columns.push(column);
    this.save();
    return column;
  }

  // Smaže sloupec podle ID. Vrátí smazaný sloupec, nebo null pokud nebyl nalezen.
  removeColumn(columnId) {
    const index = this.columns.findIndex(c => c.id === columnId);
    if (index === -1) return null;
    const [removed] = this.columns.splice(index, 1);
    this.save();
    return removed;
  }

  // Přesune sloupec na novou pozici v rámci nástěnky.
  // V UI zatím není tlačítko pro přesunutí sloupce, ale metoda je připravena
  // pro případ, že by se drag & drop sloupců implementoval v budoucnu.
  moveColumn(columnId, toIndex) {
    const fromIndex = this.columns.findIndex(c => c.id === columnId);
    if (fromIndex === -1) return false;
    const [column] = this.columns.splice(fromIndex, 1);
    this.columns.splice(toIndex, 0, column);
    this.save();
    return true;
  }

  // Najde a vrátí sloupec podle ID
  findColumn(columnId) {
    return this.columns.find(c => c.id === columnId);
  }

  // Prohledá všechny sloupce a najde kartu podle ID.
  // Vrátí objekt { card, column }, abychom věděli i ve kterém sloupci karta je.
  findCard(cardId) {
    for (const column of this.columns) {
      const card = column.findCard(cardId);
      if (card) return { card, column };
    }
    return null;
  }

  // Přesune kartu z jednoho sloupce do druhého na danou pozici.
  // Tohle nastane při drag & drop mezi sloupci.
  moveCardBetweenColumns(cardId, fromColumnId, toColumnId, toIndex) {
    const fromColumn = this.findColumn(fromColumnId);
    const toColumn = this.findColumn(toColumnId);
    if (!fromColumn || !toColumn) return false;

    // Odstraníme kartu ze zdrojového sloupce a vložíme ji do cílového
    const card = fromColumn.removeCard(cardId);
    if (!card) return false;

    toColumn.insertCardAt(card, toIndex);
    this.save();
    return true;
  }

  // Vypočítá statistiky pro stránku Statistiky — počty karet, priority, prošlé termíny
  getStats() {
    const allCards = [];
    for (const col of this.columns) {
      for (const card of col.cards) {
        allCards.push(card);
      }
    }

    const active = allCards.filter(c => !c.archived);
    const archived = allCards.filter(c => c.archived);

    return {
      total: allCards.length,
      active: active.length,
      archived: archived.length,
      byPriority: {
        high: active.filter(c => c.priority === 'high').length,
        medium: active.filter(c => c.priority === 'medium').length,
        low: active.filter(c => c.priority === 'low').length
      },
      overdue: active.filter(c => c.isOverdue()).length,
      columnsCount: this.columns.length
    };
  }

  // Převede celou nástěnku na prostý objekt pro uložení do localStorage
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      columns: this.columns.map(c => c.toJSON())
    };
  }

  // Přepíše aktuální stav nástěnky daty z objektu — používá se při Undo/Redo
  // a při importu zálohy nebo načtení ukázkových dat
  loadFromJSON(data) {
    this.id = data.id;
    this.title = data.title;
    this.columns = data.columns.map(c => new Column(c));
    this.save();
  }
}
