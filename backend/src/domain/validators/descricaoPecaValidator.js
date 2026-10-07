/**
 * Avalia se a descrição (designação) de uma peça parece INCOMPLETA.
 *
 * Contexto: catálogos como os da Bosch truncam a coluna "Designação" num tamanho
 * fixo, então o PDF traz textos como "MANCAL DO" ou "SUPORTE DE" (a palavra final
 * se perdeu no próprio documento). O Agente Extrator transcreve fielmente o que
 * está escrito, então a incompletude precisa ser sinalizada ao validador humano
 * (RF08) em vez de ser "corrigida" por palpite.
 *
 * A avaliação é deliberadamente genérica (não depende de uma lista fechada de
 * palavras). Combina sinais independentes, e basta um para marcar como incompleta:
 *   1. descrição ausente;
 *   2. termina em palavra de ligação (artigo, preposição, conjunção);
 *   3. termina em sinal que pede continuação (hífen, barra, vírgula, "=", etc.);
 *   4. parêntese aberto e nunca fechado;
 *   5. termina em sigla de norma sem o número (DIN, ISO, NBR...);
 *   6. última palavra aparentemente cortada no meio (ex.: "PORCA SEXT").
 *
 * É uma dica para o humano, não uma regra de bloqueio: falsos positivos só geram
 * um aviso na tela de validação.
 */

const PALAVRAS_DE_LIGACAO = new Set([
  "A", "AS", "O", "OS", "UM", "UMA", "UNS", "UMAS",
  "DE", "DO", "DA", "DOS", "DAS", "EM", "NO", "NA", "NOS", "NAS",
  "AO", "AOS", "PARA", "PRA", "POR", "PELO", "PELA", "PELOS", "PELAS",
  "COM", "SEM", "SOB", "SOBRE", "ENTRE", "ATE", "E", "OU", "QUE",
  "P/", "C/", "S/", "P", "C", "S",
]);

const SIGLAS_DE_NORMA = new Set(["DIN", "ISO", "NBR", "EN", "IEC", "VDE", "ANSI", "SAE"]);

// Palavras técnicas curtas e termos estrangeiros comuns que terminam em consoante
// "estranha" para o português, mas estão completos.
const EXCECOES_ULTIMA_PALAVRA = new Set([
  "KIT", "SET", "CLIP", "GRIP", "PLUG", "STOP", "SPRING", "RING", "PAD", "FLAP",
  "TOP", "LED", "PVC", "ABS", "USB", "LCD", "MOTOR", "SLIP", "SNAP", "BIT", "BITS",
]);

// Consoantes em que palavras completas do português (e dos termos técnicos
// usuais) costumam terminar. Terminar em outra consoante sugere corte.
const CONSOANTES_FINAIS_NORMAIS = new Set(["R", "S", "L", "M", "Z", "X", "N"]);

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function avaliarDescricaoPeca(descricao) {
  const texto = normalizar(descricao);

  if (!texto) {
    return { incompleta: true, motivos: ["descrição ausente"] };
  }

  const motivos = [];
  const palavras = texto.split(" ");
  const ultima = palavras[palavras.length - 1];
  // Ignora pontuação de borda na última palavra (ex.: "(DE" ou "DE.") para a
  // comparação com as listas abaixo; a barra final é mantida ("C/", "P/").
  const ultimaSemPonto = ultima.replace(/^[("'[]+/, "").replace(/[.,;:)"'\]]+$/, "");

  if (PALAVRAS_DE_LIGACAO.has(ultimaSemPonto)) {
    motivos.push("termina em palavra de ligação");
  }

  if (/[-/,(+:=&]$/.test(texto)) {
    motivos.push("termina em sinal que indica continuação");
  }

  const abertos = (texto.match(/\(/g) ?? []).length;
  const fechados = (texto.match(/\)/g) ?? []).length;
  if (abertos > fechados) {
    motivos.push("parêntese aberto e não fechado");
  }

  if (SIGLAS_DE_NORMA.has(ultimaSemPonto)) {
    motivos.push("termina em sigla de norma sem o número");
  }

  if (/^[A-Z]{4,}$/.test(ultimaSemPonto) && palavras.length > 1) {
    const ultimaLetra = ultimaSemPonto[ultimaSemPonto.length - 1];
    const terminaEmVogal = "AEIOU".includes(ultimaLetra);
    if (!terminaEmVogal && !CONSOANTES_FINAIS_NORMAIS.has(ultimaLetra) && !EXCECOES_ULTIMA_PALAVRA.has(ultimaSemPonto)) {
      motivos.push("última palavra aparentemente cortada");
    }
  }

  return { incompleta: motivos.length > 0, motivos };
}

module.exports = { avaliarDescricaoPeca };
