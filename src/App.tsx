import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from './lib/supabaseClient';

// Providers
import { ToastProvider, useToast } from './components/ToastProvider';
import { ConfirmProvider } from './components/ConfirmDialog';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages
const Login = lazy(() => import('./pages/Login'));
import Layout from './components/Layout';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MasterLinen = lazy(() => import('./pages/master/MasterLinen'));
const MasterKaryawan = lazy(() => import('./pages/master/MasterKaryawan'));
const MasterJenisNota = lazy(() => import('./pages/master/MasterJenisNota'));
const MasterPelanggan = lazy(() => import('./pages/master/MasterPelanggan'));
const InputNota = lazy(() => import('./pages/transaksi/InputNota'));
const RiwayatNota = lazy(() => import('./pages/transaksi/RiwayatNota'));
const Pengeluaran = lazy(() => import('./pages/keuangan/Pengeluaran'));
const Laporan = lazy(() => import('./pages/keuangan/Laporan'));
const Utang = lazy(() => import('./pages/keuangan/Utang'));
const Tagihan = lazy(() => import('./pages/tagihan/Tagihan'));
const Kuitansi = lazy(() => import('./pages/tagihan/Kuitansi'));
const AbsensiGaji = lazy(() => import('./pages/keuangan/AbsensiGaji'));
const Backup = lazy(() => import('./pages/sistem/Backup'));
const Pengaturan = lazy(() => import('./pages/sistem/Pengaturan'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      // Cek peringatan backup (bulan lalu)
      const cekPeringatanBackup = async () => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        const bulanLalu = d.toISOString().substring(0, 7); // YYYY-MM
        
        // Cek apakah ada data di bulan lalu
        const startDate = `${bulanLalu}-01`;
        const year = parseInt(bulanLalu.split('-')[0]);
        const month = parseInt(bulanLalu.split('-')[1]);
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${bulanLalu}-${String(lastDay).padStart(2, '0')}`;
        const { count: countNota } = await supabase.from('nota').select('*', { count: 'exact', head: true }).gte('tanggal', startDate).lte('tanggal', endDate);
        
        if (countNota && countNota > 0) {
          // Cek apakah sudah di-backup
          const { data: backupData } = await supabase.from('backup_history').select('*').eq('bulan', bulanLalu).maybeSingle();
          if (!backupData) {
            toast(`Data bulan ${bulanLalu} belum di-backup!`, 'warning', 5000);
          }
        }
      };
      cekPeringatanBackup();
    }
  }, [user]);

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const AdminRoute = () => {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/transaksi/input" replace />;
  }
  return <Outlet />;
};

function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<div>Memuat...</div>}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  {/* Public routes (User & Admin) */}
                  <Route path="transaksi/input" element={<InputNota />} />
                  <Route path="transaksi/riwayat" element={<RiwayatNota />} />
                  
                  {/* Default redirect depending on role */}
                  <Route index element={<RoleBasedHome />} />

                  {/* Admin Only routes */}
                  <Route element={<AdminRoute />}>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="tagihan/invoice" element={<Tagihan />} />
                    <Route path="tagihan/kuitansi" element={<Kuitansi />} />
                    <Route path="keuangan/pengeluaran" element={<Pengeluaran />} />
                    <Route path="keuangan/laporan" element={<Laporan />} />
                    <Route path="keuangan/utang" element={<Utang />} />
                    <Route path="keuangan/gaji" element={<AbsensiGaji />} />
                    <Route path="master/linen" element={<MasterLinen />} />
                    <Route path="master/karyawan" element={<MasterKaryawan />} />
                    <Route path="master/jenis-nota" element={<MasterJenisNota />} />
                    <Route path="master/pelanggan" element={<MasterPelanggan />} />
                    <Route path="sistem/backup" element={<Backup />} />
                    <Route path="sistem/pengaturan" element={<Pengaturan />} />
                  </Route>
                </Route>
              </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

const RoleBasedHome = () => {
  const { isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/transaksi/input" replace />;
};

export default App;
