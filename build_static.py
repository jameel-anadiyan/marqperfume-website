#!/usr/bin/env python3
"""
Static Site Builder for Render / Netlify / Vercel / Cloudflare Pages.
Pre-renders all MARQ Perfumes routes into `./dist` so Render Static Sites
can host the entire interactive storefront 24/7 on global CDN with zero cold starts.

Render Settings:
  Build Command:     python3 build_static.py
  Publish Directory: dist
"""

import shutil
from pathlib import Path

from preview_server import THEME_DIR, load_demo_catalog, render_route

OUT_DIR = Path(__file__).resolve().parent / "dist"

STATIC_ROUTES = [
    "/",
    "/cart",
    "/search",
    "/collections",
    "/collections/all",
    "/collections/perfumes",
    "/collections/attar",
    "/collections/bakhoor",
    "/collections/incense",
    "/collections/fresh",
    "/collections/oriental",
    "/collections/woody",
    "/collections/florals",
    "/collections/men",
    "/collections/women",
    "/collections/unisex",
    "/collections/daily-office",
    "/collections/evening-dates",
    "/collections/weddings-formal",
    "/collections/casual-travel",
    "/blogs/news",
    "/blogs/news/inside-marq-navy",
    "/blogs/news/modern-marine-accords",
    "/blogs/news/how-to-layer-edp",
    "/pages/about",
    "/pages/contact",
    "/pages/faq",
    "/policies/privacy-policy",
    "/policies/terms-of-service",
    "/account",
    "/account/login",
    "/account/register",
]


def main() -> None:
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Copy all theme assets to dist/assets/
    shutil.copytree(THEME_DIR / "assets", OUT_DIR / "assets")

    # 2. Write static endpoints used by browser/JS
    (OUT_DIR / "cart.js").write_text(
        '{"item_count":0,"total_price":0,"items":[]}', encoding="utf-8"
    )
    (OUT_DIR / "favicon.svg").write_text(
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>"
        "<rect width='32' height='32' rx='8' fill='#112D4A'/>"
        "<rect x='11' y='5' width='10' height='3.2' rx='1.6' fill='none' stroke='#DCEAF5' stroke-width='1.5'/>"
        "<text x='16' y='24' font-family='Helvetica,Arial,sans-serif' font-weight='600' font-size='15' fill='#FFFFFF' text-anchor='middle'>M</text>"
        "</svg>",
        encoding="utf-8",
    )

    # 3. Collect all product routes dynamically from catalog
    routes = list(STATIC_ROUTES)
    for prod in load_demo_catalog():
        handle = prod.get("handle")
        if handle:
            r = f"/products/{handle}"
            if r not in routes:
                routes.append(r)
        for alias in prod.get("aliases") or []:
            ra = f"/products/{alias}"
            if ra not in routes:
                routes.append(ra)

    # 4. Pre-render every route to dist/<route>/index.html
    for route in routes:
        status, html_doc = render_route(route, {})
        if status != 200:
            raise RuntimeError(f"Failed rendering {route}: status {status}")
        if route == "/":
            target = OUT_DIR / "index.html"
        else:
            target_dir = OUT_DIR / route.lstrip("/")
            target_dir.mkdir(parents=True, exist_ok=True)
            target = target_dir / "index.html"
        target.write_text(html_doc, encoding="utf-8")

    # Fallback 404 page
    _, home_html = render_route("/", {})
    (OUT_DIR / "404.html").write_text(home_html, encoding="utf-8")

    print(f"Built {len(routes)} static routes + assets into {OUT_DIR}")


if __name__ == "__main__":
    main()
