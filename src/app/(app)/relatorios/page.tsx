'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CalendarDays, DollarSign, TrendingUp, ShoppingBag } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import styles from './Relatorios.module.css';

type PeriodKey = '7' | '30' | '90';

interface Ticket {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  service_name?: string;
}

export default function RelatoriosPage() {
  const [period, setPeriod] = useState<PeriodKey>('30');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  /* Fetch data whenever period changes */
  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    const from = format(subDays(new Date(), Number(period)), 'yyyy-MM-dd');

    const [ticketRes, apptRes] = await Promise.all([
      supabase
        .from('tickets')
        .select('id, total_amount, status, created_at')
        .gte('created_at', `${from}T00:00:00Z`),
      supabase
        .from('appointments')
        .select('id, appointment_date, status')
        .gte('appointment_date', from),
    ]);

    if (ticketRes.data) setTickets(ticketRes.data);
    if (apptRes.data) setAppointments(apptRes.data);
    setLoading(false);
  };

  /* ---- Métricas calculadas ---- */
  const paidTickets = useMemo(() => tickets.filter(t => t.status === 'paid'), [tickets]);
  const totalRevenue = useMemo(() => paidTickets.reduce((s, t) => s + Number(t.total_amount), 0), [paidTickets]);
  const ticketMedio = paidTickets.length > 0 ? totalRevenue / paidTickets.length : 0;
  const totalAppointments = appointments.filter(a => a.status !== 'cancelled').length;
  const cancelledPct = appointments.length > 0
    ? ((appointments.filter(a => a.status === 'cancelled').length / appointments.length) * 100).toFixed(1)
    : '0';

  /* ---- Revenue by day (últimos N dias) ---- */
  const revenueByDay = useMemo(() => {
    const map: Record<string, number> = {};
    paidTickets.forEach(t => {
      const day = format(new Date(t.created_at), 'dd/MM');
      map[day] = (map[day] || 0) + Number(t.total_amount);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-15); // últimas 15 datas para a tabela
  }, [paidTickets]);

  const periodLabel: Record<PeriodKey, string> = {
    '7': 'Últimos 7 dias',
    '30': 'Últimos 30 dias',
    '90': 'Últimos 90 dias',
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Relatórios</h1>
          <p className={styles.subtitle}>{periodLabel[period]}</p>
        </div>
        <div className={styles.filters}>
          {(['7', '30', '90'] as PeriodKey[]).map(p => (
            <Button
              key={p}
              variant={period === p ? 'primary' : 'secondary'}
              onClick={() => setPeriod(p)}
            >
              {p}d
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando relatórios...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className={styles.kpiGrid}>
            <Card className={styles.kpiCard}>
              <p className={styles.kpiLabel}>Faturamento Total</p>
              <p className={styles.kpiValue} style={{ color: 'var(--success)' }}>
                R$ {totalRevenue.toFixed(2)}
              </p>
              <p className={styles.kpiSub}>{paidTickets.length} vendas pagas</p>
            </Card>

            <Card className={styles.kpiCard}>
              <p className={styles.kpiLabel}>Ticket Médio</p>
              <p className={styles.kpiValue}>R$ {ticketMedio.toFixed(2)}</p>
              <p className={styles.kpiSub}>por venda</p>
            </Card>

            <Card className={styles.kpiCard}>
              <p className={styles.kpiLabel}>Agendamentos</p>
              <p className={styles.kpiValue}>{totalAppointments}</p>
              <p className={styles.kpiSub}>{cancelledPct}% cancelados</p>
            </Card>

            <Card className={styles.kpiCard}>
              <p className={styles.kpiLabel}>Total de Vendas</p>
              <p className={styles.kpiValue}>{tickets.length}</p>
              <p className={styles.kpiSub}>tickets emitidos</p>
            </Card>
          </div>

          {/* Faturamento por dia */}
          <Card title="Faturamento por dia">
            {revenueByDay.length === 0 ? (
              <div className={styles.emptyState}>Sem dados no período.</div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th style={{ textAlign: 'right' }}>Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueByDay.map(([day, value]) => (
                      <tr key={day}>
                        <td>{day}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                          R$ {value.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
