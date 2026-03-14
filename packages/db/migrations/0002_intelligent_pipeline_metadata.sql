ALTER TABLE shots ADD COLUMN analysis_tier TEXT;
ALTER TABLE shots ADD COLUMN analysis_provider TEXT;
ALTER TABLE shots ADD COLUMN analysis_model TEXT;
ALTER TABLE shots ADD COLUMN analysis_confidence REAL;
ALTER TABLE shots ADD COLUMN keyframe_diagnostics TEXT DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_shots_analysis_tier ON shots(analysis_tier);
