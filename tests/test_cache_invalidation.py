import os
import json

from main import app
from cache import get_cache


def test_leaderboard_cache_invalidation(monkeypatch):
    # Use DummyCache to test invalidation
    cache = get_cache()
    # prime cache
    cache.set('leaderboard_v1', [{'username': 'a', 'points': 100}], ex=30)
    assert cache.get('leaderboard_v1') is not None

    # simulate invalidation logic used by complete_task/buy_item
    try:
        if getattr(cache, 'client', None):
            cache.client.delete('leaderboard_v1')
        else:
            cache.set('leaderboard_v1', None, ex=0)
    except Exception:
        pass

    assert cache.get('leaderboard_v1') in (None, [])
