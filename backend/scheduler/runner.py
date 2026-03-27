from __future__ import annotations

import logging
from datetime import date

from apscheduler.schedulers.background import BackgroundScheduler

from core.db import get_db
from scheduler.tasks import status_report

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler()


# ── Send-day logic ─────────────────────────────────────────────────────────────

def should_run_today(config: dict) -> bool:
    """Return True if the given config should fire today."""
    today = date.today()
    dia_envio: int = config.get("dia_envio", 1)
    periodo: str = (config.get("periodo") or "mensal").lower()

    if periodo == "mensal":
        return today.day == dia_envio

    if periodo == "quinzenal":
        segunda = ((dia_envio + 14) % 28) or 28
        return today.day == dia_envio or today.day == segunda

    if periodo == "semanal":
        return (today.day - dia_envio) % 7 == 0

    # Unknown period — default to monthly behaviour
    logger.warning(
        "Periodo desconhecido '%s' na config %s — usando regra mensal.",
        periodo,
        config.get("id"),
    )
    return today.day == dia_envio


# ── Main job ───────────────────────────────────────────────────────────────────

def verificar_e_disparar() -> None:
    """Fetch all active configs and process those that should fire today."""
    logger.info("Scheduler: iniciando verificacao de disparo (%s)", date.today().isoformat())

    try:
        db = get_db()
        res = db.table("status_report_configs").select("*").eq("ativo", True).execute()
        configs = res.data or []
    except Exception:
        logger.exception("Scheduler: erro ao buscar status_report_configs.")
        return

    logger.info("Scheduler: %d config(s) ativa(s) encontrada(s).", len(configs))

    for config in configs:
        try:
            if not should_run_today(config):
                logger.debug(
                    "Scheduler: config %s ignorada — nao e dia de envio.", config.get("id")
                )
                continue

            logger.info(
                "Scheduler: disparando status_report para config %s (cliente %s).",
                config.get("id"),
                config.get("cliente_id"),
            )
            status_report.processar(config)

        except Exception:
            logger.exception(
                "Scheduler: erro nao tratado ao processar config %s.", config.get("id")
            )


# ── Lifecycle ──────────────────────────────────────────────────────────────────

def start() -> None:
    """Start the background scheduler with a daily 08:00 job."""
    _scheduler.add_job(
        verificar_e_disparar,
        trigger="cron",
        hour=8,
        minute=0,
        id="status_report_diario",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Scheduler iniciado — job 'status_report_diario' agendado para 08:00.")


def stop() -> None:
    """Gracefully stop the scheduler."""
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler encerrado.")
