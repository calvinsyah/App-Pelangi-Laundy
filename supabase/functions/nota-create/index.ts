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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized: Missing Authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error(`Unauthorized: ${userError?.message || 'User not found'}`);
    }

    const payload = await req.json()
    const { tanggal, pelanggan_id, jenis_nota_id, berat_kg, items, isFlat, nota_id, id, action } = payload

    // Get the name of the jenis_nota
    let jenis = 'KILOAN'
    if (jenis_nota_id) {
      const { data: jenisNota } = await supabaseClient.from('jenis_nota').select('nama').eq('id', jenis_nota_id).single()
      if (jenisNota) {
        jenis = jenisNota.nama
      }
    }
    
    const isKiloan = jenis === 'KILOAN'

    // Server-side validation
    if (isKiloan) {
      if (berat_kg <= 0) throw new Error('Berat (Kg) harus > 0 untuk nota Kiloan/RS')
    } else {
      if (!items || items.length === 0) throw new Error('Harus ada item untuk nota Reguler')
      const totalQty = items.reduce((sum: number, item: any) => sum + Number(item.qty), 0)
      if (totalQty <= 0) throw new Error('Total qty item harus > 0')
    }

    // Calculate total if applicable
    let total = payload.total || 0;
    if (!isKiloan && items && items.length > 0) {
      total = items.reduce((sum: number, item: any) => sum + ((Number(item.qty) || 0) * (Number(item.harga) || 0)), 0)
    }

    let nota, notaErr;

    if (action === 'update' && id) {
      const { data, error } = await supabaseClient
        .from('nota')
        .update({
          tanggal,
          pelanggan_id,
          jenis_nota_id,
          jenis,
          berat_kg: isKiloan ? berat_kg : null,
          total,
          items: (!isKiloan && items && items.length > 0) ? items : null
        })
        .eq('id', id)
        .select()
        .single();
      nota = data;
      notaErr = error;
    } else {
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;
      
      while (!success && retryCount < maxRetries) {
        try {
          const generatedNotaId = `${tanggal.replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`;
          
          const { data, error } = await supabaseClient
            .from('nota')
            .insert([{
              nota_id: generatedNotaId,
              tanggal,
              pelanggan_id,
              jenis_nota_id,
              jenis,
              berat_kg: isKiloan ? berat_kg : null,
              status_bayar: 'Belum',
              total,
              items: (!isKiloan && items && items.length > 0) ? items : null
            }])
            .select()
            .single();
            
          if (error) {
            // Check if error is unique constraint violation for nota_id (code 23505)
            if (error.code === '23505' && (error.message.includes('nota_id') || error.message.includes('nota_nota_id_key'))) {
              retryCount++;
              if (retryCount >= maxRetries) {
                notaErr = new Error('Gagal generate nota_id unik setelah 3 kali percobaan');
                break;
              }
              continue; // retry
            }
            notaErr = error;
            break;
          }
          
          nota = data;
          success = true;
        } catch (e: any) {
          notaErr = e;
          break;
        }
      }
    }

    if (notaErr) throw notaErr

    return new Response(
      JSON.stringify({ success: true, nota }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Error in nota-create:", error);
    return new Response(
      JSON.stringify({ error: error.message || JSON.stringify(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
