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

    // Get user from auth header to verify they are logged in
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const payload = await req.json()
    const { tanggal, pelanggan_id, jenis_nota_id, berat_kg, items, isFlat } = payload

    // Server-side validation
    if (isFlat) {
      if (berat_kg <= 0) throw new Error('Berat (Kg) harus > 0 untuk nota Flat')
    } else {
      if (!items || items.length === 0) throw new Error('Harus ada item untuk nota Reguler')
      const totalQty = items.reduce((sum: number, item: any) => sum + Number(item.qty), 0)
      if (totalQty <= 0) throw new Error('Total qty item harus > 0')
    }

    // Get the name of the jenis_nota
    const { data: jenisNota } = await supabaseClient.from('jenis_nota').select('nama').eq('id', jenis_nota_id).single()
    const jenis = jenisNota?.nama || 'KILOAN'

    // Calculate total if applicable
    let total = 0
    if (!isFlat && items && items.length > 0) {
      total = items.reduce((sum: number, item: any) => sum + ((Number(item.qty) || 0) * (Number(item.harga) || 0)), 0)
    }

    // Insert nota
    const { data: nota, error: notaErr } = await supabaseClient
      .from('nota')
      .insert([{
        tanggal,
        pelanggan_id,
        jenis_nota_id,
        jenis,
        berat_kg: isFlat ? berat_kg : null,
        status_bayar: 'Belum',
        total,
        items: (!isFlat && items && items.length > 0) ? items : null
      }])
      .select()
      .single()

    if (notaErr) throw notaErr

    return new Response(
      JSON.stringify({ success: true, nota }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
