export enum ShotScale {
  EXTREME_CLOSE_UP = "extreme_close_up",
  CLOSE_UP = "close_up",
  MEDIUM_CLOSE_UP = "medium_close_up",
  MEDIUM_SHOT = "medium_shot",
  MEDIUM_LONG_SHOT = "medium_long_shot",
  LONG_SHOT = "long_shot",
  EXTREME_LONG_SHOT = "extreme_long_shot",
  INSERT = "insert",
}

export enum CameraAngle {
  EYE_LEVEL = "eye_level",
  LOW_ANGLE = "low_angle",
  HIGH_ANGLE = "high_angle",
  DUTCH_ANGLE = "dutch_angle",
  OVERHEAD = "overhead",
  WORMS_EYE = "worms_eye",
  POV = "pov",
}

export enum CameraMovement {
  STATIC = "static",
  PAN = "pan",
  TILT = "tilt",
  DOLLY = "dolly",
  TRACKING = "tracking",
  CRANE = "crane",
  HANDHELD = "handheld",
  STEADICAM = "steadicam",
  ZOOM = "zoom",
  WHIP_PAN = "whip_pan",
  RACK_FOCUS = "rack_focus",
  PUSH_IN = "push_in",
  PULL_OUT = "pull_out",
}

export enum Composition {
  SYMMETRICAL = "symmetrical",
  RULE_OF_THIRDS = "rule_of_thirds",
  LEADING_LINES = "leading_lines",
  FRAME_WITHIN_FRAME = "frame_within_frame",
  DEPTH_LAYERS = "depth_layers",
  CENTERED = "centered",
  DIAGONAL = "diagonal",
  NEGATIVE_SPACE = "negative_space",
  GOLDEN_RATIO = "golden_ratio",
  OVERHEAD_PATTERN = "overhead_pattern",
}

export enum LightingStyle {
  HIGH_KEY = "high_key",
  LOW_KEY = "low_key",
  NATURAL = "natural",
  BACKLIT = "backlit",
  SILHOUETTE = "silhouette",
  CHIAROSCURO = "chiaroscuro",
  PRACTICAL = "practical",
  NEON = "neon",
  GOLDEN_HOUR = "golden_hour",
  OVEREXPOSED = "overexposed",
  UNDEREXPOSED = "underexposed",
}

export enum ColorPalette {
  WARM = "warm",
  COOL = "cool",
  DESATURATED = "desaturated",
  MONOCHROMATIC = "monochromatic",
  COMPLEMENTARY = "complementary",
  ANALOGOUS = "analogous",
  HIGH_CONTRAST = "high_contrast",
  PASTEL = "pastel",
  EARTHY = "earthy",
  TEAL_ORANGE = "teal_orange",
  BLACK_AND_WHITE = "black_and_white",
}

export enum LocationType {
  INTERIOR = "interior",
  EXTERIOR = "exterior",
  LIMINAL = "liminal",
}

export enum SettingCategory {
  STREET = "street",
  ALLEY = "alley",
  HIGHWAY = "highway",
  ROOM = "room",
  HALLWAY = "hallway",
  STAIRCASE = "staircase",
  ROOFTOP = "rooftop",
  BUILDING_EXTERIOR = "building_exterior",
  FOREST = "forest",
  DESERT = "desert",
  OCEAN = "ocean",
  MOUNTAIN = "mountain",
  FIELD = "field",
  SKY = "sky",
  UNDERWATER = "underwater",
  SPACE = "space",
  VEHICLE_INTERIOR = "vehicle_interior",
  CITYSCAPE = "cityscape",
  INDUSTRIAL = "industrial",
  OFFICE = "office",
  RESTAURANT = "restaurant",
  BEDROOM = "bedroom",
  BATHROOM = "bathroom",
  PRISON = "prison",
  HOSPITAL = "hospital",
  CHURCH = "church",
  STAGE = "stage",
  ABSTRACT = "abstract",
}

export enum TimeOfDay {
  DAWN = "dawn",
  DAY = "day",
  GOLDEN_HOUR = "golden_hour",
  DUSK = "dusk",
  NIGHT = "night",
  AMBIGUOUS = "ambiguous",
}

export enum SubjectAction {
  RUNNING = "running",
  WALKING = "walking",
  SITTING = "sitting",
  STANDING = "standing",
  LYING = "lying",
  FIGHTING = "fighting",
  EMBRACING = "embracing",
  DANCING = "dancing",
  DRIVING = "driving",
  FALLING = "falling",
  LOOKING = "looking",
  SPEAKING = "speaking",
  CRYING = "crying",
  EATING = "eating",
  SMOKING = "smoking",
  READING = "reading",
  TYPING = "typing",
  POINTING = "pointing",
  HIDING = "hiding",
  CHASING = "chasing",
  DYING = "dying",
  SLEEPING = "sleeping",
  NONE = "none",
}

export enum EmotionalRegister {
  JOY = "joy",
  FEAR = "fear",
  TENSION = "tension",
  MELANCHOLY = "melancholy",
  AWE = "awe",
  ANGER = "anger",
  CALM = "calm",
  CONFUSION = "confusion",
  DETERMINATION = "determination",
  DESPAIR = "despair",
  INTIMACY = "intimacy",
  LONELINESS = "loneliness",
  WONDER = "wonder",
  DREAD = "dread",
  TRIUMPH = "triumph",
  AMBIGUITY = "ambiguity",
}

export enum NarrativeFunction {
  ESTABLISHING = "establishing",
  REACTION = "reaction",
  CLIMAX = "climax",
  TRANSITION = "transition",
  REVEAL = "reveal",
  FLASHBACK = "flashback",
  DREAM = "dream",
  MONTAGE = "montage",
  DIALOGUE = "dialogue",
  PURSUIT = "pursuit",
  CONTEMPLATION = "contemplation",
  OPENING = "opening",
  CLOSING = "closing",
}

export enum MusicType {
  ORCHESTRAL = "orchestral",
  ELECTRONIC = "electronic",
  JAZZ = "jazz",
  ROCK = "rock",
  POP = "pop",
  AMBIENT = "ambient",
  HIP_HOP = "hip_hop",
  CLASSICAL = "classical",
  FOLK = "folk",
  NONE = "none",
  SCORE_ORIGINAL = "score_original",
}

export enum MusicMood {
  TRIUMPHANT = "triumphant",
  MELANCHOLIC = "melancholic",
  TENSE = "tense",
  PLAYFUL = "playful",
  OMINOUS = "ominous",
  ROMANTIC = "romantic",
  ETHEREAL = "ethereal",
  AGGRESSIVE = "aggressive",
  PEACEFUL = "peaceful",
  CHAOTIC = "chaotic",
}

export enum AudioVisualRelationship {
  REINFORCING = "reinforcing",
  CONTRASTING = "contrasting",
  COUNTERPOINT = "counterpoint",
  NEUTRAL = "neutral",
  MICKEY_MOUSING = "mickey_mousing",
}

export enum SoundDesignEmphasis {
  AMBIENT = "ambient",
  SILENCE = "silence",
  EMPHASIZED_SFX = "emphasized_sfx",
  FOLEY_HEAVY = "foley_heavy",
  MUSIC_DOMINANT = "music_dominant",
  DIALOGUE_DOMINANT = "dialogue_dominant",
  WHITE_NOISE = "white_noise",
  TINNITUS = "tinnitus",
}

export enum ConnectionType {
  DIRECT_HOMAGE = "direct_homage",
  VISUAL_QUOTATION = "visual_quotation",
  SHARED_TECHNIQUE = "shared_technique",
  GENRE_CONVENTION = "genre_convention",
  THEMATIC_PARALLEL = "thematic_parallel",
  AUDIO_VISUAL_PARALLEL = "audio_visual_parallel",
  SUBVERSION = "subversion",
  COINCIDENTAL = "coincidental",
  SAME_DIRECTOR = "same_director",
  REMAKE = "remake",
}

export enum ConnectionConfidence {
  CONFIRMED = "confirmed",
  HIGHLY_LIKELY = "highly_likely",
  PROBABLE = "probable",
  POSSIBLE = "possible",
  AI_SUGGESTED = "ai_suggested",
}
