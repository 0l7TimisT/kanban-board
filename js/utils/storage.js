// Zde jsou definované klíče, pod kterými ukládáme data do localStorage.
// Je lepší mít je na jednom místě než psát řetězce všude po kódu.
const STORAGE_KEYS = {
  BOARD: 'kanban-board',
  ARCHIVE: 'kanban-archive',
  SETTINGS: 'kanban-settings'
};

// Storage je pomocná třída pro práci s localStorage.
// Všechny metody jsou statické — nepotřebujeme vytvářet instanci, stačí volat Storage.save(...).
export class Storage {

  // Uloží libovolná data pod daným klíčem.
  // Data se převedou na JSON řetězec, protože localStorage ukládá jen text.
  static save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Chyba při ukládání ${key}:`, error);
      // QuotaExceededError nastane, když je localStorage plné (obvykle ~5 MB)
      if (error.name === 'QuotaExceededError') {
        alert('Úložiště je plné. Vymažte staré úkoly nebo exportujte data.');
      }
      return false;
    }
  }

  // Načte data uložená pod daným klíčem.
  // Pokud klíč neexistuje nebo je JSON poškozený, vrátí defaultValue.
  static load(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Chyba při načítání ${key}:`, error);
      return defaultValue;
    }
  }

  // Smaže jeden konkrétní záznam z localStorage.
  // Zatím se nevolá přímo, ale může se hodit pokud by bylo potřeba
  // smazat jen část dat (např. jen archiv bez resetu celé aplikace).
  static remove(key) {
    localStorage.removeItem(key);
  }

  // Smaže všechna data aplikace najednou — používá se při resetu
  static clear() {
    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(key);
    }
  }

  // Vytvoří JSON soubor se zálohou a spustí jeho stažení do počítače uživatele.
  // Uložíme nástěnku, archiv i nastavení do jednoho souboru.
  static exportToFile(filename = 'kanban-backup.json') {
    const data = {
      board: this.load(STORAGE_KEYS.BOARD),
      archive: this.load(STORAGE_KEYS.ARCHIVE),
      settings: this.load(STORAGE_KEYS.SETTINGS),
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };

    // Blob je v podstatě soubor v paměti prohlížeče —
    // vytvoříme z něj dočasný odkaz a programově na něj klikneme
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    // URL uvolníme, aby prohlížeč mohl uvolnit paměť
    URL.revokeObjectURL(url);
  }

  // Načte zálohu ze souboru, který si uživatel vybral.
  // Vrací Promise — musíme počkat na FileReader, který čte soubor asynchronně.
  static async importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);

          // Ověříme, že soubor má správnou strukturu
          if (!data.board || !data.version) {
            throw new Error('Neplatný formát souboru');
          }

          this.save(STORAGE_KEYS.BOARD, data.board);
          if (data.archive) this.save(STORAGE_KEYS.ARCHIVE, data.archive);
          if (data.settings) this.save(STORAGE_KEYS.SETTINGS, data.settings);

          resolve(data);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Chyba při čtení souboru'));
      reader.readAsText(file);
    });
  }
}

export { STORAGE_KEYS };
