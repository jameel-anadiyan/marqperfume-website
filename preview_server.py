#!/usr/bin/env python3
"""
Wellina Shopify OS 2.0 Local Theme Preview Server
Renders `/Users/apple/Desktop/SHOPIFY THEME/wellina-theme` directly in the browser
with zero external dependencies.

Run:
  python3 preview_server.py
Then open:
  http://127.0.0.1:4321
"""

import datetime
import html
import json
import mimetypes
import os
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).resolve().parent
THEME_DIR = BASE_DIR / "wellina-theme"
PORT = int(os.environ.get("PORT", "4321"))


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


LOCALES = load_json(THEME_DIR / "locales/en.default.json")
SETTINGS_DATA = load_json(THEME_DIR / "config/settings_data.json").get("current", {})


class BlankValue:
    def __bool__(self):
        return False

    def __str__(self):
        return ""


BLANK = BlankValue()


class ForLoop:
    def __init__(self, index0: int, length: int):
        self.index0 = index0
        self.index = index0 + 1
        self.first = index0 == 0
        self.last = index0 == length - 1
        self.length = length


def is_blank(val):
    if val is None or val is BLANK or val == "" or val == [] or val == {}:
        return True
    return False


def lookup_locale(key: str):
    cur = load_json(THEME_DIR / "locales/en.default.json")
    for part in str(key).split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return key
    return cur if isinstance(cur, str) else key


def parse_literal(token: str, ctx: dict):
    token = token.strip()
    if not token:
        return ""
    if token == "blank" or token == "empty":
        return BLANK
    if token == "true":
        return True
    if token == "false":
        return False
    if token == "nil" or token == "null":
        return None
    if (token.startswith("'") and token.endswith("'")) or (token.startswith('"') and token.endswith('"')):
        return token[1:-1]
    if re.fullmatch(r"-?\d+", token):
        return int(token)
    if re.fullmatch(r"-?\d+\.\d+", token):
        return float(token)

    # Bracket or dot path lookup e.g. collections[section.settings.collection_1] or a.b.c
    parts = []
    i = 0
    buf = ""
    while i < len(token):
        ch = token[i]
        if ch == ".":
            if buf:
                parts.append(("attr", buf))
                buf = ""
            i += 1
        elif ch == "[":
            if buf:
                parts.append(("attr", buf))
                buf = ""
            end = token.find("]", i)
            if end == -1:
                break
            inner = token[i + 1 : end].strip()
            parts.append(("idx", parse_literal(inner, ctx)))
            i = end + 1
            if i < len(token) and token[i] == ".":
                i += 1
        else:
            buf += ch
            i += 1
    if buf:
        parts.append(("attr", buf))

    cur = ctx
    for kind, key in parts:
        if cur is None or cur is BLANK:
            return None
        if kind == "attr":
            if key == "size" and isinstance(cur, (list, dict, str)):
                cur = len(cur)
            elif key == "first" and isinstance(cur, list):
                cur = cur[0] if cur else None
            elif isinstance(cur, dict):
                cur = cur.get(key, None)
            else:
                cur = getattr(cur, key, None)
        elif kind == "idx":
            if key is None or key is BLANK:
                return None
            if isinstance(cur, list) and isinstance(key, int):
                cur = cur[key] if 0 <= key < len(cur) else None
            elif isinstance(cur, dict):
                cur = cur.get(str(key), None)
            else:
                return None
    return cur


def split_pipes(expr: str):
    segs = []
    cur = ""
    in_q = None
    for ch in expr:
        if ch in ("'", '"'):
            if in_q == ch:
                in_q = None
            elif in_q is None:
                in_q = ch
            cur += ch
        elif ch == "|" and in_q is None:
            segs.append(cur.strip())
            cur = ""
        else:
            cur += ch
    if cur.strip():
        segs.append(cur.strip())
    return segs


def eval_filtered(expr: str, ctx: dict):
    segs = split_pipes(expr)
    if not segs:
        return ""
    val = parse_literal(segs[0], ctx)
    for fseg in segs[1:]:
        if ":" in fseg:
            fname, fargs_raw = fseg.split(":", 1)
            fname = fname.strip()
        else:
            fname, fargs_raw = fseg.strip(), ""

        if fname == "default":
            fallback = parse_literal(fargs_raw.strip(), ctx)
            if is_blank(val) or val is False:
                if val is False and isinstance(fallback, bool):
                    pass
                elif is_blank(val):
                    val = fallback
        elif fname == "divided_by":
            d = float(parse_literal(fargs_raw.strip(), ctx) or 1)
            v = float(val or 0)
            val = int(v // d) if "." not in fargs_raw and d.is_integer() else round(v / d, 4)
        elif fname == "times":
            m = float(parse_literal(fargs_raw.strip(), ctx) or 0)
            v = float(val or 0)
            res = v * m
            val = int(res) if res.is_integer() else res
        elif fname == "plus":
            val = (val or 0) + (parse_literal(fargs_raw.strip(), ctx) or 0)
        elif fname == "minus":
            val = (val or 0) - (parse_literal(fargs_raw.strip(), ctx) or 0)
        elif fname == "at_least":
            mn = parse_literal(fargs_raw.strip(), ctx) or 0
            val = max(val or 0, mn)
        elif fname == "append":
            val = f"{'' if val is None else val}{parse_literal(fargs_raw.strip(), ctx) or ''}"
        elif fname == "money":
            rupees = int(round(float(val or 0) / 100.0))
            s = str(abs(rupees))
            if len(s) > 3:
                last3 = s[-3:]
                rest = s[:-3]
                groups = []
                while len(rest) > 2:
                    groups.append(rest[-2:])
                    rest = rest[:-2]
                if rest:
                    groups.append(rest)
                s = ",".join(reversed(groups)) + "," + last3
            val = f"{'-' if rupees < 0 else ''}₹{s}"
        elif fname == "remove_first":
            needle = str(parse_literal(fargs_raw.strip(), ctx) or "")
            val = ("" if val is None else str(val)).replace(needle, "", 1)
        elif fname == "escape":
            val = html.escape("" if val is None else str(val), quote=True)
        elif fname == "strip_html":
            val = re.sub(r"<[^>]+>", "", "" if val is None else str(val))
        elif fname == "truncate":
            lim = int(parse_literal(fargs_raw.strip(), ctx) or 100)
            s = "" if val is None else str(val)
            val = s if len(s) <= lim else s[: max(0, lim - 3)] + "..."
        elif fname == "upcase":
            val = ("" if val is None else str(val)).upper()
        elif fname == "handle":
            val = re.sub(r"[^a-z0-9]+", "-", ("" if val is None else str(val)).lower()).strip("-")
        elif fname == "json":
            val = json.dumps(val)
        elif fname == "asset_url":
            val = f"/assets/{val}"
        elif fname == "stylesheet_tag":
            val = f'<link rel="stylesheet" href="{val}" media="all">'
        elif fname == "t":
            val = lookup_locale(str(val))
        elif fname == "date":
            fmt = str(parse_literal(fargs_raw.strip(), ctx) or "%Y")
            now = datetime.datetime.now()
            val = now.strftime(fmt)
        elif fname == "image_url":
            val = "" if val is None else str(val)
    return val


def eval_condition(cond: str, ctx: dict) -> bool:
    cond = cond.strip()
    if not cond:
        return False
    # Split on ' or ' then ' and ' outside quotes
    or_parts = re.split(r"\s+or\s+", cond)
    if len(or_parts) > 1:
        return any(eval_condition(p, ctx) for p in or_parts)
    and_parts = re.split(r"\s+and\s+", cond)
    if len(and_parts) > 1:
        return all(eval_condition(p, ctx) for p in and_parts)

    for op in ("==", "!=", ">=", "<=", ">", "<", "contains"):
        m = re.match(rf"^(.+?)\s+{re.escape(op)}\s+(.+)$", cond)
        if m:
            left = eval_filtered(m.group(1), ctx)
            right = eval_filtered(m.group(2), ctx)
            if right is BLANK:
                return is_blank(left) if op == "==" else not is_blank(left)
            if left is BLANK:
                return is_blank(right) if op == "==" else not is_blank(right)
            if op == "==":
                return left == right
            if op == "!=":
                return left != right
            if op == "contains":
                if isinstance(left, (list, str)) and right is not None:
                    return str(right) in left if isinstance(left, str) else right in left
                return False
            try:
                lf, rf = float(left or 0), float(right or 0)
                if op == ">":
                    return lf > rf
                if op == "<":
                    return lf < rf
                if op == ">=":
                    return lf >= rf
                if op == "<=":
                    return lf <= rf
            except Exception:
                return False

    val = eval_filtered(cond, ctx)
    if val is False or val is None or val is BLANK:
        return False
    return True


TOKEN_RE = re.compile(r"(\{\{-?.*?-?\}\}|\{%-?.*?-?%\})", re.S)


def expand_liquid_tag(body: str) -> str:
    out = []
    for raw_line in body.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        out.append(f"{{% {line} %}}")
    return "".join(out)


def preprocess(src: str) -> str:
    src = re.sub(r"\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}", "", src, flags=re.S)
    src = re.sub(r"\{%-?\s*schema\s*-?%\}.*?\{%-?\s*endschema\s*-?%\}", "", src, flags=re.S)
    src = re.sub(
        r"\{%-?\s*liquid\b(.*?)-?%\}",
        lambda m: expand_liquid_tag(m.group(1)),
        src,
        flags=re.S,
    )
    return src


def parse_nodes(tokens, pos=0, stop_tags=()):
    nodes = []
    while pos < len(tokens):
        tok = tokens[pos]
        if not tok:
            pos += 1
            continue
        if tok.startswith("{{"):
            expr = re.sub(r"^\{\{-?\s*|\s*-?\}\}$", "", tok, flags=re.S)
            nodes.append(("out", expr))
            pos += 1
        elif tok.startswith("{%"):
            inner = re.sub(r"^\{%-?\s*|\s*-?%\}$", "", tok, flags=re.S).strip()
            parts = inner.split(None, 1)
            tag = parts[0] if parts else ""
            rest = parts[1] if len(parts) > 1 else ""

            if tag in stop_tags:
                return nodes, pos, tag, rest

            if tag in ("if", "unless"):
                pos += 1
                branches = []
                first_body, pos, end_t, end_r = parse_nodes(tokens, pos, ("elsif", "else", f"end{tag}"))
                branches.append((rest, first_body))
                while end_t == "elsif":
                    elsif_cond = end_r
                    pos += 1
                    b_body, pos, end_t, end_r = parse_nodes(tokens, pos, ("elsif", "else", f"end{tag}"))
                    branches.append((elsif_cond, b_body))
                else_body = None
                if end_t == "else":
                    pos += 1
                    else_body, pos, end_t, end_r = parse_nodes(tokens, pos, (f"end{tag}",))
                pos += 1  # consume endif / endunless
                nodes.append((tag, branches, else_body))

            elif tag == "case":
                pos += 1
                _, pos, sub_t, sub_r = parse_nodes(tokens, pos, ("when", "else", "endcase"))
                whens = []
                else_body = None
                while sub_t == "when":
                    w_val = sub_r
                    pos += 1
                    w_body, pos, sub_t, sub_r = parse_nodes(tokens, pos, ("when", "else", "endcase"))
                    whens.append((w_val, w_body))
                if sub_t == "else":
                    pos += 1
                    else_body, pos, sub_t, sub_r = parse_nodes(tokens, pos, ("endcase",))
                pos += 1
                nodes.append(("case", rest, whens, else_body))

            elif tag == "for":
                pos += 1
                body, pos, _, _ = parse_nodes(tokens, pos, ("endfor",))
                pos += 1
                nodes.append(("for", rest, body))

            elif tag == "form":
                pos += 1
                body, pos, _, _ = parse_nodes(tokens, pos, ("endform",))
                pos += 1
                nodes.append(("form", rest, body))

            elif tag == "paginate":
                pos += 1
                body, pos, _, _ = parse_nodes(tokens, pos, ("endpaginate",))
                pos += 1
                nodes.append(("paginate", rest, body))

            else:
                nodes.append(("stmt", tag, rest))
                pos += 1
        else:
            nodes.append(("text", tok))
            pos += 1
    return nodes, pos, None, None


def exec_nodes(nodes, ctx: dict) -> str:
    out = []
    for node in nodes:
        ntype = node[0]
        if ntype == "text":
            out.append(node[1])
        elif ntype == "out":
            val = eval_filtered(node[1], ctx)
            if val is not None and val is not BLANK:
                out.append(str(val))
        elif ntype in ("if", "unless"):
            _, branches, else_body = node
            matched = False
            for idx, (cond, b_nodes) in enumerate(branches):
                ok = eval_condition(cond, ctx)
                if ntype == "unless" and idx == 0:
                    ok = not ok
                if ok:
                    out.append(exec_nodes(b_nodes, ctx))
                    matched = True
                    break
            if not matched and else_body is not None:
                out.append(exec_nodes(else_body, ctx))
        elif ntype == "case":
            _, target_expr, whens, else_body = node
            target_val = eval_filtered(target_expr, ctx)
            matched = False
            for w_expr, w_nodes in whens:
                options = [eval_filtered(o.strip(), ctx) for o in w_expr.split(" or ")]
                if target_val in options:
                    out.append(exec_nodes(w_nodes, ctx))
                    matched = True
                    break
            if not matched and else_body is not None:
                out.append(exec_nodes(else_body, ctx))
        elif ntype == "for":
            _, spec, body = node
            m = re.match(r"^(\w+)\s+in\s+([^\s]+)(?:\s+limit:\s*(\d+))?", spec.strip())
            if m:
                var_name, seq_expr, lim_str = m.group(1), m.group(2), m.group(3)
                rm = re.fullmatch(r"\((\d+)\.\.(\d+)\)", seq_expr)
                if rm:
                    items = list(range(int(rm.group(1)), int(rm.group(2)) + 1))
                else:
                    raw_seq = eval_filtered(seq_expr, ctx)
                    items = list(raw_seq) if isinstance(raw_seq, (list, tuple)) else []
                if lim_str:
                    items = items[: int(lim_str)]
                total = len(items)
                for idx, item in enumerate(items):
                    ctx[var_name] = item
                    ctx["forloop"] = ForLoop(idx, total)
                    out.append(exec_nodes(body, ctx))
        elif ntype == "form":
            _, spec, body = node
            cm = re.search(r"class:\s*['\"]([^'\"]+)['\"]", spec)
            cls = f' class="{cm.group(1)}"' if cm else ""
            ctx["form"] = {"email": "", "posted_successfully?": False, "errors": ""}
            out.append(f'<form method="post" action="#"{cls}>{exec_nodes(body, ctx)}</form>')
        elif ntype == "paginate":
            _, _, body = node
            ctx["paginate"] = {"pages": 1, "parts": []}
            out.append(exec_nodes(body, ctx))
        elif ntype == "stmt":
            _, tag, rest = node
            if tag == "assign":
                am = re.match(r"^(\w+)\s*=\s*(.+)$", rest)
                if am:
                    ctx[am.group(1)] = eval_filtered(am.group(2), ctx)
            elif tag == "render":
                parts = [p.strip() for p in rest.split(",")]
                snip_name = parse_literal(parts[0], ctx)
                child_ctx = {
                    "settings": ctx.get("settings", {}),
                    "routes": ctx.get("routes", {}),
                    "cart": ctx.get("cart", {}),
                    "shop": ctx.get("shop", {}),
                    "request": ctx.get("request", {}),
                    "collections": ctx.get("collections", {}),
                    "blogs": ctx.get("blogs", {}),
                    "search": ctx.get("search", {}),
                    "template": ctx.get("template", {}),
                }
                for kv in parts[1:]:
                    if ":" in kv:
                        k, v = kv.split(":", 1)
                        child_ctx[k.strip()] = eval_filtered(v.strip(), ctx)
                snip_file = THEME_DIR / "snippets" / f"{snip_name}.liquid"
                if snip_file.exists():
                    out.append(render_liquid(snip_file.read_text(encoding="utf-8"), child_ctx))
            elif tag == "sections":
                grp_name = parse_literal(rest.strip(), ctx)
                grp_file = THEME_DIR / "sections" / f"{grp_name}.json"
                if grp_file.exists():
                    out.append(render_section_json(load_json(grp_file), ctx))
    return "".join(out)


def render_liquid(src: str, ctx: dict) -> str:
    cleaned = preprocess(src)
    tokens = TOKEN_RE.split(cleaned)
    nodes, _, _, _ = parse_nodes(tokens)
    return exec_nodes(nodes, ctx)


def extract_schema(sec_src: str) -> dict:
    m = re.search(r"\{%-?\s*schema\s*-?%\}(.*?)\{%-?\s*endschema\s*-?%\}", sec_src, flags=re.S)
    if not m:
        return {}
    try:
        return json.loads(m.group(1))
    except Exception:
        return {}


def render_single_section(sec_id: str, sec_cfg: dict, base_ctx: dict) -> str:
    sec_type = sec_cfg.get("type")
    sec_path = THEME_DIR / "sections" / f"{sec_type}.liquid"
    if not sec_path.exists():
        return ""
    sec_raw = sec_path.read_text(encoding="utf-8")
    schema = extract_schema(sec_raw)

    merged_settings = {}
    for s in schema.get("settings", []):
        if "id" in s and "default" in s:
            merged_settings[s["id"]] = s["default"]
    merged_settings.update(sec_cfg.get("settings", {}))

    block_defs = {b["type"]: b for b in schema.get("blocks", [])}
    blocks_list = []
    if "blocks" in sec_cfg:
        for bid in sec_cfg.get("block_order", list(sec_cfg["blocks"].keys())):
            bdata = sec_cfg["blocks"].get(bid, {})
            btype = bdata.get("type", "")
            bset = {}
            for s in block_defs.get(btype, {}).get("settings", []):
                if "id" in s and "default" in s:
                    bset[s["id"]] = s["default"]
            bset.update(bdata.get("settings", {}))
            blocks_list.append({"id": bid, "type": btype, "settings": bset, "shopify_attributes": f'data-block-id="{bid}"'})
    elif schema.get("presets"):
        for idx, pb in enumerate(schema["presets"][0].get("blocks", [])):
            btype = pb.get("type", "")
            bset = {}
            for s in block_defs.get(btype, {}).get("settings", []):
                if "id" in s and "default" in s:
                    bset[s["id"]] = s["default"]
            bset.update(pb.get("settings", {}))
            blocks_list.append({"id": f"preset_{idx}", "type": btype, "settings": bset, "shopify_attributes": ""})

    sec_ctx = dict(base_ctx)
    sec_ctx["section"] = {"id": sec_id, "settings": merged_settings, "blocks": blocks_list}
    html_inner = render_liquid(sec_raw, sec_ctx)
    return f'<div id="shopify-section-{sec_id}" class="shopify-section">{html_inner}</div>'


def render_section_json(tpl_data: dict, base_ctx: dict) -> str:
    chunks = []
    secs = tpl_data.get("sections", {})
    for sid in tpl_data.get("order", list(secs.keys())):
        if sid in secs:
            chunks.append(render_single_section(sid, secs[sid], base_ctx))
    return "\n".join(chunks)


def load_demo_catalog() -> list[dict]:
    snip = THEME_DIR / "snippets/wellina-catalog-data.liquid"
    if not snip.exists():
        return []
    rendered = render_liquid(snip.read_text(encoding="utf-8"), {"collections": {}})
    m = re.search(r"<script[^>]*>(.*)</script>", rendered, flags=re.S)
    if not m:
        return []
    try:
        return json.loads(m.group(1)).get("demoProducts", [])
    except Exception:
        return []


def render_route(path: str, query_params: dict) -> tuple[int, str]:
    clean_path = path.rstrip("/") or "/"
    template_name = "index"
    tpl_json_file = THEME_DIR / "templates/index.json"
    tpl_liq_file = None
    page_title = "MARQ Perfumes – Fine Eau de Parfum in India"
    extra_ctx = {}

    if clean_path == "/":
        template_name = "index"
        tpl_json_file = THEME_DIR / "templates/index.json"
    elif clean_path == "/collections":
        template_name = "list-collections"
        tpl_json_file = THEME_DIR / "templates/list-collections.json"
        page_title = "All Collections"
    elif clean_path.startswith("/collections/"):
        slug = clean_path.split("/collections/", 1)[1].split("/")[0]
        template_name = "collection"
        tpl_json_file = THEME_DIR / "templates/collection.json"
        col_title_map = {
            "all": "All MARQ Creations",
            "perfumes": "Eau de Parfum",
            "attar": "Attar • Perfumed Oil",
            "bakhoor": "Bakhoor • Incense",
            "incense": "Bakhoor • Incense",
        }
        col_title = col_title_map.get(slug, slug.replace("-", " ").title())
        page_title = col_title
        extra_ctx["collection"] = {
            "handle": slug,
            "title": col_title,
            "description": "Explore MARQ Perfumes curated across Eau de Parfum, concentrated Rubbing Roller Attar oils, and artisanal Bakhoor incense.",
            "products_count": 0,
            "products": [],
        }
    elif clean_path.startswith("/products/"):
        template_name = "product"
        tpl_json_file = THEME_DIR / "templates/product.json"
        slug = clean_path.split("/products/", 1)[1].split("/")[0]
        demo_prods = load_demo_catalog()
        matched = next(
            (p for p in demo_prods if p.get("handle") == slug or slug in (p.get("aliases") or [])),
            demo_prods[0] if demo_prods else None,
        )
        if matched:
            page_title = matched["title"]
            n_imgs = (matched.get("smells_like") or {}).get("images") or []
            v_list = matched.get("variants") or []
            extra_ctx["product"] = {
                "id": matched["id"],
                "handle": matched["handle"],
                "title": matched["title"],
                "description": matched.get("description", ""),
                "price": matched["price"],
                "compare_at_price": matched.get("compare_at_price", 0),
                "price_100": v_list[1]["price"] if len(v_list) > 1 else matched["price"] + 50000,
                "compare_100": v_list[1].get("compare_at_price", 0) if len(v_list) > 1 else 0,
                "selected_or_first_available_variant": v_list[0] if v_list else {"id": 920101, "price": matched["price"], "compare_at_price": matched.get("compare_at_price", 0)},
                "variants": v_list,
                "images": matched.get("images", []),
                "category": matched.get("category", "Eau de Parfum"),
                "family": matched.get("family", "Fresh"),
                "gender": matched.get("gender", "Unisex"),
                "occasion": matched.get("occasion", ""),
                "occasion_tag": matched.get("occasion_tag", ""),
                "top_notes": matched.get("top_notes", []),
                "middle_notes": matched.get("middle_notes", []),
                "base_notes": matched.get("base_notes", []),
                "sillage": matched.get("sillage", 4.0),
                "projection": matched.get("projection", 4.0),
                "longevity": matched.get("longevity", 4.0),
                "first_spray": (matched.get("smells_like") or {}).get("first_spray", ""),
                "after_30_min": (matched.get("smells_like") or {}).get("after_30_min", ""),
                "dry_down": (matched.get("smells_like") or {}).get("dry_down", ""),
                "note_img_1": n_imgs[0] if len(n_imgs) > 0 else "/assets/marq-note-citrus.jpg",
                "note_img_2": n_imgs[1] if len(n_imgs) > 1 else "/assets/marq-note-lavender.jpg",
                "note_img_3": n_imgs[2] if len(n_imgs) > 2 else "/assets/marq-note-woods.jpg",
            }
        else:
            page_title = slug.replace("-", " ").title()
    elif clean_path == "/cart":
        template_name = "cart"
        tpl_json_file = THEME_DIR / "templates/cart.json"
        page_title = "Your Shopping Cart"
    elif clean_path == "/search":
        template_name = "search"
        tpl_json_file = THEME_DIR / "templates/search.json"
        terms = query_params.get("q", [""])[0]
        page_title = f"Search: {terms}" if terms else "Search"
        extra_ctx["search"] = {"performed": bool(terms), "terms": terms, "results_count": 0, "results": []}
    elif clean_path == "/blogs/news":
        template_name = "blog"
        tpl_json_file = THEME_DIR / "templates/blog.json"
        page_title = "Our Wellness Journal"
    elif clean_path.startswith("/blogs/news/"):
        template_name = "article"
        tpl_json_file = THEME_DIR / "templates/article.json"
        page_title = "The Science of Hydration"
    elif clean_path == "/pages/contact":
        template_name = "page"
        tpl_json_file = THEME_DIR / "templates/page.contact.json"
        page_title = "Contact Us"
    elif clean_path == "/pages/faq":
        template_name = "page"
        tpl_json_file = THEME_DIR / "templates/page.faq.json"
        page_title = "FAQs"
    elif clean_path.startswith("/pages/") or clean_path.startswith("/policies/"):
        template_name = "page"
        tpl_json_file = THEME_DIR / "templates/page.json"
        slug = clean_path.strip("/").split("/")[-1]
        page_title = slug.replace("-", " ").title()
        extra_ctx["page"] = {"title": page_title, "content": ""}
    elif clean_path == "/account/login":
        template_name = "login"
        tpl_liq_file = THEME_DIR / "templates/customers/login.liquid"
        page_title = "Sign In"
    elif clean_path == "/account/register":
        template_name = "register"
        tpl_liq_file = THEME_DIR / "templates/customers/register.liquid"
        page_title = "Create Account"
    elif clean_path == "/account":
        template_name = "account"
        tpl_liq_file = THEME_DIR / "templates/customers/account.liquid"
        page_title = "My Account"
    elif clean_path == "/checkout":
        template_name = "cart"
        tpl_json_file = THEME_DIR / "templates/cart.json"
        page_title = "Checkout Preview"
    else:
        template_name = "404"
        tpl_json_file = THEME_DIR / "templates/404.json"
        page_title = "404 Not Found"

    live_settings = load_json(THEME_DIR / "config/settings_data.json").get("current", {})
    ctx = {
        "settings": live_settings,
        "shop": {"name": "MARQ Perfumes", "money_format": "₹0", "url": f"http://127.0.0.1:{PORT}"},
        "request": {"locale": {"iso_code": "en"}},
        "routes": {
            "root_url": "/",
            "cart_url": "/cart",
            "cart_add_url": "/cart/add",
            "cart_change_url": "/cart/change",
            "cart_update_url": "/cart/update",
            "search_url": "/search",
            "predictive_search_url": "/search/suggest",
            "account_url": "/account/login",
            "account_register_url": "/account/register",
            "account_logout_url": "/",
        },
        "cart": {"item_count": 0, "total_price": 0, "items": [], "note": "", "currency": {"iso_code": "INR"}},
        "collections": {},
        "blogs": {},
        "search": {"performed": False, "terms": "", "results_count": 0, "results": []},
        "template": {"name": template_name},
        "page_title": page_title,
        "page_description": "MARQ Perfumes — Fine aquatic, citrus, and botanical Eau de Parfum.",
        "canonical_url": f"http://127.0.0.1:{PORT}{clean_path}",
        "current_page": 1,
        "content_for_header": "",
    }
    ctx.update(extra_ctx)

    if tpl_liq_file is not None:
        ctx["content_for_layout"] = render_liquid(tpl_liq_file.read_text(encoding="utf-8"), ctx)
    else:
        ctx["content_for_layout"] = render_section_json(load_json(tpl_json_file), ctx)

    layout_src = (THEME_DIR / "layout/theme.liquid").read_text(encoding="utf-8")
    full_html = render_liquid(layout_src, ctx)
    status = 404 if template_name == "404" else 200
    return status, full_html


class ThemePreviewHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stdout.write(f"[Wellina Preview] {self.address_string()} - {fmt % args}\n")

    def do_GET(self):
        parsed = urlparse(self.path)
        p = parsed.path

        if p == "/favicon.ico":
            svg = b"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='#112D4A'/><rect x='11' y='5' width='10' height='3.2' rx='1.6' fill='none' stroke='#DCEAF5' stroke-width='1.5'/><text x='16' y='24' font-family='Helvetica,Arial,sans-serif' font-weight='600' font-size='15' fill='#FFFFFF' text-anchor='middle'>M</text></svg>"
            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml")
            self.send_header("Content-Length", str(len(svg)))
            self.end_headers()
            self.wfile.write(svg)
            return

        if p.startswith("/assets/"):
            fname = p.split("/assets/", 1)[1]
            fpath = (THEME_DIR / "assets" / fname).resolve()
            if fpath.is_file() and str(fpath).startswith(str((THEME_DIR / "assets").resolve())):
                ctype, _ = mimetypes.guess_type(str(fpath))
                data = fpath.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", ctype or "application/octet-stream")
                self.send_header("Cache-Control", "no-store, max-age=0")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
            self.send_error(404)
            return

        if p == "/cart.js":
            payload = json.dumps({"item_count": 0, "total_price": 0, "items": []}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        status, html_doc = render_route(p, parse_qs(parsed.query))
        body = html_doc.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        payload = json.dumps({"ok": True}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def self_test():
    test_routes = [
        "/",
        "/collections",
        "/collections/all",
        "/collections/perfumes",
        "/collections/attar",
        "/collections/bakhoor",
        "/collections/fresh",
        "/collections/oriental",
        "/collections/woody",
        "/collections/florals",
        "/collections/men",
        "/products/marq-navy",
        "/products/marq-passion-oud",
        "/products/marq-dark-cherry",
        "/products/marq-cotton",
        "/products/marq-stay-close",
        "/products/marq-red-apple",
        "/products/marq-velvet-oud-attar",
        "/products/marq-jasmine-attar",
        "/products/marq-royal-bakhoor",
        "/products/marq-oud-bakhoor",
        "/cart",
        "/blogs/news",
        "/pages/contact",
        "/pages/faq",
    ]
    for route in test_routes:
        code, doc = render_route(route, {})
        assert code == 200, f"Unexpected status {code} on {route}"
        cleaned_doc = doc.replace("₹{{amount_no_decimals}}", "")
        assert "{%" not in cleaned_doc and "{{" not in cleaned_doc, f"Unrendered Liquid tag left on {route}"
        assert "$" not in cleaned_doc, f"Leftover $ sign found on {route}"
        for p_nm in ("MARQ Navy", "MARQ Passion Oud", "MARQ Dark Cherry", "MARQ Velvet Oud", "MARQ Classic Bakhoor", "MARQ Royal Bakhoor", "MARQ Mogra Jasmine"):
            assert p_nm not in cleaned_doc, f"Leftover '{p_nm}' found on {route}"
        if route == "/":
            assert "Fresh • Men" in cleaned_doc, "Expected EDP card subtitle 'Fresh • Men' on homepage"
            assert "Attar • Perfumed Oil" in cleaned_doc, "Expected Attar card subtitle on homepage"
            assert "Bakhoor • Incense" in cleaned_doc, "Expected Bakhoor card subtitle on homepage"
        elif route == "/products/marq-navy":
            assert "50ml" in cleaned_doc and "First Spray" in cleaned_doc, "Expected EDP size & First Spray on marq-navy"
            assert "PAY IN FULL" in cleaned_doc and "OR PAY IN" not in cleaned_doc, "Expected PAY IN FULL without EMI option"
            assert 'class="pdp-short-desc"' not in cleaned_doc, "Expected top description hidden from above on PDP"
            assert cleaned_doc.count('<details class="pdp-perfume-acc" open>') == 1, "Expected ONLY Intensity drawer open by default"
            assert cleaned_doc.count('<details class="pdp-perfume-acc">') == 3, "Expected 3 closed drawers (Notes, Occasion, Description)"
            assert cleaned_doc.index("Occasion &amp; Wear Guide") < cleaned_doc.index("<span>Description</span>"), "Expected Description drawer after Occasion & Wear Guide"
        elif route == "/products/marq-velvet-oud-attar":
            assert "3ml" in cleaned_doc and "6ml" in cleaned_doc and "12ml" in cleaned_doc and "First Touch" in cleaned_doc, "Expected Attar 3ml/6ml/12ml & First Touch on marq-velvet-oud-attar"
        elif route == "/products/marq-royal-bakhoor":
            assert "₹1,200" in cleaned_doc and "First Burn" in cleaned_doc, "Expected Royal Bakhoor ₹1,200 & First Burn on marq-royal-bakhoor"
    print(f"All {len(test_routes)} routes self-tested cleanly with ₹ INR currency and 0 unrendered Liquid tags!")


if __name__ == "__main__":
    if "--test" in sys.argv:
        self_test()
        sys.exit(0)

    ThreadingHTTPServer.allow_reuse_address = True
    bind_host = os.environ.get("HOST", "0.0.0.0" if "PORT" in os.environ else "127.0.0.1")
    server = ThreadingHTTPServer((bind_host, PORT), ThemePreviewHandler)
    print(f"Wellina Shopify Theme Preview running at http://{bind_host}:{PORT}")
    sys.stdout.flush()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass

