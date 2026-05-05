'use client';

import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useWhiteLabel } from '@/components/providers/WhiteLabelProvider';
import { LogOut, User } from 'lucide-react';
import styles from './Topbar.module.css';

export function Topbar() {
  const router = useRouter();
  const supabase = createClient();
  const { shopName } = useWhiteLabel();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.search}>
        {shopName && (
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {shopName}
          </span>
        )}
      </div>
      
      <div className={styles.actions}>
        <div className={styles.userProfile}>
          <div className={styles.avatar}>
            <User size={20} />
          </div>
          <span className={styles.userName}>Administrador</span>
        </div>
        
        <button className={styles.logoutBtn} onClick={handleLogout} title="Sair">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
