# Assistente de Projeto Elétrico

Protótipo inicial de uma ferramenta para organizar anteprojetos de instalações elétricas residenciais no Brasil.

> Estado atual: interface funcional de demonstração. Os resultados são de pré-dimensionamento e devem ser validados por profissional habilitado antes de qualquer execução.

## O que já funciona

- Cadastro de circuitos e cargas;
- Cálculo ilustrativo de corrente por circuito;
- Distribuição automática de circuitos monofásicos entre as fases A, B e C;
- Visão visual de ocupação do quadro em trilho DIN;
- Lista inicial de disjuntores, módulos e etiquetas.

## Como testar

Abra o arquivo **dist/index.html** em qualquer navegador moderno. Não há dependências nem instalação nesta primeira versão.

## Próximas etapas

1. Estruturar o motor técnico com regras versionadas e casos de teste;
2. Incluir parâmetros de instalação, método de referência e queda de tensão;
3. Modelar DR, DPS, barramentos, circuitos de reserva e relatório;
4. Validar resultados com profissional habilitado antes de oferecer dimensionamentos como definitivos.

## Princípio do produto

O sistema deve tornar o projeto mais claro e organizado, nunca substituir responsabilidade técnica, normas aplicáveis ou a conferência de uma instalação real.
