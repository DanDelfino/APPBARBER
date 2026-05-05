-- ============================================
--  BARBER APP — SETUP COMPLETO
--  Execute no Supabase → SQL Editor → New query
--  Seguro para rodar múltiplas vezes (idempotente)
-- ============================================

-- ========== ENUM TYPES ==========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM ('scheduled','confirmed','in_progress','completed','cancelled','no_show');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
    CREATE TYPE payment_method_type AS ENUM ('cash','pix','credit_card','debit_card','other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM ('open','paid','cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
    CREATE TYPE stock_movement_type AS ENUM ('in','out','adjustment');
  END IF;
END $$;

-- ========== TABLES ==========

-- 1. Barbers
CREATE TABLE IF NOT EXISTS barbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Services
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  notes TEXT,
  ticket_id UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 6. Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  total_services NUMERIC(10,2) DEFAULT 0,
  total_products NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  total_profit NUMERIC(10,2) DEFAULT 0,
  payment_method payment_method_type,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  change_amount NUMERIC(10,2) DEFAULT 0,
  status ticket_status DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 7. Ticket Service Items
CREATE TABLE IF NOT EXISTS ticket_service_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name_snapshot TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL
);

-- 8. Ticket Product Items
CREATE TABLE IF NOT EXISTS ticket_product_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_cost NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  unit_profit NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL
);

-- 9. Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  movement_type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(10,2),
  reason TEXT,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 10. Shop Settings (White-Label)
CREATE TABLE IF NOT EXISTS shop_settings (
  id INTEGER DEFAULT 1 PRIMARY KEY CHECK (id = 1),
  shop_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  opening_hours TEXT DEFAULT '09:00 – 19:00',
  appointment_interval INTEGER DEFAULT 30,
  brand_name TEXT DEFAULT 'BarberManager',
  brand_accent TEXT DEFAULT '#3b82f6',
  logo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

INSERT INTO shop_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ========== FK appointment → ticket ==========
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ticket' AND table_name = 'appointments'
  ) THEN
    ALTER TABLE appointments ADD CONSTRAINT fk_ticket
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ========== FUNCTIONS & TRIGGERS ==========

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_modtime ON products;
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_shop_settings_modtime ON shop_settings;
CREATE TRIGGER update_shop_settings_modtime BEFORE UPDATE ON shop_settings
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE OR REPLACE FUNCTION process_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE products SET current_stock = current_stock + NEW.quantity WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE products SET current_stock = current_stock - NEW.quantity WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'adjustment' THEN
    UPDATE products SET current_stock = current_stock + NEW.quantity WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stock_on_movement ON stock_movements;
CREATE TRIGGER update_stock_on_movement AFTER INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION process_stock_movement();

-- ========== RLS + POLICIES ==========
-- Permite acesso para authenticated E anon (MVP / desenvolvimento)

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'barbers','clients','services','products','appointments',
    'tickets','ticket_service_items','ticket_product_items',
    'stock_movements','shop_settings'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access" ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY "Allow full access" ON %I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;

-- ========== DONE ==========
-- Todas as tabelas, triggers e policies estão configuradas!
