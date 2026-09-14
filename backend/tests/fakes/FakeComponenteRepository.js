const { randomUUID } = require("crypto");

function paraComponente(registro) {
  return {
    id: registro.id,
    codigo: registro.codigo,
    descricao: registro.descricao,
    posicaoVisual: registro.posicaoVisual,
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

  async buscarPorSimilaridadeSemantica({ empresaId, vetor, marca, tensao, limite = 20 }) {
    return this.registros
      .filter((r) => r.empresaId === empresaId && r.status === "VALIDADO" && r.embedding)
      .filter((r) => !marca || r.marca === marca)
      .filter((r) => !tensao || r.tensao === tensao)
      .map((r) => ({ ...paraComponenteComValidacao(r), distancia: distancia(r.embedding, vetor) }))
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, limite);
  }

  async existeRegistroValidado({ empresaId }) {
    return this.registros.some((r) => r.empresaId === empresaId && r.status === "VALIDADO");
  }
}

module.exports = { FakeComponenteRepository };
