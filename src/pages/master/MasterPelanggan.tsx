import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Plus, Edit2, Trash2, Search, DollarSign, X, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';
import { CurrencyInput } from '../../components/CurrencyInput';
import { getSafeErrorMessage } from '../../lib/utils';

interface Pelanggan {
  id: number;
  nama: string;
  kode_invoice: string;
  tipe: string;
  tipe_billing: string;
  tarif_flat: number;
  tarif_rs?: number;
  alamat: string;
  kota: string;
}

interface LinenConfigItem {
  id: string; // for dnd-kit
  linen_id: number;
  nama: string;
  urutan: number;
  harga: number;
}

const SortableLinenItem: React.FC<{ item: LinenConfigItem, index: number, updateHarga: (i: number, v: number) => void }> = ({ item, index, updateHarga }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-3 bg-white border rounded-lg ${isDragging ? 'shadow-lg border-blue-500 ring-1 ring-blue-500 relative' : 'border-gray-200 hover:border-gray-300'}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab hover:text-blue-500 text-gray-400 touch-none">
        <GripVertical size={20} />
      </div>
      <div className="flex-1 font-medium text-gray-700">
        {item.nama}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Harga:</span>
        <CurrencyInput
          value={item.harga}
          onChange={(val) => updateHarga(index, val)}
          className="border border-gray-300 rounded pr-3 py-1 w-36 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

const SortableNotaLinenItem: React.FC<{ id: string, nama: string, isSelected: boolean, toggle: () => void, orderIdx: number }> = ({ id, nama, isSelected, toggle, orderIdx }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-3 bg-white border rounded-lg ${isDragging ? 'shadow-lg border-emerald-500 ring-1 ring-emerald-500 relative' : isSelected ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200'}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab hover:text-emerald-500 text-gray-400 touch-none">
        <GripVertical size={20} />
      </div>
      <label className="flex-1 flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="w-5 h-5 text-emerald-600 rounded cursor-pointer"
          checked={isSelected}
          onChange={toggle}
        />
        <span className="flex-1 font-medium text-gray-700">{nama}</span>
      </label>
      {isSelected && (
        <span className="bg-emerald-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
          {orderIdx + 1}
        </span>
      )}
    </div>
  );
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
    nama: '', kode_invoice: '', tipe: 'HOTEL', tipe_billing: 'REGULER', tarif_flat: 0, tarif_rs: 0, alamat: '', kota: ''
  });

  // Linen Config Modal State
  const [isLinenModalOpen, setIsLinenModalOpen] = useState(false);
  const [activePelanggan, setActivePelanggan] = useState<Pelanggan | null>(null);
  const [linenConfig, setLinenConfig] = useState<LinenConfigItem[]>([]);
  const [savingLinen, setSavingLinen] = useState(false);
  const [jenisNotaList, setJenisNotaList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('harga_urutan'); // 'harga_urutan' or jenis_nota_id
  const [notaLinenConfig, setNotaLinenConfig] = useState<Record<number, number[]>>({}); // jenis_nota_id -> array of linen_ids


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchPelanggan = async () => {
    setLoading(true);
    const [pelangganRes, jenisNotaRes] = await Promise.all([
      supabase.from('pelanggan').select('*').order('nama', { ascending: true }),
      supabase.from('jenis_nota').select('*').order('nama', { ascending: true })
    ]);

    if (pelangganRes.error) {
      toast('Gagal mengambil data pelanggan', 'error');
    } else {
      setPelanggan(pelangganRes.data || []);
    }

    if (jenisNotaRes.data) {
      setJenisNotaList(jenisNotaRes.data);
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
        console.error('Detail error:', error);
        toast(getSafeErrorMessage(error), 'error');
      } else {
        toast('Pelanggan berhasil dihapus', 'success');
        fetchPelanggan();
      }
    }
  };

  const openLinenConfig = async (p: Pelanggan) => {
    setActivePelanggan(p);
    setActiveTab('harga_urutan');
    setIsLinenModalOpen(true);
    setLinenConfig([]);
    setNotaLinenConfig({});

    // Fetch master linen
    const { data: masterLinen, error: err1 } = await supabase.from('master_linen').select('*').order('id');
    // Fetch linen_pelanggan
    const { data: linenP, error: err2 } = await supabase.from('linen_pelanggan').select('*').eq('pelanggan_id', p.id);
    // Fetch harga_pelanggan
    const { data: hargaP, error: err3 } = await supabase.from('harga_pelanggan').select('*').eq('pelanggan_id', p.id);
    // Fetch pelanggan_nota_linen
    const { data: notaLinenP, error: err4 } = await supabase.from('pelanggan_nota_linen').select('*').eq('pelanggan_id', p.id);

    if (err1 || err2 || err3 || err4) {
      console.error('Error fetching linen config:', { err1, err2, err3, err4 });
      toast('Gagal mengambil konfigurasi linen', 'error');
      return;
    }

    if (masterLinen) {
      let config: LinenConfigItem[] = masterLinen.map(ml => {
        const lp = linenP?.find(x => x.linen_id === ml.id);
        const hp = hargaP?.find(x => x.linen_id === ml.id);
        return {
          id: ml.id.toString(),
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
      config = config.map((c, i) => ({ ...c, urutan: i, id: c.linen_id.toString() }));
      setLinenConfig(config);
    }

    if (notaLinenP) {
      const notaConfig: Record<number, number[]> = {};

      // Group by jenis_nota_id, and sort by urutan
      const grouped = notaLinenP.reduce((acc: any, curr: any) => {
        if (!acc[curr.jenis_nota_id]) acc[curr.jenis_nota_id] = [];
        acc[curr.jenis_nota_id].push(curr);
        return acc;
      }, {});

      for (const jnId in grouped) {
        grouped[jnId].sort((a: any, b: any) => a.urutan - b.urutan);
        notaConfig[Number(jnId)] = grouped[jnId].map((c: any) => c.linen_id);
      }
      setNotaLinenConfig(notaConfig);
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

      // Save pelanggan_nota_linen
      await supabase.from('pelanggan_nota_linen').delete().eq('pelanggan_id', activePelanggan.id);

      const pnlData: any[] = [];
      for (const jnIdStr in notaLinenConfig) {
        const jnId = Number(jnIdStr);
        const linenIds = notaLinenConfig[jnId];
        linenIds.forEach((lId, index) => {
          pnlData.push({
            pelanggan_id: activePelanggan.id,
            jenis_nota_id: jnId,
            linen_id: lId,
            urutan: index
          });
        });
      }

      if (pnlData.length > 0) {
        const { error: err3 } = await supabase.from('pelanggan_nota_linen').insert(pnlData);
        if (err3) throw new Error('Failed to insert pelanggan_nota_linen');
      }

      if (err1 || err2) throw new Error('Failed to upsert');

      toast('Konfigurasi linen berhasil disimpan', 'success');
      setIsLinenModalOpen(false);
    } catch (e) {
      console.error(e);
      toast('Gagal menyimpan konfigurasi linen', 'error');
    }
    setSavingLinen(false);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLinenConfig((items: LinenConfigItem[]) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, urutan: index }));
      });
    }
  };

  const toggleNotaLinen = (jnId: number, linenId: number) => {
    setNotaLinenConfig(prev => {
      const current = prev[jnId] || [];
      if (current.includes(linenId)) {
        return { ...prev, [jnId]: current.filter(id => id !== linenId) };
      } else {
        return { ...prev, [jnId]: [...current, linenId] };
      }
    });
  };

  const handleNotaDragEnd = (event: any, jnId: number) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setNotaLinenConfig(prev => {
        const current = prev[jnId] || [];
        const oldIndex = current.findIndex(id => id.toString() === active.id);
        const newIndex = current.findIndex(id => id.toString() === over.id);
        const newOrder = arrayMove(current, oldIndex, newIndex);
        return { ...prev, [jnId]: newOrder };
      });
    }
  };

  const updateHarga = (index: number, val: number) => {
    const newItems = [...linenConfig];
    newItems[index].harga = val || 0;
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
            setFormData({ nama: '', kode_invoice: '', tipe: 'HOTEL', tipe_billing: 'REGULER', tarif_flat: 0, tarif_rs: 0, alamat: '', kota: '' });
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
                      {p.tipe === 'RS' ? (
                        <span className="text-sm font-medium text-gray-600 block">Rp {p.tarif_rs || p.tarif_flat || 0}/Kg</span>
                      ) : (
                        <>
                          {p.tipe_billing}
                          {p.tipe_billing === 'FLAT' && <span className="text-sm text-gray-500 block">Rp {p.tarif_flat}</span>}
                        </>
                      )}
                    </td>
                    <td className="p-4 text-gray-800">{p.kota}</td>
                    <td className="p-4 text-right flex justify-end gap-2 items-center">
                      <button
                        onClick={() => {
                          setEditId(p.id);
                          setFormData({
                            nama: p.nama,
                            kode_invoice: p.kode_invoice,
                            tipe: p.tipe,
                            tipe_billing: p.tipe_billing || 'REGULER',
                            tarif_flat: p.tarif_flat || 0,
                            tarif_rs: p.tarif_rs || 0,
                            alamat: p.alamat || '',
                            kota: p.kota || ''
                          });
                          setIsModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        title="Edit Pelanggan"
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        title="Hapus Pelanggan"
                      >
                        <Trash2 size={16} /> Hapus
                      </button>
                      <button
                        onClick={() => openLinenConfig(p)}
                        className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 px-3 py-1.5 rounded-md font-medium transition-colors text-sm"
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
                  <input type="text" value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Kode Invoice</label>
                  <input type="text" value={formData.kode_invoice} onChange={(e) => setFormData({ ...formData, kode_invoice: e.target.value })} className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Tipe</label>
                  <select
                    value={formData.tipe}
                    onChange={(e) => {
                      const tipe = e.target.value;
                      setFormData({ ...formData, tipe, tipe_billing: tipe === 'RS' ? 'REGULER' : (formData.tipe_billing === '-' ? 'REGULER' : formData.tipe_billing) })
                    }}
                    className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="HOTEL">Hotel</option>
                    <option value="RS">RS</option>
                  </select>
                </div>
                {formData.tipe === 'HOTEL' && (
                  <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Tipe Billing</label>
                    <select value={formData.tipe_billing} onChange={(e) => setFormData({ ...formData, tipe_billing: e.target.value })} className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500">
                      <option value="REGULER">Reguler</option>
                      <option value="FLAT">Flat</option>
                    </select>
                  </div>
                )}
                {formData.tipe === 'RS' && (
                  <div className="mb-4 md:col-span-2">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Tarif per Kg (Rp)</label>
                    <CurrencyInput
                      value={formData.tarif_rs || 0}
                      onChange={(val) => setFormData({ ...formData, tarif_rs: val })}
                      className="shadow border rounded w-full py-2 pr-3 text-gray-700 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {formData.tipe === 'HOTEL' && formData.tipe_billing === 'FLAT' && (
                  <div className="mb-4 md:col-span-2">
                    <label className="block text-gray-700 text-sm font-bold mb-2">Tarif Flat </label>
                    <CurrencyInput
                      value={formData.tarif_flat || 0}
                      onChange={(val) => setFormData({ ...formData, tarif_flat: val })}
                      className="shadow border rounded w-full py-2 pr-3 text-gray-700 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                <div className="mb-4 md:col-span-2">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Alamat</label>
                  <textarea value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })} className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500" rows={3} />
                </div>
                <div className="mb-6 md:col-span-2">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Kota</label>
                  <input type="text" value={formData.kota} onChange={(e) => setFormData({ ...formData, kota: e.target.value })} className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:ring-2 focus:ring-blue-500" />
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
            <div className="flex justify-between items-center mb-4 pb-2 border-b shrink-0">
              <h3 className="text-xl font-bold">Konfigurasi Linen & Harga: {activePelanggan.nama}</h3>
              <button onClick={() => setIsLinenModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex overflow-x-auto mb-4 border-b shrink-0">
              <button
                className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'harga_urutan' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('harga_urutan')}
              >
                Harga & Urutan Default
              </button>
              {(() => {
                const isRS = activePelanggan.tipe?.toUpperCase() === 'RS';
                if (isRS) return null; // RS hanya Kiloan, tidak ada konfigurasi spesifik jenis nota

                const isFlat = activePelanggan.tipe_billing?.toUpperCase() === 'FLAT';
                const filteredTabs = jenisNotaList.filter(j =>
                  isFlat ? j.berlaku_flat : j.berlaku_reguler
                );

                return filteredTabs.map(jn => (
                  <button
                    key={jn.id}
                    className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === jn.id.toString() ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab(jn.id.toString())}
                  >
                    Nota: {jn.nama}
                  </button>
                ));
              })()}
            </div>

            {activeTab === 'harga_urutan' ? (
              <>
                <p className="text-sm text-gray-500 mb-4 shrink-0">Seret ikon <GripVertical size={14} className="inline text-gray-400" /> untuk mengubah urutan linen saat input nota pelanggan ini.</p>
                <div className="flex-1 overflow-y-auto min-h-0 h-[400px]">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={linenConfig.map(c => c.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2 p-1">
                        {linenConfig.map((item, index) => (
                          <SortableLinenItem key={item.id} item={item} index={index} updateHarga={updateHarga} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto min-h-0 h-[400px] flex flex-col">
                <p className="text-sm text-gray-500 mb-4 shrink-0">
                  Centang linen yang tersedia untuk nota ini, dan seret <GripVertical size={14} className="inline text-gray-400" /> untuk mengubah urutan tampilnya. Jika dibiarkan kosong, semua linen akan tampil.
                </p>
                <div className="space-y-2 p-1 flex-1">
                  {(() => {
                    const jnId = Number(activeTab);
                    const selectedIds = notaLinenConfig[jnId] || [];

                    const selectedItems = selectedIds.map(id => linenConfig.find(c => c.linen_id === id)).filter(Boolean) as LinenConfigItem[];
                    const unselectedItems = linenConfig.filter(c => !selectedIds.includes(c.linen_id));
                    const tabItems = [...selectedItems, ...unselectedItems];

                    const handleDrag = (event: any) => {
                      const { active, over } = event;
                      if (over && active.id !== over.id) {
                        setNotaLinenConfig(prev => {
                          const current = [...(prev[jnId] || [])];
                          const activeIdNum = Number(active.id);
                          const overIdNum = Number(over.id);

                          if (!current.includes(activeIdNum)) return prev;

                          const oldIndex = current.indexOf(activeIdNum);
                          if (current.includes(overIdNum)) {
                            const newIndex = current.indexOf(overIdNum);
                            return { ...prev, [jnId]: arrayMove(current, oldIndex, newIndex) };
                          } else {
                            return { ...prev, [jnId]: arrayMove(current, oldIndex, current.length - 1) };
                          }
                        });
                      }
                    };

                    return (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDrag}>
                        <SortableContext items={tabItems.map(c => c.id)} strategy={verticalListSortingStrategy}>
                          {tabItems.map(item => {
                            const isSelected = selectedIds.includes(item.linen_id);
                            const orderIdx = selectedIds.indexOf(item.linen_id);
                            return (
                              <SortableNotaLinenItem
                                key={item.id}
                                id={item.id}
                                nama={item.nama}
                                isSelected={isSelected}
                                toggle={() => toggleNotaLinen(jnId, item.linen_id)}
                                orderIdx={orderIdx}
                              />
                            );
                          })}
                        </SortableContext>
                      </DndContext>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t flex justify-end gap-3 shrink-0">
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
