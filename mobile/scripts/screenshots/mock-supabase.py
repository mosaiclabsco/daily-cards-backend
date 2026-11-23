"""Supabase simulado para capturar telas do app no web (scripts/screenshots/README.md). Não é usado pelo app."""
import json
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

SEED = [
    ('software', 'technology', 'area.software'), ('inteligencia-artificial', 'technology', 'area.artificial_intelligence'),
    ('infraestrutura', 'technology', 'area.infrastructure'), ('cloud-devops', 'technology', 'area.cloud_devops'), ('ciberseguranca', 'technology', 'area.cybersecurity'),
    ('marketing-digital', 'business', 'area.digital_marketing'), ('social-media', 'business', 'area.social_media'),
    ('produto', 'business', 'area.product'), ('rh', 'business', 'area.hr'),
    ('corretor-imoveis', 'business', 'area.real_estate'), ('design-ux-ui', 'design', 'area.ux_ui'),
    ('professores', 'education', 'area.teachers'), ('odontologia', 'health', 'area.dentistry'),
    ('direito', 'law', 'area.law'), ('arquitetura', 'architecture_engineering', 'area.architecture'),
    ('engenharia-civil', 'architecture_engineering', 'area.civil_engineering'), ('nutricao', 'health', 'area.nutrition'),
    ('fisioterapia', 'health', 'area.physiotherapy'), ('educacao-fisica', 'health', 'area.physical_education'),
]
CAREER = {'direito', 'arquitetura', 'engenharia-civil', 'nutricao', 'fisioterapia', 'educacao-fisica'}
AREAS = [{'id': f'00000000-0000-0000-0000-{i:012d}', 'slug': s, 'group_key': g, 'name_key': n, 'sort': (i + 1) * 10}
         for i, (s, g, n) in enumerate(SEED)]
SW = AREAS[0]['id']

CONTENT = {
    'term': ('Idempotência: repetir a operação não muda o resultado após a 1ª vez',
             'Uma requisição é idempotente quando enviá-la uma ou várias vezes deixa o servidor no mesmo estado. No HTTP, GET, PUT e DELETE são idempotentes por definição; POST não. A propriedade é o que torna seguro reenviar uma chamada depois de um timeout.',
             None, 'https://developer.mozilla.org/en-US/docs/Glossary/Idempotent', 'MDN Web Docs', None),
    'tip': ('No Google, a mudança de código revisada tem mediana de 24 linhas',
            'Um estudo com 9 milhões de revisões no Google (ICSE 2018) mostrou que mais de 35% das mudanças alteram um só arquivo e menos de 25% têm mais de um revisor. O tamanho pequeno é o que sustenta a regra do guia público da empresa: responder a um pedido de revisão em no máximo um dia útil.',
            None, 'https://research.google/pubs/modern-code-review-a-case-study-at-google/', 'Google Research', None),
    'question': ('Qual status HTTP indica excesso de requisições?',
                 '429 Too Many Requests. O 503 indica serviço indisponível, sem relação direta com limite por cliente.',
                 {'options': ['401 Unauthorized', '404 Not Found', '429 Too Many Requests', '503 Service Unavailable'], 'answer': 2},
                 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429', 'MDN Web Docs', None),
    'trend': ('O Node.js 24 entrou em suporte de longo prazo (LTS)',
              'A versão passa a receber correções e atualizações de segurança por 30 meses. É a linha recomendada pelo projeto para produção.',
              None, 'https://nodejs.org/en/blog', 'Node.js Blog', '2026-11-18'),
}
SLOTS = ['term', 'tip', 'question', 'term', 'trend', 'tip', 'question']  # seg..dom


# Variações para as listas de Explorar não repetirem o mesmo texto.
EXTRA = {
    'term': [
        ('Backpressure: o consumidor sinaliza que não dá conta do ritmo do produtor', 'https://nodejs.org/en/learn/modules/backpressuring-in-streams', 'Node.js Learn'),
        ('Chave de idempotência: o que torna seguro repetir um POST', 'https://docs.stripe.com/api/idempotent_requests', 'Stripe Docs'),
        ('Lock otimista: a escrita só vale se ninguém mudou o registro antes', 'https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html', 'Martin Fowler'),
        ('MVCC: no PostgreSQL, UPDATE cria uma versão nova da linha', 'https://www.postgresql.org/docs/current/routine-vacuuming.html', 'PostgreSQL'),
        ('Circuit breaker: fechado, aberto e meio-aberto', 'https://martinfowler.com/bliki/CircuitBreaker.html', 'Martin Fowler'),
    ],
    'tip': [
        ('O SQLite tem 590 vezes mais código de teste do que código de produto', 'https://www.sqlite.org/testing.html', 'SQLite'),
        ('No npm, ^0.2.3 aceita bem menos versões do que ^1.2.3', 'https://docs.npmjs.com/cli/v10/using-npm/semver', 'npm Docs'),
    ],
}


def card(day, kind, locked=True):
    w, body, q, url, label, fact = CONTENT[kind]
    if day and kind in EXTRA:
        options = [(w, url, label)] + EXTRA[kind]
        w, url, label = options[date.fromisoformat(day).toordinal() // 7 % len(options) if kind == 'tip' else date.fromisoformat(day).toordinal() % len(options)]
    is_locked = kind == 'question' and locked
    return {'day': day, 'card_id': f'card-{kind}-{day}', 'area_id': SW, 'version': 1, 'type': kind,
            'layer': 'technical', 'widget_text': w, 'body': None if is_locked else body, 'locked': is_locked,
            'question': q, 'source_url': url, 'source_label': label, 'fact_date': fact,
            'community_updated': False, 'my_rating': None, 'favorited': kind == 'tip'}


class H(BaseHTTPRequestHandler):
    def _send(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send({})

    def do_HEAD(self):
        self._send({})

    def do_GET(self):
        u = urlparse(self.path)
        if u.path.endswith('/areas'):
            return self._send(AREAS)
        if u.path.endswith('/area_countries'):
            return self._send([{'area_id': a['id'], 'layer': 'career' if a['slug'] in CAREER else 'full'} for a in AREAS])
        if u.path.endswith('/user_areas'):
            return self._send([{'area_id': SW, 'started_on': '2026-11-01', 'created_at': '2026-11-01T10:00:00Z'}])
        if u.path.endswith('/subscriptions'):
            return self._send(None) if 'application/vnd.pgrst.object' in (self.headers.get('Accept') or '') else self._send([])
        if u.path.endswith('/auth/v1/user'):
            return self._send({'id': 'u1', 'email': 'igor@example.com', 'aud': 'authenticated', 'role': 'authenticated'})
        self._send({})

    def do_POST(self):
        u = urlparse(self.path)
        n = int(self.headers.get('Content-Length') or 0)
        args = json.loads(self.rfile.read(n) or b'{}')
        fn = u.path.rsplit('/', 1)[-1]
        if fn == 'get_sample':
            return self._send({**card(None, 'term'), 'favorited': False})
        if fn == 'get_track':
            d0, d1 = date.fromisoformat(args['p_from']), date.fromisoformat(args['p_to'])
            out, d = [], max(d0, date.fromisoformat('2026-11-01'))
            while d <= d1:
                out.append(card(d.isoformat(), SLOTS[d.weekday()]))
                d += timedelta(days=1)
            return self._send(out)
        if fn == 'list_favorites':
            return self._send([{**card(None, 'tip'), 'favorited': True}])
        if fn == 'toggle_favorite':
            return self._send(True)
        self._send(None)


ThreadingHTTPServer(('127.0.0.1', 54399), H).serve_forever()
