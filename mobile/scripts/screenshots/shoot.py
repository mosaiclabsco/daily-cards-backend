"""Captura as telas do app rodando no web (Expo) contra o Supabase simulado (mock-supabase.py).

Uso: python3 shoot.py <pasta de saída>   (ex.: /tmp/capturas/v2; as imagens vão para a aba Design do documento do MVP)
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

OUT = sys.argv[1] if len(sys.argv) > 1 else 'capturas'
CHROME = os.environ.get('CHROME_PATH')  # opcional: caminho do Chrome instalado
BASE = 'http://localhost:8081'
# Respostas já dadas a duas perguntas anteriores (uma certa, uma errada), para a lista de Explorar.
ANSWERS = {'card-question-2026-11-18': 2, 'card-question-2026-11-22': 0}
SESSION = {
    'access_token': 'x.eyJzdWIiOiJ1MSJ9.y', 'token_type': 'bearer', 'expires_in': 3600,
    'expires_at': 4102444800, 'refresh_token': 'r',
    'user': {'id': 'u1', 'email': 'igor@example.com', 'aud': 'authenticated', 'role': 'authenticated',
             'app_metadata': {}, 'user_metadata': {}, 'created_at': '2026-11-01T00:00:00Z'},
}
ONB = {'areaId': '00000000-0000-0000-0000-000000000000', 'areaSlug': 'software', 'relationship': 'works'}

def shoot(p, name, path, *, day='2026-11-23T10:00:00', logged=False, onboarding=False, dark=False, actions=None, wait=6000):
    ctx = (p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()).new_context(
        viewport={'width': 390, 'height': 844}, device_scale_factor=2, locale='pt-BR',
        color_scheme='dark' if dark else 'light', timezone_id='America/Sao_Paulo')
    page = ctx.new_page()
    page.clock.install(time=day)
    init = ''
    if logged:
        init += f"localStorage.setItem('sb-127-auth-token', {json.dumps(json.dumps(SESSION))});"
        init += f"localStorage.setItem('dailycards:answers', {json.dumps(json.dumps(ANSWERS))});"
    if onboarding:
        init += f"localStorage.setItem('dailycards:onboarding', {json.dumps(json.dumps(ONB))});"
    if init:
        page.add_init_script(init)
    page.goto(BASE + path)
    page.wait_for_timeout(wait)
    for a in actions or []:
        a(page)
        page.wait_for_timeout(1200)
    close = page.get_by_label('Close')
    if dark and close.count():
        close.first.click()
        page.wait_for_timeout(500)
    page.screenshot(path=f'{OUT}/{name}.png')
    ctx.browser.close()

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        shoot(p, '01-boas-vindas', '/')
        shoot(p, '02-area', '/area')
        shoot(p, '03-profissao', '/profession?group=health')
        shoot(p, '04-relacao', '/relationship', onboarding=True)
        shoot(p, '05-previa', '/preview', onboarding=True)
        shoot(p, '06-criar-conta', '/sign-up')
        shoot(p, '07-hoje-termo', '/today', logged=True)
        shoot(p, '08-hoje-pergunta', '/today', logged=True, day='2026-11-25T10:00:00',
              actions=[lambda pg: pg.get_by_text('429 Too Many Requests').click()])
        shoot(p, '09-explorar-termos', '/explore', logged=True)
        shoot(p, '10-explorar-perguntas', '/explore', logged=True,
              actions=[lambda pg: pg.get_by_text('Perguntas', exact=False).first.click()])
        shoot(p, '11-salvos', '/saved', logged=True)
        shoot(p, '12-perfil', '/profile', logged=True)
        shoot(p, '13-premium', '/premium', logged=True)
        shoot(p, '14-hoje-escuro', '/today', logged=True, dark=True)
