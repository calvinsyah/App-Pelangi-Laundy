import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Edit2, Trash2, Search, Eye, X } from 'lucide-react';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../components/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { fmtRp, getSafeErrorMessage } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import InputNota from './InputNota';

export default function RiwayatNota() {
  const [notaList, setNotaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  
  const getCurrentMonthString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };
  const [filterBulan, setFilterBulan] = useState(getCurrentMonthString());
  const [filterPelanggan, setFilterPelanggan] = useState('');
  
  const [pelangganList, setPelangganList] = useState<any[]>([]);

  // Modals & Hooks
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [detailNota, setDetailNota] = useState<any>(null); // For modal
  const [editModalId, setEditModalId] = useState<number | null>(null);

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
        id, tanggal, berat_kg, status_bayar, items, jenis,
        pelanggan (id, nama, tipe_billing, tipe, tarif_rs, tarif_flat),
        jenis_nota (id, nama)
      `)
      .order('tanggal', { ascending: true })
      .limit(500);

    if (filterPelanggan) {
      query = query.eq('pelanggan_id', filterPelanggan);
    }

    if (filterBulan) {
      // Assuming filterBulan is 'YYYY-MM'
      const startDate = `${filterBulan}-01`;
      const year = parseInt(filterBulan.split('-')[0], 10);
      const month = parseInt(filterBulan.split('-')[1], 10);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${filterBulan}-${String(lastDay).padStart(2, '0')}`;
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
        console.error('Detail error:', error);
        toast(getSafeErrorMessage(error), 'error');
      } else {
        toast('Nota berhasil dihapus', 'success');
        queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
        fetchNota();
      }
    }
  };

  const calculateTotal = (n: any) => {
    if (n.pelanggan?.tipe?.toUpperCase() === 'RS' && n.items === null) {
      return (n.berat_kg || 0) * (n.pelanggan?.tarif_rs || 0);
    }
    if (n.items && Array.isArray(n.items)) {
      return n.items.reduce((sum: number, item: any) => sum + ((item.harga || item.basePrice || 0) * (item.qty || 0)), 0);
    }
    return n.total || 0;
  };

  const filteredNota = React.useMemo(() => {
    return notaList.filter(n => 
      n.pelanggan?.nama?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [notaList, searchQuery]);

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

        {filterBulan && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-sm text-blue-700 flex items-center gap-2">
            <span className="font-medium">Filter bulan aktif:</span> 
            Menampilkan data untuk bulan {filterBulan}. Kosongkan filter bulan jika ingin melihat seluruh riwayat (maksimal 500 transaksi terbaru).
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-gray-600">
                <th className="p-4 font-medium">Tanggal</th>
                <th className="p-4 font-medium">Pelanggan</th>
                <th className="p-4 font-medium">Jenis Nota</th>
                <th className="p-4 font-medium">Detail</th>
                <th className="p-4 font-medium">Total</th>
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
                  const isItem = n.pelanggan?.tipe?.toUpperCase() !== 'RS';
                  const totalTagihan = calculateTotal(n);
                  
                  return (
                    <tr key={n.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-800">{new Date(n.tanggal).toLocaleDateString('id-ID')}</td>
                      <td className="p-4 text-gray-800 font-medium">
                        {n.pelanggan?.nama}
                        <span className="block text-xs text-gray-500">{n.pelanggan?.tipe_billing}</span>
                      </td>
                      <td className="p-4 text-gray-800">{n.jenis || n.jenis_nota?.nama || 'KILOAN'}</td>
                      <td className="p-4 text-gray-800">
                          <button 
                            onClick={() => setDetailNota(n)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                          >
                            <Eye size={16} /> Lihat
                          </button>
                      </td>
                      <td className="p-4 font-semibold text-gray-800">
                        {n.pelanggan?.tipe_billing?.toUpperCase() === 'FLAT' && (n.jenis?.toUpperCase().includes('FLAT') || n.jenis_nota?.nama?.toUpperCase().includes('FLAT')) ? '-' : fmtRp(totalTagihan)}
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => setEditModalId(n.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          title="Edit Nota"
                        >
                          <Edit2 size={16} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          title="Hapus Nota"
                        >
                          <Trash2 size={16} /> Hapus
                        </button>
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
              {detailNota.pelanggan?.tipe?.toUpperCase() === 'RS' ? (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600">
                      <th className="pb-2">Nama Cucian</th>
                      <th className="pb-2 text-right">Berat</th>
                      <th className="pb-2 text-right">Harga / Kg</th>
                      <th className="pb-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-2 text-gray-800">Cucian RS (Kiloan)</td>
                        <td className="py-2 text-right font-medium">{detailNota.berat_kg} Kg</td>
                        <td className="py-2 text-right text-gray-600">{fmtRp(detailNota.pelanggan?.tarif_rs || 0)}</td>
                        <td className="py-2 text-right font-semibold">{fmtRp(calculateTotal(detailNota))}</td>
                      </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-4 text-right font-bold text-gray-800">TOTAL:</td>
                      <td className="pt-4 text-right font-bold text-blue-600">{fmtRp(calculateTotal(detailNota))}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : detailNota.items && detailNota.items.length > 0 ? (
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
                        <td className="py-2 text-gray-800">{item.name || item.nama}</td>
                        <td className="py-2 text-right font-medium">{item.qty}</td>
                        <td className="py-2 text-right text-gray-600">{fmtRp(item.harga || item.basePrice)}</td>
                        <td className="py-2 text-right font-semibold">{fmtRp((item.harga || item.basePrice) * item.qty)}</td>
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

      {/* Modal Edit Nota */}
      {editModalId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center z-10">
              <h3 className="text-xl font-bold text-gray-800">Edit Nota</h3>
              <button onClick={() => setEditModalId(null)} className="text-gray-500 hover:bg-gray-200 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <InputNota 
                isModal={true} 
                editId={editModalId} 
                onCloseCb={() => setEditModalId(null)} 
                onSuccessCb={() => {
                  setEditModalId(null);
                  fetchNota();
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
