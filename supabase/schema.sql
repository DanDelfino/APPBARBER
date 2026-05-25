-- Barber App Supabase Schema

-- 1. Barbers
CREATE TABLE barbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Clients
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Services
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Products (Inventory)
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  cost_price NUMERIC(10, 2) NOT NULL,
  sale_price NUMERIC(10, 2) NOT NULL,
  current_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Appointments
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  notes TEXT,
  ticket_id UUID, -- Will be linked later
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tickets
CREATE TYPE payment_method_type AS ENUM ('cash', 'pix', 'credit_card', 'debit_card', 'other');
CREATE TYPE ticket_status AS ENUM ('open', 'paid', 'cancelled');

CREATE TABLE tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  manual_client_name TEXT,
  total_services NUMERIC(10, 2) DEFAULT 0,
  total_products NUMERIC(10, 2) DEFAULT 0,
  total_amount NUMERIC(10, 2) DEFAULT 0,
  total_profit NUMERIC(10, 2) DEFAULT 0,
  payment_method payment_method_type,
  amount_paid NUMERIC(10, 2) DEFAULT 0,
  change_amount NUMERIC(10, 2) DEFAULT 0,
  status ticket_status DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Add foreign key from appointments to tickets now that tickets table exists
ALTER TABLE appointments ADD CONSTRAINT fk_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL;

-- 7. Ticket Service Items
CREATE TABLE ticket_service_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name_snapshot TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL
);

-- 8. Ticket Product Items
CREATE TABLE ticket_product_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_cost NUMERIC(10, 2) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  unit_profit NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL
);

-- 9. Stock Movements
CREATE TYPE stock_movement_type AS ENUM ('in', 'out', 'adjustment');

CREATE TABLE stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  movement_type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(10, 2),
  reason TEXT,
  reference_type TEXT, -- e.g., 'ticket', 'manual'
  reference_id UUID, -- ticket_id if applicable
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Functions and Triggers

-- Trigger to update updated_at on products
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_modtime
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Function to handle stock movement trigger natively
CREATE OR REPLACE FUNCTION process_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE products SET current_stock = current_stock + NEW.quantity WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE products SET current_stock = current_stock - NEW.quantity WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'adjustment' THEN
    -- For adjustment, we assume the quantity is the delta (+ or -)
    UPDATE products SET current_stock = current_stock + NEW.quantity WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_on_movement
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION process_stock_movement();

-- 10. Shop Settings (White-Label + Configuration)
CREATE TABLE shop_settings (
  id INTEGER DEFAULT 1 PRIMARY KEY CHECK (id = 1), -- Singleton row
  shop_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  opening_hours TEXT DEFAULT '09:00 – 19:00',
  appointment_interval INTEGER DEFAULT 30,
  -- White-label branding
  brand_name TEXT DEFAULT 'BarberManager',
  brand_accent TEXT DEFAULT '#3b82f6',
  logo_url TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default row
INSERT INTO shop_settings (id) VALUES (1);

CREATE TRIGGER update_shop_settings_modtime
BEFORE UPDATE ON shop_settings
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- RLS (Row Level Security) - initially disabled or set to allow authenticated users
-- MVP: For now we'll just allow all authenticated users (admin only)
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_product_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access" ON barbers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON ticket_service_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON ticket_product_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access" ON shop_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
