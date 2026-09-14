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
}

module.exports = { FakeFileStorageService };
