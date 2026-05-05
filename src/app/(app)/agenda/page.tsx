'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Calendar as CalendarIcon, Clock, User, Plus, Search, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { format, addDays, subDays, startOfDay, isEqual } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/ToastProvider';
import { CreateAppointmentModal } from './CreateAppointmentModal';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import styles from './Agenda.module.css';

interface AppointmentView {
  id: string;
  client_id: string;
  barber_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  clients: { name: string, phone: string };
  barbers: { name: string };
  services: { name: string, price: number, duration_minutes: number };
}

interface Barber {
  id: string;
  name: string;
}

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState<Date>(startOfDay(new Date()));
  const [appointments, setAppointments] = useState<AppointmentView[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingAptId, setCancellingAptId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancellingLoading, setIsCancellingLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    fetchBarbers();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [currentDate, selectedBarberId]);

  const fetchBarbers = async () => {
    const { data } = await supabase.from('barbers').select('id, name').eq('active', true).order('name');
    if (data) setBarbers(data);
  };

  const fetchAppointments = async () => {
    setLoading(true);
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    
    let query = supabase
      .from('appointments')
      .select(`
        *,
        clients (name, phone),
        barbers (name),
        services (name, price, duration_minutes)
      `)
      .eq('appointment_date', formattedDate)
      .order('start_time');

    if (selectedBarberId !== 'all') {
      query = query.eq('barber_id', selectedBarberId);
    }

    const { data, error } = await query;
    if (data) {
      setAppointments(data as any[]);
    }
    setLoading(false);
  };

  const handleCancelAppointment = async () => {
    if (!cancellingAptId) return;
    if (!cancelReason.trim()) return showToast('Por favor, informe o motivo.', 'error');

    setIsCancellingLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          notes: cancelReason.trim()
        })
        .eq('id', cancellingAptId);

      if (error) throw error;

      showToast('Agendamento cancelado!', 'success');
      setCancelModalOpen(false);
      setCancelReason('');
      setCancellingAptId(null);
      fetchAppointments();
    } catch (err) {
      console.error(err);
      showToast('Erro ao cancelar agendamento.', 'error');
    } finally {
      setIsCancellingLoading(false);
    }
  };

  const openCancelModal = (aptId: string) => {
    setCancellingAptId(aptId);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleStartAppointment = async (appointment: AppointmentView) => {
    try {
      if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'in_progress' })
          .eq('id', appointment.id);

        if (error) throw error;
      }

      router.push(`/vendas?appointment=${appointment.id}`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao abrir o atendimento no PDV.', 'error');
    }
  };

  const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1));
  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const handleToday = () => setCurrentDate(startOfDay(new Date()));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'var(--primary)';
      case 'confirmed': return 'var(--success)';
      case 'in_progress': return 'var(--warning)';
      case 'completed': return '#8b5cf6'; // purple
      case 'cancelled': return 'var(--danger)';
      case 'no_show': return '#6b7280'; // gray
      default: return 'var(--text-muted)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Agendado';
      case 'confirmed': return 'Confirmado';
      case 'in_progress': return 'Em Atendimento';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      case 'no_show': return 'Não Compareceu';
      default: return status;
    }
  };

  // Generate time slots from 08:00 to 20:00
  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00:00`);
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30:00`);
  }

  return (
    <div className={styles.container}>
      {/* Header controls */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Agenda</h1>
          <p className={styles.subtitle}>Gerencie os agendamentos do dia</p>
        </div>
        
        <div className={styles.controls}>
          <select 
            className={styles.barberSelect}
            value={selectedBarberId}
            onChange={(e) => setSelectedBarberId(e.target.value)}
          >
            <option value="all">Todos os Barbeiros</option>
            {barbers.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Novo Agendamento
          </Button>
        </div>
      </div>

      <div className={styles.dateNavigation}>
        <div className={styles.dateControls}>
          <button className={styles.iconBtn} onClick={handlePrevDay}><ChevronLeft size={20} /></button>
          <div className={styles.currentDate}>
            <CalendarIcon size={20} className={styles.dateIcon} />
            <h2>{format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h2>
          </div>
          <button className={styles.iconBtn} onClick={handleNextDay}><ChevronRight size={20} /></button>
          {!isEqual(currentDate, startOfDay(new Date())) && (
            <button className={styles.todayBtn} onClick={handleToday}>Hoje</button>
          )}
        </div>
      </div>

      {loading ? (
        <Card className={styles.loadingCard}>Carregando agenda...</Card>
      ) : appointments.length === 0 ? (
        <Card className={styles.emptyCard}>
          <div className={styles.emptyState}>
            <CalendarIcon size={48} className={styles.emptyIcon} />
            <p>Nenhum agendamento para este dia.</p>
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>Criar agendamento</Button>
          </div>
        </Card>
      ) : (
        <div className={styles.agendaGrid}>
          {appointments.map((apt) => (
            <Card key={apt.id} className={styles.appointmentCard}>
              <div 
                className={styles.statusIndicator} 
                style={{ backgroundColor: getStatusColor(apt.status) }}
              />
              <div className={styles.appointmentContent}>
                <div className={styles.appointmentHeader}>
                  <div className={styles.timeBlock}>
                    <Clock size={16} />
                    <span>{apt.start_time.substring(0, 5)} - {apt.end_time.substring(0, 5)}</span>
                  </div>
                  <span 
                    className={styles.statusBadge}
                    style={{ 
                      color: getStatusColor(apt.status),
                      backgroundColor: `${getStatusColor(apt.status)}1A` // 10% opacity
                    }}
                  >
                    {getStatusLabel(apt.status)}
                  </span>
                </div>

                <div className={styles.clientInfo}>
                  <User size={18} className={styles.clientIcon} />
                  <div>
                    <h3 className={styles.clientName}>{apt.clients?.name || 'Cliente deletado'}</h3>
                    <p className={styles.clientPhone}>{apt.clients?.phone}</p>
                  </div>
                </div>

                <div className={styles.serviceDetails}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Serviço:</span>
                    <span className={styles.detailValue}>{apt.services?.name}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Barbeiro:</span>
                    <span className={styles.detailValue}>{apt.barbers?.name}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Valor:</span>
                    <span className={styles.detailValue}>R$ {apt.services?.price.toFixed(2)}</span>
                  </div>
                </div>

                <div className={styles.appointmentActions}>
                  {apt.status !== 'completed' && apt.status !== 'cancelled' ? (
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <Button 
                        variant="primary" 
                        style={{ flex: 1 }}
                        onClick={() => handleStartAppointment(apt)}
                      >
                        {apt.status === 'in_progress' ? 'Finalizar Atendimento' : 'Iniciar Atendimento'}
                      </Button>
                      <button 
                        className={styles.cancelActionBtn} 
                        title="Cancelar Agendamento"
                        onClick={() => openCancelModal(apt.id)}
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <Button variant="secondary" disabled style={{ width: '100%' }}>
                        {apt.status === 'cancelled' ? 'Agendamento Cancelado' : 'Ticket Fechado'}
                      </Button>
                      {apt.status === 'cancelled' && apt.notes && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem' }}>
                          <strong>Motivo:</strong> {apt.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateAppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAppointments}
        selectedDate={currentDate}
      />

      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancelar Agendamento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>Voltar</Button>
            <Button variant="danger" onClick={handleCancelAppointment} isLoading={isCancellingLoading}>
              Confirmar Cancelamento
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
          </p>
          <Input 
            label="Motivo da Desistência"
            placeholder="Ex: Cliente não poderá vir / Imprevisto"
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
}
