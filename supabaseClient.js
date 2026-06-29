// supabaseClient.js
const SUPABASE_URL = "https://gkboghoeqqrkasoclwiy.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYm9naG9lcXFya2Fzb2Nsd2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTAzMjksImV4cCI6MjA5NzkyNjMyOX0.Ou_cH5vIpTSbS-ayxcyEnHHHWgU03cgxGX1n2WPXRf4";

var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
