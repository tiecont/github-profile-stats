import express from 'express';
import { config } from './config.js';
import { createRenderedCache, createStatsCache } from './cache.js';
import { fetchGitHubStats } from './github.js';
import { enrichStats } from './stats.js';
import { renderContributionsSvg } from './render/contributions-svg.js';
import { renderFallbackSvg } from './render/fallback-svg.js';
import { renderStatsSvg } from './render/stats-svg.js';

export const app = express();
const statsCache = createStatsCache(config.cacheTtlMs);
const renderedCaches = { stats: createRenderedCache(), contributions: createRenderedCache() };

async function getStats() {
  const cached = statsCache.get();
  if (cached) return cached;
  return statsCache.set(enrichStats(await fetchGitHubStats()));
}

function setSvgHeaders(res, { stale = false, fallback = false } = {}) {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', `public, max-age=${stale || fallback ? 60 : 3600}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (stale) res.setHeader('X-Stats-Stale', 'true');
}

async function serveSvg(kind, res) {
  const render = kind === 'stats' ? renderStatsSvg : renderContributionsSvg;
  try {
    const stats = await getStats();
    const svg = render(stats);
    renderedCaches[kind].set(svg);
    setSvgHeaders(res);
    return res.status(200).send(svg);
  } catch (error) {
    console.error(`${kind} SVG refresh failed: ${error.message}`);
    const staleSvg = renderedCaches[kind].get();
    const svg = staleSvg ?? renderFallbackSvg(kind);
    setSvgHeaders(res, { stale: Boolean(staleSvg), fallback: !staleSvg });
    return res.status(200).send(svg);
  }
}

app.get('/', (_req, res) => res.redirect(302, '/stats.svg'));
app.get('/stats.svg', (_req, res) => serveSvg('stats', res));
app.get('/contributions.svg', (_req, res) => serveSvg('contributions', res));
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/readyz', (_req, res) => {
  const ready = Boolean(config.githubToken && config.githubUsername);
  return res.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'not_ready', server: 'initialized',
    githubToken: config.githubToken ? 'configured' : 'missing',
    githubUsername: config.githubUsername ? 'configured' : 'missing',
  });
});

export function startServer() {
  return app.listen(config.port, '0.0.0.0', () => console.log(`Stats server listening on ${config.port}`));
}
