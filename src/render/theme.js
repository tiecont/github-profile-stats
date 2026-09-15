export const themeStyles = `
  :root {
    --background: #0d1117; --surface: #161b22; --border: #30363d;
    --primary-text: #f0f6fc; --secondary-text: #8b949e; --accent: #58a6ff;
    --success: #3fb950; --muted-contribution: #21262d; --strong-contribution: #39d353;
    --contribution-1: #0e4429; --contribution-2: #006d32; --contribution-3: #26a641; --contribution-4: #39d353;
  }
  @media (prefers-color-scheme: light) {
    :root {
      --background: #ffffff; --surface: #f6f8fa; --border: #d0d7de;
      --primary-text: #1f2328; --secondary-text: #59636e; --accent: #0969da;
      --success: #1a7f37; --muted-contribution: #ebedf0; --strong-contribution: #216e39;
      --contribution-1: #9be9a8; --contribution-2: #40c463; --contribution-3: #30a14e; --contribution-4: #216e39;
    }
  }
  .svg-card { fill: #0d1117; stroke: #30363d; }
  .svg-surface { fill: #161b22; }
  .svg-divider { stroke: #30363d; }
  text, .text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  @media (prefers-color-scheme: light) {
    .svg-card { fill: #ffffff; stroke: #d0d7de; }
    .svg-surface { fill: #f6f8fa; }
    .svg-divider { stroke: #d0d7de; }
  }
`;

export function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function svgDocument({ width, height, title, description, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(description)}</desc>
  <style>${themeStyles}</style>
  ${body}
</svg>`.trim();
}

export function cardBackground(width, height, radius = 12) {
  return `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${radius}" class="svg-card"/>`;
}
