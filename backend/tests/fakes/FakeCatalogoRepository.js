const { randomUUID } = require("crypto");

/**
 * Implementação em memória de CatalogoRepository, replicando (de forma
 * simplificada) a cadeia relacional Marca -> Ferramenta -> VersaoTensao -> Peca
 * que o PrismaCatalogoRepository resolve via SQL, para que os testes possam
 * verificar o comportamento de find-or-create sem um banco real.
 *
 * RNF11 — todo o find-or-create é escopado por empresaId, replicando o
 * isolamento por instância que o PrismaCatalogoRepository aplica via
 * upsert/where com empresaId (duas empresas nunca reaproveitam o mesmo
 * registro de Marca/Ferramenta/VersaoTensao, mesmo com nome/modelo iguais).
 */
class FakeCatalogoRepository {
  constructor() {
    this.catalogos = [];
    this.marcas = [];
    this.ferramentas = [];
    this.versoesTensao = [];
    this.pecas = [];
    this.embeddings = {};
    // RF09/A2 — bookkeeping simplificado só pra alimentar "validadoPor"/
    // "validadoEm" em listarPecasValidadas nos testes; os testes que
    // precisarem dessa informação populam este array diretamente (o
    // FakeValidacaoRepository é um objeto separado, sem esse cruzamento no
    // mundo real também — a leitura de fato acontece via JOIN no Prisma).
    this.validacoes = [];
  }

  async criar({ empresaId, nomeArquivo, caminhoArquivo }) {
    const catalogo = {
      id: randomUUID(),
      empresaId,
      nomeArquivo,
      caminhoArquivo,
      status: "PENDENTE_EXTRACAO",
      motivoPendencia: null,
      camposAusentes: null,
      confiancaCampos: null,
      confiancaGeral: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };
    this.catalogos.push(catalogo);
    return catalogo;
  }

  async buscarComPecas(catalogoId) {
    const catalogo = this.catalogos.find((c) => c.id === catalogoId);
    if (!catalogo) return null;

    const pecasDoCatalogo = this.pecas.filter((p) => p.catalogoId === catalogoId);
    const primeira = pecasDoCatalogo[0];

    let marca = null;
    let modelo = null;
    let tensao = null;
    if (primeira) {
      const versaoTensao = this.versoesTensao.find((v) => v.id === primeira.versaoTensaoId);
      tensao = versaoTensao?.tensao ?? null;
      const ferramenta = this.ferramentas.find((f) => f.id === versaoTensao?.ferramentaId);
      modelo = ferramenta?.modelo ?? null;
      const marcaRegistro = this.marcas.find((m) => m.id === ferramenta?.marcaId);
      marca = marcaRegistro?.nome ?? null;
    }

    return { catalogo, marca, modelo, tensao, pecas: pecasDoCatalogo };
  }

  async registrarResultadoExtracao(catalogoId, empresaId, dados) {
    const { marca, modelo, tensao, pecas, confiancaCampos, confiancaGeral, status, motivoPendencia, camposAusentes } = dados;
    const catalogo = this.catalogos.find((c) => c.id === catalogoId);

    let versaoTensaoId = null;
    if (marca && modelo && tensao) {
      versaoTensaoId = this.#resolverVersaoTensaoId({ empresaId, marca, modelo, tensao });
    }

    if (versaoTensaoId && pecas?.length) {
      for (const peca of pecas) {
        this.pecas.push({
          id: randomUUID(),
          empresaId,
          codigo: peca.codigo,
          descricao: peca.descricao ?? null,
          posicaoVisual: peca.posicaoVisual ?? null,
          confianca: peca.confianca ?? null,
          versaoTensaoId,
          catalogoId,
          criadoEm: new Date(),
        });
      }
    }

    Object.assign(catalogo, {
      status,
      motivoPendencia: motivoPendencia ?? null,
      camposAusentes: camposAusentes ?? null,
      confiancaCampos: confiancaCampos ?? null,
      confiancaGeral: confiancaGeral ?? null,
    });

    return this.buscarComPecas(catalogoId);
  }

  async registrarValidacao(catalogoId, empresaId, dados) {
    const { marca, modelo, tensao, pecas } = dados;
    const catalogo = this.catalogos.find((c) => c.id === catalogoId);
    const versaoTensaoId = this.#resolverVersaoTensaoId({ empresaId, marca, modelo, tensao });

    for (const peca of pecas) {
      if (peca.id) {
        const existente = this.pecas.find((p) => p.id === peca.id);
        Object.assign(existente, {
          codigo: peca.codigo,
          descricao: peca.descricao ?? null,
          posicaoVisual: peca.posicaoVisual ?? null,
          versaoTensaoId,
        });
      } else {
        this.pecas.push({
          id: randomUUID(),
          empresaId,
          codigo: peca.codigo,
          descricao: peca.descricao ?? null,
          posicaoVisual: peca.posicaoVisual ?? null,
          confianca: null,
          versaoTensaoId,
          catalogoId,
          criadoEm: new Date(),
        });
      }
    }

    catalogo.status = "VALIDADO";
    return this.buscarComPecas(catalogoId);
  }

  async atualizarEmbeddingPeca(pecaId, vetor) {
    this.embeddings[pecaId] = vetor;
  }

  async listarPecasValidadas({ empresaId, marca, modelo, codigo }) {
    return this.pecas
      .filter((p) => p.empresaId === empresaId)
      .filter((p) => this.catalogos.find((c) => c.id === p.catalogoId)?.status === "VALIDADO")
      .map((p) => {
        const versaoTensao = this.versoesTensao.find((v) => v.id === p.versaoTensaoId);
        const ferramenta = this.ferramentas.find((f) => f.id === versaoTensao?.ferramentaId);
        const marcaRegistro = this.marcas.find((m) => m.id === ferramenta?.marcaId);
        const validacao = this.validacoes
          .filter((v) => v.catalogoId === p.catalogoId)
          .sort((a, b) => new Date(b.validadoEm) - new Date(a.validadoEm))[0];
        return {
          id: p.id,
          codigo: p.codigo,
          descricao: p.descricao,
          posicaoVisual: p.posicaoVisual,
          marca: marcaRegistro?.nome ?? null,
          modelo: ferramenta?.modelo ?? null,
          tensao: versaoTensao?.tensao ?? null,
          catalogoId: p.catalogoId,
          validadoPor: validacao?.validadoPor ?? null,
          validadoEm: validacao?.validadoEm ?? null,
        };
      })
      .filter((p) => !marca || p.marca === marca)
      .filter((p) => !modelo || p.modelo?.toLowerCase().includes(modelo.toLowerCase()))
      .filter((p) => !codigo || p.codigo?.toLowerCase().includes(codigo.toLowerCase()));
  }

  async atualizarCatalogo(catalogoId, empresaId, dados) {
    const { marca, modelo, tensao, pecas } = dados;
    const versaoTensaoId = this.#resolverVersaoTensaoId({ empresaId, marca, modelo, tensao });

    const idsRecebidos = new Set(pecas.filter((p) => p.id).map((p) => p.id));
    this.pecas = this.pecas.filter((p) => p.catalogoId !== catalogoId || idsRecebidos.has(p.id));

    for (const peca of pecas) {
      if (peca.id) {
        const existente = this.pecas.find((p) => p.id === peca.id);
        Object.assign(existente, {
          codigo: peca.codigo,
          descricao: peca.descricao ?? null,
          posicaoVisual: peca.posicaoVisual ?? null,
          versaoTensaoId,
        });
      } else {
        this.pecas.push({
          id: randomUUID(),
          empresaId,
          codigo: peca.codigo,
          descricao: peca.descricao ?? null,
          posicaoVisual: peca.posicaoVisual ?? null,
          confianca: null,
          versaoTensaoId,
          catalogoId,
          criadoEm: new Date(),
        });
      }
    }

    return this.buscarComPecas(catalogoId);
  }

  async excluirPeca(pecaId, empresaId) {
    const indice = this.pecas.findIndex((p) => p.id === pecaId && p.empresaId === empresaId);
    if (indice === -1) return null;
    const [removida] = this.pecas.splice(indice, 1);
    return removida;
  }

  async listarPendentes({ empresaId }) {
    return this.catalogos
      .filter((c) => c.empresaId === empresaId && c.status === "IRRESOLUVEL")
      .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  }

  async excluirCatalogo(catalogoId) {
    this.pecas = this.pecas.filter((p) => p.catalogoId !== catalogoId);
    this.validacoes = this.validacoes.filter((v) => v.catalogoId !== catalogoId);
    this.catalogos = this.catalogos.filter((c) => c.id !== catalogoId);
  }

  #resolverVersaoTensaoId({ empresaId, marca, modelo, tensao }) {
    let marcaRegistro = this.marcas.find((m) => m.empresaId === empresaId && m.nome === marca);
    if (!marcaRegistro) {
      marcaRegistro = { id: randomUUID(), empresaId, nome: marca };
      this.marcas.push(marcaRegistro);
    }

    let ferramentaRegistro = this.ferramentas.find((f) => f.marcaId === marcaRegistro.id && f.modelo === modelo);
    if (!ferramentaRegistro) {
      ferramentaRegistro = { id: randomUUID(), empresaId, marcaId: marcaRegistro.id, modelo };
      this.ferramentas.push(ferramentaRegistro);
    }

    let versaoTensaoRegistro = this.versoesTensao.find(
      (v) => v.ferramentaId === ferramentaRegistro.id && v.tensao === tensao
    );
    if (!versaoTensaoRegistro) {
      versaoTensaoRegistro = { id: randomUUID(), empresaId, ferramentaId: ferramentaRegistro.id, tensao };
      this.versoesTensao.push(versaoTensaoRegistro);
    }

    return versaoTensaoRegistro.id;
  }
}

module.exports = { FakeCatalogoRepository };
