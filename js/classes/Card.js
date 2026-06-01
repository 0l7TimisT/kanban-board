// Card představuje jeden úkol na nástěnce.
// Drží všechna data karty a umí se vykreslit do HTML.

export class Card {
  // Všechny parametry mají výchozí hodnoty — lze tedy vytvořit kartu
  // jen s názvem a zbytek se doplní automaticky
  constructor({
    id = crypto.randomUUID(),
    title,
    description = '',
    priority = 'medium',
    labels = [],
    deadline = null,
    checklist = [],
    createdAt = new Date().toISOString(),
    archived = false
  }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.priority = priority;
    this.labels = labels;
    this.deadline = deadline;
    this.checklist = checklist;
    this.createdAt = createdAt;
    this.archived = archived;
  }

  // Aktualizuje jen ta pole, která jsou předána v objektu data.
  // Díky tomu můžeme zavolat update({ archived: true }) a ostatní pole zůstanou beze změny.
  update(data) {
    if (data.title !== undefined) this.title = data.title;
    if (data.description !== undefined) this.description = data.description;
    if (data.priority !== undefined) this.priority = data.priority;
    if (data.labels !== undefined) this.labels = data.labels;
    if (data.deadline !== undefined) this.deadline = data.deadline;
    if (data.checklist !== undefined) this.checklist = data.checklist;
    if (data.archived !== undefined) this.archived = data.archived;
  }

  // Vrátí true, pokud deadline už proběhl — používáme při zvýrazňování prošlých karet
  isOverdue() {
    if (!this.deadline) return false;
    return new Date(this.deadline) < new Date();
  }

  // Vypočítá procento dokončení checklistu — vrátí null pokud checklist neexistuje.
  // Zatím se nezobrazuje v UI, ale data jsou připravená (pole checklist se ukládá).
  get progress() {
    if (this.checklist.length === 0) return null;
    const completed = this.checklist.filter(item => item.done).length;
    return Math.round((completed / this.checklist.length) * 100);
  }

  // Zkontroluje, jestli karta odpovídá hledanému textu.
  // Hledáme v názvu, popisu i v názvech štítků — malá/velká písmena ignorujeme.
  matchesSearch(query) {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      this.title.toLowerCase().includes(q) ||
      this.description.toLowerCase().includes(q) ||
      this.labels.some(l => l.name.toLowerCase().includes(q))
    );
  }

  // Zkontroluje, jestli priorita karty odpovídá zvolenému filtru.
  // Prázdný řetězec znamená "žádný filtr" — vrátíme true pro všechny karty.
  matchesPriority(priority) {
    if (!priority) return true;
    return this.priority === priority;
  }

  // Vytvoří element <kanban-card> a předá mu data přes atributy.
  // Web Component se pak sám postará o vizuální podobu uvnitř shadow DOMu.
  render() {
    const el = document.createElement('kanban-card');

    el.setAttribute('card-id', this.id);
    el.setAttribute('title', this.title);
    el.setAttribute('priority', this.priority);
    if (this.description) el.setAttribute('description', this.description);
    if (this.deadline) el.setAttribute('deadline', this.deadline);
    // Štítky jsou objekty, musíme je serializovat — KanbanCard je pak parsuje zpět
    if (this.labels.length > 0) el.setAttribute('labels', JSON.stringify(this.labels));

    // dataset.id potřebuje DragController pro identifikaci karty při přetahování
    el.dataset.id = this.id;

    return el;
  }

  // Převede kartu na prostý objekt, který lze uložit do localStorage jako JSON
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      priority: this.priority,
      labels: this.labels,
      deadline: this.deadline,
      checklist: this.checklist,
      createdAt: this.createdAt,
      archived: this.archived
    };
  }
}
