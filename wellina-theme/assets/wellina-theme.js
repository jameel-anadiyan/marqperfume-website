/**
 * Wellina Shopify OS 2.0 Interactive Theme Engine
 * Powers: Sticky/Floating Header, 4 Mega Menus + Vertical Tab Switcher, Predictive Search,
 * Hero & Editorial Slideshows, Tabbed Product Carousels, Split Testimonials, Count-Up Stats,
 * Crossfading Collections Showcase, Draggable Before/After + Product Switcher, Press Slider,
 * Quick View Drawer, Live AJAX/Local Cart Drawer + Free Shipping Bar + Tool Sub-Panels,
 * Collection Facet Filtering/Sorting/Grid Toggle, and PDP Interactive Suite.
 */
(function () {
  'use strict';

  const config = window.WellinaConfig || {};
  const backdrop = document.querySelector('[data-global-backdrop]');

  /* ------------------------------------------------------------------------
     1. Catalog Lookup & Money Helper
     ------------------------------------------------------------------------ */
  const catalogEl = document.getElementById('WellinaCatalogData');
  let catalogData = { shopifyProducts: [], demoProducts: [] };
  if (catalogEl) {
    try {
      catalogData = JSON.parse(catalogEl.textContent);
    } catch (e) {
      console.warn('Catalog parse error:', e);
    }
  }

  const allProducts = [
    ...(catalogData.shopifyProducts || []),
    ...(catalogData.demoProducts || [])
  ];

  function findProduct(handle) {
    if (!handle) return allProducts[0] || null;
    return (
      allProducts.find(
        (p) => p.handle === handle || (Array.isArray(p.aliases) && p.aliases.includes(handle))
      ) ||
      allProducts[0] ||
      null
    );
  }

  function formatMoney(paise) {
    const rupees = Math.round(Number(paise || 0) / 100);
    return '₹' + rupees.toLocaleString('en-IN');
  }

  /* ------------------------------------------------------------------------
     2. Global Backdrop, Drawer & Modal Controller
     ------------------------------------------------------------------------ */
  function closeAllOverlays() {
    if (document.activeElement && document.activeElement.closest('.floating-drawer, .mobile-nav-drawer, .center-modal, .mega-menu, .flyout-menu')) {
      document.activeElement.blur();
    }
    document.querySelectorAll('.floating-drawer.is-open, .mobile-nav-drawer.is-open, .center-modal.is-open').forEach((el) => {
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
    });
    document.querySelectorAll('.header-nav__item.is-open').forEach((item) => {
      item.classList.remove('is-open');
      const trig = item.querySelector('[data-mega-trigger]');
      if (trig) trig.setAttribute('aria-expanded', 'false');
      const panel = item.querySelector('[data-mega-panel]');
      if (panel) panel.setAttribute('aria-hidden', 'true');
    });
    const searchPanel = document.querySelector('[data-predictive-panel]');
    if (searchPanel) {
      searchPanel.classList.remove('is-open');
      searchPanel.setAttribute('aria-hidden', 'true');
    }
    const headerWrap = document.querySelector('[data-sticky-header]');
    if (headerWrap) {
      headerWrap.classList.remove('is-menu-open', 'is-mega-bar-open');
    }
    if (backdrop) backdrop.classList.remove('is-visible');
    document.body.classList.remove('lock-scroll');
  }

  function openDrawer(drawerEl) {
    if (!drawerEl) return;
    closeAllOverlays();
    drawerEl.classList.add('is-open');
    drawerEl.setAttribute('aria-hidden', 'false');
    if (backdrop) backdrop.classList.add('is-visible');
    document.body.classList.add('lock-scroll');
    const closeBtn = drawerEl.querySelector('[data-close-drawers]');
    if (closeBtn) setTimeout(() => closeBtn.focus({ preventScroll: true }), 40);
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    closeAllOverlays();
    modalEl.classList.add('is-open');
    modalEl.setAttribute('aria-hidden', 'false');
    if (backdrop) backdrop.classList.add('is-visible');
    document.body.classList.add('lock-scroll');
    const closeBtn = modalEl.querySelector('[data-close-modals]');
    if (closeBtn) setTimeout(() => closeBtn.focus({ preventScroll: true }), 40);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeAllOverlays);
  }
  document.querySelectorAll('[data-close-drawers], [data-close-modals]').forEach((btn) => {
    btn.addEventListener('click', closeAllOverlays);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllOverlays();
  });

  /* ------------------------------------------------------------------------
     3. Floating-to-Sticky Header, Mega Menus & Mobile Drawer
     ------------------------------------------------------------------------ */
  const headerWrap = document.querySelector('[data-sticky-header]');
  if (headerWrap) {
    const syncScroll = () => {
      headerWrap.classList.toggle('is-scrolled', window.scrollY > 36);
    };
    syncScroll();
    window.addEventListener('scroll', syncScroll, { passive: true });

    let closeTimer = null;
    let switchTimer = null;
    const siteHeader = headerWrap.querySelector('.site-header');
    const rightControls = headerWrap.querySelector('.site-header__right');
    const megaItems = headerWrap.querySelectorAll('[data-mega-item]');

    const closeAllMegaMenus = () => {
      clearTimeout(closeTimer);
      clearTimeout(switchTimer);
      megaItems.forEach((item) => {
        item.classList.remove('is-open');
        const t = item.querySelector('[data-mega-trigger]');
        if (t) t.setAttribute('aria-expanded', 'false');
        const p = item.querySelector('[data-mega-panel]');
        if (p) p.setAttribute('aria-hidden', 'true');
      });
      headerWrap.classList.remove('is-menu-open', 'is-mega-bar-open');
      if (!document.querySelector('.floating-drawer.is-open, .mobile-nav-drawer.is-open, .center-modal.is-open, .predictive-search-panel.is-open')) {
        if (backdrop) backdrop.classList.remove('is-visible');
      }
    };

    const scheduleCloseMega = () => {
      clearTimeout(closeTimer);
      clearTimeout(switchTimer);
      closeTimer = setTimeout(closeAllMegaMenus, 180);
    };

    megaItems.forEach((item) => {
      const trigger = item.querySelector('[data-mega-trigger]');
      const panel = item.querySelector('[data-mega-panel]');
      const isFlyout = item.classList.contains('header-nav__item--flyout');

      const openItem = () => {
        clearTimeout(closeTimer);
        clearTimeout(switchTimer);
        megaItems.forEach((other) => {
          const active = other === item;
          other.classList.toggle('is-open', active);
          const t = other.querySelector('[data-mega-trigger]');
          if (t) t.setAttribute('aria-expanded', String(active));
          const p = other.querySelector('[data-mega-panel]');
          if (p) p.setAttribute('aria-hidden', String(!active));
        });
        headerWrap.classList.add('is-menu-open');
        headerWrap.classList.toggle('is-mega-bar-open', !isFlyout);
        if (backdrop) backdrop.classList.add('is-visible');
      };

      item.addEventListener('mouseenter', () => {
        clearTimeout(closeTimer);
        clearTimeout(switchTimer);
        if (!headerWrap.classList.contains('is-menu-open') || item.classList.contains('is-open')) {
          openItem();
        } else {
          switchTimer = setTimeout(openItem, 95);
        }
      });
      item.addEventListener('mouseleave', () => {
        clearTimeout(switchTimer);
      });
      if (panel) {
        panel.addEventListener('mouseenter', () => {
          clearTimeout(closeTimer);
          clearTimeout(switchTimer);
        });
      }
      if (trigger) {
        trigger.addEventListener('focus', openItem);
      }
    });

    if (siteHeader) {
      siteHeader.addEventListener('mouseenter', () => {
        if (headerWrap.classList.contains('is-menu-open')) {
          clearTimeout(closeTimer);
        }
      });
      siteHeader.addEventListener('mouseleave', () => {
        if (headerWrap.classList.contains('is-menu-open')) {
          scheduleCloseMega();
        }
      });
    }

    if (rightControls) {
      rightControls.addEventListener('mouseenter', () => {
        if (headerWrap.classList.contains('is-menu-open')) {
          scheduleCloseMega();
        }
      });
    }

    // Vertical Tab Switcher inside "Shop" Mega Menu
    headerWrap.querySelectorAll('[data-mega-tabs]').forEach((tabsRoot) => {
      const btns = tabsRoot.querySelectorAll('[data-mega-tab-btn]');
      const panels = tabsRoot.querySelectorAll('[data-mega-tab-panel]');
      btns.forEach((btn) => {
        const activate = () => {
          const key = btn.getAttribute('data-mega-tab-btn');
          btns.forEach((b) => b.classList.toggle('is-active', b === btn));
          panels.forEach((p) => p.classList.toggle('is-active', p.getAttribute('data-mega-tab-panel') === key));
        };
        btn.addEventListener('mouseenter', activate);
        btn.addEventListener('focus', activate);
        if (btn.tagName === 'BUTTON') btn.addEventListener('click', activate);
      });
    });
  }

  const mobileMenuBtn = document.querySelector('[data-open-mobile-menu]');
  const mobileDrawer = document.getElementById('MobileNavDrawer');
  if (mobileMenuBtn && mobileDrawer) {
    mobileMenuBtn.addEventListener('click', () => openDrawer(mobileDrawer));
  }
  const mobileSearchBtn = document.querySelector('[data-mobile-search-toggle]');
  if (mobileSearchBtn && mobileDrawer) {
    mobileSearchBtn.addEventListener('click', () => openDrawer(mobileDrawer));
  }

  /* ------------------------------------------------------------------------
     4. Predictive Search
     ------------------------------------------------------------------------ */
  const searchRoot = document.querySelector('[data-predictive-search]');
  if (searchRoot) {
    const input = searchRoot.querySelector('[data-search-input]');
    const panel = searchRoot.querySelector('[data-predictive-panel]');
    const defaultView = searchRoot.querySelector('[data-search-default]');
    const liveView = searchRoot.querySelector('[data-search-results]');
    const grid = searchRoot.querySelector('[data-search-results-grid]');
    const viewAll = searchRoot.querySelector('[data-search-view-all]');

    const renderQuery = (raw) => {
      const q = (raw || '').trim().toLowerCase();
      if (!q) {
        defaultView.hidden = false;
        liveView.hidden = true;
        return;
      }
      defaultView.hidden = true;
      liveView.hidden = false;
      const matches = allProducts
        .filter((p) => {
          const hay = [
            p.title,
            p.description,
            p.category,
            p.type,
            p.family,
            p.gender,
            p.occasion,
            ...(p.top_notes || []),
            ...(p.middle_notes || []),
            ...(p.base_notes || [])
          ]
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        })
        .slice(0, 3);
      const list = matches.length ? matches : allProducts.slice(0, 3);
      grid.innerHTML = list
        .map(
          (p) => `
          <a href="${p.url || '/products/' + p.handle}" class="mini-search-card">
            <div class="mini-search-card__img">
              <img src="${p.featured_image}" alt="${p.title}" loading="lazy">
            </div>
            <span class="mini-search-card__title">${p.title}</span>
            <span class="mini-search-card__price">${formatMoney(p.price)}</span>
          </a>`
        )
        .join('');
      if (viewAll) viewAll.href = (config.routes?.searchUrl || '/search') + '?q=' + encodeURIComponent(raw.trim());
    };

    input.addEventListener('focus', () => {
      panel.classList.add('is-open');
      if (backdrop) backdrop.classList.add('is-visible');
      renderQuery(input.value);
    });

    input.addEventListener('input', () => renderQuery(input.value));

    searchRoot.querySelectorAll('[data-search-chip]').forEach((chip) => {
      chip.addEventListener('click', () => {
        input.value = chip.getAttribute('data-search-chip') || '';
        input.focus();
        renderQuery(input.value);
      });
    });
  }

  /* ------------------------------------------------------------------------
     5. Cart State & Live Cart Drawer (Shopify AJAX + Local Seamless Fallback)
     ------------------------------------------------------------------------ */
  const CART_KEY = 'marq_inr_cart_v2';
  const cartDrawer = document.getElementById('CartDrawer');

  function loadLocalCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) {
          parsed.items = parsed.items
            .map((it) => {
              const prod = findProduct(it.handle);
              if (!prod) return null;
              const mv = (prod.variants || []).find((v) => v.title === it.variantTitle) || (prod.variants || [])[0];
              return {
                ...it,
                title: prod.title,
                image: prod.featured_image,
                variantTitle: mv ? mv.title : it.variantTitle,
                price: mv ? mv.price : prod.price,
                comparePrice: mv ? mv.compare_at_price || 0 : 0
              };
            })
            .filter(Boolean);
          return parsed;
        }
      }
    } catch (e) {}
    return { items: [], discount: '' };
  }

  function saveLocalCart(state) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  let cartState = loadLocalCart();

  async function syncShopifyCartIfAvailable() {
    try {
      const res = await fetch((config.routes?.cartUrl || '/cart') + '.js', {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          cartState.items = data.items.map((it) => ({
            key: it.key || String(it.id),
            handle: it.handle,
            variantId: it.variant_id || it.id,
            title: it.product_title || it.title,
            variantTitle: it.variant_title || '50ml',
            price: it.final_price || it.price,
            comparePrice: 0,
            qty: it.quantity,
            image: it.image,
            url: it.url
          }));
          saveLocalCart(cartState);
        }
      }
    } catch (e) {
      // Offline / standalone preview uses local state seamlessly
    }
    renderCartUI();
  }

  async function addItemToCart({
    handle,
    variantTitle = '50ml',
    qty = 1,
    variantId = null,
    customPrice = null,
    engravingText = '',
    engravingFont = ''
  }) {
    const prod = findProduct(handle);
    if (!prod) return;

    const matchedVar =
      (prod.variants || []).find((v) => String(v.id) === String(variantId) || v.title === variantTitle) ||
      (prod.variants || [])[0] || { id: variantId || prod.id, title: variantTitle, price: prod.price, compare_at_price: prod.compare_at_price };

    const unitPrice = customPrice != null ? Number(customPrice) : Number(matchedVar.price || prod.price);
    const cleanEngrave = (engravingText || '').trim();
    const cleanFont = cleanEngrave ? (engravingFont || 'Classic') : '';
    const key = prod.handle + '::' + (matchedVar.title || variantTitle) + (cleanEngrave ? `::${cleanEngrave}::${cleanFont}` : '');

    // Attempt real Shopify /cart/add.js when running on live Shopify with real numeric variant ID
    if (matchedVar.id && Number(matchedVar.id) > 1000000) {
      try {
        const payload = { id: matchedVar.id, quantity: qty };
        if (cleanEngrave) {
          payload.properties = {
            'Engraving Text': cleanEngrave,
            'Engraving Font': cleanFont
          };
        }
        await fetch((config.routes?.cartAddUrl || '/cart/add') + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {}
    }

    const existing = cartState.items.find((i) => i.key === key);
    if (existing) {
      existing.qty += Number(qty);
    } else {
      cartState.items.push({
        key,
        handle: prod.handle,
        variantId: matchedVar.id,
        title: prod.title,
        variantTitle: matchedVar.title || variantTitle,
        engravingText: cleanEngrave,
        engravingFont: cleanFont,
        price: unitPrice,
        comparePrice: Number(matchedVar.compare_at_price || prod.compare_at_price || 0),
        qty: Number(qty),
        image: prod.featured_image,
        url: prod.url || '/products/' + prod.handle
      });
    }
    saveLocalCart(cartState);
    renderCartUI();
    openDrawer(cartDrawer);
  }

  function updateItemQty(key, deltaOrExact, isExact = false) {
    const idx = cartState.items.findIndex((i) => i.key === key);
    if (idx === -1) return;
    const nextQty = isExact ? Number(deltaOrExact) : cartState.items[idx].qty + Number(deltaOrExact);
    if (nextQty <= 0) {
      cartState.items.splice(idx, 1);
    } else {
      cartState.items[idx].qty = nextQty;
    }
    saveLocalCart(cartState);
    renderCartUI();
  }

  function renderCartUI() {
    const totalCount = cartState.items.reduce((sum, i) => sum + i.qty, 0);
    const subtotal = cartState.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const threshold = Number(config.freeShippingThreshold || 100000);
    const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
    const remaining = Math.max(0, threshold - subtotal);

    document.querySelectorAll('[data-header-cart-count], [data-cart-count]').forEach((el) => {
      el.textContent = String(totalCount);
    });

    const shipMsg =
      remaining > 0
        ? `Spend <strong>${formatMoney(remaining)}</strong> more to reach free shipping!`
        : `Congrats! You are eligible for <strong>FREE Shipping</strong>`;

    document.querySelectorAll('[data-shipping-msg], [data-page-shipping-msg]').forEach((el) => {
      el.innerHTML = shipMsg;
    });
    document.querySelectorAll('[data-shipping-fill], [data-page-shipping-fill]').forEach((el) => {
      el.style.width = pct + '%';
    });
    document.querySelectorAll('[data-cart-subtotal], [data-page-cart-total]').forEach((el) => {
      el.textContent = formatMoney(subtotal);
    });

    if (!cartDrawer) return;
    const emptyBox = cartDrawer.querySelector('[data-cart-empty]');
    const itemsBox = cartDrawer.querySelector('[data-cart-items]');

    if (totalCount === 0) {
      if (emptyBox) emptyBox.hidden = false;
      if (itemsBox) itemsBox.innerHTML = '';
    } else {
      if (emptyBox) emptyBox.hidden = true;
      if (itemsBox) {
        itemsBox.innerHTML = cartState.items
          .map(
            (item) => `
          <div class="cart-item-row">
            <a href="${item.url}">
              <img src="${item.image}" alt="${item.title}" class="cart-item-row__thumb">
            </a>
            <div>
              <a href="${item.url}" class="cart-item-row__title">${item.title}</a>
              ${item.variantTitle && item.variantTitle !== 'Default Title' ? `<span class="cart-item-row__variant">${item.variantTitle}</span>` : ''}
              ${
                item.engravingText
                  ? `<span class="cart-item-row__engraving">Engraved: &ldquo;${item.engravingText.replace(/</g, '&lt;')}&rdquo; (${item.engravingFont || 'Classic'})</span>`
                  : ''
              }
              <div class="cart-mini-stepper">
                <button type="button" data-cart-minus="${item.key}" aria-label="Decrease">−</button>
                <span>${item.qty}</span>
                <button type="button" data-cart-plus="${item.key}" aria-label="Increase">+</button>
              </div>
            </div>
            <div class="cart-item-row__right">
              <div>
                <span class="${item.comparePrice > item.price ? 'is-sale' : ''}">${formatMoney(item.price * item.qty)}</span>
                ${item.comparePrice > item.price ? `<br><s class="product-card__compare">${formatMoney(item.comparePrice * item.qty)}</s>` : ''}
              </div>
              <button type="button" class="cart-item-row__remove" data-cart-remove="${item.key}">Remove</button>
            </div>
          </div>`
          )
          .join('');
      }
    }

    // Also render on /cart page if present
    const pageItems = document.querySelector('[data-page-cart-items]');
    if (pageItems && cartState.items.length > 0 && pageItems.children.length === 0) {
      pageItems.innerHTML = itemsBox ? itemsBox.innerHTML : '';
    }
  }

  document.addEventListener('click', (e) => {
    const openCartBtn = e.target.closest('[data-open-cart]');
    if (openCartBtn && config.enableCartDrawer !== false) {
      e.preventDefault();
      openDrawer(cartDrawer);
      return;
    }

    const minusBtn = e.target.closest('[data-cart-minus]');
    if (minusBtn) {
      updateItemQty(minusBtn.getAttribute('data-cart-minus'), -1);
      return;
    }

    const plusBtn = e.target.closest('[data-cart-plus]');
    if (plusBtn) {
      updateItemQty(plusBtn.getAttribute('data-cart-plus'), 1);
      return;
    }

    const remBtn = e.target.closest('[data-cart-remove]');
    if (remBtn) {
      updateItemQty(remBtn.getAttribute('data-cart-remove'), 0, true);
      return;
    }

    const quickAdd = e.target.closest('[data-quick-add-handle]');
    if (quickAdd) {
      addItemToCart({ handle: quickAdd.getAttribute('data-quick-add-handle'), qty: 1 });
    }
  });

  // Cart Drawer Upsell arrows & Footer Tool Sub-Panels
  if (cartDrawer) {
    const upsellTrack = cartDrawer.querySelector('[data-upsell-track]');
    const uPrev = cartDrawer.querySelector('[data-upsell-prev]');
    const uNext = cartDrawer.querySelector('[data-upsell-next]');
    if (upsellTrack && uPrev && uNext) {
      uPrev.addEventListener('click', () => upsellTrack.scrollBy({ left: -250, behavior: 'smooth' }));
      uNext.addEventListener('click', () => upsellTrack.scrollBy({ left: 250, behavior: 'smooth' }));
    }

    const toolPanel = cartDrawer.querySelector('[data-cart-tool-panel]');
    cartDrawer.querySelectorAll('[data-open-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-open-tool');
        toolPanel.hidden = false;
        toolPanel.querySelectorAll('[data-tool-content]').forEach((c) => {
          c.hidden = c.getAttribute('data-tool-content') !== target;
        });
      });
    });

    cartDrawer.querySelectorAll('[data-close-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        toolPanel.hidden = true;
      });
    });

    const calcBtn = cartDrawer.querySelector('[data-calc-shipping]');
    const calcRes = cartDrawer.querySelector('[data-shipping-calc-result]');
    if (calcBtn && calcRes) {
      calcBtn.addEventListener('click', () => {
        calcRes.hidden = false;
        calcRes.textContent = 'Standard Pan-India Tracked Shipping: ₹99 (Free on orders ₹1,000+)';
      });
    }

    cartDrawer.querySelectorAll('[data-apply-coupon], [data-save-note]').forEach((btn) => {
      btn.addEventListener('click', () => {
        toolPanel.hidden = true;
      });
    });
  }

  syncShopifyCartIfAvailable();

  /* ------------------------------------------------------------------------
     6. Quick View Drawer-Modal
     ------------------------------------------------------------------------ */
  const qvDrawer = document.getElementById('QuickViewDrawer');
  let activeQvProduct = null;
  let activeQvSize = '50ml';
  let activeQvPrice = 120000;
  let activeQvSlide = 0;

  function openQuickView(handle) {
    const prod = findProduct(handle);
    if (!prod || !qvDrawer) return;
    activeQvProduct = prod;
    const prodCat = prod.category || 'Eau de Parfum';
    activeQvSize = (prod.variants && prod.variants[0]?.title) || (prodCat === 'Bakhoor' ? 'Default Title' : prodCat === 'Attar' ? '3ml' : '50ml');
    activeQvPrice = Number((prod.variants && prod.variants[0]?.price) || prod.price || 120000);
    activeQvSlide = 0;

    const badgeEl = qvDrawer.querySelector('[data-qv-badge]');
    if (badgeEl) {
      if (prod.badge) {
        badgeEl.hidden = false;
        badgeEl.textContent = prod.badge;
        badgeEl.className = 'badge badge--' + (prod.badge_type || 'bestseller');
      } else {
        badgeEl.hidden = true;
      }
    }

    qvDrawer.querySelector('[data-qv-title]').textContent = prod.title;
    qvDrawer.querySelector('[data-qv-desc]').textContent = prod.description || '';
    qvDrawer.querySelector('[data-qv-url]').href = prod.url || '/products/' + prod.handle;
    qvDrawer.querySelector('[data-qv-qty]').value = 1;

    const stockNum = qvDrawer.querySelector('[data-qv-stock-num]');
    if (stockNum) stockNum.textContent = String(prod.stock || 6);

    const imgs = prod.images && prod.images.length ? prod.images : [prod.featured_image];
    const slidesEl = qvDrawer.querySelector('[data-qv-slides]');
    slidesEl.innerHTML = imgs.map((src) => `<img src="${src}" alt="${prod.title}">`).join('');

    const syncQvGallery = () => {
      qvDrawer.querySelector('[data-qv-counter]').textContent = `${activeQvSlide + 1} / ${imgs.length}`;
      qvDrawer.querySelector('[data-qv-progress]').style.width = `${((activeQvSlide + 1) / imgs.length) * 100}%`;
    };
    syncQvGallery();

    const qvVarPicker = qvDrawer.querySelector('[data-qv-variant-picker]');
    const qvPersonaliseBtn = qvDrawer.querySelector('[data-open-personalise="qv"]');
    const varsEl = qvDrawer.querySelector('[data-qv-variants]');
    const variants = prod.variants && prod.variants.length
      ? prod.variants
      : prodCat === 'Bakhoor'
      ? [{ title: 'Default Title', price: prod.price, compare_at_price: 0 }]
      : prodCat === 'Attar'
      ? [
          { title: '3ml', price: 25000, compare_at_price: 0 },
          { title: '6ml', price: 45000, compare_at_price: 0 },
          { title: '12ml', price: 65000, compare_at_price: 0 }
        ]
      : [
          { title: '50ml', price: 120000, compare_at_price: 0 },
          { title: '100ml', price: 250000, compare_at_price: 0 }
        ];

    // Bakhoor has NO variations; Attar & Bakhoor have NO personalisation
    if (qvVarPicker) qvVarPicker.hidden = prodCat === 'Bakhoor' || variants.length <= 1;
    if (qvPersonaliseBtn) qvPersonaliseBtn.hidden = prodCat !== 'Eau de Parfum';

    const renderQvPrice = (v) => {
      const priceEl = qvDrawer.querySelector('[data-qv-price]');
      const compEl = qvDrawer.querySelector('[data-qv-compare]');
      activeQvPrice = Number(v.price || prod.price);
      priceEl.textContent = formatMoney(activeQvPrice);
      if (v.compare_at_price > activeQvPrice) {
        compEl.hidden = false;
        compEl.textContent = formatMoney(v.compare_at_price);
      } else {
        compEl.hidden = true;
      }
      const selSz = qvDrawer.querySelector('[data-qv-selected-size]');
      if (selSz) selSz.textContent = v.title;
    };

    varsEl.innerHTML = variants
      .map(
        (v, i) =>
          `<button type="button" class="variant-pill${i === 0 ? ' is-active' : ''}" data-qv-var-idx="${i}" data-variant-title="${v.title}">
            <span>${v.title}</span>
          </button>`
      )
      .join('');

    renderQvPrice(variants[0]);

    varsEl.querySelectorAll('[data-qv-var-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-qv-var-idx'));
        varsEl.querySelectorAll('.variant-pill').forEach((b) => b.classList.toggle('is-active', b === btn));
        activeQvSize = variants[idx].title;
        renderQvPrice(variants[idx]);
      });
    });

    openDrawer(qvDrawer);
  }

  document.addEventListener('click', (e) => {
    const qvBtn = e.target.closest('[data-quick-view-trigger]');
    if (qvBtn) {
      e.preventDefault();
      openQuickView(qvBtn.getAttribute('data-quick-view-trigger'));
    }
  });

  if (qvDrawer) {
    const slidesEl = qvDrawer.querySelector('[data-qv-slides]');
    qvDrawer.querySelector('[data-qv-prev]')?.addEventListener('click', () => {
      if (!activeQvProduct) return;
      const total = (activeQvProduct.images || [1]).length;
      activeQvSlide = (activeQvSlide - 1 + total) % total;
      slidesEl.scrollTo({ left: activeQvSlide * 252, behavior: 'smooth' });
      qvDrawer.querySelector('[data-qv-counter]').textContent = `${activeQvSlide + 1} / ${total}`;
      qvDrawer.querySelector('[data-qv-progress]').style.width = `${((activeQvSlide + 1) / total) * 100}%`;
    });

    qvDrawer.querySelector('[data-qv-next]')?.addEventListener('click', () => {
      if (!activeQvProduct) return;
      const total = (activeQvProduct.images || [1]).length;
      activeQvSlide = (activeQvSlide + 1) % total;
      slidesEl.scrollTo({ left: activeQvSlide * 252, behavior: 'smooth' });
      qvDrawer.querySelector('[data-qv-counter]').textContent = `${activeQvSlide + 1} / ${total}`;
      qvDrawer.querySelector('[data-qv-progress]').style.width = `${((activeQvSlide + 1) / total) * 100}%`;
    });

    qvDrawer.querySelector('[data-qv-add]')?.addEventListener('click', () => {
      if (!activeQvProduct) return;
      const qty = Number(qvDrawer.querySelector('[data-qv-qty]').value || 1);
      addItemToCart({ handle: activeQvProduct.handle, variantTitle: activeQvSize, qty, customPrice: activeQvPrice });
    });

    qvDrawer.querySelector('[data-qv-buy-now]')?.addEventListener('click', () => {
      if (!activeQvProduct) return;
      addItemToCart({ handle: activeQvProduct.handle, variantTitle: activeQvSize, qty: 1, customPrice: activeQvPrice });
    });
  }

  // Shared Quantity Steppers (+/-)
  document.querySelectorAll('[data-qty-stepper]').forEach((stepper) => {
    const input = stepper.querySelector('input');
    stepper.querySelector('[data-qty-minus]')?.addEventListener('click', () => {
      input.value = Math.max(1, Number(input.value || 1) - 1);
    });
    stepper.querySelector('[data-qty-plus]')?.addEventListener('click', () => {
      input.value = Math.min(99, Number(input.value || 1) + 1);
    });
  });

  /* ------------------------------------------------------------------------
     7. Hero Slideshow, Tabbed Product Carousels & Horizontal Sliders
     ------------------------------------------------------------------------ */
  document.querySelectorAll('[data-slideshow]').forEach((root) => {
    const slides = root.querySelectorAll('.hero-slide');
    if (slides.length < 2) return;
    const counter = root.querySelector('[data-slide-counter]');
    const prog = root.querySelector('[data-slide-progress]');
    let idx = 0;

    const go = (next) => {
      idx = (next + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      if (counter) counter.textContent = `${idx + 1} / ${slides.length}`;
      if (prog) prog.style.width = `${((idx + 1) / slides.length) * 100}%`;
    };

    root.querySelector('[data-slide-prev]')?.addEventListener('click', () => go(idx - 1));
    root.querySelector('[data-slide-next]')?.addEventListener('click', () => go(idx + 1));

    if (root.getAttribute('data-autoplay') === 'true') {
      const ms = Number(root.getAttribute('data-interval') || 6000);
      let timer = setInterval(() => go(idx + 1), ms);
      root.addEventListener('mouseenter', () => clearInterval(timer));
      root.addEventListener('mouseleave', () => {
        timer = setInterval(() => go(idx + 1), ms);
      });
    }
  });

  // Tabbed Product Carousels
  document.querySelectorAll('[data-product-tabs]').forEach((sec) => {
    const triggers = sec.querySelectorAll('[data-tab-trigger]');
    const panels = sec.querySelectorAll('[data-tab-panel]');
    triggers.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-tab-trigger');
        triggers.forEach((t) => {
          const active = t === btn;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', String(active));
        });
        panels.forEach((p) => {
          const match = p.getAttribute('data-tab-panel') === key;
          p.hidden = !match;
          p.classList.toggle('is-active', match);
        });
      });
    });
  });

  // Generic Horizontal Carousels + Progress Bar
  document.querySelectorAll('[data-carousel]').forEach((wrap) => {
    const track = wrap.querySelector('[data-carousel-track]');
    const prev = wrap.querySelector('[data-carousel-prev]');
    const next = wrap.querySelector('[data-carousel-next]');
    const prog = wrap.querySelector('[data-carousel-progress]');
    if (!track) return;

    const updateProg = () => {
      if (!prog) return;
      const max = track.scrollWidth - track.clientWidth;
      if (max <= 0) {
        prog.style.width = '100%';
        return;
      }
      const ratio = Math.max(0.25, Math.min(1, (track.scrollLeft + track.clientWidth * 0.35) / track.scrollWidth * 1.4));
      prog.style.width = Math.min(100, Math.round((track.scrollLeft / max) * 70 + 30)) + '%';
    };

    track.addEventListener('scroll', updateProg, { passive: true });
    prev?.addEventListener('click', () => track.scrollBy({ left: -track.clientWidth * 0.75, behavior: 'smooth' }));
    next?.addEventListener('click', () => track.scrollBy({ left: track.clientWidth * 0.75, behavior: 'smooth' }));
  });

  /* ------------------------------------------------------------------------
     8. Split Testimonials, Count-Up Stats, Collections w/ Bg, Before/After,
        Press Quotes & Centered Editorial Tabs
     ------------------------------------------------------------------------ */
  document.querySelectorAll('[data-testimonial-slider]').forEach((sec) => {
    const medias = sec.querySelectorAll('[data-testi-media]');
    const quotes = sec.querySelectorAll('[data-testi-slide]');
    const counter = sec.querySelector('[data-testi-counter]');
    let idx = 0;
    const total = quotes.length;
    if (total < 2) return;

    const show = (n) => {
      idx = (n + total) % total;
      medias.forEach((m, i) => m.classList.toggle('is-active', i === idx));
      quotes.forEach((q, i) => q.classList.toggle('is-active', i === idx));
      if (counter) counter.textContent = `${idx + 1} / ${total}`;
    };

    sec.querySelector('[data-testi-prev]')?.addEventListener('click', () => show(idx - 1));
    sec.querySelector('[data-testi-next]')?.addEventListener('click', () => show(idx + 1));
  });

  // Animated Count-Up Stats
  const countEls = document.querySelectorAll('[data-countup]');
  if (countEls.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = Number(el.getAttribute('data-countup') || 0);
          const start = performance.now();
          const dur = 1100;
          const tick = (now) => {
            const p = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = String(Math.round(target * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          obs.unobserve(el);
        });
      },
      { threshold: 0.35 }
    );
    countEls.forEach((el) => io.observe(el));
  }

  // Interactive Collections with Crossfading Full-Screen Background
  document.querySelectorAll('[data-collections-bg]').forEach((sec) => {
    const triggers = sec.querySelectorAll('[data-col-trigger]');
    const bgs = sec.querySelectorAll('[data-col-bg]');
    const cards = sec.querySelectorAll('[data-col-card]');

    triggers.forEach((btn) => {
      const activate = () => {
        const i = btn.getAttribute('data-col-trigger');
        triggers.forEach((t) => t.classList.toggle('is-active', t === btn));
        bgs.forEach((b) => b.classList.toggle('is-active', b.getAttribute('data-col-bg') === i));
        cards.forEach((c) => c.classList.toggle('is-active', c.getAttribute('data-col-card') === i));
      };
      btn.addEventListener('mouseenter', activate);
      btn.addEventListener('focus', activate);
      btn.addEventListener('click', activate);
    });
  });

  // Draggable Before & After Slider + 4-Product Switcher
  document.querySelectorAll('[data-before-after-section]').forEach((sec) => {
    const stage = sec.querySelector('[data-ba-stage]');
    const range = sec.querySelector('[data-ba-range]');
    const beforeImg = sec.querySelector('[data-ba-before-img]');
    const afterImg = sec.querySelector('[data-ba-after-img]');
    const titleEl = sec.querySelector('[data-ba-title]');
    const b1El = sec.querySelector('[data-ba-b1]');
    const b2El = sec.querySelector('[data-ba-b2]');
    const linkEl = sec.querySelector('[data-ba-link]');
    const thumbs = sec.querySelectorAll('[data-ba-item]');

    if (range && stage) {
      range.addEventListener('input', () => {
        stage.style.setProperty('--ba-pos', range.value + '%');
      });
    }

    thumbs.forEach((btn) => {
      btn.addEventListener('click', () => {
        thumbs.forEach((t) => t.classList.toggle('is-active', t === btn));
        if (beforeImg) beforeImg.src = btn.getAttribute('data-before');
        if (afterImg) afterImg.src = btn.getAttribute('data-after');
        if (titleEl) titleEl.textContent = btn.getAttribute('data-title');
        if (b1El) b1El.textContent = btn.getAttribute('data-benefit-1');
        if (b2El) b2El.textContent = btn.getAttribute('data-benefit-2');
        if (linkEl) linkEl.href = btn.getAttribute('data-url');
      });
    });
  });

  // Press Quotes & Logo Switcher
  document.querySelectorAll('[data-press-slider]').forEach((sec) => {
    const btns = sec.querySelectorAll('[data-press-btn]');
    const quotes = sec.querySelectorAll('[data-press-quote]');
    btns.forEach((btn) => {
      const activate = () => {
        const idx = btn.getAttribute('data-press-btn');
        btns.forEach((b) => b.classList.toggle('is-active', b === btn));
        quotes.forEach((q) => q.classList.toggle('is-active', q.getAttribute('data-press-quote') === idx));
      };
      btn.addEventListener('click', activate);
      btn.addEventListener('mouseenter', activate);
    });
  });

  // Centered Editorial Tabbed Slideshow
  document.querySelectorAll('[data-tabbed-slideshow]').forEach((sec) => {
    const btns = sec.querySelectorAll('[data-ed-btn]');
    const slides = sec.querySelectorAll('[data-ed-slide]');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = btn.getAttribute('data-ed-btn');
        btns.forEach((b) => b.classList.toggle('is-active', b === btn));
        slides.forEach((s) => s.classList.toggle('is-active', s.getAttribute('data-ed-slide') === idx));
      });
    });
  });

  /* ------------------------------------------------------------------------
     9. Collection Page Filter Drawer, Sorting, Grid Density & SEO Expand
     ------------------------------------------------------------------------ */
  const colPage = document.querySelector('[data-collection-page]');
  if (colPage) {
    const toggleBtn = colPage.querySelector('[data-toggle-facets]');
    const filterDrawer = colPage.querySelector('[data-filter-drawer]');
    const filterBackdrop = colPage.querySelector('[data-filter-backdrop]');
    const closeFilterBtns = colPage.querySelectorAll('[data-close-filter-drawer]');
    const resetBtn = colPage.querySelector('[data-reset-facets]');
    const activeBadgeEl = colPage.querySelector('[data-active-filter-count]');
    const applyLabelEl = colPage.querySelector('[data-filter-apply-label]');
    const grid = colPage.querySelector('[data-collection-grid]');
    const countEl = colPage.querySelector('[data-collection-count]');
    const emptyEl = colPage.querySelector('[data-collection-empty]');
    const sortSelect = colPage.querySelector('[data-collection-sort]');
    const maxRange = colPage.querySelector('[data-facet-max-range]');
    const minInput = colPage.querySelector('[data-facet-min-price]');
    const maxInput = colPage.querySelector('[data-facet-max-price]');

    const setFilterDrawerOpen = (open) => {
      if (!filterDrawer) return;
      filterDrawer.classList.toggle('is-open', open);
      filterDrawer.setAttribute('aria-hidden', String(!open));
      filterBackdrop?.classList.toggle('is-open', open);
      toggleBtn?.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    };

    // Ensure drawer starts closed by default
    setFilterDrawerOpen(false);

    toggleBtn?.addEventListener('click', () => {
      const isOpen = filterDrawer?.classList.contains('is-open');
      setFilterDrawerOpen(!isOpen);
    });

    closeFilterBtns.forEach((btn) => {
      btn.addEventListener('click', () => setFilterDrawerOpen(false));
    });

    filterBackdrop?.addEventListener('click', () => setFilterDrawerOpen(false));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && filterDrawer?.classList.contains('is-open')) {
        setFilterDrawerOpen(false);
      }
    });

    colPage.querySelectorAll('[data-grid-cols]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cols = btn.getAttribute('data-grid-cols');
        colPage.querySelectorAll('[data-grid-cols]').forEach((b) => b.classList.toggle('is-active', b === btn));
        if (grid) grid.setAttribute('data-cols', cols);
      });
    });

    const cards = grid ? Array.from(grid.querySelectorAll('[data-product-card]')) : [];
    cards.forEach((c, idx) => c.setAttribute('data-orig-idx', String(idx)));

    const getCategoryRank = (card) => {
      const cat = (card.getAttribute('data-category') || 'Eau de Parfum').toLowerCase();
      if (cat === 'attar') return 1;
      if (cat === 'bakhoor') return 2;
      return 0; // Eau de Parfum always first
    };

    // Pre-apply collection URL filter e.g. /collections/fresh, /collections/men, /collections/daily-office
    const colSlugMatch = window.location.pathname.match(/\/collections\/([^/?#]+)/);
    const colSlug = colSlugMatch ? decodeURIComponent(colSlugMatch[1]).toLowerCase() : 'all';
    const SLUG_PRESETS = {
      perfumes: { facet: 'category', val: 'Eau de Parfum', title: 'Eau de Parfum' },
      attar: { facet: 'category', val: 'Attar', title: 'Attar • Perfumed Oil' },
      bakhoor: { facet: 'category', val: 'Bakhoor', title: 'Bakhoor • Incense' },
      incense: { facet: 'category', val: 'Bakhoor', title: 'Bakhoor • Incense' },
      fresh: { facet: 'family', val: 'Fresh', title: 'Fresh' },
      oriental: { facet: 'family', val: 'Oriental', title: 'Oriental' },
      woody: { facet: 'family', val: 'Woody', title: 'Woody' },
      florals: { facet: 'family', val: 'Florals', title: 'Florals' },
      men: { facet: 'gender', val: 'Men', title: "Men's Fragrances" },
      women: { facet: 'gender', val: 'Women', title: "Women's Fragrances" },
      unisex: { facet: 'gender', val: 'Unisex', title: 'Unisex' },
      'daily-office': { facet: 'occasion', val: 'Daily & Office', title: 'Daily & Office Wear' },
      'evening-dates': { facet: 'occasion', val: 'Evening & Dates', title: 'Evening & Date Night' },
      'weddings-formal': { facet: 'occasion', val: 'Weddings & Formal', title: 'Weddings, Majlis & Formal' },
      'casual-travel': { facet: 'occasion', val: 'Casual & Travel', title: 'Casual & Travel' }
    };

    const preset = SLUG_PRESETS[colSlug];
    if (preset) {
      const cb = colPage.querySelector(`[data-facet-${preset.facet}][value="${preset.val}"]`);
      if (cb) cb.checked = true;
      const hEl = colPage.querySelector('[data-collection-heading]');
      if (hEl) hEl.textContent = preset.title;
      const cEl = colPage.querySelector('[data-collection-crumb]');
      if (cEl) cEl.textContent = preset.title;
    }

    const applyCollectionFilters = () => {
      if (!grid || !cards.length) return;
      const categoryChecked = Array.from(colPage.querySelectorAll('[data-facet-category]:checked')).map((i) => i.value);
      const familyChecked = Array.from(colPage.querySelectorAll('[data-facet-family]:checked')).map((i) => i.value);
      const genderChecked = Array.from(colPage.querySelectorAll('[data-facet-gender]:checked')).map((i) => i.value);
      const occasionChecked = Array.from(colPage.querySelectorAll('[data-facet-occasion]:checked')).map((i) => i.value);
      const minRupees = Number(minInput?.value || 0);
      const maxRupees = Number(maxInput?.value || 99999);

      const activeFilterCount =
        categoryChecked.length +
        familyChecked.length +
        genderChecked.length +
        occasionChecked.length +
        (minRupees > 0 || maxRupees < 3000 ? 1 : 0);

      if (activeBadgeEl) {
        activeBadgeEl.hidden = activeFilterCount === 0;
        activeBadgeEl.textContent = String(activeFilterCount);
      }

      let visibleCount = 0;
      cards.forEach((card) => {
        const cat = card.getAttribute('data-category') || 'Eau de Parfum';
        const fam = card.getAttribute('data-family') || '';
        const gen = card.getAttribute('data-gender') || '';
        const occ = card.getAttribute('data-occasion') || '';
        const priceRupees = Number(card.getAttribute('data-price') || 0) / 100;

        const passCat = !categoryChecked.length || categoryChecked.includes(cat);
        const passFam = !familyChecked.length || familyChecked.includes(fam);
        const passGen = !genderChecked.length || genderChecked.includes(gen);
        const passOcc = !occasionChecked.length || occasionChecked.includes(occ);
        const passPrice = priceRupees >= minRupees && priceRupees <= maxRupees;

        const show = passCat && passFam && passGen && passOcc && passPrice;
        card.hidden = !show;
        if (show) visibleCount++;
      });

      const sortVal = sortSelect?.value || 'best-selling';
      const sorted = [...cards].sort((a, b) => {
        // On /collections/all, ALWAYS list Perfume (Eau de Parfum) first, then Attar, then Bakhoor
        if (colSlug === 'all') {
          const rankDiff = getCategoryRank(a) - getCategoryRank(b);
          if (rankDiff !== 0) return rankDiff;
        }
        const pa = Number(a.getAttribute('data-price') || 0);
        const pb = Number(b.getAttribute('data-price') || 0);
        const ta = a.getAttribute('data-title') || '';
        const tb = b.getAttribute('data-title') || '';
        const ia = Number(a.getAttribute('data-orig-idx') || 0);
        const ib = Number(b.getAttribute('data-orig-idx') || 0);
        if (sortVal === 'price-asc') return pa - pb;
        if (sortVal === 'price-desc') return pb - pa;
        if (sortVal === 'title-asc') return ta.localeCompare(tb);
        if (sortVal === 'title-desc') return tb.localeCompare(ta);
        return ia - ib;
      });
      sorted.forEach((c) => grid.appendChild(c));

      const countText = `${visibleCount} product${visibleCount === 1 ? '' : 's'}`;
      if (countEl) countEl.textContent = countText;
      if (applyLabelEl) applyLabelEl.textContent = `View ${countText}`;
      if (emptyEl) emptyEl.hidden = visibleCount > 0;
    };

    resetBtn?.addEventListener('click', () => {
      colPage.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.checked = false;
      });
      if (minInput) minInput.value = '0';
      if (maxInput) maxInput.value = '3000';
      if (maxRange) maxRange.value = '3000';
      applyCollectionFilters();
    });

    colPage.querySelectorAll('input[type="checkbox"]').forEach((cb) => cb.addEventListener('change', applyCollectionFilters));
    sortSelect?.addEventListener('change', applyCollectionFilters);
    maxRange?.addEventListener('input', () => {
      if (maxInput) maxInput.value = maxRange.value;
      applyCollectionFilters();
    });
    minInput?.addEventListener('input', applyCollectionFilters);
    maxInput?.addEventListener('input', applyCollectionFilters);
    applyCollectionFilters();
  }

  document.querySelectorAll('[data-seo-collapsible]').forEach((box) => {
    const btn = box.querySelector('[data-seo-toggle]');
    btn?.addEventListener('click', () => {
      const expanded = box.classList.toggle('is-expanded');
      btn.textContent = expanded ? 'View Less' : 'View More';
    });
  });

  /* ------------------------------------------------------------------------
     10. PDP Interactive Suite (Thumbnails, Dynamic Product Hydration,
         Flash Sale Countdown, Variants, Modals & Sticky ATC Card)
     ------------------------------------------------------------------------ */
  const pdpSec = document.querySelector('[data-pdp]');
  if (pdpSec) {
    const pathMatch = window.location.pathname.match(/\/products\/([^/?#]+)/);
    const urlHandle = pathMatch ? decodeURIComponent(pathMatch[1]) : pdpSec.getAttribute('data-product-handle');
    const matchedProd = findProduct(urlHandle);
    let currentHandle = matchedProd ? matchedProd.handle : 'marq-navy';
    let currentSize = matchedProd && matchedProd.variants && matchedProd.variants[0] ? matchedProd.variants[0].title : '50ml';
    let currentPrice = matchedProd ? matchedProd.price : 120000;

    const bindThumbButtons = () => {
      pdpSec.querySelectorAll('[data-thumb-target]').forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const targetId = thumb.getAttribute('data-thumb-target');
          const targetEl = document.getElementById(targetId);
          pdpSec.querySelectorAll('.pdp-thumb').forEach((t) => t.classList.toggle('is-active', t === thumb));
          targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });
    };

    const bindVariantPills = () => {
      pdpSec.querySelectorAll('[data-pdp-variants] .variant-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
          pdpSec.querySelectorAll('[data-pdp-variants] .variant-pill').forEach((p) => p.classList.toggle('is-active', p === pill));
          currentSize = pill.getAttribute('data-variant-title') || pill.textContent.trim();
          currentPrice = Number(pill.getAttribute('data-variant-price') || currentPrice);
          const compare = Number(pill.getAttribute('data-variant-compare') || 0);

          const sizeLbl = pdpSec.querySelector('[data-pdp-size-label]');
          if (sizeLbl) sizeLbl.textContent = currentSize;
          const priceEl = pdpSec.querySelector('[data-pdp-price]');
          if (priceEl) priceEl.textContent = formatMoney(currentPrice);
          const compEl = pdpSec.querySelector('[data-pdp-compare]');
          if (compEl) {
            if (compare > currentPrice) {
              compEl.hidden = false;
              compEl.textContent = formatMoney(compare);
            } else {
              compEl.hidden = true;
            }
          }

          const sPrice = pdpSec.querySelector('[data-sticky-atc-price]');
          if (sPrice) sPrice.textContent = formatMoney(currentPrice);
          const sSize = pdpSec.querySelector('[data-sticky-atc-size]');
          if (sSize) sSize.textContent = '• ' + currentSize;
        });
      });
    };

    if (matchedProd) {
      pdpSec.setAttribute('data-product-handle', matchedProd.handle);
      document.title = `${matchedProd.title} – MARQ Perfumes`;

      const tEl = pdpSec.querySelector('[data-pdp-title]');
      if (tEl) tEl.textContent = matchedProd.title;
      const cEl = pdpSec.querySelector('[data-pdp-crumb]');
      if (cEl) cEl.textContent = matchedProd.title;

      // Deterministic per-product rating & review count
      const seed = Number(matchedProd.id || 9201);
      const ratingScore = (4.51 + ((seed * 7) % 38) / 100).toFixed(2);
      const reviewTotal = 145 + ((seed * 29) % 178);
      const ratEl = pdpSec.querySelector('[data-pdp-rating]');
      if (ratEl) ratEl.textContent = ratingScore;
      const revEl = pdpSec.querySelector('[data-pdp-reviews]');
      if (revEl) revEl.textContent = `${reviewTotal} reviews`;
      const cCol = pdpSec.querySelector('[data-pdp-crumb-col]');
      const catPill = pdpSec.querySelector('[data-pdp-category-pill]');
      const prodCategory = matchedProd.category || 'Eau de Parfum';
      if (prodCategory === 'Attar') {
        if (cCol) {
          cCol.textContent = 'Attar • Perfumed Oil';
          cCol.href = '/collections/attar';
        }
        if (catPill) {
          catPill.textContent = 'Attar';
          catPill.href = '/collections/attar';
        }
      } else if (prodCategory === 'Bakhoor') {
        if (cCol) {
          cCol.textContent = 'Bakhoor • Incense';
          cCol.href = '/collections/bakhoor';
        }
        if (catPill) {
          catPill.textContent = 'Bakhoor';
          catPill.href = '/collections/bakhoor';
        }
      } else {
        if (cCol && matchedProd.family) {
          cCol.textContent = matchedProd.family;
          cCol.href = '/collections/' + matchedProd.family.toLowerCase();
        }
        if (catPill) {
          catPill.textContent = 'Eau de Parfum';
          catPill.href = '/collections/perfumes';
        }
      }

      const unitWordEl = pdpSec.querySelector('[data-pdp-unit-word]');
      if (unitWordEl) {
        unitWordEl.textContent = prodCategory === 'Bakhoor' ? 'jars' : prodCategory === 'Attar' ? 'rollers' : 'flacons';
      }
      const persHeadEl = pdpSec.querySelector('[data-pdp-personalise-heading]');
      if (persHeadEl) {
        persHeadEl.textContent =
          prodCategory === 'Bakhoor'
            ? 'Personalise Your Jar'
            : prodCategory === 'Attar'
            ? 'Personalise Your Attar'
            : 'Personalise Your Bottle';
      }
      const stage1El = pdpSec.querySelector('[data-smells-stage-1]');
      if (stage1El) {
        stage1El.textContent = prodCategory === 'Bakhoor' ? 'First Burn' : prodCategory === 'Attar' ? 'First Touch' : 'First Spray';
      }

      const famPill = pdpSec.querySelector('[data-pdp-family-pill]');
      if (famPill && matchedProd.family) {
        famPill.textContent = matchedProd.family;
        famPill.href = '/collections/' + matchedProd.family.toLowerCase();
      }
      const genPill = pdpSec.querySelector('[data-pdp-gender-pill]');
      if (genPill && matchedProd.gender) {
        genPill.textContent = matchedProd.gender;
        genPill.href = '/collections/' + matchedProd.gender.toLowerCase();
      }
      const occPill = pdpSec.querySelector('[data-pdp-occasion-pill]');
      if (occPill && matchedProd.occasion_tag) {
        occPill.textContent = matchedProd.occasion_tag;
      }
      const saveBadge = pdpSec.querySelector('[data-pdp-save-badge]');
      if (saveBadge) {
        if (matchedProd.compare_at_price > matchedProd.price) {
          const pct = Math.round(((matchedProd.compare_at_price - matchedProd.price) * 100) / matchedProd.compare_at_price);
          saveBadge.hidden = false;
          saveBadge.textContent = `Save ${pct}%`;
        } else {
          saveBadge.hidden = true;
        }
      }

      const dEl = pdpSec.querySelector('[data-pdp-desc]');
      if (dEl) dEl.textContent = matchedProd.description;
      const pEl = pdpSec.querySelector('[data-pdp-price]');
      if (pEl) pEl.textContent = formatMoney(matchedProd.price);
      const compEl = pdpSec.querySelector('[data-pdp-compare]');
      if (compEl) {
        if (matchedProd.compare_at_price > matchedProd.price) {
          compEl.hidden = false;
          compEl.textContent = formatMoney(matchedProd.compare_at_price);
        } else {
          compEl.hidden = true;
        }
      }

      const stockEl = pdpSec.querySelector('[data-pdp-stock]');
      if (stockEl && matchedProd.stock) stockEl.textContent = String(matchedProd.stock);

      // Gallery Thumbs & Stack
      const imgs = matchedProd.images && matchedProd.images.length ? matchedProd.images : [matchedProd.featured_image];
      const thumbsWrap = pdpSec.querySelector('[data-pdp-thumbs]');
      const stackWrap = pdpSec.querySelector('[data-pdp-media-stack]');
      if (thumbsWrap && stackWrap) {
        thumbsWrap.innerHTML = imgs
          .map(
            (src, i) =>
              `<button type="button" class="pdp-thumb${i === 0 ? ' is-active' : ''}" data-thumb-target="pdp-media-${i}">
                <img src="${src}" alt="${matchedProd.title} thumbnail ${i + 1}">
              </button>`
          )
          .join('');
        stackWrap.innerHTML = imgs
          .map(
            (src, i) =>
              `<div class="pdp-media-item" id="pdp-media-${i}">
                <img src="${src}" alt="${matchedProd.title} ${i + 1}" ${i === 0 ? 'fetchpriority="high" data-pdp-primary-img' : 'loading="lazy"'}>
              </div>`
          )
          .join('');
      }

      // Variants & Personalisation visibility rules:
      // - Perfume: 50ml (₹1,200) & 100ml (₹2,500) + Personalized enabled
      // - Attar: 3ml (₹250), 6ml (₹450), 12ml (₹650) + NO personalisation
      // - Bakhoor: NO variation selector + NO personalisation
      const pdpVarPicker = pdpSec.querySelector('[data-pdp-variant-picker]');
      const pdpPersonaliseBtn = pdpSec.querySelector('[data-open-personalise="pdp"]');
      const varsWrap = pdpSec.querySelector('[data-pdp-variants]');
      const prodVars = matchedProd.variants || [];
      if (pdpVarPicker) {
        pdpVarPicker.hidden = prodCategory === 'Bakhoor' || prodVars.length <= 1;
      }
      if (pdpPersonaliseBtn) {
        pdpPersonaliseBtn.hidden = prodCategory !== 'Eau de Parfum';
      }
      if (varsWrap && prodVars.length) {
        varsWrap.innerHTML = prodVars
          .map(
            (v, i) =>
              `<button type="button" class="variant-pill${i === 0 ? ' is-active' : ''}" data-variant-id="${v.id}" data-variant-title="${v.title}" data-variant-price="${v.price}" data-variant-compare="${v.compare_at_price || 0}">
                <span>${v.title}</span>
              </button>`
          )
          .join('');
        currentSize = prodVars[0].title;
        currentPrice = prodVars[0].price;
        const sizeLblInit = pdpSec.querySelector('[data-pdp-size-label]');
        if (sizeLblInit) sizeLblInit.textContent = currentSize;
        const stickySizeInit = pdpSec.querySelector('[data-sticky-atc-size]');
        if (stickySizeInit) {
          stickySizeInit.hidden = prodCategory === 'Bakhoor' || currentSize === 'Default Title';
          stickySizeInit.textContent = '• ' + currentSize;
        }
      }

      // 1. Smells Like Card
      if (matchedProd.smells_like) {
        const sf = pdpSec.querySelector('[data-smells-first]');
        const sm = pdpSec.querySelector('[data-smells-mid]');
        const sd = pdpSec.querySelector('[data-smells-dry]');
        if (sf) sf.textContent = matchedProd.smells_like.first_spray;
        if (sm) sm.textContent = matchedProd.smells_like.after_30_min;
        if (sd) sd.textContent = matchedProd.smells_like.dry_down;
        const nImgs = matchedProd.smells_like.images || [];
        const ni1 = pdpSec.querySelector('[data-smells-img-1]');
        const ni2 = pdpSec.querySelector('[data-smells-img-2]');
        const ni3 = pdpSec.querySelector('[data-smells-img-3]');
        if (ni1 && nImgs[0]) ni1.src = nImgs[0];
        if (ni2 && nImgs[1]) ni2.src = nImgs[1];
        if (ni3 && nImgs[2]) ni3.src = nImgs[2];
      }

      // 2. Intensity Bars (out of 5.0 -> %)
      const silBar = pdpSec.querySelector('[data-intensity-sillage]');
      const projBar = pdpSec.querySelector('[data-intensity-projection]');
      const longBar = pdpSec.querySelector('[data-intensity-longevity]');
      if (silBar && matchedProd.sillage) silBar.style.width = `${Math.min(100, matchedProd.sillage * 20)}%`;
      if (projBar && matchedProd.projection) projBar.style.width = `${Math.min(100, matchedProd.projection * 20)}%`;
      if (longBar && matchedProd.longevity) longBar.style.width = `${Math.min(100, matchedProd.longevity * 20)}%`;

      // 3. Notes & Composition Lists
      const renderNoteList = (sel, arr) => {
        const ul = pdpSec.querySelector(sel);
        if (ul && Array.isArray(arr) && arr.length) {
          ul.innerHTML = arr.map((n) => `<li>${n}</li>`).join('');
        }
      };
      renderNoteList('[data-pdp-top-notes]', matchedProd.top_notes);
      renderNoteList('[data-pdp-mid-notes]', matchedProd.middle_notes);
      renderNoteList('[data-pdp-base-notes]', matchedProd.base_notes);

      // 4. Occasion & Category Guide
      const occTxt = pdpSec.querySelector('[data-pdp-occasion-text]');
      if (occTxt && matchedProd.occasion) occTxt.textContent = matchedProd.occasion;
      const colTxt = pdpSec.querySelector('[data-pdp-collection-text]');
      if (colTxt && matchedProd.family) colTxt.textContent = `${matchedProd.family} • ${matchedProd.gender || 'Unisex'}`;
      const wearTip = pdpSec.querySelector('[data-pdp-wear-tip]');
      if (wearTip) {
        wearTip.textContent =
          prodCategory === 'Bakhoor'
            ? 'Place a small pinch over glowing charcoal or an electric bakhoor burner to fill your home, office, or majlis with rich aromatic smoke.'
            : prodCategory === 'Attar'
            ? 'Roll gently onto warm pulse points—wrists, inner elbows, and behind the ears—for alcohol-free, skin-hugging projection.'
            : 'Mist 2–4 sprays onto hydrated pulse points—wrists, collarbone, and behind the ears—from 15 cm away. Allow the fragrance to settle naturally without rubbing.';
      }

      // Sticky ATC Card
      const sTitle = pdpSec.querySelector('[data-sticky-atc-title]');
      if (sTitle) sTitle.textContent = matchedProd.title;
      const sPrice = pdpSec.querySelector('[data-sticky-atc-price]');
      if (sPrice) sPrice.textContent = formatMoney(matchedProd.price);
      const sImg = pdpSec.querySelector('[data-sticky-atc-img]');
      if (sImg) sImg.src = matchedProd.featured_image;
    }

    bindThumbButtons();
    bindVariantPills();

    // Add To Cart & Buy It Now
    pdpSec.querySelectorAll('[data-pdp-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const qty = Number(pdpSec.querySelector('[data-pdp-qty]')?.value || 1);
        addItemToCart({ handle: currentHandle, variantTitle: currentSize, qty, customPrice: currentPrice });
      });
    });

    pdpSec.querySelector('[data-pdp-buy-now]')?.addEventListener('click', () => {
      addItemToCart({ handle: currentHandle, variantTitle: currentSize, qty: 1, customPrice: currentPrice });
    });

    // Live Ticking Flash Sale Countdown
    const cdDigits = pdpSec.querySelector('[data-countdown-digits]');
    if (cdDigits) {
      let remainingSec = 15 * 86400 + 44 * 60 + 6;
      setInterval(() => {
        remainingSec = Math.max(0, remainingSec - 1);
        const d = String(Math.floor(remainingSec / 86400)).padStart(2, '0');
        const h = String(Math.floor((remainingSec % 86400) / 3600)).padStart(2, '0');
        const m = String(Math.floor((remainingSec % 3600) / 60)).padStart(2, '0');
        const s = String(remainingSec % 60).padStart(2, '0');
        cdDigits.textContent = `${d} : ${h} : ${m} : ${s}`;
      }, 1000);
    }

    // Floating Bottom-Right Sticky Add-to-Cart Visibility
    const buyBox = pdpSec.querySelector('[data-pdp-buy-box]');
    const stickyCard = pdpSec.querySelector('[data-sticky-atc]');
    if (buyBox && stickyCard && 'IntersectionObserver' in window) {
      const obs = new IntersectionObserver(
        ([entry]) => {
          const pastBuyBox = !entry.isIntersecting && entry.boundingClientRect.top < 0;
          stickyCard.classList.toggle('is-visible', pastBuyBox);
          stickyCard.setAttribute('aria-hidden', String(!pastBuyBox));
        },
        { threshold: 0 }
      );
      obs.observe(buyBox);
    }

    // Pickup Drawer
    pdpSec.querySelector('[data-open-pickup]')?.addEventListener('click', () => {
      openDrawer(document.getElementById('PickupDrawer'));
    });
  }

  // Story Video Modal, Ingredients Modal & Expandable Philosophy Cards
  const storyModal = document.getElementById('StoryVideoModal');
  document.querySelectorAll('[data-open-story]').forEach((el) => {
    el.addEventListener('click', () => {
      if (!storyModal) return;
      const img = el.getAttribute('data-story-img-src');
      const h = el.getAttribute('data-story-heading');
      const t = el.getAttribute('data-story-text');
      if (img) storyModal.querySelector('[data-story-img]').src = img;
      if (h) storyModal.querySelector('[data-story-title]').textContent = h;
      if (t) storyModal.querySelector('[data-story-quote]').textContent = `“${t}”`;
      openModal(storyModal);
    });
  });

  const ingModal = document.getElementById('IngredientsModal');
  document.querySelectorAll('[data-open-ingredients]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(ingModal));
  });

  document.querySelectorAll('.center-modal').forEach((modalEl) => {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeAllOverlays();
    });
  });

  document.querySelectorAll('[data-expand-card]').forEach((card) => {
    card.querySelector('[data-expand-btn]')?.addEventListener('click', () => {
      card.classList.toggle('is-expanded');
    });
  });

  /* ------------------------------------------------------------------------
     11. Bottle Personalisation / Live Laser-Engraving Modal
     ------------------------------------------------------------------------ */
  const personaliseModal = document.getElementById('PersonaliseModal');
  if (personaliseModal) {
    const engraveInput = personaliseModal.querySelector('[data-engrave-input]');
    const engravePreview = personaliseModal.querySelector('[data-engrave-preview]');
    const engravePerfumeLabel = personaliseModal.querySelector('[data-engrave-perfume-label]');
    const engraveContext = personaliseModal.querySelector('[data-engrave-context]');
    const engraveCounter = personaliseModal.querySelector('[data-engrave-counter]');
    const engraveSubmit = personaliseModal.querySelector('[data-engrave-submit]');
    const fontBtns = personaliseModal.querySelectorAll('[data-engrave-font]');

    const FONT_CLASSES = [
      'is-font-classic',
      'is-font-elegant',
      'is-font-playful',
      'is-font-cursive',
      'is-font-roman',
      'is-font-sleek'
    ];

    let targetEngraveState = {
      handle: 'marq-navy',
      title: 'Navy',
      variantTitle: '50ml',
      qty: 1,
      customPrice: null,
      fontName: 'Classic',
      fontClass: 'is-font-classic'
    };

    const autoFitPlaqueEl = (el) => {
      if (!el) return;
      el.style.fontSize = '';
      if (!el.textContent || el.clientWidth <= 0) return;
      let px = parseFloat(window.getComputedStyle(el).fontSize) || 20;
      let guard = 0;
      while (el.scrollWidth > el.clientWidth && px > 9 && guard < 24) {
        px *= 0.92;
        el.style.fontSize = `${px.toFixed(2)}px`;
        guard++;
      }
    };

    const syncEngravingPreview = () => {
      const val = engraveInput ? engraveInput.value : '';
      const trimmed = val.trim();
      if (engravePreview) {
        engravePreview.textContent = val;
        engravePreview.classList.remove('is-len-md', 'is-len-lg', ...FONT_CLASSES);
        engravePreview.classList.add(targetEngraveState.fontClass);
        if (val.length >= 12) {
          engravePreview.classList.add('is-len-lg');
        } else if (val.length >= 8) {
          engravePreview.classList.add('is-len-md');
        }
        requestAnimationFrame(() => autoFitPlaqueEl(engravePreview));
      }
      if (engraveCounter) {
        engraveCounter.textContent = `${val.length} / 15`;
      }
      if (engraveSubmit) {
        engraveSubmit.disabled = trimmed.length === 0;
      }
    };

    const launchPersonaliseModal = ({ handle, variantTitle, qty, customPrice }) => {
      const prod = findProduct(handle);
      if (!prod) return;
      if (prod.category && prod.category !== 'Eau de Parfum') return;

      const resolvedSize = variantTitle || (prod.variants && prod.variants[0]?.title) || '50ml';
      const matchedVar = (prod.variants || []).find((v) => v.title === resolvedSize) || (prod.variants || [])[0];
      const resolvedPrice = customPrice != null ? Number(customPrice) : Number(matchedVar?.price || prod.price);

      targetEngraveState = {
        handle: prod.handle,
        title: prod.title,
        variantTitle: resolvedSize,
        qty: Math.max(1, Number(qty || 1)),
        customPrice: resolvedPrice,
        fontName: 'Classic',
        fontClass: 'is-font-classic'
      };

      const shortScentName = prod.title.replace(/^MARQ\s+/i, '').trim().toUpperCase();
      if (engravePerfumeLabel) {
        engravePerfumeLabel.textContent = shortScentName || prod.title.toUpperCase();
      }
      if (engraveContext) {
        engraveContext.textContent = `${prod.title} • ${resolvedSize} • ${formatMoney(resolvedPrice)}`;
      }
      if (engraveInput) {
        engraveInput.value = '';
      }

      fontBtns.forEach((btn, idx) => {
        const active = idx === 0;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
      });

      syncEngravingPreview();
      openModal(personaliseModal);
      if (engraveInput) {
        setTimeout(() => engraveInput.focus({ preventScroll: true }), 60);
      }
    };

    engraveInput?.addEventListener('input', syncEngravingPreview);

    fontBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        targetEngraveState.fontName = btn.getAttribute('data-engrave-font') || 'Classic';
        targetEngraveState.fontClass = btn.getAttribute('data-font-class') || 'is-font-classic';
        fontBtns.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        syncEngravingPreview();
      });
    });

    engraveSubmit?.addEventListener('click', () => {
      const text = (engraveInput?.value || '').trim();
      if (!text) {
        engraveInput?.focus();
        return;
      }
      addItemToCart({
        handle: targetEngraveState.handle,
        variantTitle: targetEngraveState.variantTitle,
        qty: targetEngraveState.qty,
        customPrice: targetEngraveState.customPrice,
        engravingText: text,
        engravingFont: targetEngraveState.fontName
      });
    });

    engraveInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (engraveInput.value || '').trim().length > 0) {
        e.preventDefault();
        engraveSubmit?.click();
      }
    });

    document.addEventListener('click', (e) => {
      const trig = e.target.closest('[data-open-personalise]');
      if (!trig) return;
      e.preventDefault();
      const source = trig.getAttribute('data-open-personalise');
      if (source === 'qv' && activeQvProduct) {
        const qvQty = Number(qvDrawer?.querySelector('[data-qv-qty]')?.value || 1);
        launchPersonaliseModal({
          handle: activeQvProduct.handle,
          variantTitle: activeQvSize,
          qty: qvQty
        });
      } else if (pdpSec) {
        const handle = pdpSec.getAttribute('data-product-handle') || 'marq-navy';
        const activePill = pdpSec.querySelector('[data-pdp-variants] .variant-pill.is-active');
        const vTitle = activePill?.getAttribute('data-variant-title') || activePill?.textContent.trim() || '50ml';
        const vPrice = activePill ? Number(activePill.getAttribute('data-variant-price')) : null;
        const pdpQty = Number(pdpSec.querySelector('[data-pdp-qty]')?.value || 1);
        launchPersonaliseModal({
          handle,
          variantTitle: vTitle,
          qty: pdpQty,
          customPrice: vPrice
        });
      }
    });
  }

  /* ------------------------------------------------------------------------
     12. Homepage Interactive Personalisation Try-On Studio
     ------------------------------------------------------------------------ */
  document.querySelectorAll('[data-try-personalise]').forEach((studio) => {
    const scentSelect = studio.querySelector('[data-try-scent]');
    const sizeBtns = studio.querySelectorAll('[data-try-size]');
    const textInput = studio.querySelector('[data-try-input]');
    const counterEl = studio.querySelector('[data-try-counter]');
    const previewEl = studio.querySelector('[data-try-preview]');
    const perfumeLabelEl = studio.querySelector('[data-try-perfume-label]');
    const fontBtns = studio.querySelectorAll('[data-try-font]');
    const sampleChips = studio.querySelectorAll('[data-try-sample]');
    const submitBtn = studio.querySelector('[data-try-submit]');
    const submitLabelEl = studio.querySelector('[data-try-submit-label]');
    const prodLinkEl = studio.querySelector('[data-try-product-link]');

    const STUDIO_FONT_CLASSES = [
      'is-font-classic',
      'is-font-elegant',
      'is-font-playful',
      'is-font-cursive',
      'is-font-roman',
      'is-font-sleek'
    ];

    let activeSize = '50ml';
    let activeFontName = 'Classic';
    let activeFontClass = 'is-font-classic';

    const syncTryStudio = () => {
      const opt = scentSelect?.options[scentSelect.selectedIndex];
      const handle = scentSelect?.value || 'marq-navy';
      const scentTitle = opt?.getAttribute('data-title') || 'Navy';
      const p50 = Number(opt?.getAttribute('data-p50') || 120000);
      const p100 = Number(opt?.getAttribute('data-p100') || 250000);
      const currentPrice = activeSize === '100ml' ? p100 : p50;

      if (perfumeLabelEl) {
        perfumeLabelEl.textContent = scentTitle.toUpperCase();
      }
      if (prodLinkEl) {
        prodLinkEl.href = `/products/${handle}`;
      }

      const rawText = textInput ? textInput.value : '';
      const trimmed = rawText.trim();
      if (previewEl) {
        previewEl.style.fontSize = '';
        previewEl.textContent = rawText;
        previewEl.classList.remove('is-len-md', 'is-len-lg', ...STUDIO_FONT_CLASSES);
        previewEl.classList.add(activeFontClass);
        if (rawText.length >= 12) {
          previewEl.classList.add('is-len-lg');
        } else if (rawText.length >= 8) {
          previewEl.classList.add('is-len-md');
        }
        requestAnimationFrame(() => {
          if (previewEl.clientWidth > 0) {
            let px = parseFloat(window.getComputedStyle(previewEl).fontSize) || 22;
            let guard = 0;
            while (previewEl.scrollWidth > previewEl.clientWidth && px > 9 && guard < 24) {
              px *= 0.92;
              previewEl.style.fontSize = `${px.toFixed(2)}px`;
              guard++;
            }
          }
        });
      }
      if (counterEl) {
        counterEl.textContent = `${rawText.length} / 15`;
      }
      if (submitLabelEl) {
        submitLabelEl.textContent = `Add Engraved Bottle to Cart • ${formatMoney(currentPrice)}`;
      }
      if (submitBtn) {
        submitBtn.disabled = trimmed.length === 0;
      }

      sampleChips.forEach((chip) => {
        const chipVal = chip.getAttribute('data-try-sample') || '';
        chip.classList.toggle('is-active', chipVal !== '' && chipVal === rawText);
      });
    };

    scentSelect?.addEventListener('change', syncTryStudio);

    sizeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeSize = btn.getAttribute('data-try-size') || '50ml';
        sizeBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
        syncTryStudio();
      });
    });

    textInput?.addEventListener('input', syncTryStudio);

    sampleChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        if (!textInput) return;
        const sample = chip.getAttribute('data-try-sample') || '';
        textInput.value = sample;
        syncTryStudio();
        if (sample === '') {
          textInput.focus();
        }
      });
    });

    fontBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFontName = btn.getAttribute('data-try-font') || 'Classic';
        activeFontClass = btn.getAttribute('data-font-class') || 'is-font-classic';
        fontBtns.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        syncTryStudio();
      });
    });

    submitBtn?.addEventListener('click', () => {
      const text = (textInput?.value || '').trim();
      if (!text) {
        textInput?.focus();
        return;
      }
      const opt = scentSelect?.options[scentSelect.selectedIndex];
      const handle = scentSelect?.value || 'marq-navy';
      const p50 = Number(opt?.getAttribute('data-p50') || 120000);
      const p100 = Number(opt?.getAttribute('data-p100') || 250000);
      const unitPrice = activeSize === '100ml' ? p100 : p50;

      addItemToCart({
        handle,
        variantTitle: activeSize,
        qty: 1,
        customPrice: unitPrice,
        engravingText: text,
        engravingFont: activeFontName
      });
    });

    syncTryStudio();
  });
})();

