'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { Plus, Edit2, Trash2, Search, Upload } from 'lucide-react';
import { normalizeName, normalizePhone, parseContactsCSV } from '@/lib/utils';
import styles from '../servicos/Servicos.module.css';

interface Client {
  id: string;
  name: string;
  phone: string;
  notes: string;
  created_at: string;
}

const emptyForm = { name: '', phone: '', notes: '' };

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  /* Modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => { fetchClients(); }, []);

  /* ----------- CRUD ----------- */
  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('name');
    if (data) setClients(data);
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
        .from('clients')
        .update({ 
          name: normalizedName, 
          phone: normalizedPhone, 
          notes: form.notes.trim() 
        })
        .eq('id', editingId);

      if (error) {
        showToast('Erro ao atualizar cliente.', 'error');
      } else {
        showToast('Cliente atualizado!', 'success');
      }
    } else {
      /* Criar */
      const { error } = await supabase
        .from('clients')
        .insert({ 
          name: normalizedName, 
          phone: normalizedPhone, 
          notes: form.notes.trim() 
        });

      if (error) {
        showToast('Erro ao cadastrar cliente.', 'error');
      } else {
        showToast('Cliente cadastrado!', 'success');
      }
    }

    setSaving(false);
    closeModal();
    fetchClients();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir o cliente "${name}"?`)) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir cliente.', 'error');
    } else {
      showToast('Cliente excluído.', 'success');
      fetchClients();
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result as string;
      const parsed = parseContactsCSV(csvText);
      
      if (parsed.length === 0) {
        showToast('Nenhum contato encontrado no CSV ou formato inválido.', 'error');
        return;
      }

      setLoading(true);
      try {
        const normalized = parsed.map(c => ({
          name: normalizeName(c.name),
          phone: normalizePhone(c.phone),
          notes: c.notes?.trim() || ''
        }));

        const { error } = await supabase.from('clients').insert(normalized);

        if (error) throw error;

        showToast(`${normalized.length} contatos importados com sucesso!`, 'success');
        fetchClients();
      } catch (err) {
        console.error(err);
        showToast('Erro ao importar contatos.', 'error');
      } finally {
        setLoading(false);
        // Reset input
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  /* ----------- Modal helpers ----------- */
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingId(client.id);
    setForm({ name: client.name, phone: client.phone || '', notes: client.notes || '' });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  /* Filtro local */
  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Clientes</h1>
          <p className={styles.subtitle}>Gerencie o cadastro de clientes</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <label className="btn-secondary" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            cursor: 'pointer',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            fontSize: '0.875rem',
            backgroundColor: 'var(--background)'
          }}>
            <Upload size={18} /> Importar CSV
            <input 
              type="file" 
              accept=".csv" 
              style={{ display: 'none' }} 
              onChange={handleImportCSV}
              disabled={loading}
            />
          </label>
          <Button onClick={openCreate}>
            <Plus size={18} /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* Barra de busca */}
      {clients.length > 0 && (
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
            {clients.length === 0
              ? 'Nenhum cliente cadastrado.'
              : 'Nenhum resultado encontrado.'}
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Observações</th>
                  <th>Data Cadastro</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id}>
                    <td style={{ fontWeight: 500 }}>{client.name}</td>
                    <td>{client.phone || '-'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {client.notes || '-'}
                    </td>
                    <td>{new Date(client.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} title="Editar" onClick={() => openEdit(client)}>
                          <Edit2 size={16} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          title="Excluir"
                          onClick={() => handleDelete(client.id, client.name)}
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
        title={editingId ? 'Editar Cliente' : 'Novo Cliente'}
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
        <Input
          label="Observações"
          placeholder="Preferências, alergias, etc."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Modal>
    </div>
  );
}
