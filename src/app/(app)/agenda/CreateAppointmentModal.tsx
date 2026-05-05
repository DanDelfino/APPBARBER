'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDate: Date;
}

export function CreateAppointmentModal({ isOpen, onClose, onSuccess, selectedDate }: CreateAppointmentModalProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    client_id: '',
    barber_id: '',
    service_id: '',
    start_time: '09:00',
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchFormData();
    }
  }, [isOpen]);

  const fetchFormData = async () => {
    const [clientsRes, barbersRes, servicesRes] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('barbers').select('id, name').eq('active', true).order('name'),
      supabase.from('services').select('id, name, duration_minutes').eq('active', true).order('name')
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (barbersRes.data) setBarbers(barbersRes.data);
    if (servicesRes.data) setServices(servicesRes.data);
  };

  const checkConflict = async (barberId: string, date: string, start: string, end: string) => {
    // Check if the barber is already busy during [start, end]
    const { data } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', barberId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled')
      .neq('status', 'no_show')
      // Postgres time overlaps check equivalent: (A.start < B.end AND A.end > B.start)
      .lt('start_time', end)
      .gt('end_time', start);

    return data && data.length > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Find the selected service to get its duration
    const service = services.find(s => s.id === formData.service_id);
    if (!service) {
      setError('Serviço inválido.');
      setLoading(false);
      return;
    }

    // Calculate end_time based on duration
    const startDate = new Date(`2000-01-01T${formData.start_time}:00`);
    const endDate = new Date(startDate.getTime() + service.duration_minutes * 60000);
    const end_time = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;

    const formattedDate = selectedDate.toISOString().split('T')[0];

    // Validate conflict
    const hasConflict = await checkConflict(formData.barber_id, formattedDate, `${formData.start_time}:00`, end_time);
    if (hasConflict) {
      setError('Este barbeiro já possui um agendamento nesse horário.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('appointments')
      .insert({
        client_id: formData.client_id,
        barber_id: formData.barber_id,
        service_id: formData.service_id,
        appointment_date: formattedDate,
        start_time: `${formData.start_time}:00`,
        end_time: end_time,
        notes: formData.notes,
        status: 'scheduled'
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      onSuccess();
      onClose();
    }
    
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Novo Agendamento</h2>
          <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Cliente</label>
            <select 
              required
              className={styles.select}
              value={formData.client_id}
              onChange={e => setFormData({...formData, client_id: e.target.value})}
            >
              <option value="">Selecione o cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Barbeiro</label>
            <select 
              required
              className={styles.select}
              value={formData.barber_id}
              onChange={e => setFormData({...formData, barber_id: e.target.value})}
            >
              <option value="">Selecione o profissional</option>
              {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Serviço</label>
            <select 
              required
              className={styles.select}
              value={formData.service_id}
              onChange={e => setFormData({...formData, service_id: e.target.value})}
            >
              <option value="">Selecione o serviço</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}m)</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Horário de Início</label>
            <input 
              type="time" 
              required
              className={styles.select} // reusing the select style for standard padding
              value={formData.start_time}
              onChange={e => setFormData({...formData, start_time: e.target.value})}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Observações (Opcional)</label>
            <textarea 
              className={styles.textarea}
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" isLoading={loading}>Confirmar Agendamento</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
