const { ValidationError } = require("../../domain/errors/DomainErrors");

const NOME_USUARIO_SISTEMA = "sistema";
const NOME_USUARIO_DESCONHECIDO = "Usuário removido";

/**
 * RF13 — Manter Log Sistema (ADM), fluxo básico + E1 (nenhum registro encontrado).
 * Consulta o histórico de auditoria da própria instância (RNF11 — nunca vaza log
 * de outra empresa) filtrado por Usuário, Tipo de Ação, Data Inicial e Data Final
 * (Quadro 30 do DERS, todos os campos opcionais).
 *
 * "Tipo de Ação" usa o enum completo de TipoAcao (não as 4 categorias descritas no
 * texto do Quadro 30 — "Validação, Edição, Exclusão, Acesso"): o protótipo mostra a
 * tabela de resultados com os valores brutos do enum como badges (ex.: CRIACAO_EMPRESA,
 * EXTRACAO_IA, VALIDACAO_HITL), então seguimos o mesmo precedente já usado em outras
 * divergências DERS-vs-protótipo (decisão #21) — confirmado com o usuário nesta rodada
 * (decisão #27 em CONTEXTO.md).
 *
 * Como LogAuditoriaRepository.consultar devolve os registros "crus" (só com
 * usuarioId), este Use Case resolve o nome de cada usuário buscando a lista
 * completa de usuários da instância (mesmo repositório já usado pelo RF05,
 * ListarUsuariosUseCase) e faz o merge em memória — evita duplicar em
 * PrismaLogAuditoriaRepository uma lógica de JOIN que o Fake teria que replicar.
 * Registros com usuarioId nulo (ex.: CRIACAO_EMPRESA, logado antes de existir
 * sessão) aparecem como "sistema", igual ao protótipo.
 */
class ConsultarLogAuditoriaUseCase {
  constructor({ logAuditoriaRepository, usuarioRepository }) {
    this.logAuditoriaRepository = logAuditoriaRepository;
    this.usuarioRepository = usuarioRepository;
  }

  async execute({ empresaId, usuarioId, tipoAcao, dataInicial, dataFinal }) {
    const { inicioDoDia, fimDoDia } = this.#validarDatas({ dataInicial, dataFinal });

    const [registros, usuarios] = await Promise.all([
      this.logAuditoriaRepository.consultar({
        empresaId,
        usuarioId: usuarioId || undefined,
        tipoAcao: tipoAcao || undefined,
        dataInicial: inicioDoDia,
        dataFinal: fimDoDia,
      }),
      this.usuarioRepository.listarPorEmpresa(empresaId),
    ]);

    const nomePorUsuarioId = new Map(usuarios.map((usuario) => [usuario.id, usuario.nome]));

    return registros.map((registro) => ({
      id: registro.id,
      usuarioNome: registro.usuarioId ? nomePorUsuarioId.get(registro.usuarioId) ?? NOME_USUARIO_DESCONHECIDO : NOME_USUARIO_SISTEMA,
      realizadoEm: registro.realizadoEm,
      tipoAcao: registro.tipoAcao,
      registroAfetado: registro.registroAfetado ?? null,
    }));
  }

  // Quadro 30 — Data Inicial/Data Final: opcionais, mas quando informadas devem
  // ser datas válidas. O filtro é inclusivo do dia inteiro (00:00:00 até 23:59:59.999),
  // já que o campo do protótipo é um seletor de DATA, sem hora.
  #validarDatas({ dataInicial, dataFinal }) {
    const fieldErrors = {};
    let inicioDoDia;
    let fimDoDia;

    if (dataInicial) {
      inicioDoDia = new Date(`${dataInicial}T00:00:00.000`);
      if (Number.isNaN(inicioDoDia.getTime())) {
        fieldErrors.dataInicial = "Data inicial inválida.";
      }
    }

    if (dataFinal) {
      fimDoDia = new Date(`${dataFinal}T23:59:59.999`);
      if (Number.isNaN(fimDoDia.getTime())) {
        fieldErrors.dataFinal = "Data final inválida.";
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError("Não foi possível consultar o log. Revise os campos destacados.", fieldErrors);
    }

    return { inicioDoDia, fimDoDia };
  }
}

module.exports = { ConsultarLogAuditoriaUseCase };
