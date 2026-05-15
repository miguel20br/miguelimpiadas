// scoreboard.js — placar ao vivo via Supabase Realtime
// Substitui o `firebaseConfig` do PLANO_DEV.md original.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// PREENCHIDO automaticamente após `create_project` + `get_publishable_keys`
const SUPABASE_URL  = "https://honpawztvfdplieezuko.supabase.co";
const SUPABASE_KEY  = "sb_publishable_AUpuKM4YSxGUd2INXhshhg_M7wjjGWN";

// =============================================================
//                          CLIENT
// =============================================================
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 5 } },
});

// =============================================================
//                          STATE
// =============================================================
const state = {
  scores: /** @type {Array<{id:string,nome:string,pontos:number,moedas:number,ordem:number}>} */ ([]),
  config: { placar_oculto: false, fase: "Aguardando início" },
  isAdmin: false,
};

// =============================================================
//                            UI
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

.sb-head{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.sb-title{font-family:'Boogaloo',sans-serif;font-size:1.6rem;color:var(--ink,#080f1f);flex:1;line-height:1}
.sb-icon-btn{background:transparent;border:2px solid var(--ink,#080f1f);border-radius:10px;
  width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;
  cursor:pointer;font-size:1.1rem;min-width:44px;min-height:44px}
.sb-fase{font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:var(--muted,#6070a0);margin-bottom:16px}
.sb-fase b{color:var(--blue,#1a6cff)}

.sb-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.sb-row{display:grid;grid-template-columns:36px 1fr auto auto;gap:12px;align-items:center;
  padding:12px 14px;background:#fff;border:2px solid var(--border,rgba(8,15,31,.1));border-radius:12px}
.sb-row.podio{border-color:var(--blue,#1a6cff);box-shadow:3px 3px 0 var(--blue,#1a6cff)}
.sb-pos{font-family:'Boogaloo',sans-serif;font-size:1.5rem;color:var(--ink,#080f1f);line-height:1;text-align:center}
.sb-nome{font-family:'Boogaloo',sans-serif;font-size:1.15rem;color:var(--ink,#080f1f);line-height:1.1;min-width:0;word-break:break-word}
.sb-pontos{font-family:'Space Grotesk',sans-serif;font-weight:800;font-size:1.2rem;color:var(--blue,#1a6cff)}
.sb-moedas{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:.85rem;color:var(--muted,#6070a0)}
.sb-oculto .sb-pontos,.sb-oculto .sb-moedas{visibility:hidden}

.sb-admin{border-top:2px dashed var(--border,rgba(8,15,31,.1));margin-top:18px;padding-top:16px}
.sb-admin h3{font-family:'Boogaloo',sans-serif;font-size:1.1rem;color:var(--ink,#080f1f);margin-bottom:10px}
.sb-admin-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;
  padding:8px 10px;background:rgba(26,108,255,.04);border-radius:10px;margin-bottom:6px}
.sb-admin-nome{font-family:'Boogaloo',sans-serif;font-size:1rem}
.sb-admin-ctrls{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
.sb-admin-ctrls button{min-width:36px;min-height:36px;padding:6px 8px;font-size:.85rem;font-weight:700;
  background:#fff;border:2px solid var(--ink,#080f1f);border-radius:8px;cursor:pointer;font-family:'Space Grotesk',sans-serif}
.sb-admin-ctrls .val{font-weight:800;padding:0 6px;min-width:30px;text-align:center;background:transparent;border:none}
.sb-admin-global{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;align-items:center}
.sb-admin-global input,.sb-admin-global button,.sb-admin-global label{font-family:'Space Grotesk',sans-serif;font-size:.85rem}
.sb-admin-global input[type=text]{flex:1;min-width:160px;padding:8px 10px;border:2px solid var(--ink,#080f1f);border-radius:8px}
.sb-admin-global button{padding:8px 14px;border:2px solid var(--ink,#080f1f);background:var(--ink,#080f1f);color:#fff;border-radius:8px;cursor:pointer;font-weight:700}
.sb-admin-global label{display:inline-flex;align-items:center;gap:6px;font-weight:700}
.sb-empty{text-align:center;padding:24px;color:var(--muted,#6070a0);font-style:italic}
`;

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
        <button class="sb-icon-btn" id="sb-key" aria-label="Modo admin" title="Modo admin">🔑</button>
        <button class="sb-icon-btn" id="sb-close" aria-label="Fechar">✕</button>
      </div>
      <div class="sb-fase">Fase: <b id="sb-fase">—</b></div>
      <ol class="sb-list" id="sb-list"></ol>
      <section class="sb-admin" id="sb-admin" hidden>
        <h3>Admin</h3>
        <div id="sb-admin-list"></div>
        <div class="sb-admin-global">
          <label><input type="checkbox" id="sb-oculto"> Placar oculto</label>
          <input type="text" id="sb-fase-input" placeholder="Fase atual (ex: Round 3)">
          <button id="sb-fase-save">Salvar fase</button>
          <button id="sb-add" style="background:var(--blue,#1a6cff)">+ Atleta</button>
          <button id="sb-reset" style="background:var(--red,#c8201a)">Resetar tudo</button>
          <button id="sb-logout" style="background:var(--muted,#6070a0)">Sair</button>
        </div>
      </section>
    </aside>
  `,
  );
}

// =============================================================
//                          OPEN/CLOSE
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
  const sheet = document.getElementById("sb-sheet");
  const backdrop = document.getElementById("sb-backdrop");
  sheet.classList.remove("open");
  backdrop.classList.remove("open");
  setTimeout(() => (sheet.hidden = true), 250);
}

// =============================================================
//                          RENDER
// =============================================================
function render() {
  document.getElementById("sb-fase").textContent = state.config.fase;
  const list = document.getElementById("sb-list");
  const hidden = state.config.placar_oculto;
  if (!state.scores.length) {
    list.innerHTML = '<li class="sb-empty">Sem atletas cadastrados ainda. Clique em 🔑 e adicione.</li>';
  } else {
    const sorted = [...state.scores].sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem);
    list.innerHTML = sorted
      .map((s, i) => {
        const medal = i === 0 ? " 🥇" : i === 1 ? " 🥈" : i === 2 ? " 🥉" : "";
        return `<li class="sb-row${i < 3 ? " podio" : ""}${hidden ? " sb-oculto" : ""}">
          <span class="sb-pos">${i + 1}</span>
          <span class="sb-nome">${escapeHtml(s.nome)}${medal}</span>
          <span class="sb-pontos">${s.pontos} MPTS</span>
          <span class="sb-moedas">${s.moedas}🪙</span>
        </li>`;
      })
      .join("");
  }

  // Admin
  const adminEl = document.getElementById("sb-admin");
  adminEl.hidden = !state.isAdmin;
  if (state.isAdmin) renderAdmin();
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
        <button data-act="del" title="Remover">🗑</button>
      </span>
    </div>`,
    )
    .join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// =============================================================
//                        ADMIN ACTIONS
// =============================================================
async function applyAdminAct(id, act) {
  const s = state.scores.find((x) => x.id === id);
  if (!s) return;
  const patch = {};
  if (act === "p+1") patch.pontos = s.pontos + 1;
  else if (act === "p-1") patch.pontos = s.pontos - 1;
  else if (act === "p+5") patch.pontos = s.pontos + 5;
  else if (act === "p-5") patch.pontos = s.pontos - 5;
  else if (act === "m+1") patch.moedas = s.moedas + 1;
  else if (act === "m-1") patch.moedas = Math.max(0, s.moedas - 1);
  else if (act === "del") {
    if (!confirm(`Remover ${s.nome}?`)) return;
    await supabase.from("scores").delete().eq("id", id);
    return;
  }
  await supabase.from("scores").update(patch).eq("id", id);
}

async function addAtleta() {
  const nome = prompt("Nome do atleta:");
  if (!nome) return;
  const ordem = state.scores.length;
  await supabase.from("scores").insert({ nome: nome.trim(), pontos: 0, moedas: 3, ordem });
}

async function resetAll() {
  if (!confirm("Resetar TODOS os atletas para 0 pontos e 3 moedas?")) return;
  await supabase.from("scores").update({ pontos: 0, moedas: 3 }).gte("ordem", -1);
}

async function setOculto(v) {
  await supabase.from("config").update({ v: JSON.stringify(v) }).eq("k", "placar_oculto");
}
async function setFase(v) {
  await supabase.from("config").update({ v: JSON.stringify(v) }).eq("k", "fase");
}

// =============================================================
//                          AUTH
// =============================================================
async function loginAdmin() {
  const email = prompt("Email do admin (vai receber link mágico):");
  if (!email) return;
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: location.href },
  });
  if (error) alert("Erro: " + error.message);
  else alert("Link enviado! Cheque o email e clique. Você voltará aqui logado.");
}
async function logout() {
  await supabase.auth.signOut();
}

// =============================================================
//                       DATA LOADING
// =============================================================
async function loadAll() {
  const [{ data: scores }, { data: config }] = await Promise.all([
    supabase.from("scores").select("*"),
    supabase.from("config").select("*"),
  ]);
  state.scores = scores || [];
  if (config) {
    for (const c of config) state.config[c.k] = c.v;
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
async function boot() {
  if (SUPABASE_URL.startsWith("__") || SUPABASE_KEY.startsWith("__")) {
    console.warn("[scoreboard] Supabase config não preenchida — placeholder ativo");
    return;
  }
  injectUI();

  document.getElementById("sb-fab").addEventListener("click", openSheet);
  document.getElementById("sb-close").addEventListener("click", closeSheet);
  document.getElementById("sb-backdrop").addEventListener("click", closeSheet);
  document.getElementById("sb-key").addEventListener("click", () => {
    state.isAdmin ? logout() : loginAdmin();
  });
  document.getElementById("sb-oculto").addEventListener("change", (e) => setOculto(e.target.checked));
  document.getElementById("sb-fase-save").addEventListener("click", () => {
    setFase(document.getElementById("sb-fase-input").value.trim() || "—");
  });
  document.getElementById("sb-add").addEventListener("click", addAtleta);
  document.getElementById("sb-reset").addEventListener("click", resetAll);
  document.getElementById("sb-logout").addEventListener("click", logout);

  document.getElementById("sb-admin-list").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const row = e.target.closest(".sb-admin-row");
    applyAdminAct(row.dataset.id, btn.dataset.act);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.getElementById("sb-sheet").hidden) closeSheet();
  });

  supabase.auth.onAuthStateChange((_evt, session) => {
    state.isAdmin = !!session?.user;
    render();
  });
  const { data } = await supabase.auth.getSession();
  state.isAdmin = !!data?.session?.user;

  await loadAll();
  subscribeRealtime();
}

boot();
