import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

interface Karyawan {
  id: number;
  nama: string;
  bagian: string;
  komisi: number;
}

export default function MasterKaryawan() {
  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ nama: '', bagian: '', komisi: 0 });

  const fetchKaryawan = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('karyawan')
      .select('*')
      .order('nama', { ascending: true });
    
    if (error) {
      console.error('Error fetching karyawan:', error);
    } else {
      setKaryawan(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKaryawan();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const { error } = await supabase
        .from('karyawan')
        .update(formData)
        .eq('id', editId);
      if (!error) {
        setIsModalOpen(false);
        fetchKaryawan();
      }
    } else {
      const { error } = await supabase
        .from('karyawan')
        .insert([formData]);
      if (!error) {
        setIsModalOpen(false);
        fetchKaryawan();
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Yakin ingin menghapus data ini?')) {
      await supabase.from('karyawan').delete().eq('id', id);
      fetchKaryawan();
    }
  };

  const filteredKaryawan = karyawan.filter(k => 
    k.nama.toLowerCase().includes(search.toLowerCase()) ||
    k.bagian.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Master Karyawan</h2>
        <button
          onClick={() => {
            setEditId(null);
            setFormData({ nama: '', bagian: '', komisi: 0 });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Tambah Karyawan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari karyawan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <th className="p-4 font-medium">Nama Karyawan</th>
                <th className="p-4 font-medium">Bagian</th>
                <th className="p-4 font-medium">Persentase Komisi (%)</th>
                <th className="p-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500">Loading...</td></tr>
              ) : filteredKaryawan.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500">Tidak ada data.</td></tr>
              ) : (
                filteredKaryawan.map((k) => (
                  <tr key={k.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-800">{k.nama}</td>
                    <td className="p-4 text-gray-800">{k.bagian}</td>
                    <td className="p-4 text-gray-800">{k.komisi}%</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditId(k.id);
                          setFormData({ nama: k.nama, bagian: k.bagian, komisi: k.komisi });
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(k.id)}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">{editId ? 'Edit Karyawan' : 'Tambah Karyawan'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Nama Karyawan</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Bagian</label>
                <input
                  type="text"
                  value={formData.bagian}
                  onChange={(e) => setFormData({...formData, bagian: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">Persentase Komisi (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.komisi}
                  onChange={(e) => setFormData({...formData, komisi: parseFloat(e.target.value)})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
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
