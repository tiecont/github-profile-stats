import { config } from './config.js';

const GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

const QUERY = `
  query($login: String!) {
    user(login: $login) {
      followers { totalCount }
      repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC) {
        nodes { stargazers { totalCount } }
      }
      contributionsCollection {
        startedAt
        endedAt
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays { date contributionCount weekday }
          }
        }
        totalCommitContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalIssueContributions
      }
    }
  }
`;

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  timeout.unref?.();
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

export function normalizeGitHubStats(user) {
  const collection = user?.contributionsCollection;
  const calendar = collection?.contributionCalendar;
  if (!collection || !calendar) throw new Error('GitHub response did not include contribution data');

  const stars = (user.repositories?.nodes ?? []).reduce(
    (total, repository) => total + (repository?.stargazers?.totalCount ?? 0),
    0,
  );
  const contributionDays = (calendar.weeks ?? [])
    .flatMap((week) => week.contributionDays ?? [])
    .filter((day) => day?.date && Number.isFinite(day.contributionCount))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total: calendar.totalContributions ?? 0,
    commits: collection.totalCommitContributions ?? 0,
    prs: collection.totalPullRequestContributions ?? 0,
    reviews: collection.totalPullRequestReviewContributions ?? 0,
    issues: collection.totalIssueContributions ?? 0,
    stars,
    followers: user.followers?.totalCount ?? 0,
    startedAt: collection.startedAt,
    endedAt: collection.endedAt,
    contributionDays,
  };
}

export async function fetchGitHubStats() {
  if (!config.githubToken) throw new Error('GITHUB_TOKEN is not configured');

  const timeout = createTimeoutSignal(config.githubTimeoutMs);
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'tiecont-profile-stats',
      },
      body: JSON.stringify({ query: QUERY, variables: { login: config.githubUsername } }),
      signal: timeout.signal,
    });

    if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('GitHub returned invalid JSON');
    }
    if (result.errors?.length) throw new Error('GitHub GraphQL returned errors');

    const user = result.data?.user;
    if (!user) throw new Error(`GitHub user ${config.githubUsername} was not found`);
    return normalizeGitHubStats(user);
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`GitHub request timed out after ${config.githubTimeoutMs}ms`);
    throw error;
  } finally {
    timeout.clear();
  }
}
