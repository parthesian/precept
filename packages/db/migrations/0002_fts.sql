-- FTS5 virtual tables for search (Phase 1b). Standalone (not external-content)
-- so TEXT primary keys on base tables do not complicate rowid sync.

CREATE VIRTUAL TABLE films_fts USING fts5(
  film_id UNINDEXED,
  title,
  original_title,
  slug
);

CREATE VIRTUAL TABLE people_fts USING fts5(
  person_id UNINDEXED,
  name,
  slug
);

CREATE VIRTUAL TABLE precepts_fts USING fts5(
  precept_id UNINDEXED,
  name,
  aliases,
  slug
);

CREATE TRIGGER films_fts_ai AFTER INSERT ON films BEGIN
  INSERT INTO films_fts(film_id, title, original_title, slug)
  VALUES (new.id, new.title, coalesce(new.original_title, ''), new.slug);
END;
CREATE TRIGGER films_fts_ad AFTER DELETE ON films BEGIN
  DELETE FROM films_fts WHERE film_id = old.id;
END;
CREATE TRIGGER films_fts_au AFTER UPDATE ON films BEGIN
  DELETE FROM films_fts WHERE film_id = old.id;
  INSERT INTO films_fts(film_id, title, original_title, slug)
  VALUES (new.id, new.title, coalesce(new.original_title, ''), new.slug);
END;

CREATE TRIGGER people_fts_ai AFTER INSERT ON people BEGIN
  INSERT INTO people_fts(person_id, name, slug)
  VALUES (new.id, new.name, new.slug);
END;
CREATE TRIGGER people_fts_ad AFTER DELETE ON people BEGIN
  DELETE FROM people_fts WHERE person_id = old.id;
END;
CREATE TRIGGER people_fts_au AFTER UPDATE ON people BEGIN
  DELETE FROM people_fts WHERE person_id = old.id;
  INSERT INTO people_fts(person_id, name, slug)
  VALUES (new.id, new.name, new.slug);
END;

CREATE TRIGGER precepts_fts_ai AFTER INSERT ON precepts BEGIN
  INSERT INTO precepts_fts(precept_id, name, aliases, slug)
  VALUES (new.id, new.name, coalesce(new.aliases, '[]'), new.slug);
END;
CREATE TRIGGER precepts_fts_ad AFTER DELETE ON precepts BEGIN
  DELETE FROM precepts_fts WHERE precept_id = old.id;
END;
CREATE TRIGGER precepts_fts_au AFTER UPDATE ON precepts BEGIN
  DELETE FROM precepts_fts WHERE precept_id = old.id;
  INSERT INTO precepts_fts(precept_id, name, aliases, slug)
  VALUES (new.id, new.name, coalesce(new.aliases, '[]'), new.slug);
END;
