/** Cloudflare Worker bindings for the Precept API / full-stack Worker. */
export type ApiBindings = {
  DB: D1Database;
  RATE_LIMIT: KVNamespace;
  TMDB_IMPORT_QUEUE: Queue;
  AUTH_SECRET: string;
  TMDB_API_KEY?: string;
  ENVIRONMENT?: string;
  TRUSTED_APPROVALS_THRESHOLD?: string;
  RATE_LIMIT_SUGGESTIONS_PER_HOUR?: string;
  RATE_LIMIT_VOTES_PER_HOUR?: string;
  RATE_LIMIT_TMDB_SEARCH_PER_HOUR?: string;
  RATE_LIMIT_TMDB_IMPORT_PER_HOUR?: string;
  /** Optional CORS origin when UI is on a different port during migration. */
  CORS_ORIGIN?: string;
};
