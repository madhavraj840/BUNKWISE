// 1200x630 preview images for every page built from _build/posts (headline + banner).
// Needs the local server on :8765 and puppeteer-core:
//   NODE_PATH=<dir with node_modules> node _build/og.js
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const root = path.dirname(__dirname);
const posts = path.join(__dirname, 'posts');
const rels = [];
(function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (f.endsWith('.html')) rels.push(path.relative(posts, p).split(path.sep).join('/'));
    }
})(posts);

(async () => {
    const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const p = await b.newPage();
    await p.setViewport({ width: 1200, height: 630 });
    for (const rel of rels) {
        const slug = rel.slice(0, -5).replace('/index', '').split('/').join('-');   // same rule as build.py
        const url = 'http://127.0.0.1:8765/blog/' + rel.replace(/index\.html$/, '');
        await p.goto(url, { waitUntil: 'networkidle0' });
        await p.addStyleTag({ content: `
            .site-head, .crumbs, .tags, .post-body, .site-foot { display: none !important }
            body { background: #f7f7f4 } .post { padding: 0; min-height: 630px; display: flex; align-items: center }
            .post-wrap { max-width: 1100px; width: 100% } .post-banner { padding: 52px 48px; margin-top: 24px }
            .post h1 { font-size: 48px } .post-meta { margin-top: 16px }` });
        await p.screenshot({ path: path.join(root, 'assets', 'blog', slug + '.jpg'), type: 'jpeg', quality: 84 });
        console.log('og', slug);
    }
    await b.close();
})();
