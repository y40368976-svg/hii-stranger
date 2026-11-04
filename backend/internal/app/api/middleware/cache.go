package middleware

import (
	"bytes"
	"net/http"
	"strings"
	"sync"
	"time"
)

// maxCachedBody membatasi ukuran satu response yang disimpan di cache.
const maxCachedBody = 1 << 20

// ResponseCache menyimpan response GET publik di memori (microcache) supaya
// endpoint yang paling sering dibuka (produk, kategori, banner) tidak selalu
// menunggu database.
//
// Aturan supaya data tidak basi:
//   - Hanya request tanpa header Authorization yang di-cache. Admin dan user
//     yang login selalu mendapat data langsung dari database.
//   - Hanya response 200 yang disimpan, paling lama ttl.
//   - Setiap request tulis yang sukses (POST/PUT/PATCH/DELETE) di endpoint
//     mana pun mengosongkan seluruh cache, termasuk checkout yang mengubah stok.
//   - Cache ada di memori satu instance. Bila server dijalankan lebih dari satu
//     instance, instance lain baru ikut segar setelah ttl habis.
type ResponseCache struct {
	ttl        time.Duration
	maxEntries int

	mu      sync.RWMutex
	entries map[string]cachedResponse
	// gen naik setiap cache dikosongkan. Response yang mulai dibuat sebelum
	// pengosongan tidak disimpan, supaya data lama tidak masuk lagi.
	gen uint64
}

type cachedResponse struct {
	body        []byte
	contentType string
	expires     time.Time
}

// NewResponseCache membuat cache dengan masa simpan ttl dan jumlah entri
// maksimal maxEntries.
func NewResponseCache(ttl time.Duration, maxEntries int) *ResponseCache {
	return &ResponseCache{ttl: ttl, maxEntries: maxEntries, entries: map[string]cachedResponse{}}
}

// Cached dipasang pada rute GET publik yang boleh di-cache. Header X-Cache
// bernilai HIT atau MISS untuk memudahkan pengecekan.
func (c *ResponseCache) Cached() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodGet || r.Header.Get("Authorization") != "" {
				next.ServeHTTP(w, r)
				return
			}

			key := r.URL.RequestURI()
			c.mu.RLock()
			e, ok := c.entries[key]
			gen := c.gen
			c.mu.RUnlock()

			if ok && time.Now().Before(e.expires) {
				h := w.Header()
				h.Set("Content-Type", e.contentType)
				h.Set("X-Cache", "HIT")
				w.WriteHeader(http.StatusOK)
				_, _ = w.Write(e.body)
				return
			}

			w.Header().Set("X-Cache", "MISS")
			rec := &bodyRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)
			if rec.status == http.StatusOK && !rec.tooBig {
				c.store(key, gen, cachedResponse{
					body:        rec.buf.Bytes(),
					contentType: w.Header().Get("Content-Type"),
					expires:     time.Now().Add(c.ttl),
				})
			}
		})
	}
}

// InvalidateOnWrite dipasang global: setelah request tulis selesai tanpa
// error (status < 400), seluruh cache dikosongkan. skip berisi awalan path
// yang tidak pernah mengubah data yang di-cache (mis. login, keranjang),
// supaya cache tidak terus-menerus kosong karena aktivitas pelanggan.
func (c *ResponseCache) InvalidateOnWrite(skip ...string) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet, http.MethodHead, http.MethodOptions:
				next.ServeHTTP(w, r)
				return
			}
			for _, prefix := range skip {
				if strings.HasPrefix(r.URL.Path, prefix) {
					next.ServeHTTP(w, r)
					return
				}
			}
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)
			if rec.status < http.StatusBadRequest {
				c.Flush()
			}
		})
	}
}

// Flush mengosongkan seluruh cache.
func (c *ResponseCache) Flush() {
	c.mu.Lock()
	c.entries = map[string]cachedResponse{}
	c.gen++
	c.mu.Unlock()
}

// store menyimpan entri bila cache belum dikosongkan sejak response mulai
// dibuat. Bila penuh, entri kedaluwarsa dibuang dulu; bila masih penuh,
// entri baru tidak disimpan (request tetap dilayani normal).
func (c *ResponseCache) store(key string, gen uint64, e cachedResponse) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.gen != gen {
		return
	}
	if len(c.entries) >= c.maxEntries {
		now := time.Now()
		for k, v := range c.entries {
			if now.After(v.expires) {
				delete(c.entries, k)
			}
		}
		if len(c.entries) >= c.maxEntries {
			return
		}
	}
	c.entries[key] = e
}

// bodyRecorder meneruskan response ke client sambil menyalin body-nya.
type bodyRecorder struct {
	http.ResponseWriter
	status int
	buf    bytes.Buffer
	tooBig bool
}

func (b *bodyRecorder) WriteHeader(code int) {
	b.status = code
	b.ResponseWriter.WriteHeader(code)
}

func (b *bodyRecorder) Write(p []byte) (int, error) {
	if !b.tooBig {
		if b.buf.Len()+len(p) > maxCachedBody {
			b.tooBig = true
			b.buf.Reset()
		} else {
			b.buf.Write(p)
		}
	}
	return b.ResponseWriter.Write(p)
}
