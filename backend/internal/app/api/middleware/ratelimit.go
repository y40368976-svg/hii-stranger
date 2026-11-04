package middleware

import (
	"math"
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"

	"hii-stranger1/backend/internal/pkg/response"
)

type visitor struct {
	count   int
	resetAt time.Time
}

type limiter struct {
	mu        sync.Mutex
	limit     int
	window    time.Duration
	visitors  map[string]*visitor
	lastSweep time.Time
}

// allow mencatat satu request dari key. Bila batas terlampaui, mengembalikan
// false beserta sisa waktu tunggu. Entri kedaluwarsa dibersihkan secara berkala
// saat ada request, jadi tidak perlu goroutine terpisah.
func (l *limiter) allow(key string, now time.Time) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	if now.Sub(l.lastSweep) > l.window {
		for k, v := range l.visitors {
			if now.After(v.resetAt) {
				delete(l.visitors, k)
			}
		}
		l.lastSweep = now
	}

	v, ok := l.visitors[key]
	if !ok || now.After(v.resetAt) {
		l.visitors[key] = &visitor{count: 1, resetAt: now.Add(l.window)}
		return true, 0
	}
	if v.count >= l.limit {
		return false, v.resetAt.Sub(now)
	}
	v.count++
	return true, 0
}

// RateLimit membatasi jumlah request per alamat IP dalam satu jendela waktu
// tetap. Setiap pemanggilan membuat limiter sendiri, jadi pasang satu per rute.
// Penghitung tersimpan di memori satu instance dan memakai RemoteAddr; di
// belakang reverse proxy semua klien akan terlihat berasal dari IP proxy.
func RateLimit(limit int, window time.Duration) Middleware {
	l := &limiter{limit: limit, window: window, visitors: make(map[string]*visitor)}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ok, retryAfter := l.allow(clientIP(r), time.Now())
			if !ok {
				w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(retryAfter.Seconds()))))
				response.Error(w, http.StatusTooManyRequests, "too_many_requests", "Terlalu banyak permintaan. Coba lagi nanti.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
