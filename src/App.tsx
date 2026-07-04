import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import AbsensiGaji from './pages/keuangan/AbsensiGaji';
import Backup from './pages/sistem/Backup';
import Pengaturan from './pages/sistem/Pengaturan';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
            <Route index element={<Dashboard />} />
            <Route path="transaksi/input" element={<InputNota />} />
            <Route path="transaksi/riwayat" element={<RiwayatNota />} />
            <Route path="tagihan" element={<Tagihan />} />
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
            {/* Add more routes here later */}
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
