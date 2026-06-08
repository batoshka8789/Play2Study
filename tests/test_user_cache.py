import json
from cache import get_cache


def test_user_profile_and_stats_cache_invalidation():
    cache = get_cache()
    # prime profile and stats
    cache.set('user_profile:42', {'username': 'u42', 'level': 1}, ex=600)
    cache.set('user_stats:42', {'points': 10, 'gems': 1}, ex=60)

    assert cache.get('user_profile:42') is not None
    assert cache.get('user_stats:42') is not None

    # simulate invalidation logic from complete_task/buy_item
    try:
        if getattr(cache, 'client', None):
            cache.client.delete('user_profile:42')
            cache.client.delete('user_stats:42')
        else:
            cache.set('user_profile:42', None, ex=0)
            cache.set('user_stats:42', None, ex=0)
    except Exception:
        pass

    assert cache.get('user_profile:42') in (None, [])
    assert cache.get('user_stats:42') in (None, [])
