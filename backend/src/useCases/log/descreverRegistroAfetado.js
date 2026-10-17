const TENSAO_LEGIVEL = Object.freeze({
  V127: "127V",
  V220: "220V",
  BIVOLT: "Bivolt",
});

function descreverFerramenta({ marca, modelo, tensao } = {}) {
  const base = [marca, modelo].filter(Boolean).join(" ");
  if (!base) return null;
  const tensaoLegivel = TENSAO_LEGIVEL[tensao];
  return tensaoLegivel ? `${base} (${tensaoLegivel})` : base;
}

/**
 * Texto legível para a coluna "Registro Afetado" do Histórico do Sistema (RF13).
 * O log guarda o identificador técnico (UUID) em `registroAfetado`, que não diz
 * nada ao usuário; aqui montamos uma descrição a partir do que o próprio registro
 * já guardou em `detalhes` no momento da ação (nome do arquivo, ferramenta, nome
 * da empresa ou do usuário) e do nome dos usuários da instância. Como o log é
 * imutável, a descrição reflete o estado da época, mesmo que o nome mude depois.
 *
 * Devolve `null` quando não há nada melhor que o identificador técnico; nesse
 * caso a tela mostra o próprio identificador.
 */
function descreverRegistroAfetado({ tipoAcao, registroAfetado, detalhes }, nomePorUsuarioId) {
  const dados = detalhes && typeof detalhes === "object" ? detalhes : {};
  const nomeDoUsuarioAfetado = registroAfetado ? nomePorUsuarioId.get(registroAfetado) : undefined;

  switch (tipoAcao) {
    case "LOGIN":
    case "LOGOUT":
    case "ALTERACAO_SENHA":
    case "ATIVAR_DESATIVAR_USUARIO":
      return nomeDoUsuarioAfetado ? `Usuário ${nomeDoUsuarioAfetado}` : null;

    case "CRIACAO_USUARIO":
      return dados.nome ? `Usuário ${dados.nome}` : null;

    case "EDICAO_USUARIO":
      return nomeDoUsuarioAfetado ? `Usuário ${nomeDoUsuarioAfetado}` : dados.novo?.nome ? `Usuário ${dados.novo.nome}` : null;

    case "CRIACAO_EMPRESA":
      return dados.nome ? `Empresa ${dados.nome}` : null;

    case "ATIVAR_DESATIVAR_EMPRESA":
      return "Dados da empresa";

    case "UPLOAD_VISTA_EXPLODIDA":
    case "EXTRACAO_IA":
    case "ARQUIVAMENTO_DOCUMENTO":
      return dados.nomeArquivo ? `Catálogo ${dados.nomeArquivo}` : null;

    case "VALIDACAO_HITL": {
      const ferramenta = descreverFerramenta(dados);
      return ferramenta ? `Catálogo ${ferramenta}` : null;
    }

    case "EDICAO_REGISTRO": {
      // Edição de catálogo guarda a ferramenta em `novo`; edição da empresa guarda o nome.
      const ferramenta = descreverFerramenta(dados.novo);
      if (ferramenta) return `Catálogo ${ferramenta}`;
      if (dados.novo?.nome || dados.anterior?.nome) return `Empresa ${dados.novo?.nome ?? dados.anterior.nome}`;
      return "Dados da empresa";
    }

    case "EXCLUSAO_REGISTRO": {
      if (dados.codigo) return `Peça ${dados.codigo}`;
      const ferramenta = descreverFerramenta(dados);
      if (ferramenta) return `Catálogo ${ferramenta}`;
      return dados.nomeArquivo ? `Catálogo ${dados.nomeArquivo}` : null;
    }

    case "ACESSO_NAO_AUTORIZADO":
      // Tentativa com login inexistente guarda o texto digitado; conta inativa guarda o id.
      return nomeDoUsuarioAfetado ? `Usuário ${nomeDoUsuarioAfetado}` : registroAfetado ? `Login ${registroAfetado}` : null;

    default:
      return null;
  }
}

module.exports = { descreverRegistroAfetado };
