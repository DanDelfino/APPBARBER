'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { CalendarDays, DollarSign, Users, Package, AlertTriangle, Clock3, Scissors, User, Receipt } from 'lucide-react';
import { endOfDay, format, startOfDay } from 'date-fns';
import styles from './Dashboard.module.css';

interface DashboardMetrics {
  appointmentsToday: number;
  paidRevenueToday: number;
  openTicketAmount: number;
  openTicketsCount: number;
  newClients: number;
  lowStockItems: number;
}

interface AppointmentToday {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  clients: { name: string } | null;
  barbers: { name: string } | null;
  services: { name: string } | null;
}

interface AppointmentTodayRow {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  clients: { name: string }[] | { name: string } | null;
  barbers: { name: string }[] | { name: string } | null;
  services: { name: string }[] | { name: string } | null;
}

interface AppointmentStatusBreakdown {
  scheduled: number;
  confirmed: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

const emptyBreakdown: AppointmentStatusBreakdown = {
  scheduled: 0,
  confirmed: 0,
  in_progress: 0,
  completed: 0,
  cancelled: 0,
  no_show: 0,
};

const statusMeta: Record<string, { label: string; tone: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'gray' }> = {
  scheduled: { label: 'Agendado', tone: 'blue' },
  confirmed: { label: 'Confirmado', tone: 'green' },
  in_progress: { label: 'Em Atendimento', tone: 'orange' },
  completed: { label: 'Concluido', tone: 'purple' },
  cancelled: { label: 'Cancelado', tone: 'red' },
  no_show: { label: 'Nao Compareceu', tone: 'gray' },
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    appointmentsToday: 0,
    paidRevenueToday: 0,
    openTicketAmount: 0,
    openTicketsCount: 0,
    newClients: 0,
    lowStockItems: 0,
  });
  const [appointmentsToday, setAppointmentsToday] = useState<AppointmentToday[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<AppointmentStatusBreakdown>(emptyBreakdown);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const pickRelation = (value: { name: string }[] | { name: string } | null) => {
    if (!value) return null;
    return Array.isArray(value) ? value[0] || null : value;
  };

  async function fetchMetrics() {
    setLoading(true);

    const dayStart = startOfDay(new Date());
    const dayEnd = endOfDay(new Date());
    const todayStr = format(dayStart, 'yyyy-MM-dd');
    const sevenDaysAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

    const [appointmentsRes, paidTicketsRes, openTicketsRes, clientsRes, productsRes] = await Promise.all([
      supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          clients (name),
          barbers (name),
          services (name)
        `)
        .eq('appointment_date', todayStr)
        .order('start_time'),
      supabase
        .from('tickets')
        .select('total_amount, created_at, closed_at')
        .eq('status', 'paid'),
      supabase
        .from('tickets')
        .select('id, total_amount')
        .eq('status', 'open'),
      supabase
        .from('clients')
        .select('id', { count: 'exact' })
        .gte('created_at', `${sevenDaysAgo}T00:00:00Z`),
      supabase
        .from('products')
        .select('current_stock, min_stock')
        .eq('active', true),
    ]);

    const appointmentsData = ((appointmentsRes.data || []) as AppointmentTodayRow[]).map((appointment) => ({
      ...appointment,
      clients: pickRelation(appointment.clients),
      barbers: pickRelation(appointment.barbers),
      services: pickRelation(appointment.services),
    }));
    const breakdown = appointmentsData.reduce((acc, appointment) => {
      if (appointment.status in acc) {
        acc[appointment.status as keyof AppointmentStatusBreakdown] += 1;
      }
      return acc;
    }, { ...emptyBreakdown });

    const revenue = (paidTicketsRes.data || []).reduce((sum, ticket) => {
      const effectiveDate = ticket.closed_at || ticket.created_at;
      const effectiveTime = new Date(effectiveDate).getTime();
      if (effectiveTime < dayStart.getTime() || effectiveTime > dayEnd.getTime()) {
        return sum;
      }
      return sum + Number(ticket.total_amount);
    }, 0);
    const openAmount = (openTicketsRes.data || []).reduce((sum, ticket) => sum + Number(ticket.total_amount), 0);
    const openTicketsCount = (openTicketsRes.data || []).length;
    const lowStockCount = (productsRes.data || []).filter((product) => product.current_stock <= product.min_stock).length;

    setAppointmentsToday(appointmentsData);
    setStatusBreakdown(breakdown);
    setMetrics({
      appointmentsToday: appointmentsData.length,
      paidRevenueToday: revenue,
      openTicketAmount: openAmount,
      openTicketsCount,
      newClients: clientsRes.count || 0,
      lowStockItems: lowStockCount,
    });
    setLoading(false);
  }

  useEffect(() => {
    fetchMetrics();
  }, []);

  const todayLabel = format(new Date(), "dd/MM/yyyy");

  if (loading) {
    return <div className={styles.container}>Carregando metricas...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Visao geral do sistema</p>
      </div>

      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
            <CalendarDays size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Atendimentos de Hoje</p>
            <p className={styles.statValue}>{metrics.appointmentsToday}</p>
            <p className={styles.statHint}>Inclui todos os status do dia</p>
          </div>
        </Card>

        <Card className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Faturamento Pago Hoje</p>
            <p className={styles.statValue}>R$ {metrics.paidRevenueToday.toFixed(2)}</p>
            <p className={styles.statHint}>Somente tickets pagos no dia</p>
          </div>
        </Card>

        <Card className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}>
            <Receipt size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Valor em Aberto</p>
            <p className={styles.statValue}>R$ {metrics.openTicketAmount.toFixed(2)}</p>
            <p className={styles.statHint}>{metrics.openTicketsCount} tickets aguardando fechamento</p>
          </div>
        </Card>

        <Card className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}>
            <Clock3 size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Tickets Abertos</p>
            <p className={styles.statValue}>{metrics.openTicketsCount}</p>
            <p className={styles.statHint}>Nao entra no faturamento pago</p>
          </div>
        </Card>

        <Card className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: '#fdf2f8', color: '#ec4899' }}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Novos Clientes (7d)</p>
            <p className={styles.statValue}>{metrics.newClients}</p>
          </div>
        </Card>

        <Card className={styles.statCard}>
          <div
            className={styles.statIconWrapper}
            style={{
              backgroundColor: metrics.lowStockItems > 0 ? '#fef2f2' : '#fffbeb',
              color: metrics.lowStockItems > 0 ? '#ef4444' : '#f59e0b',
            }}
          >
            {metrics.lowStockItems > 0 ? <AlertTriangle size={24} /> : <Package size={24} />}
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Estoque Baixo</p>
            <p className={styles.statValue}>{metrics.lowStockItems} itens</p>
          </div>
        </Card>
      </div>

      <Card title={`Hoje (${todayLabel})`}>
        <div className={styles.statusSummary}>
          {Object.entries(statusBreakdown).map(([status, count]) => {
            const meta = statusMeta[status] || { label: status, tone: 'gray' as const };
            return (
              <div key={status} className={`${styles.statusPill} ${styles[`tone-${meta.tone}`]}`}>
                <span>{meta.label}</span>
                <strong>{count}</strong>
              </div>
            );
          })}
        </div>

        {appointmentsToday.length === 0 ? (
          <div className={styles.emptyState}>Nenhum atendimento registrado para hoje.</div>
        ) : (
          <div className={styles.todayList}>
            {appointmentsToday.map((appointment) => {
              const meta = statusMeta[appointment.status] || { label: appointment.status, tone: 'gray' as const };
              return (
                <div key={appointment.id} className={styles.todayRow}>
                  <div className={styles.todayMain}>
                    <div className={styles.todayTime}>
                      <Clock3 size={15} />
                      <span>{appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}</span>
                    </div>
                    <div className={styles.todayClient}>
                      <User size={15} />
                      <span>{appointment.clients?.name || 'Cliente nao identificado'}</span>
                    </div>
                    <div className={styles.todayService}>
                      <Scissors size={15} />
                      <span>{appointment.services?.name || 'Servico nao informado'}</span>
                    </div>
                  </div>
                  <div className={styles.todayMeta}>
                    <span className={styles.todayBarber}>{appointment.barbers?.name || 'Sem profissional'}</span>
                    <span className={`${styles.statusBadge} ${styles[`tone-${meta.tone}`]}`}>{meta.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
