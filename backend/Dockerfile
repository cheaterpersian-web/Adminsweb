FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend /app

EXPOSE 8000

# Ensure the `app` package is importable and run entrypoint as a module
ENV PYTHONPATH=/app

CMD ["python", "-m", "app.alembic_entrypoint"]