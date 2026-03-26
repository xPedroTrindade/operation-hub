from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
import asyncio
import copy
import json
import logging
import os
import time
from threading import RLock

from fastapi import Body, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.oauth2 import service_account
from googleapiclient.discovery import build

from core.auth import create_session, get_session_user, register_user, authenticate_user, revoke_session
from core.automacao.saldoh import extrair_saldo_fap, extrair_saldo_fap_multiplo
from core.automacao.sankhya import executar_fluxo_completo
from routers import clientes, status_report, modelos, usuarios, configuracoes


def _preload_sheets():
    """Pré-carrega abas e aba atual do Google Sheets no cache ao iniciar."""
    try:
        logger.info("Preload: buscando abas do Google Sheets...")
        sheet = get_sheets_service()
        meta = sheet.get(
            spreadsheetId=SPREADSHEET_ID,
            fields="sheets(properties(title))",
        ).execute()
        abas = [reparar_texto_mojibake(s["properties"]["title"]) for s in meta["sheets"]]
        salvar_abas_cache(abas)
        logger.info("Preload: %d aba(s) cacheada(s): %s", len(abas), abas)

        aba_alvo = NOME_ABA if NOME_ABA in abas else abas[0]
        logger.info("Preload: lendo dados da aba '%s'...", aba_alvo)
        dados = ler_planilha_api(aba_alvo)
        salvar_os_cache(aba_alvo, dados)
        logger.info("Preload: %d linha(s) cacheada(s) da aba '%s'.", len(dados), aba_alvo)
    except Exception:
        logger.exception("Preload falhou — servidor continua normalmente.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _preload_sheets)
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(clientes.router)
app.include_router(status_report.router)
app.include_router(modelos.router)
app.include_router(usuarios.router)
app.include_router(configuracoes.router)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SPREADSHEET_ID = "12XtxBhWOq4wq5U_sRZ4ID46Bz0f2hHFNrKhbNe2H9RQ"
NOME_ABA = "032026"
NOME_COLUNA_STATUS = "Status experience"
ABAS_CACHE_TTL_SECONDS = 300
OS_CACHE_TTL_SECONDS = 90
SHEETS_BACKOFF_SECONDS = 75
LOCAL_STATE_LOCK = RLock()

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
CLIENTES_FILE = DATA_DIR / "clientes.json"
CREDENTIALS_FILE = DATA_DIR / "google_credentials.json"
CACHE_FILE = DATA_DIR / "pedidos_cache.json"
SHEETS_CACHE_FILE = DATA_DIR / "sheets_cache.json"


class RegisterPayload(BaseModel):
    nome: str
    email: str
    senha: str


class LoginPayload(BaseModel):
    email: str
    senha: str


# ==============================
# Auth
# ==============================
def get_sheets_service(write: bool = False):
    scope = (
        ["https://www.googleapis.com/auth/spreadsheets"]
        if write
        else ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    )

    creds = service_account.Credentials.from_service_account_file(
        CREDENTIALS_FILE,
        scopes=scope,
    )

    service = build("sheets", "v4", credentials=creds, cache_discovery=False)
    return service.spreadsheets()


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Token de acesso ausente.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Token de acesso invalido.")

    return token.strip()


def require_auth(authorization: str | None = Header(default=None)) -> dict:
    token = extract_bearer_token(authorization)
    user = get_session_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Sessao invalida ou expirada.")
    return user


@app.post("/auth/register")
def auth_register(payload: RegisterPayload):
    try:
        user = register_user(payload.nome, payload.email, payload.senha)
        token = create_session(user)
        return {"status": "ok", "token": token, "user": user}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/auth/login")
def auth_login(payload: LoginPayload):
    user = authenticate_user(payload.email, payload.senha)
    if not user:
        raise HTTPException(status_code=401, detail="Email ou senha invalidos.")

    token = create_session(user)
    return {"status": "ok", "token": token, "user": user}


@app.get("/auth/me")
def auth_me(current_user: dict = Depends(require_auth)):
    return {"status": "ok", "user": current_user}


@app.post("/auth/logout")
def auth_logout(authorization: str | None = Header(default=None), current_user: dict = Depends(require_auth)):
    token = extract_bearer_token(authorization)
    revoke_session(token)
    return {"status": "ok", "message": "Sessao encerrada."}


# ==============================
# Local JSON helpers
# ==============================
def _atomic_write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f"{path.name}.tmp")
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(temp_path, path)


def _load_json_file(path: Path, default, warning_message: str | None = None):
    with LOCAL_STATE_LOCK:
        if not path.exists():
            return copy.deepcopy(default)

        try:
            with open(path, "r", encoding="utf-8") as f:
                conteudo = f.read().strip()
                if not conteudo:
                    return copy.deepcopy(default)
                return json.loads(conteudo)
        except json.JSONDecodeError:
            if warning_message:
                logger.warning(warning_message)
            _atomic_write_json(path, default)
            return copy.deepcopy(default)


def _save_json_file(path: Path, data):
    with LOCAL_STATE_LOCK:
        _atomic_write_json(path, data)


def reparar_texto_mojibake(value):
    if isinstance(value, str) and any(marker in value for marker in ("Ã", "Â", "â", "ð")):
        try:
            return value.encode("latin-1").decode("utf-8")
        except UnicodeError:
            return value
    return value


def reparar_payload_mojibake(value):
    if isinstance(value, dict):
        return {
            reparar_payload_mojibake(chave): reparar_payload_mojibake(valor)
            for chave, valor in value.items()
        }
    if isinstance(value, list):
        return [reparar_payload_mojibake(item) for item in value]
    return reparar_texto_mojibake(value)


def ler_clientes():
    return reparar_payload_mojibake(_load_json_file(CLIENTES_FILE, {"clientes": []}))


def salvar_clientes(dados):
    _save_json_file(CLIENTES_FILE, dados)


def ler_cache():
    return reparar_payload_mojibake(_load_json_file(CACHE_FILE, {}, "Cache corrompido. Resetando arquivo."))


def salvar_cache(dados):
    _save_json_file(CACHE_FILE, dados)


def ler_sheets_cache():
    data_raw = _load_json_file(
        SHEETS_CACHE_FILE,
        {"abas": None, "os": {}, "backoff": {"abas_until": 0, "os_until": {}}},
        "Sheets cache corrompido. Resetando arquivo.",
    )
    data = reparar_payload_mojibake(data_raw)
    if data != data_raw:
        salvar_sheets_cache(data)
    data.setdefault("abas", None)
    data.setdefault("os", {})
    data.setdefault("backoff", {})
    data["backoff"].setdefault("abas_until", 0)
    data["backoff"].setdefault("os_until", {})
    return data


def salvar_sheets_cache(data):
    _save_json_file(SHEETS_CACHE_FILE, data)


def obter_abas_cache(max_age_seconds: int | None = None):
    with LOCAL_STATE_LOCK:
        cache = ler_sheets_cache()
        entry = cache.get("abas")
        if not entry:
            return None

        timestamp = entry.get("timestamp", 0)
        if max_age_seconds is not None and (time.time() - timestamp) > max_age_seconds:
            return None

        return entry.get("data") or None


def salvar_abas_cache(abas: list[str]):
    with LOCAL_STATE_LOCK:
        cache = ler_sheets_cache()
        cache["abas"] = {"timestamp": time.time(), "data": abas}
        salvar_sheets_cache(cache)


def obter_os_cache(aba: str, max_age_seconds: int | None = None):
    with LOCAL_STATE_LOCK:
        cache = ler_sheets_cache()
        entry = cache.get("os", {}).get(aba)
        if not entry:
            return None

        timestamp = entry.get("timestamp", 0)
        if max_age_seconds is not None and (time.time() - timestamp) > max_age_seconds:
            return None

        return entry.get("data")


def salvar_os_cache(aba: str, dados: list[dict]):
    with LOCAL_STATE_LOCK:
        cache = ler_sheets_cache()
        cache.setdefault("os", {})
        cache["os"][aba] = {"timestamp": time.time(), "data": dados}
        salvar_sheets_cache(cache)


def abas_em_backoff() -> bool:
    with LOCAL_STATE_LOCK:
        cache = ler_sheets_cache()
        until = cache.get("backoff", {}).get("abas_until", 0) or 0
        return until > time.time()


def registrar_backoff_abas(seconds: int = SHEETS_BACKOFF_SECONDS):
    with LOCAL_STATE_LOCK:
        cache = ler_sheets_cache()
        cache.setdefault("backoff", {})
        cache["backoff"]["abas_until"] = time.time() + seconds
        salvar_sheets_cache(cache)


def os_em_backoff(aba: str) -> bool:
    with LOCAL_STATE_LOCK:
        cache = ler_sheets_cache()
        until = cache.get("backoff", {}).get("os_until", {}).get(aba, 0) or 0
        return until > time.time()


def registrar_backoff_os(aba: str, seconds: int = SHEETS_BACKOFF_SECONDS):
    with LOCAL_STATE_LOCK:
        cache = ler_sheets_cache()
        cache.setdefault("backoff", {})
        cache["backoff"].setdefault("os_until", {})
        cache["backoff"]["os_until"][aba] = time.time() + seconds
        salvar_sheets_cache(cache)


def listar_abas_fallback():
    with LOCAL_STATE_LOCK:
        abas_cache = obter_abas_cache()
        if abas_cache:
            return abas_cache

        cache = ler_sheets_cache()
        abas_os = sorted(cache.get("os", {}).keys())
        if abas_os:
            return abas_os

        return [NOME_ABA]


# ==============================
# Sheets helpers
# ==============================
def ler_planilha_api(nome_aba: str):
    sheet = get_sheets_service()
    result = sheet.values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{nome_aba}!A1:Z1000",
    ).execute()

    values = result.get("values", [])
    if not values:
        return []

    headers = [reparar_texto_mojibake(header) for header in values[0]]
    rows = values[1:]
    dados = []

    for index, row in enumerate(rows):
        item = {}
        for i, header in enumerate(headers):
            valor = row[i] if i < len(row) else ""
            item[header] = reparar_texto_mojibake(valor)
        item["linha_id"] = index + 2
        dados.append(item)

    return dados


def buscar_letra_coluna_por_nome(sheet, nome_aba: str, nome_coluna: str) -> str:
    result = sheet.values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{nome_aba}!1:1",
    ).execute()

    headers = result.get("values", [[]])[0]

    for i, header in enumerate(headers):
        if header.strip().lower() == nome_coluna.strip().lower():
            col_letra = ""
            n = i + 1
            while n > 0:
                n, remainder = divmod(n - 1, 26)
                col_letra = chr(65 + remainder) + col_letra
            return col_letra

    raise ValueError(
        f"Coluna '{nome_coluna}' nao encontrada na planilha. "
        f"Colunas disponiveis: {headers}"
    )


def atualizar_status_por_linha(nome_aba: str, linha_id: int, novo_status: str = "OS Lançada"):
    sheet = get_sheets_service(write=True)
    letra_coluna = buscar_letra_coluna_por_nome(sheet, nome_aba, NOME_COLUNA_STATUS)
    logger.info("Coluna '%s' encontrada na letra '%s'", NOME_COLUNA_STATUS, letra_coluna)

    sheet.values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{nome_aba}!{letra_coluna}{linha_id}",
        valueInputOption="USER_ENTERED",
        body={"values": [[novo_status]]},
    ).execute()


# ==============================
# API
# ==============================
@app.get("/abas")
def listar_abas(current_user: dict = Depends(require_auth)):
    cached_abas = obter_abas_cache(max_age_seconds=ABAS_CACHE_TTL_SECONDS)
    if cached_abas:
        return {"abas": cached_abas, "origem": "cache"}

    if abas_em_backoff():
        return {
            "abas": listar_abas_fallback(),
            "origem": "fallback_backoff",
            "warning": "Google Sheets temporariamente em espera por limite de leitura.",
        }

    try:
        sheet = get_sheets_service()
        meta = sheet.get(
            spreadsheetId=SPREADSHEET_ID,
            fields="sheets(properties(title))",
        ).execute()
        abas = [reparar_texto_mojibake(sheet_item["properties"]["title"]) for sheet_item in meta["sheets"]]
        salvar_abas_cache(abas)
        return {"abas": abas, "origem": "google"}
    except Exception as exc:
        logger.exception("Erro ao listar abas")
        registrar_backoff_abas()
        fallback = listar_abas_fallback()
        logger.warning("Usando fallback de abas por indisponibilidade/quota do Google Sheets.")
        return {
            "abas": fallback,
            "origem": "fallback",
            "warning": "Nao foi possivel atualizar a lista de abas agora."
        }


@app.get("/os")
def listar_os(aba: str | None = None, current_user: dict = Depends(require_auth)):
    aba_ativa = aba or NOME_ABA
    cached_dados = obter_os_cache(aba_ativa, max_age_seconds=OS_CACHE_TTL_SECONDS)
    if cached_dados is not None:
        return {
            "status": "ok",
            "aba": aba_ativa,
            "quantidade": len(cached_dados),
            "dados": cached_dados,
            "origem": "cache",
        }

    if os_em_backoff(aba_ativa):
        stale_dados = obter_os_cache(aba_ativa)
        if stale_dados is not None:
            return {
                "status": "ok",
                "aba": aba_ativa,
                "quantidade": len(stale_dados),
                "dados": stale_dados,
                "origem": "cache_stale_backoff",
                "warning": "Dados temporariamente servidos do cache.",
            }

        return {
            "status": "warning",
            "aba": aba_ativa,
            "quantidade": 0,
            "dados": [],
            "origem": "empty_fallback_backoff",
            "warning": "Nao foi possivel consultar a planilha agora. Tente novamente em instantes.",
        }

    try:
        logger.info("Lendo OS da aba: %s", aba_ativa)
        dados = ler_planilha_api(aba_ativa)
        salvar_os_cache(aba_ativa, dados)
        return {
            "status": "ok",
            "aba": aba_ativa,
            "quantidade": len(dados),
            "dados": dados,
            "origem": "google",
        }
    except Exception as exc:
        logger.exception("Erro ao buscar OS")
        registrar_backoff_os(aba_ativa)
        stale_dados = obter_os_cache(aba_ativa)
        if stale_dados is not None:
            logger.warning("Usando cache stale da aba %s por indisponibilidade/quota do Google Sheets.", aba_ativa)
            return {
                "status": "ok",
                "aba": aba_ativa,
                "quantidade": len(stale_dados),
                "dados": stale_dados,
                "origem": "cache_stale",
                "warning": "Dados temporariamente servidos do cache.",
            }

        return {
            "status": "warning",
            "aba": aba_ativa,
            "quantidade": 0,
            "dados": [],
            "origem": "empty_fallback",
            "warning": "Nao foi possivel consultar a planilha agora. Tente novamente em instantes.",
        }


@app.get("/saldo/{empresa}")
def consultar_saldo_empresa(empresa: str, current_user: dict = Depends(require_auth)):
    dados = ler_clientes()
    cliente = next(
        (
            c for c in dados["clientes"]
            if c["empresa"].upper() == empresa.upper() and c.get("ativo", True)
        ),
        None,
    )

    if not cliente:
        raise HTTPException(status_code=404, detail="Empresa nao encontrada")

    url = cliente.get("experience_url_pedidos")
    if not url:
        raise HTTPException(status_code=400, detail="Empresa nao possui link de pedidos configurado")

    try:
        logger.info("Consultando saldo para %s", empresa)
        resultado = extrair_saldo_fap(url)
        resultado["ultima_atualizacao"] = datetime.now().isoformat()

        cache = ler_cache()
        cache[empresa] = resultado
        salvar_cache(cache)

        return {"status": "ok", "empresa": empresa, "dados": resultado}
    except Exception as exc:
        logger.exception("Erro ao consultar saldo")
        raise HTTPException(status_code=500, detail="Erro interno ao consultar saldo") from exc


@app.post("/saldo-multiplo")
def consultar_saldo_multiplo(empresas: list = Body(...), current_user: dict = Depends(require_auth)):
    if not empresas:
        raise HTTPException(status_code=400, detail="Lista vazia")

    dados_clientes = ler_clientes()
    lista_processar = []

    for nome_empresa in empresas:
        cliente = next(
            (
                c for c in dados_clientes["clientes"]
                if c["empresa"].upper() == nome_empresa.upper() and c.get("ativo", True)
            ),
            None,
        )
        if not cliente:
            continue

        lista_processar.append({
            "empresa": cliente["empresa"],
            "url": cliente.get("experience_url_pedidos"),
        })

    if not lista_processar:
        raise HTTPException(status_code=404, detail="Nenhuma empresa valida encontrada")

    logger.info("Iniciando processamento multiplo de saldo")
    resultados = extrair_saldo_fap_multiplo(lista_processar)

    cache = ler_cache()
    for empresa, resultado in resultados.items():
        cache[empresa] = resultado
    salvar_cache(cache)

    return {
        "status": "finalizado",
        "consultadas": len(resultados),
        "dados": resultados,
    }


@app.get("/cache")
def retornar_cache_completo(current_user: dict = Depends(require_auth)):
    clientes_data = ler_clientes()
    cache = ler_cache()

    for cliente in clientes_data.get("clientes", []):
        if not cliente.get("ativo", True):
            continue

        empresa = cliente.get("empresa", "").strip()
        if empresa not in cache:
            cache[empresa] = {
                "codigo": None,
                "hrs_alocadas": None,
                "hrs_consumidas": None,
                "saldo_horas": None,
                "tipo_operacao": None,
                "tipo": None,
                "data_mais_recente": None,
                "ultima_atualizacao": None,
            }

    return cache


@app.post("/executar")
def executar_automacao(payload: list = Body(...), current_user: dict = Depends(require_auth)):
    if not payload:
        raise HTTPException(status_code=400, detail="Nenhuma OS enviada")

    try:
        logger.info("Execucao de automacao iniciada por %s", current_user["email"])
        resultado = executar_fluxo_completo(payload)

        for os_item in resultado.get("sucesso", []):
            linha_id = os_item.get("linha_id")
            if linha_id:
                try:
                    atualizar_status_por_linha(os_item.get("aba") or NOME_ABA, int(linha_id))
                except Exception:
                    logger.exception("Erro ao atualizar linha %s", linha_id)

        logger.info("Execucao finalizada")
        return {
            "status": "Automacao executada",
            "sucesso": resultado.get("sucesso", []),
            "falha": resultado.get("falha", []),
        }
    except Exception as exc:
        logger.exception("Erro durante execucao")
        raise HTTPException(status_code=500, detail="Erro durante execucao") from exc
