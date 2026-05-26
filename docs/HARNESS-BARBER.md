# Harness Barber

## Objetivo

Validar os fluxos essenciais do barber-app com cenarios operacionais reais, focando em dashboard, agenda e vendas.

## Cenarios ativos

- `H017 - dashboard conta todos os atendimentos do dia`
  A metrica principal de atendimentos deve contar todos os `appointments` com `appointment_date` igual ao dia atual, incluindo `cancelled` e `no_show`.

- `H018 - dashboard lista todos os atendimentos do dia`
  A secao "Hoje" deve listar todos os atendimentos retornados para o dia, com status visivel por linha.

- `H019 - agenda permite criar cliente via modal`
  Na tela `/agenda`, o usuario consegue abrir `Novo Cliente`, salvar com nome obrigatorio e seguir no fluxo sem recarregar a pagina inteira.

- `H020 - abrir ticket avulso sem agendamento`
  Na tela `/vendas`, o usuario consegue abrir um ticket com identificacao manual sem depender de appointment.

- `H021 - adicionar multiplos produtos no mesmo ticket`
  Um mesmo ticket aberto aceita varias adicoes de produtos ao longo do tempo, mantendo o total parcial correto.

- `H022 - manter varios tickets abertos ao mesmo tempo`
  O sistema exibe mais de um ticket aberto simultaneamente e permite alternar entre eles sem misturar itens.

- `H023 - fechar ticket aberto com pagamento`
  Um ticket com status `open` pode ser fechado com forma de pagamento e muda para `paid`.

- `H024 - ticket aberto nao entra como pago antes do fechamento`
  Tickets `open` nao aparecem em vendas pagas nem no faturamento do dia antes do checkout final.

- `H025 - ticket fechado entra no faturamento`
  Depois do fechamento, o ticket passa a compor o faturamento e o historico de vendas recentes.

- `H026 - remover item de ticket aberto`
  O operador consegue remover um item salvo de um ticket com status `open`, e o total parcial e a quantidade do ticket sao recalculados na hora.

- `H027 - estoque volta ao remover produto de ticket aberto`
  Quando um produto e removido de um ticket `open`, o sistema registra estorno no estoque e o `current_stock` volta corretamente.

- `H028 - valor em aberto nao entra como faturamento pago`
  O dashboard separa claramente `Faturamento Pago Hoje`, `Valor em Aberto` e `Tickets Abertos`, sem somar tickets `open` no caixa pago.
