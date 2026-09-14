const { LogoutUseCase } = require("../../../../src/useCases/auth/LogoutUseCase");
const { FakeSessaoRevogadaRepository } = require("../../../fakes/FakeSessaoRevogadaRepository");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");

describe("LogoutUseCase — RF02, fluxo alternativo A1 (Logout)", () => {
  test("revoga o jti da sessão atual e registra LOGOUT no log de auditoria", async () => {
    const sessaoRevogadaRepository = new FakeSessaoRevogadaRepository();
    const logAuditoriaRepository = new FakeLogAuditoriaRepository();
    const useCase = new LogoutUseCase({ sessaoRevogadaRepository, logAuditoriaRepository });

    await useCase.execute({ usuarioId: "usuario-1", jti: "jti-1", exp: Math.floor(Date.now() / 1000) + 3600 });

    expect(await sessaoRevogadaRepository.estaRevogado("jti-1")).toBe(true);
    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("LOGOUT");
  });

  test("não invalida uma sessão (jti) diferente da que foi encerrada", async () => {
    const sessaoRevogadaRepository = new FakeSessaoRevogadaRepository();
    const logAuditoriaRepository = new FakeLogAuditoriaRepository();
    const useCase = new LogoutUseCase({ sessaoRevogadaRepository, logAuditoriaRepository });

    await useCase.execute({ usuarioId: "usuario-1", jti: "jti-1", exp: null });

    expect(await sessaoRevogadaRepository.estaRevogado("jti-2")).toBe(false);
  });

  test("usa o exp do JWT (segundos desde a época Unix) como data de expiração do registro de revogação", async () => {
    const sessaoRevogadaRepository = new FakeSessaoRevogadaRepository();
    const logAuditoriaRepository = new FakeLogAuditoriaRepository();
    const useCase = new LogoutUseCase({ sessaoRevogadaRepository, logAuditoriaRepository });
    const expEmSegundos = Math.floor(Date.now() / 1000) + 3600;

    await useCase.execute({ usuarioId: "usuario-1", jti: "jti-1", exp: expEmSegundos });

    expect(sessaoRevogadaRepository.revogados[0].expiraEm.getTime()).toBe(expEmSegundos * 1000);
  });

  test("usa um fallback de ~24h quando o exp não é informado", async () => {
    const sessaoRevogadaRepository = new FakeSessaoRevogadaRepository();
    const logAuditoriaRepository = new FakeLogAuditoriaRepository();
    const useCase = new LogoutUseCase({ sessaoRevogadaRepository, logAuditoriaRepository });
    const antes = Date.now();

    await useCase.execute({ usuarioId: "usuario-1", jti: "jti-1", exp: undefined });

    const expiraEm = sessaoRevogadaRepository.revogados[0].expiraEm.getTime();
    expect(expiraEm).toBeGreaterThan(antes + 23 * 60 * 60 * 1000);
    expect(expiraEm).toBeLessThanOrEqual(antes + 24 * 60 * 60 * 1000 + 1000);
  });

  test("a sessão revogada fica associada ao usuário correto", async () => {
    const sessaoRevogadaRepository = new FakeSessaoRevogadaRepository();
    const logAuditoriaRepository = new FakeLogAuditoriaRepository();
    const useCase = new LogoutUseCase({ sessaoRevogadaRepository, logAuditoriaRepository });

    await useCase.execute({ usuarioId: "usuario-42", jti: "jti-1", exp: null });

    expect(sessaoRevogadaRepository.revogados[0].usuarioId).toBe("usuario-42");
    expect(logAuditoriaRepository.registros[0].usuarioId).toBe("usuario-42");
  });
});
