import { afterAll, beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { getPlatformProxy, type PlatformProxy } from "wrangler";
import { createDb, type Db } from "../client.js";
import { connections, evidence, films, revisions, suggestions, users } from "../schema/index.js";
import { approveSuggestion, createSuggestion } from "./suggestions.js";
import { newId } from "../utils.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const now = Date.now();

describe("suggestion write path (D1)", () => {
  let proxy: PlatformProxy;
  let db: Db;
  let adminId: string;
  let filmA: string;
  let filmB: string;

  beforeAll(async () => {
    proxy = await getPlatformProxy({
      configPath: path.join(root, "apps/web/wrangler.jsonc"),
      persist: { path: path.join(root, "apps/web/.wrangler/state/v3") },
    });
    db = createDb(proxy.env.DB as D1Database);
    adminId = newId();
    filmA = newId();
    filmB = newId();
    await db.insert(users).values({
      id: adminId,
      handle: `test_admin_${adminId.slice(-6)}`,
      displayName: "Test Admin",
      email: `test_admin_${adminId.slice(-6)}@example.com`,
      role: "admin",
      createdAt: now,
    });
    await db.insert(films).values([
      {
        id: filmA,
        slug: `test-a-${filmA.slice(-6)}`,
        title: "Test Film A",
        releaseYear: 2000,
        popularityScore: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: filmB,
        slug: `test-b-${filmB.slice(-6)}`,
        title: "Test Film B",
        releaseYear: 2001,
        popularityScore: 1,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }, 60_000);

  afterAll(async () => {
    await proxy?.dispose();
  });

  it("rejects confirmed without qualifying evidence", async () => {
    await expect(
      createSuggestion(db, {
        target_type: "connection",
        operation: "create",
        submitted_by: adminId,
        auto_approve: true,
        payload: {
          source_film_id: filmA,
          target_film_id: filmB,
          is_directed: true,
          connection_type: "homage",
          confidence_tier: "confirmed",
          title: "Bad confirmed",
          rationale: "Should fail",
          evidence: [
            {
              evidence_type: "wiki",
              citation_text: "Wiki only",
              excerpt: "Not qualifying evidence type here.",
            },
          ],
        },
        evidence: [
          {
            evidence_type: "wiki",
            citation_text: "Wiki only",
            excerpt: "Not qualifying evidence type here.",
          },
        ],
      })
    ).rejects.toThrow(/qualifying evidence|confirmed/i);
  });

  it("approves connection only through suggestion path and writes revision", async () => {
    const result = await createSuggestion(db, {
      target_type: "connection",
      operation: "create",
      submitted_by: adminId,
      auto_approve: true,
      payload: {
        source_film_id: filmA,
        target_film_id: filmB,
        is_directed: true,
        connection_type: "homage",
        confidence_tier: "confirmed",
        title: "Good confirmed",
        rationale: "Interview-backed",
      },
      evidence: [
        {
          evidence_type: "interview",
          citation_text: "Director interview",
          url: "https://example.com/interview",
          excerpt: "I was thinking of that film constantly.",
        },
      ],
    });

    expect(result.status).toBe("approved");
    expect(result.targetId).toBeTruthy();

    const [conn] = await db
      .select()
      .from(connections)
      .where(eq(connections.id, result.targetId!));
    expect(conn?.title).toBe("Good confirmed");
    expect(conn?.confidenceTier).toBe("confirmed");

    const ev = await db.select().from(evidence).where(eq(evidence.targetId, result.targetId!));
    expect(ev.length).toBeGreaterThan(0);

    const revs = await db.select().from(revisions).where(eq(revisions.targetId, result.targetId!));
    expect(revs.length).toBeGreaterThan(0);

    const [sug] = await db
      .select()
      .from(suggestions)
      .where(eq(suggestions.id, result.suggestionId));
    expect(sug.status).toBe("approved");
  });

  it("never auto-approves AI suggestions", async () => {
    await expect(
      createSuggestion(db, {
        target_type: "connection",
        operation: "create",
        source: "ai",
        submitted_by: adminId,
        auto_approve: true,
        ai_metadata: { model: "test" },
        payload: {
          source_film_id: filmA,
          target_film_id: filmB,
          is_directed: true,
          connection_type: "visual_motif",
          confidence_tier: "ai_suggested",
          title: "AI edge",
          rationale: "model guess",
        },
      })
    ).rejects.toThrow(/AI suggestions cannot be auto-approved/);
  });

  it("approve bookkeeping uses D1 batch (revision + status)", async () => {
    const pending = await createSuggestion(db, {
      target_type: "connection",
      operation: "create",
      submitted_by: adminId,
      auto_approve: false,
      payload: {
        source_film_id: filmA,
        target_film_id: filmB,
        is_directed: true,
        connection_type: "stated_influence",
        confidence_tier: "proposed",
        title: "Batch path",
        rationale: "Pending then approve",
      },
      evidence: [
        {
          evidence_type: "article",
          citation_text: "Trade press",
          excerpt: "Cited the earlier picture.",
        },
      ],
    });
    expect(pending.status).toBe("pending");

    const approved = await approveSuggestion(db, {
      suggestionId: pending.suggestionId,
      reviewerId: adminId,
      reviewNote: "looks good",
    });
    expect(approved.status).toBe("approved");

    const [sug] = await db
      .select()
      .from(suggestions)
      .where(eq(suggestions.id, pending.suggestionId));
    expect(sug.status).toBe("approved");
    expect(sug.reviewNote).toBe("looks good");
  });
});
