import { escapeXml, svgDocument, cardBackground } from './theme.js';

export function renderFallbackSvg(kind, message = 'Activity data is temporarily unavailable') {
  const isContributions = kind === 'contributions';
  const width = isContributions ? 960 : 760;
  const height = isContributions ? 300 : 260;
  const title = isContributions ? 'Contribution Activity' : 'Tiecont GitHub Activity';
  const body = `${cardBackground(width, height)}
    <text x="28" y="38" class="fallback-title">${escapeXml(title)}</text>
    <text x="28" y="74" class="fallback-message">${escapeXml(message)}</text>
    <text x="28" y="101" class="fallback-detail">The card will refresh automatically when GitHub is reachable again.</text>
    <line x1="28" y1="${height - 44}" x2="${width - 28}" y2="${height - 44}" class="fallback-divider"/>
    <text x="28" y="${height - 20}" class="fallback-detail">Self-hosted GitHub activity · tiecont</text>
    <style>
      .fallback-title { font: 650 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #f0f6fc; }
      .fallback-message { font: 600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #58a6ff; }
      .fallback-detail { font: 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #8b949e; }
      .fallback-divider { stroke: #30363d; }
      @media (prefers-color-scheme: light) {
        .fallback-title { fill: #1f2328; }
        .fallback-message { fill: #0969da; }
        .fallback-detail { fill: #59636e; }
        .fallback-divider { stroke: #d0d7de; }
      }
    </style>`;
  return svgDocument({ width, height, title, description: 'A temporary fallback for GitHub activity data.', body });
}
