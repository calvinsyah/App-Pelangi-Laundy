import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';

interface Linen {
  id: number;
  nama: string;
}

export default function MasterLinen() {
  const [linens, setLinens] = useState<Linen[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const { confirm } = useConfirm();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nama, setNama] = useState('');

  const fetchLinens = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('master_linen')
      .select('*')
      .order('nama', { ascending: true });
    
    if (error) {
      toast('Error fetching linens', 'error');
    } else {
      setLinens(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLinens();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const { error } = await supabase
        .from('master_linen')
        .update({ nama })
        .eq('id', editId);
      if (!error) {
        toast('Berhasil mengubah linen', 'success');
        setIsModalOpen(false);
        fetchLinens();
      } else {
        toast('Gagal mengubah linen', 'error');
      }
    } else {
      const { error } = await supabase
        .from('master_linen')
        .insert([{ nama }]);
      if (!error) {
        toast('Berhasil menambah linen', 'success');
        setIsModalOpen(false);
        fetchLinens();
      } else {
        toast('Gagal menambah linen', 'error');
      }
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm('Yakin ingin menghapus data ini?');
    if (ok) {
      const { error } = await supabase.from('master_linen').delete().eq('id', id);
      if (error) {
        toast('Gagal menghapus data', 'error');
      } else {
        toast('Data berhasil dihapus', 'success');
        fetchLinens();
      }
    }
  };

  const filteredLinens = linens.filter(l => l.nama.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Master Linen</h2>
        <button
          onClick={() => {
            setEditId(null);
            setNama('');
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Tambah Linen
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari linen..."
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
                <th className="p-4 font-medium">Nama Linen</th>
                <th className="p-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={2} className="p-4 text-center text-gray-500">Loading...</td></tr>
              ) : filteredLinens.length === 0 ? (
                <tr><td colSpan={2} className="p-4 text-center text-gray-500">Tidak ada data.</td></tr>
              ) : (
                filteredLinens.map((linen) => (
                  <tr key={linen.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-800">{linen.nama}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditId(linen.id);
                          setNama(linen.nama);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(linen.id)}
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
            <h3 className="text-xl font-bold mb-4">{editId ? 'Edit Linen' : 'Tambah Linen'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Nama Linen</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
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
