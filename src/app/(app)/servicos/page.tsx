'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Clock, DollarSign, Check, Loader2 } from 'lucide-react';
import styles from './Servicos.module.css';

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  active: boolean;
  created_at?: string;
}

const emptyForm = { name: '', price: '', duration_minutes: '30', active: true };

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  
  /* Modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  /* Inline price editing state */
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlinePrice, setInlinePrice] = useState('');
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineSavedId, setInlineSavedId] = useState<string | null>(null);

  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('name');
    
    if (data) setServices(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return showToast('O nome é obrigatório.', 'error');
    if (!form.price) return showToast('O preço é obrigatório.', 'error');

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      price: parseFloat(form.price.toString()),
      duration_minutes: parseInt(form.duration_minutes.toString()) || 30,
      active: form.active
    };

    if (editingId) {
      const { error } = await supabase
        .from('services')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        showToast('Erro ao atualizar serviço.', 'error');
      } else {
        showToast('Serviço atualizado!', 'success');
      }
    } else {
      const { error } = await supabase
        .from('services')
        .insert(payload);

      if (error) {
        showToast('Erro ao cadastrar serviço.', 'error');
      } else {
        showToast('Serviço cadastrado!', 'success');
      }
    }

    setSaving(false);
    closeModal();
    fetchServices();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir o serviço "${name}"?`)) return;
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir serviço.', 'error');
    } else {
      showToast('Serviço excluído.', 'success');
      fetchServices();
    }
  };

  /* === Inline price editing === */
  const startInlineEdit = (service: Service) => {
    setInlineEditId(service.id);
    setInlinePrice(service.price.toFixed(2));
  };

  const cancelInlineEdit = () => {
    setInlineEditId(null);
    setInlinePrice('');
  };

  const handleInlinePriceSave = async () => {
    if (!inlineEditId) return;
    const val = parseFloat(inlinePrice);
    if (isNaN(val) || val < 0 || inlinePrice.trim() === '') {
      showToast('Preço inválido.', 'error');
      return;
    }

    setInlineSaving(true);
    const { error } = await supabase
      .from('services')
      .update({ price: val })
      .eq('id', inlineEditId);

    if (error) {
      showToast('Erro ao salvar preço.', 'error');
    } else {
      // Update local state immediately
      setServices(prev => prev.map(s => s.id === inlineEditId ? { ...s, price: val } : s));
      setInlineSavedId(inlineEditId);
      setTimeout(() => setInlineSavedId(null), 1500);
    }
    setInlineSaving(false);
    setInlineEditId(null);
    setInlinePrice('');
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleInlinePriceSave();
    if (e.key === 'Escape') cancelInlineEdit();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingId(service.id);
    setForm({ 
      name: service.name, 
      price: service.price.toString(), 
      duration_minutes: service.duration_minutes.toString(), 
      active: service.active 
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Serviços</h1>
          <p className={styles.subtitle}>Gerencie os serviços oferecidos na barbearia</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} /> Novo Serviço
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : services.length === 0 ? (
          <div className={styles.emptyState}>Nenhum serviço cadastrado.</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Preço</th>
                  <th>Duração</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td style={{ fontWeight: 500 }}>{service.name}</td>
                    <td>
                      {inlineEditId === service.id ? (
                        <div className={styles.inlinePriceEdit}>
                          <span className={styles.inlineCurrency}>R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={styles.inlinePriceInput}
                            value={inlinePrice}
                            onChange={(e) => setInlinePrice(e.target.value)}
                            onKeyDown={handleInlineKeyDown}
                            onBlur={handleInlinePriceSave}
                            autoFocus
                            disabled={inlineSaving}
                          />
                          {inlineSaving && <Loader2 size={14} className={styles.inlineSpinner} />}
                        </div>
                      ) : (
                        <div
                          className={`${styles.priceCell} ${inlineSavedId === service.id ? styles.priceSaved : ''}`}
                          onClick={() => startInlineEdit(service)}
                          title="Clique para editar o preço"
                        >
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>R$</span>
                          {service.price.toFixed(2)}
                          {inlineSavedId === service.id && <Check size={14} className={styles.savedIcon} />}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        <Clock size={14} />
                        {service.duration_minutes} min
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${service.active ? styles.badgeActive : styles.badgeInactive}`}>
                        {service.active ? <CheckCircle size={12} style={{marginRight: 4}}/> : <XCircle size={12} style={{marginRight: 4}}/>}
                        {service.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} title="Editar" onClick={() => openEdit(service)}>
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                          title="Excluir"
                          onClick={() => handleDelete(service.id, service.name)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Cadastro / Edição */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar Serviço' : 'Novo Serviço'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSave} isLoading={saving}>
              {editingId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Input
            label="Nome do Serviço *"
            placeholder="Ex: Corte Degradê"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Preço (R$) *"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Input
              label="Duração (min) *"
              type="number"
              placeholder="30"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <input 
              type="checkbox" 
              id="service-active"
              checked={form.active} 
              onChange={e => setForm({ ...form, active: e.target.checked })}
             />
             <label htmlFor="service-active" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Serviço Ativo</label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
