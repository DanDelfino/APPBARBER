# Deploy VPS Barber

## Pre-condicoes

- branch local validada com:
  - `npm run lint`
  - `npm run check:harness`
  - `npm run build`
- migration `supabase/migrations/20260506_open_tickets_support.sql` revisada
- acesso administrativo ao banco do Supabase
- acesso SSH valido na VPS

## Revisao da migration

Arquivo:

- `supabase/migrations/20260506_open_tickets_support.sql`

Mudancas:

- adiciona `tickets.manual_client_name`
- adiciona `tickets.closed_at`
- adiciona indices em `status, created_at` e `appointment_id`

Caracteristicas:

- aditiva
- nao destrutiva
- nao altera enums existentes
- nao remove coluna
- nao renomeia tabela
- nao toca em dados antigos

Compatibilidade:

- tickets antigos continuam validos
- `status` ja suporta `open`, `paid` e `cancelled`
- tickets pagos antigos continuam funcionando sem `manual_client_name`
- `closed_at` pode ficar `null` em registros antigos sem impacto

## Backup logico do banco

Antes de aplicar a migration:

1. obter a connection string Postgres do Supabase
2. salvar dump logico

Exemplo:

```bash
pg_dump "<DATABASE_URL>" > backup_barber_2026-05-06.sql
```

Ou, para dump compactado:

```bash
pg_dump -Fc "<DATABASE_URL>" > backup_barber_2026-05-06.dump
```

## Aplicacao da migration

Recomendado:

1. aplicar primeiro em staging
2. validar fluxo completo
3. aplicar em producao

Exemplo com `psql`:

```bash
psql "<DATABASE_URL>" -f supabase/migrations/20260506_open_tickets_support.sql
```

## Validacao funcional apos migration

No banco e app:

1. abrir ticket sem agendamento
2. preencher `manual_client_name`
3. adicionar produto
4. confirmar `stock_movements`
5. confirmar total parcial no ticket
6. fechar ticket com pagamento
7. confirmar `status = paid`
8. confirmar `closed_at` preenchido
9. confirmar ticket entrou no faturamento
10. confirmar dashboard segue correto

## Atualizacao da VPS

No servidor:

```bash
cd /root/barber-app
git fetch origin work
git reset --hard origin/work
docker compose -f docker-compose.prod.yml up -d --build
docker logs --tail=100 barber-app
```

## Pos-deploy

Verificar:

- tela `/dashboard`
- tela `/agenda`
- tela `/vendas`
- criacao de cliente pela agenda
- abertura de mais de um ticket
- fechamento de ticket aberto
- ausencia de erro critico nos logs

## Bloqueios atuais

No momento desta preparacao:

- nao havia credencial administrativa do banco no workspace
- a VPS recusou autenticacao SSH no acesso atual

Por isso, este documento deixa o procedimento pronto para execucao segura assim que o acesso for restabelecido.
