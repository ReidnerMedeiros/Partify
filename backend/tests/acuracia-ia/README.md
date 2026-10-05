# Teste de Acurácia da IA (RNF10)

Mede a taxa de acerto real da extração do Agente Extrator (RF07) contra a Gemini API de verdade, comparando com um gabarito (dados corretos, anotados manualmente a partir do PDF original).

## Como rodar

1. Coloque os PDFs reais na pasta `pdfs/` (criada localmente, git-ignorada — são catálogos com direitos do fabricante). Os nomes de arquivo precisam bater com o campo `"arquivo"` de cada gabarito em `gabaritos/`:
   - `pdfs/makita-hr2470.pdf`
   - `pdfs/dewalt-d28496mbr.pdf`
   - `pdfs/bosch-gws6-115.pdf`
2. Confirme que `backend/.env` tem `GEMINI_API_KEY` e `GEMINI_MODEL` configurados.
3. A partir da pasta `backend/`, rode:
   ```bash
   npm run teste:acuracia
   ```
4. O script chama a Gemini API de verdade pra cada PDF, compara com o gabarito e imprime um relatório no console com: acurácia de campos gerais (marca/modelo/tensão), acurácia de peças (código + posição visual — o binômio do RN04), e a comparação final com a meta do RNF10 (≥75%).

## Adicionando mais catálogos ao teste

Crie um novo arquivo em `gabaritos/nome-do-catalogo.json`, seguindo o formato:

```json
{
  "arquivo": "nome-do-arquivo.pdf",
  "marca": "...",
  "modelo": "...",
  "tensao": "...",
  "pecas": [
    { "codigo": "...", "descricao": "...", "posicaoVisual": "..." }
  ]
}
```

E coloque o PDF correspondente em `pdfs/`. O script processa todos os arquivos `.json` da pasta `gabaritos/` automaticamente.

## Custo e periodicidade

Cada execução chama a Gemini API uma vez por PDF (custo de fração de centavo cada, já documentado no `CONTEXTO.md`). Não é rodado no CI — é manual, sob demanda, quando quiser reavaliar a acurácia (ex.: depois de trocar o `GEMINI_MODEL`, ou adicionar mais catálogos de teste).
