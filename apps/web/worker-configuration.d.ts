/// <reference types="@cloudflare/workers-types" />

interface Env {
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
  CORS_ORIGIN?: string;
}
