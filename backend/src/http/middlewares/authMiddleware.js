const { UnauthorizedError, ForbiddenError } = require("../../domain/errors/DomainErrors");
const { TipoAcao } = require("../../domain/enums/TipoAcao");

/**
 * RNF07 — registra toda tentativa de acesso não autorizado no log de
 * auditoria (token ausente/inválido/expirado, sessão revogada, ou perfil sem
 * permissão para a operação). Falhas ao gravar o log nunca bloqueiam a
 * rejeição da requisição em si — auditoria é best-effort aqui, a segurança
 * real já foi aplicada antes de chamar esta função.
 */
async function registrarAcessoNaoAutorizado(logAuditoriaRepository, req, { usuarioId = null, empresaId = null, motivo }) {
  if (!logAuditoriaRepository) return;
  try {
    await logAuditoriaRepository.registrar({
      usuarioId,
      empresaId,
      tipoAcao: TipoAcao.ACESSO_NAO_AUTORIZADO,
      registroAfetado: req.originalUrl,
      detalhes: { motivo, metodo: req.method },
    });
  } catch (erro) {
    console.error("[auditoria] falha ao registrar acesso não autorizado:", erro.message); // eslint-disable-line no-console
  }
}

/**
 * RNF07 — Autenticação de Usuários. Protege as rotas que exigem sessão ativa.
 * Espera o cabeçalho "Authorization: Bearer <token>" emitido pelo AutenticarUsuarioUseCase.
 * Também consulta a denylist de sessões revogadas (RF02-A1 — Logout).
 */
function criarAuthMiddleware(tokenService, sessaoRevogadaRepository, logAuditoriaRepository) {
  return async function authMiddleware(req, res, next) {
    const cabecalho = req.headers.authorization ?? "";
    const [tipo, token] = cabecalho.split(" ");

    if (tipo !== "Bearer" || !token) {
      await registrarAcessoNaoAutorizado(logAuditoriaRepository, req, { motivo: "token_ausente" });
      return next(new UnauthorizedError("Sessão não encontrada. Faça login novamente."));
    }

    try {
      const payload = tokenService.verificar(token);

      const revogado = await sessaoRevogadaRepository.estaRevogado(payload.jti);
      if (revogado) {
        await registrarAcessoNaoAutorizado(logAuditoriaRepository, req, {
          usuarioId: payload.sub,
          empresaId: payload.empresaId ?? null,
          motivo: "sessao_revogada",
        });
        return next(new UnauthorizedError("Sessão encerrada. Faça login novamente."));
      }

      req.auth = {
        usuarioId: payload.sub,
        empresaId: payload.empresaId,
        perfil: payload.perfil,
        jti: payload.jti,
        exp: payload.exp,
      };
      return next();
    } catch (_err) {
      // Cobre token malformado, assinatura inválida e expiração (jwt.TokenExpiredError) —
      // em qualquer caso, RNF07 exige encerrar a sessão e redirecionar ao login.
      await registrarAcessoNaoAutorizado(logAuditoriaRepository, req, { motivo: "token_invalido_ou_expirado" });
      return next(new UnauthorizedError("Sessão expirada ou inválida. Faça login novamente."));
    }
  };
}

/**
 * RF05/RF01 — algumas operações (ex.: desativar empresa) são exclusivas do
 * perfil Administrador. RNF07 exige log de auditoria também quando um perfil
 * sem permissão tenta acessar uma dessas rotas.
 */
function criarExigirAdministrador(logAuditoriaRepository) {
  return async function exigirAdministrador(req, res, next) {
    if (req.auth?.perfil !== "ADMINISTRADOR") {
      await registrarAcessoNaoAutorizado(logAuditoriaRepository, req, {
        usuarioId: req.auth?.usuarioId ?? null,
        empresaId: req.auth?.empresaId ?? null,
        motivo: "perfil_sem_permissao",
      });
      return next(new ForbiddenError("Apenas o administrador pode executar esta operação."));
    }
    return next();
  };
}

module.exports = { criarAuthMiddleware, criarExigirAdministrador };
