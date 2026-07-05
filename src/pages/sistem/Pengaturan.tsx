import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Save, Upload } from 'lucide-react';
import { CurrencyInput } from '../../components/CurrencyInput';
export default function Pengaturan() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  
  // Settings State
  const [pgSettings, setPgSettings] = useState({
    tarif_internal_hotel: 7000,
    ongkos_per_kg: 1200,
    rekening_name: '',
    rekening_no: '',
    bank: '',
    direktur: 'Bagus Riadi Kurniawan',
    peralatan: 0
  });

  // Kop Surat State
  const [kopSettings, setKopSettings] = useState({
    nama: '',
    alamat: '',
    telepon: '',
    email: '',
    kontak: ''
  });

  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const [pgRes, kopRes] = await Promise.all([
        supabase.from('pengaturan').select('*').limit(1).maybeSingle(),
        supabase.from('kop').select('*').limit(1).maybeSingle()
      ]);

      if (pgRes.data) {
        setPgSettings({
          tarif_internal_hotel: pgRes.data.tarif_internal_hotel || 7000,
          ongkos_per_kg: pgRes.data.ongkos_per_kg || 1200,
          rekening_name: pgRes.data.rekening_name || '',
          rekening_no: pgRes.data.rekening_no || '',
          bank: pgRes.data.bank || '',
          direktur: pgRes.data.direktur || 'Bagus Riadi Kurniawan',
          peralatan: pgRes.data.peralatan || 0
        });
      }

      if (kopRes.data) {
        setKopSettings({
          nama: kopRes.data.nama || '',
          alamat: kopRes.data.alamat || '',
          telepon: kopRes.data.telepon || '',
          email: kopRes.data.email || '',
          kontak: kopRes.data.kontak || ''
        });
        setLogoUrl(kopRes.data.logo_url || null);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const { error } = await supabase.from('pengaturan').upsert({ id: 1, ...pgSettings });
    if (error) {
      setMsg('Gagal menyimpan pengaturan global');
    } else {
      setMsg('Pengaturan global berhasil disimpan!');
    }
    setLoading(false);
  };

  const handleSaveKop = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const { error } = await supabase.from('kop').upsert({ id: 1, ...kopSettings, logo_url: logoUrl });
    if (error) {
      setMsg('Gagal menyimpan kop surat');
    } else {
      setMsg('Kop surat berhasil disimpan!');
    }
    setLoading(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran logo maksimal 2 MB.");
      return;
    }

    setLoading(true);
    setMsg('Mengunggah logo...');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload image to Supabase storage 'assets' bucket
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
      setLogoUrl(data.publicUrl);
      setMsg('Logo berhasil diunggah!');
    } catch (err: any) {
      console.error(err);
      setMsg('Gagal mengunggah logo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Pengaturan Sistem</h2>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Global Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100">⚙️ Pengaturan Global</h3>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Tarif Internal Hotel</label>
              <CurrencyInput
                value={pgSettings.tarif_internal_hotel}
                onChange={(val) => setPgSettings({...pgSettings, tarif_internal_hotel: val})}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Ongkos per Kg Gaji</label>
              <CurrencyInput
                value={pgSettings.ongkos_per_kg}
                onChange={(val) => setPgSettings({...pgSettings, ongkos_per_kg: val})}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Nama Direktur</label>
              <input
                type="text"
                value={pgSettings.direktur}
                onChange={(e) => setPgSettings({...pgSettings, direktur: e.target.value})}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Nilai Aset Peralatan</label>
              <CurrencyInput
                value={pgSettings.peralatan}
                onChange={(val) => setPgSettings({...pgSettings, peralatan: val})}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Nama Pemilik Rekening</label>
              <input
                type="text"
                value={pgSettings.rekening_name}
                onChange={(e) => setPgSettings({...pgSettings, rekening_name: e.target.value})}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Nama Bank</label>
                <input
                  type="text"
                  value={pgSettings.bank}
                  onChange={(e) => setPgSettings({...pgSettings, bank: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">No. Rekening</label>
                <input
                  type="text"
                  value={pgSettings.rekening_no}
                  onChange={(e) => setPgSettings({...pgSettings, rekening_no: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Save size={18} /> Simpan Pengaturan
              </button>
            </div>
          </form>
        </div>

        {/* Kop Surat & Logo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-700 mb-4 pb-2 border-b border-gray-100">📋 Kop Surat & Logo</h3>
          <form onSubmit={handleSaveKop} className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Nama Usaha</label>
              <input
                type="text"
                value={kopSettings.nama}
                onChange={(e) => setKopSettings({...kopSettings, nama: e.target.value})}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Alamat Usaha</label>
              <input
                type="text"
                value={kopSettings.alamat}
                onChange={(e) => setKopSettings({...kopSettings, alamat: e.target.value})}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Telepon</label>
                <input
                  type="text"
                  value={kopSettings.telepon}
                  onChange={(e) => setKopSettings({...kopSettings, telepon: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input
                  type="email"
                  value={kopSettings.email}
                  onChange={(e) => setKopSettings({...kopSettings, email: e.target.value})}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Logo Usaha</label>
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <img src={logoUrl} alt="Logo Preview" className="h-16 w-auto object-contain border rounded p-1" />
                )}
                <label className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors text-sm">
                  <Upload size={16} /> Unggah Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Save size={18} /> Simpan Kop Surat
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
