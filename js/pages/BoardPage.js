// Tato třída se stará o celou stránku nástěnky — vytváří sloupce,
// tlačítka a formuláře. Funguje jako prostředník mezi UI a daty (Board).

export class BoardPage {
  constructor(app) {
    // app je hlavní objekt aplikace, přes který přistupujeme k datům a modalům
    this.app = app;
    this.board = app.board;
  }

  // Sestaví celou nástěnku: vykreslí všechny sloupce a přidá tlačítko pro nový sloupec
  render() {
    const el = document.createElement('div');
    el.className = 'board';

    for (const column of this.board.columns) {
      el.appendChild(this.renderColumn(column));
    }

    const addColumnBtn = document.createElement('button');
    addColumnBtn.className = 'btn-add-column';
    addColumnBtn.textContent = '+ Přidat sloupec';
    addColumnBtn.addEventListener('click', () => this.handleAddColumn());
    el.appendChild(addColumnBtn);

    return el;
  }

  // Zavolá se automaticky po tom, co je stránka vložena do DOMu —
  // tady aplikujeme filtry, aby se karty hned zobrazily správně
  afterRender() {
    this.app.applyFilters();
  }

  // Vezme datový objekt sloupce, nechá ho vykreslit a pak napojí
  // všechny potřebné události (přejmenování, smazání, přidání karty, editace karet)
  renderColumn(column) {
    const section = column.render();

    // Přejmenování sloupce — uloží se až po opuštění pole (blur)
    const titleEl = section.querySelector('.column-title');
    titleEl.addEventListener('blur', () => {
      const newTitle = titleEl.textContent;
      if (column.rename(newTitle)) {
        this.board.save();
        this.app.historyManager.push(this.board.toJSON());
      } else {
        // Název byl prázdný — vrátíme původní text
        titleEl.textContent = column.title;
      }
    });

    // Enter v názvu sloupce potvrdí jako kliknutí mimo pole
    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        titleEl.blur();
      }
    });

    section.querySelector('.btn-delete-column').addEventListener('click', () => {
      this.handleDeleteColumn(column.id);
    });

    section.querySelector('.btn-add-card').addEventListener('click', () => {
      this.handleAddCard(column.id);
    });

    // Editaci karet řeší KanbanCard sám — vysílá událost 'card-edit',
    // kterou zachytí globální listener v app.js a otevře editor.

    return section;
  }

  // Zeptá se uživatele na název a přidá nový sloupec na konec nástěnky
  handleAddColumn() {
    const title = prompt('Název nového sloupce:', 'Nový sloupec');
    if (!title || !title.trim()) return;

    this.board.addColumn(title.trim());
    this.app.historyManager.push(this.board.toJSON());
    this.app.renderCurrentPage();
  }

  // Ověří, jestli sloupec není prázdný, a pak se zeptá na potvrzení smazání
  handleDeleteColumn(columnId) {
    const column = this.board.findColumn(columnId);
    if (!column) return;

    // Pokud sloupec obsahuje karty, upozorníme uživatele
    const message = column.cards.length > 0
      ? `Sloupec "${column.title}" obsahuje ${column.cards.length} karet. Opravdu smazat?`
      : `Smazat sloupec "${column.title}"?`;

    if (!confirm(message)) return;

    this.board.removeColumn(columnId);
    this.app.historyManager.push(this.board.toJSON());
    this.app.renderCurrentPage();
  }

  // Otevře modální okno s prázdným formulářem pro novou kartu v daném sloupci
  handleAddCard(columnId) {
    const column = this.board.findColumn(columnId);
    if (!column) return;

    const form = this.createCardForm({}, (data) => {
      column.addCard(data);
      this.board.save();
      this.app.historyManager.push(this.board.toJSON());
      this.app.closeModal();
      this.app.renderCurrentPage();
    });

    this.app.openModal('Nová karta', form);
  }

  // Otevře modální okno s vyplněným formulářem pro úpravu existující karty.
  // Formulář dostane i callbacky pro smazání a archivaci.
  openCardEditor(cardId) {
    const result = this.board.findCard(cardId);
    if (!result) return;

    const { card, column } = result;

    const form = this.createCardForm(
      card,
      // Uložení změn
      (data) => {
        card.update(data);
        this.board.save();
        this.app.historyManager.push(this.board.toJSON());
        this.app.closeModal();
        this.app.renderCurrentPage();
      },
      // Smazání karty
      () => {
        if (confirm(`Smazat kartu "${card.title}"?`)) {
          column.removeCard(cardId);
          this.board.save();
          this.app.historyManager.push(this.board.toJSON());
          this.app.closeModal();
          this.app.renderCurrentPage();
        }
      },
      // Archivace karty — karta zůstane v datech, ale skryje se z nástěnky
      () => {
        card.update({ archived: true });
        this.board.save();
        this.app.historyManager.push(this.board.toJSON());
        this.app.closeModal();
        this.app.renderCurrentPage();
      }
    );

    this.app.openModal('Upravit kartu', form);
  }

  // Sestaví HTML formulář pro vytvoření nebo úpravu karty.
  // cardData může být prázdný objekt (nová karta) nebo existující karta (editace).
  // onDelete a onArchive jsou volitelné — tlačítka se zobrazí jen když jsou předány.
  createCardForm(cardData, onSave, onDelete = null, onArchive = null) {
    const container = document.createElement('div');
    container.className = 'card-form';

    container.innerHTML = `
      <div class="form-group">
        <label for="card-title">Název *</label>
        <input
          type="text"
          id="card-title"
          required
          autofocus
          placeholder="Co je třeba udělat?"
          value="${this.escapeAttr(cardData.title || '')}"
        >
      </div>

      <div class="form-group">
        <label for="card-description">Popis</label>
        <textarea
          id="card-description"
          placeholder="Detaily úkolu..."
        >${this.escapeAttr(cardData.description || '')}</textarea>
      </div>

      <div class="form-group">
        <label>Priorita</label>
        <div class="priority-options">
          <label>
            <input type="radio" name="priority" value="low"
              ${cardData.priority === 'low' ? 'checked' : ''}>
            🟢 Nízká
          </label>
          <label>
            <input type="radio" name="priority" value="medium"
              ${(!cardData.priority || cardData.priority === 'medium') ? 'checked' : ''}>
            🟡 Střední
          </label>
          <label>
            <input type="radio" name="priority" value="high"
              ${cardData.priority === 'high' ? 'checked' : ''}>
            🔴 Vysoká
          </label>
        </div>
      </div>

      <div class="form-group">
        <label for="card-deadline">Deadline</label>
        <input
          type="date"
          id="card-deadline"
          value="${cardData.deadline ? cardData.deadline.split('T')[0] : ''}"
        >
      </div>

      <div class="form-group">
        <label for="card-labels">Štítky (oddělené čárkou)</label>
        <input
          type="text"
          id="card-labels"
          placeholder="Frontend, Bug, Urgent"
          value="${this.escapeAttr((cardData.labels || []).map(l => l.name).join(', '))}"
        >
      </div>

      <div class="form-actions">
        ${onArchive ? '<button type="button" class="btn btn-secondary" data-action="archive">📦 Archivovat</button>' : ''}
        ${onDelete ? '<button type="button" class="btn btn-danger" data-action="delete">🗑️ Smazat</button>' : ''}
        <button type="button" class="btn btn-secondary" data-action="cancel">Zrušit</button>
        <button type="button" class="btn btn-primary" data-action="save">💾 Uložit</button>
      </div>
    `;

    const titleInput = container.querySelector('#card-title');
    const descInput = container.querySelector('#card-description');
    const deadlineInput = container.querySelector('#card-deadline');
    const labelsInput = container.querySelector('#card-labels');

    // Funkce, která přečte všechna pole a zavolá onSave s připravenými daty
    const saveData = () => {
      const title = titleInput.value.trim();
      if (!title) {
        // Název je povinný — upozorníme uživatele přímo v poli
        titleInput.focus();
        titleInput.setCustomValidity('Název je povinný');
        titleInput.reportValidity();
        return;
      }

      const priorityInput = container.querySelector('input[name="priority"]:checked');

      // Štítky jsou zadané jako text oddělený čárkami — rozdělíme a přiřadíme barvy
      const labels = labelsInput.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(name => ({ name, color: this.getLabelColor(name) }));

      const data = {
        title,
        description: descInput.value.trim(),
        priority: priorityInput.value,
        // Datum převedeme na ISO string, nebo necháme null pokud není zadáno
        deadline: deadlineInput.value ? new Date(deadlineInput.value).toISOString() : null,
        labels
      };

      onSave(data);
    };

    container.querySelector('[data-action="save"]').addEventListener('click', saveData);
    container.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      this.app.closeModal();
    });

    if (onDelete) {
      container.querySelector('[data-action="delete"]').addEventListener('click', onDelete);
    }

    if (onArchive) {
      container.querySelector('[data-action="archive"]').addEventListener('click', onArchive);
    }

    // Ctrl+Enter jako alternativa k tlačítku Uložit
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        saveData();
      }
    });

    // Schováme chybovou hlášku jakmile uživatel začne psát
    titleInput.addEventListener('input', () => {
      titleInput.setCustomValidity('');
    });

    return container;
  }

  // Přiřadí štítku barvu podle jeho názvu — stejný název vždy dostane stejnou barvu.
  // Funguje tak, že z písmen názvu vypočítáme číslo (hash) a vybereme barvu ze seznamu.
  getLabelColor(name) {
    const colors = [
      '#ef4444', '#f59e0b', '#22c55e', '#3b82f6',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // Escapuje text pro použití v HTML atributu (value="...") —
  // bez toho by mohl uživatelský vstup rozbít HTML nebo umožnit XSS útok
  escapeAttr(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
