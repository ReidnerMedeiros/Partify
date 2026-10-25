const { EnumTensao, tensoesCompativeis } = require("../../../../src/domain/enums/EnumTensao");

describe("tensoesCompativeis (RF11 — filtro de tensão da consulta)", () => {
  test("filtro 110/127 V inclui também as ferramentas bivolt", () => {
    expect(tensoesCompativeis(EnumTensao.V127)).toEqual([EnumTensao.V127, EnumTensao.BIVOLT]);
  });

  test("filtro 220/240 V inclui também as ferramentas bivolt", () => {
    expect(tensoesCompativeis(EnumTensao.V220)).toEqual([EnumTensao.V220, EnumTensao.BIVOLT]);
  });

  test("filtro Bivolt e Não informado casam só com o próprio valor", () => {
    expect(tensoesCompativeis(EnumTensao.BIVOLT)).toEqual([EnumTensao.BIVOLT]);
    expect(tensoesCompativeis(EnumTensao.NAO_INFORMADO)).toEqual([EnumTensao.NAO_INFORMADO]);
  });
});
