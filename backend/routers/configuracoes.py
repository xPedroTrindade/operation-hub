from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from core.db import get_db

router = APIRouter(tags=["configuracoes"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class ConfigGeralUpdate(BaseModel):
    exp_url: Optional[str] = None
    exp_usuario: Optional[str] = None
    exp_senha: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_porta: Optional[int] = None
    smtp_usuario: Optional[str] = None
    smtp_senha: Optional[str] = None
    smtp_de_nome: Optional[str] = None
    smtp_usar_tls: Optional[bool] = None
    pdf_nome_empresa: Optional[str] = None
    pdf_cabecalho: Optional[str] = None
    pdf_rodape: Optional[str] = None
    pdf_logo_url: Optional[str] = None
    pdf_incluir_horas: Optional[bool] = None


# ── Configurações Gerais ───────────────────────────────────────────────────────

@router.get("/configuracoes")
def obter_configuracoes():
    db = get_db()
    res = db.table("configuracoes_gerais").select("*").limit(1).execute()
    return {"status": "ok", "data": res.data[0] if res.data else {}}


@router.put("/configuracoes")
def salvar_configuracoes(payload: ConfigGeralUpdate):
    db = get_db()
    campos = payload.model_dump(exclude_none=True)
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar.")

    # Verifica se já existe um registro
    existente = db.table("configuracoes_gerais").select("id").limit(1).execute()

    if existente.data:
        config_id = existente.data[0]["id"]
        res = db.table("configuracoes_gerais").update(campos).eq("id", config_id).execute()
    else:
        res = db.table("configuracoes_gerais").insert({**campos, "tenant_id": 1}).execute()

    return {"status": "ok", "data": res.data[0] if res.data else {}}


# ── Envios ─────────────────────────────────────────────────────────────────────

@router.get("/envios")
def listar_envios(
    config_id: Optional[str] = None,
    status: Optional[str] = None,
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=20, ge=1, le=100),
):
    db = get_db()
    offset = (pagina - 1) * por_pagina

    q = db.table("sr_envios").select(
        "*, status_report_configs(cliente_id, clientes(nome)), sr_envio_destinatarios(email, status_entrega)"
    ).order("enviado_em", desc=True).range(offset, offset + por_pagina - 1)

    if config_id:
        q = q.eq("config_id", config_id)
    if status:
        q = q.eq("status", status)

    res = q.execute()
    return {
        "status": "ok",
        "pagina": pagina,
        "por_pagina": por_pagina,
        "data": res.data,
    }


@router.get("/envios/{envio_id}")
def obter_envio(envio_id: str):
    db = get_db()
    res = db.table("sr_envios").select(
        "*, status_report_configs(cliente_id, clientes(nome)), sr_envio_destinatarios(email, status_entrega)"
    ).eq("id", envio_id).maybeSingle().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Envio não encontrado.")
    return {"status": "ok", "data": res.data}


@router.post("/envios/{envio_id}/reprocessar")
def reprocessar_envio(envio_id: str):
    """
    Marca o envio como pendente para reprocessamento.
    A lógica de reenvio real será implementada no módulo de disparo.
    """
    db = get_db()
    existe = db.table("sr_envios").select("id, status").eq("id", envio_id).maybeSingle().execute()
    if not existe.data:
        raise HTTPException(status_code=404, detail="Envio não encontrado.")

    if existe.data["status"] == "pendente":
        raise HTTPException(status_code=409, detail="Envio já está com status pendente.")

    db.table("sr_envios").update({
        "status": "pendente",
        "erro_msg": None,
    }).eq("id", envio_id).execute()

    return {"status": "ok", "message": f"Envio {envio_id} marcado para reprocessamento."}
