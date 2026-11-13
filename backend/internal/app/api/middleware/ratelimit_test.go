package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestLimiterAllow(t *testing.T) {
	l := &limiter{limit: 2, window: time.Minute, visitors: map[string]*visitor{}}
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	for i := 0; i < 2; i++ {
		if ok, _ := l.allow("1.1.1.1", now); !ok {
			t.Fatalf("request ke-%d harus lolos", i+1)
		}
	}
	ok, wait := l.allow("1.1.1.1", now.Add(10*time.Second))
	if ok {
		t.Fatal("request ketiga dalam jendela harus ditolak")
	}
	if wait != 50*time.Second {
		t.Errorf("retryAfter = %v, want 50s", wait)
	}
	if ok, _ := l.allow("2.2.2.2", now); !ok {
		t.Error("IP lain punya kuota sendiri")
	}
	if ok, _ := l.allow("1.1.1.1", now.Add(time.Minute+time.Second)); !ok {
		t.Error("setelah jendela lewat, kuota harus pulih")
	}
}

func TestLimiterSweep(t *testing.T) {
	l := &limiter{limit: 1, window: time.Minute, visitors: map[string]*visitor{}}
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	l.allow("a", now)
	l.allow("b", now)
	l.allow("c", now.Add(2*time.Minute))
	if _, ok := l.visitors["a"]; ok {
		t.Error("entri kedaluwarsa harus dibersihkan")
	}
	if len(l.visitors) != 1 {
		t.Errorf("len(visitors) = %d, want 1", len(l.visitors))
	}
}

func TestRateLimitMiddleware(t *testing.T) {
	h := RateLimit(1, time.Minute)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	do := func(addr string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.RemoteAddr = addr
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec
	}
	if rec := do("10.0.0.1:1111"); rec.Code != http.StatusOK {
		t.Fatalf("request pertama status = %d", rec.Code)
	}
	// Port berbeda tetap dihitung sebagai IP yang sama.
	rec := do("10.0.0.1:2222")
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("request kedua status = %d, want 429", rec.Code)
	}
	if ra := rec.Header().Get("Retry-After"); ra == "" || ra == "0" {
		t.Errorf("Retry-After = %q, want > 0", ra)
	}
	if rec := do("10.0.0.2:1111"); rec.Code != http.StatusOK {
		t.Errorf("IP lain status = %d, want 200", rec.Code)
	}
}

func TestClientIP(t *testing.T) {
	for addr, want := range map[string]string{"1.2.3.4:80": "1.2.3.4", "[::1]:80": "::1", "tanpa-port": "tanpa-port"} {
		r := httptest.NewRequest(http.MethodGet, "/", nil)
		r.RemoteAddr = addr
		if got := clientIP(r); got != want {
			t.Errorf("clientIP(%q) = %q, want %q", addr, got, want)
		}
	}
}
