# Contratos efetivamente presentes no backend recebido

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/health` | Verifica execução da API |
| GET | `/ready` | Verifica existência das três tabelas no SQLite |
| POST | `/api/v1/athletes` | Cadastra um pseudônimo; `{"pseudonym":"Crew One"}` |
| GET | `/api/v1/athletes/{uuid}` | Consulta atleta existente |
| POST | `/api/v1/sessions` | Cria apenas agachamento: `{"athlete_id":"<uuid>","exercise_code":"squat","protocol_id":"SQUAT-01"}` |
| GET | `/api/v1/sessions?athlete_id=<uuid>&limit=20&offset=0` | Lista sessões do perfil |
| POST | `/api/v1/sessions/{uuid}/samples` | Recebe lote de 1 a 50 medições reais |
| POST | `/api/v1/sessions/{uuid}/finish` | Finaliza sessão |

Formato de cada amostra exigido por `POST /samples`:
```
{
  "frame_id": 1,
  "captured_at_utc": "2026-11-15T12:00:00Z",
  "pose_quality": 0.9,
  "angles_deg": {"left_knee": 92.5},
  "image_width": 1280,
  "image_height": 720,
  "landmarks_version": "mediapipe-pose-<actual-version>"
}
```
**Valores acima ilustram o formato JSON — NÃO são dados reais.** O frontend não envia nada até o usuário fornecer dados realmente obtidos em uma captura. O JSON carregado deve ser `{"samples":[...]}` ou um array puro de amostras. Replicar o mesmo `frame_id` por sessão não duplica o registro.

## Lacunas e limites que permanecem
- Não há GET `/api/v1/athletes` para listar todos os perfis. O frontend permite criar, consultar por UUID e guarda o UUID apenas no `sessionStorage` da aba.
- Não existem rotas de upload de ultrassom, persistência de imagem, calibração, segmentação YOLO, análise de músculo, nem histórico de exames no backend fornecido.
- Não há endpoint para leitura detalhada das amostras de movimento; a interface só confirma quantas foram inseridas.
- Não existe cancelamento, pausa de sessão no backend, validação de exercícios diferentes de squat, autenticação ou rate limiting. O frontend não expõe essas ações como se existissem.
- A rota `/ready` devolve 503 antes das migrações. Execute `alembic upgrade head` dentro da pasta `backend`.
- O backend original tem `@app.get('/api/v1/sessions')` repetido acima da mesma função (repetição de decorador). Foi preservado, para não alterar o trabalho do outro desenvolvedor. Se ele decidir corrigir, essa limpeza deve ser feita no repositório dele.

## Integração frontend
- O frontend envia requisições para `/backend-api/...` e o Vite redireciona para a porta 8000. Isso evita mudanças no CORS limitado do backend fornecido.
- O frontend e a API podem evoluir independentemente. Não salvar dados médicos na versão atual; a segurança não está pronta para produção.
