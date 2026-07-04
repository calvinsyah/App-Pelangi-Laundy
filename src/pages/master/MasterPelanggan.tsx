import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, Trash2, Search, DollarSign } from 'lucide-react';

interface Pelanggan {
  id: number;
  nama: string;
  kode_invoice: string;
  tipe: string; // Hotel/RS
  tipe_billing: string; // Reguler/Flat
  tarif_flat: number;
  alamat: string;
  kota: string;
}

export default function MasterPelanggan() {
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    nama: '', 
    kode_invoice: '', 
    tipe: 'Hotel', 
    tipe_billing: 'Reguler', 
    tarif_flat: 0,
    alamat: '',
    kota: ''
  });

  const fetchPelanggan = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pelanggan')
      .select('*')
      .order('nama', { ascending: true });
    
    if (error) {
      console.error('Error fetching pelanggan:', error);
    } else {
      setPelanggan(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPelanggan();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const { error } = await supabase
        .from('pelanggan')
        .update(formData)
        .eq('id', editId);
      if (!error) {
        setIsModalOpen(false);
        fetchPelanggan();
      }
    } else {
      const { error } = await supabase
        .from('pelanggan')
        .insert([formData]);
      if (!error) {
        setIsModalOpen(false);
        fetchPelanggan();
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Yakin ingin menghapus pelanggan ini?')) {
      await supabase.from('pelanggan').delete().eq('id', id);
      fetchPelanggan();
    }
  };

  const filteredPelanggan = pelanggan.filter(p => 
    p.nama.toLowerCase().includes(search.toLowerCase()) ||
    p.kode_invoice.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Master Pelanggan</h2>
        <button
          onClick={() => {
            setEditId(null);
            setFormData({ nama: '', kode_invoice: '', tipe: 'Hotel', tipe_billing: 'Reguler', tarif_flat: 0, alamat: '', kota: '' });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} /> Tambah Pelanggan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari pelanggan..."
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
                <th className="p-4 font-medium">Instansi</th>
                <th className="p-4 font-medium">Kode</th>
                <th className="p-4 font-medium">Tipe</th>
                <th className="p-4 font-medium">Billing</th>
                <th className="p-4 font-medium">Kota</th>
                <th className="p-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-4 text-center text-gray-500">Loading...</td></tr>
              ) : filteredPelanggan.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-gray-500">Tidak ada data.</td></tr>
              ) : (
                filteredPelanggan.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-800">{p.nama}</td>
                    <td className="p-4 text-gray-800">{p.kode_invoice}</td>
                    <td className="p-4 text-gray-800">{p.tipe}</td>
                    <td className="p-4 text-gray-800">
                      {p.tipe_billing}
                      {p.tipe_billing === 'Flat' && <span className="text-sm text-gray-500 block">Rp {p.tarif_flat}/Kg</span>}
                    </td>
                    <td className="p-4 text-gray-800">{p.kota}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        title="Harga Linen"
                        className="text-green-600 hover:text-green-800 p-2 rounded-md hover:bg-green-50 transition-colors"
                      >
                        <DollarSign size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditId(p.id);
                          setFormData({
                            nama: p.nama,
                            kode_invoice: p.kode_invoice,
                            tipe: p.tipe,
                            tipe_billing: p.tipe_billing,
                            tarif_flat: p.tarif_flat,
                            alamat: p.alamat,
                            kota: p.kota
                          });
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editId ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Nama Instansi</label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Kode Invoice</label>
                  <input
                    type="text"
                    value={formData.kode_invoice}
                    onChange={(e) => setFormData({...formData, kode_invoice: e.target.value})}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Tipe</label>
                  <select
                    value={formData.tipe}
                    onChange={(e) => setFormData({...formData, tipe: e.target.value})}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Hotel">Hotel</option>
                    <option value="RS">RS</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Tipe Billing</label>
                  <select
                    value={formData.tipe_billing}
                    onChange={(e) => setFormData({...formData, tipe_billing: e.target.value})}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Reguler">Reguler</option>
                    <option value="Flat">Flat</option>
                  </select>
                </div>
                {formData.tipe_billing === 'Flat' && (
                  <div className="mb-4 md:col-span-2">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Tarif Flat (Rp/Kg)</label>
                    <input
                      type="number"
                      value={formData.tarif_flat}
                      onChange={(e) => setFormData({...formData, tarif_flat: parseFloat(e.target.value)})}
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={formData.tipe_billing === 'Flat'}
                    />
                  </div>
                )}
                <div className="mb-4 md:col-span-2">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Alamat</label>
                  <textarea
                    value={formData.alamat}
                    onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="mb-6 md:col-span-2">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Kota</label>
                  <input
                    type="text"
                    value={formData.kota}
                    onChange={(e) => setFormData({...formData, kota: e.target.value})}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
