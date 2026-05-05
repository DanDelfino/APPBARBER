'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { Plus, Edit2, Trash2, Search, CheckCircle, XCircle } from 'lucide-react';
import { normalizeName, normalizePhone } from '@/lib/utils';
import styles from '../servicos/Servicos.module.css';

interface Barber {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  created_at: string;
}

const emptyForm = { name: '', phone: '', active: true };

export default function BarbeirosPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  /* Modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => { fetchBarbers(); }, []);

  /* ----------- CRUD ----------- */
  const fetchBarbers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('barbers')
      .select('*')
      .order('name');
    if (data) setBarbers(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('O nome é obrigatório.', 'error');
      return;
    }

    setSaving(true);

    const normalizedName = normalizeName(form.name);
    const normalizedPhone = normalizePhone(form.phone);

    if (editingId) {
      /* Editar */
      const { error } = await supabase
        .from('barbers')
        .update({ 
          name: normalizedName, 
          phone: normalizedPhone, 
          active: form.active 
        })
        .eq('id', editingId);

      if (error) {
        showToast('Erro ao atualizar barbeiro.', 'error');
      } else {
        showToast('Barbeiro atualizado!', 'success');
      }
    } else {
      /* Criar */
      const { error } = await supabase
        .from('barbers')
        .insert({ 
          name: normalizedName, 
          phone: normalizedPhone, 
          active: form.active 
        });

      if (error) {
        showToast('Erro ao cadastrar barbeiro.', 'error');
      } else {
        showToast('Barbeiro cadastrado!', 'success');
      }
    }

    setSaving(false);
    closeModal();
    fetchBarbers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir o barbeiro "${name}"?`)) return;
    const { error } = await supabase.from('barbers').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir barbeiro.', 'error');
    } else {
      showToast('Barbeiro excluído.', 'success');
      fetchBarbers();
    }
  };

  /* ----------- Modal helpers ----------- */
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (barber: Barber) => {
    setEditingId(barber.id);
    setForm({ name: barber.name, phone: barber.phone || '', active: barber.active });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  /* Filtro local */
  const filtered = barbers.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.phone && b.phone.includes(search))
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Barbeiros</h1>
          <p className={styles.subtitle}>Gerencie a equipe de profissionais</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} /> Novo Barbeiro
        </Button>
      </div>

      {/* Barra de busca */}
      {barbers.length > 0 && (
        <div style={{ maxWidth: 360 }}>
          <Input
            placeholder="Buscar por nome ou telefone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Tabela */}
      <Card>
        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            {barbers.length === 0
              ? 'Nenhum barbeiro cadastrado.'
              : 'Nenhum resultado encontrado.'}
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Status</th>
                  <th>Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((barber) => (
                  <tr key={barber.id}>
                    <td style={{ fontWeight: 500 }}>{barber.name}</td>
                    <td>{barber.phone || '-'}</td>
                    <td>
                      <span className={`${styles.badge} ${barber.active ? styles.badgeActive : styles.badgeInactive}`}>
                        {barber.active ? <CheckCircle size={12} style={{marginRight: 4}}/> : <XCircle size={12} style={{marginRight: 4}}/>}
                        {barber.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>{new Date(barber.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} title="Editar" onClick={() => openEdit(barber)}>
                          <Edit2 size={16} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          title="Excluir"
                          onClick={() => handleDelete(barber.id, barber.name)}
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
        title={editingId ? 'Editar Barbeiro' : 'Novo Barbeiro'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSave} isLoading={saving}>
              {editingId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        <Input
          label="Nome *"
          placeholder="Nome completo"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoFocus
        />
        <Input
          label="Telefone"
          placeholder="(11) 99999-0000"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: normalizePhone(e.target.value) })}
        />
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           <input 
            type="checkbox" 
            id="barber-active"
            checked={form.active} 
            onChange={e => setForm({ ...form, active: e.target.checked })}
           />
           <label htmlFor="barber-active" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Profissional Ativo</label>
        </div>
      </Modal>
    </div>
  );
}
