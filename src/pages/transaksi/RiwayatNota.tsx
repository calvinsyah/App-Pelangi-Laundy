import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Edit2, Trash2, Search, Eye, X } from 'lucide-react';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../components/AuthContext';
import { fmtRp } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function RiwayatNota() {
  const [notaList, setNotaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterPelanggan, setFilterPelanggan] = useState('');
  
  const [pelangganList, setPelangganList] = useState<any[]>([]);

  // Modals & Hooks
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [detailNota, setDetailNota] = useState<any>(null); // For modal

  useEffect(() => {
    const fetchPelanggan = async () => {
      const { data } = await supabase.from('pelanggan').select('id, nama, tarif_rs, tipe_billing, tipe').order('nama');
      setPelangganList(data || []);
    };
    fetchPelanggan();
  }, []);

  const fetchNota = async () => {
    setLoading(true);
    let query = supabase
      .from('nota')
      .select(`
        id, tanggal, berat_kg, status_bayar, items,
        pelanggan (id, nama, tipe_billing, tipe, tarif_rs, tarif_flat),
        jenis_nota (id, nama)
      `)
      .order('tanggal', { ascending: false });

    if (filterPelanggan) {
      query = query.eq('pelanggan_id', filterPelanggan);
    }

    if (filterBulan) {
      // Assuming filterBulan is 'YYYY-MM'
      const startDate = `${filterBulan}-01`;
      const endDate = new Date(filterBulan.split('-')[0] as any, filterBulan.split('-')[1] as any, 0).toISOString().split('T')[0];
      query = query.gte('tanggal', startDate).lte('tanggal', endDate);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching nota:', error);
      toast('Gagal mengambil data nota', 'error');
    } else {
      setNotaList(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNota();
  }, [filterBulan, filterPelanggan]);

  const handleDelete = async (id: number) => {
    const ok = await confirm('Yakin ingin menghapus nota ini? Aksi ini tidak dapat dibatalkan.');
    if (ok) {
      const { error } = await supabase.from('nota').delete().eq('id', id);
      if (error) {
        toast(error.message, 'error');
      } else {
        toast('Nota berhasil dihapus', 'success');
        fetchNota();
      }
    }
  };

  const calculateTotal = (n: any) => {
    if (n.pelanggan?.tipe === 'RS') {
      return (n.berat_kg || 0) * (n.pelanggan?.tarif_rs || 0);
    }
    if (n.pelanggan?.tipe_billing === 'Flat' || n.jenis_nota?.nama === 'FLAT' || n.jenis_nota?.nama === 'FLAT ASLI') {
      return 0; // Flat dibayar bulanan
    }
    if (n.items && Array.isArray(n.items)) {
      return n.items.reduce((sum: number, item: any) => sum + ((item.harga || 0) * (item.qty || 0)), 0);
    }
    return 0;
  };

  const filteredNota = notaList.filter(n => 
    n.pelanggan?.nama?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Riwayat Nota</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 flex flex-wrap gap-4 items-center bg-gray-50 border-b border-gray-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari nama pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="min-w-[200px]">
            <select
              value={filterPelanggan}
              onChange={(e) => setFilterPelanggan(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Semua Pelanggan</option>
              {pelangganList.map(p => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[200px]">
            <input
              type="month"
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-gray-600">
                <th className="p-4 font-medium">Tanggal</th>
                <th className="p-4 font-medium">Pelanggan</th>
                <th className="p-4 font-medium">Jenis Nota</th>
                <th className="p-4 font-medium">Detail</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-4 text-center text-gray-500">Loading...</td></tr>
              ) : filteredNota.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center text-gray-500">Tidak ada data nota.</td></tr>
              ) : (
                filteredNota.map((n) => {
                  const isItem = n.pelanggan?.tipe_billing !== 'Flat' && n.pelanggan?.tipe !== 'RS';
                  const totalTagihan = calculateTotal(n);
                  
                  return (
                    <tr key={n.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-800">{new Date(n.tanggal).toLocaleDateString('id-ID')}</td>
                      <td className="p-4 text-gray-800 font-medium">
                        {n.pelanggan?.nama}
                        <span className="block text-xs text-gray-500">{n.pelanggan?.tipe_billing}</span>
                      </td>
                      <td className="p-4 text-gray-800">{n.jenis_nota?.nama || 'KILOAN'}</td>
                      <td className="p-4 text-gray-800">
                        {isItem ? (
                          <button 
                            onClick={() => setDetailNota(n)}
                            className="text-blue-600 hover:underline flex items-center gap-1 text-sm font-medium"
                          >
                            <Eye size={14} /> Lihat Item
                          </button>
                        ) : (
                          `${n.berat_kg} Kg`
                        )}
                      </td>
                      <td className="p-4 font-semibold text-gray-800">
                        {totalTagihan === 0 && n.pelanggan?.tipe_billing === 'Flat' ? '-' : fmtRp(totalTagihan)}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          n.status_bayar === 'Lunas' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {n.status_bayar}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => navigate('/transaksi/input', { state: { editNotaId: n.id } })}
                              className="text-blue-600 hover:text-blue-800 p-2 rounded-md hover:bg-blue-50 transition-colors"
                              title="Edit Nota"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(n.id)}
                              className="text-red-600 hover:text-red-800 p-2 rounded-md hover:bg-red-50 transition-colors"
                              title="Hapus Nota"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Item */}
      {detailNota && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Detail Item Nota</h3>
                <p className="text-sm text-gray-500">{detailNota.pelanggan?.nama} - {new Date(detailNota.tanggal).toLocaleDateString('id-ID')}</p>
              </div>
              <button onClick={() => setDetailNota(null)} className="text-gray-500 hover:bg-gray-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {detailNota.items && detailNota.items.length > 0 ? (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600">
                      <th className="pb-2">Nama Linen</th>
                      <th className="pb-2 text-right">Qty</th>
                      <th className="pb-2 text-right">Harga</th>
                      <th className="pb-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailNota.items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2 text-gray-800">{item.nama}</td>
                        <td className="py-2 text-right font-medium">{item.qty}</td>
                        <td className="py-2 text-right text-gray-600">{fmtRp(item.harga)}</td>
                        <td className="py-2 text-right font-semibold">{fmtRp(item.harga * item.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-4 text-right font-bold text-gray-800">TOTAL:</td>
                      <td className="pt-4 text-right font-bold text-blue-600">{fmtRp(calculateTotal(detailNota))}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="text-center text-gray-500 py-4">Tidak ada detail item.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
