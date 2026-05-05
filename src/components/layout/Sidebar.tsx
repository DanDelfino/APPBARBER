'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWhiteLabel } from '@/components/providers/WhiteLabelProvider';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  Scissors
} from 'lucide-react';
import styles from './Sidebar.module.css';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agenda', href: '/agenda', icon: CalendarDays },
  { name: 'PDV / Vendas', href: '/vendas', icon: ShoppingCart },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Serviços', href: '/servicos', icon: Scissors },
  { name: 'Estoque', href: '/estoque', icon: Package },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { brandName, brandAccent } = useWhiteLabel();

  /* Separa em 2 partes para highlight: primeira palavra + resto */
  const parts = brandName.split(/(?=[A-Z])/, 2);
  const main = parts[0] || brandName;
  const highlight = parts[1] || '';

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Scissors className={styles.logoIcon} size={28} />
        <h2>{main}<span style={{ color: brandAccent }}>{highlight}</span></h2>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              style={isActive ? { color: brandAccent } : undefined}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.bottomNav}>
        <Link 
          href="/configuracoes" 
          className={`${styles.navItem} ${pathname === '/configuracoes' ? styles.active : ''}`}
          style={pathname === '/configuracoes' ? { color: brandAccent } : undefined}
        >
          <Settings size={20} />
          <span>Configurações</span>
        </Link>
      </div>
    </aside>
  );
}
