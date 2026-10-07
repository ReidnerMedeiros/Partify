/**
 * Rede de segurança contra "poluição" do código da peça por outras colunas da
 * tabela do catálogo (ex.: a coluna de quantidade, "Un"/"Qtd"/"Qty", que fica
 * imediatamente antes do código em alguns layouts). Exemplo real: a linha
 * `2 | 1 | 9 618 085 763 | SAPATA POLAR` (posição 2, quantidade 1) chegou a ser
 * extraída como código "1 9618 085 763".
 *
 * A medida principal é o prompt do Agente Extrator (ler a tabela por colunas, com
 * campo próprio para a quantidade). Este módulo é a segunda barreira, determinística:
 *
 *   - Num mesmo documento, os códigos de um fabricante costumam ter o mesmo
 *     comprimento (ex.: Bosch, 10 caracteres). Calcula-se o comprimento
 *     predominante ("padrão") do catálogo.
 *   - Um código MAIS LONGO que o padrão, cujo início é um número pequeno (1 a 3
 *     dígitos) e que volta ao comprimento padrão ao remover esse número, é tratado
 *     como código com a quantidade colada na frente: o prefixo é removido e, se a
 *     quantidade ainda não estava preenchida, é recuperada dele.
 *   - Qualquer outro código fora do padrão apenas é sinalizado (não é alterado),
 *     para o validador humano conferir.
 */

const MINIMO_DE_CODIGOS_PARA_PADRAO = 3;
const PROPORCAO_MINIMA_DO_PADRAO = 0.6;

function comprimentoSignificativo(codigo) {
  return String(codigo ?? "").replace(/[^A-Za-z0-9]/g, "").length;
}

/**
 * Comprimento (só letras e dígitos) predominante entre os códigos, ou null quando
 * não há dados suficientes ou nenhum comprimento é claramente majoritário.
 */
function comprimentoPadraoDosCodigos(codigos) {
  const comprimentos = codigos.map(comprimentoSignificativo).filter((n) => n > 0);
  if (comprimentos.length < MINIMO_DE_CODIGOS_PARA_PADRAO) return null;

  const contagem = new Map();
  for (const n of comprimentos) contagem.set(n, (contagem.get(n) ?? 0) + 1);

  let padrao = null;
  let maior = 0;
  for (const [n, qtd] of contagem) {
    if (qtd > maior) {
      padrao = n;
      maior = qtd;
    }
  }

  return maior / comprimentos.length >= PROPORCAO_MINIMA_DO_PADRAO ? padrao : null;
}

/**
 * Tenta separar uma quantidade colada na frente do código. Retorna null quando o
 * código não se encaixa no padrão de "quantidade + código".
 */
function separarQuantidadeDoCodigo(codigo, padrao) {
  const texto = String(codigo ?? "").trim();
  const partes = texto.split(/\s+/);
  if (partes.length < 2) return null;

  const [primeiro, ...resto] = partes;
  if (!/^\d{1,3}$/.test(primeiro)) return null;

  const restante = resto.join(" ");
  if (comprimentoSignificativo(restante) !== padrao) return null;

  return { quantidade: Number(primeiro), codigo: restante };
}

/**
 * Avalia um código isolado contra o padrão do catálogo (sem alterá-lo).
 */
function avaliarCodigoContraPadrao(codigo, padrao) {
  if (!padrao) return { suspeito: false, motivo: null };
  const tamanho = comprimentoSignificativo(codigo);
  if (tamanho > padrao) {
    return { suspeito: true, motivo: "código mais longo que o padrão do documento (pode conter outra coluna, como a quantidade)" };
  }
  return { suspeito: false, motivo: null };
}

/**
 * Corrige, na lista de peças extraídas, os códigos que vieram com a quantidade
 * colada na frente. Não altera peças que já estejam no padrão. Retorna as peças
 * (cópias) e a lista de índices corrigidos.
 */
function corrigirCodigosComQuantidade(pecas) {
  const padrao = comprimentoPadraoDosCodigos(pecas.map((p) => p.codigo));
  if (!padrao) return { pecas, corrigidas: [] };

  const corrigidas = [];
  const resultado = pecas.map((peca, indice) => {
    if (comprimentoSignificativo(peca.codigo) <= padrao) return peca;

    const separado = separarQuantidadeDoCodigo(peca.codigo, padrao);
    if (!separado) return peca;

    corrigidas.push(indice);
    return {
      ...peca,
      codigo: separado.codigo,
      // Mantém a quantidade lida pelo próprio Extrator quando existe; senão,
      // aproveita o número que estava colado no código.
      quantidade: peca.quantidade ?? separado.quantidade,
    };
  });

  return { pecas: resultado, corrigidas };
}

module.exports = {
  comprimentoPadraoDosCodigos,
  separarQuantidadeDoCodigo,
  avaliarCodigoContraPadrao,
  corrigirCodigosComQuantidade,
};
