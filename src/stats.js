const exponentialCdf = (x) => 1 - 2 ** -x;
const logNormalCdf = (x) => x / (1 + x);

export function calculateActivityRank({ commits, prs, issues, reviews, stars, followers }) {
  const metrics = [
    [commits, 250, 2, exponentialCdf], [prs, 50, 3, exponentialCdf],
    [issues, 25, 1, exponentialCdf], [reviews, 2, 1, exponentialCdf],
    [stars, 50, 4, logNormalCdf], [followers, 10, 1, logNormalCdf],
  ];
  const totalWeight = metrics.reduce((total, [, , weight]) => total + weight, 0);
  const score = 1 - metrics.reduce(
    (total, [value, median, weight, cdf]) => total + weight * cdf(value / median),
    0,
  ) / totalWeight;
  const percentile = Math.max(0, Math.min(100, score * 100));
  const thresholds = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const levels = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];
  const index = thresholds.findIndex((threshold) => percentile <= threshold);
  return { level: levels[index === -1 ? levels.length - 1 : index], percentile };
}

function parseDate(date) {
  return new Date(`${date}T00:00:00Z`);
}

export function calculateContributionSummary(days) {
  if (!days.length) return { currentStreak: 0, longestStreak: 0, mostActiveDay: '—', byDate: new Map() };

  const byDate = new Map(days.map((day) => [day.date, day]));
  const activeDays = days.filter((day) => day.contributionCount > 0);
  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate;
  for (const day of days) {
    const date = parseDate(day.date);
    const isConsecutive = previousDate && date - previousDate === 86_400_000;
    if (day.contributionCount > 0 && (isConsecutive || !previousDate)) runningStreak += 1;
    else if (day.contributionCount > 0) runningStreak = 1;
    else runningStreak = 0;
    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = date;
  }

  let currentStreak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].contributionCount <= 0) break;
    const current = parseDate(days[index].date);
    const previous = index > 0 ? parseDate(days[index - 1].date) : null;
    if (previous && current - previous !== 86_400_000) break;
    currentStreak += 1;
  }

  const dayTotals = new Map();
  for (const day of activeDays) {
    const weekday = parseDate(day.date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    dayTotals.set(weekday, (dayTotals.get(weekday) ?? 0) + day.contributionCount);
  }
  const mostActiveDay = [...dayTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  return { currentStreak, longestStreak, mostActiveDay, byDate };
}

export function enrichStats(stats) {
  return { ...stats, rank: calculateActivityRank(stats), summary: calculateContributionSummary(stats.contributionDays) };
}

export function formatPeriod(startedAt, endedAt) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${formatter.format(new Date(startedAt))} — ${formatter.format(new Date(endedAt))}`;
}
