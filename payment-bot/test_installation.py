#!/usr/bin/env python3
"""Test installation script for Payment Verification Bot."""

import importlib
import sys
from pathlib import Path

REQUIRED_PACKAGES = [
    "cv2",
    "PIL",
    "numpy",
    "pyzbar",
    "pytesseract",
    "dotenv",
]

OPTIONAL_PACKAGES = [
    "pyzxing",
]

def check_package(name: str, import_name: str = None) -> bool:
    try:
        importlib.import_module(import_name or name)
        return True
    except ImportError:
        return False

def main():
    print("=" * 60)
    print(" Payment Verification Bot - Installation Test")
    print("=" * 60)

    all_ok = True

    print("\n📦 Required Packages:")
    print("-" * 40)
    for pkg in REQUIRED_PACKAGES:
        ok = check_package(pkg)
        status = "✅ OK" if ok else "❌ MISSING"
        print(f"  {pkg:25s} {status}")
        if not ok:
            all_ok = False

    print("\n📦 Optional Packages:")
    print("-" * 40)
    for pkg in OPTIONAL_PACKAGES:
        ok = check_package(pkg)
        status = "✅ OK" if ok else "⬜ Not installed"
        print(f"  {pkg:25s} {status}")

    # Tesseract check
    print("\n🔍 Tesseract OCR:")
    print("-" * 40)
    try:
        import subprocess
        result = subprocess.run(["tesseract", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            version = result.stdout.split("\n")[0] if result.stdout else "unknown"
            print(f"  ✅ Tesseract OK: {version}")
        else:
            print("  ❌ Tesseract not found in PATH")
            all_ok = False
    except FileNotFoundError:
        print("  ❌ Tesseract not found in PATH")
        all_ok = False

    # .env check
    print("\n🔑 Environment (.env):")
    print("-" * 40)
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        print(f"  ✅ .env found")
        from dotenv import load_dotenv
        load_dotenv(env_path)
        import os
        key = os.getenv("GEMINI_API_KEY_PAYMENT", "")
        if key:
            print(f"  ✅ API Key loaded ({key[:10]}...)")
        else:
            print("  ⚠️  API Key not set in .env")
    else:
        print("  ⚠️  .env not found (create from .env.example)")

    print("\n" + "=" * 60)
    if all_ok:
        print(" ✅ SEMUA INSTALASI OK — Bot siap digunakan!")
    else:
        print(" ❌ Ada paket yang kurang. Jalankan:")
        print("    pip install -r requirements.txt")
    print("=" * 60)

    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())
