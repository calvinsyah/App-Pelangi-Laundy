import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    )

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized: Missing Authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authErr } = await supabaseClient.auth.getUser(token);
    
    if (authErr || !authData.user) {
      console.error("Auth error:", authErr);
      throw new Error(`Unauthorized: ${authErr?.message || 'User not found'}`);
    }

    const { data: profileData, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (profileErr || !profileData) {
      throw new Error('Profil pengguna tidak ditemukan')
    }

    if (profileData.role !== 'admin') {
      return new Response(
        JSON.stringify({
          error: 'Akses ditolak. Hanya admin yang bisa menghitung gaji.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const payload = await req.json()
    const { tglMulai, tglSelesai } = payload

    if (!tglMulai || !tglSelesai) throw new Error('Periode tidak valid')

    // Fetch necessary data
    const [
      { data: karyawanList, error: kErr },
      { data: notas, error: nErr },
      { data: absensiList, error: aErr },
      { data: pengaturanData, error: pErr },
      { data: pelangganList, error: pelErr },
      { data: dataGaji, error: gErr }
    ] = await Promise.all([
      supabaseClient.from('karyawan').select('*'),
      supabaseClient.from('nota').select('*').gte('tanggal', tglMulai).lte('tanggal', tglSelesai),
      supabaseClient.from('absensi').select('*').gte('tanggal', tglMulai).lte('tanggal', tglSelesai),
      supabaseClient.from('pengaturan').select('*').limit(1),
      supabaseClient.from('pelanggan').select('*'),
      supabaseClient.from('gaji').select('*').eq('periode_mulai', tglMulai).eq('periode_selesai', tglSelesai)
    ])

    if (kErr || nErr || aErr || pErr || pelErr || gErr) {
      throw new Error('Gagal memuat data dari database')
    }

    const pg = pengaturanData?.[0] || {}
    const tarifInternal = pg.tarif_internal_hotel || 7000
    const ongkos = pg.ongkos_per_kg || 1200

    // Compute kg harian
    const kgHarian: Record<string, number> = {}
    notas?.forEach((nota) => {
      const tgl = nota.tanggal
      const pel = pelangganList?.find((p) => p.id === nota.pelanggan_id)
      if (!pel) return

      const tipePel = pel.tipe?.toUpperCase()
      const billingPel = pel.tipe_billing?.toUpperCase()
      const jenisNota = nota.jenis?.toUpperCase()

      if (tipePel === "HOTEL" && billingPel === "FLAT" && jenisNota === "FLAT") return

      let kg = 0
      if (jenisNota === "KILOAN") {
        kg = Number(nota.berat_kg) || (nota.items?.reduce((s: number, it: any) => s + (Number(it.qty) || 0), 0)) || 0
      } else {
        // Non-Kiloan uses total / tarifInternal to estimate Kg equivalent
        kg = (nota.total || 0) / tarifInternal
      }

      if (!kgHarian[tgl]) kgHarian[tgl] = 0
      kgHarian[tgl] += kg
    })

    const hasil = (karyawanList || []).map((k) => {
      let totalUpah = 0
      const rincian = []
      const current = new Date(tglMulai)
      const end = new Date(tglSelesai)

      while (current <= end) {
        const tgl = current.toISOString().slice(0, 10)
        const absen = absensiList?.find((a) => a.tanggal === tgl && a.karyawan_id === k.id)
        const status = absen ? absen.status : "Hadir"
        const kg = kgHarian[tgl] || 0
        let upah = 0
        let hadir = 0

        if (status === "Hadir" && k.tipe_gaji !== "Tetap") {
          hadir = karyawanList?.filter((k2) => {
            if (k2.tipe_gaji === "Tetap") return false;
            const a2 = absensiList?.find((a) => a.tanggal === tgl && a.karyawan_id === k2.id)
            return a2 ? a2.status === "Hadir" : true
          }).length || 1
          upah = Math.floor((ongkos / hadir) * kg)
          totalUpah += upah
        }

        rincian.push({ tanggal: tgl, kg, ongkos, hadir, upah, status })
        current.setUTCDate(current.getUTCDate() + 1)
      }

      const simpan = dataGaji?.find((g) => g.karyawan_id === k.id) || {}
      const insentif = simpan.insentif || 0
      const lembur = simpan.lembur || 0
      const potongan = simpan.potongan || 0
      
      const gajiPokok = k.tipe_gaji === 'Tetap' ? (simpan.gaji_pokok ?? k.gaji_pokok ?? 0) : 0
      
      const totalDiterima = Math.floor(totalUpah + gajiPokok + insentif + lembur - potongan)

      return {
        karyawan: k,
        totalUpah,
        gajiPokok,
        insentif,
        lembur,
        potongan,
        totalDiterima,
        rincian,
        periodeMulai: tglMulai,
        periodeSelesai: tglSelesai,
        gajiId: simpan.id || null
      }
    })

    return new Response(
      JSON.stringify(hasil),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
