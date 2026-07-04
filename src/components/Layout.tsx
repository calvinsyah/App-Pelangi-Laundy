import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  FileText, 
  PieChart, 
  Users, 
  Settings, 
  LogOut,
  Shirt
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Input Nota', path: '/transaksi/input', icon: <Receipt size={20} /> },
    { name: 'Riwayat Nota', path: '/transaksi/riwayat', icon: <FileText size={20} /> },
    { name: 'Tagihan', path: '/tagihan', icon: <PieChart size={20} /> },
    { name: 'Pengeluaran', path: '/keuangan/pengeluaran', icon: <Receipt size={20} /> },
    { name: 'Laporan Keuangan', path: '/keuangan/laporan', icon: <PieChart size={20} /> },
    { name: 'Utang Usaha', path: '/keuangan/utang', icon: <FileText size={20} /> },
    { name: 'Absensi & Gaji', path: '/keuangan/gaji', icon: <Users size={20} /> },
    { name: 'Master Linen', path: '/master/linen', icon: <Shirt size={20} /> },
    { name: 'Karyawan', path: '/master/karyawan', icon: <Users size={20} /> },
    { name: 'Jenis Nota', path: '/master/jenis-nota', icon: <FileText size={20} /> },
    { name: 'Pelanggan', path: '/master/pelanggan', icon: <Users size={20} /> },
    { name: 'Backup & Restore', path: '/sistem/backup', icon: <Settings size={20} /> },
    { name: 'Pengaturan', path: '/sistem/pengaturan', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">Pelangi Laundry</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg w-full transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
