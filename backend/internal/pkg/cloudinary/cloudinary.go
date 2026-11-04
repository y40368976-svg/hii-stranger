// Package cloudinary mengunggah gambar ke Cloudinary memakai Upload API
// bertanda tangan (signed upload). Hanya memakai standard library.
package cloudinary

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const (
	apiBase = "https://api.cloudinary.com/v1_1/"

	// requestTimeout membatasi lama satu unggahan ke Cloudinary.
	requestTimeout = 30 * time.Second
)

// ErrDisabled berarti kredensial Cloudinary belum diisi di environment.
var ErrDisabled = errors.New("cloudinary: not configured")

// Client menyimpan kredensial Cloudinary dan HTTP client dengan timeout.
type Client struct {
	cloudName string
	apiKey    string
	apiSecret string
	folder    string
	http      *http.Client
}

// New membuat Client. folder boleh kosong (gambar masuk ke root akun).
func New(cloudName, apiKey, apiSecret, folder string) *Client {
	return &Client{
		cloudName: cloudName,
		apiKey:    apiKey,
		apiSecret: apiSecret,
		folder:    folder,
		http:      &http.Client{Timeout: requestTimeout},
	}
}

// Enabled bernilai true bila semua kredensial sudah diisi.
func (c *Client) Enabled() bool {
	return c != nil && c.cloudName != "" && c.apiKey != "" && c.apiSecret != ""
}

// UploadImage mengirim data gambar ke Cloudinary dan mengembalikan secure_url
// (alamat https) yang bisa langsung disimpan sebagai image_url.
func (c *Client) UploadImage(ctx context.Context, filename string, data []byte) (string, error) {
	if !c.Enabled() {
		return "", ErrDisabled
	}

	timestamp := strconv.FormatInt(time.Now().Unix(), 10)

	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	fields := map[string]string{
		"api_key":   c.apiKey,
		"timestamp": timestamp,
		"signature": c.sign(timestamp),
	}
	if c.folder != "" {
		fields["folder"] = c.folder
	}
	for k, v := range fields {
		if err := mw.WriteField(k, v); err != nil {
			return "", fmt.Errorf("cloudinary: write field %s: %w", k, err)
		}
	}
	fw, err := mw.CreateFormFile("file", filename)
	if err != nil {
		return "", fmt.Errorf("cloudinary: create file part: %w", err)
	}
	if _, err := fw.Write(data); err != nil {
		return "", fmt.Errorf("cloudinary: write file part: %w", err)
	}
	if err := mw.Close(); err != nil {
		return "", fmt.Errorf("cloudinary: close multipart: %w", err)
	}

	endpoint := apiBase + url.PathEscape(c.cloudName) + "/image/upload"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, &body)
	if err != nil {
		return "", fmt.Errorf("cloudinary: new request: %w", err)
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("cloudinary: upload: %w", err)
	}
	defer resp.Body.Close()

	var out struct {
		SecureURL string `json:"secure_url"`
		Error     struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	// Batasi pembacaan response supaya tidak membaca body yang tidak wajar.
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&out); err != nil {
		return "", fmt.Errorf("cloudinary: decode response (status %d): %w", resp.StatusCode, err)
	}
	if resp.StatusCode != http.StatusOK || out.SecureURL == "" {
		return "", fmt.Errorf("cloudinary: upload status %d: %s", resp.StatusCode, out.Error.Message)
	}
	return out.SecureURL, nil
}

// sign membuat signature sesuai aturan Cloudinary: parameter (selain file,
// api_key, dan signature) diurutkan menurut nama, digabung "a=1&b=2", lalu
// ditambah api secret dan di-hash SHA-1.
func (c *Client) sign(timestamp string) string {
	params := "timestamp=" + timestamp
	if c.folder != "" {
		params = "folder=" + c.folder + "&" + params
	}
	sum := sha1.Sum([]byte(params + c.apiSecret))
	return hex.EncodeToString(sum[:])
}
