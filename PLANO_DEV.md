# Plano de Desenvolvimento — Miguelimpíadas

> Salvo em 15/05/2026 para continuidade em outra máquina.

## Contexto

Site do evento Miguelimpíadas (16/05/2026 às 14h, Casa do Peppa — Karaíba).
`index.html` é o guia do atleta v7.0 (1.4MB, vanilla HTML/CSS/JS, tudo inline).

## O que falta construir

### 1. Separar CSS e JS do HTML

Extrair o `<style>` de `index.html` → `assets/css/main.css`  
Extrair o `<script>` de `index.html` → `assets/js/main.js`  
Referenciar os arquivos externos no HTML.

```
assets/
  css/main.css
  js/main.js
  js/scoreboard.js   ← novo
```

### 2. Scoreboard ao Vivo (Firebase Realtime Database)

**Requisitos:**
- Botão flutuante `📊 Ver Tabela` (fixo, canto inferior direito)
- Bottom sheet com ranking em tempo real
- Só Miguel pode editar (PIN secreto)
- Quando `placarOculto = true` → pontos sumem para todos

**Stack:**
- Firebase Realtime Database (sync <1s, gratuito)
- PIN client-side para admin (OK para evento de 1 dia)
- Sem backend, funciona no GitHub Pages

**Ação necessária de Miguel antes de implementar:**
1. Criar projeto em https://console.firebase.google.com
2. Ativar Realtime Database
3. Copiar `firebaseConfig` e colar em `assets/js/scoreboard.js`

**Estrutura dos dados no Firebase:**
```json
{
  "config": {
    "placarOculto": false,
    "fase": "Aguardando início"
  },
  "scores": {
    "jogador1": { "nome": "João",  "pontos": 0, "moedas": 3 },
    "jogador2": { "nome": "Pedro", "pontos": 0, "moedas": 3 }
  }
}
```

**UI do Scoreboard:**
```
┌──────────────────────────────────┐
│ 📊 PLACAR AO VIVO          🔑  ✕ │
├──────────────────────────────────┤
│  #  │ Atleta │ MPTS │  M$  │     │
│  1  │  João  │  22  │  5🪙 │ 🥇  │
│  2  │  Pedro │  18  │  3🪙 │ 🥈  │
└──────────────────────────────────┘
```

**Modo Admin (🔑 → digitar PIN):**
```
│  João  │ [−5][−1] 22 [+1][+5] │ [−1]5[+1] │
```
Também: toggle Placar Oculto, campo "Fase atual", botão Resetar.

### 3. Regras Firebase Security

```json
{
  "rules": {
    ".read": true,
    ".write": false,
    "scores": { ".write": true },
    "config": { ".write": true }
  }
}
```
*(Escrita liberada — PIN é a proteção. Aceitável para evento de 1 dia.)*

### 4. Skills de Design (Claude Code global)

Executar no terminal:
```bash
npx skills add pbakaus/impeccable
npx skills add nextlevelbuilder/ui-ux-pro-max-skill
npx skills add leonxlnx/taste-skill
```

Playwright → configurar como MCP server (`@playwright/mcp`) via `/update-config`.

### 5. Responsividade Mobile

Breakpoints existentes: 720px, 560px, 500px, 480px, 380px.

Pontos a revisar:
- Hero title overflow em 320px
- Touch targets ≥ 44px nos grids de itens
- Bottom sheet: 100% largura, max 85vh com scroll, safe area iOS
- Botão "Ver Tabela" não sobrepor nav inferior do iPhone

### 6. Deploy

```bash
git push origin main
```
Ativar GitHub Pages: Settings → Pages → Branch main, pasta `/`.

## Ordem de execução sugerida

1. `git init` + remote + `.gitignore` ← **feito**
2. Separar CSS/JS (arquivo grande ~1.4MB, usar script Python)
3. Criar `scoreboard.js` com Firebase config placeholder
4. Adicionar botão + bottom sheet ao `index.html`
5. Corrigir responsividade
6. Instalar skills
7. Miguel cria projeto Firebase e cola config
8. Testar localmente (`python -m http.server 8080`)
9. Push final
