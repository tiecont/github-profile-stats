import express from 'express';

const app = express();

const PORT = Number(process.env.PORT ?? 3000);
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN is required');
}

const USERNAME = 'tiecont';
const CACHE_TTL_MS = 60 * 60 * 1000;

let cache = null;
let cacheExpiresAt = 0;

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const exponentialCdf = (x) => 1 - 2 ** -x;
const logNormalCdf = (x) => x / (1 + x);

function calculateActivityRank({
  commits,
  prs,
  issues,
  reviews,
  stars,
  followers,
}) {
  const COMMITS_MEDIAN = 250;
  const COMMITS_WEIGHT = 2;

  const PRS_MEDIAN = 50;
  const PRS_WEIGHT = 3;

  const ISSUES_MEDIAN = 25;
  const ISSUES_WEIGHT = 1;

  const REVIEWS_MEDIAN = 2;
  const REVIEWS_WEIGHT = 1;

  const STARS_MEDIAN = 50;
  const STARS_WEIGHT = 4;

  const FOLLOWERS_MEDIAN = 10;
  const FOLLOWERS_WEIGHT = 1;

  const totalWeight =
    COMMITS_WEIGHT +
    PRS_WEIGHT +
    ISSUES_WEIGHT +
    REVIEWS_WEIGHT +
    STARS_WEIGHT +
    FOLLOWERS_WEIGHT;

  const score =
    1 -
    (
      COMMITS_WEIGHT * exponentialCdf(commits / COMMITS_MEDIAN) +
      PRS_WEIGHT * exponentialCdf(prs / PRS_MEDIAN) +
      ISSUES_WEIGHT * exponentialCdf(issues / ISSUES_MEDIAN) +
      REVIEWS_WEIGHT * exponentialCdf(reviews / REVIEWS_MEDIAN) +
      STARS_WEIGHT * logNormalCdf(stars / STARS_MEDIAN) +
      FOLLOWERS_WEIGHT * logNormalCdf(followers / FOLLOWERS_MEDIAN)
    ) /
      totalWeight;

  const percentile = Math.max(
    0,
    Math.min(100, score * 100),
  );

  const thresholds = [
    1,
    12.5,
    25,
    37.5,
    50,
    62.5,
    75,
    87.5,
    100,
  ];

  const levels = [
    'S',
    'A+',
    'A',
    'A-',
    'B+',
    'B',
    'B-',
    'C+',
    'C',
  ];

  const index = thresholds.findIndex(
    (threshold) => percentile <= threshold,
  );

  return {
    level: levels[
      index === -1
        ? levels.length - 1
        : index
    ],
    percentile,
  };
}

function formatPeriod(startedAt, endedAt) {
  const formatter = new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    },
  );

  return `${formatter.format(
    new Date(startedAt),
  )} — ${formatter.format(
    new Date(endedAt),
  )}`;
}

async function getStats() {
  const now = Date.now();

  if (cache && now < cacheExpiresAt) {
    return cache;
  }

  const query = `
    query($login: String!) {
      user(login: $login) {
        followers {
          totalCount
        }

        repositories(
          first: 100
          ownerAffiliations: OWNER
          privacy: PUBLIC
        ) {
          nodes {
            stargazers {
              totalCount
            }
          }
        }

        contributionsCollection {
          startedAt
          endedAt

          contributionCalendar {
            totalContributions
          }

          totalCommitContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalIssueContributions
        }
      }
    }
  `;

  const response = await fetch(
    'https://api.github.com/graphql',
    {
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
    },
  );

  if (!response.ok) {
    throw new Error(
      `GitHub returned HTTP ${response.status}`,
    );
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(
      JSON.stringify(result.errors),
    );
  }

  const user = result.data?.user;

  if (!user) {
    throw new Error(
      `GitHub user ${USERNAME} was not found`,
    );
  }

  const collection =
    user.contributionsCollection;

  const stars = (
    user.repositories.nodes ?? []
  ).reduce(
    (total, repository) =>
      total +
      repository.stargazers.totalCount,
    0,
  );

  const stats = {
    total:
      collection.contributionCalendar
        .totalContributions,

    commits:
      collection.totalCommitContributions,

    prs:
      collection.totalPullRequestContributions,

    reviews:
      collection
        .totalPullRequestReviewContributions,

    issues:
      collection.totalIssueContributions,

    stars,

    followers:
      user.followers.totalCount,

    startedAt:
      collection.startedAt,

    endedAt:
      collection.endedAt,
  };

  stats.rank =
    calculateActivityRank(stats);

  cache = stats;
  cacheExpiresAt =
    now + CACHE_TTL_MS;

  return cache;
}

function renderMetric(
  x,
  number,
  label,
) {
  return `
    <text
      x="${x}"
      y="108"
      class="number"
    >${escapeXml(number)}</text>

    <text
      x="${x}"
      y="130"
      class="label"
    >${escapeXml(label)}</text>
  `;
}

function renderSecondaryMetric(
  x,
  number,
  label,
) {
  return `
    <text
      x="${x}"
      y="176"
      class="number small-number"
    >${escapeXml(number)}</text>

    <text
      x="${x}"
      y="198"
      class="label"
    >${escapeXml(label)}</text>
  `;
}

function renderSvg(stats) {
  const period = formatPeriod(
    stats.startedAt,
    stats.endedAt,
  );

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="760"
  height="260"
  viewBox="0 0 760 260"
  role="img"
  aria-labelledby="title desc"
>
  <title id="title">
    Tiecont GitHub Activity
  </title>

  <desc id="desc">
    Rolling GitHub contribution activity
    with an activity rank.
  </desc>

  <style>
    :root {
      --bg: #0d1117;
      --border: #30363d;
      --title: #c9d1d9;
      --text: #8b949e;
      --accent: #58a6ff;
      --rank-bg: #161b22;
    }

    @media (prefers-color-scheme: light) {
      :root {
        --bg: #ffffff;
        --border: #d0d7de;
        --title: #1f2328;
        --text: #59636e;
        --accent: #0969da;
        --rank-bg: #f6f8fa;
      }
    }

    .title {
      font:
        600 18px
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

      fill: var(--title);
    }

    .period,
    .label,
    .footer,
    .rank-label {
      font:
        13px
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

      fill: var(--text);
    }

    .number {
      font:
        600 24px
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

      fill: var(--accent);
    }

    .small-number {
      font-size: 21px;
    }

    .rank {
      font:
        700 30px
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

      fill: var(--accent);
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .rank-label {
      text-anchor: middle;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.7px;
    }
  </style>

  <rect
    x="0.5"
    y="0.5"
    width="759"
    height="259"
    rx="12"
    fill="var(--bg)"
    stroke="var(--border)"
  />

  <text
    x="28"
    y="35"
    class="title"
  >
    Tiecont — GitHub Activity
  </text>

  <text
    x="28"
    y="57"
    class="period"
  >
    ${escapeXml(period)} · rolling contribution window
  </text>

  ${renderMetric(
    28,
    stats.total,
    'Contributions',
  )}

  ${renderMetric(
    165,
    stats.commits,
    'Commits',
  )}

  ${renderMetric(
    302,
    stats.prs,
    'Pull Requests',
  )}

  ${renderMetric(
    439,
    stats.reviews,
    'Reviews',
  )}

  ${renderSecondaryMetric(
    28,
    stats.issues,
    'Issues',
  )}

  ${renderSecondaryMetric(
    165,
    stats.stars,
    'Public Stars',
  )}

  ${renderSecondaryMetric(
    302,
    stats.followers,
    'Followers',
  )}

  <circle
    cx="660"
    cy="116"
    r="47"
    fill="var(--rank-bg)"
    stroke="var(--accent)"
    stroke-width="3"
  />

  <text
    x="660"
    y="113"
    class="rank"
  >${escapeXml(stats.rank.level)}</text>

  <text
    x="660"
    y="181"
    class="rank-label"
  >
    ACTIVITY RANK
  </text>

  <line
    x1="28"
    y1="216"
    x2="732"
    y2="216"
    stroke="var(--border)"
  />

  <text
    x="28"
    y="237"
    class="footer"
  >
    Aggregate activity may include private/internal contributions.
    Repository details are not exposed.
  </text>

  <text
    x="28"
    y="253"
    class="footer"
  >
    Activity Rank uses the GitHub Readme Stats ranking formula
    with rolling contribution metrics.
  </text>
</svg>
`.trim();
}

app.get(
  '/stats.svg',
  async (_req, res) => {
    try {
      const stats =
        await getStats();

      res.setHeader(
        'Content-Type',
        'image/svg+xml; charset=utf-8',
      );

      res.setHeader(
        'Cache-Control',
        'public, max-age=3600',
      );

      res.setHeader(
        'X-Content-Type-Options',
        'nosniff',
      );

      res.send(
        renderSvg(stats),
      );
    } catch (error) {
      console.error(error);

      res
        .status(500)
        .send(
          'Unable to generate stats',
        );
    }
  },
);

app.get(
  '/healthz',
  (_req, res) => {
    res.json({
      status: 'ok',
    });
  },
);

app.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `Stats server listening on ${PORT}`,
    );
  },
);
