'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { Check, Plus, Edit2, Trash2, UserRound } from 'lucide-react';
import styles from './Configuracoes.module.css';

/* Paleta de cores pré-definidas */
const COLOR_PALETTE = [
  { name: 'Azul',       value: '#3b82f6' },
  { name: 'Índigo',     value: '#6366f1' },
  { name: 'Violeta',    value: '#8b5cf6' },
  { name: 'Rosa',       value: '#ec4899' },
  { name: 'Vermelho',   value: '#ef4444' },
  { name: 'Laranja',    value: '#f97316' },
  { name: 'Amarelo',    value: '#eab308' },
  { name: 'Verde',      value: '#22c55e' },
  { name: 'Esmeralda',  value: '#10b981' },
  { name: 'Ciano',      value: '#06b6d4' },
  { name: 'Cinza',      value: '#6b7280' },
  { name: 'Dourado',    value: '#d97706' },
];

interface ShopSettings {
  shop_name: string;
  phone: string;
  address: string;
  opening_hours: string;
  appointment_interval: number;
  brand_name: string;
  brand_accent: string;
  logo_url: string;
}

interface Barber {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

const defaultSettings: ShopSettings = {
  shop_name: '',
  phone: '',
  address: '',
  opening_hours: '09:00 – 19:00',
  appointment_interval: 30,
  brand_name: 'BarberManager',
  brand_accent: '#3b82f6',
  logo_url: '',
};

export default function ConfiguracoesPage() {
  const [form, setForm] = useState<ShopSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  /* Barbeiros */
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberModal, setBarberModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState<string | null>(null);
  const [barberForm, setBarberForm] = useState({ name: '', phone: '' });
  const [savingBarber, setSavingBarber] = useState(false);

  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    loadSettings();
    loadBarbers();
  }, []);

  /* ============ SETTINGS ============ */
  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('shop_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (data) {
      setForm({
        shop_name: data.shop_name || '',
        phone: data.phone || '',
        address: data.address || '',
        opening_hours: data.opening_hours || '09:00 – 19:00',
        appointment_interval: data.appointment_interval || 30,
        brand_name: data.brand_name || 'BarberManager',
        brand_accent: data.brand_accent || '#3b82f6',
        logo_url: data.logo_url || '',
      });
    } else if (error) {
      console.warn('shop_settings não encontrada:', error.message);
    }
    setLoaded(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('shop_settings')
      .upsert({ id: 1, ...form });

    if (error) {
      console.error('Erro ao salvar:', error);
      showToast(`Erro ao salvar: ${error.message}`, 'error');
    } else {
      showToast('Configurações salvas! Recarregue para aplicar o branding.', 'success');
    }
    setSaving(false);
  };

  /* ============ BARBERS ============ */
  const loadBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('*')
      .order('name');
    if (data) setBarbers(data);
  };

  const openCreateBarber = () => {
    setEditingBarber(null);
    setBarberForm({ name: '', phone: '' });
    setBarberModal(true);
  };

  const openEditBarber = (b: Barber) => {
    setEditingBarber(b.id);
    setBarberForm({ name: b.name, phone: b.phone || '' });
    setBarberModal(true);
  };

  const handleSaveBarber = async () => {
    if (!barberForm.name.trim()) {
      showToast('Nome do barbeiro é obrigatório.', 'error');
      return;
    }

    setSavingBarber(true);

    if (editingBarber) {
      const { error } = await supabase
        .from('barbers')
        .update({ name: barberForm.name.trim(), phone: barberForm.phone.trim() })
        .eq('id', editingBarber);

      if (error) {
        showToast('Erro ao atualizar barbeiro.', 'error');
      } else {
        showToast('Barbeiro atualizado!', 'success');
      }
    } else {
      const { error } = await supabase
        .from('barbers')
        .insert({ name: barberForm.name.trim(), phone: barberForm.phone.trim(), active: true });

      if (error) {
        showToast('Erro ao cadastrar barbeiro.', 'error');
      } else {
        showToast('Barbeiro cadastrado!', 'success');
      }
    }

    setSavingBarber(false);
    setBarberModal(false);
    loadBarbers();
  };

  const handleDeleteBarber = async (id: string, name: string) => {
    if (!confirm(`Excluir o barbeiro "${name}"?`)) return;

    const { error } = await supabase.from('barbers').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir barbeiro.', 'error');
    } else {
      showToast('Barbeiro excluído.', 'success');
      loadBarbers();
    }
  };

  const toggleBarberActive = async (b: Barber) => {
    const { error } = await supabase
      .from('barbers')
      .update({ active: !b.active })
      .eq('id', b.id);

    if (!error) {
      showToast(`${b.name} ${!b.active ? 'ativado' : 'desativado'}.`, 'success');
      loadBarbers();
    }
  };

  if (!loaded) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Configurações</h1>
          <p className={styles.subtitle}>Dados, preferências, equipe e branding</p>
        </div>
      </div>

      {/* Dados da Barbearia */}
      <Card title="Dados da Barbearia">
        <div className={styles.section}>
          <div className={styles.formRow}>
            <Input
              label="Nome da Barbearia"
              placeholder="Ex: Barbearia do João"
              value={form.shop_name}
              onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
            />
            <Input
              label="Telefone / WhatsApp"
              placeholder="(11) 99999-0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <Input
            label="Endereço"
            placeholder="Rua, número, bairro — cidade/UF"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />

          <div className={styles.formRow}>
            <Input
              label="Horário de Funcionamento"
              placeholder="09:00 – 19:00"
              value={form.opening_hours}
              onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
            />
            <Input
              label="Intervalo entre Agendamentos (min)"
              type="number"
              min={10}
              step={5}
              value={form.appointment_interval}
              onChange={(e) => setForm({ ...form, appointment_interval: Number(e.target.value) })}
            />
          </div>
        </div>
      </Card>

      {/* Equipe / Barbeiros */}
      <Card title="Equipe — Barbeiros">
        <div className={styles.section}>
          <div className={styles.barberHeader}>
            <p className={styles.sectionSub}>
              Cadastre os barbeiros que atendem na barbearia. Eles aparecerão na agenda e no PDV.
            </p>
            <Button onClick={openCreateBarber}>
              <Plus size={16} /> Adicionar
            </Button>
          </div>

          {barbers.length === 0 ? (
            <div className={styles.emptyBarbers}>
              <UserRound size={32} />
              <span>Nenhum barbeiro cadastrado ainda.</span>
            </div>
          ) : (
            <div className={styles.barberList}>
              {barbers.map((b) => (
                <div key={b.id} className={`${styles.barberItem} ${!b.active ? styles.barberInactive : ''}`}>
                  <div className={styles.barberInfo}>
                    <div className={styles.barberAvatar}>
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className={styles.barberName}>{b.name}</span>
                      {b.phone && <span className={styles.barberPhone}>{b.phone}</span>}
                    </div>
                  </div>
                  <div className={styles.barberActions}>
                    <button
                      className={`${styles.statusBadge} ${b.active ? styles.statusActive : styles.statusInactive}`}
                      onClick={() => toggleBarberActive(b)}
                      title={b.active ? 'Desativar' : 'Ativar'}
                    >
                      {b.active ? 'Ativo' : 'Inativo'}
                    </button>
                    <button className={styles.actionBtn} onClick={() => openEditBarber(b)} title="Editar">
                      <Edit2 size={15} />
                    </button>
                    <button className={styles.actionBtn} onClick={() => handleDeleteBarber(b.id, b.name)} title="Excluir">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* White-Label / Branding */}
      <Card title="White-Label / Branding">
        <div className={styles.section}>
          <p className={styles.sectionSub}>
            Personalize a identidade visual do sistema. As mudanças aparecerão no menu lateral e na tela de login.
          </p>

          <Input
            label="Nome da Marca"
            placeholder="Ex: BarberManager, MeuCorte, StudioX"
            value={form.brand_name}
            onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
          />

          {/* Paleta de cores visuais */}
          <div>
            <label className={styles.colorLabel}>Cor da Marca</label>
            <div className={styles.colorPalette}>
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`${styles.colorSwatch} ${form.brand_accent === color.value ? styles.colorSwatchActive : ''}`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setForm({ ...form, brand_accent: color.value })}
                  title={color.name}
                  aria-label={`Cor ${color.name}`}
                >
                  {form.brand_accent === color.value && (
                    <Check size={16} color="#fff" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
            <p className={styles.colorSelected}>
              Selecionada: <strong>{COLOR_PALETTE.find(c => c.value === form.brand_accent)?.name || 'Personalizada'}</strong>
            </p>
          </div>

          <Input
            label="URL do Logo (opcional)"
            placeholder="https://exemplo.com/logo.png"
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
          />
        </div>
      </Card>

      {/* Save */}
      <div className={styles.actions}>
        <Button onClick={handleSave} isLoading={saving}>
          Salvar Configurações
        </Button>
      </div>

      {/* Modal Barbeiro */}
      <Modal
        isOpen={barberModal}
        onClose={() => setBarberModal(false)}
        title={editingBarber ? 'Editar Barbeiro' : 'Novo Barbeiro'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBarberModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveBarber} isLoading={savingBarber}>
              {editingBarber ? 'Salvar' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        <Input
          label="Nome do Barbeiro *"
          placeholder="Nome completo"
          value={barberForm.name}
          onChange={(e) => setBarberForm({ ...barberForm, name: e.target.value })}
          autoFocus
        />
        <Input
          label="Telefone"
          placeholder="(11) 99999-0000"
          value={barberForm.phone}
          onChange={(e) => setBarberForm({ ...barberForm, phone: e.target.value })}
        />
      </Modal>
    </div>
  );
}
