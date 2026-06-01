// Column představuje jeden sloupec na nástěnce (např. "To Do", "In Progress").
// Drží seznam karet a umí s nimi manipulovat.

import { Card } from './Card.js';

export class Column {
  constructor({ id = crypto.randomUUID(), title, cards = [] }) {
    this.id = id;
    this.title = title;
    // Pokud načítáme data z localStorage, cards jsou prosté objekty —
    // musíme je převést na instance třídy Card
    this.cards = cards.map(c => c instanceof Card ? c : new Card(c));
  }

  // Přidá novou kartu na konec sloupce a vrátí ji
  addCard(cardData) {
    const card = new Card(cardData);
    this.cards.push(card);
    return card;
  }

  // Najde kartu podle ID, odebere ji ze seznamu a vrátí ji.
  // Vrátí null pokud karta neexistuje.
  removeCard(cardId) {
    const index = this.cards.findIndex(c => c.id === cardId);
    if (index === -1) return null;
    return this.cards.splice(index, 1)[0];
  }

  // Najde a vrátí kartu podle ID bez jejího odebrání
  findCard(cardId) {
    return this.cards.find(c => c.id === cardId);
  }

  // Přesune kartu na novou pozici v rámci stejného sloupce.
  // Používá se při drag & drop uvnitř jednoho sloupce.
  moveCard(cardId, toIndex) {
    const fromIndex = this.cards.findIndex(c => c.id === cardId);
    if (fromIndex === -1) return false;
    const [card] = this.cards.splice(fromIndex, 1);
    this.cards.splice(toIndex, 0, card);
    return true;
  }

  // Vloží kartu na konkrétní pozici — používá se při přesunu mezi sloupci,
  // kdy Board odebere kartu z jednoho sloupce a vloží ji sem
  insertCardAt(card, index) {
    this.cards.splice(index, 0, card);
    return card;
  }

  // Počet aktivních (nearchivovaných) karet — zobrazuje se v hlavičce sloupce
  get count() {
    return this.cards.filter(c => !c.archived).length;
  }

  // Přejmenuje sloupec, pokud nový název není prázdný.
  // Vrátí false pokud název nevyhovuje — volající pak může vrátit původní text.
  rename(newTitle) {
    const trimmed = newTitle.trim();
    if (trimmed.length === 0) return false;
    this.title = trimmed;
    return true;
  }

  // Sestaví HTML element sloupce ze šablony v index.html a naplní ho kartami
  render() {
    const template = document.getElementById('column-template');
    const section = template.content.cloneNode(true).querySelector('.column');

    section.dataset.id = this.id;
    section.querySelector('.column-title').textContent = this.title;
    section.querySelector('.card-count').textContent = this.count;

    const container = section.querySelector('.cards-container');
    for (const card of this.cards) {
      // Archivované karty se na nástěnce nezobrazují
      if (!card.archived) {
        container.appendChild(card.render());
      }
    }

    return section;
  }

  // Převede sloupec (včetně všech karet) na prostý objekt pro uložení do localStorage
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      cards: this.cards.map(c => c.toJSON())
    };
  }
}
