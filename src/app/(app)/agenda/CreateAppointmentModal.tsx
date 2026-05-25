'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { normalizeName, normalizePhone } from '@/lib/utils';
import { Plus, X } from 'lucide-react';
import styles from './Modal.module.css';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDate: Date;
}

interface ClientOption {
  id: string;
  name: string;
}

interface BarberOption {
  id: string;
  name: string;
}

interface ServiceOption {
  id: string;
  name: string;
  duration_minutes: number;
}

export function CreateAppointmentModal({ isOpen, onClose, onSuccess, selectedDate }: CreateAppointmentModalProps) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [barbers, setBarbers] = useState<BarberOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    notes: '',
  });
  const [formData, setFormData] = useState({
    client_id: '',
    barber_id: '',
    service_id: '',
    start_time: '09:00',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();
  const { showToast } = useToast();

  async function fetchFormData() {
    const [clientsRes, barbersRes, servicesRes] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('barbers').select('id, name').eq('active', true).order('name'),
      supabase.from('services').select('id, name, duration_minutes').eq('active', true).order('name'),
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (barbersRes.data) setBarbers(barbersRes.data);
    if (servicesRes.data) setServices(servicesRes.data);
  }

  useEffect(() => {
    if (isOpen) {
      fetchFormData();
    }
  }, [isOpen]);

  const checkConflict = async (barberId: string, date: string, start: string, end: string) => {
    const { data } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', barberId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled')
      .neq('status', 'no_show')
      .lt('start_time', end)
      .gt('end_time', start);

    return data && data.length > 0;
  };

  const handleCreateClient = async () => {
    if (!clientForm.name.trim()) {
      showToast('Informe o nome do cliente.', 'error');
      return;
    }

    setClientSaving(true);
    const normalizedName = normalizeName(clientForm.name);
    const normalizedPhone = normalizePhone(clientForm.phone);

    const { data, error: insertError } = await supabase
      .from('clients')
      .insert({
        name: normalizedName,
        phone: normalizedPhone || null,
        notes: clientForm.notes.trim() || null,
      })
      .select('id, name')
      .single();

    if (insertError || !data) {
      showToast('Erro ao cadastrar cliente.', 'error');
      setClientSaving(false);
      return;
    }

    const nextClients = [...clients, data].sort((a, b) => a.name.localeCompare(b.name));
    setClients(nextClients);
    setFormData((prev) => ({ ...prev, client_id: data.id }));
    setClientForm({ name: '', phone: '', notes: '' });
    setClientModalOpen(false);
    setClientSaving(false);
    showToast('Cliente cadastrado e pronto para agendar.', 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const service = services.find((item) => item.id === formData.service_id);
    if (!service) {
      setError('Servico invalido.');
      setLoading(false);
      return;
    }

    const startDate = new Date(`2000-01-01T${formData.start_time}:00`);
    const endDate = new Date(startDate.getTime() + service.duration_minutes * 60000);
    const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;
    const formattedDate = selectedDate.toISOString().split('T')[0];

    const hasConflict = await checkConflict(formData.barber_id, formattedDate, `${formData.start_time}:00`, endTime);
    if (hasConflict) {
      setError('Este barbeiro ja possui um agendamento nesse horario.');
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
        end_time: endTime,
        notes: formData.notes,
        status: 'scheduled',
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
    <>
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Novo Agendamento</h2>
            <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <label>Cliente</label>
                <Button type="button" variant="secondary" onClick={() => setClientModalOpen(true)}>
                  <Plus size={16} /> Novo Cliente
                </Button>
              </div>
              <select
                required
                className={styles.select}
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              >
                <option value="">Selecione o cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Barbeiro</label>
              <select
                required
                className={styles.select}
                value={formData.barber_id}
                onChange={(e) => setFormData({ ...formData, barber_id: e.target.value })}
              >
                <option value="">Selecione o profissional</option>
                {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Servico</label>
              <select
                required
                className={styles.select}
                value={formData.service_id}
                onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
              >
                <option value="">Selecione o servico</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.duration_minutes}m)
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Horario de Inicio</label>
              <input
                type="time"
                required
                className={styles.select}
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Observacoes (Opcional)</label>
              <textarea
                className={styles.textarea}
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className={styles.footer}>
              <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button type="submit" isLoading={loading}>Confirmar Agendamento</Button>
            </div>
          </form>
        </div>
      </div>

      <Modal
        isOpen={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        title="Novo Cliente"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setClientModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateClient} isLoading={clientSaving}>Salvar Cliente</Button>
          </>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Cadastre rapidamente e siga no agendamento sem sair da tela.
          </p>
          <Input
            label="Nome do cliente"
            placeholder="Ex: Joao Silva"
            value={clientForm.name}
            onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
            autoFocus
          />
          <Input
            label="Telefone (opcional)"
            placeholder="(11) 99999-0000"
            value={clientForm.phone}
            onChange={(e) => setClientForm({ ...clientForm, phone: normalizePhone(e.target.value) })}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}>Observacao (opcional)</label>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="Ex: prefere atendimento rapido"
              value={clientForm.notes}
              onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
