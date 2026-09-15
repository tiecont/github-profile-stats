import { escapeXml, svgDocument, cardBackground } from './theme.js';
import { formatPeriod } from '../stats.js';

const styles = `
  .title { font-size: 18px; font-weight: 650; fill: #f0f6fc; }
  .period, .label, .footer, .rank-label { font-size: 12px; fill: #8b949e; }
  .number { font-size: 24px; font-weight: 650; fill: #58a6ff; }
  .small-number { font-size: 19px; }
  .rank { font-size: 27px; font-weight: 750; text-anchor: middle; dominant-baseline: middle; fill: #58a6ff; }
  .rank-percent { font-size: 11px; text-anchor: middle; fill: #8b949e; }
  .rank-label { text-anchor: middle; font-size: 10px; font-weight: 650; letter-spacing: .7px; }
  .rank-surface { fill: #161b22; stroke: #58a6ff; }
  .stats-divider { stroke: #30363d; }
  @media (prefers-color-scheme: light) {
    .title { fill: #1f2328; }
    .period, .label, .footer, .rank-label, .rank-percent { fill: #59636e; }
    .number, .rank { fill: #0969da; }
    .rank-surface { fill: #f6f8fa; stroke: #0969da; }
    .stats-divider { stroke: #d0d7de; }
  }
`;

function metric(x, y, number, label, small = false) {
  return `<text x="${x}" y="${y}" class="number${small ? ' small-number' : ''}">${escapeXml(number)}</text><text x="${x}" y="${y + 21}" class="label">${escapeXml(label)}</text>`;
}

export function renderStatsSvg(stats) {
  const period = formatPeriod(stats.startedAt, stats.endedAt);
  const body = `${cardBackground(760, 260)}
    <style>${styles}</style>
    <text x="28" y="35" class="title">Tiecont — GitHub Activity</text>
    <text x="28" y="56" class="period">${escapeXml(period)} · rolling contribution period</text>
    ${metric(28, 105, stats.total, 'Contributions')}
    ${metric(165, 105, stats.commits, 'Commits')}
    ${metric(302, 105, stats.prs, 'Pull Requests')}
    ${metric(439, 105, stats.reviews, 'Reviews')}
    ${metric(28, 171, stats.issues, 'Issues', true)}
    ${metric(165, 171, stats.stars, 'Public Stars', true)}
    ${metric(302, 171, stats.followers, 'Followers', true)}
    <line x1="28" y1="216" x2="568" y2="216" class="stats-divider"/>
    <text x="28" y="238" class="footer">GitHub GraphQL · self-hosted activity snapshot</text>
    <circle cx="658" cy="119" r="47" class="rank-surface" stroke-width="2"/>
    <text x="658" y="113" class="rank">${escapeXml(stats.rank.level)}</text>
    <text x="658" y="139" class="rank-percent">${Math.round(stats.rank.percentile)}th percentile</text>
    <text x="658" y="187" class="rank-label">ACTIVITY RANK</text>`;
  return svgDocument({ width: 760, height: 260, title: 'Tiecont GitHub Activity', description: 'GitHub activity metrics with an activity rank.', body });
}
