-- Migration: Update services table with current barber shop prices
-- Date: 2026-03-29
-- This updates existing services and adds new ones.
-- Ticket snapshots (ticket_service_items) are NOT affected — historical data is preserved.

-- Update existing services
UPDATE services SET price = 40.00, duration_minutes = 45 WHERE name = 'Corte Degrade';
UPDATE services SET price = 38.00, duration_minutes = 30 WHERE name = 'Barba Terapia';
-- Rename "Barba Terapia" to just "Barba" for clarity
UPDATE services SET name = 'Barba', price = 38.00, duration_minutes = 30 WHERE name = 'Barba Terapia';
UPDATE services SET price = 78.00, duration_minutes = 60, name = 'Corte Degradê + Barba' WHERE name = 'Corte + Barba';
UPDATE services SET price = 10.00, duration_minutes = 15, name = 'Acabamento' WHERE name = 'Pezinho/Acabamento';

-- Rename Corte Degrade -> Corte Degradê (with accent)
UPDATE services SET name = 'Corte Degradê' WHERE name = 'Corte Degrade';

-- Insert new services that don't exist yet
INSERT INTO services (name, price, duration_minutes, active)
SELECT 'Corte Social', 38.00, 40, true
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Corte Social');

INSERT INTO services (name, price, duration_minutes, active)
SELECT 'Corte Máquina', 28.00, 30, true
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Corte Máquina');

INSERT INTO services (name, price, duration_minutes, active)
SELECT 'Corte Social + Barba', 76.00, 60, true
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Corte Social + Barba');

INSERT INTO services (name, price, duration_minutes, active)
SELECT 'Sobrancelhas', 12.00, 10, true
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Sobrancelhas');
