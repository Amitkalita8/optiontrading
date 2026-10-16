package quotes

import (
	"errors"
	"sync"
	"time"
)

// maxStale is how long a previously fetched value may stand in when Yahoo fails.
const maxStale = 5 * time.Minute

// cache is a keyed TTL cache. Concurrent gets for the same key queue behind a
// single fetch, so many viewers cost one upstream request per TTL.
type cache[T any] struct {
	mu      sync.Mutex
	entries map[string]*cacheEntry[T]
}

type cacheEntry[T any] struct {
	mu      sync.Mutex // held while fetching
	val     T
	fetched time.Time
}

func newCache[T any]() *cache[T] {
	return &cache[T]{entries: map[string]*cacheEntry[T]{}}
}

func (c *cache[T]) entry(key string) *cacheEntry[T] {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.entries[key]
	if !ok {
		e = &cacheEntry[T]{}
		c.entries[key] = e
	}
	return e
}

// get returns the cached value, whether it is stale, and any error.
// If fetch fails (other than ErrNotFound) a value up to maxStale old is
// returned instead of the error, with stale=true.
func (c *cache[T]) get(key string, ttl time.Duration, now time.Time, fetch func() (T, error)) (T, bool, error) {
	e := c.entry(key)
	e.mu.Lock()
	defer e.mu.Unlock()

	if !e.fetched.IsZero() && now.Sub(e.fetched) < ttl {
		return e.val, false, nil
	}
	v, err := fetch()
	if err != nil {
		if !e.fetched.IsZero() && now.Sub(e.fetched) < maxStale && !errors.Is(err, ErrNotFound) {
			return e.val, true, nil
		}
		var zero T
		return zero, false, err
	}
	e.val, e.fetched = v, now
	return v, false, nil
}
