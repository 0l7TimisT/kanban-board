// app.js je vstupní bod celé aplikace.
// Třída App drží pohromadě všechny součásti — nástěnku, stránky, historii,
// drag & drop — a stará se o navigaci a globální události.

import { Board } from './classes/Board.js';
import { DragController } from './classes/DragController.js';
import { HistoryManager } from './classes/HistoryManager.js';
import { Storage, STORAGE_KEYS } from './utils/storage.js';
import { audioManager } from './utils/audio.js';
import { BoardPage } from './pages/BoardPage.js';
import { ArchivePage } from './pages/ArchivePage.js';
import { StatsPage } from './pages/StatsPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import './components/KanbanCard.js';

class App {
  constructor() {
    this.board = null;
    this.dragController = null;
    this.historyManager = null;
    this.currentPage = null;
    this.pages = {};
    this.settings = {};

    // Uložíme si reference na DOM elementy, abychom je nemuseli hledat pokaždé znovu
    this.elements = {
      content: document.getElementById('app-content'),
      modal: document.getElementById('modal-overlay'),
      modalContent: document.getElementById('modal-content'),
      modalTitle: document.getElementById('modal-title'),
      closeModalBtn: document.getElementById('btn-close-modal'),
      searchInput: document.getElementById('search-input'),
      filterPriority: document.getElementById('filter-priority'),
      undoBtn: document.getElementById('btn-undo'),
      redoBtn: document.getElementById('btn-redo'),
      connectionStatus: document.getElementById('connection-status'),
      navLinks: document.querySelectorAll('.nav-link')
    };
  }

  // Inicializuje celou aplikaci — načte data, vytvoří stránky a přejde na výchozí stránku
  async init() {
    this.loadSettings();
    this.applyTheme();

    this.board = Board.load();
    this.historyManager = new HistoryManager(50);
    // První snímek přidáme hned, aby bylo co Undovat
    this.historyManager.push(this.board.toJSON());

    // DragController dostane callback, který se zavolá po každém přesunu karty
    this.dragController = new DragController(this.board, () => {
      this.historyManager.push(this.board.toJSON());
      this.renderCurrentPage();
    });

    // Vytvoříme instance všech stránek — render se zavolá teprve při navigaci
    this.pages = {
      board: new BoardPage(this),
      archive: new ArchivePage(this),
      stats: new StatsPage(this),
      settings: new SettingsPage(this)
    };

    this.setupRouting();
    this.setupGlobalEvents();
    this.setupHistoryShortcuts();
    this.setupConnectionMonitoring();

    await this.registerServiceWorker();

    // Přejdeme na stránku podle URL hash, nebo na nástěnku jako výchozí
    const initialPage = this.getPageFromHash() || 'board';
    this.navigateTo(initialPage);
  }

  // Načte uložené nastavení z localStorage a aplikuje ho na audio
  loadSettings() {
    this.settings = Storage.load(STORAGE_KEYS.SETTINGS, {
      theme: 'light',
      soundEnabled: true,
      volume: 0.3,
      language: 'cs'
    });

    audioManager.setEnabled(this.settings.soundEnabled);
    audioManager.setVolume(this.settings.volume);
  }

  // Uloží aktuální nastavení do localStorage
  saveSettings() {
    Storage.save(STORAGE_KEYS.SETTINGS, this.settings);
  }

  // Nastaví atribut data-theme na <html> elementu — CSS pak vybere správné barvy
  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.settings.theme);
  }

  // Napojí navigační odkazy a reakci na tlačítko Zpět v prohlížeči
  setupRouting() {
    for (const link of this.elements.navLinks) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo(link.dataset.page);
      });
    }

    // Popstate nastane při kliknutí na Zpět/Vpřed v prohlížeči
    window.addEventListener('popstate', () => {
      const page = this.getPageFromHash() || 'board';
      this.navigateTo(page, false); // false = nepřidávat do history znovu
    });
  }

  // Přečte aktuální URL hash a vrátí název stránky, nebo null pokud není platný
  getPageFromHash() {
    const hash = window.location.hash.slice(1);
    const validPages = ['board', 'archive', 'stats', 'settings'];
    return validPages.includes(hash) ? hash : null;
  }

  // Přejde na danou stránku — aktualizuje URL, zvýrazní aktivní odkaz a překreslí obsah
  navigateTo(pageName, updateHistory = true) {
    if (!this.pages[pageName]) return;

    if (updateHistory) {
      history.pushState({ page: pageName }, '', `#${pageName}`);
    }

    for (const link of this.elements.navLinks) {
      link.classList.toggle('active', link.dataset.page === pageName);
    }

    this.currentPage = pageName;
    this.renderCurrentPage();
  }

  // Vymaže obsah stránky a znovu ji vykreslí od nuly.
  // Voláme to po každé změně dat — je to jednoduché, i když ne nejvýkonnější.
  renderCurrentPage() {
    const page = this.pages[this.currentPage];
    if (!page) return;

    this.elements.content.innerHTML = '';
    this.elements.content.appendChild(page.render());

    // Některé stránky potřebují doběhnout po vložení do DOMu (např. aplikovat filtry)
    if (typeof page.afterRender === 'function') {
      page.afterRender();
    }
  }

  // Nastaví globální události — vyhledávání, filtry, zavírání modalu, editaci karet
  setupGlobalEvents() {
    this.elements.searchInput.addEventListener('input', () => this.applyFilters());
    this.elements.filterPriority.addEventListener('change', () => this.applyFilters());

    this.elements.closeModalBtn.addEventListener('click', () => this.closeModal());

    // Kliknutí na tmavé pozadí zavře modal
    this.elements.modal.addEventListener('click', (e) => {
      if (e.target === this.elements.modal) this.closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.elements.modal.classList.contains('hidden')) {
        this.closeModal();
      }
    });

    // Vlastní událost 'card-edit' je vysílána z KanbanCard web componentu
    document.addEventListener('card-edit', (e) => {
      this.openCardEditor(e.detail.cardId);
    });
  }

  // Propojí tlačítka Undo/Redo s HistoryManagerem a nastaví klávesové zkratky
  setupHistoryShortcuts() {
    this.historyManager.subscribe(({ canUndo, canRedo }) => {
      this.elements.undoBtn.disabled = !canUndo;
      this.elements.redoBtn.disabled = !canRedo;
    });

    this.elements.undoBtn.addEventListener('click', () => this.undo());
    this.elements.redoBtn.addEventListener('click', () => this.redo());

    this.historyManager.setupKeyboardShortcuts(
      (state) => this.applyHistoryState(state),
      (state) => this.applyHistoryState(state)
    );
  }

  // Vrátí nástěnku o jeden krok zpět
  undo() {
    const state = this.historyManager.undo();
    if (state) this.applyHistoryState(state);
  }

  // Postoupí nástěnku o jeden krok vpřed
  redo() {
    const state = this.historyManager.redo();
    if (state) this.applyHistoryState(state);
  }

  // Načte historický snímek do nástěnky a překreslí aktuální stránku
  applyHistoryState(state) {
    this.board.loadFromJSON(state);
    this.renderCurrentPage();
  }

  // Sleduje, jestli je prohlížeč online nebo offline, a zobrazuje to v patičce
  setupConnectionMonitoring() {
    const updateStatus = () => {
      const online = navigator.onLine;
      this.elements.connectionStatus.textContent = online ? 'Online ●' : 'Offline ●';
      this.elements.connectionStatus.classList.toggle('offline', !online);
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus(); // zavoláme hned při startu
  }

  // Projde všechny karty na stránce a skryje ty, které neodpovídají filtru nebo hledání
  applyFilters() {
    const query = this.elements.searchInput.value;
    const priority = this.elements.filterPriority.value;

    for (const cardEl of document.querySelectorAll('kanban-card')) {
      const result = this.board.findCard(cardEl.dataset.id);
      if (!result) continue;

      const matches = result.card.matchesSearch(query) && result.card.matchesPriority(priority);
      cardEl.classList.toggle('filtered-out', !matches);
    }
  }

  // Otevře modální okno s daným nadpisem a obsahem
  openModal(title, content) {
    this.elements.modalTitle.textContent = title;
    this.elements.modalContent.innerHTML = '';
    this.elements.modalContent.appendChild(content);
    this.elements.modal.classList.remove('hidden');
  }

  // Zavře modální okno
  closeModal() {
    this.elements.modal.classList.add('hidden');
  }

  // Přesměruje editaci karty na BoardPage, která formulář umí sestavit
  openCardEditor(cardId) {
    const boardPage = this.pages.board;
    if (boardPage && typeof boardPage.openCardEditor === 'function') {
      boardPage.openCardEditor(cardId);
    }
  }

  // Zaregistruje service worker pro offline fungování aplikace.
  // Pokud prohlížeč service workery nepodporuje, tiše to přeskočíme.
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register('sw.js');
      console.log('Service Worker zaregistrován:', registration.scope);
    } catch (error) {
      console.error('Registrace Service Workeru selhala:', error);
    }
  }
}

// Vytvoříme jedinou instanci aplikace a spustíme ji po načtení DOMu
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());

export default app;
