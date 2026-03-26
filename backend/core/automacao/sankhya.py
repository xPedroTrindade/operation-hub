# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from collections import defaultdict
import re
import traceback
import unicodedata
from pathlib import Path


# ======================================================
# UTIL – NORMALIZAR TEXTO
# ======================================================
def normalizar(texto):
    if not texto:
        return ""
    texto = unicodedata.normalize("NFD", texto)
    texto = texto.encode("ascii", "ignore").decode("utf-8")
    return texto.lower().strip()


# ======================================================
# UTIL – NORMALIZAR HORA PARA HH:MM
# Aceita: "12:05", "12:05:00", "9:5", "09:05:00", etc.
# Retorna sempre: "HH:MM"
# ======================================================
def normalizar_hora(hora: str) -> str:
    if not hora:
        return ""
    hora = str(hora).strip()

    partes = hora.split(":")
    if len(partes) >= 2:
        hh = partes[0].zfill(2)
        mm = partes[1].zfill(2)
        return f"{hh}:{mm}"

    return hora


# ======================================================
# FUNÇÃO PRINCIPAL
# ======================================================
def executar_fluxo_completo(lista_os: list):

    print("\n==================================================", flush=True)
    print("🚀 INICIANDO AUTOMAÇÃO COMPLETA DE OS", flush=True)
    print("==================================================\n", flush=True)

    erros = []
    sucessos = []

    try:
        grupos = defaultdict(list)
        for os_data in lista_os:
            grupos[os_data["empresa"]].append(os_data)

        with sync_playwright() as p:

            context = p.chromium.launch_persistent_context(
                user_data_dir=str(Path(__file__).resolve().parents[2] / "runtime" / "sankhya_profile"),
                headless=False,
                args=["--start-maximized"],
                no_viewport=True
            )

            page = context.new_page()
            page.on("console", lambda msg: print(f"[Browser] {msg.text}", flush=True))

            for empresa, lista_empresa in grupos.items():

                print(f"\n🔷 PROCESSANDO EMPRESA: {empresa}", flush=True)

                try:
                    page.goto(lista_empresa[0]["experience_url_etapas"], timeout=60000)
                    page.wait_for_selector("text=Gestão do Projeto", timeout=30000)
                except Exception as e_nav:
                    print(f"❌ Falha ao abrir empresa {empresa}", flush=True)
                    for os_data in lista_empresa:
                        erros.append({**os_data, "motivo": f"Falha ao navegar para a página da empresa {empresa}: {str(e_nav)}"})
                    continue

                for os_data in lista_empresa:
                    try:
                        sucesso, erro_info = executar_os(page, os_data)

                        if sucesso:
                            sucessos.append(os_data)
                            print(
                                f"🟢 SUCESSO | Linha: {os_data.get('linha_id')} "
                                f"| Empresa: {os_data.get('empresa')} "
                                f"| Usuário: {os_data.get('usuario')} "
                                f"| OS: {os_data.get('ticket')}",
                                flush=True
                            )
                        else:
                            erros.append(erro_info)
                            print(
                                f"🔴 FALHA | Linha: {os_data.get('linha_id')} "
                                f"| Empresa: {os_data.get('empresa')} "
                                f"| Usuário: {os_data.get('usuario')} "
                                f"| OS: {os_data.get('ticket')}",
                                flush=True
                            )

                    except Exception as e:
                        print(f"❌ ERRO inesperado na OS {os_data.get('ticket')}: {e}", flush=True)
                        traceback.print_exc()
                        erros.append({**os_data, "motivo": f"Erro inesperado: {str(e)}"})

            context.close()

    except PlaywrightTimeout as e:
        print("⏰ Timeout detectado:", str(e), flush=True)
        traceback.print_exc()

    except Exception as e:
        print("❌ ERRO CRÍTICO NA AUTOMAÇÃO:", str(e), flush=True)
        traceback.print_exc()

    finally:
        print("\n==================================================", flush=True)
        print("📊 RELATÓRIO FINAL DA EXECUÇÃO", flush=True)
        print("==================================================", flush=True)

        print(f"✔ Total Sucesso: {len(sucessos)}", flush=True)
        print(f"❌ Total Falha: {len(erros)}", flush=True)

        if sucessos:
            print("\n🟢 LINHAS QUE SERÃO ATUALIZADAS NA PLANILHA:", flush=True)
            for item in sucessos:
                print(
                    f"   ➜ Linha {item.get('linha_id')} | "
                    f"Empresa: {item.get('empresa')} | "
                    f"OS: {item.get('ticket')}",
                    flush=True
                )

        if erros:
            print("\n🔴 LINHAS COM FALHA:", flush=True)
            for erro in erros:
                print(
                    f"   ➜ Linha {erro.get('linha_id')} | "
                    f"Empresa: {erro.get('empresa')} | "
                    f"OS: {erro.get('ticket')}",
                    flush=True
                )

        print("\n🏁 Execução finalizada.\n", flush=True)

    return {
        "sucesso": sucessos,
        "falha": erros
    }


# ======================================================
# EXECUTA UMA ÚNICA OS
# ======================================================
def executar_os(page, os_data: dict):

    print(f"\n➡️ Lançando OS: {os_data['ticket']} (Linha {os_data.get('linha_id')})", flush=True)

    page.wait_for_selector("text=Gestão do Projeto", timeout=20000)

    if page.locator("span.checkbox-activity").count() == 0:
        page.locator("div.process-check", has_text="Atendimento Avulso").click()

    if page.locator("div.p-checkbox.p-highlight").count() == 0:
        page.locator("span.checkbox-activity").click()

    page.get_by_role("button", name="Novo").click()
    page.wait_for_selector("#application", state="visible", timeout=15000)

    # ======================================================
    # PEDIDO
    # ======================================================
    page.locator("#application").click()
    page.wait_for_selector("li[role='option']", timeout=10000)

    opcoes = page.locator("li[role='option']")
    total_opcoes = opcoes.count()

    maior_codigo = -1
    opcao_escolhida = None

    for i in range(total_opcoes):
        label = opcoes.nth(i).get_attribute("aria-label") or ""
        match = re.search(r"Código:\s*(\d+)", label)
        if match:
            codigo = int(match.group(1))
            if codigo > maior_codigo:
                maior_codigo = codigo
                opcao_escolhida = opcoes.nth(i)

    if not opcao_escolhida:
        print("❌ Nenhum código encontrado.", flush=True)
        page.locator("#cancelar-button").click()
        return False, {**os_data, "motivo": "Nenhum código de pedido encontrado para a empresa"}

    opcao_escolhida.click()

    # ======================================================
    # USUÁRIO
    # ======================================================
    campo_usuario = page.locator("#person")
    campo_usuario.click()

    page.keyboard.press("Control+A")
    page.keyboard.type(os_data["usuario"])

    try:
        page.wait_for_selector("li[role='option']", state="visible", timeout=10000)
    except Exception:
        print("❌ Lista de usuários não carregou.", flush=True)
        page.locator("#cancelar-button").click()
        return False, {**os_data, "motivo": f"Lista de usuários não carregou ao buscar '{os_data['usuario']}' na empresa {os_data.get('empresa', '')}"}

    opcoes_usuario = page.locator("li[role='option']")
    total_opcoes = opcoes_usuario.count()

    if total_opcoes == 0:
        print("❌ Nenhum usuário retornado.", flush=True)
        page.locator("#cancelar-button").click()
        return False, {**os_data, "motivo": f"Nenhum usuário retornado ao buscar '{os_data['usuario']}' na empresa {os_data.get('empresa', '')}"}

    nome_planilha = normalizar(os_data["usuario"])
    palavras_planilha = nome_planilha.split()

    melhor_match = None
    melhor_score = 0

    for i in range(total_opcoes):
        opcao = opcoes_usuario.nth(i)

        try:
            texto_opcao_original = opcao.inner_text(timeout=5000)
        except Exception:
            continue

        texto_opcao = normalizar(texto_opcao_original)
        palavras_opcao = texto_opcao.split()

        score = sum(1 for p in palavras_planilha if p in palavras_opcao)

        if score > melhor_score:
            melhor_score = score
            melhor_match = opcao

    minimo = 1 if len(palavras_planilha) == 1 else 2

    if not melhor_match or melhor_score < minimo:
        print(f"❌ Usuário não encontrado: {os_data['usuario']}", flush=True)
        page.locator("#cancelar-button").click()
        return False, {**os_data, "motivo": f"Usuário '{os_data['usuario']}' não encontrado na empresa {os_data.get('empresa', '')} (verifique o nome no Painel Admin)"}

    melhor_match.click()

    # ======================================================
    # DATA
    # ======================================================
    campo_data = page.locator("#date_to_do input[data-pc-section='root']")
    campo_data.wait_for(state="visible", timeout=10000)
    campo_data.click()
    page.wait_for_timeout(300)
    campo_data.fill(os_data["data"])
    page.wait_for_timeout(300)
    page.keyboard.press("Tab")

    # ======================================================
    # HORAS
    # ======================================================
    hora_inicio = normalizar_hora(os_data["hora_inicio"])
    hora_fim    = normalizar_hora(os_data["hora_fim"])

    print(f"   🕐 Hora início: {os_data['hora_inicio']} → {hora_inicio}", flush=True)
    print(f"   🕐 Hora fim:    {os_data['hora_fim']} → {hora_fim}", flush=True)

    page.locator("#hour_to_start").fill(hora_inicio)
    page.locator("#hour_to_finish").fill(hora_fim)

    # OBSERVAÇÃO
    page.locator("#additional_information").fill(os_data["ticket"])

    # SALVAR
    page.locator("#salvar-button").wait_for(state="visible", timeout=15000)
    page.locator("#salvar-button").click()

    page.locator("button.swal2-confirm").wait_for(timeout=15000)
    page.locator("button.swal2-confirm").click()

    print(f"✅ OS {os_data['ticket']} concluída com sucesso.", flush=True)

    return True, None
