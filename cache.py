import os
import json
import time


class DummyCache:
    def __init__(self):
        self.store = {}

    def get(self, key):
        v = self.store.get(key)
        if not v:
            return None
        value, expires = v
        if expires and time.time() > expires:
            del self.store[key]
            return None
        return value

    def set(self, key, value, ex=None):
        expires = time.time() + ex if ex else None
        self.store[key] = (value, expires)


class RedisCache:
    def __init__(self, url=None):
        self.url = url or os.environ.get("REDIS_URL")
        try:
            import redis
            if self.url:
                self.client = redis.Redis.from_url(self.url, decode_responses=True)
            else:
                self.client = None
        except Exception:
            self.client = None

    def get(self, key):
        if not self.client:
            return None
        try:
            raw = self.client.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception:
            return None

    def set(self, key, value, ex=None):
        if not self.client:
            return None
        try:
            raw = json.dumps(value)
            if ex:
                self.client.set(key, raw, ex=ex)
            else:
                self.client.set(key, raw)
        except Exception:
            return None


def get_cache():
    # Prefer Redis when available, otherwise fall back to in-memory dummy cache
    url = os.environ.get("REDIS_URL")
    if url:
        rc = RedisCache(url)
        if rc.client:
            return rc
    return DummyCache()
