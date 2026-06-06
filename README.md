# Play2Study
ai procrastination 
## Database migrations (Alembic)

We included a minimal Alembic setup in the `alembic/` folder. To generate and apply migrations:

1. Install alembic: `pip install alembic`
2. Autogenerate a new revision: `alembic revision --autogenerate -m "describe change"`
3. Apply migrations: `alembic upgrade head`

The `alembic/env.py` imports SQLAlchemy `Base` from `main.py` to access the metadata. `alembic/env.py` will also respect the `DATABASE_URL` environment variable so CI/deploy can target the correct DB.

## Backups (cron)

We added `scripts/backup_db.py` which copies the sqlite DB to a timestamped file. Example cron entry (daily at 03:30):

```
30 3 * * * DATABASE_URL="sqlite:///$(pwd)/play2study.db" DB_BACKUP_DIR="/var/backups/play2study" /usr/bin/env python3 /path/to/Play2Study-main/scripts/backup_db.py >> /var/log/play2study_backup.log 2>&1
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

## Redis caching

The project includes a small cache abstraction in `cache.py` that will use Redis when `REDIS_URL` is set, otherwise it falls back to an in-memory `DummyCache`.

We currently cache the leaderboard endpoint (`/leaderboard_cached`) for 30 seconds to reduce DB load. You can enable Redis with:

```
export REDIS_URL=redis://localhost:6379/0
```

And start a Redis server or a container.

## Alembic notes

Notes about first-time migration:
- If your database already contains the tables (for example created via `Base.metadata.create_all`), running `alembic upgrade head` may fail. In that case you can run `alembic stamp head` to mark the current DB as up-to-date, then create a new migration for subsequent schema changes.

We added an index migration `alembic/versions/0002_add_indexes.py` to create indexes on `user_stats.user_id`, `tasks.user_id` and `user_stats.points` to speed up leaderboard queries and joins.

## Slow query logging and EXPLAIN

The app registers a SQLAlchemy listener that logs queries slower than `SLOW_QUERY_THRESHOLD_MS` (default 200ms). You can enable `EXPLAIN ANALYZE` logging for slow queries by setting:

```
export SLOW_QUERY_EXPLAIN=1
export SLOW_QUERY_THRESHOLD_MS=100
```

This helps find N+1 and other slow queries.

## Celery + Redis tests

Unit tests were added to validate the Celery fallback behavior (`tests/test_celery_fallback.py`).

## Monitoring and health

The `/health` endpoint checks DB connectivity and Redis availability (best-effort). The repo also includes basic slow-query logging. For production use we recommend adding a process manager (systemd, docker restart policy, or Kubernetes) to automatically restart the app on failures and integrating a monitoring solution (Prometheus + Grafana) to collect metrics.

## Nginx + Certbot (optional)

If you have a domain and want to enable free SSL via Let's Encrypt, a simple docker-compose setup is provided.

1. Edit `deploy/nginx/conf.d/play2study.conf` and replace `example.com` with your domain.
2. Start containers: `docker-compose up -d nginx backend`
3. Request a certificate (one-time): `./deploy/get-cert.sh yourdomain.tld`
4. Renew certificates periodically: `./deploy/renew-cert.sh` (add to cron/systemd timer).

Notes:
- The compose file mounts `./deploy/letsencrypt` and `./deploy/certbot_www` for cert storage and ACME challenges.
- Make sure port 80/443 are reachable from the Internet for ACME challenge.

## Redis & Celery (optional)

To run Redis and a Celery worker via docker-compose (useful for background jobs like sending email):

1. Ensure `docker-compose.yml` includes `redis` and `celery` services (already present in this repo).
2. Export the env var for Redis if needed (docker-compose uses service name):

```
export REDIS_URL=redis://redis:6379/0
```

3. Start services:

```
docker-compose up -d redis backend celery
```

4. Watch logs:

```
docker-compose logs -f celery
```

Notes:
- Celery worker uses `celery_app.py`. If you want results backend set a proper `CELERY_RESULT_BACKEND` env var.
- In production you may want to run multiple workers, supervisor, autoscaling, and persistent volumes.
