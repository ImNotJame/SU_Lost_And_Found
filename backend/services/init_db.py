import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import models  # noqa: F401

from repositories.database import Base, engine
from sqlalchemy import text

Base.metadata.create_all(bind=engine)

with engine.begin() as connection:
    connection.execute(text(
        "ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_path VARCHAR(500)"
    ))
print("Database tables created.")
