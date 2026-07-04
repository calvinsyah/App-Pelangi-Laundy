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
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
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

    // Insert nota
    const { data: nota, error: notaErr } = await supabaseClient
      .from('nota')
      .insert([{
        tanggal,
        pelanggan_id,
        jenis_nota_id,
        berat_kg: isFlat ? berat_kg : null,
        status_bayar: 'Belum'
      }])
      .select()
      .single()

    if (notaErr) throw notaErr

    // Insert items if reguler
    if (!isFlat && items && items.length > 0) {
      const itemInserts = items.map((item: any) => ({
        nota_id: nota.id,
        linen_id: item.linen_id,
        qty: item.qty
      }))
      // Wait, we need a table for this, let's assume 'nota_items'
      // If table doesn't exist, this will error in Supabase but logic is correct
      const { error: itemErr } = await supabaseClient.from('nota_items').insert(itemInserts)
      if (itemErr) throw itemErr
    }

    return new Response(
      JSON.stringify({ success: true, nota }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
