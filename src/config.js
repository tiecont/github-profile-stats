export const config = {
  port: Number(process.env.PORT ?? 3000),
  githubToken: process.env.GITHUB_TOKEN ?? '',
  githubUsername: process.env.GITHUB_USERNAME ?? '',
  cacheTtlMs: 60 * 60 * 1000,
  githubTimeoutMs: 8 * 1000,
};
