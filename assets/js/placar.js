// placar.js — página dedicada /placar
// Lê o DOM já renderizado por placar.html, popula via Supabase + PIN auth.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://honpawztvfdplieezuko.supabase.co";
const SUPABASE_KEY = "sb_publishable_AUpuKM4YSxGUd2INXhshhg_M7wjjGWN";
const LS_KEY = "miguelimpiadas.identity";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 5 } },
});

// =============================================================
//                          STATE
// =============================================================
const state = {
  scores: [],
  config: { placar_oculto: false, fase: "Aguardando início" },
  identity: loadIdentity(),
};

function loadIdentity() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch { return null; }
}
function saveIdentity(id) {
  state.identity = id;
  if (id) localStorage.setItem(LS_KEY, JSON.stringify(id));
  else localStorage.removeItem(LS_KEY);
}

// =============================================================
//                          DOM REFS
// =============================================================
const $ = (id) => document.getElementById(id);
const els = {
  key: $("pl-key"),
  fase: $("pl-fase"),
  meBanner: $("pl-me-banner"),
  list: $("pl-list"),
  admin: $("pl-admin"),
  adminList: $("pl-admin-list"),
  oculto: $("pl-oculto"),
  faseInput: $("pl-fase-input"),
  faseSave: $("pl-fase-save"),
  add: $("pl-add"),
  reset: $("pl-reset"),
  loginOverlay: $("pl-login-overlay"),
  loginForm: $("pl-login-form"),
  loginWho: $("pl-login-who"),
  loginPin: $("pl-login-pin"),
  loginErr: $("pl-login-err"),
  loginCancel: $("pl-login-cancel"),
};

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// =============================================================
//                          RPC
// =============================================================
async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    console.error("[rpc]", name, error);
    if (error.message?.includes("master_pin_invalid")) {
      alert("Sua senha admin não é mais válida. Faça login de novo.");
      saveIdentity(null);
      render();
    } else {
      alert("Erro: " + error.message);
    }
    return null;
  }
  return data;
}

// =============================================================
//                       LOGIN MODAL
// =============================================================
function openLogin() {
  refreshLoginOptions();
  els.loginPin.value = "";
  els.loginErr.textContent = "";
  els.loginOverlay.classList.add("open");
  setTimeout(() => els.loginPin.focus(), 100);
}
function closeLogin() { els.loginOverlay.classList.remove("open"); }

function refreshLoginOptions() {
  const cur = els.loginWho.value;
  els.loginWho.innerHTML =
    `<option value="admin">👑 Admin (Miguel)</option>` +
    state.scores
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((s) => `<option value="athlete:${s.id}">🏃 ${escapeHtml(s.nome)}</option>`)
      .join("");
  if (cur && els.loginWho.querySelector(`option[value="${cur}"]`)) els.loginWho.value = cur;
}

async function handleLogin(e) {
  e.preventDefault();
  const who = els.loginWho.value;
  const pin = els.loginPin.value;
  els.loginErr.textContent = "";
  if (pin.length < 4) { els.loginErr.textContent = "Senha mínimo 4 caracteres"; return; }

  if (who === "admin") {
    const { data: isSet } = await supabase.rpc("master_pin_is_set");
    if (!isSet) {
      if (!confirm("Nenhum admin definido ainda. Essa senha vai ser a do Miguel. Confirma?")) return;
      const { data: ok, error } = await supabase.rpc("set_master_pin", { old_pin: null, new_pin: pin });
      if (error || !ok) { els.loginErr.textContent = "Erro ao definir senha"; return; }
    } else {
      const { data: ok } = await supabase.rpc("check_master", { pin_in: pin });
      if (!ok) { els.loginErr.textContent = "Senha admin incorreta"; return; }
    }
    saveIdentity({ kind: "admin", pin });
  } else if (who.startsWith("athlete:")) {
    const sid = who.slice(8);
    const { data: isSet } = await supabase.rpc("athlete_pin_is_set", { sid });
    if (!isSet) {
      const name = state.scores.find((s) => s.id === sid)?.nome;
      if (!confirm(`1ª vez de ${name}? Essa senha vai ser dele(a).`)) return;
      const { data: ok, error } = await supabase.rpc("set_athlete_pin", { sid, old_pin: null, new_pin: pin });
      if (error || !ok) { els.loginErr.textContent = "Erro ao definir senha"; return; }
    } else {
      const { data: ok } = await supabase.rpc("check_athlete", { sid, pin_in: pin });
      if (!ok) { els.loginErr.textContent = "Senha incorreta"; return; }
    }
    saveIdentity({ kind: "athlete", score_id: sid, pin });
  }
  closeLogin();
  render();
}

// =============================================================
//                          RENDER
// =============================================================
function render() {
  els.key.classList.toggle("active", !!state.identity);
  els.key.textContent = state.identity ? "🔓" : "🔑";
  els.fase.textContent = state.config.fase || "—";

  renderMeBanner();
  renderList();

  const isAdmin = state.identity?.kind === "admin";
  els.admin.hidden = !isAdmin;
  if (isAdmin) renderAdmin();
}

function renderMeBanner() {
  if (!state.identity) { els.meBanner.hidden = true; return; }
  els.meBanner.hidden = false;
  if (state.identity.kind === "admin") {
    els.meBanner.innerHTML = `<span>👑 Logado como <b>Admin (Miguel)</b></span><button class="pl-link-btn" id="pl-logout">sair</button>`;
  } else {
    const me = state.scores.find((s) => s.id === state.identity.score_id);
    const nome = me ? me.nome : "(atleta removido)";
    els.meBanner.innerHTML = `<span>🏃 Você é <b>${escapeHtml(nome)}</b></span><div style="display:flex;gap:14px"><button class="pl-link-btn" id="pl-change-pin">trocar senha</button><button class="pl-link-btn" id="pl-logout">sair</button></div>`;
  }
  $("pl-logout").onclick = () => { saveIdentity(null); render(); };
  const changeBtn = $("pl-change-pin");
  if (changeBtn) changeBtn.onclick = changeAthletePin;
}

function renderList() {
  const hidden = state.config.placar_oculto;
  const meId = state.identity?.kind === "athlete" ? state.identity.score_id : null;
  if (!state.scores.length) {
    els.list.innerHTML = `<li class="pl-empty">Sem atletas cadastrados ainda.<small>Miguel: clique 🔑, faça login, e use o painel admin pra cadastrar.</small></li>`;
    return;
  }
  const sorted = [...state.scores].sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem);
  els.list.innerHTML = sorted
    .map((s, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
      const me = s.id === meId;
      const cls = ["pl-row", i < 3 && "podio", hidden && "oculto", me && "me"].filter(Boolean).join(" ");
      return `<li class="${cls}">
        <span class="pl-pos">${i + 1}</span>
        <span class="pl-nome">${escapeHtml(s.nome)} ${medal}${me ? '<span class="pl-me-tag">você</span>' : ""}</span>
        <span class="pl-pontos">${s.pontos}<span class="pl-unit">MPTS</span></span>
        <span class="pl-moedas">${s.moedas}🪙</span>
      </li>`;
    })
    .join("");
}

function renderAdmin() {
  els.oculto.checked = !!state.config.placar_oculto;
  els.faseInput.value = state.config.fase || "";
  if (!state.scores.length) {
    els.adminList.innerHTML = `<div class="pl-empty" style="background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.7)">Nenhum atleta. Use <b>+ Atleta</b> abaixo pra começar.</div>`;
    return;
  }
  els.adminList.innerHTML = [...state.scores]
    .sort((a, b) => a.ordem - b.ordem)
    .map(
      (s) => `
    <div class="pl-admin-row" data-id="${s.id}">
      <span class="pl-admin-nome">${escapeHtml(s.nome)}${s.pin_hash ? '<span class="pl-admin-pinned" title="Atleta tem senha">🔐</span>' : ""}</span>
      <span class="pl-admin-ctrls">
        <button data-act="p-5">−5</button>
        <button data-act="p-1">−1</button>
        <span class="val">${s.pontos}</span>
        <button data-act="p+1">+1</button>
        <button data-act="p+5">+5</button>
        <button data-act="m-1">−1🪙</button>
        <span class="val">${s.moedas}</span>
        <button data-act="m+1">+1🪙</button>
        <button data-act="pin" title="Definir senha do atleta">🔑</button>
        <button data-act="del" title="Remover">🗑</button>
      </span>
    </div>`,
    )
    .join("");
}

// =============================================================
//                       ADMIN ACTIONS
// =============================================================
async function adminAct(id, act) {
  const s = state.scores.find((x) => x.id === id);
  if (!s || state.identity?.kind !== "admin") return;
  if (act === "del") {
    if (!confirm(`Remover ${s.nome}?`)) return;
    await rpc("admin_delete_athlete", { pin_in: state.identity.pin, sid: id });
    return;
  }
  if (act === "pin") {
    const label = s.pin_hash ? `Nova senha para ${s.nome} (substitui a atual):` : `Senha para ${s.nome} (mín 4 chars):`;
    const newPin = prompt(label);
    if (!newPin) return;
    if (newPin.length < 4) { alert("Senha mínimo 4 caracteres"); return; }
    await rpc("admin_set_athlete_pin", { pin_in: state.identity.pin, sid: id, new_pin: newPin });
    return;
  }
  let pontos = s.pontos, moedas = s.moedas;
  if (act === "p+1") pontos++;
  else if (act === "p-1") pontos--;
  else if (act === "p+5") pontos += 5;
  else if (act === "p-5") pontos -= 5;
  else if (act === "m+1") moedas++;
  else if (act === "m-1") moedas = Math.max(0, moedas - 1);
  await rpc("admin_update_score", { pin_in: state.identity.pin, sid: id, p_pontos: pontos, p_moedas: moedas });
}

async function addAtleta() {
  const nome = prompt("Nome do atleta:");
  if (!nome?.trim()) return;
  const newId = await rpc("admin_add_athlete", { pin_in: state.identity.pin, nome_in: nome.trim() });
  if (!newId) return;
  const pin = prompt(`Senha de ${nome.trim()} (mín 4 chars, ou cancele pra ele(a) criar depois):`);
  if (pin && pin.length >= 4) {
    await rpc("admin_set_athlete_pin", { pin_in: state.identity.pin, sid: newId, new_pin: pin });
  } else if (pin) {
    alert("Senha curta, atleta vai criar a própria depois");
  }
}
async function resetAll() {
  if (!confirm("Resetar TODOS os atletas para 0 pontos e 3 moedas?")) return;
  await rpc("admin_reset", { pin_in: state.identity.pin });
}
async function setOculto(v) { await rpc("admin_set_config", { pin_in: state.identity.pin, k_in: "placar_oculto", v_in: v }); }
async function setFase(v)   { await rpc("admin_set_config", { pin_in: state.identity.pin, k_in: "fase", v_in: v }); }

async function changeAthletePin() {
  if (state.identity?.kind !== "athlete") return;
  const oldPin = prompt("Senha atual:");
  if (!oldPin) return;
  const newPin = prompt("Nova senha (mín 4 caracteres):");
  if (!newPin || newPin.length < 4) { if (newPin) alert("Senha muito curta"); return; }
  const ok = await rpc("set_athlete_pin", { sid: state.identity.score_id, old_pin: oldPin, new_pin: newPin });
  if (ok === false) alert("Senha atual incorreta");
  else if (ok === true) {
    saveIdentity({ kind: "athlete", score_id: state.identity.score_id, pin: newPin });
    alert("Senha trocada!");
    render();
  }
}

// =============================================================
//                       DATA + REALTIME
// =============================================================
async function loadAll() {
  const [{ data: scores }, { data: config }] = await Promise.all([
    supabase.from("scores").select("id, nome, pontos, moedas, ordem, updated_at, pin_hash"),
    supabase.from("config").select("k, v"),
  ]);
  state.scores = scores || [];
  if (config) for (const c of config) if (c.k !== "master_pin_hash") state.config[c.k] = c.v;
  render();
}

function subscribeRealtime() {
  supabase
    .channel("pl-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, loadAll)
    .on("postgres_changes", { event: "*", schema: "public", table: "config" }, loadAll)
    .subscribe();
}

// =============================================================
//                          BOOT
// =============================================================
function bindEvents() {
  els.key.addEventListener("click", openLogin);
  els.loginForm.addEventListener("submit", handleLogin);
  els.loginCancel.addEventListener("click", closeLogin);
  els.loginOverlay.addEventListener("click", (e) => { if (e.target === els.loginOverlay) closeLogin(); });

  els.oculto.addEventListener("change", (e) => setOculto(e.target.checked));
  els.faseSave.addEventListener("click", () => setFase(els.faseInput.value.trim() || "—"));
  els.add.addEventListener("click", addAtleta);
  els.reset.addEventListener("click", resetAll);

  els.adminList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const row = e.target.closest(".pl-admin-row");
    adminAct(row.dataset.id, btn.dataset.act);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.loginOverlay.classList.contains("open")) closeLogin();
  });
}

async function boot() {
  bindEvents();
  await loadAll();
  subscribeRealtime();
}

boot();
