export function filmDto(row: any) {
  return {
    id: row.id,
    slug: row.slug,
    tmdb_id: row.tmdbId,
    imdb_id: row.imdbId,
    title: row.title,
    original_title: row.originalTitle,
    release_year: row.releaseYear,
    release_date: row.releaseDate,
    runtime_minutes: row.runtimeMinutes,
    country: row.country,
    original_language: row.originalLanguage,
    genres: row.genres,
    synopsis: row.synopsis,
    poster_url: row.posterUrl,
    backdrop_url: row.backdropUrl,
    aspect_ratio: row.aspectRatio,
    color_format: row.colorFormat,
    popularity_score: row.popularityScore,
    connection_count: row.connectionCount,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function personDto(row: any) {
  return {
    id: row.id,
    slug: row.slug,
    tmdb_person_id: row.tmdbPersonId,
    name: row.name,
    also_known_as: row.alsoKnownAs,
    primary_department: row.primaryDepartment,
    birth_year: row.birthYear,
    death_year: row.deathYear,
    bio_snippet: row.bioSnippet,
    photo_url: row.photoUrl,
  };
}

export function placeDto(row: any) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    alt_names: row.altNames,
    address: row.address,
    locality: row.locality,
    region: row.region,
    country: row.country,
    lat: row.lat,
    lng: row.lng,
    geohash: row.geohash,
    place_kind: row.placeKind,
    still_extant: row.stillExtant,
    notes: row.notes,
    external_ids: row.externalIds,
    status: row.status,
  };
}

export function preceptDto(row: any) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    aliases: row.aliases,
    category: row.category,
    short_definition: row.shortDefinition,
    description: row.description,
    origin_claim: row.originClaim,
    popularized_by_film_ids: row.popularizedByFilmIds,
    status: row.status,
  };
}

export function connectionDto(row: any) {
  return {
    id: row.id,
    source_film_id: row.sourceFilmId,
    target_film_id: row.targetFilmId,
    is_directed: row.isDirected,
    connection_type: row.connectionType,
    confidence_tier: row.confidenceTier,
    title: row.title,
    rationale: row.rationale,
    source_anchor: row.sourceAnchor,
    target_anchor: row.targetAnchor,
    tags: row.tags,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    community_score: row.communityScore,
    status: row.status,
    created_by: row.createdBy,
    approved_by: row.approvedBy,
    approved_at: row.approvedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

export function evidenceDto(row: any) {
  return {
    id: row.id,
    target_type: row.targetType,
    target_id: row.targetId,
    evidence_type: row.evidenceType,
    url: row.url,
    citation_text: row.citationText,
    excerpt: row.excerpt,
    page_or_timestamp: row.pageOrTimestamp,
    submitted_by: row.submittedBy,
    created_at: row.createdAt,
  };
}

export function revisionDto(row: any) {
  return {
    id: row.id,
    target_type: row.targetType,
    target_id: row.targetId,
    revision_number: row.revisionNumber,
    diff: row.diff,
    suggestion_id: row.suggestionId,
    actor_id: row.actorId,
    created_at: row.createdAt,
  };
}
