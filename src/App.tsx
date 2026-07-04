import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from './lib/supabaseClient';

// Providers
import { ToastProvider, useToast } from './components/ToastProvider';
import { ConfirmProvider } from './components/ConfirmDialog';
import { AuthProvider, useAuth } from './components/AuthContext';

// Pages
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MasterLinen from './pages/master/MasterLinen';
import MasterKaryawan from './pages/master/MasterKaryawan';
import MasterJenisNota from './pages/master/MasterJenisNota';
import MasterPelanggan from './pages/master/MasterPelanggan';
import InputNota from './pages/transaksi/InputNota';
import RiwayatNota from './pages/transaksi/RiwayatNota';
import Pengeluaran from './pages/keuangan/Pengeluaran';
import Laporan from './pages/keuangan/Laporan';
import Utang from './pages/keuangan/Utang';
import Tagihan from './pages/tagihan/Tagihan';
import Kuitansi from './pages/tagihan/Kuitansi';
import AbsensiGaji from './pages/keuangan/AbsensiGaji';
import Backup from './pages/sistem/Backup';
import Pengaturan from './pages/sistem/Pengaturan';

const queryClient = new QueryClient();

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
        const { count: countNota } = await supabase.from('nota').select('*', { count: 'exact', head: true }).like('tanggal', `${bulanLalu}%`);
        
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
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <BrowserRouter>
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
            </BrowserRouter>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

const RoleBasedHome = () => {
  const { isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/transaksi/input" replace />;
};

export default App;
