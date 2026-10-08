# Assistente de Projeto Elétrico

Ferramenta em construção para organizar anteprojetos de instalações elétricas residenciais no Brasil.

> Estado atual: **v0.3 — ambientes, pontos e motor preliminar**. A aplicação começa pelo imóvel, registra cargas previstas e organiza circuitos/fases, mas não recomenda seção de condutor ou proteção sem os dados técnicos necessários e regras validadas.

## O que já funciona

- Cadastro de circuitos e cargas.
- Cadastro de ambientes e pontos elétricos, com potência/tensão previstas por ambiente.
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

1. Registrar trajetos, distâncias e método de instalação por circuito.
2. Coletar parâmetros de instalação antes de habilitar regras de dimensionamento.
3. Introduzir regras técnicas com fonte/edição, casos de teste e revisão profissional.
4. Ligar pontos a circuitos e gerar um relatório de anteprojeto rastreável.
