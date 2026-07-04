import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Edit2, Trash2, Search, Eye } from 'lucide-react';

export default function RiwayatNota() {
  const [notaList, setNotaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterPelanggan, setFilterPelanggan] = useState('');
  
  const [pelangganList, setPelangganList] = useState<any[]>([]);

  useEffect(() => {
    const fetchPelanggan = async () => {
      const { data } = await supabase.from('pelanggan').select('id, nama').order('nama');
      setPelangganList(data || []);
    };
    fetchPelanggan();
  }, []);

  const fetchNota = async () => {
    setLoading(true);
    let query = supabase
      .from('nota')
      .select(`
        id, tanggal, berat_kg, status_bayar,
        pelanggan (id, nama, tipe_billing),
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
    } else {
      setNotaList(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNota();
  }, [filterBulan, filterPelanggan]);

  const handleDelete = async (id: number) => {
    if (confirm('Yakin ingin menghapus nota ini? Aksi ini memerlukan hak admin.')) {
      const { error } = await supabase.from('nota').delete().eq('id', id);
      if (error) {
        alert(error.message);
      } else {
        fetchNota();
      }
    }
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
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-4 text-center text-gray-500">Loading...</td></tr>
              ) : filteredNota.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-gray-500">Tidak ada data nota.</td></tr>
              ) : (
                filteredNota.map((n) => (
                  <tr key={n.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-800">{new Date(n.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="p-4 text-gray-800 font-medium">
                      {n.pelanggan?.nama}
                      <span className="block text-xs text-gray-500">{n.pelanggan?.tipe_billing}</span>
                    </td>
                    <td className="p-4 text-gray-800">{n.jenis_nota?.nama}</td>
                    <td className="p-4 text-gray-800">
                      {n.pelanggan?.tipe_billing === 'Flat' ? (
                        `${n.berat_kg} Kg`
                      ) : (
                        <button className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
                          <Eye size={14} /> Lihat Item
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        n.status_bayar === 'Lunas' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {n.status_bayar}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 p-2 rounded-md hover:bg-blue-50 transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="text-red-600 hover:text-red-800 p-2 rounded-md hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
