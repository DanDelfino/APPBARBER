'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { Plus, Edit2, AlertCircle, ArrowDownUp } from 'lucide-react';
import styles from '../servicos/Servicos.module.css';

interface Product {
  id: string;
  name: string;
  category: string;
  cost_price: number;
  sale_price: number;
  current_stock: number;
  min_stock: number;
  active: boolean;
}

const emptyForm = {
  name: '',
  category: '',
  cost_price: '',
  sale_price: '',
  current_stock: '',
  min_stock: '',
};

export default function EstoquePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  /* Modal de cadastro / edição */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  /* Modal de ajuste de estoque */
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');

  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => { fetchProducts(); }, []);

  /* ============ CRUD ============ */
  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (data) setProducts(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('O nome do produto é obrigatório.', 'error');
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || 'Geral',
      cost_price: Number(form.cost_price) || 0,
      sale_price: Number(form.sale_price) || 0,
      current_stock: Number(form.current_stock) || 0,
      min_stock: Number(form.min_stock) || 0,
      active: true,
    };

    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        showToast('Erro ao atualizar produto.', 'error');
      } else {
        showToast('Produto atualizado!', 'success');
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert(payload);

      if (error) {
        showToast('Erro ao cadastrar produto.', 'error');
      } else {
        showToast('Produto cadastrado!', 'success');
      }
    }

    setSaving(false);
    closeModal();
    fetchProducts();
  };

  /* ============ Ajuste de estoque ============ */
  const handleAdjust = async () => {
    if (!adjustProduct || !adjustQty) return;
    const qty = Number(adjustQty);
    if (qty <= 0) {
      showToast('Quantidade deve ser maior que zero.', 'error');
      return;
    }

    const newStock = adjustType === 'add'
      ? adjustProduct.current_stock + qty
      : Math.max(0, adjustProduct.current_stock - qty);

    const { error } = await supabase
      .from('products')
      .update({ current_stock: newStock })
      .eq('id', adjustProduct.id);

    if (error) {
      showToast('Erro ao ajustar estoque.', 'error');
    } else {
      showToast(`Estoque atualizado: ${adjustProduct.name} → ${newStock} un.`, 'success');
    }

    setAdjustModal(false);
    setAdjustProduct(null);
    setAdjustQty('');
    fetchProducts();
  };

  /* ============ Modal helpers ============ */
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      category: p.category || '',
      cost_price: String(p.cost_price),
      sale_price: String(p.sale_price),
      current_stock: String(p.current_stock),
      min_stock: String(p.min_stock),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openAdjust = (p: Product) => {
    setAdjustProduct(p);
    setAdjustQty('');
    setAdjustType('add');
    setAdjustModal(true);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Estoque e Produtos</h1>
          <p className={styles.subtitle}>Gerenciamento de bebidas e itens consumíveis</p>
        </div>
        <div className={styles.actions}>
          <Button onClick={openCreate}>
            <Plus size={18} /> Novo Produto
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        {loading ? (
          <div className={styles.loading}>Carregando...</div>
        ) : products.length === 0 ? (
          <div className={styles.emptyState}>Nenhum produto cadastrado.</div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Custo</th>
                  <th>Venda</th>
                  <th>Lucro Unit.</th>
                  <th>Estoque Atual</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const isLowStock = product.current_stock <= product.min_stock;
                  const profit = product.sale_price - product.cost_price;

                  return (
                    <tr key={product.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500 }}>{product.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {product.category || 'Geral'}
                          </span>
                        </div>
                      </td>
                      <td>R$ {product.cost_price.toFixed(2)}</td>
                      <td>R$ {product.sale_price.toFixed(2)}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 500 }}>
                        R$ {profit.toFixed(2)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontWeight: 600,
                            color: isLowStock ? 'var(--danger)' : 'var(--foreground)'
                          }}>
                            {product.current_stock}
                          </span>
                          {isLowStock && (
                            <span title="Estoque Baixo" style={{ display: 'flex' }}>
                              <AlertCircle size={14} color="var(--danger)" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.actionBtn}
                            title="Ajustar Estoque"
                            onClick={() => openAdjust(product)}
                          >
                            <ArrowDownUp size={16} />
                          </button>
                          <button
                            className={styles.actionBtn}
                            title="Editar Produto"
                            onClick={() => openEdit(product)}
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Cadastro / Edição de Produto */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar Produto' : 'Novo Produto'}
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
          label="Nome do Produto *"
          placeholder="Ex: Cerveja Heineken 600ml"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoFocus
        />
        <Input
          label="Categoria"
          placeholder="Ex: Bebida, Cosmético, Acessório"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Preço de Custo (R$)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.cost_price}
            onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
          />
          <Input
            label="Preço de Venda (R$)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={form.sale_price}
            onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input
            label="Estoque Inicial"
            type="number"
            min="0"
            placeholder="0"
            value={form.current_stock}
            onChange={(e) => setForm({ ...form, current_stock: e.target.value })}
          />
          <Input
            label="Estoque Mínimo"
            type="number"
            min="0"
            placeholder="5"
            value={form.min_stock}
            onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
          />
        </div>
      </Modal>

      {/* Modal Ajuste de Estoque */}
      <Modal
        isOpen={adjustModal}
        onClose={() => setAdjustModal(false)}
        title={`Ajustar Estoque — ${adjustProduct?.name || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustModal(false)}>Cancelar</Button>
            <Button onClick={handleAdjust}>Confirmar</Button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Estoque atual: <strong style={{ color: 'var(--foreground)' }}>{adjustProduct?.current_stock}</strong> unidades
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant={adjustType === 'add' ? 'primary' : 'secondary'}
            onClick={() => setAdjustType('add')}
          >
            + Entrada
          </Button>
          <Button
            variant={adjustType === 'remove' ? 'danger' : 'secondary'}
            onClick={() => setAdjustType('remove')}
          >
            − Saída
          </Button>
        </div>
        <Input
          label="Quantidade"
          type="number"
          min="1"
          placeholder="0"
          value={adjustQty}
          onChange={(e) => setAdjustQty(e.target.value)}
          autoFocus
        />
      </Modal>
    </div>
  );
}
