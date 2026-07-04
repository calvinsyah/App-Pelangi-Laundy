import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Receipt, FileText, PieChart, Users, Settings, LogOut, Shirt, Menu, X, ChevronDown, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, role } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Transaksi': true,
    'Tagihan': true,
    'Keuangan': true,
    'Sistem': true,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const navGroups = [
    {
      name: 'Transaksi',
      items: [
        { name: 'Input Nota', path: '/transaksi/input', icon: <Receipt size={20} /> },
        { name: 'Riwayat Nota', path: '/transaksi/riwayat', icon: <FileText size={20} /> },
      ],
      adminOnly: false,
    },
    {
      name: 'Tagihan',
      items: [
        { name: 'Invoice', path: '/tagihan/invoice', icon: <FileText size={20} /> },
        { name: 'Kuitansi', path: '/tagihan/kuitansi', icon: <Receipt size={20} /> },
      ],
      adminOnly: true,
    },
    {
      name: 'Keuangan',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
        { name: 'Pengeluaran', path: '/keuangan/pengeluaran', icon: <Receipt size={20} /> },
        { name: 'Laporan', path: '/keuangan/laporan', icon: <PieChart size={20} /> },
        { name: 'Utang', path: '/keuangan/utang', icon: <FileText size={20} /> },
        { name: 'Absensi & Gaji', path: '/keuangan/gaji', icon: <Users size={20} /> },
      ],
      adminOnly: true,
    },
    {
      name: 'Sistem',
      items: [
        { name: 'Master Linen', path: '/master/linen', icon: <Shirt size={20} /> },
        { name: 'Karyawan', path: '/master/karyawan', icon: <Users size={20} /> },
        { name: 'Jenis Nota', path: '/master/jenis-nota', icon: <FileText size={20} /> },
        { name: 'Pelanggan', path: '/master/pelanggan', icon: <Users size={20} /> },
        { name: 'Backup', path: '/sistem/backup', icon: <Settings size={20} /> },
        { name: 'Pengaturan', path: '/sistem/pengaturan', icon: <Settings size={20} /> },
      ],
      adminOnly: true,
    }
  ];

  const filteredGroups = navGroups.filter(g => isAdmin || !g.adminOnly);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileOpen(true)} className="p-2 -ml-2 text-gray-600">
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-blue-600">Pelangi Laundry</h1>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
          {isAdmin ? '👑 ADMIN' : '👤 USER'}
        </div>
      </div>

      {/* Backdrop */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-40 transform transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600 hidden lg:block">Pelangi Laundry</h1>
          <div className={`hidden lg:block px-3 py-1 rounded-full text-xs font-bold ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
            {isAdmin ? '👑 ADMIN' : '👤 USER'}
          </div>
          <button onClick={() => setIsMobileOpen(false)} className="lg:hidden p-2 text-gray-500">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.name} className="px-3">
              <button 
                onClick={() => toggleGroup(group.name)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-900 transition-colors"
              >
                {group.name}
                {openGroups[group.name] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              {openGroups[group.name] && (
                <div className="mt-2 space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                        location.pathname === item.path
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
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
      <main className="flex-1 overflow-y-auto lg:p-8 p-4 pt-20 lg:pt-8 bg-gray-50 h-full">
        <Outlet />
      </main>
    </div>
  );
}
