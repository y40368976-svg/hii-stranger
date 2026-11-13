package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGinMux(t *testing.T) {
	m := newGinMux()
	var gotPattern, gotID, gotSub string
	m.HandleFunc("GET /api/v1.2.8/orders/{orderId}", func(w http.ResponseWriter, r *http.Request) {
		gotPattern, gotID = r.Pattern, r.PathValue("orderId")
		w.WriteHeader(http.StatusOK)
	})
	m.HandleFunc("GET /api/v1.2.8/orders/{orderId}/payment/proof", func(w http.ResponseWriter, r *http.Request) {
		gotSub = r.PathValue("orderId")
		w.WriteHeader(http.StatusOK)
	})
	m.HandleFunc("GET /api/v1.2.8/orders", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	m.HandleFunc("/", notFound)

	tests := []struct {
		method, path string
		want         int
	}{
		{http.MethodGet, "/api/v1.2.8/orders/abc", http.StatusOK},
		{http.MethodGet, "/api/v1.2.8/orders/xyz/payment/proof", http.StatusOK},
		{http.MethodGet, "/api/v1.2.8/orders", http.StatusOK},
		{http.MethodGet, "/api/v1.2.8/orders/", http.StatusNotFound},
		{http.MethodDelete, "/api/v1.2.8/orders/abc", http.StatusNotFound},
		{http.MethodGet, "/api/v1.2.8/tidak-ada", http.StatusNotFound},
	}
	for _, tc := range tests {
		rec := httptest.NewRecorder()
		m.ServeHTTP(rec, httptest.NewRequest(tc.method, tc.path, nil))
		if rec.Code != tc.want {
			t.Errorf("%s %s = %d, want %d", tc.method, tc.path, rec.Code, tc.want)
		}
	}
	if gotPattern != "GET /api/v1.2.8/orders/{orderId}" || gotID != "abc" {
		t.Errorf("pattern = %q, orderId = %q", gotPattern, gotID)
	}
	if gotSub != "xyz" {
		t.Errorf("nested orderId = %q", gotSub)
	}
}
