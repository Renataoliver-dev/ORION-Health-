#!/usr/bin/env python3
"""ORION Etapa 11: atualiza apenas componentes e serviço, preservando testes locais."""
from pathlib import Path
from hashlib import sha256
from shutil import copy2
from datetime import datetime
import sys

ROOT = Path(__file__).resolve().parent
PATCH = ROOT / "patch"
BASE = {'backend/exercise_advisor.py': '0e254ddf01bd8b704c8c035af90b2694392beb8f7e83a73dd3a43e4c17bcaeb0', 'frontend/src/components/advisor/ExerciseAdvisor.tsx': 'ba6bca22d36d4c744c4e4caf11a2293a46ef762d3cbc52bcd3075dd88ae8de78', 'frontend/src/components/advisor/ExerciseAdvisor.css': '62fa1fb62a8f5f095962e0928381b7dea4fd113840d1f450f0d716a5a089bf20'}
NEW = {'backend/exercise_advisor.py': '22e8996d11189ce41a680593d92da196c18b3fa1040eefef2863e1b6edf7ffe5', 'frontend/src/components/advisor/ExerciseAdvisor.tsx': '901c447e529517e5c06cf7649261948556d639fd16f9b8b44c028351226b03e3', 'frontend/src/components/advisor/ExerciseAdvisor.css': '63dc15faa79a7824ec458c525de4531df27b971529683e76a9db56a30fa76af5'}

def digest(path):
    return sha256(path.read_bytes()).hexdigest()

def main():
    if not (ROOT / 'backend/main.py').is_file() or not (ROOT / 'frontend/package.json').is_file():
        sys.exit('ERRO: coloque o instalador e patch/ na raiz ORION_INTEGRADO.')
    pending=[]
    unexpected=[]
    for rel in BASE:
        dst, src=ROOT/rel, PATCH/rel
        if not dst.is_file() or not src.is_file() or digest(src)!=NEW[rel]:
            sys.exit('ERRO: arquivo ausente ou patch danificado: '+rel)
        current=digest(dst)
        if current==NEW[rel]:
            print('Ja atualizado:', rel)
        elif current==BASE[rel]:
            pending.append(rel)
        else:
            unexpected.append(rel)
    if unexpected:
        print('PARADO: estes arquivos de funcionamento foram alterados depois da referencia:')
        print('\n'.join(' - '+v for v in unexpected))
        sys.exit('Nenhum arquivo foi alterado. Peça uma integração específica para preservar as alterações.')
    if not pending:
        print('Projeto ja atualizado. Testes originais preservados.')
        return
    backup = ROOT.parent/('ORION_BACKUP_FICHA_SEM_TESTES_'+datetime.now().strftime('%Y%m%d_%H%M%S'))
    for rel in pending:
        dest=backup/rel
        dest.parent.mkdir(parents=True,exist_ok=True)
        copy2(ROOT/rel,dest)
    for rel in pending:
        copy2(PATCH/rel,ROOT/rel)
        print('Atualizado:',rel)
    print('Backup:',backup)
    print('CONCLUIDO: backend/tests/test_exercise_advisor.py NAO foi modificado.')
    print('Proximo: executar build do frontend e validar os testes do backend.')

if __name__ == '__main__':
    main()
