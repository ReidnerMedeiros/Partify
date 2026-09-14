/**
 * Entidade Peca (RF07/RF08). Uma peça identificada numa vista explodida,
 * vinculada a uma VersaoTensao (que por sua vez pertence a uma Ferramenta/Marca)
 * e ao Catalogo (documento) de onde foi extraída. Carrega empresaId diretamente
 * (RNF11 — isolamento por instância), mesmo sendo alcançável via catalogoId.
 */
class Peca {
  constructor({
    id,
    empresaId,
    codigo,
    descricao,
    posicaoVisual,
    confianca,
    versaoTensaoId,
    catalogoId,
    criadoEm,
    atualizadoEm,
  }) {
    this.id = id;
    this.empresaId = empresaId;
    this.codigo = codigo;
    this.descricao = descricao ?? null;
    this.posicaoVisual = posicaoVisual ?? null;
    this.confianca = confianca ?? null;
    this.versaoTensaoId = versaoTensaoId;
    this.catalogoId = catalogoId;
    this.criadoEm = criadoEm;
    this.atualizadoEm = atualizadoEm;
  }
}

module.exports = { Peca };
