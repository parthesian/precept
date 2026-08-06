import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { Db } from "@precept/db";
import {
  collectionFilms,
  connections,
  credits,
  films,
  people,
  preceptExamples,
} from "@precept/db";
import type { GraphEdge, GraphNode, GraphPayload } from "@precept/shared";
import { filmDto, personDto } from "../lib/serialize.js";

export async function buildGraph(
  db: Db,
  opts: {
    centerType: "film" | "person" | "collection";
    centerId: string;
    depth?: number;
    limit?: number;
    edgeClasses?: Array<"curated" | "derived" | "computed">;
  }
): Promise<GraphPayload> {
  const depth = Math.min(Math.max(opts.depth ?? 1, 1), 2);
  const limit = Math.min(Math.max(opts.limit ?? 150, 1), 150);
  const classes = new Set(opts.edgeClasses?.length ? opts.edgeClasses : ["curated"]);

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const filmIds = new Set<string>();

  if (opts.centerType === "film") {
    const [film] = await db.select().from(films).where(eq(films.id, opts.centerId));
    if (!film) return { nodes: [], edges: [] };
    nodes.set(film.id, {
      id: film.id,
      type: "film",
      slug: film.slug,
      label: film.title,
      sublabel: String(film.releaseYear),
      popularity_score: film.popularityScore,
      thumb: film.posterUrl,
    });
    filmIds.add(film.id);
  } else if (opts.centerType === "person") {
    const [person] = await db.select().from(people).where(eq(people.id, opts.centerId));
    if (!person) return { nodes: [], edges: [] };
    nodes.set(person.id, {
      id: person.id,
      type: "person",
      slug: person.slug,
      label: person.name,
      sublabel: person.primaryDepartment,
      thumb: person.photoUrl,
    });
    const creds = await db.select().from(credits).where(eq(credits.personId, person.id));
    for (const c of creds) filmIds.add(c.filmId);
  } else {
    const membership = await db
      .select()
      .from(collectionFilms)
      .where(eq(collectionFilms.collectionId, opts.centerId));
    for (const m of membership) filmIds.add(m.filmId);
  }

  if (filmIds.size === 0) return { nodes: [...nodes.values()], edges };

  const centerFilmList = [...filmIds];
  const curated = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.status, "approved"),
        or(
          inArray(connections.sourceFilmId, centerFilmList),
          inArray(connections.targetFilmId, centerFilmList)
        )
      )
    );

  const neighborFilmIds = new Set<string>(filmIds);
  if (classes.has("curated")) {
    for (const c of curated) {
      if (c.confidenceTier === "ai_suggested") continue; // AI edges only in suggest mode (UI filters); still return tagged
      neighborFilmIds.add(c.sourceFilmId);
      neighborFilmIds.add(c.targetFilmId);
      edges.push({
        id: c.id,
        source: c.sourceFilmId,
        target: c.targetFilmId,
        edge_class: "curated",
        connection_type: c.connectionType,
        confidence_tier: c.confidenceTier,
        title: c.title,
        is_directed: c.isDirected,
        community_score: c.communityScore,
      });
    }
  }

  // depth 2: one more hop of curated
  if (depth >= 2 && classes.has("curated")) {
    const hop = [...neighborFilmIds].filter((id) => !filmIds.has(id));
    if (hop.length) {
      const more = await db
        .select()
        .from(connections)
        .where(
          and(
            eq(connections.status, "approved"),
            or(inArray(connections.sourceFilmId, hop), inArray(connections.targetFilmId, hop))
          )
        );
      for (const c of more) {
        neighborFilmIds.add(c.sourceFilmId);
        neighborFilmIds.add(c.targetFilmId);
        if (!edges.find((e) => e.id === c.id)) {
          edges.push({
            id: c.id,
            source: c.sourceFilmId,
            target: c.targetFilmId,
            edge_class: "curated",
            connection_type: c.connectionType,
            confidence_tier: c.confidenceTier,
            title: c.title,
            is_directed: c.isDirected,
            community_score: c.communityScore,
          });
        }
      }
    }
  }

  if (classes.has("derived")) {
    // same collection
    const memberships = await db
      .select()
      .from(collectionFilms)
      .where(inArray(collectionFilms.filmId, [...neighborFilmIds]));
    const byCollection = new Map<string, string[]>();
    for (const m of memberships) {
      const list = byCollection.get(m.collectionId) ?? [];
      list.push(m.filmId);
      byCollection.set(m.collectionId, list);
    }
    for (const [collectionId, ids] of byCollection) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          edges.push({
            id: `derived_col_${collectionId}_${ids[i]}_${ids[j]}`,
            source: ids[i],
            target: ids[j],
            edge_class: "derived",
            connection_type: "crew_lineage",
            title: "Same collection",
            is_directed: false,
          });
          neighborFilmIds.add(ids[i]);
          neighborFilmIds.add(ids[j]);
        }
      }
    }

    // shared director / DP / composer
    const crew = await db
      .select()
      .from(credits)
      .where(
        and(
          inArray(credits.filmId, [...neighborFilmIds]),
          inArray(credits.roleType, ["director", "cinematographer", "composer"])
        )
      );
    const byPerson = new Map<string, { role: string; films: string[] }>();
    for (const c of crew) {
      const key = `${c.personId}:${c.roleType}`;
      const entry = byPerson.get(key) ?? { role: c.roleType, films: [] };
      entry.films.push(c.filmId);
      byPerson.set(key, entry);
    }
    for (const [key, entry] of byPerson) {
      const ids = [...new Set(entry.films)];
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          edges.push({
            id: `derived_crew_${key}_${ids[i]}_${ids[j]}`,
            source: ids[i],
            target: ids[j],
            edge_class: "derived",
            connection_type: "crew_lineage",
            title: `Shared ${entry.role}`,
            is_directed: false,
          });
        }
      }
    }
  }

  if (classes.has("computed")) {
    const examples = await db
      .select()
      .from(preceptExamples)
      .where(
        and(
          eq(preceptExamples.status, "approved"),
          eq(preceptExamples.isCanonicalExample, true),
          inArray(preceptExamples.filmId, [...neighborFilmIds])
        )
      );
    const byPrecept = new Map<string, string[]>();
    // Also pull all canonical examples for precepts touched
    const preceptIds = [...new Set(examples.map((e) => e.preceptId))];
    const allCanon =
      preceptIds.length === 0
        ? []
        : await db
            .select()
            .from(preceptExamples)
            .where(
              and(
                eq(preceptExamples.status, "approved"),
                eq(preceptExamples.isCanonicalExample, true),
                inArray(preceptExamples.preceptId, preceptIds)
              )
            );
    for (const ex of allCanon) {
      const list = byPrecept.get(ex.preceptId) ?? [];
      list.push(ex.filmId);
      byPrecept.set(ex.preceptId, list);
      neighborFilmIds.add(ex.filmId);
    }
    for (const [preceptId, ids] of byPrecept) {
      const uniq = [...new Set(ids)];
      for (let i = 0; i < uniq.length; i++) {
        for (let j = i + 1; j < uniq.length; j++) {
          edges.push({
            id: `computed_precept_${preceptId}_${uniq[i]}_${uniq[j]}`,
            source: uniq[i],
            target: uniq[j],
            edge_class: "computed",
            connection_type: "shared_technique",
            title: "Shared canonical precept",
            is_directed: false,
          });
        }
      }
    }
  }

  const filmRows = await db
    .select()
    .from(films)
    .where(inArray(films.id, [...neighborFilmIds]));
  for (const f of filmRows) {
    nodes.set(f.id, {
      id: f.id,
      type: "film",
      slug: f.slug,
      label: f.title,
      sublabel: String(f.releaseYear),
      popularity_score: f.popularityScore,
      thumb: f.posterUrl,
    });
  }

  // Cap visible nodes by popularity
  let nodeList = [...nodes.values()].sort(
    (a, b) => (b.popularity_score ?? 0) - (a.popularity_score ?? 0)
  );
  if (nodeList.length > limit) {
    const kept = new Set(nodeList.slice(0, limit - 1).map((n) => n.id));
    // always keep center
    if (opts.centerType === "film") kept.add(opts.centerId);
    const collapsed = nodeList.filter((n) => !kept.has(n.id));
    nodeList = nodeList.filter((n) => kept.has(n.id));
    if (collapsed.length) {
      const clusterId = "cluster_more";
      nodeList.push({
        id: clusterId,
        type: "film",
        slug: "more",
        label: `+${collapsed.length} more`,
        popularity_score: 0,
      });
    }
    const keptEdges = edges.filter((e) => kept.has(e.source) && kept.has(e.target));
    return { nodes: nodeList, edges: keptEdges.slice(0, 500) };
  }

  return { nodes: nodeList, edges: edges.slice(0, 500) };
}

export { filmDto, personDto };
