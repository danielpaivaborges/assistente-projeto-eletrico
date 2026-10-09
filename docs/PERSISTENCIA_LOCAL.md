# Persistência local do projeto

## Escopo da v0.7

O anteprojeto é salvo automaticamente no armazenamento local do navegador. Nenhum dado é enviado pelo aplicativo para servidor externo nesta etapa.

## Chave e conteúdo

- Chave do navegador: `assistente-projeto-eletrico:projeto:v1`.
- Versão do formato: `1`.
- Conteúdo: nome do projeto, tipo de alimentação, tamanho do quadro, circuitos, ambientes e pontos.

O aplicativo só restaura dados cujo formato tenha a versão esperada e as coleções principais válidas. Em caso de conteúdo ausente, inválido ou incompatível, ele abre o modelo de exemplo sem interromper o uso.

## Limites

- Os dados pertencem ao navegador e ao dispositivo em uso.
- Limpar os dados do site/navegador, trocar de navegador ou usar uma janela anônima pode tornar o projeto indisponível.
- A opção **Restaurar modelo** pede confirmação e substitui o projeto local atual.
- A v0.7 ainda não possui exportação, importação nem sincronização em nuvem.
