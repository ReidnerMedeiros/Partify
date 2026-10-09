const { randomUUID } = require("crypto");

function paraComponente(registro) {
  return {
    id: registro.id,
    codigo: registro.codigo,
    descricao: registro.descricao,
    posicaoVisual: registro.posicaoVisual,
    quantidade: registro.quantidade ?? null,
    marca: registro.marca,
    modelo: registro.modelo,
    tensao: registro.tensao,
    catalogoId: registro.catalogoId,
  };
}

function paraComponenteComValidacao(registro) {
  return { ...paraComponente(registro), validadoEm: registro.validadoEm };
}

function distancia(vetorA, vetorB) {
  const tamanho = Math.max(vetorA.length, vetorB.length);
  let soma = 0;
  for (let i = 0; i < tamanho; i += 1) {
    const a = vetorA[i] ?? 0;
    const b = vetorB[i] ?? 0;
    soma += (a - b) ** 2;
  }
  return Math.sqrt(soma);
}

/**
 * Implementação em memória de ComponenteRepository para os testes unitários
 * do RF11. Diferente de FakeCatalogoRepository (que replica a cadeia
 * relacional Marca -> Ferramenta -> VersaoTensao), aqui os registros já vêm
 * "achatados" (marca/modelo/tensao como strings soltas) via `seedComponente`,
 * já que o Agente de Consulta só lê dados já validados — não precisa
 * reconstruir a cadeia de find-or-create.
 */
class FakeComponenteRepository {
  constructor() {
    this.registros = [];
  }

  /**
   * Helper de teste (não faz parte do contrato de ComponenteRepository) para
   * popular a base em memória com uma peça já validada, com valores default
   * razoáveis para os campos não relevantes ao teste em questão.
   */
  seedComponente(dados) {
    const registro = {
      id: dados.id ?? randomUUID(),
      empresaId: dados.empresaId,
      codigo: dados.codigo,
      descricao: dados.descricao ?? null,
      posicaoVisual: dados.posicaoVisual ?? null,
      quantidade: dados.quantidade ?? null,
      marca: dados.marca,
      modelo: dados.modelo,
      tensao: dados.tensao,
      catalogoId: dados.catalogoId ?? randomUUID(),
      status: dados.status ?? "VALIDADO",
      embedding: dados.embedding ?? null,
      validadoEm: dados.validadoEm ?? new Date("2026-01-01T00:00:00.000Z"),
    };
    this.registros.push(registro);
    return registro;
  }

  async buscarPorCodigoExato({ empresaId, termo, marca, tensao }) {
    return this.registros
      .filter((r) => r.empresaId === empresaId && r.status === "VALIDADO")
      .filter((r) => r.codigo.toLowerCase() === termo.toLowerCase())
      .filter((r) => !marca || r.marca === marca)
      .filter((r) => !tensao || r.tensao === tensao)
      .map(paraComponente);
  }

  async buscarPorPalavrasChave({ empresaId, palavras, modelos, limite = 20 }) {
    const semAcento = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

    return this.registros
      .filter((r) => r.empresaId === empresaId && r.status === "VALIDADO")
      .filter((r) => !modelos?.length || modelos.includes(r.modelo))
      .map((r) => ({
        registro: r,
        pontos: (palavras ?? []).filter((palavra) => semAcento(r.descricao ?? "").includes(palavra)).length,
      }))
      .filter((item) => item.pontos > 0)
      .sort((a, b) => b.pontos - a.pontos || a.registro.codigo.localeCompare(b.registro.codigo))
      .slice(0, limite)
      .map((item) => ({ ...paraComponenteComValidacao(item.registro), distancia: null }));
  }

  async listarPecasDoModelo({ empresaId, modelos, limite = 100 }) {
    if (!modelos?.length) return [];
    return this.registros
      .filter((r) => r.empresaId === empresaId && r.status === "VALIDADO" && modelos.includes(r.modelo))
      .slice(0, limite)
      .map((r) => ({ ...paraComponenteComValidacao(r), distancia: null }));
  }

  async listarModelosValidados({ empresaId }) {
    const unicos = new Map();
    for (const r of this.registros) {
      if (r.empresaId === empresaId && r.status === "VALIDADO") unicos.set(`${r.marca}|${r.modelo}`, { marca: r.marca, modelo: r.modelo });
    }
    return [...unicos.values()];
  }

  async buscarPorSimilaridadeSemantica({ empresaId, vetor, marca, tensao, modelos, limite = 20 }) {
    return this.registros
      .filter((r) => r.empresaId === empresaId && r.status === "VALIDADO" && r.embedding)
      .filter((r) => !marca || r.marca === marca)
      .filter((r) => !tensao || r.tensao === tensao)
      .filter((r) => !modelos?.length || modelos.includes(r.modelo))
      .map((r) => ({ ...paraComponenteComValidacao(r), distancia: distancia(r.embedding, vetor) }))
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, limite);
  }

  async existeRegistroValidado({ empresaId }) {
    return this.registros.some((r) => r.empresaId === empresaId && r.status === "VALIDADO");
  }
}

module.exports = { FakeComponenteRepository };
