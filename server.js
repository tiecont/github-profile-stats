import express from 'express';

const app = express();

const PORT = Number(process.env.PORT ?? 3000);
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN is required');
}

const USERNAME = 'tiecont';

let cache = null;
let cacheExpiresAt = 0;

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

async function getStats() {
  const now = Date.now();

  if (cache && now < cacheExpiresAt) {
    return cache;
  }

  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
          }
          restrictedContributionsCount
          totalCommitContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalIssueContributions
        }
      }
    }
  `;

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'tiecont-profile-stats',
    },
    body: JSON.stringify({
      query,
      variables: {
        login: USERNAME,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub returned HTTP ${response.status}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(JSON.stringify(result.errors));
  }

  const collection = result.data.user.contributionsCollection;

  cache = {
    total: collection.contributionCalendar.totalContributions,
    private: collection.restrictedContributionsCount,
    commits: collection.totalCommitContributions,
    prs: collection.totalPullRequestContributions,
    reviews: collection.totalPullRequestReviewContributions,
    issues: collection.totalIssueContributions,
  };

  cacheExpiresAt = now + 60 * 60 * 1000;

  return cache;
}

function renderSvg(stats) {
  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="760"
  height="180"
  viewBox="0 0 760 180"
>
  <style>
    .title {
      font: 600 18px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
      fill: #c9d1d9;
    }

    .number {
      font: 600 24px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
      fill: #58a6ff;
    }

    .label {
      font: 14px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
      fill: #8b949e;
    }
  </style>

  <rect
    x="0"
    y="0"
    width="760"
    height="180"
    rx="10"
    fill="#0d1117"
    stroke="#30363d"
  />

  <text x="30" y="38" class="title">
    Tiecont — GitHub Contributions
  </text>

  <text x="30" y="90" class="number">
    ${escapeXml(stats.total)}
  </text>
  <text x="30" y="115" class="label">
    Contributions
  </text>

  <text x="175" y="90" class="number">
    ${escapeXml(stats.commits)}
  </text>
  <text x="175" y="115" class="label">
    Commits
  </text>

  <text x="300" y="90" class="number">
    ${escapeXml(stats.prs)}
  </text>
  <text x="300" y="115" class="label">
    Pull Requests
  </text>

  <text x="425" y="90" class="number">
    ${escapeXml(stats.reviews)}
  </text>
  <text x="425" y="115" class="label">
    Reviews
  </text>

  <text x="550" y="90" class="number">
    ${escapeXml(stats.private)}
  </text>
  <text x="550" y="115" class="label">
    Private / Internal
  </text>

  <text x="30" y="153" class="label">
    Aggregate GitHub contribution data — private repository details are not exposed.
  </text>
</svg>
`.trim();
}

app.get('/stats.svg', async (_req, res) => {
  try {
    const stats = await getStats();

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    res.send(renderSvg(stats));
  } catch (error) {
    console.error(error);

    res.status(500).send('Unable to generate stats');
  }
});

app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stats server listening on ${PORT}`);
});
