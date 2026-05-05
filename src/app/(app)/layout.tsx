import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { WhiteLabelProvider } from '@/components/providers/WhiteLabelProvider';
import styles from './appLayout.module.css';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WhiteLabelProvider>
      <div className={styles.appContainer}>
        <Sidebar />
        <div className={styles.mainWrapper}>
          <Topbar />
          <main className={styles.mainContent}>
            {children}
          </main>
        </div>
      </div>
    </WhiteLabelProvider>
  );
}
