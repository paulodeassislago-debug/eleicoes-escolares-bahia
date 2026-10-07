# Revisão de segurança do backend

Revisão realizada em 7 de outubro de 2026, sobre o código do backend Node/Cloudflare Workers, autenticação, D1/SQLite, armazenamento de fotos e integração de e-mail. Incluiu inspeção de código, testes locais de abuso e concorrência e verificação da interface com os cabeçalhos novos. Não é uma certificação nem um teste de invasão independente da infraestrutura publicada.

## Problemas corrigidos

| Problema | Impacto | Correção |
| --- | --- | --- |
| Limite de tentativas da urna incluía a escola enviada pelo solicitante. | Um atacante podia alternar identificadores de escola para obter novas tentativas de adivinhar códigos. | Contagem compartilhada por IP entre escolas: 20 respostas inválidas por janela de cinco minutos. |
| Despacho eleitoral aceitava caminhos não previstos e permitia consultar a cédula por GET. | Um gestor autenticado podia executar ações por caminhos inesperados; códigos enviados na URL podiam aparecer em históricos e registros de acesso. | Lista explícita de caminhos e métodos. Cédula e voto aceitam apenas POST; códigos ficam no corpo JSON. |
| Algumas exceções internas eram devolvidas ao cliente. | Possível exposição de mensagens do banco ou de falhas operacionais. | Erros esperados têm mensagens controladas; falhas inesperadas retornam mensagem genérica e registram somente o tipo da exceção. |
| Worker lia o corpo completo antes de verificar seu tamanho. | Consumo de memória desnecessário com requisições grandes, incluindo texto UTF-8 que excedia o limite em bytes. | Leitura com limite em bytes e cancelamento do stream; até 128 KiB em `/api/state` e 32 KiB nas demais rotas. |
| JSON e tipos de campos não eram validados uniformemente. | Objetos, listas ou campos incompatíveis causavam erros internos e comportamentos de coerção inesperados. | Exigência de objeto JSON, tipos e tamanhos de campos; validação das escolhas, categoria e indicação de turma concluinte. |
| Não havia limite específico para tentativa de alteração de senha nem criação de escolas. | Abuso por sessão autenticada e consumo de recursos. | Dez tentativas de troca de senha por conta a cada 15 minutos e dez novas escolas por conta/hora. |
| Faltavam cabeçalhos de segurança uniformes. | Menor proteção contra injeção de scripts, incorporação por sites arbitrários e envio de referências. | CSP, política de permissões, `nosniff`, `no-referrer` e HSTS em HTTPS, aplicados à interface e à API. A câmera da própria aplicação permanece permitida. |
| Sessões e contadores expirados permaneciam acumulados. | Crescimento desnecessário do banco. | Limpeza periódica na utilização da API, no máximo uma vez a cada cinco minutos por instância. |
| Dependências de desenvolvimento apresentavam um alerta grave no Drizzle ORM e alertas moderados em uma versão transitiva de esbuild. | Risco nas ferramentas de desenvolvimento; esses componentes não são executados no backend publicado. | Drizzle ORM atualizado para 0.45.3 e versão transitiva de esbuild alinhada à série 0.25. `npm audit` terminou sem alertas para a árvore instalada. |

## Proteções conferidas

- Consultas parametrizadas; nenhuma entrada do usuário é interpolada como SQL.
- Isolamento das escolas pelo proprietário da conta nas operações de gestão e acesso às fotos.
- Confirmação do domínio institucional, tokens aleatórios de confirmação e recuperação armazenados como hashes, com expiração e uso único.
- Sessões armazenadas como hashes, cookies `HttpOnly`, `SameSite=Strict` e `Secure` em HTTPS; troca e recuperação de senha invalidam sessões anteriores.
- Verificação de `Origin` e exigência de JSON nas requisições POST, para proteção contra CSRF.
- Senhas com salt individual e PBKDF2-SHA256; respostas de login genéricas e limites por conta/IP.
- Registro de cédula completa em uma atualização condicionada à versão da escola: duas requisições concorrentes com o mesmo código não contam dois votos.
- Códigos usados não permitem nova cédula ou consulta de foto pela urna. No primeiro turno, candidatos e fotos são restritos à turma do eleitor.
- Fotos em armazenamento separado, limite de 64 KiB, chaves sem travessia de diretórios e respostas com tipo JPEG e `nosniff`. A validação no servidor verifica formato externo e assinatura, mas não decodifica integralmente o JPEG.
- Respostas da API com `Cache-Control: no-store`; chave da Brevo e configurações de teste ficam no servidor.
- O backend não guarda uma lista relacionando cada código ao candidato escolhido: armazena uso do código e totais agregados.

## Validação reproduzível

`npm test` inclui autenticação, regras eleitorais, códigos, fotos, demonstração e `verify-security.mjs`. Este último cobre rotas desconhecidas sem mutação, rejeição de GET com código, JSON inválido, limite UTF-8 em bytes, cancelamento de stream, CSRF, alternância de escolas no ataque à urna, mensagens internas ocultas e duas requisições simultâneas para o mesmo voto. A interface foi conferida localmente com os novos cabeçalhos, incluindo login e download do PDF das colinhas. O build do Worker foi executado.

A biblioteca do PDF distribuída como arquivo estático foi atualizada de jsPDF 3.0.4 para 4.2.1; o download de 204 colinhas foi conferido após a troca. Arquivos estáticos vendorizados não são cobertos pelo `npm audit` do projeto. O teste de navegador da câmera e da urna também passou com a nova política de permissões e CSP.

## Preparação para uso institucional

1. **Ambiente de demonstração:** antes de uma instalação destinada a eleições reais, retirar `TEST_SEED_JSON`, `DEMO_PRESENTATION_JSON` e `LEGACY_OWNER_ID`, remover contas/escolas fictícias e garantir senhas fortes. A publicação privada de demonstração mantém seus exemplos por solicitação do usuário; a revisão não os removeu.
2. **Gestores:** o cadastro continua livre por requisito do projeto. Confirmação de e-mail comprova acesso ao endereço institucional, mas não comprova que a pessoa representa a escola indicada. O controle e a aprovação de gestores pelo NTE precisam ser definidos antes de liberar uma eleição institucional com essa exigência.
3. **Códigos da urna:** são credenciais de acesso. Quem obtiver um código disponível e o identificador da escola pode votar pela API. A aplicação não vincula a votação a um tablet autorizado. A operação presencial depende da distribuição supervisionada; se a restrição ao equipamento for obrigatória, será necessário implementar autorização dos terminais. O limite por IP reduz tentativas, mas não impede ataques distribuídos e pode bloquear temporariamente uma rede compartilhada após erros repetidos.
4. **Senhas:** o fator atual é de 100 mil iterações PBKDF2-SHA256. Avaliar um fator maior ou algoritmo apropriado com migração dos hashes na infraestrutura definitiva, considerando suporte e custo do runtime. Não armazenar credenciais de demonstração no repositório ou reutilizá-las em produção.
5. **Operação:** configurar e testar backups e restauração de D1/R2, monitoramento e alertas, retenção de dados e trilha administrativa independente para abertura, encerramento e decisões da comissão. A ata contém a justificativa de desempate, mas não substitui um log administrativo protegido contra alterações.
6. **Escala e auditoria:** realizar teste de carga no cenário real de escolas/urnas simultâneas e uma revisão independente antes de adoção ampla. O estado de cada escola é salvo em um documento JSON com controle de versão; alterações simultâneas podem gerar conflitos que exigem repetir a operação. Esta revisão local não mede a capacidade da infraestrutura nem comprova disponibilidade ou anonimato contra quem tenha acesso administrativo ao banco e a seus históricos.

## Política dos cabeçalhos

A CSP permite scripts apenas da própria origem. Estilos inline continuam permitidos porque a interface atual os utiliza; scripts inline e `eval` não são liberados. Imagens locais e `data:` são necessárias para as fotos, e áudio local/`blob:` para a urna. A incorporação é limitada à própria origem e às origens do ChatGPT usadas pela hospedagem atual. Em outra infraestrutura, ajustar essa lista de origens ao uso autorizado.

Relatos de vulnerabilidade não devem incluir senhas, tokens, códigos de votação ou dados pessoais em issues públicas. Encaminhar os detalhes ao responsável pela instalação por canal privado.
