from __future__ import annotations

import os
import urllib.request
import urllib.error
import json
from typing import Any

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://qglgfacpatoxlapkzbky.supabase.co")
SUPABASE_ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnbGdmYWNwYXRveGxhcGt6Ymt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTM3MjAsImV4cCI6MjA4OTMyOTcyMH0.rXx45CeZAOFx77n07FBJEsw-_1bwiKTKXRXZ-mPhwCc",
)


def get_session_user(token: str) -> dict[str, Any] | None:
    """Valida o JWT do Supabase chamando a API de auth e retorna os dados do usuário."""
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_ANON_KEY,
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        return {
            "id": data.get("id"),
            "email": data.get("email"),
            "name": data.get("user_metadata", {}).get("name") or data.get("email"),
        }
    except urllib.error.HTTPError:
        return None
    except Exception:
        return None


# ── Stubs para compatibilidade com os endpoints /auth/* do main.py ──
# O frontend usa o Supabase SDK diretamente; estas funções não são chamadas em produção.

def create_session(user: dict[str, Any]) -> str:
    raise NotImplementedError("Auth gerenciado pelo Supabase.")


def register_user(name: str, email: str, password: str) -> dict[str, Any]:
    raise NotImplementedError("Registro gerenciado pelo Supabase.")


def authenticate_user(email: str, password: str) -> dict[str, Any] | None:
    raise NotImplementedError("Login gerenciado pelo Supabase.")


def revoke_session(token: str) -> None:
    pass  # Supabase gerencia o ciclo de vida da sessão
