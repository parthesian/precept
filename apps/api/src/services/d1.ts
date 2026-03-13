import { ulid } from "ulid";

export function toSqliteBool(value: boolean): number {
  return value ? 1 : 0;
}

export function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    return JSON.parse(value) as T[];
  } catch {
    return [];
  }
}

export function nowIsoString(): string {
  return new Date().toISOString();
}

export function generateId(): string {
  return ulid();
}
