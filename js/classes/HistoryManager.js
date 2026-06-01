// HistoryManager implementuje Undo/Redo funkcionalitu.
// Funguje jako zásobník snímků — při každé změně uložíme aktuální stav,
// a při Undo se vrátíme o snímek zpět.

export class HistoryManager {
  constructor(maxHistory = 50) {
    this.history = [];       // pole JSON snímků (jako řetězce)
    this.currentIndex = -1;  // ukazatel na aktuální pozici v historii
    this.maxHistory = maxHistory;
    this.listeners = new Set(); // odběratelé, kteří chtějí vědět o změně stavu (tlačítka Undo/Redo)
  }

  // Přidá nový snímek stavu do historie.
  // Pokud jsme uprostřed historie (po Undo), budoucí stavy se zahodí.
  push(state) {
    // Zahodíme vše "dopředu" — jako kdybychom přepsali historii
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    const snapshot = JSON.stringify(state);

    // Nepřidávej stejný stav dvakrát za sebou — šetří paměť
    if (this.history[this.currentIndex] === snapshot) return;

    this.history.push(snapshot);
    this.currentIndex++;

    // Pokud překročíme limit, smažeme nejstarší snímek
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }

    this.notify();
  }

  // Vrátí předchozí stav (Undo). Vrátí null pokud už nemáme kam jít zpět.
  undo() {
    if (!this.canUndo()) return null;
    this.currentIndex--;
    this.notify();
    return JSON.parse(this.history[this.currentIndex]);
  }

  // Vrátí následující stav (Redo). Vrátí null pokud jsme na konci historie.
  redo() {
    if (!this.canRedo()) return null;
    this.currentIndex++;
    this.notify();
    return JSON.parse(this.history[this.currentIndex]);
  }

  // Undo je možné, pokud nejsme na prvním snímku
  canUndo() {
    return this.currentIndex > 0;
  }

  // Redo je možné, pokud nejsme na posledním snímku
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  // Smaže celou historii — mohlo by se hodit např. po importu zálohy,
  // kdy by staré Undo kroky nedávaly smysl. Zatím se nevolá.
  clear() {
    this.history = [];
    this.currentIndex = -1;
    this.notify();
  }

  // Zaregistruje funkci, která se zavolá pokaždé když se změní stav Undo/Redo.
  // Vrátí funkci pro odregistrování (lze volat pro cleanup).
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Upozorní všechny odběratele o změně stavu — typicky se tím aktualizují tlačítka
  notify() {
    for (const cb of this.listeners) {
      cb({ canUndo: this.canUndo(), canRedo: this.canRedo() });
    }
  }

  // Nastaví klávesové zkratky Ctrl+Z (Undo) a Ctrl+Y / Ctrl+Shift+Z (Redo).
  // Zkratky se ignorují, pokud je uživatel právě v textovém poli.
  setupKeyboardShortcuts(onUndo, onRedo) {
    document.addEventListener('keydown', (e) => {
      // Ignoruj zkratky při psaní do formulářů
      if (e.target.matches('input, textarea, [contenteditable]')) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const state = this.undo();
        if (state) onUndo(state);
      } else if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        const state = this.redo();
        if (state) onRedo(state);
      }
    });
  }
}
