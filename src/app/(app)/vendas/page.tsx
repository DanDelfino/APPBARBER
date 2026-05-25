'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ShoppingCart, User, Scissors, Coffee, CheckCircle, History, UserPlus, Receipt, Clock3 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { normalizeName, normalizePhone } from '@/lib/utils';
import styles from './Vendas.module.css';
import { format, startOfDay } from 'date-fns';

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

interface ServiceCartItem {
  uid: string;
  service_id: string;
  name: string;
  price: number;
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
  appointment_date: string;
  start_time: string;
  status: string;
  ticket_id: string | null;
  services: { name: string; price: number };
  clients: { name: string };
  barbers: { name: string };
}

interface OpenAppointmentRow {
  id: string;
  client_id: string;
  barber_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  ticket_id: string | null;
  services: { name: string; price: number }[] | { name: string; price: number } | null;
  clients: { name: string }[] | { name: string } | null;
  barbers: { name: string }[] | { name: string } | null;
}

interface ClientOption {
  id: string;
  name: string;
}

interface OpenTicketProductItem {
  id: string;
  product_name_snapshot: string;
  quantity: number;
  subtotal: number;
}

interface OpenTicketServiceItem {
  id: string;
  service_name_snapshot: string;
  quantity: number;
  subtotal: number;
}

interface OpenTicket {
  id: string;
  client_id: string | null;
  total_services: number;
  total_products: number;
  total_amount: number;
  total_profit: number;
  created_at: string;
  status: 'open' | 'paid' | 'cancelled';
  manual_client_name: string | null;
  clients: { name: string } | null;
  ticket_product_items: OpenTicketProductItem[];
  ticket_service_items: OpenTicketServiceItem[];
}

interface TicketRecord {
  id: string;
  total_amount: number;
  payment_method: string | null;
  created_at: string;
  clients: { name: string } | null;
  barbers: { name: string } | null;
}

interface TicketRecordRow {
  id: string;
  total_amount: number;
  payment_method: string | null;
  created_at: string;
  clients: { name: string }[] | { name: string } | null;
  barbers: { name: string }[] | { name: string } | null;
}

interface OpenTicketRow {
  id: string;
  client_id: string | null;
  total_services: number;
  total_products: number;
  total_amount: number;
  total_profit: number;
  created_at: string;
  status: 'open' | 'paid' | 'cancelled';
  manual_client_name: string | null;
  clients: { name: string }[] | { name: string } | null;
  ticket_product_items: OpenTicketProductItem[] | null;
  ticket_service_items: OpenTicketServiceItem[] | null;
}

const createLineItemId = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const formatMoney = (value: number) => `R$ ${value.toFixed(2)}`;

const getErrorMessage = (error: unknown) => {
  if (!error) return 'Erro desconhecido.';
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'Erro desconhecido.';
};

export default function VendasPage() {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [appointments, setAppointments] = useState<OpenAppointment[]>([]);
  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  const [recentTickets, setRecentTickets] = useState<TicketRecord[]>([]);
  const [openTickets, setOpenTickets] = useState<OpenTicket[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);

  const [selectedAppointment, setSelectedAppointment] = useState('');
  const [selectedOpenTicketId, setSelectedOpenTicketId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [serviceCart, setServiceCart] = useState<ServiceCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showServiceSelector, setShowServiceSelector] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', phone: '' });
  const [clientSaving, setClientSaving] = useState(false);
  const [openTicketModalOpen, setOpenTicketModalOpen] = useState(false);
  const [openTicketForm, setOpenTicketForm] = useState({ label: '', client_id: '' });
  const [openTicketSaving, setOpenTicketSaving] = useState(false);
  const [appointmentFromQuery, setAppointmentFromQuery] = useState<string | null>(null);
  const editorSectionRef = useRef<HTMLDivElement | null>(null);

  const pickRelation = (value: { name: string }[] | { name: string } | null) => {
    if (!value) return null;
    return Array.isArray(value) ? value[0] || null : value;
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const appointmentId = new URLSearchParams(window.location.search).get('appointment');
    setAppointmentFromQuery(appointmentId);
  }, []);

  useEffect(() => {
    if (!appointmentFromQuery || appointments.length === 0) return;

    const appointmentExists = appointments.some((appointment) => appointment.id === appointmentFromQuery);
    if (!appointmentExists) {
      showToast('Esse atendimento nao esta mais em aberto no PDV.', 'info');
      router.replace('/vendas');
      return;
    }

    handleSelectAppointment(appointmentFromQuery);
    router.replace('/vendas');
  }, [appointmentFromQuery, appointments]);

  const fetchInitialData = async () => {
    const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');

    const [productsRes, appointmentsRes, servicesRes, ticketedAppointmentsRes, recentTicketsRes, openTicketsRes, clientsRes] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .gt('current_stock', 0)
        .order('name'),
      supabase
        .from('appointments')
        .select(`
          id, client_id, barber_id, service_id, appointment_date, start_time, status, ticket_id,
          services (name, price),
          clients (name),
          barbers (name)
        `)
        .eq('appointment_date', todayStr)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
        .order('start_time'),
      supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('name'),
      supabase
        .from('tickets')
        .select('appointment_id')
        .not('appointment_id', 'is', null),
      supabase
        .from('tickets')
        .select(`
          id,
          total_amount,
          payment_method,
          created_at,
          clients (name),
          barbers (name)
        `)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('tickets')
        .select(`
          id,
          client_id,
          total_services,
          total_products,
          total_amount,
          total_profit,
          created_at,
          status,
          manual_client_name,
          clients (name),
          ticket_product_items (
            id,
            product_name_snapshot,
            quantity,
            subtotal
          ),
          ticket_service_items (
            id,
            service_name_snapshot,
            quantity,
            subtotal
          )
        `)
        .eq('status', 'open')
        .is('appointment_id', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('clients')
        .select('id, name')
        .order('name'),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (servicesRes.data) setAllServices(servicesRes.data);
    if (recentTicketsRes.data) {
      const mappedRecentTickets = (recentTicketsRes.data as TicketRecordRow[]).map((ticket) => ({
        ...ticket,
        clients: pickRelation(ticket.clients),
        barbers: pickRelation(ticket.barbers),
      }));
      setRecentTickets(mappedRecentTickets);
    }
    if (openTicketsRes.data) {
      const mappedOpenTickets = (openTicketsRes.data as OpenTicketRow[]).map((ticket) => ({
        ...ticket,
        clients: pickRelation(ticket.clients),
        ticket_product_items: ticket.ticket_product_items || [],
        ticket_service_items: ticket.ticket_service_items || [],
      }));
      setOpenTickets(mappedOpenTickets);
    }
    if (clientsRes.data) setClients(clientsRes.data);

    if (appointmentsRes.data) {
      const ticketedAppointmentIds = new Set(
        (ticketedAppointmentsRes.data || [])
          .map((ticket) => ticket.appointment_id)
          .filter(Boolean)
      );

      const mappedAppointments = (appointmentsRes.data as OpenAppointmentRow[]).map((appointment) => ({
        ...appointment,
        services: Array.isArray(appointment.services) ? appointment.services[0] : appointment.services,
        clients: pickRelation(appointment.clients),
        barbers: pickRelation(appointment.barbers),
      })).filter((appointment): appointment is OpenAppointment => Boolean(appointment.services && appointment.clients && appointment.barbers));

      const openAppointments = mappedAppointments.filter((appointment) => {
        if (appointment.ticket_id) return false;
        if (ticketedAppointmentIds.has(appointment.id)) return false;
        return ['scheduled', 'confirmed', 'in_progress'].includes(appointment.status);
      });

      setAppointments(openAppointments);
    }
  };

  const resetEditorState = () => {
    setCart([]);
    setServiceCart([]);
    setAmountPaid('');
    setPaymentMethod('cash');
    setShowServiceSelector(false);
  };

  const handleSelectAppointment = (value: string) => {
    setSelectedOpenTicketId('');
    setSelectedAppointment(value);
    resetEditorState();

    if (value === 'avulso' || value === '') {
      setServiceCart([]);
      return;
    }

    const appointment = appointments.find((item) => item.id === value);
    if (appointment) {
      setServiceCart([{
        uid: createLineItemId(),
        service_id: appointment.service_id,
        name: appointment.services.name,
        price: appointment.services.price,
        quantity: 1,
      }]);
    }
  };

  const handleSelectOpenTicket = (ticketId: string, action: 'add' | 'close' = 'add') => {
    setSelectedAppointment('');
    setSelectedOpenTicketId(ticketId);
    resetEditorState();
    setShowServiceSelector(false);

    setTimeout(() => {
      editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    if (action === 'close') {
      showToast('Ticket aberto selecionado. Confira o total e clique em receber.', 'info');
    } else {
      showToast('Ticket aberto selecionado. Agora clique nos produtos ou servicos para lancar direto na conta.', 'success');
    }
  };

  const persistItemsToOpenTicket = async (
    ticket: OpenTicket,
    nextServices: ServiceCartItem[],
    nextProducts: CartItem[]
  ) => {
    if (nextServices.length === 0 && nextProducts.length === 0) {
      return {
        totalServices: Number(ticket.total_services),
        totalProducts: Number(ticket.total_products),
        totalAmount: Number(ticket.total_amount),
        totalProfit: Number(ticket.total_profit),
      };
    }

    let addedServiceTotal = 0;
    let addedProductsTotal = 0;
    let addedProductsCost = 0;

    for (const service of nextServices) {
      const subtotal = service.price * service.quantity;
      addedServiceTotal += subtotal;

      const { error } = await supabase.from('ticket_service_items').insert({
        ticket_id: ticket.id,
        service_id: service.service_id,
        service_name_snapshot: service.name,
        quantity: service.quantity,
        unit_price: service.price,
        subtotal,
      });

      if (error) throw error;
    }

    for (const item of nextProducts) {
      const subtotal = item.unit_price * item.quantity;
      const unitProfit = item.unit_price - item.unit_cost;
      addedProductsTotal += subtotal;
      addedProductsCost += item.unit_cost * item.quantity;

      const { error: productItemError } = await supabase.from('ticket_product_items').insert({
        ticket_id: ticket.id,
        product_id: item.product_id,
        product_name_snapshot: item.name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        unit_price: item.unit_price,
        unit_profit: unitProfit,
        subtotal,
      });

      if (productItemError) throw productItemError;

      const { error: stockError } = await supabase.from('stock_movements').insert({
        product_id: item.product_id,
        movement_type: 'out',
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        reason: 'Consumo em ticket aberto',
        reference_type: 'open_ticket',
        reference_id: ticket.id,
      });

      if (stockError) throw stockError;
    }

    const totalServices = Number(ticket.total_services) + addedServiceTotal;
    const totalProducts = Number(ticket.total_products) + addedProductsTotal;
    const totalAmount = Number(ticket.total_amount) + addedServiceTotal + addedProductsTotal;
    const totalProfit = Number(ticket.total_profit) + addedServiceTotal + (addedProductsTotal - addedProductsCost);

    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        total_services: totalServices,
        total_products: totalProducts,
        total_amount: totalAmount,
        total_profit: totalProfit,
      })
      .eq('id', ticket.id);

    if (updateError) throw updateError;

    return {
      totalServices,
      totalProducts,
      totalAmount,
      totalProfit,
    };
  };

  const quickAddServiceToOpenTicket = async (ticket: OpenTicket, service: ServiceOption) => {
    setLoading(true);
    setShowServiceSelector(false);

    try {
      await persistItemsToOpenTicket(ticket, [{
        uid: createLineItemId(),
        service_id: service.id,
        name: service.name,
        price: service.price,
        quantity: 1,
      }], []);
      await fetchInitialData();
      showToast(`${service.name} adicionado ao ticket aberto.`, 'success');
    } catch (error) {
      console.error(error);
      showToast(`Nao foi possivel adicionar o servico: ${getErrorMessage(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const addServiceToCart = (service: ServiceOption) => {
    if (selectedOpenTicket) {
      void quickAddServiceToOpenTicket(selectedOpenTicket, service);
      return;
    }

    setServiceCart((prev) => [...prev, {
      uid: createLineItemId(),
      service_id: service.id,
      name: service.name,
      price: service.price,
      quantity: 1,
    }]);
    setShowServiceSelector(false);
  };

  const removeServiceFromCart = (uid: string) => {
    setServiceCart((prev) => prev.filter((service) => service.uid !== uid));
  };

  const updateServicePrice = (uid: string, newPrice: string) => {
    const value = parseFloat(newPrice);
    setServiceCart((prev) => prev.map((service) =>
      service.uid === uid ? { ...service, price: Number.isNaN(value) ? 0 : value } : service
    ));
  };

  const updateServiceQuantity = (uid: string, delta: number) => {
    setServiceCart((prev) => prev.map((service) =>
      service.uid === uid ? { ...service, quantity: Math.max(1, service.quantity + delta) } : service
    ));
  };

  const quickAddProductToOpenTicket = async (ticket: OpenTicket, product: Product) => {
    setLoading(true);

    try {
      await persistItemsToOpenTicket(ticket, [], [{
        id: createLineItemId(),
        product_id: product.id,
        name: product.name,
        unit_price: product.sale_price,
        unit_cost: product.cost_price,
        quantity: 1,
      }]);
      await fetchInitialData();
      showToast(`${product.name} adicionado ao ticket aberto.`, 'success');
    } catch (error) {
      console.error(error);
      showToast(`Nao foi possivel adicionar o produto: ${getErrorMessage(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    if (selectedOpenTicket) {
      void quickAddProductToOpenTicket(selectedOpenTicket, product);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) return prev;
        return prev.map((item) => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }

      return [...prev, {
        id: Math.random().toString(),
        product_id: product.id,
        name: product.name,
        unit_price: product.sale_price,
        unit_cost: product.cost_price,
        quantity: 1,
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.product_id !== productId) return item;

      const product = products.find((entry) => entry.id === productId);
      const nextQuantity = Math.max(1, Math.min(item.quantity + delta, product?.current_stock || 1));
      return { ...item, quantity: nextQuantity };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const getOpenTicketLabel = (ticket: OpenTicket) => {
    return ticket.manual_client_name || ticket.clients?.name || 'Ticket Aberto';
  };

  const getOpenTicketItemsPreview = (ticket: OpenTicket) => {
    const productItems = ticket.ticket_product_items.map((item) => `${item.quantity}x ${item.product_name_snapshot}`);
    const serviceItems = ticket.ticket_service_items.map((item) => `${item.quantity}x ${item.service_name_snapshot}`);
    return [...serviceItems, ...productItems].slice(0, 3);
  };

  const selectedOpenTicket = openTickets.find((ticket) => ticket.id === selectedOpenTicketId) || null;
  const currentAppointment = appointments.find((appointment) => appointment.id === selectedAppointment);
  const isAvulso = selectedAppointment === 'avulso';
  const isOpenTicketMode = !!selectedOpenTicket;

  const savedServiceTotal = selectedOpenTicket ? Number(selectedOpenTicket.total_services) : 0;
  const savedProductsTotal = selectedOpenTicket ? Number(selectedOpenTicket.total_products) : 0;
  const savedGrandTotal = selectedOpenTicket ? Number(selectedOpenTicket.total_amount) : 0;
  const savedServiceCount = selectedOpenTicket ? selectedOpenTicket.ticket_service_items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const savedProductCount = selectedOpenTicket ? selectedOpenTicket.ticket_product_items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  const pendingServiceTotal = serviceCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const pendingProductsTotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const pendingProductsCost = cart.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
  const serviceTotal = savedServiceTotal + pendingServiceTotal;
  const productsTotal = savedProductsTotal + pendingProductsTotal;
  const grandTotal = savedGrandTotal + pendingServiceTotal + pendingProductsTotal;
  const changeAmount = amountPaid ? Math.max(0, parseFloat(amountPaid) - grandTotal) : 0;
  const hasPendingItems = cart.length > 0 || serviceCart.length > 0;

  const resolveAmountPaid = (total: number) => {
    if (paymentMethod !== 'cash') return total;
    if (!amountPaid) return total;

    const parsed = parseFloat(amountPaid);
    if (Number.isNaN(parsed)) return total;
    return parsed;
  };

  const persistPendingItemsToOpenTicket = async (ticket: OpenTicket) => {
    return persistItemsToOpenTicket(ticket, serviceCart, cart);
  };

  const handleSaveOpenTicketItems = async () => {
    if (!selectedOpenTicket) {
      showToast('Selecione um ticket aberto para adicionar itens.', 'error');
      return;
    }

    if (!hasPendingItems) {
      showToast('Adicione pelo menos um produto ou servico.', 'error');
      return;
    }

    setLoading(true);
    try {
      await persistPendingItemsToOpenTicket(selectedOpenTicket);
      showToast('Itens adicionados ao ticket aberto.', 'success');
      resetEditorState();
      await fetchInitialData();
    } catch (error) {
      console.error(error);
      showToast(`Erro ao salvar itens no ticket aberto: ${getErrorMessage(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (isOpenTicketMode) {
      if (!selectedOpenTicket) return;
      if (!hasPendingItems && grandTotal <= 0) {
        showToast('Esse ticket ainda nao possui itens.', 'error');
        return;
      }

      const resolvedAmountPaid = resolveAmountPaid(grandTotal);
      if (paymentMethod === 'cash' && resolvedAmountPaid < grandTotal) {
        showToast('O valor recebido nao pode ser menor que o total.', 'error');
        return;
      }

      setLoading(true);
      try {
        const totals = await persistPendingItemsToOpenTicket(selectedOpenTicket);
        const finalChange = paymentMethod === 'cash' ? Math.max(0, resolvedAmountPaid - totals.totalAmount) : 0;

        const { error } = await supabase
          .from('tickets')
          .update({
            total_services: totals.totalServices,
            total_products: totals.totalProducts,
            total_amount: totals.totalAmount,
            total_profit: totals.totalProfit,
            payment_method: paymentMethod,
            amount_paid: resolvedAmountPaid,
            change_amount: finalChange,
            status: 'paid',
            closed_at: new Date().toISOString(),
          })
          .eq('id', selectedOpenTicket.id);

        if (error) throw error;

        setSuccess(true);
        setTimeout(async () => {
          setSuccess(false);
          setSelectedOpenTicketId('');
          resetEditorState();
          await fetchInitialData();
        }, 2500);
      } catch (error) {
        console.error(error);
        showToast(`Erro ao fechar ticket aberto: ${getErrorMessage(error)}`, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!selectedAppointment) {
      showToast('Selecione um agendamento ou Venda Avulsa.', 'error');
      return;
    }

    if (isAvulso && !hasPendingItems) {
      showToast('Adicione servicos ou produtos.', 'error');
      return;
    }

    if (!isAvulso && !currentAppointment) {
      showToast('Agendamento invalido.', 'error');
      return;
    }

    const resolvedAmountPaid = resolveAmountPaid(grandTotal);
    if (paymentMethod === 'cash' && resolvedAmountPaid < grandTotal) {
      showToast('O valor recebido nao pode ser menor que o total.', 'error');
      return;
    }

    setLoading(true);
    try {
      const totalProfit = grandTotal - pendingProductsCost;

      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          client_id: isAvulso ? null : currentAppointment?.client_id,
          barber_id: isAvulso ? null : currentAppointment?.barber_id,
          appointment_id: isAvulso ? null : currentAppointment?.id,
          total_services: pendingServiceTotal,
          total_products: pendingProductsTotal,
          total_amount: grandTotal,
          total_profit: totalProfit,
          payment_method: paymentMethod,
          amount_paid: resolvedAmountPaid,
          change_amount: paymentMethod === 'cash' ? Math.max(0, resolvedAmountPaid - grandTotal) : 0,
          status: 'paid',
          closed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      for (const service of serviceCart) {
        const { error } = await supabase.from('ticket_service_items').insert({
          ticket_id: ticket.id,
          service_id: service.service_id,
          service_name_snapshot: service.name,
          quantity: service.quantity,
          unit_price: service.price,
          subtotal: service.price * service.quantity,
        });

        if (error) throw error;
      }

      for (const item of cart) {
        const subtotal = item.unit_price * item.quantity;
        const unitProfit = item.unit_price - item.unit_cost;

        const { error: productItemError } = await supabase.from('ticket_product_items').insert({
          ticket_id: ticket.id,
          product_id: item.product_id,
          product_name_snapshot: item.name,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          unit_price: item.unit_price,
          unit_profit: unitProfit,
          subtotal,
        });

        if (productItemError) throw productItemError;

        const { error: stockError } = await supabase.from('stock_movements').insert({
          product_id: item.product_id,
          movement_type: 'out',
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          reason: 'Venda de Balcao (Ticket)',
          reference_type: 'ticket',
          reference_id: ticket.id,
        });

        if (stockError) throw stockError;
      }

      if (!isAvulso && currentAppointment) {
        const { error: appointmentUpdateError } = await supabase
          .from('appointments')
          .update({ status: 'completed', ticket_id: ticket.id })
          .eq('id', currentAppointment.id);

        if (appointmentUpdateError) throw appointmentUpdateError;
      }

      setSuccess(true);
      setTimeout(async () => {
        setSuccess(false);
        setSelectedAppointment('');
        resetEditorState();
        await fetchInitialData();
      }, 2500);
    } catch (error) {
      console.error(error);
      showToast(`Erro ao processar fechamento: ${getErrorMessage(error)}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Deseja realmente excluir esta venda? O estoque sera estornado.')) return;

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
            reason: 'Estorno: Venda Excluida',
            reference_type: 'ticket_deletion',
            reference_id: ticketId,
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

      showToast('Venda excluida e estoque estornado.', 'success');
      await fetchInitialData();
    } catch (error) {
      console.error(error);
      showToast('Erro ao excluir venda.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickClient = async () => {
    if (!clientForm.name.trim()) {
      showToast('Nome do cliente e obrigatorio.', 'error');
      return;
    }

    setClientSaving(true);
    const normalizedName = normalizeName(clientForm.name);
    const normalizedPhone = normalizePhone(clientForm.phone);

    const { data, error } = await supabase
      .from('clients')
      .insert({ name: normalizedName, phone: normalizedPhone || null })
      .select('id, name')
      .single();

    if (error || !data) {
      showToast('Erro ao cadastrar cliente.', 'error');
    } else {
      showToast('Cliente cadastrado!', 'success');
      setClientModalOpen(false);
      setClientForm({ name: '', phone: '' });
      setClients((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setOpenTicketForm((prev) => ({ ...prev, client_id: data.id }));
    }

    setClientSaving(false);
  };

  const handleCreateOpenTicket = async () => {
    if (!openTicketForm.label.trim()) {
      showToast('Informe um nome ou identificacao para o ticket.', 'error');
      return;
    }

    setOpenTicketSaving(true);
    try {
      const normalizedLabel = normalizeName(openTicketForm.label);
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          client_id: openTicketForm.client_id || null,
          manual_client_name: normalizedLabel,
          total_services: 0,
          total_products: 0,
          total_amount: 0,
          total_profit: 0,
          status: 'open',
        })
        .select('id')
        .single();

      if (error || !data) throw error;

      setOpenTicketModalOpen(false);
      setOpenTicketForm({ label: '', client_id: '' });
      await fetchInitialData();
      setSelectedOpenTicketId(data.id);
      setSelectedAppointment('');
      resetEditorState();
      showToast('Ticket aberto criado. Agora adicione os itens.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao abrir ticket.', 'error');
    } finally {
      setOpenTicketSaving(false);
    }
  };

  const openTicketItemCount = savedServiceCount + savedProductCount;

  if (success) {
    return (
      <div className={styles.successState}>
        <CheckCircle size={64} className={styles.successIcon} />
        <h2>Operacao finalizada!</h2>
        <p>O ticket foi salvo corretamente e o caixa ja esta atualizado.</p>
        <Button onClick={() => setSuccess(false)}>Nova Venda</Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.flowBanner}>
        <strong>Fluxo simples:</strong> escolha um atendimento, uma venda avulsa ou um ticket aberto, confira os itens e finalize quando receber.
      </div>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>PDV / Fechamento</h1>
          <p className={styles.subtitle}>Fature atendimentos, consumiveis e contas em aberto</p>
        </div>
        <Button variant="secondary" onClick={() => setClientModalOpen(true)}>
          <UserPlus size={18} /> Novo Cliente
        </Button>
      </div>

      <Card className={styles.openTicketsSection}>
        <div className={styles.openTicketsHeader}>
          <div>
            <h3 className={styles.sectionTitle}><Receipt size={18} /> Tickets Abertos</h3>
            <p className={styles.sectionSubtitle}>Abra uma conta e va adicionando itens ao longo do atendimento.</p>
          </div>
          <Button onClick={() => setOpenTicketModalOpen(true)}>
            <UserPlus size={18} /> Abrir Ticket
          </Button>
        </div>

        {openTickets.length === 0 ? (
          <div className={styles.emptyOpenTickets}>Nenhum ticket aberto no momento.</div>
        ) : (
          <div className={styles.openTicketsGrid}>
            {openTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`${styles.openTicketCard} ${selectedOpenTicketId === ticket.id ? styles.openTicketCardActive : ''}`}
              >
                <div className={styles.openTicketTop}>
                  <div>
                    <h4 className={styles.openTicketName}>{getOpenTicketLabel(ticket)}</h4>
                    <div className={styles.openTicketMeta}>
                      <Clock3 size={14} />
                      <span>Aberto em {new Date(ticket.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <span className={styles.openTicketTotal}>{formatMoney(Number(ticket.total_amount))}</span>
                </div>

                <div className={styles.openTicketItems}>
                  {getOpenTicketItemsPreview(ticket).length === 0 ? (
                    <span>Sem itens ainda</span>
                  ) : (
                    getOpenTicketItemsPreview(ticket).map((item) => (
                      <span key={`${ticket.id}-${item}`}>{item}</span>
                    ))
                  )}
                </div>

                <div className={styles.openTicketFooter}>
                  <span>{ticket.ticket_product_items.reduce((sum, item) => sum + item.quantity, 0)} produtos • {ticket.ticket_service_items.reduce((sum, item) => sum + item.quantity, 0)} servicos</span>
                  <div className={styles.openTicketActions}>
                    <Button variant="secondary" onClick={() => handleSelectOpenTicket(ticket.id, 'add')}>Adicionar Item</Button>
                    <Button onClick={() => handleSelectOpenTicket(ticket.id, 'close')}>Fechar Conta</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className={styles.posLayout} ref={editorSectionRef}>
        <div className={styles.mainPanel}>
          <Card className={styles.appointmentSection}>
            <h3>1. Escolha o Tipo de Atendimento</h3>
            <select
              className={styles.select}
              value={selectedAppointment}
              onChange={(e) => handleSelectAppointment(e.target.value)}
            >
              <option value="">Selecione um agendamento em aberto</option>
              <option value="avulso">Venda Avulsa (Servicos e/ou Produtos)</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.clients.name} - {appointment.services.name} ({formatMoney(appointment.services.price)}) com {appointment.barbers.name}
                </option>
              ))}
            </select>

            {isAvulso && (
              <div className={styles.selectedAptCard}>
                <div className={styles.row}><strong>Venda Avulsa:</strong> registre produtos e servicos para pagamento imediato.</div>
              </div>
            )}

            {!isAvulso && currentAppointment && (
              <div className={styles.selectedAptCard}>
                <div className={styles.row}><User size={16} /> <strong>Cliente:</strong> {currentAppointment.clients.name}</div>
                <div className={styles.row}><Scissors size={16} /> <strong>Profissional:</strong> {currentAppointment.barbers.name}</div>
                <div className={styles.nextStepBox}>
                  Passo seguinte: confira os servicos e produtos e depois clique em <strong>Receber e Finalizar Ticket</strong>.
                </div>
              </div>
            )}

            {selectedOpenTicket && (
              <div className={styles.selectedAptCard}>
                <div className={styles.row}><Receipt size={16} /> <strong>Ticket em aberto:</strong> {getOpenTicketLabel(selectedOpenTicket)}</div>
                <div className={styles.row}><Clock3 size={16} /> <strong>Abertura:</strong> {new Date(selectedOpenTicket.created_at).toLocaleString('pt-BR')}</div>
                <div className={styles.nextStepBox}>
                  Este ticket ja tem {openTicketItemCount} itens salvos. Agora basta clicar nos produtos ou servicos abaixo para lancar direto na conta. Quando o cliente pagar, clique em <strong>Receber e Fechar Ticket</strong>.
                </div>
              </div>
            )}
          </Card>

          {(selectedAppointment || selectedOpenTicket) && (
            <Card className={styles.cartSection}>
              <div className={styles.sectionHeaderRow}>
                <h3><Scissors size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Servicos do Atendimento</h3>
                <button
                  className={styles.addServiceBtn}
                  onClick={() => setShowServiceSelector(!showServiceSelector)}
                >
                  Adicionar Servico
                </button>
              </div>

              {showServiceSelector && (
                <div className={styles.serviceSelectorDropdown}>
                  {allServices.map((service) => (
                    <div
                      key={service.id}
                      className={styles.serviceSelectorItem}
                      onClick={() => addServiceToCart(service)}
                    >
                      <span>{service.name}</span>
                      <span className={styles.serviceSelectorPrice}>{formatMoney(service.price)}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedOpenTicket && selectedOpenTicket.ticket_service_items.length > 0 && (
                <div className={styles.savedItemsPanel}>
                  <h4 className={styles.savedItemsTitle}>Servicos ja salvos no ticket</h4>
                  {selectedOpenTicket.ticket_service_items.map((item) => (
                    <div key={item.id} className={styles.savedItemRow}>
                      <span>{item.quantity}x {item.service_name_snapshot}</span>
                      <strong>{formatMoney(Number(item.subtotal))}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.cartList}>
                {serviceCart.length === 0 ? (
                  <div className={styles.emptyCart}>Nenhum servico novo adicionado</div>
                ) : (
                  serviceCart.map((service) => (
                    <div key={service.uid} className={styles.serviceCartItem}>
                      <div className={styles.itemInfo}>
                        <span className={styles.itemName}>{service.name}</span>
                      </div>
                      <div className={styles.itemControls}>
                        <button onClick={() => updateServiceQuantity(service.uid, -1)}>−</button>
                        <span>{service.quantity}</span>
                        <button onClick={() => updateServiceQuantity(service.uid, 1)}>+</button>
                      </div>
                      <div className={styles.servicePriceEdit}>
                        <span className={styles.servicePriceCurrency}>R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={styles.servicePriceInput}
                          value={service.price}
                          onChange={(e) => updateServicePrice(service.uid, e.target.value)}
                        />
                      </div>
                      <div className={styles.itemSubtotal}>{formatMoney(service.price * service.quantity)}</div>
                      <button className={styles.removeBtn} onClick={() => removeServiceFromCart(service.uid)}>x</button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

          <Card className={styles.cartSection}>
            <h3>2. Consumo Extra (Bebidas/Produtos)</h3>

            {selectedOpenTicket && selectedOpenTicket.ticket_product_items.length > 0 && (
              <div className={styles.savedItemsPanel}>
                <h4 className={styles.savedItemsTitle}>Produtos ja salvos no ticket</h4>
                {selectedOpenTicket.ticket_product_items.map((item) => (
                  <div key={item.id} className={styles.savedItemRow}>
                    <span>{item.quantity}x {item.product_name_snapshot}</span>
                    <strong>{formatMoney(Number(item.subtotal))}</strong>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.cartList}>
              {cart.length === 0 ? (
                <div className={styles.emptyCart}>Nenhum produto novo adicionado</div>
              ) : (
                cart.map((item) => (
                  <div key={item.product_id} className={styles.cartItem}>
                    <div className={styles.itemInfo}>
                      <span className={styles.itemName}>{item.name}</span>
                      <span className={styles.itemPrice}>{formatMoney(item.unit_price)} un</span>
                    </div>
                    <div className={styles.itemControls}>
                      <button onClick={() => updateQuantity(item.product_id, -1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product_id, 1)}>+</button>
                      <button className={styles.removeBtn} onClick={() => removeFromCart(item.product_id)}>x</button>
                    </div>
                    <div className={styles.itemSubtotal}>{formatMoney(item.quantity * item.unit_price)}</div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className={styles.sidePanel}>
          <Card className={styles.productsSection}>
            <div className={styles.sectionHeader}>
              <Coffee size={18} />
              <h3>Produtos</h3>
            </div>
            <div className={styles.productList}>
              {products.map((product) => (
                <div key={product.id} className={styles.productCard} onClick={() => addToCart(product)}>
                  <div>
                    <div className={styles.prodName}>{product.name}</div>
                    <div className={styles.prodStock}>Disp: {product.current_stock}</div>
                  </div>
                  <div className={styles.prodPrice}>{formatMoney(product.sale_price)}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className={styles.checkoutSection}>
            <h3>{isOpenTicketMode ? 'Resumo do Ticket Aberto' : 'Resumo da Venda'}</h3>

            <div className={styles.summaryRow}>
              <span>Servicos ({savedServiceCount + serviceCart.reduce((sum, item) => sum + item.quantity, 0)})</span>
              <span>{formatMoney(serviceTotal)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Produtos ({savedProductCount + cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
              <span>{formatMoney(productsTotal)}</span>
            </div>
            <div className={styles.summaryTotal}>
              <span>Total</span>
              <span>{formatMoney(grandTotal)}</span>
            </div>

            {isOpenTicketMode && (
              <div className={styles.openTicketNote}>
                <strong>Em aberto:</strong> {openTicketItemCount} itens ja salvos. Clique em um produto ou servico para lancar direto neste ticket.
              </div>
            )}

            <div className={styles.paymentSection}>
              <label>Forma de Pagamento</label>
              <select
                className={styles.select}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="pix">PIX</option>
                <option value="credit_card">Cartao de Credito</option>
                <option value="debit_card">Cartao de Debito</option>
                <option value="cash">Dinheiro</option>
              </select>

              {paymentMethod === 'cash' && (
                <div className={styles.cashInput}>
                  <label>Valor Recebido (R$)</label>
                  <input
                    type="number"
                    className={styles.select}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder={grandTotal.toFixed(2)}
                  />
                  {changeAmount > 0 && (
                    <div className={styles.changeDisplay}>
                      Troco: <strong>{formatMoney(changeAmount)}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isOpenTicketMode && (
              <Button
                className={styles.secondaryCheckoutBtn}
                onClick={handleSaveOpenTicketItems}
                disabled={!hasPendingItems || loading}
                isLoading={loading}
                variant="secondary"
              >
                Salvar no Ticket Aberto
              </Button>
            )}

            <Button
              className={styles.checkoutBtn}
              onClick={handleCheckout}
              disabled={loading || (!selectedAppointment && !selectedOpenTicketId) || (!isOpenTicketMode && !selectedAppointment)}
              isLoading={loading}
            >
              <ShoppingCart size={18} />
              {isOpenTicketMode ? 'Receber e Fechar Ticket' : 'Receber e Finalizar Ticket'}
            </Button>
          </Card>
        </div>
      </div>

      <div className={styles.historySection}>
        <div className={styles.historyHeader}>
          <History size={20} />
          <h2>Vendas Recentes</h2>
        </div>

        <Card className={styles.historyCard}>
          {recentTickets.length === 0 ? (
            <div className={styles.emptyHistory}>Nenhuma venda paga recente.</div>
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
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>{new Date(ticket.created_at).toLocaleString('pt-BR')}</td>
                      <td>{ticket.clients?.name || 'Venda Avulsa'}</td>
                      <td>{ticket.barbers?.name || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{formatMoney(Number(ticket.total_amount))}</td>
                      <td>
                        <span className={styles.paymentBadge}>{ticket.payment_method || '-'}</span>
                      </td>
                      <td>
                        <button
                          className={styles.deleteHistoryBtn}
                          onClick={() => handleDeleteTicket(ticket.id)}
                          title="Excluir Venda"
                        >
                          x
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

      <Modal
        isOpen={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        title="Cadastrar Novo Cliente"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setClientModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleQuickClient} isLoading={clientSaving}>Cadastrar</Button>
          </>
        )}
      >
        <div className={styles.modalBody}>
          <Input
            label="Nome Completo"
            placeholder="Ex: Joao Silva"
            value={clientForm.name}
            onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
            autoFocus
          />
          <Input
            label="Telefone"
            placeholder="(11) 99999-0000"
            value={clientForm.phone}
            onChange={(e) => setClientForm({ ...clientForm, phone: normalizePhone(e.target.value) })}
          />
        </div>
      </Modal>

      <Modal
        isOpen={openTicketModalOpen}
        onClose={() => setOpenTicketModalOpen(false)}
        title="Abrir Ticket"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setOpenTicketModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateOpenTicket} isLoading={openTicketSaving}>Abrir Ticket</Button>
          </>
        )}
      >
        <div className={styles.modalBody}>
          <p className={styles.modalText}>
            Use um nome simples para identificar a conta, como Joao, Mesa 1 ou Cliente camisa azul.
          </p>
          <Input
            label="Nome ou identificacao"
            placeholder="Ex: Joao ou Mesa 1"
            value={openTicketForm.label}
            onChange={(e) => setOpenTicketForm({ ...openTicketForm, label: e.target.value })}
            autoFocus
          />
          <div className={styles.selectGroup}>
            <label>Cliente cadastrado (opcional)</label>
            <select
              className={styles.select}
              value={openTicketForm.client_id}
              onChange={(e) => setOpenTicketForm({ ...openTicketForm, client_id: e.target.value })}
            >
              <option value="">Nenhum cliente vinculado</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
