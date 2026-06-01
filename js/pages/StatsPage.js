// StatsPage zobrazuje statistiky nástěnky — počty karet, rozdělení priorit
// a přehled karet po termínu. Grafy jsou kresleny přímo do SVG bez knihoven.

export class StatsPage {
  constructor(app) {
    this.app = app;
    this.board = app.board;
  }

  // Sestaví celou stránku statistik
  render() {
    const el = document.createElement('div');
    el.className = 'stats-page';

    el.innerHTML = '<header><h2>📊 Statistiky</h2></header>';

    const stats = this.board.getStats();
    el.appendChild(this.renderStatCards(stats));
    el.appendChild(this.renderPriorityChart(stats));
    el.appendChild(this.renderColumnChart());

    // Seznam prošlých karet zobrazíme jen pokud nějaké existují
    if (stats.overdue > 0) {
      el.appendChild(this.renderOverdueList());
    }

    return el;
  }

  // Vykreslí čtyři čtverečky s čísly — celkem, aktivní, archivované, po termínu
  renderStatCards(stats) {
    const grid = document.createElement('div');
    grid.className = 'stats-grid';

    const items = [
      { label: 'Celkem úkolů', value: stats.total },
      { label: 'Aktivních', value: stats.active },
      { label: 'Archivovaných', value: stats.archived },
      { label: 'Po termínu', value: stats.overdue }
    ];

    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML = `
        <div class="stat-value">${item.value}</div>
        <div class="stat-label">${item.label}</div>
      `;
      grid.appendChild(card);
    }

    return grid;
  }

  // Vykreslí výsečový graf priorit — pokud nejsou žádné karty, zobrazí zprávu
  renderPriorityChart(stats) {
    const container = document.createElement('div');
    container.className = 'chart-container';
    container.innerHTML = '<h3>Rozložení priorit</h3>';

    const total = stats.byPriority.high + stats.byPriority.medium + stats.byPriority.low;

    if (total === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-hint';
      empty.textContent = 'Žádné aktivní úkoly.';
      container.appendChild(empty);
      return container;
    }

    const chart = this.createPieChart([
      { label: 'Vysoká', value: stats.byPriority.high, color: '#ef4444' },
      { label: 'Střední', value: stats.byPriority.medium, color: '#f59e0b' },
      { label: 'Nízká', value: stats.byPriority.low, color: '#22c55e' }
    ]);

    container.appendChild(chart);
    return container;
  }

  // Sestaví SVG výsečový graf s legendou.
  // Procházíme data a pro každou část vypočítáme úhel a souřadnice oblouku.
  createPieChart(data) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return document.createElement('div');

    const size = 300;
    const radius = 100;
    const cx = size / 2;
    const cy = size / 2;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('class', 'pie-chart');

    // Začínáme od vrcholu kruhu (-90°), aby první výseč začínala nahoře
    let currentAngle = -Math.PI / 2;

    for (const item of data) {
      if (item.value === 0) continue;

      const angle = (item.value / total) * 2 * Math.PI;
      const endAngle = currentAngle + angle;

      // Souřadnice začátku a konce oblouku na kružnici
      const x1 = cx + radius * Math.cos(currentAngle);
      const y1 = cy + radius * Math.sin(currentAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      // largeArc říká SVG, jestli má jít "velkou" nebo "malou" cestou okolo kružnice
      const largeArc = angle > Math.PI ? 1 : 0;

      // SVG path: střed -> kraj -> oblouk -> zpět do středu
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`);
      path.setAttribute('fill', item.color);
      path.setAttribute('stroke', '#fff');
      path.setAttribute('stroke-width', '2');
      svg.appendChild(path);

      const percentage = Math.round((item.value / total) * 100);

      // Popisek zobrazíme jen pokud je výseč dost velká, aby se text vešel
      if (percentage >= 5) {
        const midAngle = currentAngle + angle / 2;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', cx + radius * 0.6 * Math.cos(midAngle));
        text.setAttribute('y', cy + radius * 0.6 * Math.sin(midAngle));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-size', '14');
        text.setAttribute('font-weight', '600');
        text.textContent = `${percentage}%`;
        svg.appendChild(text);
      }

      currentAngle = endAngle;
    }

    // Legenda vedle grafu
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    for (const item of data) {
      const row = document.createElement('div');
      row.className = 'legend-item';
      row.innerHTML = `
        <span class="legend-color" style="background: ${item.color}"></span>
        <span>${item.label}</span>
        <span class="legend-value">${item.value}</span>
      `;
      legend.appendChild(row);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'chart-with-legend';
    wrapper.appendChild(svg);
    wrapper.appendChild(legend);
    return wrapper;
  }

  // Vykreslí sloupcový graf — každý sloupec nástěnky dostane jeden pruh
  renderColumnChart() {
    const container = document.createElement('div');
    container.className = 'chart-container';
    container.innerHTML = '<h3>Karty podle sloupců</h3>';

    const data = this.board.columns.map(col => ({ label: col.title, value: col.count }));

    if (data.length === 0 || data.every(d => d.value === 0)) {
      const empty = document.createElement('p');
      empty.className = 'empty-hint';
      empty.textContent = 'Žádné karty k zobrazení.';
      container.appendChild(empty);
      return container;
    }

    const width = 500;
    const height = 200;
    const padding = 30;
    const maxValue = Math.max(...data.map(d => d.value), 1);
    // Šířka pruhu a mezery jsou rovnoměrně rozděleny
    const barWidth = (width - 2 * padding) / data.length * 0.7;
    const gap = (width - 2 * padding) / data.length * 0.3;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('class', 'bar-chart');

    data.forEach((item, i) => {
      // Výška pruhu je proporcionální k maximální hodnotě
      const barHeight = (item.value / maxValue) * (height - 2 * padding);
      const x = padding + i * (barWidth + gap);
      const y = height - padding - barHeight;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', barWidth);
      rect.setAttribute('height', barHeight);
      rect.setAttribute('fill', '#6366f1');
      rect.setAttribute('rx', '4');
      svg.appendChild(rect);

      // Číslo nad pruhem
      const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      valueText.setAttribute('x', x + barWidth / 2);
      valueText.setAttribute('y', y - 5);
      valueText.setAttribute('text-anchor', 'middle');
      valueText.setAttribute('font-size', '12');
      valueText.setAttribute('font-weight', '600');
      valueText.setAttribute('fill', 'currentColor');
      valueText.textContent = item.value;
      svg.appendChild(valueText);

      // Název sloupce pod pruhem — zkrátíme pokud je příliš dlouhý
      const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelText.setAttribute('x', x + barWidth / 2);
      labelText.setAttribute('y', height - padding + 15);
      labelText.setAttribute('text-anchor', 'middle');
      labelText.setAttribute('font-size', '11');
      labelText.setAttribute('fill', 'currentColor');
      labelText.textContent = item.label.length > 10 ? item.label.slice(0, 10) + '...' : item.label;
      svg.appendChild(labelText);
    });

    container.appendChild(svg);
    return container;
  }

  // Zobrazí seznam karet, u kterých uplynul deadline, seřazený od nejstarších
  renderOverdueList() {
    const container = document.createElement('div');
    container.className = 'chart-container';
    container.innerHTML = '<h3>⚠️ Úkoly po termínu</h3>';

    const overdueCards = [];
    for (const column of this.board.columns) {
      for (const card of column.cards) {
        if (!card.archived && card.isOverdue()) {
          overdueCards.push({ card, column });
        }
      }
    }

    // Nejdříve ty nejdéle prošlé
    overdueCards.sort((a, b) => new Date(a.card.deadline) - new Date(b.card.deadline));

    const list = document.createElement('ul');
    list.className = 'overdue-list';

    for (const { card, column } of overdueCards) {
      const daysOverdue = Math.floor((new Date() - new Date(card.deadline)) / (1000 * 60 * 60 * 24));
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${this.escapeHtml(card.title)}</strong>
        <span class="overdue-meta">
          v ${this.escapeHtml(column.title)} ·
          ${daysOverdue} ${this.daysWord(daysOverdue)} po termínu
        </span>
      `;
      list.appendChild(li);
    }

    container.appendChild(list);
    return container;
  }

  // Správná česká koncovka pro počet dní
  daysWord(count) {
    if (count === 1) return 'den';
    if (count >= 2 && count <= 4) return 'dny';
    return 'dní';
  }

  // Escapuje text před vložením do innerHTML — ochrana před XSS
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
