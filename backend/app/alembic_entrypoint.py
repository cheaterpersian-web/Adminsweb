import os
import sys
import subprocess


def main() -> None:
    # Set database URL for Alembic if provided
    db_url = os.getenv("DATABASE_URL")
    ini_path = os.path.join(os.path.dirname(__file__), "..", "alembic.ini")
    if db_url:
        os.environ["DATABASE_URL"] = db_url
    # Run migrations
    subprocess.check_call([sys.executable, "-m", "alembic", "-c", ini_path, "upgrade", "head"])
    # Exec uvicorn
    os.execvp("uvicorn", [
        "uvicorn",
        "app.main:app",
        "--host", "0.0.0.0",
        "--port", os.getenv("PORT", "8000"),
    ])


if __name__ == "__main__":
    main()