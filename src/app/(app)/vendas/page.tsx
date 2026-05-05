'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Scissors, Coffee, CheckCircle, History, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { normalizeName, normalizePhone } from '@/lib/utils';
import styles from './Vendas.module.css';

interface Product {
  id: string;
  name: string;
  category: string;
  cost_price: number;
  sale_price: number;
  current_stock: number;
}

interface CartItem {
  id: string;
  product_id: string;
  name: string;
  unit_price: number;
  unit_cost: number;
  quantity: number;
}

/* === Service Cart Item === */
interface ServiceCartItem {
  uid: string; // unique key for React
  service_id: string;
  name: string;
  price: number; // editable price for this line
  quantity: number;
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  active: boolean;
}

interface OpenAppointment {
  id: string;
  client_id: string;
  barber_id: string;
  service_id: string;
  services: { name: string, price: number };
  clients: { name: string };
  barbers: { name: string };
}

export default function VendasPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [appointments, setAppointments] = useState<OpenAppointment[]>([]);
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  
  // Checkout State
  const [selectedAppointment, setSelectedAppointment] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [serviceCart, setServiceCart] = useState<ServiceCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [amountPaid, setAmountPaid] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Add service dropdown
  const [showServiceSelector, setShowServiceSelector] = useState(false);
  
  // Recent History State
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  
  // Quick Client Modal
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', phone: '' });
  const [clientSaving, setClientSaving] = useState(false);
  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    fetchInitialData();
    fetchRecentTickets();
  }, []);

  const fetchInitialData = async () => {
    const [productsRes, appointmentsRes, servicesRes, ticketsRes] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .gt('current_stock', 0)
        .order('name'),
      supabase
        .from('appointments')
        .select(`
          id, client_id, barber_id, service_id, status, ticket_id,
          services (name, price),
          clients (name),
          barbers (name)
        `)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
        .order('appointment_date'),
      supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('name'),
      supabase
        .from('tickets')
        .select('appointment_id')
        .not('appointment_id', 'is', null)
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (servicesRes.data) setAllServices(servicesRes.data);

    if (appointmentsRes.data) {
      const ticketedAppointmentIds = new Set(
        (ticketsRes.data || [])
          .map((ticket) => ticket.appointment_id)
          .filter(Boolean)
      );

      const openAppointments = (appointmentsRes.data as any[]).filter((appointment) => {
        if (appointment.ticket_id) return false;
        if (ticketedAppointmentIds.has(appointment.id)) return false;
        return ['scheduled', 'confirmed', 'in_progress'].includes(appointment.status);
      });

      setAppointments(openAppointments);
    }
  };

  const fetchRecentTickets = async () => {
    const { data } = await supabase
      .from('tickets')
      .select(`
        *,
        clients (name),
        barbers (name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRecentTickets(data);
  };

  /* === Appointment selection === */
  const handleSelectAppointment = (value: string) => {
    setSelectedAppointment(value);
    
    if (value === 'avulso' || value === '') {
      setServiceCart([]);
      return;
    }

    // Pre-load the appointment's service into the service cart
    const apt = appointments.find(a => a.id === value);
    if (apt) {
      setServiceCart([{
        uid: crypto.randomUUID(),
        service_id: apt.service_id,
        name: apt.services.name,
        price: apt.services.price,
        quantity: 1
      }]);
    }
  };

  /* === Service Cart operations === */
  const addServiceToCart = (svc: ServiceOption) => {
    setServiceCart(prev => [...prev, {
      uid: crypto.randomUUID(),
      service_id: svc.id,
      name: svc.name,
      price: svc.price,
      quantity: 1
    }]);
    setShowServiceSelector(false);
  };

  const removeServiceFromCart = (uid: string) => {
    setServiceCart(prev => prev.filter(s => s.uid !== uid));
  };

  const updateServicePrice = (uid: string, newPrice: string) => {
    const val = parseFloat(newPrice);
    setServiceCart(prev => prev.map(s =>
      s.uid === uid ? { ...s, price: isNaN(val) ? 0 : val } : s
    ));
  };

  const updateServiceQuantity = (uid: string, delta: number) => {
    setServiceCart(prev => prev.map(s =>
      s.uid === uid ? { ...s, quantity: Math.max(1, s.quantity + delta) } : s
    ));
  };

  /* === Product Cart operations === */
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) return prev;
        return prev.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        id: Math.random().toString(),
        product_id: product.id,
        name: product.name,
        unit_price: product.sale_price,
        unit_cost: product.cost_price,
        quantity: 1
      }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === id) {
        const prod = products.find(p => p.id === id);
        const newQ = Math.max(1, Math.min(item.quantity + delta, prod?.current_stock || 1));
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.product_id !== id));
  };

  // Calculations
  const isAvulso = selectedAppointment === 'avulso';
  const currentApt = appointments.find(a => a.id === selectedAppointment);
  
  const serviceTotal = serviceCart.reduce((sum, s) => sum + (s.price * s.quantity), 0);
  const productsTotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const grandTotal = serviceTotal + productsTotal;
  const changeAmount = amountPaid ? Math.max(0, parseFloat(amountPaid) - grandTotal) : 0;

  const handleCheckout = async () => {
    if (!selectedAppointment) return showToast('Selecione um agendamento ou Venda Avulsa.', 'error');
    if (isAvulso && cart.length === 0 && serviceCart.length === 0) return showToast('Adicione serviços ou produtos.', 'error');
    if (!isAvulso && !currentApt) return showToast('Agendamento inválido.', 'error');
    
    setLoading(true);
    try {
      // 1. Calculate Profits
      const totalProductsCost = cart.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
      const totalProfit = grandTotal - totalProductsCost;

      // 2. Create Ticket
      const { data: ticket, error: ticketErr } = await supabase
        .from('tickets')
        .insert({
          client_id: isAvulso ? null : currentApt?.client_id,
          barber_id: isAvulso ? null : currentApt?.barber_id,
          appointment_id: isAvulso ? null : currentApt?.id,
          total_services: serviceTotal,
          total_products: productsTotal,
          total_amount: grandTotal,
          total_profit: totalProfit,
          payment_method: paymentMethod,
          amount_paid: amountPaid ? parseFloat(amountPaid) : grandTotal,
          change_amount: changeAmount,
          status: 'paid'
        })
        .select()
        .single();
        
      if (ticketErr) throw ticketErr;

      // 3. Insert ALL Service Items (multi-service support)
      for (const svc of serviceCart) {
        await supabase.from('ticket_service_items').insert({
          ticket_id: ticket.id,
          service_id: svc.service_id,
          service_name_snapshot: svc.name,
          quantity: svc.quantity,
          unit_price: svc.price,
          subtotal: svc.price * svc.quantity
        });
      }

      // 4. Insert Product Items & Stock Movements
      for (const item of cart) {
        const subtotal = item.unit_price * item.quantity;
        const unitProfit = item.unit_price - item.unit_cost;

        await supabase.from('ticket_product_items').insert({
          ticket_id: ticket.id,
          product_id: item.product_id,
          product_name_snapshot: item.name,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          unit_price: item.unit_price,
          unit_profit: unitProfit,
          subtotal: subtotal
        });

        await supabase.from('stock_movements').insert({
          product_id: item.product_id,
          movement_type: 'out',
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          reason: 'Venda de Balcão (Ticket)',
          reference_type: 'ticket',
          reference_id: ticket.id
        });
      }

      // 5. Update Appointment Status
      if (!isAvulso && currentApt) {
        await supabase
          .from('appointments')
          .update({ status: 'completed', ticket_id: ticket.id })
          .eq('id', currentApt.id);
      }

      // Success
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCart([]);
        setServiceCart([]);
        setSelectedAppointment('');
        setAmountPaid('');
        fetchInitialData();
        fetchRecentTickets();
      }, 3000);

    } catch (err) {
      console.error(err);
      showToast('Erro ao processar fechamento.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Deseja realmente excluir esta venda? O estoque será estornado.')) return;
    
    setLoading(true);
    try {
      const { data: items } = await supabase
        .from('ticket_product_items')
        .select('*')
        .eq('ticket_id', ticketId);
      
      if (items && items.length > 0) {
        for (const item of items) {
          await supabase.from('stock_movements').insert({
            product_id: item.product_id,
            movement_type: 'in',
            quantity: item.quantity,
            reason: 'Estorno: Venda Excluída',
            reference_type: 'ticket_deletion',
            reference_id: ticketId
          });
        }
      }

      const { data: ticket } = await supabase.from('tickets').select('appointment_id').eq('id', ticketId).single();
      if (ticket?.appointment_id) {
        await supabase
          .from('appointments')
          .update({ status: 'confirmed', ticket_id: null })
          .eq('id', ticket.appointment_id);
      }

      const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
      if (error) throw error;

      showToast('Venda excluída e estoque estornado.', 'success');
      fetchRecentTickets();
      fetchInitialData();
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir venda.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickClient = async () => {
    if (!clientForm.name.trim()) return showToast('Nome do cliente é obrigatório.', 'error');
    
    setClientSaving(true);
    const normalizedName = normalizeName(clientForm.name);
    const normalizedPhone = normalizePhone(clientForm.phone);

    const { data, error } = await supabase
      .from('clients')
      .insert({ name: normalizedName, phone: normalizedPhone })
      .select()
      .single();
    
    if (error) {
      showToast('Erro ao cadastrar cliente.', 'error');
    } else {
      showToast('Cliente cadastrado!', 'success');
      setClientModalOpen(false);
      setClientForm({ name: '', phone: '' });
      fetchInitialData();
    }
    setClientSaving(false);
  };

  if (success) {
    return (
      <div className={styles.successState}>
        <CheckCircle size={64} className={styles.successIcon} />
        <h2>Venda Finalizada!</h2>
        <p>O ticket foi gerado, o agendamento concluído e o estoque atualizado.</p>
        <Button onClick={() => setSuccess(false)}>Nova Venda</Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>PDV / Fechamento</h1>
          <p className={styles.subtitle}>Fature agendamentos e adicione consumíveis</p>
        </div>
        <Button variant="secondary" onClick={() => setClientModalOpen(true)}>
          <UserPlus size={18} /> Novo Cliente
        </Button>
      </div>

      <div className={styles.posLayout}>
        {/* Left Side: Appointment, Services Cart & Product Cart */}
        <div className={styles.mainPanel}>
          <Card className={styles.appointmentSection}>
            <h3>1. Selecione o Atendimento</h3>
            <select 
              className={styles.select}
              value={selectedAppointment}
              onChange={(e) => handleSelectAppointment(e.target.value)}
            >
              <option value="">Selecione um agendamento em aberto</option>
              <option value="avulso">🛒 Venda Avulsa (Serviços e/ou Produtos)</option>
              {appointments.map(apt => (
                <option key={apt.id} value={apt.id}>
                  {apt.clients.name} - {apt.services.name} (R$ {apt.services.price.toFixed(2)}) com {apt.barbers.name}
                </option>
              ))}
            </select>
            
            {isAvulso && (
              <div className={styles.selectedAptCard}>
                <div className={styles.row}><strong>🛒 Venda Avulsa:</strong> Registre serviços e/ou produtos avulso.</div>
              </div>
            )}
            
            {!isAvulso && currentApt && (
              <div className={styles.selectedAptCard}>
                <div className={styles.row}><User size={16}/> <strong>Cliente:</strong> {currentApt.clients.name}</div>
                <div className={styles.row}><Scissors size={16}/> <strong>Profissional:</strong> {currentApt.barbers.name}</div>
              </div>
            )}
          </Card>

          {/* === Service Cart Section === */}
          {selectedAppointment && (
            <Card className={styles.cartSection}>
              <div className={styles.sectionHeaderRow}>
                <h3><Scissors size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Serviços do Atendimento</h3>
                <button
                  className={styles.addServiceBtn}
                  onClick={() => setShowServiceSelector(!showServiceSelector)}
                >
                  <Plus size={16} /> Adicionar Serviço
                </button>
              </div>

              {/* Service selector dropdown */}
              {showServiceSelector && (
                <div className={styles.serviceSelectorDropdown}>
                  {allServices.map(svc => (
                    <div
                      key={svc.id}
                      className={styles.serviceSelectorItem}
                      onClick={() => addServiceToCart(svc)}
                    >
                      <span>{svc.name}</span>
                      <span className={styles.serviceSelectorPrice}>R$ {svc.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.cartList}>
                {serviceCart.length === 0 ? (
                  <div className={styles.emptyCart}>Nenhum serviço adicionado</div>
                ) : (
                  serviceCart.map(svc => (
                    <div key={svc.uid} className={styles.serviceCartItem}>
                      <div className={styles.itemInfo}>
                        <span className={styles.itemName}>{svc.name}</span>
                      </div>
                      <div className={styles.itemControls}>
                        <button onClick={() => updateServiceQuantity(svc.uid, -1)}><Minus size={14}/></button>
                        <span>{svc.quantity}</span>
                        <button onClick={() => updateServiceQuantity(svc.uid, 1)}><Plus size={14}/></button>
                      </div>
                      <div className={styles.servicePriceEdit}>
                        <span className={styles.servicePriceCurrency}>R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={styles.servicePriceInput}
                          value={svc.price}
                          onChange={(e) => updateServicePrice(svc.uid, e.target.value)}
                        />
                      </div>
                      <div className={styles.itemSubtotal}>
                        R$ {(svc.price * svc.quantity).toFixed(2)}
                      </div>
                      <button className={styles.removeBtn} onClick={() => removeServiceFromCart(svc.uid)}>
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          <Card className={styles.cartSection}>
            <h3>2. Consumo Extra (Bebidas/Produtos)</h3>
            <div className={styles.cartList}>
              {cart.length === 0 ? (
                <div className={styles.emptyCart}>Nenhum produto adicionado</div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className={styles.cartItem}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={styles.itemPrice}>R$ {item.unit_price.toFixed(2)} un</span>
                    </div>
                    <div className={styles.itemControls}>
                      <button onClick={() => updateQuantity(item.product_id, -1)}><Minus size={14}/></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product_id, 1)}><Plus size={14}/></button>
                      <button className={styles.removeBtn} onClick={() => removeFromCart(item.product_id)}><Trash2 size={16}/></button>
                    </div>
                    <div className={styles.itemSubtotal}>
                      R$ {(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Side: Products to Add & Checkout */}
        <div className={styles.sidePanel}>
          <Card className={styles.productsSection}>
            <div className={styles.sectionHeader}>
              <Coffee size={18}/>
              <h3>Produtos</h3>
            </div>
            <div className={styles.productList}>
              {products.map(prod => (
                <div key={prod.id} className={styles.productCard} onClick={() => addToCart(prod)}>
                  <div>
                    <div className={styles.prodName}>{prod.name}</div>
                    <div className={styles.prodStock}>Disp: {prod.current_stock}</div>
                  </div>
                  <div className={styles.prodPrice}>R$ {prod.sale_price.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className={styles.checkoutSection}>
            <h3>Resumo da Venda</h3>
            <div className={styles.summaryRow}>
              <span>Serviços ({serviceCart.reduce((s, i) => s + i.quantity, 0)})</span>
              <span>R$ {serviceTotal.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Produtos ({cart.reduce((s,i)=>s+i.quantity,0)})</span>
              <span>R$ {productsTotal.toFixed(2)}</span>
            </div>
            <div className={styles.summaryTotal}>
              <span>Total</span>
              <span>R$ {grandTotal.toFixed(2)}</span>
            </div>

            <div className={styles.paymentSection}>
              <label>Forma de Pagamento</label>
              <select 
                className={styles.select}
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
              >
                <option value="pix">PIX</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="debit_card">Cartão de Débito</option>
                <option value="cash">Dinheiro</option>
              </select>

              {paymentMethod === 'cash' && (
                <div className={styles.cashInput}>
                  <label>Valor Recebido (R$)</label>
                  <input
                    type="number"
                    className={styles.select}
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    placeholder={grandTotal.toFixed(2)}
                  />
                  {changeAmount > 0 && (
                    <div className={styles.changeDisplay}>
                      Troco: <strong>R$ {changeAmount.toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button 
              className={styles.checkoutBtn} 
              onClick={handleCheckout}
              disabled={!selectedAppointment || loading || (isAvulso && cart.length === 0 && serviceCart.length === 0)}
              isLoading={loading}
            >
              <ShoppingCart size={18} />
              Finalizar Ticket
            </Button>
          </Card>
        </div>
      </div>

      {/* Recent History Section */}
      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <History size={20} />
          <h2>Vendas Recentes</h2>
        </div>
        
        <Card className={styles.historyCard}>
          {recentTickets.length === 0 ? (
            <div className={styles.emptyHistory}>Nenhuma venda recente.</div>
          ) : (
            <div className={styles.historyTableContainer}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Cliente</th>
                    <th>Profissional</th>
                    <th>Total</th>
                    <th>Pagamento</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>{new Date(ticket.created_at).toLocaleString('pt-BR')}</td>
                      <td>{ticket.clients?.name || 'Venda Avulsa'}</td>
                      <td>{ticket.barbers?.name || '-'}</td>
                      <td style={{ fontWeight: 600 }}>R$ {ticket.total_amount.toFixed(2)}</td>
                      <td>
                        <span className={styles.paymentBadge}>{ticket.payment_method}</span>
                      </td>
                      <td>
                        <button 
                          className={styles.deleteHistoryBtn}
                          onClick={() => handleDeleteTicket(ticket.id)}
                          title="Excluir Venda"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Client Quick Modal */}
      <Modal
        isOpen={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        title="Cadastrar Novo Cliente"
        footer={
          <>
            <Button variant="secondary" onClick={() => setClientModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleQuickClient} isLoading={clientSaving}>Cadastrar</Button>
          </>
        }
      >
        <div className={styles.modalBody}>
          <Input 
            label="Nome Completo"
            placeholder="Ex: João Silva"
            value={clientForm.name}
            onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
            autoFocus
          />
          <Input 
            label="Telefone"
            placeholder="(11) 99999-0000"
            value={clientForm.phone}
            onChange={e => setClientForm({ ...clientForm, phone: normalizePhone(e.target.value) })}
          />
        </div>
      </Modal>
    </div>
  );
}
