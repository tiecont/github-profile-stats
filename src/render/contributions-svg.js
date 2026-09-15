import { escapeXml, svgDocument, cardBackground } from './theme.js';

const styles = `
  .title { font-size: 18px; font-weight: 650; fill: #f0f6fc; }
  .subtitle, .axis, .summary-label { font-size: 11px; fill: #8b949e; }
  .summary-number { font-size: 18px; font-weight: 650; fill: #58a6ff; }
  .cell { stroke: #0d1117; stroke-width: 1; }
  .contribution-0 { fill: #21262d; }
  .contribution-1 { fill: #0e4429; }
  .contribution-2 { fill: #006d32; }
  .contribution-3 { fill: #26a641; }
  .contribution-4 { fill: #39d353; }
  .contributions-divider { stroke: #30363d; }
  @media (prefers-color-scheme: light) {
    .title { fill: #1f2328; }
    .subtitle, .axis, .summary-label { fill: #59636e; }
    .summary-number { fill: #0969da; }
    .cell { stroke: #ffffff; }
    .contribution-0 { fill: #ebedf0; }
    .contribution-1 { fill: #9be9a8; }
    .contribution-2 { fill: #40c463; }
    .contribution-3 { fill: #30a14e; }
    .contribution-4 { fill: #216e39; }
    .contributions-divider { stroke: #d0d7de; }
  }
`;
const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value);

function contributionColor(count, max) {
  if (count <= 0) return 'contribution-0';
  const ratio = count / Math.max(max, 1);
  if (ratio <= 0.25) return 'contribution-1';
  if (ratio <= 0.5) return 'contribution-2';
  if (ratio <= 0.75) return 'contribution-3';
  return 'contribution-4';
}

function groupWeeks(days) {
  const groups = [];
  for (const day of days) {
    const date = new Date(`${day.date}T00:00:00Z`);
    const weekStart = new Date(date);
    weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
    const key = weekStart.toISOString().slice(0, 10);
    let week = groups.find((candidate) => candidate.key === key);
    if (!week) { week = { key, days: [] }; groups.push(week); }
    week.days.push(day);
  }
  return groups.map((week) => Array.from({ length: 7 }, (_, weekday) => week.days.find((day) => day.weekday === weekday) ?? { date: week.key, contributionCount: 0, weekday }));
}

function renderGrid(stats) {
  const weeks = groupWeeks(stats.contributionDays);
  const max = Math.max(...stats.contributionDays.map((day) => day.contributionCount), 1);
  const x = 50; const y = 84; const cellSize = 10; const cellStep = 13;
  const monthLabels = [];
  let previousMonth = '';
  weeks.forEach((week, index) => {
    const date = new Date(`${week[0].date}T00:00:00Z`);
    const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    if (month !== previousMonth) {
      monthLabels.push(`<text x="${x + index * cellStep}" y="74" class="axis">${month}</text>`);
      previousMonth = month;
    }
  });
  const rowLabels = [[1, 'Mon'], [3, 'Wed'], [5, 'Fri']].map(([row, label]) => `<text x="8" y="${y + row * cellStep + 9}" class="axis">${label}</text>`).join('');
  const cells = [];
  weeks.forEach((week, weekIndex) => week.forEach((day, weekday) => {
    const title = `${day.contributionCount} contribution${day.contributionCount === 1 ? '' : 's'} on ${day.date}`;
    cells.push(`<rect x="${x + weekIndex * cellStep}" y="${y + weekday * cellStep}" width="${cellSize}" height="${cellSize}" rx="2" class="cell ${contributionColor(day.contributionCount, max)}"><title>${escapeXml(title)}</title></rect>`);
  }));
  return `${monthLabels.join('')}${rowLabels}${cells.join('')}`;
}

export function renderContributionsSvg(stats) {
  const summary = stats.summary;
  const body = `${cardBackground(960, 300)}
    <style>${styles}</style>
    <text x="28" y="35" class="title">Contribution Activity</text>
    <text x="28" y="56" class="subtitle">Last 12 months · ${formatNumber(stats.total)} total contributions</text>
    ${renderGrid(stats)}
    <line x1="758" y1="72" x2="758" y2="252" class="contributions-divider"/>
    <text x="790" y="92" class="summary-label">TOTAL CONTRIBUTIONS</text>
    <text x="790" y="116" class="summary-number">${formatNumber(stats.total)}</text>
    <text x="790" y="148" class="summary-label">CURRENT STREAK</text>
    <text x="790" y="172" class="summary-number">${summary.currentStreak} days</text>
    <text x="790" y="204" class="summary-label">LONGEST STREAK</text>
    <text x="790" y="228" class="summary-number">${summary.longestStreak} days</text>
    <text x="790" y="260" class="summary-label">MOST ACTIVE · ${escapeXml(summary.mostActiveDay)}</text>`;
  return svgDocument({ width: 960, height: 300, title: 'Tiecont Contribution Activity', description: 'A GitHub-style contribution heatmap for the last 12 months.', body });
}
