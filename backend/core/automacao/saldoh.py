# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from datetime import datetime
import traceback
import time
from pathlib import Path


# ======================================================
# UTIL — IDENTIFICAR SE DESCRIÇÃO É SUSTENTAÇÃO
# ======================================================
def descricao_eh_sustentacao(texto: str):
    if not texto:
        return False

    texto = texto.lower()

    palavras_chave = [
        "contrato de sustentação",
        "contrato sustentacao",
        "manutenção da sustentação",
        "manutencao da sustentacao",
        "sustentação",
        "sustentacao",
    ]

    return any(p in texto for p in palavras_chave)


# ======================================================
# EXTRAÇÃO BASE (REUTILIZA PAGE)
# ======================================================
def extrair_saldo_de_page(page, url_pedido: str, empresa: str = ""):

    resultado = {
        "codigo": None,
        "hrs_alocadas": None,
        "hrs_consumidas": None,
        "saldo_horas": None,
        "tipo_operacao": None,
        "tipo": None,
        "data_mais_recente": None,
    }

    INDICE_DATA = 10
    label = f"[{empresa}]" if empresa else "[?]"

    print(f"\n{'='*55}")
    print(f"  {label} Iniciando consulta...")
    print(f"  URL: {url_pedido}")
    print(f"{'='*55}")

    print(f"  {label} Navegando para a página...")
    page.goto(url_pedido, timeout=60000)
    page.wait_for_load_state("networkidle")
    print(f"  {label} Página carregada.")

    print(f"  {label} Aplicando filtro...")
    page.locator("#filtrar-button").click()
    page.wait_for_selector("tbody tr", timeout=15000)
    print(f"  {label} Filtro aplicado.")

    print(f"  {label} Selecionando 100 registros por página...")
    dropdown = page.locator("div.p-dropdown").last
    dropdown.click()
    page.wait_for_selector("li[role='option']", timeout=10000)
    page.locator("li[role='option']", has_text="100").click()

    page.wait_for_load_state("networkidle", timeout=15000)
    page.wait_for_selector("tbody tr", timeout=15000)
    time.sleep(1.5)

    linhas = page.locator("tbody tr")
    total = linhas.count()
    print(f"  {label} Grid carregada — {total} linha(s) encontrada(s).")

    pedidos = []

    for i in range(total):
        linha = linhas.nth(i)
        colunas = linha.locator("td")

        if colunas.count() <= INDICE_DATA:
            continue

        data_texto = colunas.nth(INDICE_DATA).inner_text().strip()

        try:
            data_obj = datetime.strptime(data_texto, "%d/%m/%Y")
        except Exception:
            continue

        codigo = colunas.nth(0).inner_text().strip()
        hrs_alocadas = colunas.nth(1).inner_text().strip()
        hrs_consumidas = colunas.nth(2).inner_text().strip()
        saldo_horas = colunas.nth(3).inner_text().strip()
        tipo_operacao = colunas.nth(4).inner_text().strip()
        tipo = colunas.nth(7).inner_text().strip()

        descricao = ""
        try:
            span = colunas.nth(9).locator("span[title]").first
            descricao = span.get_attribute("title") or ""
        except Exception:
            pass

        pedidos.append({
            "data": data_obj,
            "codigo": codigo,
            "hrs_alocadas": hrs_alocadas,
            "hrs_consumidas": hrs_consumidas,
            "saldo_horas": saldo_horas,
            "tipo_operacao": tipo_operacao,
            "tipo": tipo,
            "descricao": descricao,
            "data_texto": data_texto,
        })

    print(f"  {label} {len(pedidos)} pedido(s) válido(s) processado(s).")

    if not pedidos:
        print(f"  {label} ⚠️  Nenhum pedido encontrado. Retornando vazio.")
        return resultado

    # ======================================================
    # LÓGICA DE PRIORIZAÇÃO
    # ======================================================
    medicoes = [p for p in pedidos if p["tipo"].lower() == "medição"]

    if medicoes:
        pedido_escolhido = max(medicoes, key=lambda x: x["data"])
        print(f"  {label} Tipo selecionado: Medição")
    else:
        empreitos_sust = [
            p for p in pedidos
            if p["tipo"].lower() == "empreito"
            and descricao_eh_sustentacao(p["descricao"])
        ]

        if empreitos_sust:
            pedido_escolhido = max(empreitos_sust, key=lambda x: x["data"])
            print(f"  {label} Tipo selecionado: Empreito (Sustentação)")
        else:
            pedido_escolhido = max(pedidos, key=lambda x: x["data"])
            print(f"  {label} Tipo selecionado: Fallback (mais recente)")

    print(
        f"  {label} Pedido escolhido: #{pedido_escolhido['codigo']} "
        f"| Data: {pedido_escolhido['data_texto']} "
        f"| Saldo: {pedido_escolhido['saldo_horas']}"
    )
    print(f"  {label} ✓ OK\n")

    return {
        "codigo": pedido_escolhido["codigo"],
        "hrs_alocadas": pedido_escolhido["hrs_alocadas"],
        "hrs_consumidas": pedido_escolhido["hrs_consumidas"],
        "saldo_horas": pedido_escolhido["saldo_horas"],
        "tipo_operacao": pedido_escolhido["tipo_operacao"],
        "tipo": pedido_escolhido["tipo"],
        "data_mais_recente": pedido_escolhido["data_texto"],
    }


# ======================================================
# FUNÇÃO INDIVIDUAL
# ======================================================
def extrair_saldo_fap(url_pedido: str):
    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                user_data_dir=str(Path(__file__).resolve().parents[2] / "runtime" / "sankhya_profile"),
                headless=False,
                args=["--start-maximized"],
                no_viewport=True,
            )

            page = context.new_page()
            resultado = extrair_saldo_de_page(page, url_pedido)
            context.close()
            return resultado

    except Exception as e:
        print(f"  ✗ Erro individual: {str(e)}")
        traceback.print_exc()
        return {}


# ======================================================
# FUNÇÃO MÚLTIPLA
# ======================================================
def extrair_saldo_fap_multiplo(lista_urls: list):
    resultados = {}
    total_empresas = len(lista_urls)

    print(f"\n{'#'*55}")
    print(f"  INICIANDO CONSULTA MÚLTIPLA — {total_empresas} empresa(s)")
    print(f"{'#'*55}")

    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                user_data_dir=str(Path(__file__).resolve().parents[2] / "runtime" / "sankhya_profile"),
                headless=False,
                args=["--start-maximized"],
                no_viewport=True,
            )

            page = context.new_page()

            for idx, item in enumerate(lista_urls, start=1):
                empresa = item["empresa"]
                url = item["url"]

                print(f"\n  [{idx}/{total_empresas}] Abrindo empresa: {empresa}")

                try:
                    resultado = extrair_saldo_de_page(page, url, empresa=empresa)
                    resultado["ultima_atualizacao"] = datetime.now().isoformat()
                    resultados[empresa] = resultado
                except Exception as e:
                    print(f"  ✗ [{empresa}] Erro: {str(e)}")
                    traceback.print_exc()
                    resultados[empresa] = {"erro": str(e)}

            context.close()

    except Exception as e:
        print(f"\n  ✗ Erro geral no contexto: {str(e)}")
        traceback.print_exc()

    print(f"\n{'#'*55}")
    print(f"  CONSULTA FINALIZADA — {len(resultados)}/{total_empresas} empresa(s) processada(s)")
    print(f"{'#'*55}\n")

    return resultados
