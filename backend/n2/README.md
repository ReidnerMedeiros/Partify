# Projeto N2 (ESW441): cache em arquivo para o PDF do catálogo

> **Atividade da disciplina ESW441, fora do escopo do Partify.** Esta pasta (`backend/n2/`) existe só para o Projeto N2 e será apagada depois. Ver `ATIVIDADE_N2_FORA_DO_ESCOPO.md` na raiz.

## O que é

Camada nova de persistência: um **cache em arquivo** para o PDF do catálogo. Antes, cada "Ver Vista Explodida" baixava o PDF inteiro do Supabase Storage (baseline: **535,2 ms** por leitura, N = 200, PDF de 95,3 KB). Agora a primeira leitura baixa e grava em disco (**MISS**) e as seguintes saem do disco (**HIT**).

Caminho **arquivo**: não precisa de Docker nem de servidor. Só o programa e o disco.

## Como funciona

- `ArquivoCacheStorageService.js`: decorador do `FileStorageService` (`salvar`, `obterBuffer`, `excluir`).
- Arquivo em disco: `cache/pdfs/<sha256(caminhoArquivo)>.pdf`. Índice em memória (`Map`) remontado na subida.
- **Leitura (HIT/MISS):** índice tem a chave e não expirou, lê do disco. Senão, baixa do remoto, grava em arquivo temporário, renomeia (gravação atômica) e registra no índice. Leituras simultâneas do mesmo arquivo compartilham um único download.
- **Escrita invalidando:** `excluir` apaga primeiro na fonte da verdade (Supabase) e só depois o arquivo do cache. O PDF nunca é editado depois de salvo, então só existem criar e excluir.
- **Rede de segurança:** TTL de 7 dias e limite de 200 MB (remove o menos usado recentemente, LRU).
- **Falha do cache** (disco cheio, arquivo ilegível): cai para o storage remoto. O cache nunca derruba a operação.

## Como rodar

Tudo dentro de `backend/`.

1. **Demonstração (sem banco, sem internet, sem `.env`):**

   ```
   node n2/demoCache.js
   ```

   Usa um storage falso com 300 ms de latência e mostra MISS, HIT, cache sobrevivendo a reinício, download compartilhado, invalidação (o arquivo some do cache), fallback e LRU. Termina com "Tudo certo." se todas as checagens passarem.

2. **Medição do "depois" no Partify real** (precisa do `.env`, mesma máquina do baseline):

   ```
   node n2/medirComCache.js --n=200
   ```

   Faz 1 leitura MISS, aquece, e mede N leituras HIT. Salva o JSON em `n2/resultados/depois-cache-*.json`. Compare a média do HIT com a do baseline (`resultados/baseline-pdf-*.json`).

3. **Baseline (o "antes"):**

   ```
   node n2/baselineArquivoPdf.js --n=200
   ```

## Ligar a camada no sistema (só na branch da atividade)

Já está ligada em `src/main/factories/index.js`, mas **só quando a variável `N2_CACHE_PDF=1` existe no `.env`**. Sem ela o sistema funciona como antes. Com ela, o terminal do backend mostra `[N2-CACHE] HIT`, `MISS` e `INVALIDADO` a cada abertura ou exclusão de PDF. Nenhum caso de uso muda. **Não fazer merge na `main`.**

Para ver ao vivo no Partify:

1. No `backend/.env` acrescentar `N2_CACHE_PDF=1`.
2. `npm run dev` dentro de `backend/`, abrir o sistema e clicar em "Ver Vista Explodida" duas vezes (MISS, depois HIT). Excluir um catálogo de teste mostra `INVALIDADO` e o arquivo sumindo de `n2/cache/pdfs/`.

## Resultado final (medição antes × depois)

Mesma máquina (Ryzen 5 5600, Node 24), mesmo PDF (95,3 KB), N = 200:

| Operação | Antes | Depois | Ganho |
|---|---|---|---|
| Leitura repetida (HIT), média | 535,19 ms | 0,199 ms | ~2.690× |
| Primeira leitura (MISS), 1 medida | 535,19 ms (média) | 2.200,99 ms | mais lenta, paga uma vez por arquivo |

A ficha de 1 página está em `FICHA_MEDICAO_N2.html` e o roteiro do vídeo em `ROTEIRO_VIDEO_N2.md`. Resultados brutos em `resultados/`.
