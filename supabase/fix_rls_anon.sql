-- ============================================
--  BARBER APP — FIX RLS PARA USUÁRIO ANÔNIMO
--  Execute no Supabase → SQL Editor → New query
-- ============================================

-- 1. Dar permissão de uso do schema para o usuário anônimo
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Dar permissão em todas as tabelas e sequências
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 3. Forçar as políticas de RLS para acesso total
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow full access" ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY "Allow full access" ON %I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;
