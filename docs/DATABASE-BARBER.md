# Database Barber

## Tabelas centrais

- `appointments`
- `clients`
- `barbers`
- `services`
- `products`
- `tickets`
- `ticket_service_items`
- `ticket_product_items`
- `stock_movements`

## Modelo de tickets

Status suportados:

- `open`
- `paid`
- `cancelled`

## Campos relevantes em `tickets`

- `client_id`
- `barber_id`
- `appointment_id`
- `manual_client_name`
- `total_services`
- `total_products`
- `total_amount`
- `total_profit`
- `payment_method`
- `amount_paid`
- `change_amount`
- `status`
- `created_at`
- `closed_at`

## Regras operacionais

- ticket de appointment pode nascer e fechar direto como `paid`
- ticket avulso simples continua fechando direto
- ticket aberto nasce com `status = open`
- ticket aberto pode existir sem `appointment_id`
- ticket aberto pode existir com `client_id = null`, desde que tenha `manual_client_name`
- itens adicionados em ticket aberto devem atualizar totais
- produtos adicionados em ticket aberto devem registrar `stock_movements`

## Migration desta fase

Arquivo previsto:

- `supabase/migrations/20260506_open_tickets_support.sql`
