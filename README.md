# Assistente de Projeto Elétrico

Ferramenta em construção para organizar anteprojetos de instalações elétricas residenciais no Brasil.

> Estado atual: **v0.6 — revisão rastreável do anteprojeto**. A aplicação organiza o imóvel, as cargas, os circuitos e as condições de instalação; também destaca inconsistências e dados faltantes, sem recomendar condutor ou proteção.

## O que já funciona

- Cadastro de circuitos e cargas.
- Cadastro de ambientes e pontos elétricos, com potência/tensão previstas por ambiente.
- Criação de circuitos a partir de pontos, com soma de potência, tensão conferida e vínculo rastreável.
- Cadastro por circuito de comprimento do trajeto, método de instalação, material do condutor, temperatura, agrupamento e contexto de proteção.
- Indicador de prontidão que separa dados pendentes, inválidos e completos para futura avaliação por regras técnicas.
- Painel de revisão que separa conflitos de dados, informações a completar e circuitos lançados manualmente.
- Conferência de rastreabilidade entre pontos, circuitos, alimentação e inventário, sem impor critérios normativos.
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

1. Registrar fontes, edição e casos de teste antes de introduzir qualquer regra técnica.
2. Avaliar queda de tensão somente após validar as regras e os dados necessários.
3. Separar a coleta de dispositivos de proteção da recomendação técnica.
4. Gerar relatório de anteprojeto rastreável, incluindo revisão, ambientes, pontos, trajetos e quadro.
