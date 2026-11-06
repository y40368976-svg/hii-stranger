# Perintah pengembangan backend. Jalankan dari direktori backend.
# Redis & PostgreSQL memakai yang terpasang di laptop (bukan Docker).
#   make test        semua test (test Redis di-skip bila Redis belum jalan)
#   make test-cache  test cache Redis saja, verbose
#   make check       fmt + vet + test

REDIS_TEST_ADDR ?= localhost:6379
export REDIS_TEST_ADDR

.PHONY: test test-v test-race test-cache vet fmt check

test:
	go test ./... -count=1

test-v:
	go test ./... -count=1 -v

test-race:
	go test ./... -count=1 -race

test-cache:
	go test ./internal/app/api/middleware -run ResponseCache -count=1 -v

vet:
	go vet ./...

fmt:
	gofmt -w cmd internal

check: fmt vet test
