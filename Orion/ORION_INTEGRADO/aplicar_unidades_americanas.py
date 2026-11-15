#!/usr/bin/env python3
"""Apply US customary UI unit conversion to ORION safely, without touching backend."""
from pathlib import Path
from datetime import datetime
import hashlib
import shutil
import sys

ROOT = Path(__file__).resolve().parent
PATCH = ROOT / "patch" / "frontend" / "src"
TARGET = ROOT / "frontend" / "src"
EXPECTED = {'components/biometrics/BodyProfile.tsx': 'a7135ff4d9aabf3a1a65d5d8469e6b3c1fa44988a0abd85c7048c2912b9cff6e', 'components/biometrics/BodyProfile.css': '2918301f2a9e09d2de6a45070d851ac9af37cea97caa913337a23ef19e1f4566', 'App.tsx': '9760b026ec1353e3abd0b1847417b5aec896c5be585e5e4d5f0f29452380ba75', 'components/advisor/ExerciseAdvisor.tsx': '901c447e529517e5c06cf7649261948556d639fd16f9b8b44c028351226b03e3'}
FILES = ['components/biometrics/BodyProfile.tsx', 'components/biometrics/BodyProfile.css', 'components/advisor/ExerciseAdvisor.tsx', 'App.tsx', 'utils/imperial.ts']

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    if not (ROOT / "frontend" / "package.json").exists():
        sys.exit("STOP: Run from ORION_INTEGRADO with frontend/package.json present.")
    errors = []
    pending = []
    for rel in FILES:
        target, source = TARGET / rel, PATCH / rel
        if not source.is_file():
            errors.append(f"Missing patch file: {rel}")
            continue
        if target.is_file() and digest(target) == digest(source):
            continue
        if rel not in EXPECTED:
            if target.exists(): errors.append(f"Existing custom file would be overwritten: {rel}")
        elif not target.is_file() or digest(target) != EXPECTED[rel]:
            errors.append(f"Locally modified or unexpected version: {rel}")
        pending.append(rel)
    if errors:
        print("STOP: No files were changed. Your local work is protected.")
        print("\n".join(" - " + e for e in errors))
        print("Send this message for a tailored patch; do not manually overwrite the entire src directory.")
        return 2
    if not pending:
        print("Already installed. No changes needed.")
        return 0
    back_dir = ROOT / ".orion_backups" / ("units-us-" + datetime.now().strftime("%Y%m%d-%H%M%S"))
    for rel in pending:
        target = TARGET / rel
        if target.exists():
            backup = back_dir / rel
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, backup)
    for rel in pending:
        target = TARGET / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PATCH / rel, target)
        print("Updated:", "frontend/src/" + rel)
    print("DONE. Existing metric API/database fields preserved; backend untouched.")
    print("Backup directory:", back_dir)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
