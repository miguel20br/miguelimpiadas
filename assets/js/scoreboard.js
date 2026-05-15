// scoreboard.js — placar ao vivo via Supabase + PIN auth
// - leitura pública (sem login)
// - 🔑 Miguel: digita master PIN → modo admin completo
// - 🔑 atleta: escolhe seu nome → digita PIN próprio → seu nome fica destacado

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://honpawztvfdplieezuko.supabase.co";
const SUPABASE_KEY = "sb_publishable_AUpuKM4YSxGUd2INXhshhg_M7wjjGWN";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 5 } },
});

// =============================================================
//                         STATE
// =============================================================
const LS_KEY = "miguelimpiadas.identity";

/** identity: { kind: 'admin', pin } | { kind: 'athlete', score_id, pin } | null */
const state = {
  scores: [],
  config: { placar_oculto: false, fase: "Aguardando início" },
  identity: loadIdentity(),
};

function loadIdentity() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || null;
  } catch {
    return null;
  }
}
function saveIdentity(id) {
  state.identity = id;
  if (id) localStorage.setItem(LS_KEY, JSON.stringify(id));
  else localStorage.removeItem(LS_KEY);
}

// =============================================================
//                         STYLES
// =============================================================
const css = `
.sb-fab{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(16px,calc(16px + env(safe-area-inset-bottom)));z-index:900;
  background:var(--blue,#1a6cff);color:#fff;border:3px solid var(--ink,#080f1f);border-radius:99px;
  padding:14px 22px;font-family:'Boogaloo',sans-serif;font-size:1.1rem;letter-spacing:.02em;
  cursor:pointer;box-shadow:4px 4px 0 var(--ink,#080f1f);min-height:48px;
  transition:transform .15s cubic-bezier(.34,1.56,.64,1)}
.sb-fab:hover{transform:translate(-2px,-2px)}
.sb-fab[hidden]{display:none}

.sb-backdrop{position:fixed;inset:0;background:rgba(8,15,31,.6);backdrop-filter:blur(6px);
  z-index:999;opacity:0;pointer-events:none;transition:opacity .2s}
.sb-backdrop.open{opacity:1;pointer-events:auto}

.sb-sheet{position:fixed;left:0;right:0;bottom:0;z-index:1000;
  background:var(--paper,#f8faff);border-top:3px solid var(--ink,#080f1f);
  border-radius:20px 20px 0 0;
  max-height:85vh;overflow-y:auto;overscroll-behavior:contain;
  padding:24px 20px max(20px,calc(20px + env(safe-area-inset-bottom)));
  transform:translateY(100%);transition:transform .25s cubic-bezier(.16,1,.3,1);
  box-shadow:0 -8px 32px rgba(8,15,31,.2)}
.sb-sheet.open{transform:translateY(0)}

.sb-head{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.sb-title{font-family:'Boogaloo',sans-serif;font-size:1.6rem;color:var(--ink,#080f1f);flex:1;line-height:1}
.sb-icon-btn{background:transparent;border:2px solid var(--ink,#080f1f);border-radius:10px;
  width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;
  cursor:pointer;font-size:1.1rem;min-width:44px;min-height:44px}
.sb-icon-btn.active{background:var(--blue,#1a6cff);color:#fff;border-color:var(--blue,#1a6cff)}

.sb-fase{font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:var(--muted,#6070a0);margin-bottom:16px}
.sb-fase b{color:var(--blue,#1a6cff)}

.sb-me-banner{background:rgba(26,108,255,.08);border:2px solid var(--blue,#1a6cff);border-radius:10px;
  padding:8px 12px;margin-bottom:14px;font-family:'Space Grotesk',sans-serif;font-size:.85rem;font-weight:700;
  display:flex;align-items:center;justify-content:space-between;gap:8px}
.sb-me-banner b{color:var(--blue,#1a6cff)}
.sb-link-btn{background:none;border:none;color:var(--blue,#1a6cff);text-decoration:underline;cursor:pointer;
  font-family:inherit;font-size:inherit;font-weight:700;padding:0}

.sb-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.sb-row{display:grid;grid-template-columns:36px 1fr auto auto;gap:12px;align-items:center;
  padding:12px 14px;background:#fff;border:2px solid var(--border,rgba(8,15,31,.1));border-radius:12px;
  transition:transform .15s,box-shadow .15s}
.sb-row.podio{border-color:var(--blue,#1a6cff);box-shadow:3px 3px 0 var(--blue,#1a6cff)}
.sb-row.me{border-color:var(--cyan,#00d4ff);background:linear-gradient(135deg,rgba(0,212,255,.12),rgba(26,108,255,.04));
  box-shadow:4px 4px 0 var(--cyan,#00d4ff);transform:translate(-1px,-1px)}
.sb-row.me .sb-pos{color:var(--cyan,#00d4ff)}
.sb-me-tag{display:inline-block;font-family:'Space Grotesk',sans-serif;font-size:9px;font-weight:800;
  letter-spacing:.12em;text-transform:uppercase;color:#fff;background:var(--cyan,#00d4ff);
  padding:2px 6px;border-radius:4px;margin-left:6px;vertical-align:2px}
.sb-pos{font-family:'Boogaloo',sans-serif;font-size:1.5rem;color:var(--ink,#080f1f);line-height:1;text-align:center}
.sb-nome{font-family:'Boogaloo',sans-serif;font-size:1.15rem;color:var(--ink,#080f1f);line-height:1.1;min-width:0;word-break:break-word}
.sb-pontos{font-family:'Space Grotesk',sans-serif;font-weight:800;font-size:1.2rem;color:var(--blue,#1a6cff);white-space:nowrap}
.sb-moedas{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:.85rem;color:var(--muted,#6070a0);white-space:nowrap}
.sb-oculto .sb-pontos,.sb-oculto .sb-moedas{visibility:hidden}
.sb-empty{text-align:center;padding:24px;color:var(--muted,#6070a0);font-style:italic}

/* Admin */
.sb-admin{border-top:2px dashed var(--border,rgba(8,15,31,.1));margin-top:18px;padding-top:16px}
.sb-admin h3{font-family:'Boogaloo',sans-serif;font-size:1.1rem;color:var(--ink,#080f1f);margin-bottom:10px}
.sb-admin-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;
  padding:10px 12px;background:rgba(26,108,255,.04);border-radius:10px;margin-bottom:6px}
.sb-admin-nome{font-family:'Boogaloo',sans-serif;font-size:1.05rem}
.sb-admin-ctrls{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;align-items:center}
.sb-admin-ctrls button{min-width:38px;min-height:38px;padding:6px 8px;font-size:.85rem;font-weight:700;
  background:#fff;border:2px solid var(--ink,#080f1f);border-radius:8px;cursor:pointer;
  font-family:'Space Grotesk',sans-serif}
.sb-admin-ctrls .val{font-weight:800;padding:0 6px;min-width:30px;text-align:center;border:none;background:none}
.sb-admin-global{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;align-items:center}
.sb-admin-global input[type=text]{flex:1;min-width:160px;padding:10px 12px;border:2px solid var(--ink,#080f1f);
  border-radius:8px;font-family:'Space Grotesk',sans-serif;font-size:.9rem;min-height:44px}
.sb-admin-global button{padding:10px 14px;border:2px solid var(--ink,#080f1f);background:var(--ink,#080f1f);color:#fff;
  border-radius:8px;cursor:pointer;font-weight:700;font-family:'Space Grotesk',sans-serif;min-height:44px}
.sb-admin-global label{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-family:'Space Grotesk',sans-serif;font-size:.9rem}
.sb-admin-global input[type=checkbox]{width:20px;height:20px;cursor:pointer}

/* Login modal */
.sb-login-overlay{position:fixed;inset:0;background:rgba(8,15,31,.7);backdrop-filter:blur(8px);
  z-index:1100;display:flex;align-items:center;justify-content:center;padding:20px;
  padding-bottom:max(20px,calc(20px + env(safe-area-inset-bottom)));
  opacity:0;pointer-events:none;transition:opacity .2s}
.sb-login-overlay.open{opacity:1;pointer-events:auto}
.sb-login{background:var(--paper,#f8faff);border:3px solid var(--ink,#080f1f);border-radius:18px;
  padding:24px 22px;max-width:380px;width:100%;box-shadow:6px 6px 0 var(--ink,#080f1f)}
.sb-login h2{font-family:'Boogaloo',sans-serif;font-size:1.5rem;color:var(--ink,#080f1f);margin-bottom:6px}
.sb-login p{font-size:.85rem;color:var(--muted,#6070a0);margin-bottom:18px;line-height:1.4}
.sb-login label{display:block;font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;
  letter-spacing:.12em;text-transform:uppercase;color:var(--muted,#6070a0);margin:12px 0 6px}
.sb-login select,.sb-login input{width:100%;padding:12px 14px;border:2px solid var(--ink,#080f1f);
  border-radius:10px;font-family:'Space Grotesk',sans-serif;font-size:1rem;background:#fff;min-height:44px}
.sb-login select:focus,.sb-login input:focus{outline:none;border-color:var(--blue,#1a6cff)}
.sb-login-err{color:var(--red,#c8201a);font-size:.85rem;font-weight:700;margin-top:8px;min-height:1.2em}
.sb-login-actions{display:flex;gap:8px;margin-top:18px}
.sb-login-actions button{flex:1;padding:12px;border-radius:10px;font-family:'Space Grotesk',sans-serif;
  font-weight:700;cursor:pointer;font-size:.9rem;min-height:44px;border:2px solid var(--ink,#080f1f)}
.sb-login-actions .primary{background:var(--blue,#1a6cff);color:#fff;border-color:var(--blue,#1a6cff)}
.sb-login-actions .secondary{background:transparent;color:var(--ink,#080f1f)}
.sb-login-hint{font-size:.78rem;color:var(--muted,#6070a0);margin-top:10px;line-height:1.4}
`;

// =============================================================
//                          UI INJECTION
// =============================================================
function injectUI() {
  document.head.appendChild(Object.assign(document.createElement("style"), { textContent: css }));

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <button class="sb-fab" id="sb-fab" aria-label="Abrir placar ao vivo">📊 Ver Tabela</button>
    <div class="sb-backdrop" id="sb-backdrop"></div>

    <aside class="sb-sheet" id="sb-sheet" role="dialog" aria-labelledby="sb-title" aria-modal="true" hidden>
      <div class="sb-head">
        <span class="sb-title" id="sb-title">📊 Placar ao vivo</span>
        <button class="sb-icon-btn" id="sb-key" aria-label="Entrar com PIN">🔑</button>
        <button class="sb-icon-btn" id="sb-close" aria-label="Fechar">✕</button>
      </div>
      <div class="sb-fase">Fase: <b id="sb-fase">—</b></div>
      <div class="sb-me-banner" id="sb-me-banner" hidden></div>
      <ol class="sb-list" id="sb-list"></ol>
      <section class="sb-admin" id="sb-admin" hidden>
        <h3>Painel Admin</h3>
        <div id="sb-admin-list"></div>
        <div class="sb-admin-global">
          <label><input type="checkbox" id="sb-oculto"> Placar oculto</label>
          <input type="text" id="sb-fase-input" placeholder="Fase atual (ex: Round 3)">
          <button id="sb-fase-save">Salvar fase</button>
          <button id="sb-add" style="background:var(--blue,#1a6cff);border-color:var(--blue,#1a6cff)">+ Atleta</button>
          <button id="sb-reset" style="background:var(--red,#c8201a);border-color:var(--red,#c8201a)">Resetar tudo</button>
        </div>
      </section>
    </aside>

    <div class="sb-login-overlay" id="sb-login-overlay" role="dialog" aria-modal="true" aria-labelledby="sb-login-title">
      <form class="sb-login" id="sb-login-form">
        <h2 id="sb-login-title">🔑 Quem é você?</h2>
        <p>Escolha sua identidade e digite sua senha. Se for sua 1ª vez, ela vira sua senha.</p>

        <label for="sb-login-who">Identidade</label>
        <select id="sb-login-who" required>
          <option value="admin">👑 Admin (Miguel)</option>
        </select>

        <label for="sb-login-pin">Senha</label>
        <input id="sb-login-pin" type="password" inputmode="numeric" autocomplete="off" required minlength="4" placeholder="Mínimo 4 caracteres">

        <div class="sb-login-err" id="sb-login-err"></div>
        <div class="sb-login-hint" id="sb-login-hint"></div>

        <div class="sb-login-actions">
          <button type="button" class="secondary" id="sb-login-cancel">Cancelar</button>
          <button type="submit" class="primary" id="sb-login-submit">Entrar</button>
        </div>
      </form>
    </div>
  `,
  );
}

// =============================================================
//                       OPEN / CLOSE
// =============================================================
function openSheet() {
  const sheet = document.getElementById("sb-sheet");
  const backdrop = document.getElementById("sb-backdrop");
  sheet.hidden = false;
  requestAnimationFrame(() => {
    sheet.classList.add("open");
    backdrop.classList.add("open");
  });
}
function closeSheet() {
  document.getElementById("sb-sheet").classList.remove("open");
  document.getElementById("sb-backdrop").classList.remove("open");
  setTimeout(() => (document.getElementById("sb-sheet").hidden = true), 250);
}

function openLogin() {
  document.getElementById("sb-login-overlay").classList.add("open");
  refreshLoginOptions();
  document.getElementById("sb-login-pin").value = "";
  document.getElementById("sb-login-err").textContent = "";
  setTimeout(() => document.getElementById("sb-login-pin").focus(), 100);
}
function closeLogin() {
  document.getElementById("sb-login-overlay").classList.remove("open");
}

// =============================================================
//                          RENDER
// =============================================================
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function refreshLoginOptions() {
  const sel = document.getElementById("sb-login-who");
  const cur = sel.value;
  sel.innerHTML =
    `<option value="admin">👑 Admin (Miguel)</option>` +
    state.scores
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((s) => `<option value="athlete:${s.id}">🏃 ${escapeHtml(s.nome)}</option>`)
      .join("");
  if (cur && sel.querySelector(`option[value="${cur}"]`)) sel.value = cur;
}

function renderMeBanner() {
  const banner = document.getElementById("sb-me-banner");
  if (!state.identity) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  if (state.identity.kind === "admin") {
    banner.innerHTML = `Logado como <b>👑 Admin (Miguel)</b> <button class="sb-link-btn" id="sb-logout">sair</button>`;
  } else {
    const me = state.scores.find((s) => s.id === state.identity.score_id);
    const nome = me ? me.nome : "(atleta removido)";
    banner.innerHTML = `Você é <b>${escapeHtml(nome)}</b> · <button class="sb-link-btn" id="sb-change-pin">trocar senha</button> · <button class="sb-link-btn" id="sb-logout">sair</button>`;
  }
  document.getElementById("sb-logout").onclick = () => {
    saveIdentity(null);
    render();
  };
  const changePinBtn = document.getElementById("sb-change-pin");
  if (changePinBtn) changePinBtn.onclick = changeAthletePin;
}

function render() {
  // Key button reflects identity state
  const keyBtn = document.getElementById("sb-key");
  if (keyBtn) keyBtn.classList.toggle("active", !!state.identity);
  if (keyBtn) keyBtn.textContent = state.identity ? "🔓" : "🔑";

  document.getElementById("sb-fase").textContent = state.config.fase;
  renderMeBanner();

  const list = document.getElementById("sb-list");
  const hidden = state.config.placar_oculto;
  const meId = state.identity?.kind === "athlete" ? state.identity.score_id : null;

  if (!state.scores.length) {
    list.innerHTML =
      '<li class="sb-empty">Sem atletas cadastrados ainda.<br><small>Miguel: clique 🔑 e use o painel admin.</small></li>';
  } else {
    const sorted = [...state.scores].sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem);
    list.innerHTML = sorted
      .map((s, i) => {
        const medal = i === 0 ? " 🥇" : i === 1 ? " 🥈" : i === 2 ? " 🥉" : "";
        const me = s.id === meId;
        const cls = ["sb-row", i < 3 && "podio", hidden && "sb-oculto", me && "me"].filter(Boolean).join(" ");
        return `<li class="${cls}">
          <span class="sb-pos">${i + 1}</span>
          <span class="sb-nome">${escapeHtml(s.nome)}${medal}${me ? '<span class="sb-me-tag">você</span>' : ""}</span>
          <span class="sb-pontos">${s.pontos} MPTS</span>
          <span class="sb-moedas">${s.moedas}🪙</span>
        </li>`;
      })
      .join("");
  }

  const adminEl = document.getElementById("sb-admin");
  const isAdmin = state.identity?.kind === "admin";
  adminEl.hidden = !isAdmin;
  if (isAdmin) renderAdmin();
}

function renderAdmin() {
  document.getElementById("sb-oculto").checked = !!state.config.placar_oculto;
  document.getElementById("sb-fase-input").value = state.config.fase || "";
  const wrap = document.getElementById("sb-admin-list");
  if (!state.scores.length) {
    wrap.innerHTML = '<div class="sb-empty">Adicione o 1º atleta abaixo →</div>';
    return;
  }
  wrap.innerHTML = [...state.scores]
    .sort((a, b) => a.ordem - b.ordem)
    .map(
      (s) => `
    <div class="sb-admin-row" data-id="${s.id}">
      <span class="sb-admin-nome">${escapeHtml(s.nome)}</span>
      <span class="sb-admin-ctrls">
        <button data-act="p-5">−5</button>
        <button data-act="p-1">−1</button>
        <span class="val">${s.pontos}</span>
        <button data-act="p+1">+1</button>
        <button data-act="p+5">+5</button>
        <button data-act="m-1">−1🪙</button>
        <span class="val">${s.moedas}</span>
        <button data-act="m+1">+1🪙</button>
        <button data-act="del" title="Remover" style="background:var(--red,#c8201a);color:#fff;border-color:var(--red,#c8201a)">🗑</button>
      </span>
    </div>`,
    )
    .join("");
}

// =============================================================
//                       ADMIN ACTIONS (RPC)
// =============================================================
async function adminAct(id, act) {
  const s = state.scores.find((x) => x.id === id);
  if (!s || state.identity?.kind !== "admin") return;
  if (act === "del") {
    if (!confirm(`Remover ${s.nome}?`)) return;
    await rpc("admin_delete_athlete", { pin_in: state.identity.pin, sid: id });
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
  await rpc("admin_add_athlete", { pin_in: state.identity.pin, nome_in: nome.trim() });
}
async function resetAll() {
  if (!confirm("Resetar TODOS os atletas para 0 pontos e 3 moedas?")) return;
  await rpc("admin_reset", { pin_in: state.identity.pin });
}
async function setOculto(v) {
  await rpc("admin_set_config", { pin_in: state.identity.pin, k_in: "placar_oculto", v_in: v });
}
async function setFase(v) {
  await rpc("admin_set_config", { pin_in: state.identity.pin, k_in: "fase", v_in: v });
}

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
//                       ATHLETE: TROCAR PIN
// =============================================================
async function changeAthletePin() {
  if (state.identity?.kind !== "athlete") return;
  const oldPin = prompt("Senha atual:");
  if (!oldPin) return;
  const newPin = prompt("Nova senha (mín 4 caracteres):");
  if (!newPin || newPin.length < 4) {
    if (newPin) alert("Senha muito curta");
    return;
  }
  const ok = await rpc("set_athlete_pin", { sid: state.identity.score_id, old_pin: oldPin, new_pin: newPin });
  if (ok === false) {
    alert("Senha atual incorreta");
  } else if (ok === true) {
    saveIdentity({ kind: "athlete", score_id: state.identity.score_id, pin: newPin });
    alert("Senha trocada!");
    render();
  }
}

// =============================================================
//                       LOGIN HANDLER
// =============================================================
async function handleLogin(e) {
  e.preventDefault();
  const who = document.getElementById("sb-login-who").value;
  const pin = document.getElementById("sb-login-pin").value;
  const errEl = document.getElementById("sb-login-err");
  errEl.textContent = "";

  if (pin.length < 4) {
    errEl.textContent = "Senha mínimo 4 caracteres";
    return;
  }

  if (who === "admin") {
    // Check if master_pin is set
    const { data: isSet } = await supabase.rpc("master_pin_is_set");
    if (!isSet) {
      // Claim: anyone setting first time becomes admin
      if (!confirm("Nenhum admin definido ainda. Essa senha vai ser a do Miguel. Confirma?")) return;
      const { data: ok, error } = await supabase.rpc("set_master_pin", { old_pin: null, new_pin: pin });
      if (error || !ok) {
        errEl.textContent = "Erro ao definir senha";
        return;
      }
    } else {
      // Validate
      const { data: ok } = await supabase.rpc("check_master", { pin_in: pin });
      if (!ok) {
        errEl.textContent = "Senha admin incorreta";
        return;
      }
    }
    saveIdentity({ kind: "admin", pin });
  } else if (who.startsWith("athlete:")) {
    const sid = who.slice(8);
    const { data: isSet } = await supabase.rpc("athlete_pin_is_set", { sid });
    if (!isSet) {
      const name = state.scores.find((s) => s.id === sid)?.nome;
      if (!confirm(`1ª vez de ${name}? Essa senha vai ser dele(a).`)) return;
      const { data: ok, error } = await supabase.rpc("set_athlete_pin", { sid, old_pin: null, new_pin: pin });
      if (error || !ok) {
        errEl.textContent = "Erro ao definir senha";
        return;
      }
    } else {
      const { data: ok } = await supabase.rpc("check_athlete", { sid, pin_in: pin });
      if (!ok) {
        errEl.textContent = "Senha incorreta";
        return;
      }
    }
    saveIdentity({ kind: "athlete", score_id: sid, pin });
  }

  closeLogin();
  render();
}

// =============================================================
//                       DATA LOAD + REALTIME
// =============================================================
async function loadAll() {
  const [{ data: scores }, { data: config }] = await Promise.all([
    supabase.from("scores").select("id, nome, pontos, moedas, ordem, updated_at"),
    supabase.from("config").select("k, v"),
  ]);
  state.scores = scores || [];
  if (config) {
    for (const c of config) {
      if (c.k === "master_pin_hash") continue;
      state.config[c.k] = c.v;
    }
  }
  render();
}

function subscribeRealtime() {
  supabase
    .channel("sb-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, loadAll)
    .on("postgres_changes", { event: "*", schema: "public", table: "config" }, loadAll)
    .subscribe();
}

// =============================================================
//                          BOOT
// =============================================================
function bindEvents() {
  document.getElementById("sb-fab").addEventListener("click", openSheet);
  document.getElementById("sb-close").addEventListener("click", closeSheet);
  document.getElementById("sb-backdrop").addEventListener("click", closeSheet);
  document.getElementById("sb-key").addEventListener("click", openLogin);

  document.getElementById("sb-login-form").addEventListener("submit", handleLogin);
  document.getElementById("sb-login-cancel").addEventListener("click", closeLogin);
  document.getElementById("sb-login-overlay").addEventListener("click", (e) => {
    if (e.target.id === "sb-login-overlay") closeLogin();
  });

  document.getElementById("sb-oculto").addEventListener("change", (e) => setOculto(e.target.checked));
  document.getElementById("sb-fase-save").addEventListener("click", () => {
    setFase(document.getElementById("sb-fase-input").value.trim() || "—");
  });
  document.getElementById("sb-add").addEventListener("click", addAtleta);
  document.getElementById("sb-reset").addEventListener("click", resetAll);

  document.getElementById("sb-admin-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const row = e.target.closest(".sb-admin-row");
    adminAct(row.dataset.id, btn.dataset.act);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (document.getElementById("sb-login-overlay").classList.contains("open")) closeLogin();
    else if (!document.getElementById("sb-sheet").hidden) closeSheet();
  });
}

async function boot() {
  if (SUPABASE_URL.startsWith("__") || SUPABASE_KEY.startsWith("__")) {
    console.warn("[scoreboard] Supabase config não preenchida");
    return;
  }
  injectUI();
  bindEvents();
  await loadAll();
  subscribeRealtime();
}

boot();
