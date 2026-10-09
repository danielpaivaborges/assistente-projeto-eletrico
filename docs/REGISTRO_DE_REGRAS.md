# Registro de regras

Este arquivo é o inventário de regras do produto. Uma regra só passa a afetar uma recomendação técnica após ter fonte, escopo, entradas e testes definidos.

| ID | Assunto | Estado | Entradas exigidas | Evidência/teste |
| --- | --- | --- | --- | --- |
| E-001 | Corrente nominal `I = P / V` | Implementada — matemática | potência e tensão positivas | `electrical-engine.test.js` |
| E-002 | Soma por fase | Implementada — modelo de carga | fase(s), potência e tensão | `electrical-engine.test.js` |
| E-003 | Redistribuição de monofásicos | Implementada — heurística, não normativa | fases disponíveis e cargas | `electrical-engine.test.js` |
| E-004 | Inventário de ambientes e pontos | Implementada — organização de dados | ambiente, ponto, potência e tensão | `electrical-engine.test.js` |
| E-005 | Vínculo entre pontos e circuitos | Implementada — rastreabilidade | pontos selecionados, tensão e circuito | `electrical-engine.test.js` |
| E-006 | Prontidão de dados de instalação | Implementada — validação de entrada, não dimensionamento | método, material, temperatura, agrupamento, comprimento e contexto de proteção | `electrical-engine.test.js` |
| E-007 | Revisão de consistência do anteprojeto | Implementada — organização e rastreabilidade, não normativa | circuitos, pontos, ambientes, alimentação e dados de instalação | `electrical-engine.test.js` |
| E-008 | Edição e exclusão rastreável | Implementada — integridade de dados, não normativa | identificadores, vínculos entre ambiente, ponto e circuito, alimentação | `electrical-engine.test.js`, `app.editing.test.js` |
| E-010 | Seção de condutor | Bloqueada | método, material, temperatura, agrupamento, trajeto e demais condições | fonte técnica e casos de teste pendentes |
| E-011 | Disjuntor e proteção | Bloqueada | corrente, condutor, método, coordenação e condições de proteção | fonte técnica e casos de teste pendentes |
| E-012 | Queda de tensão | Bloqueada | comprimento, condutor, circuito e demanda | fonte técnica e casos de teste pendentes |

## Convenções

- **Implementada — matemática**: operação verificável que não escolhe um componente elétrico.
- **Implementada — heurística**: ajuda de organização; exige revisão humana.
- **Bloqueada**: o produto coleta ou listará as informações, mas não gera recomendação técnica até a regra estar validada e testada.
