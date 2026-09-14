/**
 * Adapta requisições HTTP para o RF11 (Consulta de Componentes, Agente de
 * Consulta). Não contém regra de negócio.
 */
class ConsultaController {
  constructor({ buscarComponentesUseCase, consultarViaRagUseCase }) {
    this.buscarComponentesUseCase = buscarComponentesUseCase;
    this.consultarViaRagUseCase = consultarViaRagUseCase;
  }

  // GET /componentes — RF11 fluxo básico + A2 (sem filtros). O parâmetro
  // `modo` ("semantica" | "codigo_exato") só afeta a ordenação do resultado
  // combinado — as duas técnicas de busca sempre rodam juntas (ver comentário
  // em BuscarComponentesUseCase).
  buscar = async (req, res) => {
    const { termo, marca, tensao, modo } = req.query;

    const resultado = await this.buscarComponentesUseCase.execute({
      empresaId: req.auth.empresaId,
      termo,
      marca,
      tensao,
      modo,
    });

    return res.status(200).json({
      semRegistrosNaBase: resultado.semRegistrosNaBase,
      resultados: resultado.resultados.map((item) => ({
        id: item.id,
        codigo: item.codigo,
        descricao: item.descricao,
        posicaoVisual: item.posicaoVisual,
        marca: item.marca,
        modelo: item.modelo,
        tensao: item.tensao,
        catalogoId: item.catalogoId,
      })),
    });
  };

  // POST /consulta-tecnica — RF12 fluxo básico + E1/E2/E3. `pergunta` vai no
  // corpo (não na query string) por ser texto livre, potencialmente longo.
  // Resultado sempre 200: E1/E3 são situações de negócio, não erros HTTP (mesmo
  // padrão do "semRegistrosNaBase" no RF11) — só E2 (falha de comunicação com a
  // Gemini API) vira erro (503), tratado pelo errorHandler.
  perguntar = async (req, res) => {
    const { pergunta } = req.body;

    const resultado = await this.consultarViaRagUseCase.execute({
      empresaId: req.auth.empresaId,
      pergunta,
    });

    return res.status(200).json({
      situacao: resultado.situacao,
      resposta: resultado.resposta,
      fonte: resultado.fonte,
    });
  };
}

module.exports = { ConsultaController };
