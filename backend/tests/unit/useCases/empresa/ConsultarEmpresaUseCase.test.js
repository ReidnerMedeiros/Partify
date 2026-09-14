const { ConsultarEmpresaUseCase } = require("../../../../src/useCases/empresa/ConsultarEmpresaUseCase");
const { FakeEmpresaRepository } = require("../../../fakes/FakeEmpresaRepository");
const { NotFoundError } = require("../../../../src/domain/errors/DomainErrors");
const { Empresa } = require("../../../../src/domain/entities/Empresa");

describe("ConsultarEmpresaUseCase — RF01, fluxo alternativo A1 (consulta)", () => {
  test("retorna os dados da empresa quando ela existe", async () => {
    const empresaRepository = new FakeEmpresaRepository();
    const empresa = new Empresa({
      id: "empresa-1",
      nome: "Loja X",
      cnpjCpf: "12345678000195",
      telefone: "64999990000",
      email: "loja@x.com",
    });
    empresaRepository.empresas.push(empresa);
    const useCase = new ConsultarEmpresaUseCase({ empresaRepository });

    const resultado = await useCase.execute({ empresaId: "empresa-1" });

    expect(resultado).toBe(empresa);
  });

  test("lança NotFoundError quando a empresa não existe", async () => {
    const empresaRepository = new FakeEmpresaRepository();
    const useCase = new ConsultarEmpresaUseCase({ empresaRepository });

    await expect(useCase.execute({ empresaId: "inexistente" })).rejects.toThrow(NotFoundError);
  });
});
