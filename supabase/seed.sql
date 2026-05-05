-- Insert mock data for testing. Run this in your Supabase SQL editor.

-- 1. Barbers
INSERT INTO barbers (name, phone, active) VALUES
('Carlos Silva', '(11) 99999-1111', true),
('Roberto Alves', '(11) 98888-2222', true);

-- 2. Clients
INSERT INTO clients (name, phone, notes) VALUES
('João Nogueira', '(11) 97777-3333', 'Gosta de corte disfarçado'),
('Pedro Santos', '(11) 96666-4444', 'Cliente fiel, toda quinzena'),
('Lucas Mendes', '(11) 95555-5555', '');

-- 3. Services (Tabela de Preços Vigente)
INSERT INTO services (name, price, duration_minutes, active) VALUES
('Corte Social', 38.00, 40, true),
('Corte Degradê', 40.00, 45, true),
('Corte Máquina', 28.00, 30, true),
('Barba', 38.00, 30, true),
('Corte Social + Barba', 76.00, 60, true),
('Corte Degradê + Barba', 78.00, 60, true),
('Sobrancelhas', 12.00, 10, true),
('Acabamento', 10.00, 15, true);

-- 4. Products
INSERT INTO products (name, category, cost_price, sale_price, current_stock, min_stock, active) VALUES
('Cerveja Heineken Long Neck', 'Bebida Alcoólica', 5.50, 12.00, 24, 10, true),
('Cerveja Budweiser Long Neck', 'Bebida Alcoólica', 4.50, 10.00, 12, 10, true),
('Refrigerante Coca-Cola Lata', 'Sem Álcool', 2.80, 6.00, 30, 12, true),
('Água Mineral Sem Gás', 'Sem Álcool', 1.20, 3.50, 15, 6, true),
('Pomada Modeladora Efeito Matte', 'Estética', 18.00, 45.00, 3, 5, true); -- Low stock example

-- 5. Appointments (Random assignments for today)
DO $$
DECLARE
  barber_carlos UUID;
  barber_roberto UUID;
  client_joao UUID;
  client_pedro UUID;
  service_degrade UUID;
  service_combo UUID;
BEGIN
  SELECT id INTO barber_carlos FROM barbers WHERE name = 'Carlos Silva' LIMIT 1;
  SELECT id INTO barber_roberto FROM barbers WHERE name = 'Roberto Alves' LIMIT 1;
  
  SELECT id INTO client_joao FROM clients WHERE name = 'João Nogueira' LIMIT 1;
  SELECT id INTO client_pedro FROM clients WHERE name = 'Pedro Santos' LIMIT 1;
  
  SELECT id INTO service_degrade FROM services WHERE name = 'Corte Degradê' LIMIT 1;
  SELECT id INTO service_combo FROM services WHERE name = 'Corte Degradê + Barba' LIMIT 1;

  -- Today at 10:00 - Carlos (Scheduled)
  INSERT INTO appointments (client_id, barber_id, service_id, appointment_date, start_time, end_time, status)
  VALUES (client_joao, barber_carlos, service_degrade, CURRENT_DATE, '10:00:00', '10:45:00', 'scheduled');

  -- Today at 14:00 - Roberto (Confirmed)
  INSERT INTO appointments (client_id, barber_id, service_id, appointment_date, start_time, end_time, status)
  VALUES (client_pedro, barber_roberto, service_combo, CURRENT_DATE, '14:00:00', '15:00:00', 'confirmed');
END $$;
