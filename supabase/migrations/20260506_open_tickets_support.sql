-- Migration: support open tickets with manual identification and deferred checkout
-- Date: 2026-05-06
-- Safe additive migration. No destructive changes.

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS manual_client_name TEXT;

ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_tickets_status_created_at ON tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_appointment_id ON tickets(appointment_id);
