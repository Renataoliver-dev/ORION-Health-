# Validação realizada nesta integração

- Frontend TypeScript: `tsc -b` passou.
- Frontend ESLint: execução sem erros.
- Build Vite: passou, com bundle gerado em `dist/` localmente (não incluído no ZIP).
- Backend: Alembic `upgrade head` passou em um banco SQLite **temporário**, isolado do pacote.
- Backend: testes HTTP de `/health`, `/ready`, cadastro e consulta de atleta, sessão de agachamento, gravação de amostra, rejeição de duplicata, finalização e listagem de sessão passaram.
- Vite proxy: GET `/backend-api/ready` e POST `/backend-api/api/v1/athletes` foram testados por HTTP com FastAPI ativo, sem alterar CORS.
- Backend: os 12 arquivos copiados são idênticos aos 12 arquivos recebidos (comparados por SHA-256).
- Foi tentado um teste de cliques automatizado com Chromium, mas o ambiente retornou `ERR_BLOCKED_BY_ADMINISTRATOR` para localhost. Portanto, a interface **não** recebeu validação visual automatizada nesta entrega; executar o teste manual no navegador local.

## Checklist para teste manual no seu Ubuntu
1. `cd backend && alembic upgrade head && uvicorn main:app --reload --port 8000`.
2. Em outro terminal, `cd frontend && npm ci && npm run dev`.
3. Abra o endereço do Vite e observe o selo `API & DATABASE READY`.
4. Cadastre um pseudônimo em Overview, guarde o UUID e teste `Change profile` seguido de consulta por UUID.
5. Em Movement, escolha squat, inicie e finalize uma sessão. Observe o ID no painel.
6. Em History, clique em Refresh e confirme a sessão com status `finished`.
7. Teste Atlas (Right upper arm / Right forearm e Left upper arm / Left forearm), nas vistas Front e Back.
8. Importe uma imagem de demonstração em Ultrasound e clique na região correspondente no Atlas; o dado é **local** e desaparecerá ao atualizar.
9. Abra Integrations; apenas FastAPI e SQLite devem aparecer como operacionais quando o backend estiver pronto.

Para impedir que versões de dependências incompatíveis se misturem, utilize o `package-lock.json` existente via `npm ci`, em vez de copiar uma pasta `node_modules` de outro computador.
