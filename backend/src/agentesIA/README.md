# Agentes de IA

Camada isolada dos três agentes especializados descritos no DERS (seção 7.2). Cada
agente é uma implementação concreta de uma interface de `domain/services/` (o
contrato abstrato), chamada exclusivamente por um Use Case de `useCases/` — nunca
diretamente por um Controller. Isso mantém o Domínio isolado de qualquer detalhe
da Gemini API, conforme o Diagrama de Componentes (Figura 42) e o Diagrama de
Classe (Figura 39) do DERS.

Cada um dos 3 agentes tem sua própria pasta e sua própria classe — mesmo quando
duas classes de agentes diferentes fazem tecnicamente a mesma chamada de API
(`embedContent`), a divisão de responsabilidades entre os agentes é explícita e
intencional: evita concentrar tudo no Agente Extrator, seguindo o DERS à risca
(decisão #25 em `CONTEXTO.md`).

```
agentesIA/
├── AgenteExtrator/
│   ├── GeminiExtractionService.js   # RF07 — extração multimodal + comparação
│   │                                  # com o documento original (implementa
│   │                                  # ExtractionService)
│   └── prompts/
│       └── extracaoPrompt.js        # instrução de sistema + defesa contra prompt injection
├── AgenteValidador/
│   └── GeminiEmbeddingService.js    # RF08/RF09 — geração de embeddings, só
│                                       # depois da confirmação humana (implementa
│                                       # EmbeddingService)
└── AgenteConsulta/
    ├── GeminiEmbeddingService.js    # RF11/RF12 — vetoriza termo de busca/pergunta
    │                                  # (implementa EmbeddingService, instância
    │                                  # própria, separada da do AgenteValidador)
    ├── GeminiRAGService.js          # RF12 — geração da resposta fundamentada em
    │                                  # contexto (implementa RAGService)
    └── prompts/
        └── consultaPrompt.js        # instrução de sistema + defesa contra prompt
                                        # injection + restrição RN01 (nunca
                                        # responder com conhecimento externo)
```

- **AgenteExtrator** (RF07 — Extração Multimodal via IA): **implementado**, em `AgenteExtrator/GeminiExtractionService.js`. Sua ÚNICA responsabilidade é ler o PDF e devolver marca/modelo/tensão/peças, com um índice de confiança por campo calculado pela própria IA ao comparar sua extração com o documento original — nada de embeddings, nada de persistência, nada de geração de resposta. Orquestrado por `useCases/catalogo/ExtrairDadosCatalogoUseCase.js`, que decide o status do Catalogo (PENDENTE_VALIDACAO / IRRESOLUVEL) a partir do resultado.

- **AgenteValidador** (RF08 — Interface de Validação HITL): **implementado**. Quem "valida" de fato é a pessoa (Técnico/Vendedor/Administrador) na tela `ValidarCatalogoPage` — a IA não decide nada aqui, o humano confirma/corrige os dados extraídos pelo Agente Extrator. A responsabilidade de IA do Agente Validador é gerar os embeddings das peças (`AgenteValidador/GeminiEmbeddingService.js`), acionada só DEPOIS que o humano confirma os dados (`ValidarCatalogoUseCase`/RF08 e `AtualizarCatalogoUseCase`/RF09) — nunca antes, pra não vetorizar uma descrição que a IA errou e que o validador ainda vai corrigir (decisão #16 em `CONTEXTO.md`). O Use Case também persiste a decisão humana (`Validacao` + log de auditoria).

- **AgenteConsulta** (RF11/RF12 — busca híbrida e RAG via pgvector): **implementado**. Responsável por TODAS as atividades de consulta: no RF11 (`BuscarComponentesUseCase`), vetoriza o termo de busca (`AgenteConsulta/GeminiEmbeddingService.js`) para a busca semântica via pgvector, combinada com correspondência exata por código; no RF12 (`ConsultarViaRagUseCase`), reaproveita a mesma vetorização para a pergunta, recupera contexto (mesmo método de busca semântica do RF11) e gera a resposta em linguagem natural fundamentada nesse contexto (`AgenteConsulta/GeminiRAGService.js`), nunca em conhecimento externo do modelo (RN01).
