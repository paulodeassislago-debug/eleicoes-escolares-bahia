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

A opção escolhida para o piloto é **Brevo Free**, com até **300 e-mails por dia**, conforme a documentação consultada em 07/10/2026. O aplicativo também limita a 300 tentativas de envio por dia UTC. Ele não contrata planos, não aumenta o limite automaticamente e não redireciona falhas para outro fornecedor. Esse limite da aplicação não controla envios feitos por outros sistemas na mesma conta Brevo; reserve uma conta para este projeto e mantenha o plano Free.

### Ativar Brevo (pendente de credenciais do titular)

1. Crie uma conta no plano **Free** em https://onboarding.brevo.com/ e conclua a verificação exigida pela Brevo. Não contrate um plano pago.
2. Ative o recurso de e-mails transacionais. A Brevo pode revisar a conta antes de liberar envios.
3. Cadastre um remetente em **Settings > Senders, Domains, IPs > Senders** e confirme o código enviado à caixa postal. A documentação permite verificação individual por e-mail quando o domínio não está autenticado. Use um endereço que você controla e esteja autorizado a usar como remetente. Autenticar o domínio melhora a entrega; o domínio institucional exige acesso autorizado ao DNS da SEC, e não deve ser configurado por suposição. A entrega ao e-Nova precisa ser testada com uma mensagem real após a ativação.
4. Gere uma chave em **SMTP & API > API Keys**.
5. Configure `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY` como segredo, `EMAIL_FROM` com o endereço verificado e `EMAIL_FROM_NAME=Eleições Escolares`. Configure `APP_URL` com a origem real do site. Na hospedagem Sites, use as variáveis de ambiente do site e publique a nova revisão. No servidor próprio, use `.env` (fora do Git).
6. Em **Transactional emails > Retention rules**, escolha **1 mês** de retenção para os registros e **Never store previews**. Em **Transactional emails > Tracking**, ative o rastreamento anônimo; se disponível na sua conta, ative a opção de consentimento individual de pixel. O aplicativo envia `contactPixelTrackingConsent=false`; esse campo depende da ativação do recurso na conta e não garante, sozinho, a desativação de todo rastreamento do provedor.
7. Faça um cadastro de teste, confira a mensagem na caixa e-Nova e confirme o link. Teste também a recuperação de senha. Não considere o serviço ativo antes desse teste de entrega.

### Privacidade do envio

A integração usa exclusivamente a API transacional HTTPS, com mensagens de texto simples. São transmitidos o endereço do destinatário, o remetente do projeto, o assunto e o corpo contendo o link temporário de confirmação ou recuperação. O provedor precisa processar esse link para entregar a mensagem. O aplicativo não envia senhas, hashes de senha, dados de alunos, escolas, turmas, candidaturas ou votos, e não cria listas de marketing nem perfis de contato pela API. A chave de API permanece no servidor.

A Brevo documenta armazenamento de suas bases na União Europeia, política de privacidade e acordo de tratamento de dados. Seus registros de envio e políticas próprias continuam aplicáveis; isso não significa ausência de retenção nem garante, por si só, conformidade institucional com a LGPD. A configuração de retenção no painel é necessária porque a documentação informa retenção indefinida de logs quando nenhuma regra é definida. Os links do aplicativo expiram independentemente do registro no provedor.

Fontes oficiais:

- Plano gratuito e limites: https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans
- Política de privacidade: https://www.brevo.com/legal/privacypolicy/
- Tratamento de dados/GDPR: https://help.brevo.com/hc/en-us/articles/360001258744-How-does-Brevo-comply-with-the-GDPR
- Localização de armazenamento: https://help.brevo.com/hc/en-us/articles/360001005510-Data-storage-location
- Retenção e prévias: https://help.brevo.com/hc/en-us/articles/4415743225746-Configure-a-custom-retention-period-for-your-transactional-logs-and-email-previews
- Verificação de remetente: https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email
- API: https://developers.brevo.com/reference/send-transac-email

### Alternativas mantidas no código

- **Resend:** selecione `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` e `EMAIL_FROM` com um remetente verificado. Não é usado como fallback automático da Brevo.
- **Relay institucional:** selecione `EMAIL_PROVIDER=webhook` e configure `EMAIL_WEBHOOK_URL` (HTTPS) e `EMAIL_WEBHOOK_TOKEN` (segredo). A aplicação envia um POST JSON `{to, subject, text}` com autenticação Bearer. O serviço receptor pode encaminhar a mensagem por SMTP institucional; este repositório não inclui esse relay.
- **Desenvolvimento local:** `EMAIL_CAPTURE=true` grava mensagens na pasta `.mail/`, ignorada pelo Git. Não disponibilize essa pasta na web e não use esse modo em produção.

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
