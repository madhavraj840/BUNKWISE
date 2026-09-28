"""Copy guard: flags any 8-word run an article shares with the sources it cites.

    python _build/copycheck.py            # all posts
    python _build/copycheck.py usa uk     # posts whose path contains these words

Quoted text inside "…" in an article is expected to match and is reported separately.
Sources that refuse the request are listed so they can be checked by hand.
"""
import html, os, re, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(__file__))
from build import POSTS, read_posts, text_of  # noqa: E402

N = 8
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36'}


def grams(text):
    w = re.findall(r"[a-z0-9’']+", text.lower())
    return {' '.join(w[i:i + N]) for i in range(len(w) - N + 1)}


def fetch(url):
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=25) as r:
            return url, text_of(r.read().decode('utf-8', 'replace'))
    except Exception as e:  # noqa: BLE001
        return url, e


def main():
    filters = sys.argv[1:]
    posts = [p for p in read_posts() if not filters or any(f in p['rel'] for f in filters)]
    urls = sorted({u for p in posts for u in re.findall(r'href="(https?://[^"]+)"', p['body_src'])})
    with ThreadPoolExecutor(8) as ex:
        pages = dict(ex.map(fetch, urls))
    bad = False
    for p in posts:
        own_text = text_of(p['body_src'] + ' '.join(a for _, a in p.get('faq', [])))  # FAQ questions mirror search queries on purpose
        quoted = grams(' '.join(re.findall(r'"([^"]{20,})"|“([^”]{20,})”', html.unescape(own_text)) and
                                [a or b for a, b in re.findall(r'"([^"]{20,})"|“([^”]{20,})”', html.unescape(own_text))]))
        mine = grams(own_text)
        for u in sorted(set(re.findall(r'href="(https?://[^"]+)"', p['body_src']))):
            src = pages.get(u)
            if isinstance(src, Exception) or src is None:
                print(f'  ? {p["rel"]}: could not fetch {u} ({src})')
                continue
            shared = (mine & grams(src)) - quoted
            if shared:
                bad = True
                print(f'  ! {p["rel"]} shares {len(shared)} x {N}-word runs with {u}:')
                for g in sorted(shared)[:5]:
                    print('      ', g)
    print('FLAGGED' if bad else 'OK: no copied passages found')


if __name__ == '__main__':
    main()
