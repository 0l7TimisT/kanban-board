// SettingsPage zobrazuje stránku nastavení rozdělenu do sekcí:
// vzhled, zvuk, správa dat a informace o aplikaci.

import { Storage, STORAGE_KEYS } from '../utils/storage.js';
import { audioManager } from '../utils/audio.js';

export class SettingsPage {
  constructor(app) {
    this.app = app;
  }

  // Sestaví celou stránku nastavení ze čtyř sekcí
  render() {
    const el = document.createElement('div');
    el.className = 'settings-page';

    el.innerHTML = '<header><h2>⚙️ Nastavení</h2></header>';

    el.appendChild(this.renderAppearanceSection());
    el.appendChild(this.renderAudioSection());
    el.appendChild(this.renderDataSection());
    el.appendChild(this.renderAboutSection());

    return el;
  }

  // Sekce pro přepínání tmavého/světlého režimu
  renderAppearanceSection() {
    const section = document.createElement('section');
    section.className = 'settings-section';
    section.innerHTML = `
      <h3>🎨 Vzhled</h3>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Tmavý režim</strong>
          <span>Přepnout barevné schéma aplikace</span>
        </div>
        <label class="switch">
          <input type="checkbox" id="setting-theme" ${this.app.settings.theme === 'dark' ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
    `;

    // Při změně přepínače okamžitě aplikujeme téma a uložíme nastavení
    section.querySelector('#setting-theme').addEventListener('change', (e) => {
      this.app.settings.theme = e.target.checked ? 'dark' : 'light';
      this.app.applyTheme();
      this.app.saveSettings();
    });

    return section;
  }

  // Sekce pro ovládání zvuku — zapnutí/vypnutí, hlasitost a testovací přehrání
  renderAudioSection() {
    const section = document.createElement('section');
    section.className = 'settings-section';
    section.innerHTML = `
      <h3>🔊 Zvuk</h3>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Zvukové efekty</strong>
          <span>Přehrávat zvuk při dokončení úkolu</span>
        </div>
        <label class="switch">
          <input type="checkbox" id="setting-sound" ${this.app.settings.soundEnabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Hlasitost</strong>
          <span>Hlasitost zvukových efektů</span>
        </div>
        <input type="range" id="setting-volume" min="0" max="100"
          value="${this.app.settings.volume * 100}" class="volume-slider">
      </div>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Testovací zvuk</strong>
          <span>Přehrát aktuálně nastavený zvuk</span>
        </div>
        <button class="btn btn-secondary" data-action="test-sound">▶️ Přehrát</button>
      </div>
    `;

    section.querySelector('#setting-sound').addEventListener('change', (e) => {
      this.app.settings.soundEnabled = e.target.checked;
      audioManager.setEnabled(e.target.checked);
      this.app.saveSettings();
    });

    // Slider vrací hodnotu 0–100, ale AudioManager očekává 0–1
    section.querySelector('#setting-volume').addEventListener('input', (e) => {
      const volume = e.target.value / 100;
      this.app.settings.volume = volume;
      audioManager.setVolume(volume);
      this.app.saveSettings();
    });

    section.querySelector('[data-action="test-sound"]').addEventListener('click', () => {
      audioManager.play('complete');
    });

    return section;
  }

  // Sekce pro export, import, načtení ukázkových dat a reset
  renderDataSection() {
    const section = document.createElement('section');
    section.className = 'settings-section';
    section.innerHTML = `
      <h3>💾 Data</h3>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Exportovat data</strong>
          <span>Stáhnout zálohu jako JSON soubor</span>
        </div>
        <button class="btn btn-primary" data-action="export">📥 Exportovat</button>
      </div>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Importovat data</strong>
          <span>Nahrát zálohu ze souboru</span>
        </div>
        <div>
          <input type="file" id="import-file" accept=".json" hidden>
          <button class="btn btn-secondary" data-action="import">📤 Vybrat soubor</button>
        </div>
      </div>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Načíst ukázková data</strong>
          <span>Naplnit nástěnku ukázkovými úkoly</span>
        </div>
        <button class="btn btn-secondary" data-action="load-sample">🎯 Načíst</button>
      </div>
      <div class="setting-row">
        <div class="setting-label">
          <strong>Vymazat vše</strong>
          <span>Trvale smazat všechna data aplikace</span>
        </div>
        <button class="btn btn-danger" data-action="reset">🗑️ Reset</button>
      </div>
    `;

    // Export: do názvu souboru vložíme dnešní datum
    section.querySelector('[data-action="export"]').addEventListener('click', () => {
      const date = new Date().toISOString().split('T')[0];
      Storage.exportToFile(`kanban-backup-${date}.json`);
    });

    // Import: skryté file input aktivujeme kliknutím na tlačítko
    const importBtn = section.querySelector('[data-action="import"]');
    const importInput = section.querySelector('#import-file');

    importBtn.addEventListener('click', () => importInput.click());

    importInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await Storage.importFromFile(file);
        alert('Data byla úspěšně importována. Stránka se obnoví.');
        window.location.reload();
      } catch (error) {
        alert(`Chyba při importu: ${error.message}`);
      }
    });

    // Načtení ukázkových dat ze serveru — přepíše aktuální nástěnku
    section.querySelector('[data-action="load-sample"]').addEventListener('click', async () => {
      if (!confirm('Tato akce přepíše aktuální nástěnku. Pokračovat?')) return;
      try {
        const response = await fetch('data/sample-board.json');
        const data = await response.json();
        this.app.board.loadFromJSON(data);
        this.app.historyManager.push(this.app.board.toJSON());
        alert('Ukázková data byla načtena.');
        this.app.navigateTo('board');
      } catch (error) {
        alert('Nepodařilo se načíst ukázková data.');
      }
    });

    // Reset: ptáme se dvakrát, protože jde o nevratnou akci
    section.querySelector('[data-action="reset"]').addEventListener('click', () => {
      if (!confirm('Trvale smazat všechna data? Tuto akci nelze vrátit.')) return;
      if (!confirm('Opravdu? Všechny úkoly, archiv i nastavení budou smazány.')) return;
      Storage.clear();
      window.location.reload();
    });

    return section;
  }

  // Sekce s informacemi o aplikaci a přehledem klávesových zkratek
  renderAboutSection() {
    const section = document.createElement('section');
    section.className = 'settings-section';
    section.innerHTML = `
      <h3>ℹ️ O aplikaci</h3>
      <div class="about-content">
        <p><strong>Kanban Board</strong> v1.0.0</p>
        <p>Webová aplikace pro správu úkolů pomocí drag & drop.</p>
        <h4>Klávesové zkratky</h4>
        <ul class="shortcuts-list">
          <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> – Vrátit zpět</li>
          <li><kbd>Ctrl</kbd> + <kbd>Y</kbd> – Znovu</li>
          <li><kbd>Ctrl</kbd> + <kbd>Enter</kbd> – Uložit formulář</li>
          <li><kbd>Escape</kbd> – Zavřít modal</li>
        </ul>
      </div>
    `;

    return section;
  }
}
