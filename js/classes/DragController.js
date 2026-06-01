// DragController řídí celé drag & drop přetahování karet.
// Poslouchá události na úrovni celého dokumentu a reaguje podle toho,
// co se právě přetahuje a kam.

import { audioManager } from '../utils/audio.js';

export class DragController {
  constructor(board, onUpdate) {
    this.board = board;
    this.onUpdate = onUpdate; // callback zavolaný po úspěšném přesunutí karty

    this.draggedCard = null;   // DOM element karty, která se právě táhne
    this.sourceColumn = null;  // DOM element sloupce, odkud karta pochází
    this.dropIndicator = null; // modrá čára ukazující, kam karta spadne

    // Bind je nutný proto, aby removeEventListener fungoval správně —
    // bez něj by se pokaždé vytvořila nová funkce a šla by odregistrovat
    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDragEnter = this.handleDragEnter.bind(this);
    this.handleDragLeave = this.handleDragLeave.bind(this);
    this.handleDrop = this.handleDrop.bind(this);

    this.init();
  }

  // Zaregistruje všechny drag & drop události na celém dokumentu
  init() {
    document.addEventListener('dragstart', this.handleDragStart);
    document.addEventListener('dragend', this.handleDragEnd);
    document.addEventListener('dragover', this.handleDragOver);
    document.addEventListener('dragenter', this.handleDragEnter);
    document.addEventListener('dragleave', this.handleDragLeave);
    document.addEventListener('drop', this.handleDrop);
  }

  // Zavolá se ve chvíli, kdy uživatel začne táhnout kartu
  handleDragStart(e) {
    const card = e.target.closest('kanban-card');
    if (!card) return;

    this.draggedCard = card;
    this.sourceColumn = card.closest('.column');

    // Přidáme třídu v dalším snímku, jinak by se karta skryla ještě před dragem
    requestAnimationFrame(() => card.classList.add('dragging'));

    e.dataTransfer.effectAllowed = 'move';
    // ID karty přeneseme přes dataTransfer — je to standardní způsob předání dat při dnd
    e.dataTransfer.setData('text/plain', card.dataset.id);

    // Všechny sloupce zvýrazníme jako možné cíle
    for (const col of document.querySelectorAll('.column')) {
      col.classList.add('drop-zone');
    }
  }

  // Zavolá se když uživatel pustí myš — uklidíme vše bez ohledu na výsledek
  handleDragEnd() {
    if (this.draggedCard) {
      this.draggedCard.classList.remove('dragging');
    }

    for (const col of document.querySelectorAll('.column')) {
      col.classList.remove('drop-zone', 'drag-over');
    }

    this.removeDropIndicator();
    this.draggedCard = null;
    this.sourceColumn = null;
  }

  // Zavolá se opakovaně, když uživatel táhne kartu nad sloupcem —
  // aktualizujeme pozici indikátoru kde karta spadne
  handleDragOver(e) {
    const column = e.target.closest('.column');
    if (!column || !this.draggedCard) return;

    e.preventDefault(); // bez toho by drop nebyl povolen
    e.dataTransfer.dropEffect = 'move';

    const container = column.querySelector('.cards-container');
    const afterElement = this.getDragAfterElement(container, e.clientY);
    this.updateDropIndicator(container, afterElement);
  }

  // Zavolá se když vstoupíme do sloupce — sloupec vizuálně zvýrazníme
  handleDragEnter(e) {
    const column = e.target.closest('.column');
    if (column && this.draggedCard) {
      column.classList.add('drag-over');
    }
  }

  // Zavolá se když opustíme sloupec — odebereme zvýraznění.
  // Musíme kontrolovat relatedTarget, protože dragLeave se spouští i při pohybu
  // nad dětskými elementy (kartami) uvnitř sloupce.
  handleDragLeave(e) {
    const column = e.target.closest('.column');
    if (!column) return;

    const relatedColumn = e.relatedTarget?.closest('.column');
    if (relatedColumn !== column) {
      column.classList.remove('drag-over');
    }
  }

  // Zavolá se při puštění karty — rozhodne kam karta patří a přesune ji v datech
  handleDrop(e) {
    e.preventDefault();

    const column = e.target.closest('.column');
    if (!column || !this.draggedCard) return;

    const cardId = e.dataTransfer.getData('text/plain');
    const fromColumnId = this.sourceColumn.dataset.id;
    const toColumnId = column.dataset.id;

    const container = column.querySelector('.cards-container');
    const afterElement = this.getDragAfterElement(container, e.clientY);
    const cardsInTarget = [...container.querySelectorAll('kanban-card:not(.dragging)')];
    const toIndex = afterElement ? cardsInTarget.indexOf(afterElement) : cardsInTarget.length;

    if (fromColumnId === toColumnId) {
      // Přesun v rámci jednoho sloupce
      const sourceContainer = this.sourceColumn.querySelector('.cards-container');
      const cardsInSource = [...sourceContainer.querySelectorAll('kanban-card:not(.dragging)')];
      const fromIndex = cardsInSource.indexOf(this.draggedCard);

      if (fromIndex !== toIndex) {
        this.board.findColumn(fromColumnId).moveCard(cardId, toIndex);
      }
    } else {
      // Přesun mezi různými sloupci
      this.board.moveCardBetweenColumns(cardId, fromColumnId, toColumnId, toIndex);
    }

    this.board.save();

    // Zvuk hrajeme jen při přesunu z jiného sloupce do posledního — ne při přeuspořádání uvnitř
    if (fromColumnId !== toColumnId && this.isLastColumn(toColumnId)) {
      audioManager.play('complete');
    }

    if (this.onUpdate) this.onUpdate();
  }

  // Najde kartu, před kterou má být vložen přetahovaný prvek.
  // Prochází karty a hledá tu, jejíž střed je nejblíže pod pozicí myši.
  getDragAfterElement(container, y) {
    const cards = [...container.querySelectorAll('kanban-card:not(.dragging)')];
    let closest = null;
    let closestOffset = Number.NEGATIVE_INFINITY;

    for (const card of cards) {
      const box = card.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      // Chceme nejmenší záporné číslo — to odpovídá kartě těsně pod kurzorem
      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closest = card;
      }
    }

    return closest;
  }

  // Aktualizuje vizuální indikátor (modrá čára) na novou pozici
  updateDropIndicator(container, afterElement) {
    this.removeDropIndicator();
    this.dropIndicator = document.createElement('div');
    this.dropIndicator.className = 'drop-indicator';

    if (afterElement) {
      container.insertBefore(this.dropIndicator, afterElement);
    } else {
      container.appendChild(this.dropIndicator);
    }
  }

  // Odstraní indikátor z DOMu pokud existuje
  removeDropIndicator() {
    if (this.dropIndicator) {
      this.dropIndicator.remove();
      this.dropIndicator = null;
    }
  }

  // Zjistí, jestli je daný sloupec posledním — tehdy přehráváme zvuk dokončení
  isLastColumn(columnId) {
    const lastColumn = this.board.columns[this.board.columns.length - 1];
    return lastColumn?.id === columnId;
  }

  // Odregistruje všechny drag & drop události z dokumentu.
  // Zatím se nevolá, protože DragController žije po celou dobu běhu aplikace.
  // Bylo by potřeba zavolat při zničení aplikace nebo při přepnutí na jiný typ interakce.
  destroy() {
    document.removeEventListener('dragstart', this.handleDragStart);
    document.removeEventListener('dragend', this.handleDragEnd);
    document.removeEventListener('dragover', this.handleDragOver);
    document.removeEventListener('dragenter', this.handleDragEnter);
    document.removeEventListener('dragleave', this.handleDragLeave);
    document.removeEventListener('drop', this.handleDrop);
  }
}
