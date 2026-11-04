package middleware

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"
)

// countingHandler menjawab 200 dengan isi berupa jumlah pemanggilan, supaya
// test bisa tahu apakah response datang dari cache atau dari handler.
func countingHandler(calls *int) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		*calls++
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(strconv.Itoa(*calls)))
	})
}

func get(h http.Handler, path, auth string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestResponseCache(t *testing.T) {
	var calls int
	c := NewResponseCache(time.Minute, 10)
	h := Chain(countingHandler(&calls), c.Cached())

	if r := get(h, "/products?page=1", ""); r.Header().Get("X-Cache") != "MISS" || r.Body.String() != "1" {
		t.Fatalf("request pertama harus MISS, dapat %q %q", r.Header().Get("X-Cache"), r.Body.String())
	}
	if r := get(h, "/products?page=1", ""); r.Header().Get("X-Cache") != "HIT" || r.Body.String() != "1" {
		t.Fatalf("request kedua harus HIT dari cache, dapat %q %q", r.Header().Get("X-Cache"), r.Body.String())
	}
	if r := get(h, "/products?page=2", ""); r.Body.String() != "2" {
		t.Fatalf("query berbeda harus jadi entri berbeda, dapat %q", r.Body.String())
	}
	if r := get(h, "/products?page=1", "Bearer x"); r.Body.String() != "3" {
		t.Fatalf("request dengan token tidak boleh dari cache, dapat %q", r.Body.String())
	}

	// Request tulis yang sukses mengosongkan cache.
	write := Chain(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}), c.InvalidateOnWrite("/cart"))
	write.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/products", nil))
	if r := get(h, "/products?page=1", ""); r.Header().Get("X-Cache") != "MISS" {
		t.Fatalf("setelah POST cache harus kosong, dapat %q", r.Header().Get("X-Cache"))
	}

	// Path yang dikecualikan tidak mengosongkan cache.
	write.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodPost, "/cart/items", nil))
	if r := get(h, "/products?page=1", ""); r.Header().Get("X-Cache") != "HIT" {
		t.Fatalf("POST /cart tidak boleh mengosongkan cache, dapat %q", r.Header().Get("X-Cache"))
	}
}

func TestResponseCacheSkipsErrorsAndStaleWrites(t *testing.T) {
	c := NewResponseCache(time.Minute, 10)

	notFound := Chain(http.NotFoundHandler(), c.Cached())
	get(notFound, "/products/x", "")
	if len(c.entries) != 0 {
		t.Fatal("response selain 200 tidak boleh disimpan")
	}

	// Cache dikosongkan saat response sedang dibuat: hasilnya tidak disimpan.
	slow := Chain(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c.Flush()
		_, _ = w.Write([]byte("data lama"))
	}), c.Cached())
	get(slow, "/categories", "")
	if len(c.entries) != 0 {
		t.Fatal("response yang dibuat sebelum cache dikosongkan tidak boleh disimpan")
	}
}
