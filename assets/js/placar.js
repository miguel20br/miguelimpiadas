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
  adminSearch: $("pl-admin-search"),
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
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
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

// Map<id, { el, lastPontos, lastMoedas }> pra reusar elementos e detectar mudanças
const rowMap = new Map();

function flashCell(el, isUp) {
  if (!el) return;
  el.classList.remove("pl-flash-up", "pl-flash-down");
  // force reflow pra restart animation
  void el.offsetWidth;
  el.classList.add(isUp ? "pl-flash-up" : "pl-flash-down");
  setTimeout(() => el.classList.remove("pl-flash-up", "pl-flash-down"), 1000);
}

function renderList() {
  const hidden = state.config.placar_oculto;
  const isAdmin = state.identity?.kind === "admin";
  const showHidden = hidden && !isAdmin;
  const meId = state.identity?.kind === "athlete" ? state.identity.score_id : null;

  if (!state.scores.length) {
    els.list.innerHTML = `<li class="pl-empty">Sem atletas cadastrados ainda.<small>Miguel: clique 🔑, faça login, e use o painel admin pra cadastrar.</small></li>`;
    rowMap.clear();
    return;
  }

  // Quando oculto: alfabético. Visível: pontos desc, desempate alfabético
  const sorted = showHidden
    ? [...state.scores].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    : [...state.scores].sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome, "pt-BR"));

  // FLIP step 1 — capturar posições atuais
  const oldRects = new Map();
  for (const [id, entry] of rowMap) oldRects.set(id, entry.el.getBoundingClientRect());

  // Remove rows de atletas que sumiram (deletados)
  const currentIds = new Set(sorted.map((s) => s.id));
  for (const [id, entry] of rowMap) {
    if (!currentIds.has(id)) {
      entry.el.remove();
      rowMap.delete(id);
    }
  }

  // Se havia placeholder ".pl-empty", limpa
  if (els.list.querySelector(".pl-empty")) els.list.innerHTML = "";

  // Update / create rows na ordem final
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const me = s.id === meId;
    const medal = !showHidden && i === 0 ? "🥇" : !showHidden && i === 1 ? "🥈" : !showHidden && i === 2 ? "🥉" : "";
    const posCell = showHidden ? "?" : i + 1;
    const pontosCell = showHidden
      ? `?<span class="pl-unit">MPTS</span>`
      : `${s.pontos}<span class="pl-unit">MPTS</span>`;

    let entry = rowMap.get(s.id);
    if (!entry) {
      const li = document.createElement("li");
      li.dataset.id = s.id;
      entry = { el: li, lastPontos: s.pontos, lastMoedas: s.moedas };
      rowMap.set(s.id, entry);
      els.list.appendChild(li);
    }
    const li = entry.el;
    li.className = ["pl-row",
                    !showHidden && i < 3 && "podio",
                    showHidden && "oculto",
                    me && "me"].filter(Boolean).join(" ");
    li.innerHTML = `
      <span class="pl-pos">${posCell}</span>
      <span class="pl-nome">${escapeHtml(s.nome)} ${medal}${me ? '<span class="pl-me-tag">você</span>' : ""}</span>
      <span class="pl-pontos">${pontosCell}</span>
      <span class="pl-moedas">${s.moedas}🪙</span>
    `;

    // Reorder no DOM se necessário
    const currentChild = els.list.children[i];
    if (currentChild !== li) els.list.insertBefore(li, currentChild || null);

    // Flash se pontos/moedas mudaram
    if (entry.lastPontos !== s.pontos) {
      flashCell(li.querySelector(".pl-pontos"), s.pontos > entry.lastPontos);
      entry.lastPontos = s.pontos;
    }
    if (entry.lastMoedas !== s.moedas) {
      flashCell(li.querySelector(".pl-moedas"), s.moedas > entry.lastMoedas);
      entry.lastMoedas = s.moedas;
    }
  }

  // FLIP step 2 — animar transições
  requestAnimationFrame(() => {
    for (const [id, oldRect] of oldRects) {
      const entry = rowMap.get(id);
      if (!entry) continue;
      const newRect = entry.el.getBoundingClientRect();
      const dy = oldRect.top - newRect.top;
      if (Math.abs(dy) > 1) {
        entry.el.style.transition = "none";
        entry.el.style.transform = `translateY(${dy}px)`;
        void entry.el.offsetHeight;
        requestAnimationFrame(() => {
          entry.el.style.transition = "transform .5s cubic-bezier(.34,1.56,.64,1)";
          entry.el.style.transform = "translateY(0)";
        });
      }
    }
  });
}

function applyAdminFilter() {
  const q = (els.adminSearch?.value || "").toLowerCase().trim();
  document.querySelectorAll(".pl-admin-row").forEach((row) => {
    const nome = row.querySelector(".pl-admin-nome")?.textContent.toLowerCase() || "";
    row.classList.toggle("filtered-out", q && !nome.includes(q));
  });
}

function renderAdmin() {
  els.oculto.checked = !!state.config.placar_oculto;
  // Não sobrescreve se admin está digitando na fase
  if (document.activeElement !== els.faseInput) {
    els.faseInput.value = state.config.fase || "";
  }
  if (!state.scores.length) {
    els.adminList.innerHTML = `<div class="pl-empty" style="background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.7)">Nenhum atleta. Use <b>+ Atleta</b> abaixo pra começar.</div>`;
    return;
  }
  els.adminList.innerHTML = [...state.scores]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
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
  applyAdminFilter();  // mantém filtro depois de re-render via realtime
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

  els.adminSearch.addEventListener("input", applyAdminFilter);

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
