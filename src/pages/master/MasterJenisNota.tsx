import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

interface JenisNota {
  id: number;
  nama: string;
  multiplier: number;
  berlaku_reguler: boolean;
  berlaku_flat: boolean;
}

export default function MasterJenisNota() {
  const [jenisNota, setJenisNota] = useState<JenisNota[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    nama: '', 
    multiplier: 1,
    berlaku_reguler: true,
    berlaku_flat: true
  });

  const fetchJenisNota = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jenis_nota')
      .select('*')
      .order('nama', { ascending: true });
    
    if (error) {
      console.error('Error fetching jenis_nota:', error);
    } else {
      setJenisNota(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJenisNota();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const { error } = await supabase
        .from('jenis_nota')
        .update(formData)
        .eq('id', editId);
      if (!error) {
        setIsModalOpen(false);
        fetchJenisNota();
      }
    } else {
      const { error } = await supabase
        .from('jenis_nota')
        .insert([formData]);
      if (!error) {
        setIsModalOpen(false);
        fetchJenisNota();
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Yakin ingin menghapus data ini?')) {
      await supabase.from('jenis_nota').delete().eq('id', id);
      fetchJenisNota();
    }
  };

  const filteredJenisNota = jenisNota.filter(j => 
    j.nama.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Master Jenis Nota</h2>
        <button
          onClick={() => {
            setEditId(null);
            setFormData({ nama: '', multiplier: 1, berlaku_reguler: true, berlaku_flat: true });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Tambah Jenis Nota
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari jenis nota..."
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
                <th className="p-4 font-medium">Nama Layanan</th>
                <th className="p-4 font-medium">Multiplier (1x-4x)</th>
                <th className="p-4 font-medium">Berlaku Reguler</th>
                <th className="p-4 font-medium">Berlaku Flat</th>
                <th className="p-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Loading...</td></tr>
              ) : filteredJenisNota.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Tidak ada data.</td></tr>
              ) : (
                filteredJenisNota.map((j) => (
                  <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-800">{j.nama}</td>
                    <td className="p-4 text-gray-800">{j.multiplier}x</td>
                    <td className="p-4 text-gray-800">{j.berlaku_reguler ? 'Ya' : 'Tidak'}</td>
                    <td className="p-4 text-gray-800">{j.berlaku_flat ? 'Ya' : 'Tidak'}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditId(j.id);
                          setFormData({ 
                            nama: j.nama, 
                            multiplier: j.multiplier,
                            berlaku_reguler: j.berlaku_reguler,
                            berlaku_flat: j.berlaku_flat
                          });
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(j.id)}
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
            <h3 className="text-xl font-bold mb-4">{editId ? 'Edit Jenis Nota' : 'Tambah Jenis Nota'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Nama Layanan</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Multiplier</label>
                <select
                  value={formData.multiplier}
                  onChange={(e) => setFormData({...formData, multiplier: parseFloat(e.target.value)})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                  <option value={4}>4x</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.berlaku_reguler}
                    onChange={(e) => setFormData({...formData, berlaku_reguler: e.target.checked})}
                    className="mr-2 leading-tight"
                  />
                  <span className="text-gray-700 text-sm font-bold">Berlaku Reguler</span>
                </label>
              </div>
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.berlaku_flat}
                    onChange={(e) => setFormData({...formData, berlaku_flat: e.target.checked})}
                    className="mr-2 leading-tight"
                  />
                  <span className="text-gray-700 text-sm font-bold">Berlaku Flat</span>
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
