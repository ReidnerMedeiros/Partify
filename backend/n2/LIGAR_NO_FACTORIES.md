# Como ligar o cache no sistema (só na branch da atividade)

Em `backend/src/main/factories/index.js`, troque o bloco `const fileStorageService = ...` por:

```js
const storageRemoto = process.env.SUPABASE_URL
  ? new SupabaseStorageService({
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: process.env.SUPABASE_STORAGE_BUCKET,
    })
  : new LocalFileStorageService();

// ATIVIDADE N2 (ESW441), FORA DO ESCOPO DO PARTIFY — só na branch da atividade.
// N2_CACHE_PDF=1 liga o cache em arquivo do PDF (backend/n2/); sem a variável, nada muda.
const fileStorageService =
  process.env.N2_CACHE_PDF === "1"
    ? new (require("../../../n2/ArquivoCacheStorageService").ArquivoCacheStorageService)({
        storageRemoto,
        diretorio: require("path").join(__dirname, "..", "..", "..", "n2", "cache", "pdfs"),
        aoEvento: (mensagem) => console.log(`[N2-CACHE] ${mensagem}`), // eslint-disable-line no-console
      })
    : storageRemoto;
```
