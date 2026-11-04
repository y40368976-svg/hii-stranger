package shipment

import (
	"context"
	"fmt"
	"log/slog"

	"hii-stranger1/backend/internal/pkg/mailer"
)

// Service berisi logika bisnis pengiriman.
type Service struct {
	repo *Repository
	mail *mailer.Mailer
}

// NewService membuat Service. mail boleh nonaktif (SMTP belum diisi).
func NewService(repo *Repository, mail *mailer.Mailer) *Service {
	return &Service{repo: repo, mail: mail}
}

// Get mengambil pengiriman order. Hanya pemilik order atau admin; selain itu
// dianggap tidak ada.
func (s *Service) Get(ctx context.Context, orderID, userID string, admin bool) (Shipment, error) {
	owner, err := s.repo.OrderOwner(ctx, orderID)
	if err != nil {
		return Shipment{}, err
	}
	if !admin && owner != userID {
		return Shipment{}, ErrOrderNotFound
	}
	return s.repo.GetByOrder(ctx, orderID)
}

// Upsert membuat atau memperbarui pengiriman (admin), lalu mengirim info
// kurir dan resi ke email pelanggan.
func (s *Service) Upsert(ctx context.Context, in Shipment) (Shipment, bool, error) {
	out, created, err := s.repo.Upsert(ctx, in)
	if err != nil {
		return Shipment{}, false, err
	}

	if c, err := s.repo.contactOf(ctx, out.OrderID); err == nil {
		resi := "-"
		if out.TrackingNumber != nil {
			resi = *out.TrackingNumber
		}
		s.mail.Notify(c.Email, "Update pengiriman order "+c.OrderNumber,
			fmt.Sprintf("Halo %s,\n\nInfo pengiriman order %s:\nKurir: %s\nNo. resi: %s\nStatus: %s\n\nTerima kasih!",
				c.Name, c.OrderNumber, out.CourierName, resi, out.ShippingStatus))
	} else {
		slog.WarnContext(ctx, "shipment: load contact for email failed", "error", err)
	}
	return out, created, nil
}
