/**
 * Adapta requisições HTTP para o RF13 — Manter Log Sistema (ADM). A rota é
 * protegida por authMiddleware + exigirAdministrador (RNF06, E2 do DERS).
 */
class LogAuditoriaController {
  constructor({ consultarLogAuditoriaUseCase }) {
    this.consultarLogAuditoriaUseCase = consultarLogAuditoriaUseCase;
  }

  // GET /log-auditoria — RF13, fluxo básico + E1 (nenhum registro encontrado,
  // tratado no frontend a partir de uma lista vazia)
  consultar = async (req, res) => {
    const { usuarioId, tipoAcao, dataInicial, dataFinal } = req.query;

    const registros = await this.consultarLogAuditoriaUseCase.execute({
      empresaId: req.auth.empresaId,
      usuarioId: usuarioId || undefined,
      tipoAcao: tipoAcao || undefined,
      dataInicial: dataInicial || undefined,
      dataFinal: dataFinal || undefined,
    });

    return res.status(200).json({ registros });
  };
}

module.exports = { LogAuditoriaController };
