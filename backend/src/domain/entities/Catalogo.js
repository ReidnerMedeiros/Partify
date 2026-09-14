const { StatusCatalogo } = require("../enums/StatusCatalogo");

/**
 * Entidade Catalogo (RF06 — Importar Catálogo). Representa um documento (vista
 * explodida em PDF) importado ao sistema e seu progresso pelo pipeline de IA
 * (RF07 — extração, RF08 — validação humana).
 *
 * Isolado por instância (empresaId), como Empresa/Usuario — exigência explícita
 * do RNF11 ("os dados técnicos cadastrados, incluindo catálogos, peças,
 * ferramentas e histórico de validações, [devem ser] completamente segregados
 * dos dados de qualquer outra instância"). Duas empresas que importem o mesmo
 * manual do fabricante têm, cada uma, seu próprio Catalogo/Peca/Ferramenta/Marca
 * — não há reaproveitamento entre instâncias (decisão #12 do CONTEXTO.md,
 * revertida nesta revisão; ver HISTORICO.md para o motivo da correção).
 */
class Catalogo {
  constructor({
    id,
    empresaId,
    nomeArquivo,
    caminhoArquivo,
    status,
    motivoPendencia,
    camposAusentes,
    confiancaCampos,
    confiancaGeral,
    criadoEm,
    atualizadoEm,
  }) {
    this.id = id;
    this.empresaId = empresaId;
    this.nomeArquivo = nomeArquivo;
    this.caminhoArquivo = caminhoArquivo;
    this.status = status ?? StatusCatalogo.PENDENTE_EXTRACAO;
    this.motivoPendencia = motivoPendencia ?? null;
    this.camposAusentes = camposAusentes ?? null;
    this.confiancaCampos = confiancaCampos ?? null;
    this.confiancaGeral = confiancaGeral ?? null;
    this.criadoEm = criadoEm;
    this.atualizadoEm = atualizadoEm;
  }
}

module.exports = { Catalogo };
