const { transacaoComRetry } = require("../../../src/infra/database/repositories/PrismaCatalogoRepository");

/**
 * Teste de recuperação (parte automatizável) — RNF: resiliência a falhas
 * transitórias de conexão com o banco (Supabase, via pooler).
 *
 * `transacaoComRetry` já corrigiu um bug real de produção nesta sessão (queda
 * de conexão no meio de uma transação de escrita mais longa), mas nunca tinha
 * sido testado automaticamente — só validado manualmente em produção. Usa um
 * Prisma falso (`{ $transaction }`) injetado como argumento, sem precisar de
 * banco real, exercitando só a lógica de retry em si.
 */
function criarPrismaFalso(implementacao) {
  return { $transaction: jest.fn(implementacao) };
}

function erroP2028QuedaDeConexao() {
  const erro = new Error("Transaction API error");
  erro.code = "P2028";
  erro.meta = { error: "Transaction not found. Transaction ID is invalid, refers to an old, closed or otherwise invalid transaction." };
  return erro;
}

function erroP2028Timeout() {
  const erro = new Error("Transaction API error");
  erro.code = "P2028";
  erro.meta = { error: "Transaction already closed: A query cannot be executed on an expired transaction." };
  return erro;
}

describe("transacaoComRetry — teste de recuperação (retentativa em queda de conexão)", () => {
  test("sucede na 3ª tentativa depois de 2 quedas de conexão (P2028 'transaction not found')", async () => {
    let chamada = 0;
    const prisma = criarPrismaFalso(async (callback) => {
      chamada += 1;
      if (chamada < 3) throw erroP2028QuedaDeConexao();
      return callback({ marcador: "tx-real" });
    });

    const resultado = await transacaoComRetry(prisma, async (tx) => `ok:${tx.marcador}`);

    expect(resultado).toBe("ok:tx-real");
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  }, 10000);

  test("esgota as 3 tentativas e propaga o último erro se a queda de conexão persistir sempre", async () => {
    const prisma = criarPrismaFalso(async () => {
      throw erroP2028QuedaDeConexao();
    });

    await expect(transacaoComRetry(prisma, async (tx) => tx)).rejects.toMatchObject({ code: "P2028" });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  }, 10000);

  test("NÃO tenta de novo quando o P2028 é de timeout (mensagem diferente de 'transaction not found')", async () => {
    const prisma = criarPrismaFalso(async () => {
      throw erroP2028Timeout();
    });

    await expect(transacaoComRetry(prisma, async (tx) => tx)).rejects.toMatchObject({ code: "P2028" });
    // Propaga já na 1ª tentativa — timeout tem tratamento próprio via `{ timeout }`, não é queda de conexão.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test("NÃO tenta de novo para erros que não são de queda de conexão (ex.: P2002 de unicidade)", async () => {
    const prisma = criarPrismaFalso(async () => {
      const erro = new Error("Unique constraint failed");
      erro.code = "P2002";
      throw erro;
    });

    await expect(transacaoComRetry(prisma, async (tx) => tx)).rejects.toMatchObject({ code: "P2002" });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  test("sucesso de primeira (sem nenhuma queda de conexão) não aciona nenhuma retentativa", async () => {
    const prisma = criarPrismaFalso(async (callback) => callback({ marcador: "tx-real" }));

    const resultado = await transacaoComRetry(prisma, async (tx) => tx.marcador);

    expect(resultado).toBe("tx-real");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
