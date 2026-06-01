// KanbanCard je Web Component — vlastní HTML element <kanban-card>.
// Stará se o vizuální podobu jedné karty včetně stylů a událostí.
// Data dostává přes HTML atributy (title, priority, deadline, labels...).

export class KanbanCard extends HTMLElement {
  // Prohlížeč zavolá attributeChangedCallback jen pro atributy v tomto seznamu
  static get observedAttributes() {
    return ['title', 'description', 'priority', 'deadline', 'card-id', 'labels'];
  }

  constructor() {
    super();
    // Shadow DOM izoluje styly karty od zbytku stránky
    this.attachShadow({ mode: 'open' });
  }

  // Zavolá se když je element vložen do DOMu — tehdy poprvé vykreslíme obsah
  connectedCallback() {
    this.render();
    this.setupDragListeners();
  }

  // Zavolá se při změně atributu — překreslíme komponentu s novými daty
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    // Přeskočíme pokud shadowRoot ještě není naplněný (před prvním render())
    if (this.shadowRoot.innerHTML) {
      this.render();
    }
  }

  // Drag & drop posluchače dáme přímo na host element — přežijí i re-render shadow DOMu
  setupDragListeners() {
    this.draggable = true;

    this.addEventListener('dragstart', (e) => {
      this.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', this.getAttribute('card-id'));
    });

    this.addEventListener('dragend', () => {
      this.classList.remove('dragging');
    });
  }

  // Sestaví obsah shadow DOMu — volá se při prvním připojení i při změně atributů
  render() {
    const title = this.getAttribute('title') || 'Bez názvu';
    const description = this.getAttribute('description') || '';
    const priority = this.getAttribute('priority') || 'medium';
    const deadline = this.getAttribute('deadline');

    // Štítky jsou předávány jako JSON řetězec, protože atributy jsou jen text
    const labelsJson = this.getAttribute('labels');
    const labels = labelsJson ? JSON.parse(labelsJson) : [];

    const isOverdue = deadline && new Date(deadline) < new Date();
    const formattedDeadline = deadline ? new Date(deadline).toLocaleDateString('cs-CZ') : null;

    const labelsHtml = labels.map(l =>
      `<span class="label" style="background:${l.color}">${this.escapeHtml(l.name)}</span>`
    ).join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          cursor: grab;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          border-left: 4px solid var(--priority-color, transparent);
        }

        :host(:hover) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        :host(:active) { cursor: grabbing; }

        :host(.dragging) {
          opacity: 0.5;
          transform: rotate(3deg) scale(1.02);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* Filtrování skryje kartu přidáním třídy filtered-out z venku */
        :host(.filtered-out) { display: none; }

        :host([priority="high"])   { --priority-color: #ef4444; }
        :host([priority="medium"]) { --priority-color: #f59e0b; }
        :host([priority="low"])    { --priority-color: #22c55e; }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .title {
          font-size: 0.9375rem;
          font-weight: 500;
          line-height: 1.3;
          margin: 0;
          color: var(--text, #1e293b);
        }

        .btn-edit {
          opacity: 0;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          font-size: 0.875rem;
          transition: opacity 0.2s;
        }

        :host(:hover) .btn-edit { opacity: 1; }

        .description {
          font-size: 0.8125rem;
          color: var(--text-muted, #64748b);
          margin: 0 0 0.5rem 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .labels {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }

        .labels:empty { display: none; }

        .label {
          font-size: 0.6875rem;
          font-weight: 500;
          padding: 0.125rem 0.5rem;
          border-radius: 999px;
          color: white;
        }

        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: var(--text-muted, #64748b);
        }

        .deadline.overdue {
          color: #ef4444;
          font-weight: 500;
        }
      </style>

      <div class="header">
        <h3 class="title">${this.escapeHtml(title)}</h3>
        <button class="btn-edit" aria-label="Upravit kartu">✏️</button>
      </div>

      ${description ? `<p class="description">${this.escapeHtml(description)}</p>` : ''}

      <div class="labels">${labelsHtml}</div>

      <div class="footer">
        <span>${this.getPriorityLabel(priority)}</span>
        ${formattedDeadline ? `
          <time class="deadline ${isOverdue ? 'overdue' : ''}" datetime="${deadline}">
            ${formattedDeadline}
          </time>
        ` : ''}
      </div>
    `;

    // Listener přidáme přímo na tlačítko uvnitř shadow DOMu.
    // Nelze použít e.target z venku — shadow DOM přesměrovává target na host element.
    this.shadowRoot.querySelector('.btn-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('card-edit', {
        bubbles: true,
        composed: true, // composed: true umožní události projít přes shadow DOM hranici
        detail: { cardId: this.getAttribute('card-id') }
      }));
    });
  }

  getPriorityLabel(priority) {
    const labels = { high: '🔴 Vysoká', medium: '🟡 Střední', low: '🟢 Nízká' };
    return labels[priority] || priority;
  }

  // Escapuje text před vložením do innerHTML v shadow DOMu — ochrana před XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('kanban-card', KanbanCard);
