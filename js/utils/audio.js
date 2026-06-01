// AudioManager se stará o přehrávání zvukových efektů.
// Momentálně máme jen jeden zvuk ("complete"), ale třída je napsaná tak,
// že lze snadno přidat další.

export class AudioManager {
  constructor() {
    this.sounds = {};   // slovník zvuků: název -> objekt Audio
    this.enabled = true;
    this.volume = 0.3;
  }

  // Načte zvukový soubor a uloží ho pod daným názvem.
  // Preload 'auto' říká prohlížeči, aby soubor stáhl hned — jinak by při prvním přehrání sekalo.
  load(name, url) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.volume = this.volume;
    this.sounds[name] = audio;
  }

  // Přehraje zvuk podle jména. Pokud jsou zvuky vypnuté nebo zvuk neexistuje, nic se nestane.
  play(name) {
    if (!this.enabled) return;
    const sound = this.sounds[name];
    if (!sound) return;
    // Vracíme přehrávání na začátek, aby šel zvuk spustit vícekrát za sebou
    sound.currentTime = 0;
    // Prohlížeč může autoplay zablokovat (bezpečnostní politika) — chybu tiše ignorujeme
    sound.play().catch(() => {});
  }

  // Zapne nebo vypne všechny zvuky — propojeno s přepínačem v nastavení
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  // Nastaví hlasitost (hodnota 0–1) a okamžitě ji aplikuje na všechny načtené zvuky
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    for (const sound of Object.values(this.sounds)) {
      sound.volume = this.volume;
    }
  }
}

// Vytvoříme jednu sdílenou instanci, kterou importují ostatní soubory
export const audioManager = new AudioManager();
audioManager.load('complete', 'assets/sounds/complete.mp3');
