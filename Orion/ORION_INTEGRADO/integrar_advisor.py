#!/usr/bin/env python3
"""Apply minimal ORION AI advisor hook without overwriting teammates' main.py."""
from pathlib import Path
import re
import shutil
import sys

root = Path(__file__).resolve().parent
backend = root / 'backend' / 'main.py'
frontend = root / 'frontend' / 'src' / 'components' / 'biometrics' / 'BodyProfile.tsx'

for path in (backend, frontend):
    if not path.is_file():
        sys.exit(f'Expected file not found: {path}. Run inside ORION_INTEGRADO root.')

content = backend.read_text(encoding='utf-8')
new = content
if 'from exercise_advisor import router as exercise_advisor_router' not in new:
    import_anchor = 'from database import engine\n'
    if import_anchor not in new:
        sys.exit('Could not locate database import in main.py; no changes were made.')
    new = new.replace(import_anchor, import_anchor + 'from exercise_advisor import router as exercise_advisor_router\n', 1)
if 'app.include_router(exercise_advisor_router)' not in new:
    new, count = re.subn(r'(^app\s*=\s*FastAPI\([^\n]*\)\s*\n)', r'\1app.include_router(exercise_advisor_router)\n', new, count=1, flags=re.M)
    if count != 1:
        sys.exit('Could not locate FastAPI app constructor; no changes were made.')

body = frontend.read_text(encoding='utf-8')
updated = body
if "import ExerciseAdvisor from '../advisor/ExerciseAdvisor';" not in updated:
    marker = "import './BodyProfile.css';"
    if marker not in updated:
        sys.exit('Could not locate BodyProfile CSS import; no changes were made.')
    updated = updated.replace(marker, marker + "\nimport ExerciseAdvisor from '../advisor/ExerciseAdvisor';", 1)
if '<ExerciseAdvisor ' not in updated:
    marker = '<div className="bp-columns">'
    if marker not in updated:
        sys.exit('Could not locate Body Profile layout; no changes were made.')
    updated = updated.replace(marker, '<ExerciseAdvisor key={`${athlete.id}:${latest?.id ?? "none"}`} measurement={latest}/>\n      ' + marker, 1)

for path, original, changed in [(backend, content, new), (frontend, body, updated)]:
    if original != changed:
        backup = path.with_suffix(path.suffix + '.before_ai_advisor.bak')
        if not backup.exists(): shutil.copy2(path, backup)
        path.write_text(changed, encoding='utf-8')
        print('Updated:', path.relative_to(root))
    else:
        print('Already integrated:', path.relative_to(root))
print('Done. No existing API endpoint, ORM model or migration was replaced.')
