/** Shared UI helpers */
window.SabxiUI = (() => {
  const money = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })}`;

  function toast(msg) {
    let el = document.getElementById("sabxi-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "sabxi-toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function imgUrl(p) {
    const u = Array.isArray(p?.images) ? p.images[0] : p?.image;
    return u || "/assets/products/cut-produce-bowl.png";
  }

  function discount(p) {
    const price = Number(p.price) || 0;
    const mrp = Number(p.mrp) || 0;
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  }

  function productCard(p) {
    const off = discount(p);
    const sold = p.is_available === false;
    const href = `/product.html?id=${encodeURIComponent(p.product_id || p.sku_id)}`;
    return `<article class="card" data-sku="${p.sku_id}">
      <a class="img" href="${href}">
        <img src="${imgUrl(p)}" alt="${escapeHtml(p.name || "")}" loading="lazy" />
        ${sold ? `<div class="sold">Sold out</div>` : ""}
      </a>
      ${off ? `<span class="badge offer">${off}% off</span>` : `<span class="badge">Fresh cut</span>`}
      <a href="${href}"><h3>${escapeHtml(p.name || "")}</h3></a>
      <div class="price">
        <span class="now">${money(p.price)}</span>
        ${off ? `<span class="was">${money(p.mrp)}</span><span class="off">${off}% off</span>` : ""}
      </div>
      <div class="uom">${escapeHtml(p.selling_uom || "pack")}${p.eta_mins ? ` · ${p.eta_mins} mins` : ""}</div>
      <div class="qty-row" data-add-row="${p.sku_id}">
        ${sold ? `<button class="btn ghost" disabled>Unavailable</button>` : qtyControls(p)}
      </div>
    </article>`;
  }

  function qtyInCart(skuId) {
    return SabxiCart.read().find((x) => x.sku_id === skuId)?.qty || 0;
  }

  function qtyControls(p) {
    const q = qtyInCart(p.sku_id);
    if (q <= 0) {
      return `<button class="btn add" type="button" data-add='${escapeAttr(JSON.stringify(compact(p)))}'>ADD</button>`;
    }
    return `<div class="stepper" data-step="${p.sku_id}">
      <button type="button" data-dec="${p.sku_id}">−</button>
      <span>${q}</span>
      <button type="button" data-inc='${escapeAttr(JSON.stringify(compact(p)))}'>+</button>
    </div>`;
  }

  function compact(p) {
    return {
      sku_id: p.sku_id,
      product_id: p.product_id,
      name: p.name,
      price: p.price,
      mrp: p.mrp,
      images: p.images || [],
      selling_uom: p.selling_uom,
      is_available: p.is_available,
    };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function bindCartClicks(root = document) {
    root.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      if (add) {
        e.preventDefault();
        try {
          SabxiCart.add(JSON.parse(add.getAttribute("data-add")));
          refreshQtyRows();
        } catch {}
        return;
      }
      const dec = e.target.closest("[data-dec]");
      if (dec) {
        const id = dec.getAttribute("data-dec");
        const cur = qtyInCart(id);
        SabxiCart.setQty(id, cur - 1);
        refreshQtyRows();
        return;
      }
      const inc = e.target.closest("[data-inc]");
      if (inc) {
        try {
          SabxiCart.add(JSON.parse(inc.getAttribute("data-inc")));
          refreshQtyRows();
        } catch {}
      }
    });
  }

  function refreshQtyRows() {
    document.querySelectorAll("[data-add-row]").forEach((row) => {
      const sku = row.getAttribute("data-add-row");
      const card = row.closest(".card");
      const btn = card?.querySelector("[data-add], [data-inc]");
      let product = null;
      if (btn?.hasAttribute("data-add")) {
        try {
          product = JSON.parse(btn.getAttribute("data-add"));
        } catch {}
      } else if (btn?.hasAttribute("data-inc")) {
        try {
          product = JSON.parse(btn.getAttribute("data-inc"));
        } catch {}
      }
      if (!product) return;
      row.innerHTML = qtyControls(product);
    });
  }

  function headerAuthLabel() {
    const a = SabxiApi.auth();
    const el = document.querySelector("[data-auth-label]");
    if (!el) return;
    if (a?.customer?.mobile || a?.access_token) {
      el.textContent = a.customer?.name || a.customer?.mobile || "Account";
      el.href = "/login.html";
    } else {
      el.textContent = "Login";
      el.href = "/login.html";
    }
  }

  function renderShellChrome() {
    SabxiCart.updateBadges();
    headerAuthLabel();
    const studio = SabxiApi.studio();
    document.querySelectorAll("[data-studio-label]").forEach((el) => {
      el.textContent = studio.name || "Chembur";
    });
    document.querySelectorAll("[data-eta]").forEach((el) => {
      el.textContent = `${studio.eta_mins || 15}-min`;
    });
  }

  async function initLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await SabxiApi.resolveStudio(pos.coords.latitude, pos.coords.longitude);
          renderShellChrome();
        } catch {}
      },
      () => {},
      { timeout: 4000, maximumAge: 600000 }
    );
  }

  function shellHtml({ active = "home" } = {}) {
    return `
<div class="top-strip">
  <div class="wrap">
    <span>Delivering in <strong data-eta>15-min</strong> · <span data-studio-label>Chembur Studio</span></span>
    <span><a href="/download/?utm_source=website&utm_sub_source=topstrip">Get the app</a></span>
  </div>
</div>
<header class="header">
  <div class="wrap header-row">
    <a class="logo" href="/">
      <img src="/assets/logo.png" alt="Sabxi" />
      <span><span class="logo-word">SABXI</span><span class="logo-sub">Cut veggies &amp; fruits</span></span>
    </a>
    <form class="search" action="/shop.html" method="get" role="search">
      <input name="q" type="search" placeholder="Search pineapple, spinach, juice…" autocomplete="off" />
      <button type="submit" aria-label="Search">⌕</button>
    </form>
    <div class="header-actions">
      <a class="hide-sm" data-auth-label href="/login.html">Login</a>
      <a class="cart-btn" href="/cart.html">Cart <span class="cart-badge" data-cart-count hidden>0</span></a>
    </div>
  </div>
</header>
<nav class="cat-nav" id="cat-nav"><div class="wrap" id="cat-nav-inner"></div></nav>
<nav class="bottom-nav" aria-label="Primary">
  <a href="/" class="${active === "home" ? "on" : ""}"><span class="ico">⌂</span>Home</a>
  <a href="/shop.html" class="${active === "shop" ? "on" : ""}"><span class="ico">▦</span>Shop</a>
  <a href="/cart.html" class="${active === "cart" ? "on" : ""}"><span class="ico">🛒</span>Cart</a>
  <a href="/login.html" class="${active === "account" ? "on" : ""}"><span class="ico">☺</span>Account</a>
</nav>`;
  }

  function footerHtml() {
    return `<footer>
  <div class="wrap foot-grid">
    <div>
      <h4>About</h4>
      <a href="/">Home</a>
      <a href="/shop.html">Shop</a>
      <a href="/download/?utm_source=website&utm_sub_source=footer">Download app</a>
    </div>
    <div>
      <h4>Help</h4>
      <a href="mailto:hello@sabxi.com">hello@sabxi.com</a>
      <a href="/download/?utm_source=website&utm_sub_source=support">Support in app</a>
    </div>
    <div>
      <h4>Shop</h4>
      <a href="/shop.html?cat=Vegetables">Vegetables</a>
      <a href="/shop.html?cat=Fruits">Fruits</a>
      <a href="/shop.html?cat=Juices">Juices</a>
    </div>
    <div>
      <h4>Mail us</h4>
      <p>Sabxi · Fresh cut produce for Mumbai kitchens.</p>
    </div>
  </div>
  <div class="wrap foot-bottom">
    <span>© ${new Date().getFullYear()} Sabxi</span>
    <span>Live catalog from Chembur Studio</span>
  </div>
</footer>`;
  }

  async function fillCategoryNav(cats) {
    const inner = document.getElementById("cat-nav-inner");
    if (!inner) return;
    const params = new URLSearchParams(location.search);
    const active = params.get("category") || params.get("cat") || "";
    inner.innerHTML =
      `<a href="/shop.html" class="${!active ? "on" : ""}">All</a>` +
      cats
        .map(
          (c) =>
            `<a href="/shop.html?category=${encodeURIComponent(c.id)}" class="${
              active === c.id || active === c.name ? "on" : ""
            }">${escapeHtml(c.name)}</a>`
        )
        .join("");
  }

  return {
    money,
    toast,
    imgUrl,
    discount,
    productCard,
    bindCartClicks,
    refreshQtyRows,
    renderShellChrome,
    initLocation,
    shellHtml,
    footerHtml,
    fillCategoryNav,
  };
})();
