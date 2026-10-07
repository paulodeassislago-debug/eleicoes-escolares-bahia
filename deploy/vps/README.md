# Instalação em VPS

Modelo para Linux com systemd e Node.js 24. O servidor usa somente módulos nativos em produção. A instalação deve primeiro inspecionar os serviços, proxy, portas e diretórios existentes da VPS, adaptando estes modelos ao servidor; eles não devem substituir configurações existentes indiscriminadamente.

- Código em releases dentro de `/opt/eleicoes-escolares`, com `current` apontando para a versão ativa. Atualizações preservam `/var/lib/eleicoes-escolares`, que contém banco, fotos e backups.
- Serviço executado como usuário dedicado `eleicoes`, sem privilégios administrativos. O systemd cria o diretório persistente com permissões restritas. O caminho de Node em `ExecStart` deve corresponder ao binário instalado.
- Variáveis em `/etc/eleicoes-escolares.env`, proprietário root e modo 0600. Use `production.env.example` como modelo; o arquivo real não entra no GitHub ou no pacote público.
- Aplicação escutando somente em `127.0.0.1:3000`. Proxy encaminha HTTPS, sobrescreve `X-Real-IP` e usa `TRUST_LOCAL_PROXY=true` para manter limites de tentativas por cliente. Não habilitar essa confiança com um proxy que repasse o cabeçalho enviado pelo visitante.
- O modelo Nginx começa com HTTP para permitir a emissão do certificado do domínio. A publicação final precisa de HTTPS válido e redirecionamento de HTTP. O domínio e a configuração de certificados serão adaptados após confirmar DNS e o proxy existente.
- Banco com WAL, confirmação síncrona completa e transações locais sem intercalar requisições durante um batch. Faça backup antes de atualizações e migrações.
- Timer de backup diário usa a API de backup online do SQLite e copia as fotos. Crie o diretório de fotos antes de ativá-lo. Os backups ficam privados; não há remoção automática neste modelo. Defina retenção, espaço disponível e cópia fora da VPS antes de uso institucional.
- A migração dos dados atuais da hospedagem é uma operação separada da instalação do código. Confirmar a origem e validar uma exportação completa de contas, escolas e fotos antes de importar; nunca usar uma lista parcial ou truncada.

Os serviços e exemplos estão prontos para adaptação, mas não representam uma instalação já realizada. O deploy depende de endereço/usuário SSH, conectividade Tailscale autorizada e domínio confirmado.
