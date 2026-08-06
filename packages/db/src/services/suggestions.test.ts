import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { createDb, type Db } from "../client.js";
import { connections, evidence, films, revisions, suggestions, users } from "../schema/index.js";
import { approveSuggestion, createSuggestion } from "./suggestions.js";
import { newId } from "../utils.js";

const url = process.env.DATABASE_URL ?? "postgres://precept:precept@localhost:5432/precept";

describe("suggestion write path", () => {
  let db: Db;
  let adminId: string;
  let filmA: string;
  let filmB: string;

  beforeAll(async () => {
    db = createDb(url);
    adminId = newId();
    filmA = newId();
    filmB = newId();
    await db.insert(users).values({
      id: adminId,
      handle: `test_admin_${adminId.slice(-6)}`,
      displayName: "Test Admin",
      email: `test_admin_${adminId.slice(-6)}@example.com`,
      role: "admin",
    });
    await db.insert(films).values([
      {
        id: filmA,
        slug: `test-a-${filmA.slice(-6)}`,
        title: "Test Film A",
        releaseYear: 2000,
        popularityScore: 1,
      },
      {
        id: filmB,
        slug: `test-b-${filmB.slice(-6)}`,
        title: "Test Film B",
        releaseYear: 2001,
        popularityScore: 1,
      },
    ]);
  });

  afterAll(async () => {
    const sql = postgres(url, { max: 1 });
    await sql.end();
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

    const ev = await db
      .select()
      .from(evidence)
      .where(eq(evidence.targetId, result.targetId!));
    expect(ev.length).toBeGreaterThan(0);

    const revs = await db
      .select()
      .from(revisions)
      .where(eq(revisions.targetId, result.targetId!));
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
});
