import { createClient } from "@supabase/supabase-js";

// Use as mesmas variáveis que você já tem configuradas no Cloudflare Pages
// (se ainda não existirem, crie REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY
// no Cloudflare Pages > Settings > Environment variables, e também no seu .env local)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper: faz fetch automaticamente incluindo o token do usuário logado
// no header Authorization. Use isso em vez de fetch() puro em qualquer
// chamada pro proxy que precise saber quem é o usuário.
export async function authFetch(url, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(url, { ...options, headers });
}
