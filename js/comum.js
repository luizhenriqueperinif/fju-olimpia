import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const configurado = SUPABASE_URL.startsWith("https://");

export const supabase = configurado ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const ESPORTES = [
  "Futebol de campo",
  "Futsal",
  "Vôlei",
  "Futevôlei",
  "Basquete",
  "Tênis de mesa",
  "Ciclismo",
  "Xadrez",
];

export const ICONES = {
  "Futebol de campo": "⚽",
  "Futsal": "🥅",
  "Vôlei": "🏐",
  "Futevôlei": "🦶",
  "Basquete": "🏀",
  "Tênis de mesa": "🏓",
  "Ciclismo": "🚴",
  "Xadrez": "♟️",
  "Outro": "➕",
};

export const CAMPEONATO_LABEL = { sim: "Sim", talvez: "Talvez", nao: "Não" };

export function escapeHtml(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

export function mascaraTelefone(valor) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function idade(dataNascimento) {
  if (!dataNascimento) return null;
  const [a, m, d] = dataNascimento.split("-").map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos--;
  return anos;
}
