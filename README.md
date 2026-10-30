# ITN003 — Client

Interface React com TypeScript e Vite. Requer Node.js 22.

```powershell
npm install
npm run dev
```

O frontend escolhe automaticamente uma porta livre. Use a URL exibida pelo Vite no terminal, inclusive em `npm run preview`.

Para configurar uma porta preferida e o endereço da API:

```powershell
Copy-Item .env.example .env
```

Edite `.env`:

```dotenv
CLIENT_PORT=0
API_TARGET=http://127.0.0.1:3000
```

`CLIENT_PORT=0` deixa o sistema escolher uma porta livre. Se informar outra porta e ela estiver ocupada, o Vite tentará uma próxima disponível. Também pode executar `npm run dev -- --port 5200`. Reinicie o Vite depois de alterar `.env`.

Execute o server separadamente. O proxy `/api` usa `API_TARGET` e está configurado em `vite.config.ts`.

```powershell
npm run build
npm run preview
```

Em produção, configure o servidor de hospedagem para encaminhar `/api` à API NestJS; o proxy do Vite é apenas de desenvolvimento.

Repositório independente do server, com package-lock.json e node_modules próprios.

## Preparação da remessa

Importe o JSON original para iniciar na aba **A revisar**. Cada ato precisa de uma decisão: **Manter** ou **Excluir**. Ambos saem da fila; somente os mantidos entram no JSON final. Fechar o modal ou escolher **Revisar depois** não conclui o ato.

As abas **Mantidos**, **Excluídos** e **Todos** permitem conferir as decisões. Use **Voltar à fila** para desfazer uma decisão, preservando sua anotação.

**Salvar preparação** baixa um arquivo `*-preparacao.json` com o JSON original intacto, decisões e anotações. Para continuar depois, importe esse arquivo pelo mesmo botão de importação; o sistema refaz a auditoria com as regras atuais e restaura suas decisões. Esse arquivo é para uso no aplicativo, não é a remessa ao ONR. Não há salvamento automático; salve antes de fechar a página.

**Gerar JSON final** só fica disponível quando todos os atos estiverem revisados e houver pelo menos um mantido. O arquivo final preserva os dados dos atos mantidos, exclui os demais e não incorpora as anotações. As pendências estruturais dos mantidos continuam visíveis e não são corrigidas automaticamente.

```powershell
npm test
```

## Complementar a auditoria com o legado

Após importar o JSON, clique em **Consultar atos do JSON**. Os títulos e serviços localizados aparecem na tabela com a indicação “legado”; o modal mostra também as datas de registro e selagem, classificação, georreferenciamento e eventual cancelamento. As informações do JSON continuam separadas das informações atuais do banco.

Resultados ambíguos não recebem descrição automaticamente. Atos não localizados são indicados no modal. Atos de abertura localizados pelo número zero mostram um aviso se o tipo no legado diferir do JSON. As consultas exigem a conexão configurada no server e não fazem alterações no banco.

Os resultados da consulta são incluídos no relatório de auditoria, com data de consulta, e nunca inseridos na remessa final. Ao reabrir uma preparação, consulte novamente o legado para obter os dados atuais.

### Consulta ao legado pela aplicação

A consulta está disponível novamente por autorização do usuário. Após importar o JSON, clique em **Consultar atos do JSON**. A consulta ocorre pelo backend; a importação não consulta o banco automaticamente. A senha permanece no servidor e os dados complementares são exibidos apenas na interface e no relatório da aplicação, sem alterar o JSON original.

## Visualizar a minuta

Depois de consultar os atos do JSON, abra **Revisar** e clique em **Ver minuta do ato**, na seção **Dados do sistema legado**. O texto é consultado somente ao clicar. A visualização usa `public.ato.texto` do ato localizado de forma única, sem presumir que seja a versão assinada.

HTML é exibido com uma lista restrita de elementos de formatação, sem scripts, links, imagens ou estilos externos. A minuta não é adicionada à preparação, ao relatório nem ao JSON de remessa; fica na memória do modal e é descartada ao fechá-lo.

## Salvar andamento no servidor

Use **Salvar andamento** em qualquer etapa, inclusive com atos pendentes ou anotações em edição. O servidor grava arquivos locais em `server/data/preparations/`, uma pasta ignorada pelo Git. O arquivo salvo contém o JSON original, as decisões e os motivos; não contém a minuta consultada no legado. O JSON original não é sobrescrito.

Em **Auditorias salvas**, escolha **Continuar revisão**. O aplicativo restaura o progresso e refaz a auditoria. Mudanças posteriores aparecem como não salvas; o salvamento é manual. Antes de abrir outro arquivo ou auditoria, o andamento atual é salvo automaticamente se houver alterações. Se não for possível salvar, a troca é interrompida para preservar o trabalho atual.

**Baixar preparação** continua disponível como cópia portátil, que pode ser importada em outra instalação. **Gerar JSON final** permanece separado e exige a conclusão da fila.

As gravações usam arquivo temporário e substituição por renomeação. O controle de revisão evita que uma aba sobrescreva silenciosamente uma versão mais recente. Os arquivos ficam no disco da máquina que executa o server; para backup, preserve `server/data/preparations/` ou baixe as preparações.

### Minuta pela tabela

Clique no nome ou no número do ato, ou em **Ver minuta**, diretamente na tabela. Um modal próprio abre a minuta sem entrar em **Revisar** nem alterar decisões. Se o ato ainda não tiver sido consultado, a API localiza somente esse registro; se houver identificação ambígua ou nenhum resultado, a minuta não é associada automaticamente. Ao fechar, o texto é descartado da memória do modal.

### Vários arquivos e competências

Dê um **Nome da auditoria** para cada importação, por exemplo “Março/2026” e “Abril/2026”, e use **Salvar andamento**. Importar outro arquivo cria uma auditoria independente, mesmo que o nome do arquivo JSON seja igual ao anterior. Em **Auditorias salvas**, escolha o período desejado para continuar; salvar essa auditoria atualiza apenas ela. O nome também acompanha a preparação portátil e o relatório, mas não altera o JSON de remessa.

## Editar a classificação do ato

Em **Revisar**, escolha a opção na seção **Classificação do ato** e clique em **Aplicar classificação**. É o campo `ato` (códigos 1 a 6), separado de `tipo_ato` (Registro/Averbação) e de `numero_ato`. A mudança refaz a auditoria e atualiza as pendências condicionais. Nenhum subtipo ou valor ausente é inventado automaticamente.

O ato volta à fila de revisão após uma mudança. **Restaurar original** remove a alteração e refaz a auditoria. Use **Salvar andamento** ou **Baixar preparação** para guardar as mudanças. Elas são aplicadas ao JSON final, sem modificar o arquivo de origem nem o PostgreSQL legado.

### Valor de avaliação do legado

Após consultar os atos, a seção **Valor de avaliação no legado** aparece em **Revisar** e no modal da minuta. Cada valor mantém seu campo de origem; quando nenhum dos caminhos consultados tiver conteúdo, a tela informa isso. A consulta não preenche nem elimina a pendência de `valor_imposto`, que representa o imposto ITBI/ITCMD. Atualize a consulta do legado para obter os novos campos.

O valor de avaliação do legado pode ser aplicado manualmente como `valor_imposto` pelo botão **Usar como valor do imposto**, na minuta ou na revisão. A escolha registra a origem, recalcula as pendências, volta o ato à fila e acompanha o andamento salvo e o JSON final. **Restaurar valor do arquivo original** desfaz a alteração. Não há preenchimento automático nem escrita no PostgreSQL.

O botão **Consultar campos ITN003** abre a referência de preenchimento, mesmo sem importar um arquivo. Inclui busca, filtros rural/urbano e obrigatório/condicional/opcional, observações dos manuais e referências aos schemas 1.3.0. A classificação considera exceções e estruturas aninhadas; a validação completa de cada ato continua sendo feita pela auditoria.

Selecione **1RIGO** ou **2RIGO** antes de importar. Cada auditoria salva mantém o seu cartório; uma auditoria antiga sem identificação deve ser vinculada pela seleção em tela e salva novamente. Ao trocar de cartório, o andamento atual é salvo e o arquivo aberto é fechado. As conexões são configuradas somente no `server/.env`, em `1RIGO_POSTGRES_CONNECTION_STRING` e `2RIGO_POSTGRES_CONNECTION_STRING`; não há fallback para a variável antiga. Os endpoints do legado exigem `registry` na query de GETs ou no corpo de `POST /api/legacy/context`. O JSON final mantém o layout oficial, sem adicionar o cartório.
