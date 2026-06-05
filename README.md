# Play2Study
ai procrastination 

## Database migrations (Alembic)

We included a minimal Alembic setup in the `alembic/` folder. To generate and apply migrations:

1. Install alembic: `pip install alembic`
2. Autogenerate a new revision: `alembic revision --autogenerate -m "describe change"`
3. Apply migrations: `alembic upgrade head`

The `alembic/env.py` imports SQLAlchemy `Base` from `main.py` to access the metadata.

## Backups (cron)

We added `scripts/backup_db.py` which copies the sqlite DB to a timestamped file. Example cron entry (daily at 03:30):

```
30 3 * * * /usr/bin/env python3 /path/to/repo/scripts/backup_db.py >> /var/log/play2study_backup.log 2>&1
```

Set `DB_BACKUP_DIR` env var to change the backup destination.

## Celery + Redis

We added a minimal `celery_app.py` that uses `REDIS_URL` or `CELERY_BROKER_URL`. Example:

```
export REDIS_URL=redis://localhost:6379/0
celery -A celery_app.celery worker --loglevel=info
```

The app will dispatch verification emails to Celery when configured, otherwise it falls back to FastAPI background tasks.

## Health checks

There is a `/health` endpoint that checks database connectivity and Redis availability (best-effort).

