# Open Tickets Barber

## Objetivo

Dar suporte a consumo continuo no balcao, como cervejas e outros produtos, sem obrigar fechamento imediato.

## Fluxo

1. abrir ticket com identificacao manual
2. opcionalmente vincular cliente cadastrado
3. adicionar produtos e servicos ao longo do tempo
4. manter o ticket em `open`
5. fechar depois com forma de pagamento

## UX

- secao `Tickets Abertos` em `/vendas`
- botao `Abrir Ticket`
- cards com:
  - nome/identificacao
  - horario de abertura
  - total parcial
  - resumo dos itens
  - acao `Adicionar Item`
  - acao `Fechar Conta`

## Regras

- pode haver varios tickets abertos ao mesmo tempo
- ticket aberto nao entra no faturamento pago
- ticket fechado entra no faturamento e no historico
- estoque baixa quando os produtos sao adicionados ao ticket aberto
