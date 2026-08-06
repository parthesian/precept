/**
 * Deterministic seed generator — writes JSON under /seed.
 * Run: npx tsx packages/db/src/seed/generate.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../seed");

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type FilmSeed = {
  id: string;
  slug: string;
  title: string;
  release_year: number;
  runtime_minutes: number;
  country: string[];
  original_language: string;
  genres: string[];
  synopsis: string;
  popularity_score: number;
  color_format: "color" | "bw" | "mixed";
  tmdb_id?: number;
  is_seed_data: true;
};

const filmDefs: Array<Omit<FilmSeed, "id" | "slug" | "is_seed_data" | "synopsis"> & { synopsis?: string }> = [
  { title: "Battleship Potemkin", release_year: 1925, runtime_minutes: 75, country: ["SU"], original_language: "ru", genres: ["Drama", "History"], popularity_score: 78, color_format: "bw", tmdb_id: 643 },
  { title: "Man with a Movie Camera", release_year: 1929, runtime_minutes: 68, country: ["SU"], original_language: "ru", genres: ["Documentary"], popularity_score: 70, color_format: "bw", tmdb_id: 2224 },
  { title: "Citizen Kane", release_year: 1941, runtime_minutes: 119, country: ["US"], original_language: "en", genres: ["Drama", "Mystery"], popularity_score: 92, color_format: "bw", tmdb_id: 15 },
  { title: "Bicycle Thieves", release_year: 1948, runtime_minutes: 89, country: ["IT"], original_language: "it", genres: ["Drama"], popularity_score: 84, color_format: "bw", tmdb_id: 374 },
  { title: "Rashomon", release_year: 1950, runtime_minutes: 88, country: ["JP"], original_language: "ja", genres: ["Crime", "Drama"], popularity_score: 86, color_format: "bw", tmdb_id: 548 },
  { title: "Singin' in the Rain", release_year: 1952, runtime_minutes: 103, country: ["US"], original_language: "en", genres: ["Comedy", "Music"], popularity_score: 88, color_format: "color", tmdb_id: 872 },
  { title: "Tokyo Story", release_year: 1953, runtime_minutes: 136, country: ["JP"], original_language: "ja", genres: ["Drama"], popularity_score: 85, color_format: "bw", tmdb_id: 18148 },
  { title: "Seven Samurai", release_year: 1954, runtime_minutes: 207, country: ["JP"], original_language: "ja", genres: ["Action", "Drama"], popularity_score: 95, color_format: "bw", tmdb_id: 346 },
  { title: "Rear Window", release_year: 1954, runtime_minutes: 112, country: ["US"], original_language: "en", genres: ["Thriller", "Mystery"], popularity_score: 91, color_format: "color", tmdb_id: 567 },
  { title: "The Searchers", release_year: 1956, runtime_minutes: 119, country: ["US"], original_language: "en", genres: ["Western"], popularity_score: 82, color_format: "color", tmdb_id: 3114 },
  { title: "The Seventh Seal", release_year: 1957, runtime_minutes: 96, country: ["SE"], original_language: "sv", genres: ["Drama", "Fantasy"], popularity_score: 87, color_format: "bw", tmdb_id: 490 },
  { title: "Vertigo", release_year: 1958, runtime_minutes: 128, country: ["US"], original_language: "en", genres: ["Mystery", "Romance", "Thriller"], popularity_score: 94, color_format: "color", tmdb_id: 567 },
  { title: "North by Northwest", release_year: 1959, runtime_minutes: 136, country: ["US"], original_language: "en", genres: ["Adventure", "Thriller"], popularity_score: 90, color_format: "color", tmdb_id: 213 },
  { title: "Psycho", release_year: 1960, runtime_minutes: 109, country: ["US"], original_language: "en", genres: ["Horror", "Thriller"], popularity_score: 93, color_format: "bw", tmdb_id: 539 },
  { title: "Yojimbo", release_year: 1961, runtime_minutes: 110, country: ["JP"], original_language: "ja", genres: ["Action", "Drama"], popularity_score: 84, color_format: "bw", tmdb_id: 11878 },
  { title: "Lawrence of Arabia", release_year: 1962, runtime_minutes: 227, country: ["GB"], original_language: "en", genres: ["Adventure", "Drama", "History"], popularity_score: 89, color_format: "color", tmdb_id: 947 },
  { title: "8½", release_year: 1963, runtime_minutes: 138, country: ["IT"], original_language: "it", genres: ["Drama", "Fantasy"], popularity_score: 86, color_format: "bw", tmdb_id: 422 },
  { title: "Dr. Strangelove", release_year: 1964, runtime_minutes: 95, country: ["GB", "US"], original_language: "en", genres: ["Comedy", "War"], popularity_score: 88, color_format: "bw", tmdb_id: 935 },
  { title: "A Fistful of Dollars", release_year: 1964, runtime_minutes: 99, country: ["IT", "ES", "DE"], original_language: "it", genres: ["Western"], popularity_score: 83, color_format: "color", tmdb_id: 935 },
  { title: "The Good, the Bad and the Ugly", release_year: 1966, runtime_minutes: 161, country: ["IT", "ES", "DE"], original_language: "it", genres: ["Western"], popularity_score: 92, color_format: "color", tmdb_id: 429 },
  { title: "2001: A Space Odyssey", release_year: 1968, runtime_minutes: 149, country: ["GB", "US"], original_language: "en", genres: ["Science Fiction"], popularity_score: 96, color_format: "color", tmdb_id: 62 },
  { title: "Once Upon a Time in the West", release_year: 1968, runtime_minutes: 165, country: ["IT", "US"], original_language: "it", genres: ["Western"], popularity_score: 88, color_format: "color", tmdb_id: 335 },
  { title: "A Clockwork Orange", release_year: 1971, runtime_minutes: 136, country: ["GB", "US"], original_language: "en", genres: ["Crime", "Science Fiction"], popularity_score: 90, color_format: "color", tmdb_id: 185 },
  { title: "The Godfather", release_year: 1972, runtime_minutes: 175, country: ["US"], original_language: "en", genres: ["Crime", "Drama"], popularity_score: 98, color_format: "color", tmdb_id: 238 },
  { title: "Chinatown", release_year: 1974, runtime_minutes: 130, country: ["US"], original_language: "en", genres: ["Crime", "Drama", "Mystery"], popularity_score: 89, color_format: "color", tmdb_id: 829 },
  { title: "The Conversation", release_year: 1974, runtime_minutes: 113, country: ["US"], original_language: "en", genres: ["Drama", "Thriller"], popularity_score: 80, color_format: "color", tmdb_id: 945 },
  { title: "Jaws", release_year: 1975, runtime_minutes: 124, country: ["US"], original_language: "en", genres: ["Adventure", "Thriller"], popularity_score: 91, color_format: "color", tmdb_id: 578 },
  { title: "Taxi Driver", release_year: 1976, runtime_minutes: 114, country: ["US"], original_language: "en", genres: ["Crime", "Drama"], popularity_score: 92, color_format: "color", tmdb_id: 103 },
  { title: "Star Wars", release_year: 1977, runtime_minutes: 121, country: ["US"], original_language: "en", genres: ["Adventure", "Science Fiction"], popularity_score: 99, color_format: "color", tmdb_id: 11 },
  { title: "Apocalypse Now", release_year: 1979, runtime_minutes: 153, country: ["US"], original_language: "en", genres: ["War", "Drama"], popularity_score: 93, color_format: "color", tmdb_id: 28 },
  { title: "The Shining", release_year: 1980, runtime_minutes: 146, country: ["GB", "US"], original_language: "en", genres: ["Horror"], popularity_score: 94, color_format: "color", tmdb_id: 694 },
  { title: "Raging Bull", release_year: 1980, runtime_minutes: 129, country: ["US"], original_language: "en", genres: ["Drama"], popularity_score: 85, color_format: "bw", tmdb_id: 1578 },
  { title: "Blade Runner", release_year: 1982, runtime_minutes: 117, country: ["US"], original_language: "en", genres: ["Science Fiction", "Thriller"], popularity_score: 95, color_format: "color", tmdb_id: 78 },
  { title: "The Untouchables", release_year: 1987, runtime_minutes: 119, country: ["US"], original_language: "en", genres: ["Crime", "Drama", "History"], popularity_score: 81, color_format: "color", tmdb_id: 11778 },
  { title: "Goodfellas", release_year: 1990, runtime_minutes: 145, country: ["US"], original_language: "en", genres: ["Crime", "Drama"], popularity_score: 94, color_format: "color", tmdb_id: 769 },
  { title: "Se7en", release_year: 1995, runtime_minutes: 127, country: ["US"], original_language: "en", genres: ["Crime", "Mystery", "Thriller"], popularity_score: 93, color_format: "color", tmdb_id: 807 },
  { title: "Heat", release_year: 1995, runtime_minutes: 170, country: ["US"], original_language: "en", genres: ["Action", "Crime", "Drama"], popularity_score: 90, color_format: "color", tmdb_id: 949 },
  { title: "The Matrix", release_year: 1999, runtime_minutes: 136, country: ["US"], original_language: "en", genres: ["Action", "Science Fiction"], popularity_score: 97, color_format: "color", tmdb_id: 603 },
  { title: "Mulholland Drive", release_year: 2001, runtime_minutes: 147, country: ["US", "FR"], original_language: "en", genres: ["Drama", "Mystery", "Thriller"], popularity_score: 88, color_format: "color", tmdb_id: 1018 },
  { title: "The Dark Knight", release_year: 2008, runtime_minutes: 152, country: ["US", "GB"], original_language: "en", genres: ["Action", "Crime", "Drama"], popularity_score: 100, color_format: "color", tmdb_id: 155 },
  { title: "Inception", release_year: 2010, runtime_minutes: 148, country: ["US", "GB"], original_language: "en", genres: ["Action", "Science Fiction", "Adventure"], popularity_score: 98, color_format: "color", tmdb_id: 27205 },
  { title: "Drive", release_year: 2011, runtime_minutes: 100, country: ["US"], original_language: "en", genres: ["Crime", "Drama"], popularity_score: 86, color_format: "color", tmdb_id: 64690 },
];

// Fix duplicate tmdb ids in defs - Vertigo should be 1958 film id 567 is Rear Window in TMDB... use unique fake-ish ids where clash
const tmdbOverrides: Record<string, number> = {
  Vertigo: 1949,
  "A Fistful of Dollars": 1157,
};

const films: FilmSeed[] = filmDefs.map((f) => {
  const slug = slugify(f.title);
  return {
    ...f,
    tmdb_id: tmdbOverrides[f.title] ?? f.tmdb_id,
    id: `film_${slug.replace(/-/g, "_")}`,
    slug,
    synopsis:
      f.synopsis ??
      `${f.title} (${f.release_year}) — seed fixture used to densify the influence graph neighborhood.`,
    is_seed_data: true as const,
  };
});

const filmByTitle = Object.fromEntries(films.map((f) => [f.title, f]));

const peopleDefs = [
  ["Sergei Eisenstein", "Directing", 1898, 1948],
  ["Dziga Vertov", "Directing", 1896, 1954],
  ["Orson Welles", "Directing", 1915, 1985],
  ["Akira Kurosawa", "Directing", 1910, 1998],
  ["Alfred Hitchcock", "Directing", 1899, 1980],
  ["John Ford", "Directing", 1894, 1973],
  ["Ingmar Bergman", "Directing", 1918, 2007],
  ["Sergio Leone", "Directing", 1929, 1989],
  ["Stanley Kubrick", "Directing", 1928, 1999],
  ["Francis Ford Coppola", "Directing", 1939, null],
  ["Martin Scorsese", "Directing", 1942, null],
  ["Ridley Scott", "Directing", 1937, null],
  ["Brian De Palma", "Directing", 1940, null],
  ["Christopher Nolan", "Directing", 1970, null],
  ["David Fincher", "Directing", 1962, null],
  ["Wong Kar-wai", "Directing", 1958, null],
  ["Gregg Toland", "Camera", 1904, 1948],
  ["Robert Burks", "Camera", 1909, 1968],
  ["Vittorio Storaro", "Camera", 1940, null],
  ["Gordon Willis", "Camera", 1931, 2014],
  ["Wally Pfister", "Camera", 1961, null],
  ["Ennio Morricone", "Sound", 1928, 2020],
  ["Bernard Herrmann", "Sound", 1911, 1975],
  ["Hans Zimmer", "Sound", 1957, null],
] as const;

const people = peopleDefs.map(([name, dept, birth, death]) => ({
  id: `person_${slugify(name).replace(/-/g, "_")}`,
  slug: slugify(name),
  name,
  also_known_as: [],
  primary_department: dept,
  birth_year: birth,
  death_year: death,
  bio_snippet: `${name} — seed person fixture.`,
  photo_url: null,
  is_seed_data: true as const,
}));

const personByName = Object.fromEntries(people.map((p) => [p.name, p]));

const creditPairs: Array<[string, string, string]> = [
  ["Sergei Eisenstein", "Battleship Potemkin", "director"],
  ["Dziga Vertov", "Man with a Movie Camera", "director"],
  ["Orson Welles", "Citizen Kane", "director"],
  ["Gregg Toland", "Citizen Kane", "cinematographer"],
  ["Akira Kurosawa", "Rashomon", "director"],
  ["Akira Kurosawa", "Seven Samurai", "director"],
  ["Akira Kurosawa", "Yojimbo", "director"],
  ["Alfred Hitchcock", "Rear Window", "director"],
  ["Alfred Hitchcock", "Vertigo", "director"],
  ["Alfred Hitchcock", "North by Northwest", "director"],
  ["Alfred Hitchcock", "Psycho", "director"],
  ["Robert Burks", "Vertigo", "cinematographer"],
  ["Robert Burks", "Rear Window", "cinematographer"],
  ["Bernard Herrmann", "Vertigo", "composer"],
  ["Bernard Herrmann", "Psycho", "composer"],
  ["Bernard Herrmann", "Citizen Kane", "composer"],
  ["John Ford", "The Searchers", "director"],
  ["Ingmar Bergman", "The Seventh Seal", "director"],
  ["Sergio Leone", "A Fistful of Dollars", "director"],
  ["Sergio Leone", "The Good, the Bad and the Ugly", "director"],
  ["Sergio Leone", "Once Upon a Time in the West", "director"],
  ["Ennio Morricone", "The Good, the Bad and the Ugly", "composer"],
  ["Ennio Morricone", "Once Upon a Time in the West", "composer"],
  ["Stanley Kubrick", "Dr. Strangelove", "director"],
  ["Stanley Kubrick", "2001: A Space Odyssey", "director"],
  ["Stanley Kubrick", "A Clockwork Orange", "director"],
  ["Stanley Kubrick", "The Shining", "director"],
  ["Francis Ford Coppola", "The Godfather", "director"],
  ["Francis Ford Coppola", "The Conversation", "director"],
  ["Francis Ford Coppola", "Apocalypse Now", "director"],
  ["Gordon Willis", "The Godfather", "cinematographer"],
  ["Vittorio Storaro", "Apocalypse Now", "cinematographer"],
  ["Martin Scorsese", "Taxi Driver", "director"],
  ["Martin Scorsese", "Raging Bull", "director"],
  ["Martin Scorsese", "Goodfellas", "director"],
  ["Ridley Scott", "Blade Runner", "director"],
  ["Brian De Palma", "The Untouchables", "director"],
  ["David Fincher", "Se7en", "director"],
  ["Christopher Nolan", "The Dark Knight", "director"],
  ["Christopher Nolan", "Inception", "director"],
  ["Wally Pfister", "The Dark Knight", "cinematographer"],
  ["Wally Pfister", "Inception", "cinematographer"],
  ["Hans Zimmer", "The Dark Knight", "composer"],
  ["Hans Zimmer", "Inception", "composer"],
];

const credits = creditPairs.map(([person, film, role], i) => ({
  id: `credit_${i + 1}`,
  person_id: personByName[person].id,
  film_id: filmByTitle[film].id,
  role_type: role,
  character_name: null,
  billing_order: i + 1,
  department: role === "director" ? "Directing" : role === "cinematographer" ? "Camera" : "Sound",
  is_seed_data: true as const,
}));

const connectionTypes = [
  "homage",
  "shot_for_shot_quotation",
  "visual_motif",
  "shared_technique",
  "subversion_parody",
  "narrative_structure",
  "remake_adaptation",
  "audiovisual_parallel",
  "stated_influence",
  "crew_lineage",
  "soundtrack_reference",
] as const;

const tiers = ["confirmed", "highly_likely", "proposed", "ai_suggested"] as const;

const edgeSpecs: Array<[string, string, string, string]> = [
  ["The Untouchables", "Battleship Potemkin", "shot_for_shot_quotation", "Odessa Steps quotation in the station shootout"],
  ["The Dark Knight", "Heat", "homage", "Criminal crew professionalism and downtown shootout grammar"],
  ["The Dark Knight", "Blade Runner", "visual_motif", "Rain-slick nocturne and urban dread"],
  ["Inception", "2001: A Space Odyssey", "visual_motif", "Corridor/liminal space as psychological architecture"],
  ["Inception", "Blade Runner", "stated_influence", "Nolan on Scott's world-building density"],
  ["A Fistful of Dollars", "Yojimbo", "remake_adaptation", "Leone's western remake of Kurosawa's ronin tale"],
  ["Star Wars", "The Hidden Fortress", "stated_influence", "Lucas cites Kurosawa structure"], // fix - we don't have Hidden Fortress
  ["Star Wars", "Seven Samurai", "narrative_structure", "Ragtag team assembly before the raid"],
  ["The Magnificent Seven", "Seven Samurai", "remake_adaptation", "Hollywood remake"], // may not have Magnificent Seven
  ["Psycho", "Battleship Potemkin", "shared_technique", "Montage shock cutting in violence"],
  ["Goodfellas", "The Godfather", "crew_lineage", "Post-Godfather American crime epic lineage"],
  ["Apocalypse Now", "2001: A Space Odyssey", "audiovisual_parallel", "Helicopter Ride of the Valkyries vs classical needle drops in void"],
  ["The Shining", "Vertigo", "visual_motif", "Impossible architecture and spiraling dread"],
  ["Mulholland Drive", "Vertigo", "homage", "Identity doubles and Los Angeles dream logic"],
  ["Blade Runner", "Metropolis", "homage", "Future city vertical class structure"], // no Metropolis
  ["Se7en", "Psycho", "visual_motif", "Rain, guilt, and abrupt moral freefall"],
  ["Taxi Driver", "The Searchers", "narrative_structure", "Scorsese on Ford's obsessive rescuer"],
  ["Raging Bull", "Citizen Kane", "shared_technique", "Expressionist B&W interiors"],
  ["Chinatown", "The Maltese Falcon", "genre_convention", "Hardboiled detective corruption"], // skip genre - use narrative
  ["Drive", "Taxi Driver", "homage", "Lonely night driver as urban knight"],
  ["The Matrix", "Blade Runner", "visual_motif", "Neon noir and ontological doubt"],
  ["North by Northwest", "The Matrix", "shared_technique", "Suspended body / impossible spatial gags"],
  ["Once Upon a Time in the West", "The Searchers", "homage", "Monument Valley myth revision"],
  ["The Good, the Bad and the Ugly", "Yojimbo", "stated_influence", "Leone on Kurosawa's triangulation"],
  ["A Clockwork Orange", "Battleship Potemkin", "subversion_parody", "Stylized violence as political montage"],
  ["Citizen Kane", "The Godfather", "shared_technique", "Deep-focus dynasty rooms (Willis after Toland)"],
  ["Rear Window", "Disturbia", "remake_adaptation", "Suburban voyeur update"], // no Disturbia
  ["Vertigo", "Obsession", "homage", "De Palma's reconstruction"], // no Obsession
  ["The Conversation", "Blow-Up", "narrative_structure", "Perception vs recorded evidence"], // no Blow-Up
  ["Jaws", "Psycho", "stated_influence", "Spielberg on Hitchcock suspense economy"],
];

// Filter edges to films we have; generate more programmatically
const validEdges: Array<{
  id: string;
  source_film_id: string;
  target_film_id: string;
  is_directed: boolean;
  connection_type: (typeof connectionTypes)[number];
  confidence_tier: (typeof tiers)[number];
  title: string;
  rationale: string;
  source_anchor: { timecode_start: string; timecode_end: string; shot_description: string; frame_ref: null };
  target_anchor: { timecode_start: string; timecode_end: string; shot_description: string; frame_ref: null };
  tags: string[];
  upvotes: number;
  downvotes: number;
  community_score: number;
  status: "approved";
  created_by: string;
  approved_by: string;
  is_seed_data: true;
}> = [];

const adminId = "user_admin";

function addEdge(
  sourceTitle: string,
  targetTitle: string,
  type: (typeof connectionTypes)[number],
  title: string,
  tier: (typeof tiers)[number],
  directed = true
) {
  const source = filmByTitle[sourceTitle];
  const target = filmByTitle[targetTitle];
  if (!source || !target) return;
  if (source.id === target.id) return;
  const id = `conn_${validEdges.length + 1}`;
  validEdges.push({
    id,
    source_film_id: source.id,
    target_film_id: target.id,
    is_directed: directed,
    connection_type: type,
    confidence_tier: tier,
    title,
    rationale: `${title}. Seeded rationale linking ${sourceTitle} and ${targetTitle}.`,
    source_anchor: {
      timecode_start: "00:12:00",
      timecode_end: "00:12:45",
      shot_description: `Key moment in ${sourceTitle}`,
      frame_ref: null,
    },
    target_anchor: {
      timecode_start: "00:08:10",
      timecode_end: "00:08:40",
      shot_description: `Referenced moment in ${targetTitle}`,
      frame_ref: null,
    },
    tags: [type, tier],
    upvotes: tier === "confirmed" ? 12 : tier === "highly_likely" ? 7 : 2,
    downvotes: tier === "ai_suggested" ? 3 : 0,
    community_score: tier === "confirmed" ? 12 : tier === "highly_likely" ? 7 : tier === "proposed" ? 2 : -1,
    status: "approved",
    created_by: adminId,
    approved_by: adminId,
    is_seed_data: true,
  });
}

const curatedPairs: Array<[string, string, (typeof connectionTypes)[number], string, (typeof tiers)[number]]> = [
  ["The Untouchables", "Battleship Potemkin", "shot_for_shot_quotation", "Odessa Steps station shootout", "confirmed"],
  ["The Dark Knight", "Heat", "homage", "Downtown professionalism", "confirmed"],
  ["The Dark Knight", "Blade Runner", "visual_motif", "Nocturnal city weather", "highly_likely"],
  ["Inception", "2001: A Space Odyssey", "visual_motif", "Corridor liminality", "highly_likely"],
  ["Inception", "Blade Runner", "stated_influence", "World-building density", "confirmed"],
  ["A Fistful of Dollars", "Yojimbo", "remake_adaptation", "Ronin-to-gunfighter remake", "confirmed"],
  ["Star Wars", "Seven Samurai", "narrative_structure", "Team assembly before raid", "confirmed"],
  ["Psycho", "Battleship Potemkin", "shared_technique", "Shock montage", "proposed"],
  ["Goodfellas", "The Godfather", "crew_lineage", "American crime epic lineage", "highly_likely"],
  ["Apocalypse Now", "2001: A Space Odyssey", "audiovisual_parallel", "Classical music against machinery", "proposed"],
  ["The Shining", "Vertigo", "visual_motif", "Spiral architecture of dread", "highly_likely"],
  ["Mulholland Drive", "Vertigo", "homage", "Identity doubles", "confirmed"],
  ["Se7en", "Psycho", "visual_motif", "Rain and moral freefall", "proposed"],
  ["Taxi Driver", "The Searchers", "narrative_structure", "Obsessive rescuer", "confirmed"],
  ["Raging Bull", "Citizen Kane", "shared_technique", "Expressionist B&W rooms", "highly_likely"],
  ["Drive", "Taxi Driver", "homage", "Night driver knight", "highly_likely"],
  ["The Matrix", "Blade Runner", "visual_motif", "Neon noir ontology", "confirmed"],
  ["Once Upon a Time in the West", "The Searchers", "homage", "Monument myth revision", "proposed"],
  ["The Good, the Bad and the Ugly", "Yojimbo", "stated_influence", "Triangulation of antiheroes", "confirmed"],
  ["A Clockwork Orange", "Battleship Potemkin", "subversion_parody", "Political stylized violence", "proposed"],
  ["Citizen Kane", "The Godfather", "shared_technique", "Deep-focus dynasty", "highly_likely"],
  ["Jaws", "Psycho", "stated_influence", "Suspense economy", "confirmed"],
  ["Blade Runner", "2001: A Space Odyssey", "visual_motif", "Corporate future spaces", "highly_likely"],
  ["The Conversation", "Blow Out", "narrative_structure", "Recording as unreliable witness"], // Blow Out missing
  ["Heat", "The Godfather", "narrative_structure", "Crime as workplace"],
  ["Inception", "The Matrix", "shared_technique", "Rules of a constructed world", "highly_likely"],
  ["The Dark Knight", "Fritz Lang", "homage", "x"], // bad
];

for (const row of curatedPairs) {
  if (row.length < 5) continue;
  const [a, b, type, title, tier] = row as [
    string,
    string,
    (typeof connectionTypes)[number],
    string,
    (typeof tiers)[number],
  ];
  addEdge(a, b, type, title, tier);
}

// Densify: connect each film to several others
const titles = films.map((f) => f.title);
for (let i = 0; i < titles.length; i++) {
  for (let k = 1; k <= 3; k++) {
    const j = (i + k * 5) % titles.length;
    if (i === j) continue;
    const type = connectionTypes[(i + k) % connectionTypes.length];
    const tier = tiers[(i + k) % tiers.length];
    addEdge(
      titles[i],
      titles[j],
      type,
      `${type.replace(/_/g, " ")} link`,
      tier,
      k !== 2
    );
  }
}

// Ensure ~150
while (validEdges.length < 150) {
  const i = validEdges.length % titles.length;
  const j = (i + 7 + validEdges.length) % titles.length;
  addEdge(
    titles[i],
    titles[j],
    connectionTypes[validEdges.length % connectionTypes.length],
    `Dense neighborhood edge ${validEdges.length + 1}`,
    tiers[validEdges.length % tiers.length]
  );
}

const evidence = validEdges.flatMap((e, idx) => {
  if (e.confidence_tier === "ai_suggested") return [];
  const items = [
    {
      id: `ev_${idx + 1}a`,
      target_type: "connection",
      target_id: e.id,
      evidence_type:
        e.confidence_tier === "confirmed"
          ? (["interview", "commentary", "book", "article"] as const)[idx % 4]
          : "video_essay",
      url: "https://example.com/seed-citation",
      citation_text: `Seed citation for ${e.title}`,
      excerpt: "Short excerpt under fifteen words total here.",
      page_or_timestamp: "p. 42",
      submitted_by: adminId,
      is_seed_data: true as const,
    },
  ];
  return items;
});

const places = [
  ["Grand Central Terminal", "New York", "NY", "US", 40.7527, -73.9772, "landmark"],
  ["Chicago Loop", "Chicago", "IL", "US", 41.8825, -87.6441, "neighborhood"],
  ["Gotham City (fictional)", "Gotham", null, "US", 40.758, -73.9855, "region"],
  ["Monument Valley", "Oljato-Monument Valley", "UT", "US", 36.9983, -110.0985, "natural"],
  ["Trona Pinnacles", "Trona", "CA", "US", 35.6166, -117.3709, "natural"],
  ["Stanley Hotel", "Estes Park", "CO", "US", 40.383, -105.51, "building"],
  ["Elstree Studios", "Borehamwood", null, "GB", 51.658, -0.269, "studio_backlot"],
  ["Pinewood Studios", "Iver Heath", null, "GB", 51.548, -0.535, "studio_backlot"],
  ["Bradbury Building", "Los Angeles", "CA", "US", 34.0507, -118.247, "building"],
  ["Million Dollar Theater", "Los Angeles", "CA", "US", 34.0509, -118.2456, "building"],
  ["Tokyo streets (Ginza)", "Tokyo", null, "JP", 35.6717, 139.765, "neighborhood"],
  ["Mount Fuji viewpoint", "Fujikawaguchiko", null, "JP", 35.498, 138.758, "natural"],
  ["Cinecittà", "Rome", null, "IT", 41.851, 12.577, "studio_backlot"],
  ["Almería Desert", "Almería", null, "ES", 37.0, -2.2, "natural"],
  ["Griffith Observatory", "Los Angeles", "CA", "US", 34.1184, -118.3004, "landmark"],
  ["Queensboro Bridge", "New York", "NY", "US", 40.757, -73.954, "landmark"],
  ["Lower Wacker Drive", "Chicago", "IL", "US", 41.886, -87.63, "street"],
  ["Cardington Sheds", "Bedford", null, "GB", 52.108, -0.426, "building"],
  ["Shepperton Studios", "Shepperton", null, "GB", 51.391, -0.447, "studio_backlot"],
  ["Angeles Crest Forest", "Los Angeles", "CA", "US", 34.28, -118.1, "natural"],
  ["Times Square", "New York", "NY", "US", 40.758, -73.9855, "street"],
  ["Venice Canals", "Los Angeles", "CA", "US", 33.987, -118.466, "neighborhood"],
  ["Docklands", "London", null, "GB", 51.505, -0.02, "neighborhood"],
  ["Prague streets", "Prague", null, "CZ", 50.087, 14.421, "neighborhood"],
  ["Dubrovnik walls", "Dubrovnik", null, "HR", 42.64, 18.11, "landmark"],
  ["Svalbard glacier", "Longyearbyen", null, "NO", 78.22, 15.65, "natural"],
  ["Hong Kong harbor", "Hong Kong", null, "HK", 22.29, 114.17, "region"],
  ["Paris Métro", "Paris", null, "FR", 48.8566, 2.3522, "building"],
  ["Vienna sewers", "Vienna", null, "AT", 48.208, 16.373, "building"],
  ["Madrid backlot streets", "Madrid", null, "ES", 40.4168, -3.7038, "studio_backlot"],
  ["Detroit Michigan Central", "Detroit", "MI", "US", 42.331, -83.077, "building"],
  ["San Francisco Fort Point", "San Francisco", "CA", "US", 37.8106, -122.477, "landmark"],
  ["Mission San Juan Bautista", "San Juan Bautista", "CA", "US", 36.845, -121.536, "building"],
  ["Bates Motel set", "Universal City", "CA", "US", 34.1381, -118.3534, "studio_backlot"],
  ["Odessa Steps", "Odesa", null, "UA", 46.488, 30.741, "landmark"],
].map(([name, locality, region, country, lat, lng, kind]) => ({
  id: `place_${slugify(String(name)).replace(/-/g, "_")}`,
  slug: slugify(String(name)),
  name,
  alt_names: [],
  address: null,
  locality,
  region,
  country,
  lat,
  lng,
  geohash: null,
  place_kind: kind,
  still_extant: true,
  notes: "Seed place",
  external_ids: {},
  status: "approved",
  created_by: adminId,
  approved_by: adminId,
  is_seed_data: true as const,
}));

const placeByName = Object.fromEntries(places.map((p) => [p.name, p]));

const locationDefs: Array<[string, string, "filmed_at" | "set_in" | "both", string | null]> = [
  ["The Untouchables", "Chicago Loop", "filmed_at", "Gotham City (fictional)"], // wrong doubling - use gotham for TDK
  ["The Dark Knight", "Chicago Loop", "filmed_at", "Gotham City (fictional)"],
  ["The Dark Knight", "Lower Wacker Drive", "filmed_at", "Gotham City (fictional)"],
  ["The Dark Knight", "Cardington Sheds", "filmed_at", null],
  ["Inception", "Paris Métro", "filmed_at", null],
  ["Inception", "Tokyo streets (Ginza)", "filmed_at", null],
  ["Blade Runner", "Bradbury Building", "filmed_at", null],
  ["Blade Runner", "Million Dollar Theater", "filmed_at", null],
  ["Vertigo", "San Francisco Fort Point", "filmed_at", null],
  ["Vertigo", "Mission San Juan Bautista", "filmed_at", null],
  ["Psycho", "Bates Motel set", "filmed_at", null],
  ["The Shining", "Stanley Hotel", "filmed_at", null], // exteriors inspiration
  ["The Searchers", "Monument Valley", "both", null],
  ["Once Upon a Time in the West", "Monument Valley", "filmed_at", null],
  ["The Good, the Bad and the Ugly", "Almería Desert", "filmed_at", null],
  ["A Fistful of Dollars", "Almería Desert", "filmed_at", null],
  ["Star Wars", "Elstree Studios", "filmed_at", null],
  ["Star Wars", "Trona Pinnacles", "filmed_at", null],
  ["2001: A Space Odyssey", "Shepperton Studios", "filmed_at", null],
  ["Apocalypse Now", "Angeles Crest Forest", "filmed_at", null],
  ["Taxi Driver", "Times Square", "filmed_at", null],
  ["Taxi Driver", "Queensboro Bridge", "filmed_at", null],
  ["Goodfellas", "Queensboro Bridge", "filmed_at", null],
  ["Citizen Kane", "Shepperton Studios", "filmed_at", null],
  ["Battleship Potemkin", "Odessa Steps", "both", null],
  ["Heat", "Los Angeles", "filmed_at", null], // need LA place - use Downtown via Griffith
  ["Heat", "Griffith Observatory", "filmed_at", null],
  ["Drive", "Los Angeles", "filmed_at", null],
  ["Drive", "Venice Canals", "filmed_at", null],
  ["Mulholland Drive", "Griffith Observatory", "filmed_at", null],
  ["Se7en", "Los Angeles", "filmed_at", "Gotham City (fictional)"], // rainy city doubling-ish
  ["The Matrix", "Sydney", "filmed_at", null],
  ["North by Northwest", "Chicago Loop", "filmed_at", null],
  ["The Godfather", "New York", "filmed_at", null],
  ["The Godfather", "Times Square", "filmed_at", null],
  ["Raging Bull", "Times Square", "filmed_at", null],
  ["Lawrence of Arabia", "Almería Desert", "filmed_at", null],
  ["Seven Samurai", "Mount Fuji viewpoint", "filmed_at", null],
  ["Yojimbo", "Mount Fuji viewpoint", "filmed_at", null],
  ["Tokyo Story", "Tokyo streets (Ginza)", "filmed_at", null],
  ["8½", "Cinecittà", "filmed_at", null],
  ["The Conversation", "San Francisco Fort Point", "filmed_at", null],
  ["Jaws", "Martha's Vineyard", "filmed_at", null],
  ["Inception", "Docklands", "filmed_at", null],
  ["The Dark Knight", "Hong Kong harbor", "filmed_at", "Gotham City (fictional)"],
  ["Blade Runner", "Vienna sewers", "set_in", null],
  ["Metropolis double", "Prague streets", "filmed_at", "Gotham City (fictional)"],
];

// Fix invalid film/place names
const filmLocations = [];
let locI = 0;
for (const [filmTitle, placeName, rel, doubling] of locationDefs) {
  const film = filmByTitle[filmTitle];
  const place = placeByName[placeName];
  if (!film || !place) continue;
  locI++;
  filmLocations.push({
    id: `floc_${locI}`,
    film_id: film.id,
    place_id: place.id,
    relationship: rel,
    scene_description: `${filmTitle} at ${placeName}`,
    timecode_start: "00:20:00",
    timecode_end: "00:21:00",
    is_doubling_for: doubling && placeByName[doubling] ? placeByName[doubling].id : null,
    upvotes: 3,
    downvotes: 0,
    community_score: 3,
    status: "approved",
    created_by: adminId,
    approved_by: adminId,
    is_seed_data: true as const,
  });
}

// Pad locations to ~60
const placeList = places;
while (filmLocations.length < 60) {
  const film = films[filmLocations.length % films.length];
  const place = placeList[filmLocations.length % placeList.length];
  filmLocations.push({
    id: `floc_${filmLocations.length + 1}`,
    film_id: film.id,
    place_id: place.id,
    relationship: filmLocations.length % 3 === 0 ? "set_in" : "filmed_at",
    scene_description: `Seed location ${filmLocations.length + 1}`,
    timecode_start: "00:10:00",
    timecode_end: "00:11:00",
    is_doubling_for: filmLocations.length % 11 === 0 ? placeByName["Gotham City (fictional)"].id : null,
    upvotes: 1,
    downvotes: 0,
    community_score: 1,
    status: "approved",
    created_by: adminId,
    approved_by: adminId,
    is_seed_data: true as const,
  });
}

const preceptDefs = [
  ["Dutch Angle", "shot_type", "A tilted camera frame that signals unease or instability."],
  ["Match Cut", "editing", "A cut that links shots through graphic or conceptual similarity."],
  ["Smash Cut", "editing", "An abrupt cut used for shock or comic rupture."],
  ["POV Shot", "shot_type", "A shot optically aligned with a character's gaze."],
  ["Insert Shot", "shot_type", "A close detail cutaway that clarifies action or motif."],
  ["Tracking Shot", "camera_movement", "Camera moves through space with the action."],
  ["Dolly Zoom", "camera_movement", "Simultaneous dolly and zoom creating spatial vertigo."],
  ["Rack Focus", "lens_optics", "Focus pull that shifts attention between planes."],
  ["Deep Focus", "lens_optics", "Multiple depth planes remain sharp simultaneously."],
  ["Chiaroscuro Lighting", "lighting", "High-contrast light and shadow modeling."],
  ["Practical Lighting", "lighting", "Scene lit primarily by visible on-set sources."],
  ["Motivated Lighting", "lighting", "Light justified by a diegetic source even if augmented."],
  ["Cross Cutting", "editing", "Alternating lines of action to build simultaneity."],
  ["Jump Cut", "editing", "An elliptical cut within a continuous shot axis."],
  ["Sound Bridge", "sound_audiovisual", "Audio from one scene overlaps the next image."],
  ["Mickey Mousing", "sound_audiovisual", "Music tightly mirrors on-screen action."],
  ["Needle Drop", "sound_audiovisual", "Pre-existing song placed as a dramatic accent."],
  ["Teal and Orange", "color", "Complementary grade emphasizing skin against cyan shadows."],
  ["Monochrome Motif", "color", "Restricted palette used as thematic signature."],
  ["Blocking for Depth", "staging_blocking", "Staging actors across depth planes for power dynamics."],
  ["Planimetric Staging", "staging_blocking", "Action arranged parallel to the camera plane."],
  ["Unreliable Narration", "narrative_device", "Storytelling that withholds or distorts truth."],
  ["Frame Story", "narrative_device", "A narrative enclosure that contains another tale."],
  ["MacGuffin", "narrative_device", "An object that motivates pursuit more than meaning."],
  ["Final Girl", "genre_convention", "Last surviving woman confronting the threat."],
  ["Mexican Standoff", "genre_convention", "Multi-party aimed weapons in suspended deadlock."],
  ["Bullet Time", "vfx", "Extremely slowed action suggesting virtual camera orbit."],
  ["Miniature Effects", "vfx", "Physical scale models photographed as full-size worlds."],
  ["Split Diopter", "lens_optics", "Optic allowing two focus planes in one frame."],
  ["God's Eye View", "shot_type", "Directly overhead angle that abstracts the scene."],
];

const precepts = preceptDefs.map(([name, category, def]) => ({
  id: `precept_${slugify(name).replace(/-/g, "_")}`,
  slug: slugify(name),
  name,
  aliases: [],
  category,
  short_definition: def,
  description: `${def} Extended seed description for ${name}.`,
  origin_claim: {
    film_id: filmByTitle["Vertigo"].id,
    year: 1958,
    note: "Popular association in seed data; not a rigorous first-use claim.",
    is_disputed: name === "Dutch Angle",
  },
  popularized_by_film_ids: [filmByTitle["Vertigo"].id, filmByTitle["Psycho"].id],
  status: "approved",
  created_by: adminId,
  approved_by: adminId,
  is_seed_data: true as const,
}));

const preceptRelations = [
  ["Dutch Angle", "God's Eye View", "see_also"],
  ["Match Cut", "Smash Cut", "opposite_of"],
  ["Tracking Shot", "Dolly Zoom", "commonly_paired_with"],
  ["Deep Focus", "Split Diopter", "see_also"],
  ["Deep Focus", "Rack Focus", "opposite_of"],
  ["Chiaroscuro Lighting", "Practical Lighting", "commonly_paired_with"],
  ["Cross Cutting", "Jump Cut", "see_also"],
  ["Sound Bridge", "Needle Drop", "see_also"],
  ["POV Shot", "Insert Shot", "commonly_paired_with"],
  ["Bullet Time", "Tracking Shot", "broader"],
].map(([a, b, type], i) => ({
  id: `prel_${i + 1}`,
  source_precept_id: precepts.find((p) => p.name === a)!.id,
  target_precept_id: precepts.find((p) => p.name === b)!.id,
  relation_type: type,
  status: "approved",
  created_by: adminId,
  approved_by: adminId,
  is_seed_data: true as const,
}));

const preceptExamples = [];
for (let i = 0; i < precepts.length; i++) {
  const precept = precepts[i];
  const filmA = films[i % films.length];
  const filmB = films[(i + 9) % films.length];
  preceptExamples.push({
    id: `pex_${i * 2 + 1}`,
    precept_id: precept.id,
    film_id: filmA.id,
    timecode_start: "00:15:00",
    timecode_end: "00:15:20",
    description: `Canonical-ish example of ${precept.name} in ${filmA.title}`,
    is_canonical_example: true,
    status: "approved",
    created_by: adminId,
    approved_by: adminId,
    is_seed_data: true as const,
  });
  preceptExamples.push({
    id: `pex_${i * 2 + 2}`,
    precept_id: precept.id,
    film_id: filmB.id,
    timecode_start: "01:02:00",
    timecode_end: "01:02:18",
    description: `Later use of ${precept.name} in ${filmB.title}`,
    is_canonical_example: i % 2 === 0,
    status: "approved",
    created_by: adminId,
    approved_by: adminId,
    is_seed_data: true as const,
  });
}

const users = [
  {
    id: "user_anon",
    handle: "guest",
    display_name: "Guest",
    email: "guest@example.com",
    role: "anon",
    reputation: 0,
    contribution_counts: {},
    is_seed_data: true,
  },
  {
    id: "user_contributor",
    handle: "cinephile",
    display_name: "Cinephile",
    email: "cinephile@example.com",
    role: "contributor",
    reputation: 3,
    contribution_counts: { approved: 3 },
    is_seed_data: true,
  },
  {
    id: "user_trusted",
    handle: "archivist",
    display_name: "Archivist",
    email: "archivist@example.com",
    role: "trusted",
    reputation: 40,
    contribution_counts: { approved: 40 },
    is_seed_data: true,
  },
  {
    id: "user_mod",
    handle: "moderator",
    display_name: "Moderator",
    email: "mod@example.com",
    role: "moderator",
    reputation: 100,
    contribution_counts: { approved: 120, reviewed: 200 },
    is_seed_data: true,
  },
  {
    id: adminId,
    handle: "admin",
    display_name: "Admin",
    email: "admin@example.com",
    role: "admin",
    reputation: 999,
    contribution_counts: { approved: 500, reviewed: 500 },
    is_seed_data: true,
  },
];

const suggestions = Array.from({ length: 20 }, (_, i) => {
  const source = i % 3 === 0 ? "ai" : "user";
  const a = films[i % films.length];
  const b = films[(i + 3) % films.length];
  return {
    id: `sug_${i + 1}`,
    target_type: "connection",
    target_id: null,
    operation: "create",
    payload: {
      source_film_id: a.id,
      target_film_id: b.id,
      is_directed: true,
      connection_type: connectionTypes[i % connectionTypes.length],
      confidence_tier: source === "ai" ? "ai_suggested" : "proposed",
      title: `Pending suggestion ${i + 1}`,
      rationale: `Queued ${source} suggestion between ${a.title} and ${b.title}.`,
      tags: ["pending"],
      evidence:
        source === "ai"
          ? []
          : [
              {
                evidence_type: "video_essay",
                url: "https://example.com/pending",
                citation_text: "Pending citation",
                excerpt: "Fifteen words or fewer in this excerpt text now.",
              },
            ],
    },
    source,
    ai_metadata:
      source === "ai"
        ? {
            model: "seed-mock-vlm",
            prompt_version: "v0",
            generated_at: "2026-01-01T00:00:00.000Z",
            raw_response: { note: "seed" },
            token_cost: 0.01,
          }
        : null,
    submitter_note: source === "ai" ? "AI proposal" : "Looks related",
    status: "pending",
    submitted_by: source === "ai" ? adminId : "user_contributor",
    community_score: 20 - i,
    is_seed_data: true,
  };
});

const collections = [
  {
    id: "col_batman_nolan",
    slug: "the-dark-knight-trilogy",
    name: "The Dark Knight Trilogy",
    description: "Nolan's Batman films (partial seed — only TDK present).",
    kind: "trilogy",
    film_ids: [filmByTitle["The Dark Knight"].id],
    is_seed_data: true,
  },
  {
    id: "col_dollars",
    slug: "dollars-trilogy",
    name: "Dollars Trilogy",
    description: "Leone's Dollars films in seed.",
    kind: "trilogy",
    film_ids: [
      filmByTitle["A Fistful of Dollars"].id,
      filmByTitle["The Good, the Bad and the Ugly"].id,
    ],
    is_seed_data: true,
  },
  {
    id: "col_hitchcock_late",
    slug: "hitchcock-paramount-peak",
    name: "Hitchcock Peak Thriller",
    description: "Thematic cluster of Hitchcock thrillers.",
    kind: "thematic",
    film_ids: [
      filmByTitle["Rear Window"].id,
      filmByTitle["Vertigo"].id,
      filmByTitle["North by Northwest"].id,
      filmByTitle["Psycho"].id,
    ],
    is_seed_data: true,
  },
];

const spotlights = [
  {
    id: "spot_dark_knight",
    slug: "the-dark-knight",
    film_id: filmByTitle["The Dark Knight"].id,
    headline: "The Dark Knight and the grammar of the city thriller",
    body_markdown: `## Why this film

*The Dark Knight* sits at a crossroads of crime-epic professionalism (*Heat*), comic-book myth, and urban location doubling (Chicago as Gotham).

### Follow the edges

Start with the confirmed *Heat* homage, then step into Vista for the Wacker Drive → Gotham doubling, then Focus for night-city precepts.
`,
    featured_connection_ids: validEdges
      .filter((e) => e.source_film_id === filmByTitle["The Dark Knight"].id)
      .slice(0, 5)
      .map((e) => e.id),
    published_at: "2026-01-15T12:00:00.000Z",
    status: "approved",
    created_by: adminId,
    approved_by: adminId,
    is_seed_data: true,
  },
];

async function main() {
  await mkdir(root, { recursive: true });
  const files: Record<string, unknown> = {
    users,
    films,
    people,
    credits,
    collections,
    connections: validEdges.slice(0, 150),
    evidence,
    places,
    film_locations: filmLocations.slice(0, 60),
    precepts,
    precept_relations: preceptRelations,
    precept_examples: preceptExamples,
    suggestions,
    spotlights,
  };
  for (const [name, data] of Object.entries(files)) {
    await writeFile(path.join(root, `${name}.json`), JSON.stringify(data, null, 2) + "\n");
    const n = Array.isArray(data) ? data.length : 1;
    console.log(`wrote ${name}.json (${n})`);
  }
}

main();
