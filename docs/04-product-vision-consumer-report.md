# Precept — Product Vision & Consumer Capability Report

**Audience:** Product / strategy agents evaluating whether to pursue this market gap  
**Source of truth:** Repository scan of `parthesian/precept` (code, taxonomy, UI, pipeline, API, docs)  
**Product one-liner (from product):** *“The visual genealogy of cinema.”*  
**Technical one-liner (from README):** *Cinematic visual genealogy platform for shot-level analysis, similarity, and connection mapping.*

---

## 1. Vision (what this product wants to be)

Precept is building a **shot-level cinema knowledge graph**: not a streaming service, not a review site, and not a generic video-search tool. The intended consumer experience is to:

1. **Decompose films into shots** (the atomic cinematic unit).
2. **Describe each shot** with a rich cinematic taxonomy (camera, light, composition, emotion, narrative role, audio–visual relationship).
3. **Find similar shots** across films via visual embeddings.
4. **Map connections** between shots as intentional or stylistic relationships (homage, quotation, shared technique, genre convention, thematic parallel, subversion, etc.).
5. **Reveal director “visual fingerprints”** and influence networks over time.

The seed corpus strategy is explicit in the product UI: start with **Christopher Nolan**, then expand to influences and peers.

The consumer metaphor is **genealogy**: cinema as a family tree of images, techniques, and citations — browsable as frames, timelines, and graphs.

---

## 2. Who it is for (inferred ICP)

From taxonomy depth, UI language, and connection types, the primary users are:

| Segment | Why Precept fits |
|---|---|
| Film students / cinephiles | Shot taxonomy + genealogy graph for study and discovery |
| Directors / DPs / editors | Reference browsing by technique, lighting, composition, A/V relationship |
| Critics / essayists / educators | Evidence-backed visual parallels with confidence levels |
| AI / media researchers | Structured shot corpus with embeddings + typed relations |

Secondary / later segments (implied by architecture, not yet productized): studios, archives, VFX/reference libraries, music-supervisor tooling (audio–visual relationship is already a first-class field).

---

## 3. What the product currently does (consumer view)

### 3.1 End-to-end value chain today

```
Film/video file
  → local hybrid analysis pipeline (shots + frames + audio + tags + embeddings)
  → Cloudflare API (D1 metadata, R2 media, Vectorize vectors)
  → Web exploration app (browse / filter / inspect / graph UI)
```

This is a **working ingest → explore loop**, not a pure concept deck. A film can be processed and then inspected in the web app.

### 3.2 Consumer surfaces that exist

| Surface | Status | Consumer job |
|---|---|---|
| **Home** | Live | Brand entry: “PRECEPT / The visual genealogy of cinema”; curated frame strip; corpus stats (films / shots / directors) |
| **Explore** | Live | Grid of shot thumbnails with filters: shot scale, setting, lighting, audio–visual relationship |
| **Command search (⌘/Ctrl+K)** | Live | Quick search across shots / films / directors by description/query |
| **Film timeline** | Live | Scrubbable horizontal timeline of a film’s shots with duration-weighted segments + dominant scale stats |
| **Shot detail** | Live (richest screen) | Full-bleed frame, filmstrip of keyframes, audio playback + waveform, visual/audio/semantic tag flows, color swatches, LLM cinematic description |
| **Directors / Visual Fingerprint** | Partial | Aggregate top shot scales / settings / lighting from corpus; copy frames Nolan-first expansion |
| **Connections / Graph** | UI prototype | Circular graph of shot nodes with typed edge styling (homage, quotation, technique, etc.) — currently **synthetic edges from seed shots**, not live DB connections |
| **Similar Shots / Comparison** | Placeholder | Explicit stub: “Side-by-side shot strips and tag overlap highlights will render here.” |

### 3.3 What a user can actually experience today

**Working today**

- Browse an indexed corpus of shots as cinematic objects.
- Filter by cinematographic attributes (not just keywords).
- Open a shot and see **multi-modal evidence**: frames + audio clip + structured tags + prose description.
- Scrub a film as a timeline of shot durations.
- See early “director fingerprint” aggregates.
- Run a pipeline that tags shots with a deep cinema-native vocabulary.

**Not yet a complete consumer product**

- Automatic discovery and display of real homage/quotation edges in the Graph.
- Side-by-side similarity comparison UX.
- Robust “find shots like this” from a selected shot in the UI (API similarity exists but is scaffolded: caller must pass raw embedding; shot_id lookup incomplete).
- User accounts, collections, annotations, or social/curation workflows.
- Public content licensing / rights model for full films (pipeline assumes operator-provided video files).

---

## 4. The cinematic ontology (product differentiator)

This is the core product bet: **cinema vocabulary as the interface**, not freeform captions alone.

### Visual

- Shot scale (ECU → ELS, insert)
- Camera angle (eye level, Dutch, POV, worm’s eye, etc.)
- Camera movement (static, pan, dolly, steadicam, rack focus, whip pan, …)
- Composition (symmetry, rule of thirds, frame-within-frame, negative space, …)
- Lighting (high/low key, chiaroscuro, neon, golden hour, silhouette, …)
- Color palette + dominant hex colors
- Location type / setting / time of day

### Semantic / narrative

- Subject count + actions
- Emotional register (tension, melancholy, dread, intimacy, …)
- Narrative function (establishing, reveal, climax, flashback, montage, …)
- Props / motifs

### Audio (first-class, not bolted on)

- Music present / type / mood / diegetic
- Dialogue present
- Sound design emphasis (silence, foley-heavy, tinnitus, music-dominant, …)
- **Audio–visual relationship**: reinforcing, contrasting, counterpoint, mickey-mousing, neutral

### Genealogy layer

Connection types already modeled:

- Direct homage, visual quotation, shared technique, genre convention
- Thematic parallel, audio–visual parallel
- Subversion, coincidental, same director, remake

Confidence ladder:

- Confirmed → Highly likely → Probable → Possible → AI suggested  
- Plus provenance: created by `system` | `user` | `ai`

This ontology is unusually specific for a consumer media product and is the clearest “proof of vision” in the repo.

---

## 5. How analysis works today (product implications)

### Hybrid intelligent pipeline

1. **Python local vision service** — shot detection, adaptive keyframe selection, local embeddings fallback  
2. **TypeScript orchestrator** — audio extract, frame extract, tiered VLM tagging, narrative memory, ingest upload  
3. **Cloudflare serving layer** — Worker API + D1 + R2 + Vectorize + web app

### Tiered cost model (enables scale)

- `tier_0`: local heuristic (no remote VLM)
- `tier_1`: cheap routine model (e.g. Gemini Flash-Lite / local Qwen)
- `tier_2`: premium complex shots (e.g. Gemini Pro / Anthropic)

Routing uses shot complexity signals (motion, entropy, frame count, dialogue/music). Running narrative memory compresses film context across shots so tags stay story-aware without re-sending the whole film.

**Product implication:** Precept can aspire to catalog many films economically — critical if the moat is corpus + graph density, not a single-film demo.

---

## 6. Planned expansions (explicitly signaled in repo)

These are **in-repo intents**, not external speculation.

### Near-term product completions (scaffolds / stubs)

1. **Connection discovery CLI** (`pipeline connect`)  
   - Explicit placeholder: implement **vector + LLM relation classification**.  
   - This is the missing engine behind “visual genealogy.”

2. **Similar-shot comparison UI**  
   - `ComparisonView` reserved for side-by-side strips + tag-overlap highlights.

3. **Live connection graph**  
   - API already supports CRUD + graph fetch for connections.  
   - Web graph currently fabricates edges for demo layout; wiring to `/api/connections/graph` is the natural next step.

4. **Similarity search completion**  
   - Vectorize query path exists.  
   - Shot_id → embedding retrieval path still scaffolded (must pass embedding directly today).

### Pipeline / quality roadmap (from architecture docs)

5. Production CLIP / DreamSim embedding service (replace heuristic local embedding endpoint).  
6. Stronger confidence calibration for tier routing.  
7. Evaluation harness for precision/recall and **cost-per-film** tracking.  
8. Richer shot detectors in the vision service contract (`pyscenedetect`, `transnetv2` named; FFmpeg still the current implementation).  
9. Fuller audio classification (music/dialogue currently heuristic placeholders).

### Corpus / editorial roadmap (from UI copy)

10. Nolan seed corpus → expand to influences and peers.  
11. Director profiles with known influences + signature techniques (DB schema already has `directors.known_influences`, `signature_techniques`).

---

## 7. Maturity map (for pursuit decisions)

| Layer | Maturity | Notes |
|---|---|---|
| Brand & positioning | Clear | Genealogy framing is consistent across Home + README |
| Cinema taxonomy | Strong | Deep, opinionated, product-defining |
| Ingest pipeline | Strong / advancing | Hybrid local+VLM with cost tiers and narrative memory |
| Shot exploration UX | Good MVP | Explore + shot detail + timeline are usable |
| Similarity retrieval | Partial | Embeddings + Vectorize present; consumer UX incomplete |
| Connection / genealogy graph | Schema + API ready; discovery + UI incomplete | The namesake feature is the biggest open product gap |
| Director fingerprinting | Early | Aggregates only; influence graph not built |
| Auth / consumer packaging | Absent | Operator/dev tooling today, not consumer SaaS |
| Rights / corpus strategy | Unspecified | Critical business risk for public film frames |

**Bottom line maturity:** Precept is past “idea” and into **working shot intelligence platform with a partially realized genealogy product**. The unique promise (typed visual lineage across cinema) is designed in data and API, but not yet closed in the consumer experience.

---

## 8. Market-gap framing (from product evidence)

### Adjacent categories this is *not*

- Not Letterboxd (social reviews / diaries)
- Not IMDb / TMDB (title metadata)
- Not Shotdeck / commercial still libraries alone (stock-like browsing without genealogy)
- Not YouTube / TikTok style “similar video”
- Not generic multimodal RAG over movies

### The gap Precept aims at

**A navigable map of cinematic visual lineage at shot resolution**, combining:

- expert-grade structured tags  
- perceptual similarity  
- typed intertextual connections with confidence  
- audio–visual craft as a first-class axis  

That combination — especially **homage/quotation/subversion as graph edges**, not just “visually similar” — is the distinctive thesis.

### Conditions that make the gap real (to validate externally)

1. Do cinephiles / craft professionals currently stitch this manually (essays, video essays, moodboards)?  
2. Are existing still libraries weak on *relation type* and *narrative/audio context*?  
3. Can Precept reach critical graph density (enough films + enough confirmed/likely edges) before the experience feels empty?  
4. Can rights/corpus be solved (public-domain, licensed stills, fair-use educational, studio partnerships, user-owned libraries)?

### Pursuit risks encoded in the current product

- **Graph emptiness risk:** without automated `connect`, the genealogy brand outruns the experience.  
- **Corpus cold-start:** fingerprints and graphs need breadth; Nolan-first is smart seeding but not enough alone.  
- **Trust risk:** AI-suggested connections need the confidence ladder + human confirmation UX to feel scholarly, not clickbait.  
- **Cost/scale risk:** mitigated by tiered routing, but still central to corpus ambition.  
- **Distribution risk:** today this is a private indexed archive UX; go-to-market packaging is undefined.

### Pursuit strengths already evident

- Unusually sharp product ontology (hard for a generic AI wrapper to fake quickly).  
- Multi-modal shot object (image + audio + tags + description).  
- Architecture that treats cost as a product constraint (local-first + tiers).  
- Clear emotional brand: genealogy of cinema, not “AI movie search.”  
- Data model already anticipates human+AI co-curation of connections.

---

## 9. Recommended “vision proof” narrative for handoff

Use this sequence when briefing another agent or investor/product partner:

1. **Promise:** Map how cinema quotes, inherits, and subverts itself — shot by shot.  
2. **Atomic object:** The tagged shot (visual + audio + narrative + embedding).  
3. **Current proof:** Films can be ingested; users can explore/filter; shot detail already feels like a craft instrument.  
4. **Missing centerpiece:** Automatic connection discovery + comparison + live graph.  
5. **Moat path:** Dense typed graph over a curated influence network (Nolan → peers → ancestors), not raw model quality alone.  
6. **Near-term product milestone that “makes the vision true”:**  
   User opens a shot → sees similar shots → sees typed edges (homage/technique/…) with confidence → can confirm/edit → graph updates.

Until step 6 ships, Precept is a **powerful cinematic index**; after step 6, it becomes the **genealogy product** it claims to be.

---

## 10. Suggested evaluation questions for the next agent

1. Is the ICP primarily **education/cinephile discovery**, **professional reference**, or **research infrastructure** — and does that change corpus/rights strategy?  
2. What is the minimum delightful corpus size (films + edges) for Graph/Explore to feel alive?  
3. Should v1 connections be **AI-suggested with human confirm**, or **editorially seeded** then automated?  
4. Is consumer web the right first surface, or is a **pro reference tool / API** a cleaner wedge?  
5. Which wedge motif is strongest for GTM: “find the shot that inspired this,” “director fingerprint,” or “audio–visual counterpoint browser”?  
6. What competitive set exists for shot libraries + visual references, and where does typed genealogy uniquely win?

---

## Appendix A — Repo map (for implementers)

| Path | Role |
|---|---|
| `apps/web` | Consumer exploration UI |
| `apps/api` | Cloudflare Worker API (films, shots, search, connections, ingest) |
| `packages/pipeline` | Ingest orchestrator CLI (`process`, scaffolded `connect`) |
| `packages/shared` | Taxonomy, types, schemas (product ontology) |
| `packages/db` | D1 migrations + queries |
| `services/vision-pipeline` | Local Python shot/keyframe/embedding service |
| `docs/03-intelligent-video-analysis-pipeline.md` | Pipeline architecture + next improvements |

## Appendix B — Explicit unfinished product stubs (quotes)

- Connection CLI: *“connect command scaffolded; implement vector + LLM relation classification next.”*  
- Comparison UI: *“Side-by-side shot strips and tag overlap highlights will render here.”*  
- Similarity by shot_id: *“Provide embedding vector directly for this scaffold route.”*  
- Directors page: *“Start with Christopher Nolan as seed corpus, then expand to influences and peers.”*  
- Pipeline docs next: production embeddings, confidence calibration, eval harness / cost-per-film.

---

*Report generated from repository state; intended as a durable brief for product/market evaluation, not a competitive research study.*
