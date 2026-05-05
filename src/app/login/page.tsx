'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import styles from './login.module.css';
import { Scissors } from 'lucide-react';

interface BrandInfo {
  brandName: string;
  brandAccent: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState<BrandInfo>({ brandName: 'BarberManager', brandAccent: '#3b82f6' });

  const router = useRouter();
  const supabase = createClient();

  /* Carrega branding do shop_settings para exibir na tela de login */
  useEffect(() => {
    const loadBrand = async () => {
      const { data } = await supabase
        .from('shop_settings')
        .select('brand_name, brand_accent')
        .eq('id', 1)
        .single();

      if (data) {
        setBrand({
          brandName: data.brand_name || 'BarberManager',
          brandAccent: data.brand_accent || '#3b82f6',
        });
      }
    };
    loadBrand();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Credenciais inválidas. Tente novamente.');
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  /* Separa brandName em duas partes para o highlight */
  const parts = brand.brandName.split(/(?=[A-Z])/, 2);
  const main = parts[0] || brand.brandName;
  const highlight = parts[1] || '';

  return (
    <div
      className={styles.container}
      style={{ '--login-accent': brand.brandAccent } as React.CSSProperties}
    >
      <div className={styles.loginBox}>
        <div className={styles.logoContainer}>
          <Scissors className={styles.logoIcon} size={40} />
          <h1 className={styles.logoText}>
            {main}<span>{highlight}</span>
          </h1>
        </div>
        
        <p className={styles.subtitle}>Faça login para gerenciar sua barbearia</p>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@barbearia.com"
              required
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className={styles.poweredBy}>
          Powered by {brand.brandName}
        </p>
      </div>
    </div>
  );
}
