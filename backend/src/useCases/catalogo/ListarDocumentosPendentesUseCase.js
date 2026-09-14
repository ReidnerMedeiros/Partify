// RF10 — fluxo básico (fila de pendentes). Lista os catálogos IRRESOLUVEL da
// empresa (RF07/A1 extração parcial ou E2 documento ilegível), com uma
// classificação de exibição derivada dos camposAusentes já persistidos:
// "IRRESOLUVEL" quando nada do documento (marca/modelo/tensão) foi
// identificado, "PENDENTE" quando ao menos parte foi reconhecida. Essa
// distinção "Pendente"/"Irresolúvel"/"Em edição" do Quadro 25 do DERS não é um
// status persistido separado no schema (StatusCatalogo continua com um único
// IRRESOLUVEL, decisão já tomada no RF07) — é só um rótulo de apresentação
// calculado aqui. "Em edição" não é modelado: não há edição colaborativa/
// concorrente no sistema (RF10/A1 simplesmente navega para a tela do RF08).
const CAMPOS_DO_DOCUMENTO = ["marca", "modelo", "tensao"];

class ListarDocumentosPendentesUseCase {
  constructor({ catalogoRepository }) {
    this.catalogoRepository = catalogoRepository;
  }

  async execute({ empresaId }) {
    const catalogos = await this.catalogoRepository.listarPendentes({ empresaId });
    return catalogos.map((catalogo) => ({
      ...catalogo,
      situacao: this.#classificarSituacao(catalogo.camposAusentes),
    }));
  }

  #classificarSituacao(camposAusentes) {
    const ausentes = camposAusentes ?? [];
    const nadaIdentificado = CAMPOS_DO_DOCUMENTO.every((campo) => ausentes.includes(campo));
    return nadaIdentificado ? "IRRESOLUVEL" : "PENDENTE";
  }
}

module.exports = { ListarDocumentosPendentesUseCase };
