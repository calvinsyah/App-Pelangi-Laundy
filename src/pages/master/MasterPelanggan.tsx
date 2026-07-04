import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, Trash2, Search, DollarSign, X, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';

interface Pelanggan {
  id: number;
  nama: string;
  kode_invoice: string;
  tipe: string;
  tipe_billing: string;
  tarif_flat: number;
  alamat: string;
  kota: string;
}

interface LinenConfigItem {
  linen_id: number;
  nama: string;
  urutan: number;
  harga: number;
}

export default function MasterPelanggan() {
  const [pelanggan, setPelanggan] = useState<Pelanggan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    nama: '', kode_invoice: '', tipe: 'Hotel', tipe_billing: 'Reguler', tarif_flat: 0, alamat: '', kota: '' 
  });

  // Linen Config Modal State
  const [isLinenModalOpen, setIsLinenModalOpen] = useState(false);
  const [activePelanggan, setActivePelanggan] = useState<Pelanggan | null>(null);
  const [linenConfig, setLinenConfig] = useState<LinenConfigItem[]>([]);
  const [savingLinen, setSavingLinen] = useState(false);

  const fetchPelanggan = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pelanggan')
      .select('*')
      .order('nama', { ascending: true });
    
    if (error) {
      toast('Gagal mengambil data pelanggan', 'error');
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
      const { error } = await supabase.from('pelanggan').update(formData).eq('id', editId);
      if (!error) {
        toast('Pelanggan berhasil diubah', 'success');
        setIsModalOpen(false);
        fetchPelanggan();
      } else {
        toast('Gagal mengubah pelanggan', 'error');
      }
    } else {
      const { error } = await supabase.from('pelanggan').insert([formData]);
      if (!error) {
        toast('Pelanggan berhasil ditambahkan', 'success');
        setIsModalOpen(false);
        fetchPelanggan();
      } else {
        toast('Gagal menambahkan pelanggan', 'error');
      }
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm('Yakin ingin menghapus pelanggan ini? Semua data terkait mungkin akan terpengaruh.');
    if (ok) {
      const { error } = await supabase.from('pelanggan').delete().eq('id', id);
      if (error) {
        toast(error.message, 'error');
      } else {
        toast('Pelanggan berhasil dihapus', 'success');
        fetchPelanggan();
      }
    }
  };

  const openLinenConfig = async (p: Pelanggan) => {
    setActivePelanggan(p);
    setIsLinenModalOpen(true);
    setLinenConfig([]);

    // Fetch master linen
    const { data: masterLinen, error: err1 } = await supabase.from('master_linen').select('*').order('id');
    // Fetch linen_pelanggan
    const { data: linenP, error: err2 } = await supabase.from('linen_pelanggan').select('*').eq('pelanggan_id', p.id);
    // Fetch harga_pelanggan
    const { data: hargaP, error: err3 } = await supabase.from('harga_pelanggan').select('*').eq('pelanggan_id', p.id);

    if (err1 || err2 || err3) {
      toast('Gagal mengambil konfigurasi linen', 'error');
      return;
    }

    if (masterLinen) {
      let config: LinenConfigItem[] = masterLinen.map(ml => {
        const lp = linenP?.find(x => x.linen_id === ml.id);
        const hp = hargaP?.find(x => x.linen_id === ml.id);
        return {
          linen_id: ml.id,
          nama: ml.nama,
          urutan: lp ? lp.urutan : 999, // default to end if not configured
          harga: hp ? hp.harga : 0
        };
      });
      
      // Sort by urutan then by id
      config.sort((a, b) => {
        if (a.urutan === b.urutan) return a.linen_id - b.linen_id;
        return a.urutan - b.urutan;
      });

      // Normalize urutan 0, 1, 2...
      config = config.map((c, i) => ({ ...c, urutan: i }));
      setLinenConfig(config);
    }
  };

  const saveLinenConfig = async () => {
    if (!activePelanggan) return;
    setSavingLinen(true);
    
    // Prepare data
    const lpData = linenConfig.map(c => ({
      pelanggan_id: activePelanggan.id,
      linen_id: c.linen_id,
      urutan: c.urutan
    }));
    
    const hpData = linenConfig.map(c => ({
      pelanggan_id: activePelanggan.id,
      linen_id: c.linen_id,
      harga: c.harga
    }));

    try {
      // Upsert linen_pelanggan
      const { error: err1 } = await supabase.from('linen_pelanggan').upsert(lpData, { onConflict: 'pelanggan_id,linen_id' });
      // Upsert harga_pelanggan
      const { error: err2 } = await supabase.from('harga_pelanggan').upsert(hpData, { onConflict: 'pelanggan_id,linen_id' });
      
      if (err1 || err2) throw new Error('Failed to upsert');
      
      toast('Konfigurasi linen berhasil disimpan', 'success');
      setIsLinenModalOpen(false);
    } catch (e) {
      console.error(e);
      toast('Gagal menyimpan konfigurasi linen', 'error');
    }
    setSavingLinen(false);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(linenConfig);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update urutan
    const newItems = items.map((item, index) => ({ ...item, urutan: index }));
    setLinenConfig(newItems);
  };

  const updateHarga = (index: number, val: string) => {
    const newItems = [...linenConfig];
    newItems[index].harga = parseFloat(val) || 0;
    setLinenConfig(newItems);
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
                        onClick={() => {
                          setEditId(p.id);
                          setFormData({ 
                            nama: p.nama, 
                            kode_invoice: p.kode_invoice, 
                            tipe: p.tipe, 
                            tipe_billing: p.tipe_billing, 
                            tarif_flat: p.tarif_flat, 
                            alamat: p.alamat || '', 
                            kota: p.kota || '' 
                          });
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-md hover:bg-blue-50 transition-colors"
                        title="Edit Pelanggan"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-600 hover:text-red-800 p-2 rounded-md hover:bg-red-50 transition-colors"
                        title="Hapus Pelanggan"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => openLinenConfig(p)}
                        className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 px-3 py-1.5 rounded-md font-medium transition-colors text-sm ml-2"
                        title="Atur Linen & Harga per Pelanggan"
                      >
                        Atur Linen
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal (Edit/Add Pelanggan) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editId ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Nama Instansi</label>
                  <input type="text" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Kode Invoice</label>
                  <input type="text" value={formData.kode_invoice} onChange={(e) => setFormData({...formData, kode_invoice: e.target.value})} className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Tipe</label>
                  <select value={formData.tipe} onChange={(e) => setFormData({...formData, tipe: e.target.value})} className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500">
                    <option value="Hotel">Hotel</option>
                    <option value="RS">RS</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Tipe Billing</label>
                  <select value={formData.tipe_billing} onChange={(e) => setFormData({...formData, tipe_billing: e.target.value})} className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500">
                    <option value="Reguler">Reguler</option>
                    <option value="Flat">Flat</option>
                  </select>
                </div>
                {formData.tipe_billing === 'Flat' && (
                  <div className="mb-4 md:col-span-2">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Tarif Flat (Rp/Kg)</label>
                    <input type="number" value={formData.tarif_flat} onChange={(e) => setFormData({...formData, tarif_flat: parseFloat(e.target.value)})} className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500" required={formData.tipe_billing === 'Flat'} />
                  </div>
                )}
                <div className="mb-4 md:col-span-2">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Alamat</label>
                  <textarea value={formData.alamat} onChange={(e) => setFormData({...formData, alamat: e.target.value})} className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500" rows={3} />
                </div>
                <div className="mb-6 md:col-span-2">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Kota</label>
                  <input type="text" value={formData.kota} onChange={(e) => setFormData({...formData, kota: e.target.value})} className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Linen Config Modal */}
      {isLinenModalOpen && activePelanggan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h3 className="text-xl font-bold">Konfigurasi Linen & Harga: {activePelanggan.nama}</h3>
              <button onClick={() => setIsLinenModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">Seret ikon <GripVertical size={14} className="inline text-gray-400"/> untuk mengubah urutan linen saat input nota pelanggan ini.</p>
            
            <div className="flex-1 overflow-y-auto min-h-[400px]">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="linen-list">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                      {linenConfig.map((item, index) => (
                        <Draggable key={item.linen_id.toString()} draggableId={item.linen_id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-4 p-3 bg-white border rounded-lg ${snapshot.isDragging ? 'shadow-lg border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                              <div {...provided.dragHandleProps} className="cursor-grab hover:text-blue-500 text-gray-400">
                                <GripVertical size={20} />
                              </div>
                              <div className="flex-1 font-medium text-gray-700">
                                {item.nama}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Harga (Rp):</span>
                                <input
                                  type="number"
                                  value={item.harga}
                                  onChange={(e) => updateHarga(index, e.target.value)}
                                  className="border border-gray-300 rounded px-3 py-1 w-32 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setIsLinenModalOpen(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Tutup
              </button>
              <button
                onClick={saveLinenConfig}
                disabled={savingLinen}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {savingLinen ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
