-- ============================================
--  BARBER APP — SQL PARA EXECUTAR NO SUPABASE
--  Execute este script no SQL Editor do Supabase
--  Dashboard → SQL Editor → New query → Cole e execute
-- ============================================

-- Se as tabelas já existem, este script vai apenas adicionar
-- as que faltam (shop_settings). Se estiver começando do zero,
-- rode o schema.sql completo.

-- Tabela shop_settings (White-Label + Configuração)
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir registro padrão (ignora se já existir)
INSERT INTO shop_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Trigger de updated_at (cria a function se não existir)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_shop_settings_modtime ON shop_settings;
CREATE TRIGGER update_shop_settings_modtime
BEFORE UPDATE ON shop_settings
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- RLS
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;

-- Remove policy se já existir (para evitar erro de duplicata)
DROP POLICY IF EXISTS "Allow authenticated full access" ON shop_settings;
CREATE POLICY "Allow authenticated full access" ON shop_settings
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ========== DONE ==========
-- Após executar, sua tabela shop_settings estará pronta!
-- Configure o branding em: /barber/configuracoes
