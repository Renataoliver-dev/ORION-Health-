#!/usr/bin/env python3
"""Remove ORION ultrasound UI without changing backend, Gemini or movement logic.
Run from ORION_INTEGRADO; back up original files outside the project first.
The patch is deliberately conservative: it refuses unexpected App.tsx/CSS revisions.
"""
from pathlib import Path
from datetime import datetime
import hashlib
import shutil
import sys

root = Path(__file__).resolve().parent
frontend = root / 'frontend'
src = frontend / 'src'
package = root / 'src'
checks = {
    'App.tsx': 'f66065c34b1b596930969ac31dd9f7f095fde6b366fb0e1051d7ae8e31535a6c',
    'App.css': '172f18474cdec4c956ed955104269464b403184eaa88dce60e5025204350c705',
}
for fname, expected in checks.items():
    f = src / fname
    if not f.exists():
        sys.exit(f'NOT MODIFIED: missing {f}. Check you are inside ORION_INTEGRADO.')
    raw = f.read_bytes()
    if hashlib.sha256(raw).hexdigest() != expected:
        if raw == (package / fname).read_bytes():
            print(f'Already updated: {fname}')
        else:
            sys.exit(f'NOT MODIFIED: {fname} differs from the reference ORION release. Back up and share your latest project ZIP for a compatible patch; no files were changed.')

# Backup placed NEXT TO the project, so old ultrasound files are not accidentally re-shipped.
backup = root.parent / ('ORION_BACKUP_BEFORE_REMOVING_ULTRASOUND_' + datetime.now().strftime('%Y%m%d_%H%M%S'))
old_files = [src/'App.tsx',src/'App.css',src/'components/backend/ProfilePanel.tsx',
             src/'types/ultrasound.ts',src/'components/ultrasound/ExamViewer.tsx',
             src/'components/ultrasound/ExamViewer.css',root/'README.md',
             frontend/'README.md',root/'docs/VALIDACAO.md']
for f in old_files:
    if f.is_file():
        dest = backup / f.relative_to(root)
        dest.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(f,dest)

for fname in checks:
    shutil.copy2(package/fname,src/fname)

profile=src/'components/backend/ProfilePanel.tsx'
if profile.exists():
    content=profile.read_text(encoding='utf-8')
    content=content.replace(
        'The backend currently supports profiles and exercise sessions. Ultrasound stays in local preview until its API is implemented. No authentication is implemented in this research prototype.',
        'The backend currently supports crew profiles and exercise sessions. Anthropometric measurements remain browser-only. No authentication is implemented in this research prototype.')
    profile.write_text(content,encoding='utf-8')

for f in (src/'types/ultrasound.ts',src/'components/ultrasound/ExamViewer.tsx',src/'components/ultrasound/ExamViewer.css'):
    if f.exists():f.unlink()
folder=src/'components/ultrasound'
if folder.exists() and not list(folder.iterdir()):folder.rmdir()

# Replace only outdated scope statements in existing project docs.
readme=root/'README.md'
if readme.exists():
    text=readme.read_text(encoding='utf-8')
    lines=text.splitlines()
    lines=[line for line in lines if 'Ultrasound' not in line and 'ultrasound' not in line and 'ultrassom' not in line.lower()]
    readme.write_text('\n'.join(lines).rstrip()+'\n',encoding='utf-8')
    with readme.open('a',encoding='utf-8') as out:
        out.write('\n## Current scope\nUltrasound support has been discontinued. Body profile, body atlas, movement tracking, sessions and the Gemini AI exercise advisor remain.\n')
freadme=frontend/'README.md'
if freadme.exists():
    text=freadme.read_text(encoding='utf-8')
    lines=[line for line in text.splitlines() if 'Ultrasound' not in line and 'ultrasound' not in line]
    freadme.write_text('\n'.join(lines).rstrip()+'\n',encoding='utf-8')
valid=root/'docs/VALIDACAO.md'
if valid.exists():
    text=valid.read_text(encoding='utf-8')
    lines=[line for line in text.splitlines() if 'Ultrasound' not in line and 'ultrasound' not in line]
    valid.write_text('\n'.join(lines).rstrip()+'\n',encoding='utf-8')

print('SUCCESS: ultrasound UI and local image modules removed.')
print('Backup:',backup)
print('Unchanged: backend, Gemini API, database, Body Profile, MediaPipe and movement counter.')
print('NEXT: cd frontend && npm run build && npm run dev')
