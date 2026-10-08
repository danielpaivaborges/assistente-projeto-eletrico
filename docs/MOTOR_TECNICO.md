# Motor técnico

## Estado atual

O motor está em estado **preliminar**. Ele separa a lógica de cálculo da interface e deixa explícito aquilo que ainda não pode ser dimensionado com segurança.

## O que já calcula

- Corrente nominal estimada por `I = P / V` para uma carga informada.
- Corrente acumulada nas fases atribuídas a cada circuito.
- Sugestão heurística de distribuição para circuitos monofásicos.
- Preservação de circuitos entre fases durante o ajuste automático.
- Compatibilidade básica entre tensões/fases e o tipo de alimentação escolhido.
- Ocupação visual do quadro a partir da quantidade de polos informada/atribuída.
- Validação de ambientes e pontos elétricos antes de incorporá-los ao inventário do projeto.
- Resumo de pontos e potência prevista por ambiente, sem inferir quantitativos normativos.
- Criação de circuito a partir de pontos da mesma tensão, com potência somada e fase sugerida.
- Rastreabilidade entre ponto e circuito, incluindo detecção de ponto duplicado ou inexistente.

## O que ainda não dimensiona

- Seção de condutor.
- Disjuntor, DR ou DPS.
- Capacidade de condução de corrente.
- Queda de tensão.
- Curto-circuito, seletividade, coordenação ou aterramento.
- Quantitativos de cabos e eletrodutos.

Essas decisões dependem, entre outros fatores, de método de instalação, material do condutor, temperatura, agrupamento, percurso, proteção e dados da concessionária. O sistema registra esses campos como pendentes em vez de preencher valores aparentemente definitivos.

## Regra de segurança do produto

Todo cálculo deve informar:

1. o identificador/versão da regra usada;
2. os dados de entrada utilizados;
3. as premissas e limitações;
4. o resultado como estimativa, verificação ou pendência;
5. quando for necessário, a revisão por profissional habilitado.

O repositório não reproduz o texto de normas. Quando regras técnicas forem introduzidas, elas serão registradas por requisito, fonte/edição e teste automatizado.
