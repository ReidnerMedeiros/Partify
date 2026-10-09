/**
 * Apoio à recuperação do RF12 (Consulta Técnica via RAG): extrai da pergunta em
 * linguagem natural (a) os modelos de ferramenta citados e (b) as palavras-chave
 * do assunto. Funções puras, sem acesso a banco nem à IA. Servem para restringir
 * a busca ao catálogo certo e para somar uma busca por palavra-chave na descrição
 * à busca semântica (decisão #53 em CONTEXTO.md).
 */

// Palavras comuns que não identificam peça nenhuma (já sem acento e em minúsculas).
const PALAVRAS_IGNORADAS = new Set([
  "qual", "quais", "quanto", "quantos", "quanta", "quantas", "tenho", "tem", "existe", "existem", "para", "pelo",
  "pela", "pelos", "pelas", "como", "onde", "fica", "esse", "essa", "esses", "essas", "isso", "disso", "desse",
  "dessa", "numa", "nesse", "nessa", "mais", "menos", "muito", "entre", "sobre", "preciso", "precisa", "quero",
  "queria", "saber", "codigo", "codigos", "peca", "pecas", "item", "itens", "numero", "modelo", "marca", "qual",
  "correto", "correta", "certo", "certa", "possui", "possuem", "usa", "usam", "serve", "servem", "uma", "umas",
  "uns", "dele", "dela", "deles", "delas", "voce", "favor", "dessa", "desse", "dessas", "desses", "desta",
  "deste", "ferramenta", "ferramentas", "maquina", "maquinas",
]);

const MAXIMO_PALAVRAS_CHAVE = 6;

function semAcento(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function escaparRegex(caractere) {
  return caractere.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Regex que reconhece o modelo na pergunta ignorando espaços, hífens e pontos
 * entre os caracteres ("GBM 13", "gbm13" e "GBM-13" casam com o modelo "GBM 13")
 * e exigindo que não haja letra ou número colado antes/depois (para "GBM 13" não
 * casar dentro de "GBM 130"). Devolve null para modelos curtos demais.
 */
function montarRegexModelo(modelo) {
  const caracteres = semAcento(modelo).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (caracteres.length < 3) return null;
  const miolo = caracteres.split("").map(escaparRegex).join("[\\s\\-_./]*");
  return new RegExp(`(?<![a-z0-9])${miolo}(?![a-z0-9])`, "g");
}

/**
 * @param {string} pergunta
 * @param {string[]} modelosCadastrados modelos que existem nos catálogos validados.
 * @returns {string[]} modelos citados na pergunta. Quando um modelo está contido
 *   em outro mais longo citado no mesmo trecho ("GBM 13" dentro de "GBM 13 RE"),
 *   fica só o mais longo.
 */
function detectarModelos(pergunta, modelosCadastrados) {
  const texto = semAcento(pergunta ?? "").toLowerCase();
  const ocorrencias = [];

  for (const modelo of new Set(modelosCadastrados)) {
    const regex = montarRegexModelo(modelo);
    if (!regex) continue;
    for (const achado of texto.matchAll(regex)) {
      ocorrencias.push({ modelo, inicio: achado.index, fim: achado.index + achado[0].length });
    }
  }

  const finais = ocorrencias.filter(
    (a) => !ocorrencias.some((b) => b !== a && b.inicio <= a.inicio && b.fim >= a.fim && b.fim - b.inicio > a.fim - a.inicio)
  );

  return [...new Set(finais.map((o) => o.modelo))];
}

/**
 * @param {string} pergunta
 * @param {string[]} modelosDetectados trechos desses modelos são descartados antes
 *   de extrair as palavras (o modelo já vira filtro, não termo de busca).
 * @returns {string[]} palavras-chave sem acento, em minúsculas e no singular
 *   simples (tira o "s" final), no máximo MAXIMO_PALAVRAS_CHAVE.
 */
function extrairPalavrasChave(pergunta, modelosDetectados = []) {
  let texto = semAcento(pergunta ?? "").toLowerCase();

  for (const modelo of modelosDetectados) {
    const regex = montarRegexModelo(modelo);
    if (regex) texto = texto.replace(regex, " ");
  }

  const palavras = [];
  for (const token of texto.match(/[a-z0-9]+/g) ?? []) {
    if (token.length < 4 || /^\d+$/.test(token) || PALAVRAS_IGNORADAS.has(token)) continue;
    const singular = token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token;
    if (!palavras.includes(singular)) palavras.push(singular);
  }

  return palavras.slice(0, MAXIMO_PALAVRAS_CHAVE);
}

// Referências a algo já mencionado ("dessa ferramenta", "dele", "nela", "essa máquina").
const REFERENCIA_ANTERIOR =
  /(?<![a-z0-9])(dess[ae]s?|dest[ae]s?|dele|dela|nele|nela|mesm[ao]s?|ess[ae]s? (ferramenta|maquina|peca)|est[ae]s? (ferramenta|maquina))(?![a-z0-9])/;

/**
 * Indica se a pergunta se refere a uma ferramenta citada antes, sem nomeá-la.
 * Usado com o modelo da pergunta anterior que o próprio frontend reenvia (o
 * backend continua sem guardar histórico, pós-condição do RF12).
 */
function fazReferenciaAoAnterior(pergunta) {
  return REFERENCIA_ANTERIOR.test(semAcento(pergunta ?? "").toLowerCase());
}

module.exports = { detectarModelos, extrairPalavrasChave, fazReferenciaAoAnterior, semAcento };
