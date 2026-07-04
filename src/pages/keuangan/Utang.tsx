import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, Trash2, Search, Check } from 'lucide-react';

interface Utang {
  id: number;
  nama: string;
  dari: string;
  sampai: string;
  cicilan: number;
  keterangan: string;
  sisa_bulan: number;
  status: string; // 'AKTIF' | 'LUNAS'
}

export default function Utang() {
  const [utangs, setUtangs] = useState<Utang[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    dari: '',
    sampai: '',
    cicilan: 0,
    keterangan: '',
    sisa_bulan: 0,
    status: 'AKTIF'
  });

  const fetchUtangs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('utang')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error('Error fetching utang:', error);
    } else {
      setUtangs(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUtangs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const { error } = await supabase
        .from('utang')
        .update(formData)
        .eq('id', editId);
      if (!error) {
        setIsModalOpen(false);
        fetchUtangs();
      }
    } else {
      const { error } = await supabase
        .from('utang')
        .insert([formData]);
      if (!error) {
        setIsModalOpen(false);
        fetchUtangs();
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Yakin ingin menghapus data utang ini?')) {
      await supabase.from('utang').delete().eq('id', id);
      fetchUtangs();
    }
  };

  const handleLunas = async (id: number) => {
    const { error } = await supabase
      .from('utang')
      .update({ status: 'LUNAS', sisa_bulan: 0 })
      .eq('id', id);
    if (!error) {
      fetchUtangs();
    }
  };

  const filteredUtangs = utangs.filter(u => 
    u.nama.toLowerCase().includes(search.toLowerCase()) ||
    u.keterangan.toLowerCase().includes(search.toLowerCase())
  );

  const fmtRp = (val: number) => "Rp " + val.toLocaleString("id-ID");

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manajemen Utang Usaha</h2>
        <button
          onClick={() => {
            setEditId(null);
            setFormData({
              nama: '',
              dari: '',
              sampai: '',
              cicilan: 0,
              keterangan: '',
              sisa_bulan: 0,
              status: 'AKTIF'
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Tambah Utang
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari nama / keterangan..."
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
                <th className="p-4 font-medium">Nama Utang</th>
                <th className="p-4 font-medium">Tenor</th>
                <th className="p-4 font-medium">Cicilan / Bulan</th>
                <th className="p-4 font-medium">Sisa Bulan</th>
                <th className="p-4 font-medium">Total Sisa</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-4 text-center text-gray-500">Loading...</td></tr>
              ) : filteredUtangs.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center text-gray-500">Tidak ada data.</td></tr>
              ) : (
                filteredUtangs.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <span className="font-medium text-gray-800 block">{u.nama}</span>
                      <span className="text-xs text-gray-500">{u.keterangan}</span>
                    </td>
                    <td className="p-4 text-gray-800 text-sm">{u.dari} s/d {u.sampai}</td>
                    <td className="p-4 text-gray-800">{fmtRp(u.cicilan)}</td>
                    <td className="p-4 text-gray-800">{u.sisa_bulan} bulan</td>
                    <td className="p-4 text-gray-800 font-semibold">{fmtRp(u.sisa_bulan * u.cicilan)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        u.status === 'AKTIF' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {u.status === 'AKTIF' && (
                        <button
                          onClick={() => handleLunas(u.id)}
                          className="text-green-600 hover:text-green-800 p-2 rounded-md hover:bg-green-50 transition-colors"
                          title="Tandai Lunas"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditId(u.id);
                          setFormData({
                            nama: u.nama,
                            dari: u.dari,
                            sampai: u.sampai,
                            cicilan: u.cicilan,
                            keterangan: u.keterangan,
                            sisa_bulan: u.sisa_bulan,
                            status: u.status
                          });
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
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
            <h3 className="text-xl font-bold mb-4">{editId ? 'Edit Utang' : 'Tambah Utang'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Nama Utang</label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Mulai (Bulan/Thn)</label>
                  <input
                    type="text"
                    value={formData.dari}
                    onChange={(e) => setFormData({...formData, dari: e.target.value})}
                    placeholder="Contoh: Jan 2026"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Tenor Hingga</label>
                  <input
                    type="text"
                    value={formData.sampai}
                    onChange={(e) => setFormData({...formData, sampai: e.target.value})}
                    placeholder="Contoh: Des 2026"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Cicilan / Bulan (Rp)</label>
                <input
                  type="number"
                  value={formData.cicilan}
                  onChange={(e) => setFormData({...formData, cicilan: parseInt(e.target.value) || 0})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Sisa Tenor (Bulan)</label>
                <input
                  type="number"
                  value={formData.sisa_bulan}
                  onChange={(e) => setFormData({...formData, sisa_bulan: parseInt(e.target.value) || 0})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Keterangan</label>
                <textarea
                  value={formData.keterangan}
                  onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="AKTIF">AKTIF</option>
                  <option value="LUNAS">LUNAS</option>
                </select>
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
