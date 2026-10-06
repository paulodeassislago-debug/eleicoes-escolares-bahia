# Eleições Escolares — Bahia

Aplicação web responsiva para os programas Líderes de Classe e Jovem Ouvidor. Implementa cadastro de escolas e turmas, candidaturas, três turnos eleitorais, urna com códigos individuais e atas de apuração imprimíveis em PDF.

## Executar na infraestrutura da escola ou do NTE

Requer Node.js 24 ou superior. Os mesmos módulos de regras e autenticação executam no servidor Node com SQLite e no Cloudflare Workers com D1.

```sh
npm ci
cp .env.example .env
npm run start:env
```

Abra `http://localhost:3000`. Configure `APP_URL` com a origem pública real; use HTTPS no proxy reverso quando expuser o serviço. Configure `HOST=0.0.0.0` se o proxy precisar acessar o servidor por outra interface. As migrações locais são aplicadas automaticamente no início do servidor. Faça backup do arquivo SQLite com um procedimento compatível com o SQLite antes de atualizações.

## Contas de gestores

O cadastro está aberto a e-mails com o domínio exato `enova.educacao.ba.gov.br`. No cadastro, o gestor informa seus dados e sua escola. Uma conta pode cadastrar outras escolas próprias; a autorização sempre é conferida no servidor. A conta só entra após confirmar o e-mail. Senhas comuns precisam de pelo menos 8 caracteres.

- Login com e-mail e senha.
- Reenvio de confirmação (link válido por 24 horas).
- Recuperação de senha (link válido por 30 minutos).
- Troca de senha em **Minha conta**, com verificação da senha atual.
- Cookies de sessão HttpOnly, SameSite=Strict e Secure em HTTPS, com duração de 12 horas.
- Senhas armazenadas com PBKDF2-SHA256, salt aleatório e 100 mil iterações; não são armazenadas em texto puro.
- Tokens de confirmação, recuperação e sessão armazenados apenas como hashes SHA256.
- Links de confirmação/recuperação têm uso único; troca e recuperação de senha invalidam as sessões existentes.
- Verificação de origem em POST e limites de tentativas para autenticação e e-mail.

A verificação de e-mail prova o controle da caixa postal, não a condição funcional de gestor. Para uma futura operação do NTE, `REGISTRATION_OPEN=false` fecha novos cadastros sem desativar contas existentes; aprovação administrativa e concessão de escolas devem ser planejadas conforme o regulamento adotado.

## Envio de e-mails

Escolha uma alternativa:

1. **Resend:** configure `RESEND_API_KEY` (segredo) e `EMAIL_FROM` com um remetente verificado na conta do serviço. O envio usa HTTPS.
2. **Relay institucional:** configure `EMAIL_WEBHOOK_URL` (HTTPS) e `EMAIL_WEBHOOK_TOKEN` (segredo). A aplicação envia um POST JSON `{to, subject, text}`, com `Authorization: Bearer <token>`. O serviço receptor pode encaminhar a mensagem pelo SMTP institucional. Este repositório não inclui o relay.
3. **Desenvolvimento local:** `EMAIL_CAPTURE=true` grava mensagens na pasta `.mail/`, ignorada pelo Git. Não disponibilize essa pasta na web e não use este modo em produção.

Sem remetente configurado, os cadastros ficam salvos e pendentes, mas não podem entrar. A interface informa que o envio está indisponível. Nenhum link secreto é devolvido ao navegador como substituto da entrega por e-mail.

## Dados fictícios de teste

O repositório público não contém contas reais, credenciais, banco de dados, hashes de senhas reais nem configuração da hospedagem privada.

Para preparar uma conta de teste **em ambiente privado**, forneça um JSON `{email, password, name}` via stdin ao script:

```sh
npm run test:seed
```

O script gera `.test-seed.json` (ignorado pelo Git). Use seu conteúdo na variável secreta `TEST_SEED_JSON`. Na primeira requisição da hospedagem, ou no início do servidor local, a conta e a escola de demonstração são criadas uma única vez. Reinícios não sobrescrevem a senha nem recriam dados apagados. A escola tem 3 turmas, 21 eleitores e 10 candidaturas fictícias, incluindo as cinco categorias. Sua urna começa fechada para preparação.

A conta pré-configurada de teste é explicitamente marcada como tal, dispensa confirmação por e-mail exclusivamente para o teste e exige troca de senha antes de acessar a gestão. Os cadastros comuns nunca usam essa exceção. Não publique uma instância com contas de teste e credenciais conhecidas. Depois de preparar o ambiente, `TEST_SEED_JSON` pode ser removida sem apagar os registros existentes.

## Fluxo eleitoral

1. Cadastre turmas, quantidade de eleitores e indicador de turma concluinte.
2. Cadastre candidatos com números de dois dígitos. Toda turma precisa de candidatura geral; as identitárias são opcionais.
3. Abra o primeiro turno e distribua os códigos individuais, disponíveis em CSV. Cada código confirma uma cédula por turno.
4. Encerre a votação. O candidato geral mais votado é líder; o segundo colocado é vice-líder. Empates ou ausência de votos válidos ficam pendentes de decisão justificada da comissão.
5. No segundo turno, os líderes eleitos de turmas não concluintes concorrem automaticamente por categoria. Vice-líderes não concorrem automaticamente. Sem líderes elegíveis, registre o turno sem votação e avance.
6. No terceiro turno, cadastre os candidatos a jovens ouvidores para a escola inteira.
7. Gere a ata de cada turno e escolha imprimir ou salvar em PDF no navegador. Atas com desempates pendentes são provisórias.

Todos os estudantes cadastrados votam nos turnos escolares, inclusive concluintes. No primeiro turno votam apenas nos cargos disponíveis de sua turma. A filiação identitária do eleitor não é coletada. A urna registra totais por candidato e cargo, mas não armazena qual candidato cada código escolheu. Atualizações concorrentes usam controle de versão para evitar duplicação de votos.

A comissão deve conferir o eleitorado, distribuir os códigos sob supervisão e definir previamente os critérios de desempate. Este sistema é inspirado no processo eleitoral brasileiro; não representa nem se integra à Justiça Eleitoral.

## Testes e compilação

```sh
npm test
npm run build
```

Para alterar o banco, edite `db/schema.ts`, execute `npm run db:generate` e revise as novas migrações em `drizzle/`. Nunca altere migrações já aplicadas. O build emite o Worker ESM e os arquivos públicos em `dist/`. A aplicação Node usa os arquivos de `public/` diretamente.

## Organização

- `src/core.mjs`: regras eleitorais e autorização das escolas.
- `src/auth.mjs`: autenticação, sessões e e-mail.
- `src/test-seed.mjs`: bootstrap opcional de dados fictícios.
- `server.mjs`: servidor Node/SQLite para infraestrutura própria.
- `src/worker.mjs`: entrada Cloudflare Workers/D1.
- `public/`: interface responsiva e logotipos fornecidos para o projeto.
- `db/` e `drizzle/`: esquema e migrações.

Os logotipos são dos programas e do Governo da Bahia; sua presença não transfere direitos sobre essas marcas.
