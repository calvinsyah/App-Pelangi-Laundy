import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, Trash2, Search, CheckCircle } from 'lucide-react';

interface Biaya {
  id: number;
  tanggal: string;
  kategori: string;
  nominal: number;
  lunas: boolean;
}

const CATEGORIES = [
  "GAS", "AIR", "LISTRIK 1", "LISTRIK 2", "CHEMICAL", "BBM", "PLASTIK", 
  "PPH PS 23", "GAJI BORONGAN", "GAJI TETAP", "MAKAN", 
  "PERAWATAN MESIN", "IURAN SAMPAH", "IURAN RT", "LAIN-LAIN"
];

export default function Pengeluaran() {
  const [biayas, setBiayas] = useState<Biaya[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterKat, setFilterKat] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    kategori: 'GAS',
    kategoriCustom: '',
    nominal: 0,
    lunas: true
  });

  const fetchBiayas = async () => {
    setLoading(true);
    let query = supabase.from('biaya').select('*').order('tanggal', { ascending: false });
    
    if (filterKat) {
      query = query.eq('kategori', filterKat);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching biaya:', error);
    } else {
      setBiayas(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBiayas();
  }, [filterKat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalKategori = formData.kategori === 'LAIN-LAIN' && formData.kategoriCustom
      ? formData.kategoriCustom.toUpperCase()
      : formData.kategori;

    const dataToSave = {
      tanggal: formData.tanggal,
      kategori: finalKategori,
      nominal: formData.nominal,
      lunas: formData.lunas
    };

    if (editId) {
      const { error } = await supabase.from('biaya').update(dataToSave).eq('id', editId);
      if (!error) {
        setIsModalOpen(false);
        fetchBiayas();
      }
    } else {
      const { error } = await supabase.from('biaya').insert([dataToSave]);
      if (!error) {
        setIsModalOpen(false);
        fetchBiayas();
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Yakin ingin menghapus pengeluaran ini?')) {
      await supabase.from('biaya').delete().eq('id', id);
      fetchBiayas();
    }
  };

  const handleTandaiLunas = async (id: number) => {
    const { error } = await supabase.from('biaya').update({ lunas: true }).eq('id', id);
    if (!error) {
      fetchBiayas();
    }
  };

  const filteredBiayas = biayas.filter(b => 
    b.kategori.toLowerCase().includes(search.toLowerCase())
  );

  const fmtRp = (val: number) => "Rp " + val.toLocaleString("id-ID");

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Catat Pengeluaran</h2>
        <button
          onClick={() => {
            setEditId(null);
            setFormData({
              tanggal: new Date().toISOString().split('T')[0],
              kategori: 'GAS',
              kategoriCustom: '',
              nominal: 0,
              lunas: true
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Catat Baru
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 flex flex-wrap gap-4 items-center bg-gray-50 border-b border-gray-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="min-w-[200px]">
            <select
              value={filterKat}
              onChange={(e) => setFilterKat(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Semua Kategori</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-gray-600">
                <th className="p-4 font-medium">Tanggal</th>
                <th className="p-4 font-medium">Kategori</th>
                <th className="p-4 font-medium">Nominal</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Loading...</td></tr>
              ) : filteredBiayas.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Tidak ada data.</td></tr>
              ) : (
                filteredBiayas.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-800">{new Date(b.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="p-4 text-gray-800 font-medium">{b.kategori}</td>
                    <td className="p-4 text-gray-800">{fmtRp(b.nominal)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        b.lunas ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {b.lunas ? 'Lunas' : 'Belum Lunas'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {!b.lunas && (
                        <button
                          onClick={() => handleTandaiLunas(b.id)}
                          className="text-green-600 hover:text-green-800 p-2 rounded-md hover:bg-green-50 transition-colors"
                          title="Tandai Lunas"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditId(b.id);
                          setFormData({
                            tanggal: b.tanggal,
                            kategori: CATEGORIES.includes(b.kategori) ? b.kategori : 'LAIN-LAIN',
                            kategoriCustom: CATEGORIES.includes(b.kategori) ? '' : b.kategori,
                            nominal: b.nominal,
                            lunas: b.lunas
                          });
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">{editId ? 'Edit Pengeluaran' : 'Catat Pengeluaran'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Tanggal</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Kategori</label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              {formData.kategori === 'LAIN-LAIN' && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Kategori Kustom</label>
                  <input
                    type="text"
                    value={formData.kategoriCustom}
                    onChange={(e) => setFormData({...formData, kategoriCustom: e.target.value})}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan nama kategori"
                    required
                  />
                </div>
              )}
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Nominal (Rp)</label>
                <input
                  type="number"
                  value={formData.nominal}
                  onChange={(e) => setFormData({...formData, nominal: parseInt(e.target.value) || 0})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.lunas}
                    onChange={(e) => setFormData({...formData, lunas: e.target.checked})}
                    className="mr-2 leading-tight"
                  />
                  <span className="text-gray-700 text-sm font-bold">Lunas</span>
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
