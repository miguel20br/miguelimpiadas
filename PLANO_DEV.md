# Miguelimpíadas — Estado do Projeto

> Atualizado em **15/05/2026** (véspera do evento).
> Plano original (Firebase + GitHub Pages) substituído pelo que foi efetivamente implementado.

---

## Status: PRONTO ✅

Tudo no ar, testado, deployado. Evento dia **16/05/2026 às 14h** (Casa do Peppa — Karaíba).

---

## URLs em produção

| URL | O quê |
|---|---|
| `https://miguelimpiadas.vercel.app/` | Guia do Atleta (index.html) |
| `https://miguelimpiadas.vercel.app/placar` | Placar ao vivo (Supabase Realtime) |
| `https://miguelimpiadas.vercel.app/print/miguelimpiadas-mercado-lootbox.pdf` | 65 cartas: 36 Mercado + 29 Lootbox (8 págs A4) |
| `https://miguelimpiadas.vercel.app/print/miguelimpiadas-cartas-do-caos.pdf` | 25 Cartas do Caos (4 págs A4) |

---

## Stack

- **HTML/CSS/JS vanilla** (sem build step)
- **Vercel** — deploy contínuo de `main` (git push = deploy)
- **Supabase** — Postgres + Realtime + RLS pro placar
- **Playwright** (Python) — geração de PDFs e smoke tests

---

## Estrutura

```
miguelimpiadas/
├── index.html                  ← guia do atleta (rota /)
├── placar.html                 ← placar ao vivo (rota /placar)
├── vercel.json                 ← config + cache headers
├── assets/
│   ├── css/main.css            ← estilos do guia
│   ├── css/placar.css          ← estilos do placar
│   ├── js/main.js              ← lógica do guia (modal, manual, etc.)
│   ├── js/placar.js            ← cliente Supabase + UI do placar
│   └── img/                    ← 4 mascotes extraídas do HTML
├── print/
│   ├── miguelimpiadas-mercado-lootbox.pdf
│   └── miguelimpiadas-cartas-do-caos.pdf
├── supabase/
│   └── migrations/             ← schema + RLS + funções PIN auth
├── scripts/                    ← ferramentas locais (gitignored)
├── manual_operador_v7_0.md     ← manual privado (gitignored)
├── README.md
└── PLANO_DEV.md                ← este arquivo
```

---

## Como manter

### Mudar descrição/quantidade/piada de carta Mercado ou Lootbox
1. Editar a carta no `index.html` (procurar pelo nome via grep)
2. Se mudou quantidade: editar `QUANTITIES` dict em `scripts/gen_cards_pdf.py`
3. Rodar: `python scripts/gen_cards_pdf.py`
4. Conferir o PDF em `print/miguelimpiadas-mercado-lootbox.pdf`
5. `git add print/ index.html && git commit && git push`

### Mudar Carta do Caos
1. Editar `manual_operador_v7_0.md` na seção "Baralho de Cartas de Caos"
2. Editar a lista `CARDS` em `scripts/gen_caos_pdf.py` (não lê do manual automaticamente)
3. Rodar: `python scripts/gen_caos_pdf.py`
4. `git add print/ && git commit && git push`

### Adicionar atleta no placar (durante o evento)
1. Abrir `/placar` → 🔑 → Admin → senha `miguel`
2. **+ Atleta** → nome + senha pra ele
3. Atleta usa a senha em qualquer dispositivo dele e fica destacado

### Operação geral do placar durante o evento
- **+1/+5/−1/−5** pontos e moedas
- **🔑 (por linha)** — define/troca senha do atleta
- **Placar Oculto** — esconde pontos pra todos (mostra só ranking)
- **Fase atual** — texto que aparece no topo (ex: "Round 3 — Quizzes")
- **Resetar tudo** — zera pontos pra 0 e moedas pra 3 (mantém atletas)

---

## Supabase

- Projeto: **miguelimpiadas** (`honpawztvfdplieezuko`, região `sa-east-1`)
- Tabelas: `scores`, `config`
- Master PIN definido: **`miguel`**
- RLS: leitura pública, escrita só via SECURITY DEFINER RPCs com bcrypt
- Migrations versionadas em `supabase/migrations/`

---

## Scripts em `scripts/` (gitignored, descartáveis)

| Script | O quê |
|---|---|
| `gen_cards_pdf.py` | Gera `miguelimpiadas-mercado-lootbox.pdf` |
| `gen_caos_pdf.py` | Gera `miguelimpiadas-cartas-do-caos.pdf` |
| `preview_cards_pages.py` | Screenshot página por página do Mercado/Lootbox |
| `preview_caos_pages.py` | Mesma coisa pro Caos |
| `mobile_audit.py` | Auditoria responsiva via Playwright |
| `smoke.py`, `smoke_placar_page.py`, `smoke_admin_pin.py` | Smoke tests do site |

Pra rodar: `python scripts/<script>.py` (precisa Playwright instalado).

---

## Notas finais

- Master PIN do admin é client-side simples (`"miguel"`), suficiente pra evento de 1 dia
- Atletas se autenticam com PIN próprio que escolhem na 1ª vez
- Bcrypt cost 8 no Postgres — PINs nunca trafegam em claro depois do submit
- 90 cartas físicas totais (36+29+25) prontas em 12 páginas A4 com marcas de corte
- Imprimir com "Cores e imagens de fundo" ativado nas configs da impressora
