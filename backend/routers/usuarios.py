from __future__ import annotations

from typing import Optional, Literal
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from core.db import get_db

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class UsuarioCriar(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    role: Literal["admin", "user"] = "user"


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[Literal["admin", "user"]] = None


class AcessoModulo(BaseModel):
    module_key: str
    has_access: bool


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
def listar_usuarios():
    """Lista todos os perfis com seus acessos de módulo."""
    db = get_db()
    res = db.table("profiles").select(
        "*, user_module_access(module_key, has_access)"
    ).order("nome").execute()
    return {"status": "ok", "data": res.data}


@router.post("")
def criar_usuario(payload: UsuarioCriar):
    """Cria novo usuário via Supabase Auth Admin + perfil."""
    db = get_db()

    # Verifica duplicidade de e-mail no profiles antes de criar
    existente = db.table("profiles").select("id").eq("email", payload.email).maybe_single().execute()
    if existente.data:
        raise HTTPException(status_code=409, detail="Já existe um usuário com este e-mail.")

    # Cria o usuário no Supabase Auth
    try:
        auth_resp = db.auth.admin.create_user({
            "email": payload.email,
            "password": payload.senha,
            "email_confirm": True,
            "user_metadata": {"name": payload.nome},
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao criar usuário no Auth: {str(e)}")

    user_id = auth_resp.user.id

    # Cria o perfil
    try:
        db.table("profiles").insert({
            "user_id": user_id,
            "email": payload.email,
            "nome": payload.nome,
            "role": payload.role,
        }).execute()
    except Exception as e:
        # Tenta reverter criação no Auth se o profile falhar
        try:
            db.auth.admin.delete_user(user_id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Erro ao criar perfil: {str(e)}")

    return {"status": "ok", "data": {"user_id": user_id, "email": payload.email, "nome": payload.nome}}


@router.get("/{user_id}")
def obter_usuario(user_id: str):
    db = get_db()
    res = db.table("profiles").select(
        "*, user_module_access(module_key, has_access)"
    ).eq("user_id", user_id).maybe_single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return {"status": "ok", "data": res.data}


@router.put("/{user_id}")
def atualizar_usuario(user_id: str, payload: UsuarioUpdate):
    db = get_db()
    existe = db.table("profiles").select("id").eq("user_id", user_id).maybe_single().execute()
    if not existe.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    campos = payload.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar.")

    # Atualiza e-mail no Supabase Auth (se fornecido)
    if payload.email:
        try:
            db.auth.admin.update_user_by_id(user_id, {"email": payload.email})
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erro ao atualizar e-mail: {str(e)}")

    # Atualiza perfil (nome, role e espelha o email)
    campos_profile = {k: v for k, v in campos.items() if k in ("nome", "role", "email")}
    if campos_profile:
        db.table("profiles").update(campos_profile).eq("user_id", user_id).execute()

    return {"status": "ok"}


@router.delete("/{user_id}")
def excluir_usuario(user_id: str):
    """Remove o usuário do Auth e do profiles."""
    db = get_db()
    existe = db.table("profiles").select("id, email").eq("user_id", user_id).maybe_single().execute()
    if not existe.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    db.table("profiles").delete().eq("user_id", user_id).execute()

    try:
        db.auth.admin.delete_user(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Perfil removido, mas erro ao remover Auth: {str(e)}")

    return {"status": "ok", "message": "Usuário excluído."}


@router.put("/{user_id}/acesso")
def definir_acesso_modulo(user_id: str, payload: AcessoModulo):
    """Cria ou atualiza o acesso de um usuário a um módulo."""
    db = get_db()
    existe = db.table("profiles").select("id").eq("user_id", user_id).maybe_single().execute()
    if not existe.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    res = db.table("user_module_access").upsert({
        "user_id": user_id,
        "module_key": payload.module_key,
        "has_access": payload.has_access,
    }, on_conflict="user_id,module_key").execute()
    return {"status": "ok", "data": res.data[0] if res.data else {}}
