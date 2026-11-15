# ORION — Frontend + backend FastAPI (integração sem alterar o backend original)

Este pacote contém duas pastas independentes: `frontend` (dashboard azul/inglês React + TypeScript) e `backend` (cópia integral e **inalterada** do backend recebido no arquivo `Project-O.R.I.O.N-main.zip`).

## Requisitos
- Python compatível com as dependências de `backend/requirements.txt`.
- Node.js e npm compatíveis com Vite 8 (Node >=20.19 ou >=22.12, preferencialmente versão LTS).

## Terminal 1 — API e SQLite
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
Verificar `http://127.0.0.1:8000/health` e `http://127.0.0.1:8000/ready`. Documentação automática em `http://127.0.0.1:8000/docs`.

## Terminal 2 — dashboard
```bash
cd frontend
npm ci
npm run dev
```
Acesse o endereço que o Vite informar, normalmente `http://localhost:5173`. O frontend usa um proxy Vite `/backend-api` => `http://127.0.0.1:8000`, evitando alterar o CORS existente. Opcional: copie `frontend/.env.example` para `frontend/.env` se o backend usar outra porta e ajuste o destino. **Não crie um `VITE_API_BASE_URL` se quiser usar o proxy padrão**.

## Teste rápido
1. Acesse Overview; em Active crew profile, cadastre um pseudônimo. Salve o UUID mostrado.
2. Acesse Movement, escolha Bodyweight squat, e clique **Start server session**. O backend grava a sessão e retorna um UUID.
3. Finalize com **Finish server session** e consulte History para verificar os registros recebidos do SQLite.
4. Se tiver dados reais de um rastreador, com a sessão aberta, importe um JSON com 1–50 amostras de movimento usando os campos especificados em `docs/CONTRATOS.md`.
5. Ultrasound importa imagens **somente na memória do navegador**: ainda não existe endpoint para recebê-las nem modelo muscular integrado ao backend.
6. Atlas possui a divisão `upper arm` / `forearm` em ambos os lados, conforme a evolução do frontend.

## Observações
- O backend original contém endpoints somente para perfis, agachamento, amostras de pose e listagem de sessões. Não foram inventados endpoints de ultrassom, YOLO, MediaPipe, OpenCV, outras modalidades ou alertas.
- A câmera é uma **prévia local**, sem extração de pose. Iniciar uma sessão não analisa vídeo nem conta repetições.
- A quantidade de perfis exibida é apenas a do **perfil ativo**, não o total global: não existe rota para listar todos os perfis.
- A quantidade de sessões é o tamanho da lista retornada (até 100 registros), não uma contagem geral do banco.
- O histórico de exame local não é persistido, não há autenticação, criptografia na aplicação ou uso clínico. Use dados de pesquisa desidentificados.
- Evite enviar `node_modules`, `backend/.venv`, bancos `.db` e imagens pessoais ao compartilhar o ZIP.
