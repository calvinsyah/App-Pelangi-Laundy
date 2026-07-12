import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useLocation, useNavigate } from 'react-router-dom';

import { getLocalDateString, getSafeErrorMessage } from '../../lib/utils';
import { useToast } from '../../components/ToastProvider';

interface ConfiguredLinen {
  linen_id: number;
  nama: string;
  urutan: number;
  harga: number;
  qty: number;
}

interface InputNotaProps {
  editId?: string | number;
  isModal?: boolean;
  onSuccessCb?: () => void;
  onCloseCb?: () => void;
}

export default function InputNota({ editId: propsEditId, isModal, onSuccessCb, onCloseCb }: InputNotaProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const editNotaId = propsEditId || location.state?.editNotaId;
  const { toast } = useToast();

  const [pelangganList, setPelangganList] = useState<any[]>([]);
  const [jenisNotaList, setJenisNotaList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    tanggal: getLocalDateString(),
    pelanggan_id: '',
    jenis_nota_id: '',
    berat_kg: 0,
  });

  const [baseLinenConfig, setBaseLinenConfig] = useState<ConfiguredLinen[]>([]);
  const [displayedLinen, setDisplayedLinen] = useState<ConfiguredLinen[]>([]);
  const [editItems, setEditItems] = useState<any[] | null>(null);

  // Fetch Nota for Editing
  useEffect(() => {
    if (editNotaId) {
      const fetchEditNota = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('nota').select('*').eq('id', editNotaId).single();
        if (data && !error) {
          setFormData({
            tanggal: data.tanggal,
            pelanggan_id: data.pelanggan_id.toString(),
            jenis_nota_id: data.jenis_nota_id ? data.jenis_nota_id.toString() : '',
            berat_kg: data.berat_kg || 0,
          });
          if (data.items) {
            setEditItems(data.items);
          }
        }
        setLoading(false);
      };
      fetchEditNota();
    }
  }, [editNotaId]);

  useEffect(() => {
    const fetchMasterData = async () => {
      const [pel, jenis] = await Promise.all([
        supabase.from('pelanggan').select('id, nama, tipe, tipe_billing, tarif_flat, tarif_rs'),
        supabase.from('jenis_nota').select('id, nama, berlaku_reguler, berlaku_flat, multiplier')
      ]);
      setPelangganList(pel.data || []);
      
      // Pastikan ada KILOAN jika belum ada
      let jData = jenis.data || [];
      if (!jData.find(j => j.nama === 'KILOAN')) {
        jData.push({ id: 0, nama: 'KILOAN', berlaku_reguler: true, berlaku_flat: false, multiplier: 1 });
      }
      setJenisNotaList(jData);
    };
    fetchMasterData();
  }, []);

  const selectedPelanggan = pelangganList.find(p => p.id.toString() === formData.pelanggan_id);
  const isRS = selectedPelanggan?.tipe?.toUpperCase() === 'RS';
  const isFlat = selectedPelanggan?.tipe_billing?.toUpperCase() === 'FLAT';

  // Logika Filter Jenis Nota berdasarkan Tipe Pelanggan
  const filteredJenisNotaList = useMemo(() => {
    if (!selectedPelanggan) return jenisNotaList.filter(j => j.nama !== 'KILOAN');
    if (isRS) return jenisNotaList.filter(j => j.nama === 'KILOAN');
    
    // Selain RS (Hotel / Reguler), jangan tampilkan KILOAN
    let baseList = jenisNotaList.filter(j => j.nama !== 'KILOAN');
    
    if (selectedPelanggan.tipe?.toUpperCase() === 'HOTEL') {
      if (isFlat) return baseList.filter(j => j.berlaku_flat);
      return baseList.filter(j => j.berlaku_reguler);
    }
    return baseList;
  }, [jenisNotaList, selectedPelanggan, isRS, isFlat]);

  // Auto-select jenis_nota jika RS atau jika pilihan saat ini tidak valid
  useEffect(() => {
    if (pelangganList.length === 0 || jenisNotaList.length === 0) return;

    if (isRS) {
      const kiloan = jenisNotaList.find(j => j.nama === 'KILOAN');
      if (kiloan && formData.jenis_nota_id !== kiloan.id.toString()) {
        setFormData(prev => ({ ...prev, jenis_nota_id: kiloan.id.toString() }));
      }
    } else if (formData.pelanggan_id && filteredJenisNotaList.length > 0) {
      const isValid = filteredJenisNotaList.some(j => j.id.toString() === formData.jenis_nota_id);
      if (!isValid && formData.jenis_nota_id !== filteredJenisNotaList[0].id.toString()) {
        setFormData(prev => ({ ...prev, jenis_nota_id: filteredJenisNotaList[0].id.toString() }));
      }
    } else if (formData.pelanggan_id && filteredJenisNotaList.length === 0) {
      // Jika tidak ada jenis nota yang tersedia untuk pelanggan ini
      if (formData.jenis_nota_id !== '') {
        setFormData(prev => ({ ...prev, jenis_nota_id: '' }));
      }
    }
  }, [formData.pelanggan_id, isRS, jenisNotaList, filteredJenisNotaList, formData.jenis_nota_id, pelangganList.length]);

  // Fetch Base Linen Pelanggan Config
  useEffect(() => {
    const fetchLinenConfig = async () => {
      if (!formData.pelanggan_id) {
        setBaseLinenConfig([]);
        return;
      }
      const pId = parseInt(formData.pelanggan_id);
      const [mlRes, lpRes, hpRes] = await Promise.all([
        supabase.from('master_linen').select('*').order('id'),
        supabase.from('linen_pelanggan').select('*').eq('pelanggan_id', pId),
        supabase.from('harga_pelanggan').select('*').eq('pelanggan_id', pId)
      ]);

      if (mlRes.data) {
        let config: ConfiguredLinen[] = mlRes.data.map(ml => {
          const lp = lpRes.data?.find(x => x.linen_id === ml.id);
          const hp = hpRes.data?.find(x => x.linen_id === ml.id);
          return {
            linen_id: ml.id,
            nama: ml.nama,
            urutan: lp ? lp.urutan : 999,
            harga: hp ? hp.harga : 0,
            qty: 0
          };
        });
        config.sort((a, b) => {
          if (a.urutan === b.urutan) return a.linen_id - b.linen_id;
          return a.urutan - b.urutan;
        });
        setBaseLinenConfig(config);
      }
    };
    fetchLinenConfig();
  }, [formData.pelanggan_id]);

  // Terapkan filter linen_config per-pelanggan per-jenis_nota (2nd layer filter)
  useEffect(() => {
    const applyFilter = async () => {
      if (!formData.jenis_nota_id || baseLinenConfig.length === 0 || !formData.pelanggan_id) {
        setDisplayedLinen([]);
        return;
      }
      const selectedJenis = jenisNotaList.find(j => j.id.toString() === formData.jenis_nota_id);
      if (!selectedJenis) return;

      const pId = parseInt(formData.pelanggan_id);
      const jnId = parseInt(formData.jenis_nota_id);

      // Fetch pelanggan_nota_linen config
      const { data: notaLinenP } = await supabase
        .from('pelanggan_nota_linen')
        .select('*')
        .eq('pelanggan_id', pId)
        .eq('jenis_nota_id', jnId)
        .order('urutan', { ascending: true });

      let finalLinen = [...baseLinenConfig];

      if (notaLinenP && notaLinenP.length > 0) {
        // Jika ada konfigurasi khusus untuk kombinasi pelanggan + nota ini:
        const allowedIds = new Set(notaLinenP.map(c => c.linen_id));
        finalLinen = finalLinen.filter(l => allowedIds.has(l.linen_id));
        
        // Urutkan sesuai dengan urutan di pelanggan_nota_linen
        finalLinen.sort((a, b) => {
          const idxA = notaLinenP.findIndex(c => c.linen_id === a.linen_id);
          const idxB = notaLinenP.findIndex(c => c.linen_id === b.linen_id);
          return idxA - idxB;
        });
      }

      // Apply multiplier to harga
      const multiplier = selectedJenis.multiplier || 1;
      finalLinen = finalLinen.map(l => ({ ...l, harga: Math.floor(l.harga * multiplier) }));

      // Inject edit quantities if editing
      if (editItems) {
        finalLinen = finalLinen.map(l => {
          const found = editItems.find((ei: any) => (ei.linen_id === l.linen_id) || (ei.idMaster === l.linen_id));
          return found ? { ...l, qty: found.qty, harga: found.harga || found.basePrice || l.harga } : l; // retain historical price if editing
        });
      }

      setDisplayedLinen(finalLinen);
    };

    applyFilter();
  }, [formData.jenis_nota_id, formData.pelanggan_id, baseLinenConfig, jenisNotaList, editItems]);


  const updateQty = (index: number, val: string) => {
    const num = parseInt(val) || 0;
    const newLinen = [...displayedLinen];
    newLinen[index].qty = Math.max(0, num);
    setDisplayedLinen(newLinen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validItems = displayedLinen.filter(item => item.qty > 0).map(item => ({
      linen_id: item.linen_id,
      nama: item.nama, // save name for historical accuracy in JSONB
      qty: item.qty,
      harga: item.harga
    }));

    let valid = true;
    if (isRS) {
      if (formData.berat_kg <= 0) {
        toast('Berat (Kg) harus lebih dari 0 untuk nota Kiloan/RS.', 'error');
        valid = false;
      }
    } else {
      if (validItems.length === 0) {
        toast('Harus ada minimal 1 item dengan kuantitas > 0 untuk nota Reguler.', 'error');
        valid = false;
      }
    }

    if (!valid) {
      setLoading(false);
      return;
    }

    try {
      const selectedPelangganObj = pelangganList.find(p => p.id.toString() === formData.pelanggan_id);
      let calculatedTotal = 0;
      if (isRS) {
        calculatedTotal = formData.berat_kg * (selectedPelangganObj?.tarif_rs || 0);
      } else {
        calculatedTotal = validItems.reduce((sum, item) => sum + (item.harga * item.qty), 0);
      }

      const notaData = {
        tanggal: formData.tanggal,
        pelanggan_id: parseInt(formData.pelanggan_id),
        jenis_nota_id: parseInt(formData.jenis_nota_id) === 0 ? null : parseInt(formData.jenis_nota_id),
        jenis: jenisNotaList.find(j => j.id.toString() === formData.jenis_nota_id)?.nama || 'KILOAN',
        berat_kg: (isRS) ? formData.berat_kg : null,
        status_bayar: 'Belum',
        total: calculatedTotal,
        items: (isRS) ? null : validItems
      };

      if (editNotaId) {
        // Prevent changing status_bayar if it's already Lunas
        const { error: notaErr } = await supabase
          .from('nota')
          .update(notaData)
          .eq('id', editNotaId);
        if (notaErr) throw notaErr;
        toast('Nota berhasil diperbarui!', 'success');
        if (onSuccessCb) onSuccessCb();
        else setTimeout(() => navigate('/transaksi/riwayat'), 1500);
      } else {
        const nota_id = `${formData.tanggal.replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`;
        const { data, error: notaErr } = await supabase.functions.invoke("nota-create", {
          body: { ...notaData, nota_id, isFlat }
        });
        if (notaErr) throw notaErr;
        toast('Nota berhasil disimpan!', 'success');
        setFormData({ ...formData, berat_kg: 0 });
        setDisplayedLinen(displayedLinen.map(l => ({ ...l, qty: 0 })));
        if (onSuccessCb) onSuccessCb();
      }
    } catch (err: any) {
      console.error('Detail error:', err);
      let errMsg = getSafeErrorMessage(err);
      
      // Attempt to extract real error message from Supabase FunctionsHttpError
      try {
        if (err.context && typeof err.context.json === 'function') {
           const body = await err.context.json();
           console.error("Parsed error body:", body);
           if (body.error) errMsg = `Edge Error: ${body.error}`;
        } else if (err.context && err.context.error) {
           errMsg = `Edge Error: ${err.context.error}`;
        }
      } catch (e) {
        console.error('Failed to parse edge function error body', e);
      }

      console.error("=== PESAN ERROR ASLI ===", errMsg);
      toast(errMsg, 'error');
    }
    setLoading(false);
  };

  if (isModal) {
    return (
      <div className="bg-white p-4">
        <form onSubmit={handleSubmit}>
          {/* Header info readonly for Modal Edit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Tanggal</label>
              <input type="date" value={formData.tanggal} disabled className="shadow border rounded w-full py-2 px-3 bg-gray-100 text-gray-500" />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Pelanggan</label>
              <select value={formData.pelanggan_id} disabled className="shadow border rounded w-full py-2 px-3 bg-gray-100 text-gray-500">
                {pelangganList.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Jenis Nota</label>
              <select value={formData.jenis_nota_id} disabled className="shadow border rounded w-full py-2 px-3 bg-gray-100 text-gray-500">
                <option value="0">KILOAN</option>
                {filteredJenisNotaList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
              </select>
            </div>
            
            {isRS && (
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Berat (Kg)</label>
                <input type="number" step="0.1" value={formData.berat_kg} onChange={(e) => setFormData({...formData, berat_kg: parseFloat(e.target.value)})} className="shadow border rounded w-full py-2 px-3 focus:ring-2 focus:ring-blue-500 bg-blue-50 border-blue-200" required />
              </div>
            )}
          </div>

          {(!isRS) && formData.pelanggan_id && displayedLinen.length > 0 && (
            <div className="mb-6 max-h-[50vh] overflow-y-auto pr-2">
              <h3 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b">Item Linen (Kuantitas)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {displayedLinen.map((item, index) => (
                  <div key={item.linen_id} className="border border-gray-200 p-4 rounded-lg bg-gray-50 flex flex-col hover:border-blue-300 transition-colors">
                    <span className="font-bold text-gray-800 mb-1">{item.nama}</span>
                    <span className="text-sm text-blue-600 font-medium mb-3">@ {item.harga.toLocaleString('id-ID')}</span>
                    <input 
                      type="number" 
                      min="0"
                      value={item.qty === 0 ? '' : item.qty}
                      onChange={(e) => updateQty(index, e.target.value)}
                      className="shadow border rounded w-full py-2 px-3 focus:ring-2 focus:ring-blue-500 mt-auto"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            {onCloseCb && (
              <button type="button" onClick={onCloseCb} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium">Batal</button>
            )}
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline transition-colors disabled:opacity-50">
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {editNotaId ? 'Edit Nota' : 'Input Nota Baru'}
      </h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Tanggal</label>
              <input type="date" value={formData.tanggal} onChange={(e) => setFormData({...formData, tanggal: e.target.value})} className="shadow border rounded w-full py-2 px-3 focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Pelanggan</label>
              <select value={formData.pelanggan_id} onChange={(e) => setFormData({...formData, pelanggan_id: e.target.value})} className="shadow border rounded w-full py-2 px-3 focus:ring-2 focus:ring-blue-500" required>
                <option value="">-- Pilih Pelanggan --</option>
                {pelangganList.map(p => (
                  <option key={p.id} value={p.id}>{p.nama} ({p.tipe === 'RS' ? 'RS' : p.tipe_billing})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Jenis Nota</label>
              <select 
                value={formData.jenis_nota_id} 
                onChange={(e) => setFormData({...formData, jenis_nota_id: e.target.value})} 
                className={`shadow border rounded w-full py-2 px-3 focus:ring-2 focus:ring-blue-500 ${isRS ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''}`}
                required
                disabled={isRS}
              >
                <option value="">-- Pilih Jenis Nota --</option>
                {filteredJenisNotaList.map(j => (
                  <option key={j.id} value={j.id}>{j.nama}</option>
                ))}
              </select>
            </div>
            
            {isRS && (
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Berat (Kg)</label>
                <input type="number" step="0.1" value={formData.berat_kg} onChange={(e) => setFormData({...formData, berat_kg: parseFloat(e.target.value)})} className="shadow border rounded w-full py-2 px-3 focus:ring-2 focus:ring-blue-500 bg-blue-50 border-blue-200" required />
                {isRS && selectedPelanggan && (
                  <p className="text-xs text-blue-600 mt-1 font-semibold">Tarif RS: Rp {(selectedPelanggan.tarif_rs || 0).toLocaleString('id-ID')} / KG</p>
                )}
              </div>
            )}
          </div>

          {(!isRS) && formData.pelanggan_id && displayedLinen.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b">Item Linen (Kuantitas)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {displayedLinen.map((item, index) => (
                  <div key={item.linen_id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col justify-between hover:border-blue-300 transition-colors">
                    <div className="mb-2">
                      <span className="font-semibold text-gray-800 block">{item.nama}</span>
                      <span className="text-xs text-green-600 font-medium">Rp {item.harga.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Qty:</label>
                      <input
                        type="number"
                        min="0"
                        value={item.qty === 0 ? '' : item.qty}
                        onChange={(e) => updateQty(index, e.target.value)}
                        className="shadow-sm border rounded w-full py-1.5 px-2 focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!isRS) && formData.pelanggan_id && displayedLinen.length === 0 && formData.jenis_nota_id && (
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200 mb-6 text-gray-500">
              Belum ada linen yang diatur untuk pelanggan atau jenis nota ini. <br/>
              Silakan atur di Master Pelanggan atau Master Jenis Nota.
            </div>
          )}

          <div className="bg-white p-4 border-t border-gray-200 flex justify-between -mx-6 -mb-6 rounded-b-xl mt-8">
            {editNotaId ? (
              <button
                type="button"
                onClick={() => navigate('/transaksi/riwayat')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 px-6 rounded-lg transition-colors"
              >
                Batal
              </button>
            ) : <div />}
            <button
              type="submit"
              disabled={loading || (!formData.pelanggan_id)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/30 w-full sm:w-auto ml-2 sm:ml-0"
            >
              {loading ? 'Menyimpan...' : (editNotaId ? 'Perbarui Nota' : 'Simpan Nota')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
