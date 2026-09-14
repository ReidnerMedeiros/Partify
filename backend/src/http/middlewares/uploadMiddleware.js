const multer = require("multer");

const TAMANHO_MAXIMO_BYTES = 50 * 1024 * 1024; // 50MB — igual ao limite validado no ImportarCatalogoUseCase

/**
 * RF06 — recebe o arquivo em memória (req.file.buffer), sem escrever em disco
 * temporário, já que quem decide onde persistir é o FileStorageService (Local em
 * dev, Supabase em produção). A validação de formato (RNF06/E1) fica só no
 * ImportarCatalogoUseCase — mantemos essa regra de negócio na camada de domínio
 * em vez de duplicá-la aqui, para não arriscar mensagens de erro divergentes
 * entre o middleware e o Use Case. O limite de tamanho é aplicado aqui (multer)
 * como proteção de infraestrutura contra uploads muito grandes.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO_BYTES },
});

module.exports = { upload };
