// ArchivePage zobrazuje archivované karty.
// Odtud je lze obnovit zpět na nástěnku nebo trvale smazat.

export class ArchivePage {
  constructor(app) {
    this.app = app;
    this.board = app.board;
  }

  // Sestaví celou stránku archivu včetně toolbaru a seznamu karet
  render() {
    const el = document.createElement('div');
    el.className = 'archive-page';

    el.innerHTML = `
      <header>
        <h2>📦 Archiv</h2>
        <p class="page-subtitle">Archivované úkoly můžete obnovit nebo trvale smazat.</p>
      </header>
    `;

    const archivedCards = this.getArchivedCards();

    // Pokud archiv neobsahuje nic, zobrazíme zprávu a skončíme
    if (archivedCards.length === 0) {
      el.innerHTML += `
        <div class="empty-state">
          <p>Archiv je prázdný.</p>
          <p class="empty-hint">Karty v archivu se zobrazí, když je archivujete z hlavní nástěnky.</p>
        </div>
      `;
      return el;
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'archive-toolbar';
    toolbar.innerHTML = `
      <span class="archive-count">${archivedCards.length} archivovaných karet</span>
      <button class="btn btn-danger" data-action="clear-all">🗑️ Smazat vše</button>
    `;
    toolbar.querySelector('[data-action="clear-all"]').addEventListener('click', () => this.handleClearAll());
    el.appendChild(toolbar);

    const list = document.createElement('ul');
    list.className = 'archive-list';

    for (const { card, column } of archivedCards) {
      list.appendChild(this.renderArchiveItem(card, column));
    }

    el.appendChild(list);
    return el;
  }

  // Projde všechny sloupce a vrátí archivované karty seřazené od nejnovějších
  getArchivedCards() {
    const archived = [];
    for (const column of this.board.columns) {
      for (const card of column.cards) {
        if (card.archived) archived.push({ card, column });
      }
    }
    // Nejnovější archivované karty budou nahoře
    return archived.sort((a, b) => new Date(b.card.createdAt) - new Date(a.card.createdAt));
  }

  // Sestaví jeden řádek archivu s informacemi o kartě a tlačítky akcí
  renderArchiveItem(card, column) {
    const item = document.createElement('li');
    item.className = 'archive-item';
    item.dataset.id = card.id;

    const created = new Date(card.createdAt).toLocaleDateString('cs-CZ');

    item.innerHTML = `
      <div class="archive-item-content">
        <h3>${this.escapeHtml(card.title)}</h3>
        ${card.description ? `<p>${this.escapeHtml(card.description)}</p>` : ''}
        <div class="archive-item-meta">
          <span>${this.getPriorityLabel(card.priority)}</span>
          <span>Sloupec: ${this.escapeHtml(column.title)}</span>
          <time datetime="${card.createdAt}">${created}</time>
        </div>
      </div>
      <div class="archive-item-actions">
        <button class="btn btn-secondary" data-action="restore">↩️ Obnovit</button>
        <button class="btn btn-danger" data-action="delete">🗑️ Smazat</button>
      </div>
    `;

    item.querySelector('[data-action="restore"]').addEventListener('click', () => this.handleRestore(card.id));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => this.handleDelete(card.id, column.id));

    return item;
  }

  // Obnoví kartu — nastaví archived na false, karta se znovu objeví na nástěnce
  handleRestore(cardId) {
    const result = this.board.findCard(cardId);
    if (!result) return;
    result.card.update({ archived: false });
    this.board.save();
    this.app.historyManager.push(this.board.toJSON());
    this.app.renderCurrentPage();
  }

  // Trvale smaže jednu kartu z dat — tuto akci nelze vrátit zpět
  handleDelete(cardId, columnId) {
    const result = this.board.findCard(cardId);
    if (!result) return;
    if (!confirm(`Trvale smazat kartu "${result.card.title}"?`)) return;
    this.board.findColumn(columnId).removeCard(cardId);
    this.board.save();
    this.app.historyManager.push(this.board.toJSON());
    this.app.renderCurrentPage();
  }

  // Smaže všechny archivované karty najednou — ptáme se na potvrzení
  handleClearAll() {
    const count = this.getArchivedCards().length;
    if (!confirm(`Trvale smazat všech ${count} archivovaných karet?`)) return;

    for (const column of this.board.columns) {
      column.cards = column.cards.filter(c => !c.archived);
    }

    this.board.save();
    this.app.historyManager.push(this.board.toJSON());
    this.app.renderCurrentPage();
  }

  // Vrátí textový popis priority s emoji
  getPriorityLabel(priority) {
    const labels = { high: '🔴 Vysoká', medium: '🟡 Střední', low: '🟢 Nízká' };
    return labels[priority] || priority;
  }

  // Escapuje text před vložením do innerHTML — ochrana před XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
