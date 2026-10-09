# Assistente de Projeto Elétrico

Ferramenta em construção para organizar anteprojetos de instalações elétricas residenciais no Brasil.

> Estado atual: **v0.5 — condições de instalação rastreáveis**. A aplicação começa pelo imóvel, registra cargas previstas, permite criar circuitos a partir dos pontos selecionados e coleta os dados físicos mínimos por circuito, mas não recomenda seção de condutor ou proteção sem regras validadas.

## O que já funciona

- Cadastro de circuitos e cargas.
- Cadastro de ambientes e pontos elétricos, com potência/tensão previstas por ambiente.
- Criação de circuitos a partir de pontos, com soma de potência, tensão conferida e vínculo rastreável.
- Cadastro por circuito de comprimento do trajeto, método de instalação, material do condutor, temperatura, agrupamento e contexto de proteção.
- Indicador de prontidão que separa dados pendentes, inválidos e completos para futura avaliação por regras técnicas.
- Corrente nominal estimada por potência e tensão.
- Visualização de corrente por fase.
- Redistribuição heurística apenas de circuitos monofásicos; cargas entre fases são preservadas.
- Compatibilidade básica entre tensão, fase e tipo de alimentação.
- Ocupação visual preliminar de um quadro DIN.
- Registro explícito das regras e dos dados pendentes para dimensionamento.

## Limites importantes

O sistema ainda **não dimensiona** cabos, disjuntores, DR, DPS, queda de tensão ou curto-circuito. Essas decisões dependem de dados da instalação, das proteções e de regras técnicas que serão adicionadas somente com origem, versão e testes documentados.

Os resultados não substituem projeto, responsabilidade técnica ou validação por profissional habilitado.

## Estrutura

```text
src/engine/   motor de cálculo testado
src/app.js    interface do navegador
dist/         versão estática pronta para abrir/publicar
docs/         escopo técnico e registro de regras
```

## Como executar

Não há dependências externas nesta etapa.

```bash
npm run check
```

O comando atualiza os arquivos de navegador em `dist/` e executa os testes do motor. Depois, abra `dist/index.html` em um navegador moderno.

## Documentação técnica

- [Motor técnico](docs/MOTOR_TECNICO.md)
- [Registro de regras](docs/REGISTRO_DE_REGRAS.md)

## Próximas etapas

1. Introduzir regras técnicas com fonte/edição, casos de teste e revisão profissional.
2. Avaliar queda de tensão somente após validar as regras e os dados necessários.
3. Separar a coleta de dispositivos de proteção da recomendação técnica.
4. Gerar relatório de anteprojeto rastreável, incluindo ambientes, pontos, trajetos e quadro.
