# Assistente de Projeto Elétrico

Ferramenta em construção para organizar anteprojetos de instalações elétricas residenciais no Brasil.

> Estado atual: **v0.10 — experiência visual do anteprojeto**. A aplicação organiza o imóvel, as cargas, os circuitos e as condições de instalação; salva localmente, gera backup portátil, importa cópias compatíveis, imprime um relatório de conferência, preserva vínculos em edições e apresenta o fluxo com assets visuais originais de componentes residenciais.

## O que já funciona

- Cadastro de circuitos e cargas.
- Cadastro de ambientes e pontos elétricos, com potência/tensão previstas por ambiente.
- Criação de circuitos a partir de pontos, com soma de potência, tensão conferida e vínculo rastreável.
- Cadastro por circuito de comprimento do trajeto, método de instalação, material do condutor, temperatura, agrupamento e contexto de proteção.
- Indicador de prontidão que separa dados pendentes, inválidos e completos para futura avaliação por regras técnicas.
- Painel de revisão que separa conflitos de dados, informações a completar e circuitos lançados manualmente.
- Conferência de rastreabilidade entre pontos, circuitos, alimentação e inventário, sem impor critérios normativos.
- Edição de ambientes, pontos e circuitos já cadastrados, preservando a origem da carga.
- Exclusão protegida: ambiente com pontos e ponto vinculado a circuito não são removidos sem que o vínculo seja resolvido; ao excluir um circuito, seus pontos permanecem no inventário para nova organização.
- Recálculo da potência e da tensão de circuitos criados por pontos quando um ponto vinculado é alterado.
- Direção visual editorial, responsiva e própria, com ilustrações realistas originais de quadro de distribuição e dispositivos residenciais.
- Salvamento automático local do projeto no navegador, com restauração ao reabrir a página.
- Restauração consciente do modelo de exemplo, protegida por confirmação.
- Exportação de backup em JSON e importação confirmada de arquivos compatíveis.
- Relatório imprimível do anteprojeto, com cargas, circuitos, trajetos, revisão e quadro visual.
- Corrente nominal estimada por potência e tensão.
- Visualização de corrente por fase.
- Redistribuição heurística apenas de circuitos monofásicos; cargas entre fases são preservadas.
- Compatibilidade básica entre tensão, fase e tipo de alimentação.
- Ocupação visual preliminar de um quadro DIN.
- Registro explícito das regras e dos dados pendentes para dimensionamento.

## Limites importantes

O sistema ainda **não dimensiona** cabos, disjuntores, DR, DPS, queda de tensão ou curto-circuito. Essas decisões dependem de dados da instalação, das proteções e de regras técnicas que serão adicionadas somente com origem, versão e testes documentados.

Os resultados não substituem projeto, responsabilidade técnica ou validação por profissional habilitado.

## Dados do projeto

Nesta etapa, os dados são salvos apenas no armazenamento local do navegador em uso. Eles não são enviados para um servidor. Limpar os dados do navegador, usar outro dispositivo ou abrir em navegação anônima pode remover esse projeto; exporte um backup antes de qualquer limpeza ou troca de dispositivo.

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
- [Persistência local](docs/PERSISTENCIA_LOCAL.md)

## Próximas etapas

1. Registrar fontes, edição e casos de teste antes de introduzir qualquer regra técnica.
2. Avaliar queda de tensão somente após validar as regras e os dados necessários.
3. Evoluir o relatório para um documento exportável com histórico de revisões.
4. Planejar autenticação e sincronização somente depois de definir a política de privacidade e colaboração.
