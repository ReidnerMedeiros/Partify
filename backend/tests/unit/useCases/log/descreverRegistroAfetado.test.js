const { descreverRegistroAfetado } = require("../../../../src/useCases/log/descreverRegistroAfetado");

const nomes = new Map([["u-1", "Maria"]]);

describe("descreverRegistroAfetado (coluna Registro Afetado do RF13)", () => {
  test("login, logout e senha mostram o nome do usuário", () => {
    for (const tipoAcao of ["LOGIN", "LOGOUT", "ALTERACAO_SENHA", "ATIVAR_DESATIVAR_USUARIO", "EDICAO_USUARIO"]) {
      expect(descreverRegistroAfetado({ tipoAcao, registroAfetado: "u-1" }, nomes)).toBe("Usuário Maria");
    }
  });

  test("usuário que não existe mais cai no identificador (null)", () => {
    expect(descreverRegistroAfetado({ tipoAcao: "LOGIN", registroAfetado: "u-9" }, nomes)).toBeNull();
  });

  test("criação de usuário e de empresa usam o nome guardado no log", () => {
    expect(descreverRegistroAfetado({ tipoAcao: "CRIACAO_USUARIO", registroAfetado: "u-2", detalhes: { nome: "João" } }, nomes)).toBe(
      "Usuário João"
    );
    expect(descreverRegistroAfetado({ tipoAcao: "CRIACAO_EMPRESA", registroAfetado: "e-1", detalhes: { nome: "Loja X" } }, nomes)).toBe(
      "Empresa Loja X"
    );
  });

  test("upload e extração mostram o nome do arquivo", () => {
    for (const tipoAcao of ["UPLOAD_VISTA_EXPLODIDA", "EXTRACAO_IA"]) {
      expect(descreverRegistroAfetado({ tipoAcao, registroAfetado: "c-1", detalhes: { nomeArquivo: "GBM10.pdf" } }, nomes)).toBe(
        "Catálogo GBM10.pdf"
      );
    }
  });

  test("extração antiga, sem nome de arquivo no log, cai no identificador (null)", () => {
    expect(descreverRegistroAfetado({ tipoAcao: "EXTRACAO_IA", registroAfetado: "c-1", detalhes: { status: "PENDENTE_VALIDACAO" } }, nomes)).toBeNull();
  });

  test("validação e edição de catálogo mostram marca, modelo e tensão", () => {
    const ferramenta = { marca: "Bosch", modelo: "GBM 10", tensao: "V220" };
    expect(descreverRegistroAfetado({ tipoAcao: "VALIDACAO_HITL", registroAfetado: "c-1", detalhes: ferramenta }, nomes)).toBe(
      "Catálogo Bosch GBM 10 (220V)"
    );
    expect(descreverRegistroAfetado({ tipoAcao: "EDICAO_REGISTRO", registroAfetado: "c-1", detalhes: { novo: ferramenta } }, nomes)).toBe(
      "Catálogo Bosch GBM 10 (220V)"
    );
  });

  test("edição da empresa não é confundida com catálogo", () => {
    expect(descreverRegistroAfetado({ tipoAcao: "EDICAO_REGISTRO", registroAfetado: "e-1", detalhes: { novo: { nome: "Loja Y" } } }, nomes)).toBe(
      "Empresa Loja Y"
    );
  });

  test("exclusão: peça pelo código, catálogo validado pela ferramenta, pendente pelo arquivo", () => {
    expect(descreverRegistroAfetado({ tipoAcao: "EXCLUSAO_REGISTRO", registroAfetado: "p-1", detalhes: { codigo: "1619P09876" } }, nomes)).toBe(
      "Peça 1619P09876"
    );
    expect(
      descreverRegistroAfetado(
        { tipoAcao: "EXCLUSAO_REGISTRO", registroAfetado: "c-1", detalhes: { nomeArquivo: "a.pdf", marca: "Makita", modelo: "HR2470", tensao: "BIVOLT" } },
        nomes
      )
    ).toBe("Catálogo Makita HR2470 (Bivolt)");
    expect(descreverRegistroAfetado({ tipoAcao: "EXCLUSAO_REGISTRO", registroAfetado: "c-2", detalhes: { nomeArquivo: "b.pdf" } }, nomes)).toBe(
      "Catálogo b.pdf"
    );
  });

  test("acesso não autorizado mostra o login digitado ou o usuário da conta inativa", () => {
    expect(descreverRegistroAfetado({ tipoAcao: "ACESSO_NAO_AUTORIZADO", registroAfetado: "reid" }, nomes)).toBe("Login reid");
    expect(descreverRegistroAfetado({ tipoAcao: "ACESSO_NAO_AUTORIZADO", registroAfetado: "u-1" }, nomes)).toBe("Usuário Maria");
  });

  test("sem detalhes e tipo desconhecido não quebra", () => {
    expect(descreverRegistroAfetado({ tipoAcao: "OUTRO", registroAfetado: "x" }, nomes)).toBeNull();
    expect(descreverRegistroAfetado({ tipoAcao: "VALIDACAO_HITL", registroAfetado: "x", detalhes: null }, nomes)).toBeNull();
  });
});
