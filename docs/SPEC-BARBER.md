# Spec Barber

## Escopo atual

O barber-app cobre:

- agenda de atendimentos
- cadastro de clientes
- barbeiros
- servicos
- estoque
- vendas e fechamento
- dashboard operacional

## Fase 8

Esta fase adiciona tres melhorias operacionais:

### 1. Dashboard confiavel no dia

- a metrica `Atendimentos de Hoje` deve refletir todos os appointments do dia
- a secao `Hoje` deve listar os atendimentos com status explicito
- cancelados nao podem sumir silenciosamente

### 2. Cliente rapido pela agenda

- a agenda passa a ter `Novo Cliente`
- o modal aceita:
  - nome obrigatorio
  - telefone opcional
  - observacao opcional
- o cadastro deve servir ao fluxo rapido da recepcao

### 3. Tickets abertos

- um ticket pode nascer sem agendamento
- um ticket pode ficar `open` por algum tempo
- o ticket aberto pode receber novos produtos e servicos em varias rodadas
- varios tickets abertos podem coexistir
- o faturamento so considera ticket `paid`

## Regras de negocio mantidas

- venda avulsa simples continua existindo
- cliente segue opcional em venda avulsa
- appointments continuam podendo gerar ticket fechado direto
- o `/agendamento` publico nao faz parte desta fase
