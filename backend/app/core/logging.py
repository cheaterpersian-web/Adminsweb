import logging
import os


def configure_logging() -> None:
    """Configure root logging for the application process.

    Uses a concise format with timestamp, level, logger name, and message.
    Uvicorn loggers will inherit this configuration when run inside the same process.
    """
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

