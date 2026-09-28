"""Builds the "website cost by country" guides from _build/posts into blog/.

Each post is _build/posts/<path>.html:  <!--meta {json} -->  followed by the body HTML.
Tokens in the body:  {{bunkwise_table}}  {{price:<key>}}  {{hub_list}}
BunkWise prices come from REGIONS in website-design.html, so a price change is:
edit REGIONS, then run  python _build/build.py.

Also regenerates the marked sections of blog/index.html, sitemap.xml and llms.txt,
and fails loudly if a page breaks the checks in check_page() / check_similarity().
Nothing in _build/ is published (Jekyll skips folders starting with "_").
"""
import html, json, os, re, sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS = os.path.join(ROOT, '_build', 'posts')
SITE = 'https://bunkwise.in'
KEYS = ['starter', 'business', 'growth', 'premium', 'seoLocal', 'seoGrowth', 'seoAdv']
PACKAGES = [  # key, name, delivery, what's included (mirrors website-design.html #pricing)
    ('starter', 'Starter', 'about 1 week', '3–4 pages, mobile-first design, contact form, WhatsApp button, Google Maps, basic SEO, Google Analytics and Search Console'),
    ('business', 'Business', 'about 2 weeks', '5–7 custom-designed pages, keyword research, on-page and technical SEO, LocalBusiness schema, Google Business Profile integration'),
    ('growth', 'Growth', 'about 3 weeks', 'Up to 10 pages, competitor analysis, local SEO structure, AEO and GEO for AI search, keyword-focused copywriting, 20–30 FAQs'),
    ('premium', 'Premium', '4–6 weeks', '15+ pages, blog with 3–5 starter articles, 30–50 FAQs, technical SEO audit, citation and backlink strategy, monthly report'),
]
SEO_PLANS = [
    ('seoLocal', 'Local SEO', 'Google Business Profile optimisation, local keyword monitoring, technical fixes, 1–2 content updates, monthly report'),
    ('seoGrowth', 'Growth SEO', '2–4 SEO articles a month, new landing pages, competitor monitoring, backlink and citation work'),
    ('seoAdv', 'Advanced SEO', '4–8 content pieces a month, multiple landing pages, link-building, digital PR, conversion-rate optimisation'),
]
BUNKWISE_BLOCK = re.compile(r'<!-- bunkwise -->.*?<!-- /bunkwise -->', re.S)


def load(p):
    with open(p, encoding='utf-8', newline='') as f:
        return f.read().replace('\r\n', '\n')


def save(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8', newline='') as f:
        f.write(s.replace('\n', '\r\n'))


def regions():
    src = load(os.path.join(ROOT, 'website-design.html'))
    found = re.findall(r"(\w+):\s*\{ name: '([^']*)',\s*cur: '([^']*)',(\s*gst: true,)?\s*p: \[([\d, ]+)\]", src)
    out = {k: {'name': n, 'cur': c, 'gst': bool(g), 'p': dict(zip(KEYS, map(int, p.split(','))))} for k, n, c, g, p in found}
    assert {'IN', 'US', 'GB', 'EU', 'AE', 'AU', 'CA', 'SG', 'INTL'} <= set(out), out.keys()
    return out


R = regions()


def price(region, key):
    r = R[region]
    return r['cur'] + f"{r['p'][key]:,}"


def bunkwise_table(region):
    r = R[region]
    tax = ('Prices exclude GST.' if r['gst'] else
           'Any local sales tax or VAT depends on your own country\'s rules for services bought from abroad; your accountant can confirm.')
    rows = '\n'.join(
        f'                        <tr><th scope="row">{n}</th><td>{price(region, k)}</td><td>{d}</td><td>{inc}</td></tr>'
        for k, n, d, inc in PACKAGES)
    seo = '\n'.join(
        f'                        <tr><th scope="row">{n}</th><td>{price(region, k)}/month</td><td>{inc}</td></tr>'
        for k, n, inc in SEO_PLANS)
    return f'''<!-- bunkwise -->
            <div class="table-wrap">
                <table class="bw-table">
                    <caption>BunkWise website packages, one-time price ({r['name']} pricing)</caption>
                    <thead><tr><th scope="col">Package</th><th scope="col">Price</th><th scope="col">Typical delivery</th><th scope="col">What it includes</th></tr></thead>
                    <tbody>
{rows}
                    </tbody>
                </table>
            </div>
            <div class="table-wrap">
                <table class="bw-table">
                    <caption>BunkWise monthly SEO plans (optional)</caption>
                    <thead><tr><th scope="col">Plan</th><th scope="col">Price</th><th scope="col">What it includes</th></tr></thead>
                    <tbody>
{seo}
                    </tbody>
                </table>
            </div>
            <p class="sources">BunkWise prices as published on the <a href="/website-design.html#qa-prices">pricing page</a>. {tax}</p>
<!-- /bunkwise -->'''


def human(d):
    return date.fromisoformat(d).strftime('%b %-d, %Y') if os.name != 'nt' else date.fromisoformat(d).strftime('%b %#d, %Y')


def text_of(fragment):
    t = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', fragment, flags=re.S)
    return html.unescape(re.sub(r'<[^>]+>', ' ', t))


def words(fragment):
    return re.findall(r"[\w’'$£€₹%.,–-]+", text_of(fragment))


def read_posts():
    posts = []
    for dirpath, _, files in os.walk(POSTS):
        for f in sorted(files):
            if not f.endswith('.html'):
                continue
            src = load(os.path.join(dirpath, f))
            m = re.match(r'\s*<!--meta\s*(\{.*?\})\s*-->\s*(.*)\Z', src, re.S)
            assert m, f'{f}: missing <!--meta {{...}} --> header'
            meta = json.loads(m.group(1))
            rel = os.path.relpath(os.path.join(dirpath, f), POSTS).replace(os.sep, '/')
            meta['rel'] = rel                                   # e.g. website-cost/usa.html
            meta['out'] = 'blog/' + rel                         # file written
            meta['path'] = '/blog/' + (rel[:-len('index.html')] if rel.endswith('index.html') else rel)
            meta['url'] = SITE + meta['path']
            meta['slug'] = rel[:-5].replace('/index', '').replace('/', '-')
            meta['body_src'] = m.group(2).rstrip()
            posts.append(meta)
    return posts


def hub_list(posts):
    groups = {}
    for p in posts:
        if 'hub' in p:
            groups.setdefault(p['hub']['group'], []).append(p)
    order = ['Countries', 'US states', 'Cities', 'SEO costs', 'Hiring guides']
    out = []
    for g in sorted(groups, key=lambda g: order.index(g) if g in order else 99):
        items = '\n'.join(
            f'                    <li><a href="{p["path"]}">{html.escape(p["hub"]["label"])}</a><span>{html.escape(p["hub"]["blurb"])}</span></li>'
            for p in sorted(groups[g], key=lambda p: p['hub'].get('order', 50)))
        out.append(f'            <h2>{g}</h2>\n            <ul class="hub-list">\n{items}\n            </ul>')
    return '\n'.join(out)


def render(p, posts, template):
    region = p.get('region', 'US')
    body = p['body_src']
    body = body.replace('{{bunkwise_table}}', bunkwise_table(region))
    body = body.replace('{{hub_list}}', hub_list(posts))
    body = re.sub(r'\{\{price:(\w+)(?::(\w+))?\}\}', lambda m: price(m.group(2) or region, m.group(1)), body)
    assert '{{' not in body, f"{p['rel']}: unknown token {re.search(r'{{[^}]*}}', body).group(0)}"
    faq = p.get('faq', [])
    faq_html = ''
    if faq:
        faq_html = '            <h2>Frequently asked questions</h2>\n' + '\n'.join(
            f'            <h3>{html.escape(q)}</h3>\n            <p>{a}</p>' for q, a in faq)
    crumbs = [('Home', '/'), ('Blog', '/blog/')] + [tuple(c) for c in p.get('crumbs', [])]
    crumbs_html = ' / '.join(f'<a href="{u}">{html.escape(n)}</a>' for n, u in crumbs) + f' / <span>{html.escape(p["crumb"])}</span>'
    graph = []
    if p.get('type') == 'hub':
        graph.append({'@type': 'CollectionPage', '@id': p['url'] + '#page', 'url': p['url'], 'name': p['h1'],
                      'description': p['description'], 'inLanguage': 'en', 'isPartOf': {'@id': SITE + '/#website'},
                      'dateModified': p.get('modified', p['date']),
                      'mainEntity': {'@type': 'ItemList', 'itemListElement': [
                          {'@type': 'ListItem', 'position': i + 1, 'url': q['url'], 'name': q['h1']}
                          for i, q in enumerate([q for q in posts if 'hub' in q])]}})
    else:
        graph.append({'@type': 'BlogPosting', '@id': p['url'] + '#article', 'headline': p['h1'], 'description': p['description'],
                      'image': f"{SITE}/assets/blog/{p['slug']}.jpg", 'datePublished': p['date'],
                      'dateModified': p.get('modified', p['date']),
                      'author': {'@type': 'Organization', 'name': 'BunkWise Team', 'url': SITE + '/website-design.html'},
                      'publisher': {'@id': SITE + '/#organization'}, 'mainEntityOfPage': p['url'],
                      'articleSection': 'Website cost guides', 'keywords': p.get('keywords', []), 'inLanguage': 'en'}
                     | ({'contentLocation': {'@type': 'Place', 'name': p['place']}} if p.get('place') else {}))
    graph.append({'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': SITE + u} for i, (n, u) in enumerate(crumbs)]
        + [{'@type': 'ListItem', 'position': len(crumbs) + 1, 'name': p['crumb'], 'item': p['url']}]})
    if faq:
        graph.append({'@type': 'FAQPage', 'mainEntity': [
            {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': text_of(a).strip()}} for q, a in faq]})
    jsonld = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, indent=4)
    jsonld = '\n'.join('    ' + line for line in jsonld.split('\n'))
    b = p.get('banner')
    banner = ''
    if b:
        chips = ''.join(f'\n                <span>{v}<small>{html.escape(l)}</small></span>' for v, l in b['chips'])
        banner = f'''        <div class="post-banner" aria-hidden="true">
            <div>
                <p class="b-title">{html.escape(b['title'])}</p>
                <p class="b-sub">{html.escape(b['sub'])}</p>
            </div>
            <div class="b-chips">{chips}
            </div>
        </div>
'''
    related = '\n'.join(f'                    <li><a href="{u}">{html.escape(t)}</a></li>' for u, t in p.get('related', []))
    all_words = len(words(body)) + len(words(faq_html))
    modified = p.get('modified', p['date'])
    fill = {
        'title': html.escape(p['title']), 'description': html.escape(p['description']), 'url': p['url'], 'h1': html.escape(p['h1']),
        'og_image': f"{SITE}/assets/blog/{p['slug']}.jpg", 'date': p['date'], 'modified': modified,
        'modified_human': human(modified), 'month_year': date.fromisoformat(modified).strftime('%B %Y'),
        'jsonld': jsonld, 'crumbs': crumbs_html, 'read': str(max(1, round(all_words / 220))),
        'tags': ''.join(f'<li>{html.escape(t)}</li>' for t in p.get('tags', [])), 'banner': banner,
        'body': body, 'faq': faq_html, 'related': related,
        'cta_title': html.escape(p.get('cta_title', 'Want a website that pays for itself?')),
        'cta_text': p.get('cta_text', 'BunkWise builds research-led websites with SEO and AI-search optimisation built in. See live client sites and every price upfront.'),
    }
    out = re.sub(r'\{\{(\w+)\}\}', lambda m: fill[m.group(1)], template)
    return out, body, faq_html, all_words


def check_page(p, out, body, faq_html, n_words, known_paths):
    errs = []
    t = html.unescape(p['title'])
    if len(t) > 70: errs.append(f'title {len(t)} chars > 70')
    if not 25 <= len(p['description']) <= 160: errs.append(f'description {len(p["description"])} chars (need 25–160)')
    min_words = p.get('min_words', 1400)
    if n_words < min_words: errs.append(f'{n_words} words < {min_words}')
    ext = set(re.findall(r'href="(https?://[^"]+)"', body))
    if p.get('type') != 'hub' and len(ext) < 3: errs.append(f'only {len(ext)} external sources')
    if p.get('local_h2') and p['local_h2'] not in body: errs.append(f'local section "{p["local_h2"]}" missing')
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', out, re.S):
        json.loads(m.group(1))
    for href in set(re.findall(r'href="(/[^"#?]*)', out)):
        target = href if not href.endswith('/') else href + 'index.html'
        if target not in known_paths and not os.path.exists(os.path.join(ROOT, target.lstrip('/'))):
            errs.append(f'broken internal link {href}')
    for a in re.findall(r'<a [^>]*href="https?://(?!bunkwise\.in)[^"]*"[^>]*>', out):
        if 'nofollow' not in a and 'wa.me' not in a and 't.me' not in a and 'github.com' not in a and 'play.google' not in a:
            errs.append(f'external link without rel nofollow: {a[:80]}')
    return errs


def shingles(fragment, n=5):
    w = [x.lower() for x in words(BUNKWISE_BLOCK.sub(' ', fragment))]
    return {' '.join(w[i:i + n]) for i in range(len(w) - n + 1)}


def check_similarity(rendered, limit=0.25):
    errs, items = [], [(p['rel'], shingles(b + f)) for p, b, f in rendered if p.get('type') != 'hub']
    worst = (0, '')
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            a, b = items[i][1], items[j][1]
            jac = len(a & b) / max(1, len(a | b))
            if jac > worst[0]: worst = (jac, f'{items[i][0]} ~ {items[j][0]}')
            if jac > limit: errs.append(f'too similar ({jac:.2f}): {items[i][0]} ~ {items[j][0]}')
    return errs, worst


def replace_between(s, start, end, new):
    assert s.count(start) == 1 and s.count(end) == 1, (start, end)
    a, b = s.index(start) + len(start), s.index(end)
    return s[:a] + new + s[b:]


def update_blog_index(posts):
    p = os.path.join(ROOT, 'blog', 'index.html')
    s = load(p)
    start, end = '<!-- COST-GUIDES:START (generated by _build/build.py) -->', '<!-- COST-GUIDES:END -->'
    if start not in s:
        s = s.replace('        </ul>\n    </div>\n</main>', f'        </ul>\n\n        {start}\n        {end}\n    </div>\n</main>', 1)
    hub = next(q for q in posts if q.get('type') == 'hub')
    guides = [q for q in posts if 'hub' in q]
    cards = '\n'.join(
        f'                <li><a href="{q["path"]}">{html.escape(q["hub"]["label"])}</a></li>' for q in sorted(guides, key=lambda q: (q['hub']['group'] != 'Countries', q['hub'].get('order', 50))))
    block = f'''
        <section class="guide-hub" aria-labelledby="cost-guides">
            <h2 id="cost-guides"><a href="{hub['path']}">Website costs by country</a></h2>
            <p>{html.escape(hub['description'])}</p>
            <ul class="hub-chips">
{cards}
            </ul>
        </section>
        '''
    save(p, replace_between(s, start, end, block))


def update_sitemap(posts):
    p = os.path.join(ROOT, 'sitemap.xml')
    s = load(p)
    start, end = '<!-- COST-GUIDES:START (generated by _build/build.py) -->', '<!-- COST-GUIDES:END -->'
    if start not in s:
        s = s.replace('</urlset>', f'  {start}\n  {end}\n</urlset>')
    urls = ''.join(
        f'\n  <url>\n    <loc>{q["url"]}</loc>\n    <lastmod>{q.get("modified", q["date"])}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>{"0.7" if q.get("type") == "hub" else "0.6"}</priority>\n  </url>'
        for q in posts)
    save(p, replace_between(s, start, end, urls + '\n  '))


def update_llms(posts):
    p = os.path.join(ROOT, 'llms.txt')
    s = load(p)
    head = '## Website cost guides by country'
    hub = next(q for q in posts if q.get('type') == 'hub')
    lines = [head, '', f'- [{hub["h1"]}]({hub["url"]}): {hub["description"]}'] + [
        f'- [{q["h1"]}]({q["url"]})' for q in posts if 'hub' in q]
    block = '\n'.join(lines) + '\n\n'
    if head in s:
        a = s.index(head)
        b = s.find('\n## ', a + 1)
        s = s[:a] + block + (s[b + 1:] if b != -1 else '')
    else:
        s = s.replace('## Student tools', block + '## Student tools', 1)
    save(p, s)


def main():
    template = load(os.path.join(ROOT, '_build', 'template.html'))
    posts = read_posts()
    known = {q['path'] if not q['path'].endswith('/') else q['path'] + 'index.html' for q in posts}
    rendered, failures = [], []
    for p in posts:
        out, body, faq_html, n = render(p, posts, template)
        errs = check_page(p, out, body, faq_html, n, known)
        failures += [f"{p['rel']}: {e}" for e in errs]
        rendered.append((p, body, faq_html))
        save(os.path.join(ROOT, p['out']), out)
        print(f"{p['rel']:<48} {n:>5} words")
    sim_errs, worst = check_similarity(rendered)
    failures += sim_errs
    print(f'max similarity {worst[0]:.3f} {worst[1]}')
    update_blog_index(posts)
    update_sitemap(posts)
    update_llms(posts)
    if failures:
        print('\nFAILED CHECKS:\n  ' + '\n  '.join(failures))
        sys.exit(1)
    print(f'OK: {len(posts)} pages built and checked')


if __name__ == '__main__':
    main()
