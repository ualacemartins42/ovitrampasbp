# Ovitrampas — PWA offline-first para ACE

Aplicativo web progressivo para Agentes de Combate às Endemias (ACE) da Secretaria Municipal de Saúde, voltado ao programa piloto de monitoramento de *Aedes* com armadilhas de ovos (ovitrampas).

O primeiro acesso é online (instalação do PWA, login e download das tabelas básicas). Em campo, sem sinal, o agente preenche instalação, vistoria e recolhimento normalmente. Os lançamentos ficam no **IndexedDB** e sobem ao **Supabase** quando a conexão volta.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- React Router
- TanStack Query (`networkMode: offlineFirst`)
- Dexie (IndexedDB + fila de sincronização)
- `vite-plugin-pwa` (Workbox)
- Supabase (PostgreSQL, Auth, RLS, Storage)
- Hospedagem: Vercel (SPA rewrite em `vercel.json`; `netlify.toml` também incluso)

## Arquitetura de pastas

```text
src/
  components/
    layout/          # AppShell, badge Online/Offline, fila de sync
    ui/              # botão, campos, card, badge
  features/
    auth/            # sessão, perfil local e Modo Offline
    collections/     # persistência local das coletas
  hooks/             # status de rede e sincronização
  lib/
    db.ts            # Dexie / IndexedDB
    supabase.ts      # cliente (só com env configurada)
    sync.ts          # pull de bases + push da fila
    geo.ts           # GPS do aparelho (funciona offline)
  pages/             # login, home, formulário, lab, perfil, sync
  types/             # domínio e tipos do banco
supabase/
  migrations/        # schema, RLS, storage, seeds de bairro/armadilha
```

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

Sem as variáveis do Supabase o app abre em **Modo Offline** (tudo local, inclusive fila de sync).

## Fluxo offline-first

1. Login online → baixa bairros, tipos de armadilha, imóveis e armadilhas.
2. Sessão e perfil ficam no aparelho (`localStorage` + Dexie).
3. Formulários gravam em IndexedDB e entram na fila (`syncQueue`).
4. Fotos ficam como `Blob` local e sobem ao bucket `collection-photos` na sincronização.
5. GPS usa a API de geolocalização do navegador (não depende de internet).
6. Ao reconectar, a fila dispara sozinha; o botão **Sincronizar dados** força o envio.

O topo da tela mostra o badge **Online / Offline** e a quantidade de itens na fila.

## Papéis (RLS)

A autorização de papel fica em `public.profiles.role`, nunca em `user_metadata` (editável pelo usuário).

| Papel | Acesso |
| --- | --- |
| `ace` | Lança e vê as próprias coletas |
| `lab` | Digita laudos (ovos + espécie) e vê a base |
| `supervisor` / `admin` | Mesmo recorte de staff, com atualização de cadastros |

Para promover um usuário no Auth do Supabase:

```json
{ "role": "lab" }
```

grave em **`app_metadata`**, não em `user_metadata`.

## Banco e Storage

Aplique a migration em um projeto **novo** do Supabase (não use projetos de outros sistemas):

```bash
npx supabase link --project-ref SEU_REF
npx supabase db push
```

Objetos principais:

- `neighborhoods`, `trap_types`, `properties`, `traps`
- `collections` com `client_id` único (idempotência offline)
- `lab_results` (1:1 com a coleta)
- bucket privado `collection-photos` (`{user_id}/{client_id}.ext`)

Funções `security definer` estão no schema `private`, fora da Data API.

## Produção (Vercel)

1. Conecte o repositório na Vercel (framework Vite, output `dist`).
2. Em **Settings → Environment Variables**, defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` para Production (e Preview, se quiser). Elas entram no bundle no momento do `npm run build`.
3. O `vercel.json` reescreve todas as rotas do SPA para `index.html` (`/login`, `/relatorios`, `/admin/bairros`, etc.) e configura cache do service worker / manifesto PWA.
4. Publique e, no celular, abra o site, use **Adicionar à tela inicial**, faça o login ainda com sinal e siga para o campo.

# ADICIONEI ESSA LINHA (LINHA 104)