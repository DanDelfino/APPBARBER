# Validation Barber

## Validacao local

Comandos executados:

```bash
npm run lint
npm run check:harness
npm run build
```

Resultado:

- `lint`: passou sem erros, apenas warnings antigos do repo
- `check:harness`: passou
- `build`: passou

## Validacao da migration

Migration revisada:

- `supabase/migrations/20260506_open_tickets_support.sql`

Checklist:

- adiciona apenas colunas novas
- adiciona apenas indices novos
- nao altera dados antigos
- nao quebra tickets pagos existentes
- continua compativel com `status open/paid/cancelled`

## Validacao funcional esperada apos aplicar no banco

### Dashboard

- `Atendimentos de Hoje` deve contar todos os appointments do dia
- secao `Hoje` deve listar todos os atendimentos do dia
- cancelados devem aparecer com status explicito

### Agenda

- `Novo Cliente` no cabecalho funciona
- `Novo Cliente` dentro do modal de agendamento funciona
- cliente recem-criado aparece para selecao sem reload completo

### Tickets abertos

- abrir ticket com identificacao manual
- abrir dois ou mais tickets ao mesmo tempo
- adicionar cerveja/produto em um ticket
- adicionar novos itens depois no mesmo ticket
- fechar ticket com pagamento
- ticket `open` nao entrar no faturamento pago
- ticket `paid` entrar no faturamento e no historico
- estoque baixar ao adicionar item em ticket aberto

## Validacao na VPS

Comandos planejados:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker logs --tail=100 barber-app
```

## Bloqueios desta rodada

- sem acesso administrativo ao banco do Supabase para backup e migration real
- sem autenticacao SSH valida na VPS para deploy final nesta sessao

## Proximo passo para concluir Fase 9

Fornecer um destes acessos:

- `DATABASE_URL` ou credencial administrativa do Supabase
- ou SSH valido na VPS

Com isso, a execucao final fica:

1. backup logico
2. aplicacao da migration
3. validacao ponta a ponta
4. deploy na VPS
5. checagem de logs
