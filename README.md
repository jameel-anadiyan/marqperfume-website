# MARQ Perfumes — Shopify Online Store 2.0 Theme

A complete, upload-ready **Shopify Online Store 2.0** luxury fragrance theme custom-branded for **MARQ Perfumes**, featuring the official MARQ minimalist logo, 4-swatch coastal sapphire brand color system (`#245284` Primary Brand Blue, `#FFFFFF` Logo White, `#DCEAF5` Light Mist Blue, `#112D4A` Deep Navy), studio Eau de Parfum, Attar & Bakhoor photography, mega menus, predictive search, quick view, live bottle personalisation, live cart drawer, collection filtering, and conversion-focused PDP.

---

## Folder Contents

- **`wellina-shopify-theme.zip`** — Ready-to-upload Shopify Theme archive (`Online Store → Themes → Add theme → Upload zip file`).
- **`wellina-theme/`** — Full editable Shopify OS 2.0 source code (`layout/`, `config/`, `locales/`, `assets/`, `snippets/`, `sections/`, `templates/`).
- **`preview_server.py`** — Zero-dependency local Shopify Liquid preview server so you can browse and test the entire theme locally at `http://127.0.0.1:4321`.

---

## 1. Upload Directly to Your Shopify Store

1. Open your **Shopify Admin** → **Online Store** → **Themes**.
2. Click **Add theme** → **Upload zip file**.
3. Select **`wellina-shopify-theme.zip`** and click **Upload file**.
4. Click **Customize** to edit your brand logo, colors, fragrances, collections, and section copy in the visual Shopify Theme Editor, or **Publish** to make it live!

> **Smart Starter Showcase Mode:** In **Theme Settings → Cart, Search & Demo**, *"Show MARQ Perfumes starter showcase when store catalog is empty"* is enabled by default so your storefront looks complete immediately upon upload before you add products, and automatically switches to your live Shopify products & collections as soon as you assign them.

---

## 2. Preview Locally Anytime

```bash
cd "/Users/apple/Desktop/SHOPIFY THEME"
python3 preview_server.py
```

Then open **http://127.0.0.1:4321** in your browser:
- Homepage (21 MARQ Creations across Eau de Parfum, Attar • Oil & Bakhoor • Incense in ₹ INR): `http://127.0.0.1:4321/`
- Collection Pages (live Product Category, Scent Family, Gender, Occasion & ₹ INR Price filters):
  - All 21 Creations: `http://127.0.0.1:4321/collections/all`
  - By Category: `http://127.0.0.1:4321/collections/perfumes` (13), `/collections/attar` (5), `/collections/bakhoor` (3)
  - By Scent Family: `http://127.0.0.1:4321/collections/fresh`, `/collections/oriental`, `/collections/woody`, `/collections/florals`
  - By Gender: `http://127.0.0.1:4321/collections/men`, `/collections/women`, `/collections/unisex`
- Product Detail Pages (with *Personalise / Live Engraving*, *Smells Like* 3-stage card, *Intensity* pill meters, *Notes & Composition* pyramid & ₹ INR variants):
  - Eau de Parfum: `http://127.0.0.1:4321/products/marq-navy`, `/products/marq-passion-oud`, `/products/marq-dark-cherry`
  - Attar (Perfumed Oil): `http://127.0.0.1:4321/products/marq-velvet-oud-attar`, `/products/marq-jasmine-attar`
  - Bakhoor (Incense): `http://127.0.0.1:4321/products/marq-royal-bakhoor`, `/products/marq-oud-bakhoor`
- Fragrance Journal: `http://127.0.0.1:4321/blogs/news`
- FAQs & Contact: `http://127.0.0.1:4321/pages/faq` & `http://127.0.0.1:4321/pages/contact`

