'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { CalendarDays, DollarSign, Users, Package, AlertTriangle } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import styles from './Dashboard.module.css';

interface DashboardMetrics {
  appointmentsToday: number;
  revenueToday: number;
  newClients: number;
  lowStockItems: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    appointmentsToday: 0,
    revenueToday: 0,
    newClients: 0,
    lowStockItems: 0
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
    
    // 1. Appointments Today
    const { count: aptCount } = await supabase
      .from('appointments')
      .select('id', { count: 'exact' })
      .eq('appointment_date', todayStr)
      .neq('status', 'cancelled');

    // 2. Revenue Today (from Tickets)
    const { data: tickets } = await supabase
      .from('tickets')
      .select('total_amount')
      .gte('created_at', `${todayStr}T00:00:00Z`)
      .eq('status', 'paid');
      
    const revenue = tickets?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;

    // 3. New Clients (last 7 days - simple proxy for "new")
    const sevenDaysAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    const { count: clientCount } = await supabase
      .from('clients')
      .select('id', { count: 'exact' })
      .gte('created_at', `${sevenDaysAgo}T00:00:00Z`);

    // 4. Low Stock
    // Using simple approach: query all active products and filter in memory, or use a complex query
    // Supabase JS doesn't have a simple columnA <= columnB operator natively in `.select()`, 
    // so we fetch and filter (safe for small catalogs)
    const { data: products } = await supabase
      .from('products')
      .select('current_stock, min_stock')
      .eq('active', true);
      
    const lowStockCount = products?.filter(p => p.current_stock <= p.min_stock).length || 0;

    setMetrics({
      appointmentsToday: aptCount || 0,
      revenueToday: revenue,
      newClients: clientCount || 0,
      lowStockItems: lowStockCount
    });
    setLoading(false);
  };

  if (loading) {
    return <div className={styles.container}>Carregando métricas...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Visão geral do sistema</p>
      </div>

      <div className={styles.statsGrid}>
        <Card className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
            <CalendarDays size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Agendamentos Hoje</p>
            <p className={styles.statValue}>{metrics.appointmentsToday}</p>
          </div>
        </Card>

        <Card className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Faturamento Hoje</p>
            <p className={styles.statValue}>R$ {metrics.revenueToday.toFixed(2)}</p>
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
          <div className={styles.statIconWrapper} style={{ 
            backgroundColor: metrics.lowStockItems > 0 ? '#fef2f2' : '#fffbeb', 
            color: metrics.lowStockItems > 0 ? '#ef4444' : '#f59e0b' 
          }}>
            {metrics.lowStockItems > 0 ? <AlertTriangle size={24} /> : <Package size={24} />}
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statLabel}>Estoque Baixo</p>
            <p className={styles.statValue}>{metrics.lowStockItems} itens</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
