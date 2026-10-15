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

const { removerPrefixoPeloFormatoDaMarca, codigoCombinaComMarca } = require("./formatoCodigoMarca");

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
 * Remove o número colado na frente do código quando o formato conhecido da marca
 * confirma (ver formatoCodigoMarca.js). Código que já bate com a marca não é tocado.
 */
function corrigirPrefixoPeloFormatoDaMarca(pecas, marca) {
  const corrigidas = [];
  const resultado = pecas.map((peca, indice) => {
    const separado = removerPrefixoPeloFormatoDaMarca(peca.codigo, marca);
    if (!separado) return peca;
    corrigidas.push(indice);
    return { ...peca, codigo: separado.codigo, quantidade: peca.quantidade ?? separado.prefixo };
  });
  return { pecas: resultado, corrigidas };
}

const MINIMO_DE_PECAS_COM_QUANTIDADE = 3;
const PROPORCAO_MINIMA_COM_PREFIXO_IGUAL = 0.8;

/**
 * Poluição sistemática: o Extrator leu a quantidade corretamente no campo próprio
 * mas também a colou na frente do código, em (quase) todas as linhas. Caso real:
 * Bosch GBM 10, colunas "N° | Un | N° de peça", linha "3 | 1 | 9 618 086 800"
 * extraída como código "1 9 618 086 800" e quantidade 1; linha "13 | 2 | 1 900 905
 * 029" extraída como "2 1 900 905 029" e quantidade 2.
 *
 * Sinal usado: o primeiro trecho do código é IGUAL à quantidade da própria peça. Para
 * não estragar códigos legítimos que começam por número pequeno (ex.: "1 600 A00
 * 4GD"), só age quando TODAS as condições valem:
 *   - há ao menos 3 peças com quantidade e código de 2+ trechos;
 *   - pelo menos 80% delas têm o primeiro trecho igual à própria quantidade;
 *   - ao menos uma dessas tem quantidade 2 ou mais (coincidir com o valor 1 é fácil;
 *     coincidir em 2, 7... em quase todas as linhas só acontece com a coluna colada).
 * Nas peças que casam, remove o prefixo. A quantidade já lida é mantida.
 */
function corrigirPrefixoIgualAQuantidade(pecas, marca) {
  const primeiroTrecho = (codigo) => String(codigo ?? "").trim().split(/\s+/);
  const casa = (peca) => {
    if (!Number.isInteger(peca.quantidade)) return false;
    // Código que já bate com o formato conhecido da marca é legítimo: nunca é alterado.
    if (codigoCombinaComMarca(peca.codigo, marca) === true) return false;
    const trechos = primeiroTrecho(peca.codigo);
    return trechos.length >= 2 && trechos[0] === String(peca.quantidade);
  };
  const consideradas = pecas.filter((peca) => Number.isInteger(peca.quantidade) && primeiroTrecho(peca.codigo).length >= 2);
  if (consideradas.length < MINIMO_DE_PECAS_COM_QUANTIDADE) return { pecas, corrigidas: [] };

  const casadas = consideradas.filter(casa);
  const temQuantidadeMaiorQueUm = casadas.some((peca) => peca.quantidade >= 2);
  if (!temQuantidadeMaiorQueUm || casadas.length / consideradas.length < PROPORCAO_MINIMA_COM_PREFIXO_IGUAL) {
    return { pecas, corrigidas: [] };
  }

  const corrigidas = [];
  const resultado = pecas.map((peca, indice) => {
    if (!casa(peca)) return peca;
    corrigidas.push(indice);
    return { ...peca, codigo: primeiroTrecho(peca.codigo).slice(1).join(" ") };
  });
  return { pecas: resultado, corrigidas };
}

/**
 * Corrige, na lista de peças extraídas, os códigos que vieram com a quantidade
 * colada na frente. Não altera peças que já estejam no padrão. Retorna as peças
 * (cópias) e a lista de índices corrigidos.
 */
function corrigirCodigosComQuantidade(pecasExtraidas, { marca } = {}) {
  // 1ª passada: formato conhecido da marca. Só age onde o código, como veio, NÃO bate
  // com o formato da marca e, sem o número colado na frente, bate. Não depende da
  // estatística do documento. Sem marca conhecida, não faz nada.
  const porMarca = corrigirPrefixoPeloFormatoDaMarca(pecasExtraidas, marca);
  // 2ª passada: poluição SISTEMÁTICA (o documento todo, ou quase, veio com a coluna
  // de quantidade colada). Nesse caso o "comprimento padrão" já seria o errado, então
  // a regra do comprimento (3ª passada) não enxerga o problema.
  const sistematica = corrigirPrefixoIgualAQuantidade(porMarca.pecas, marca);
  const corrigidas = [...new Set([...porMarca.corrigidas, ...sistematica.corrigidas])];
  const pecasAposPrimeiras = sistematica.pecas;

  const padrao = comprimentoPadraoDosCodigos(pecasAposPrimeiras.map((p) => p.codigo));
  if (!padrao) return { pecas: pecasAposPrimeiras, corrigidas };

  const resultado = pecasAposPrimeiras.map((peca, indice) => {
    if (comprimentoSignificativo(peca.codigo) <= padrao) return peca;

    const separado = separarQuantidadeDoCodigo(peca.codigo, padrao);
    if (!separado) return peca;

    if (!corrigidas.includes(indice)) corrigidas.push(indice);
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
