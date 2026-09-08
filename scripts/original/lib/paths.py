from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data"
SEED_DB = DATA / "openexam.seed.db"
SEED_GZ = DATA / "openexam.seed.db.gz"
ORIGINAL_DIR = DATA / "original"
ASSETS_DIR = ORIGINAL_DIR / "assets"
IN_PROGRESS_DIR = ORIGINAL_DIR / "in_progress"
COMPLETED_DIR = ORIGINAL_DIR / "completed"
LEDGER_PATH = ORIGINAL_DIR / "ledger.json"
LEGACY_ASSETS = DATA / "question-assets"
