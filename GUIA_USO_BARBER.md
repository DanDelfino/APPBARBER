# Guia de Uso do Barber

URL do sistema: `https://dfautomatic.cloud/barber`

## 1. Como entrar

1. Abra o link do sistema.
2. Digite seu email e senha.
3. Clique em `Entrar`.

## 2. Primeira configuração

Antes de usar no dia a dia, cadastre o básico nesta ordem:

1. Vá em `Configurações`.
2. Preencha os dados da barbearia:
   - nome
   - telefone
   - endereço
   - horário de funcionamento
   - intervalo entre agendamentos
3. Em `Equipe — Barbeiros`, clique em `Adicionar` e cadastre os profissionais.
4. Em `White-Label / Branding`, ajuste nome da marca, cor e logo se quiser.
5. Clique em `Salvar Configurações`.

Observação: depois de mudar branding, vale recarregar a página para ver tudo aplicado.

## 3. Cadastro inicial

### Barbeiros

1. Entre em `Barbeiros`.
2. Clique em `Novo Barbeiro`.
3. Preencha nome e telefone.
4. Deixe como ativo se ele estiver atendendo.

### Serviços

1. Entre em `Serviços`.
2. Clique em `Novo Serviço`.
3. Preencha:
   - nome do serviço
   - preço
   - duração em minutos
   - status ativo
4. Salve.

Dica: na lista de serviços, o preço pode ser editado direto na tabela clicando no valor.

### Produtos e estoque

1. Entre em `Estoque`.
2. Clique em `Novo Produto`.
3. Preencha:
   - nome
   - categoria
   - preço de custo
   - preço de venda
   - estoque inicial
   - estoque mínimo
4. Salve.

Depois, quando precisar corrigir quantidade:

1. Clique no botão de ajuste de estoque do produto.
2. Escolha `+ Entrada` ou `− Saída`.
3. Informe a quantidade.
4. Confirme.

### Clientes

1. Entre em `Clientes`.
2. Clique em `Novo Cliente`.
3. Preencha nome, telefone e observações se quiser.
4. Salve.

Também dá para importar clientes por CSV em `Importar CSV`.

## 4. Como agendar atendimento

1. Vá em `Agenda`.
2. Escolha o dia.
3. Se quiser, filtre por barbeiro.
4. Clique em `Novo Agendamento`.
5. Preencha:
   - cliente
   - barbeiro
   - serviço
   - horário de início
   - observações
6. Clique em `Confirmar Agendamento`.

O sistema bloqueia conflito de horário do mesmo barbeiro.

## 5. Como atender e fechar uma venda

Essa é a parte principal do sistema.

1. Vá em `PDV / Vendas`.
2. Em `1. Selecione o Atendimento`, escolha um agendamento em aberto.
3. Se for uma venda sem agendamento, escolha `Venda Avulsa`.
4. Confira o cliente e o profissional.
5. Em `Serviços do Atendimento`, ajuste:
   - quantidade
   - preço
   - serviços extras, se precisar
6. Em `2. Consumo Extra`, adicione bebidas ou produtos.
7. No painel da direita, confira o `Resumo da Venda`.
8. Escolha a forma de pagamento.
9. Se for dinheiro, informe o valor recebido para calcular troco.
10. Clique em `Finalizar Ticket`.

Quando a venda é concluída:

- o ticket é criado
- o estoque dos produtos baixa
- o agendamento fica fechado
- a venda aparece em `Vendas Recentes`

## 6. Como cadastrar cliente rápido dentro da venda

Na tela `PDV / Vendas`:

1. Clique em `Novo Cliente`.
2. Preencha nome e telefone.
3. Clique em `Cadastrar`.

Depois disso, o cliente já fica disponível no sistema.

## 7. Como cancelar um agendamento

1. Vá em `Agenda`.
2. Abra o dia do agendamento.
3. Clique no botão de cancelar.
4. Informe o motivo.
5. Confirme.

## 8. Como acompanhar resultados

### Dashboard

Use o `Dashboard` para ver rapidamente:

- agendamentos do dia
- faturamento do dia
- novos clientes
- itens com estoque baixo

### Relatórios

Use `Relatórios` para acompanhar:

- faturamento total
- ticket médio
- total de agendamentos
- percentual de cancelamento
- faturamento por dia

Você pode alternar entre `7d`, `30d` e `90d`.

## 9. Rotina recomendada para uso diário

### Antes de abrir a barbearia

1. Verifique a `Agenda`.
2. Confira produtos com estoque baixo no `Dashboard` ou `Estoque`.

### Durante o dia

1. Cadastre clientes novos se necessário.
2. Crie os agendamentos na `Agenda`.
3. Na hora do pagamento, feche tudo em `PDV / Vendas`.

### No fim do dia

1. Abra `Relatórios`.
2. Confira faturamento e ticket médio.
3. Veja se algum produto precisa reposição.

## 10. Cuidados importantes

- Cadastre barbeiros como ativos para eles aparecerem nos agendamentos.
- Cadastre serviços com duração correta para evitar conflito na agenda.
- Feche a venda sempre pela tela `PDV / Vendas` para o estoque baixar certo.
- Se um atendimento já foi fechado, ele não deve voltar a aparecer no seletor do PDV.

## 11. Fluxo mais simples para quem vai operar

Se a pessoa for usar o sistema sem mexer em configuração:

1. Entrar no sistema.
2. Abrir `Agenda`.
3. Criar o agendamento.
4. Quando o cliente pagar, abrir `PDV / Vendas`.
5. Selecionar o atendimento.
6. Adicionar bebida ou produto, se houver.
7. Escolher pagamento.
8. Clicar em `Finalizar Ticket`.

