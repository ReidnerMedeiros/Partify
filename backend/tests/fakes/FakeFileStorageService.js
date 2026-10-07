/**
 * Implementação em memória de FileStorageService para os testes unitários.
 */
class FakeFileStorageService {
  constructor() {
    this.arquivos = new Map();
    this.contador = 0;
  }

  async salvar({ buffer, nomeOriginal }) {
    this.contador += 1;
    const caminho = `fake/${this.contador}-${nomeOriginal}`;
    this.arquivos.set(caminho, buffer);
    return caminho;
  }

  async obterBuffer(caminhoArquivo) {
    return this.arquivos.get(caminhoArquivo) ?? null;
  }

  async excluir(caminhoArquivo) {
    if (this.deveFalharAoExcluir) {
      throw new Error("falha simulada ao excluir arquivo");
    }
    this.arquivos.delete(caminhoArquivo);
  }
}

module.exports = { FakeFileStorageService };
