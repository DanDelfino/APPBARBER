# Multi-tenant Barber Plan

## 1. Diagnostico single-tenant atual

O projeto atual foi modelado como uma unica operacao.

Sinais tecnicos disso:

- Nao existe tabela `barbershops`.
- Nao existe coluna `barbershop_id` nas tabelas operacionais.
- `shop_settings` e singleton via `id = 1`, o que pressupoe apenas uma barbearia.
- O login carrega branding global de `shop_settings`.
- O middleware autentica usuario, mas nao resolve contexto de barbearia.
- As queries do app filtram por data, status ou `active`, mas nao por tenant.
- As policies de RLS atuais sao `USING (true)` para qualquer usuario autenticado.

Resumo do risco atual:

- qualquer usuario autenticado enxerga todos os dados;
- nao existe isolamento por unidade;
- branding, agenda, estoque, vendas e relatorios sao globais.

## 2. Arquitetura multi-tenant recomendada

Modelo recomendado: base unica com isolamento logico por `barbershop_id`.

Principios:

- cada registro operacional pertence a uma barbearia;
- todo acesso privado precisa conhecer a barbearia atual;
- toda query privada precisa filtrar por `barbershop_id`;
- todo usuario autenticado acessa somente barbearias presentes em `barbershop_users`;
- o tenant atual deve ser resolvido no servidor, nao apenas no cliente;
- a producao atual deve continuar funcionando durante a migracao.

Entidade principal:

```txt
barbershops
```

Campos recomendados:

```txt
id UUID PK
name TEXT
slug TEXT UNIQUE
logo_url TEXT
phone TEXT
address TEXT
timezone TEXT
active BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Tabela de associacao usuario x barbearia:

```txt
barbershop_users
```

Campos:

```txt
id UUID PK
barbershop_id UUID FK -> barbershops.id
user_id UUID FK -> auth.users.id
role TEXT
active BOOLEAN
created_at TIMESTAMPTZ
```

Roles:

```txt
owner
manager
barber
reception
```

## 3. Tabelas novas

### 3.1 `barbershops`

Responsavel por representar cada unidade/cliente.

### 3.2 `barbershop_users`

Responsavel por definir:

- a quais barbearias um usuario pertence;
- qual papel ele possui em cada uma;
- se o acesso esta ativo.

### 3.3 Tabela opcional futura: `user_last_barbershop`

Nao e necessaria na primeira fase, mas pode ser util para persistir a ultima barbearia selecionada por usuario e melhorar UX.

## 4. Colunas novas

Adicionar `barbershop_id` em:

```txt
clients
appointments
tickets
products
services
barbers
settings
```

No estado atual do projeto, a tabela de configuracao se chama `shop_settings`, nao `settings`.

Recomendacao de baixo risco:

- manter o nome `shop_settings` por enquanto;
- remover o padrao singleton `id = 1`;
- adicionar `barbershop_id`;
- criar restricao `UNIQUE (barbershop_id)`.

Tambem recomendo adicionar `barbershop_id` nas tabelas derivadas para manter consistencia e simplificar RLS:

```txt
ticket_service_items
ticket_product_items
stock_movements
```

Mesmo que essas tabelas possam ser inferidas pelo `ticket_id` ou `product_id`, ter `barbershop_id` proprio reduz joins em policy, auditoria e debugging.

## 5. Queries que precisam mudar

Hoje o app usa Supabase direto nas telas e quase todas as consultas assumem dados globais.

Arquivos de impacto imediato:

### 5.1 Agenda

- `src/app/(app)/agenda/page.tsx`
- `src/app/(app)/agenda/CreateAppointmentModal.tsx`

Mudancas necessarias:

- listar barbeiros por `barbershop_id`;
- listar agendamentos por `barbershop_id`;
- validar conflito por `barber_id + barbershop_id + appointment_date`;
- inserir novo agendamento com `barbershop_id`.

### 5.2 Dashboard

- `src/app/(app)/dashboard/page.tsx`

Mudancas necessarias:

- `appointments` do dia filtrados por `barbershop_id`;
- `tickets` pagos do dia filtrados por `barbershop_id`;
- `clients` recentes filtrados por `barbershop_id`;
- `products` com estoque baixo filtrados por `barbershop_id`.

### 5.3 Vendas

- `src/app/(app)/vendas/page.tsx`

Mudancas necessarias:

- produtos ativos por `barbershop_id`;
- servicos ativos por `barbershop_id`;
- agendamentos abertos por `barbershop_id`;
- tickets recentes por `barbershop_id`;
- insercao de `tickets`, `ticket_service_items`, `ticket_product_items` e `stock_movements` com `barbershop_id`;
- update de `appointments` para `completed` filtrando tambem `barbershop_id`.

### 5.4 Clientes

- `src/app/(app)/clientes/page.tsx`

Mudancas necessarias:

- CRUD inteiro por `barbershop_id`.

### 5.5 Barbeiros

- `src/app/(app)/barbeiros/page.tsx`
- `src/app/(app)/configuracoes/page.tsx`

Mudancas necessarias:

- CRUD por `barbershop_id`;
- ativacao/desativacao por barbearia atual.

### 5.6 Servicos

- `src/app/(app)/servicos/page.tsx`

Mudancas necessarias:

- CRUD por `barbershop_id`.

### 5.7 Estoque

- `src/app/(app)/estoque/page.tsx`

Mudancas necessarias:

- produtos e movimentacoes por `barbershop_id`.

### 5.8 Relatorios

- `src/app/(app)/relatorios/page.tsx`

Mudancas necessarias:

- tickets e appointments filtrados por `barbershop_id`.

### 5.9 Branding e login

- `src/components/providers/WhiteLabelProvider.tsx`
- `src/app/login/page.tsx`

Mudancas necessarias:

- carregar `shop_settings` da barbearia atual;
- parar de usar `eq('id', 1)`;
- usar `barbershop_id` resolvido pelo contexto de tenant.

Observacao importante:

o app ainda nao possui uma camada centralizada de repositorio/servico para dados. Como as queries estao espalhadas nas paginas, a migracao tem mais risco se for feita de forma big bang. Vale muito criar uma camada de acesso a dados logo no inicio da migracao.

## 6. Impacto em RLS

O RLS atual e inadequado para multi-tenant.

Estado atual:

- todas as tabelas principais possuem policy de acesso total para `authenticated`;
- isso permite vazamento total entre barbearias.

Modelo recomendado:

### 6.1 Contexto de autorizacao

Toda policy privada deve validar que:

- existe um registro ativo em `barbershop_users`;
- o `user_id = auth.uid()`;
- o `barbershop_id` do registro consultado e igual ao da associacao do usuario.

Exemplo conceitual:

```sql
exists (
  select 1
  from barbershop_users bu
  where bu.user_id = auth.uid()
    and bu.barbershop_id = <table>.barbershop_id
    and bu.active = true
)
```

### 6.2 Tabelas privadas

Aplicar RLS por `barbershop_id` em:

- clients
- barbers
- services
- products
- appointments
- tickets
- ticket_service_items
- ticket_product_items
- stock_movements
- shop_settings

### 6.3 Regras por papel

Na primeira fase, pode haver policy uniforme por associacao ativa.

Depois, evoluir por role:

- `owner` e `manager`: acesso total
- `reception`: agenda, clientes, vendas e leitura operacional
- `barber`: agenda propria, leitura limitada e sem configuracoes sensiveis

### 6.4 Publico `/agendamento`

O agendamento publico nao deve depender de `authenticated`.

Recomendacao:

- criar policies separadas e minimas para leitura publica de servicos, barbeiros ativos e configuracao publica da barbearia resolvida por slug;
- insercao publica de agendamento deve validar `barbershop_id`, barbeiro e conflito.

## 7. Impacto em middleware/auth

Arquivo atual:

- `src/lib/middleware.ts`

Hoje o middleware:

- apenas resolve sessao;
- decide entre `/login` e `/dashboard`;
- nao escolhe tenant.

Para multi-tenant, o middleware ou uma camada server-side equivalente precisa:

- identificar usuario autenticado;
- descobrir as barbearias ativas desse usuario;
- definir barbearia atual;
- persistir contexto atual em cookie seguro, header interno ou rota;
- redirecionar usuario sem tenant para onboarding/selecao de unidade.

Fluxo recomendado:

1. usuario faz login;
2. servidor busca `barbershop_users` ativos;
3. se houver 1 barbearia, define contexto automaticamente;
4. se houver mais de 1, direciona para seletor de unidade;
5. toda rota privada passa a depender desse contexto.

Recomendacao tecnica:

- nao confiar apenas em `localStorage`;
- tenant atual deve ser conhecido no servidor para SSR, middleware, branding e RLS.

## 8. Impacto em /dashboard

O dashboard atual e global.

Hoje ele calcula:

- agendamentos do dia;
- faturamento do dia;
- novos clientes;
- estoque baixo.

Em multi-tenant, tudo isso deve ser calculado somente para a barbearia atual.

Risco se nao mudar:

- o dono de uma barbearia pode ver numeros de outra;
- metricas ficam incorretas mesmo sem vazamento explicito.

Recomendacao:

- toda query receber `currentBarbershopId`;
- encapsular essas metricas em um servico `getDashboardMetrics(barbershopId)`.

## 9. Impacto em /vendas

`/vendas` e uma das telas mais sensiveis.

Ela cruza:

- produtos;
- servicos;
- agendamentos;
- tickets;
- itens de ticket;
- movimentacao de estoque.

Pontos obrigatorios:

- `Venda avulsa` continua permitida;
- cliente continua opcional em venda;
- todos os inserts e updates precisam carregar `barbershop_id`;
- um ticket nunca pode apontar para appointment de outra barbearia;
- estoque precisa baixar somente no catalogo da barbearia atual.

Recomendacao adicional:

- validar integridade em banco para impedir mistura de FKs entre tenants;
- sempre que possivel, validar `ticket.barbershop_id == appointment.barbershop_id == product.barbershop_id`.

## 10. Impacto em /agendamento

No codigo atual, o fluxo principal de agenda e interno e autenticado.

Ainda nao existe uma rota publica dedicada de agendamento no app atual, entao essa parte deve ser tratada como evolucao planejada.

### Escolha principal de rota

Recomendacao principal:

```txt
/agendamento/[barbershopSlug]
```

Justificativa:

- menor risco de conflito com rotas privadas ja existentes;
- mais simples de introduzir sem reorganizar toda a arvore de rotas;
- explicita que se trata de fluxo publico;
- facilita migracao futura para subdominio;
- simplifica middleware e resolucao por slug.

### Por que nao escolher B como principal

```txt
/[barbershopSlug]/agendamento
```

Desvantagens:

- maior risco de conflito com rotas atuais e futuras no topo da aplicacao;
- exige cuidado extra com rotas reservadas como `login`, `dashboard`, `vendas` e outras;
- aumenta custo de refactor estrutural.

### Opcao C futura

```txt
cliente.seudominio.com/agendamento
```

Recomendacao:

- tratar como evolucao futura;
- internamente ainda resolver para a mesma logica do slug;
- manter `slug` como chave canonica mesmo quando houver subdominio.

### Regras do agendamento publico

- resolver a barbearia por `slug`;
- mostrar apenas barbeiros/servicos ativos daquela barbearia;
- criar agendamento com `barbershop_id`;
- validar conflito por `barber_id + barbershop_id + appointment_date`.

## 11. Plano de migracao em fases

### Fase 0 - Preparacao

- mapear todas as queries atuais;
- confirmar tabelas reais em producao;
- confirmar se existe apenas uma barbearia ativa hoje;
- definir tenant padrao de migracao.

### Fase 1 - Banco sem quebra

- criar `barbershops`;
- criar `barbershop_users`;
- adicionar `barbershop_id` nullable nas tabelas existentes;
- adicionar indices por `barbershop_id`;
- criar uma barbearia default representando a operacao atual;
- backfill de todos os registros atuais para essa barbearia default;
- adaptar `shop_settings` para deixar de ser singleton e passar a ser por tenant.

Importante:

- nesta fase, nao endurecer RLS ainda;
- manter compatibilidade com producao atual.

### Fase 2 - Camada de contexto

- criar resolucao de `currentBarbershopId` no servidor;
- criar seletor de unidade para usuarios multi-barbearia;
- adaptar login, middleware e branding.

### Fase 3 - Aplicacao privada

- atualizar dashboard;
- atualizar agenda;
- atualizar vendas;
- atualizar clientes;
- atualizar barbeiros;
- atualizar servicos;
- atualizar estoque;
- atualizar relatorios.

Meta:

- toda query privada passa a usar `barbershop_id`.

### Fase 4 - RLS real

- trocar policies abertas por policies de tenant;
- validar tudo primeiro em homologacao;
- liberar por tabela, nao tudo de uma vez.

### Fase 5 - Agendamento publico

- criar rota publica por slug;
- expor apenas dados publicos minimos;
- validar conflito e insercao por tenant;
- depois considerar subdominio.

### Fase 6 - Otimizacao

- revisar indices;
- revisar desempenho de joins com `barbershop_users`;
- revisar auditoria e monitoramento;
- opcionalmente centralizar acesso a dados em services/repositories.

## 12. Riscos

### 12.1 Vazamento de dados entre tenants

Maior risco do projeto. Acontece se alguma query ou policy esquecer `barbershop_id`.

### 12.2 Quebra em branding e configuracoes

Hoje `shop_settings` depende de `id = 1`. Migrar isso sem compatibilidade quebra login, topbar e sidebar.

### 12.3 Queries espalhadas no frontend

Como ha muitas queries diretas nas paginas, existe chance de alguma tela ficar global sem perceber.

### 12.4 Integridade cruzada

Sem validacao adequada, um ticket pode referenciar appointment, service ou product de outra barbearia.

### 12.5 Usuarios multiunidade

Se um usuario pertencer a mais de uma barbearia, e preciso definir claramente:

- como escolhe a unidade atual;
- como troca de unidade;
- o que acontece em refresh de pagina.

### 12.6 Publico e privado no mesmo projeto

O agendamento publico exige regras diferentes de auth e RLS. Misturar isso sem desenho claro pode abrir acesso indevido.

## 13. Checklist de validacao

### Banco

- `barbershops` criada
- `barbershop_users` criada
- `barbershop_id` adicionada nas tabelas-alvo
- backfill executado com tenant default
- indices criados por `barbershop_id`
- `shop_settings` deixa de depender de `id = 1`

### Aplicacao

- dashboard filtrando por tenant
- agenda filtrando por tenant
- vendas filtrando por tenant
- clientes filtrando por tenant
- barbeiros filtrando por tenant
- servicos filtrando por tenant
- estoque filtrando por tenant
- relatorios filtrando por tenant
- branding carregando configuracao da barbearia atual

### Auth e tenant context

- usuario sem associacao ativa bloqueado
- usuario com 1 barbearia entra direto
- usuario com varias barbearias consegue selecionar unidade
- tenant atual persiste entre navegacoes

### RLS

- usuario de uma barbearia nao consegue ler dados de outra
- usuario de uma barbearia nao consegue inserir dados em outra
- policies publicas do agendamento nao vazam dados privados

### Regras de negocio

- venda avulsa continua funcionando
- cliente opcional em venda continua funcionando
- conflito de agenda continua validando por barbeiro + barbearia
- agendamento concluido nao reaparece no PDV de outra unidade

## Recomendacao final

O caminho de menor risco e:

1. introduzir `barbershops` e `barbershop_users`;
2. backfillar tudo para uma barbearia default;
3. criar contexto server-side de tenant;
4. adaptar queries privadas por fases;
5. so depois endurecer RLS.

Esse caminho preserva a producao atual, reduz risco de vazamento e prepara o Barber para operar varias barbearias na mesma base com custo operacional baixo.
