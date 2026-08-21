/** Cart page */
(async function cartPage() {
  const mount = document.getElementById("app");
  if (!mount) return;

  mount.innerHTML =
    SabxiUI.shellHtml({ active: "cart" }) +
    `<main class="wrap" id="cart-main"></main>` +
    SabxiUI.footerHtml();

  SabxiUI.bindCartClicks(document);
  SabxiUI.renderShellChrome();
  SabxiUI.initLocation();

  try {
    await SabxiUI.fillCategoryNav(await SabxiApi.categories());
  } catch {}

  async function render() {
    const items = SabxiCart.read();
    const main = document.getElementById("cart-main");
    if (!items.length) {
      main.innerHTML = `<section class="panel"><div class="empty">
        Your cart is empty.<br/><br/><a class="btn" href="/shop.html">Browse products</a>
      </div></section>`;
      return;
    }

    let quote = null;
    try {
      const r = await SabxiApi.quote(items);
      quote = r.data;
    } catch {
      quote = null;
    }

    const localSub = SabxiCart.subtotal();
    main.innerHTML = `
      <div class="cart-layout">
        <section class="panel" id="cart-lines">
          ${items
            .map(
              (i) => `<div class="cart-item">
                <img src="${(i.images && i.images[0]) || "/assets/products/cut-produce-bowl.png"}" alt="" />
                <div>
                  <strong>${i.name}</strong>
                  <div class="uom">${SabxiUI.money(i.price)} · ${i.selling_uom || "pack"}</div>
                  <div class="stepper" style="margin-top:8px">
                    <button type="button" data-cart-dec="${i.sku_id}">−</button>
                    <span>${i.qty}</span>
                    <button type="button" data-cart-inc="${i.sku_id}">+</button>
                  </div>
                </div>
                <strong>${SabxiUI.money(SabxiCart.lineTotal(i))}</strong>
              </div>`
            )
            .join("")}
        </section>
        <aside class="panel cart-summary">
          <h2 style="margin-bottom:12px;font-size:18px">Bill details</h2>
          <div class="row"><span>Item total</span><span>${SabxiUI.money(
            quote?.subtotal ?? localSub
          )}</span></div>
          <div class="row"><span>Delivery</span><span>${
            quote?.delivery_fee != null ? SabxiUI.money(quote.delivery_fee) : "In app"
          }</span></div>
          <div class="row total"><span>To pay</span><span>${SabxiUI.money(
            quote?.total ?? localSub
          )}</span></div>
          <p style="font-size:12px;color:var(--muted);margin:10px 0 14px">
            Prices match live studio rates${quote ? "" : " (estimate)"}. Checkout completes in the Sabxi app.
          </p>
          <button class="btn block" id="checkout-btn" type="button">Continue to checkout</button>
          <a class="btn ghost block" style="margin-top:8px" href="${SabxiApi.downloadUrl({
            sub: "cart",
          })}">Open in app</a>
        </aside>
      </div>`;
  }

  document.getElementById("cart-main").addEventListener("click", async (e) => {
    const dec = e.target.closest("[data-cart-dec]");
    const inc = e.target.closest("[data-cart-inc]");
    if (dec) {
      const id = dec.getAttribute("data-cart-dec");
      const cur = SabxiCart.read().find((x) => x.sku_id === id)?.qty || 0;
      SabxiCart.setQty(id, cur - 1);
      render();
      return;
    }
    if (inc) {
      const id = inc.getAttribute("data-cart-inc");
      const cur = SabxiCart.read().find((x) => x.sku_id === id)?.qty || 0;
      SabxiCart.setQty(id, cur + 1);
      render();
      return;
    }
    if (e.target.id === "checkout-btn") {
      const auth = SabxiApi.auth();
      const items = SabxiCart.read();
      if (!auth?.access_token) {
        sessionStorage.setItem("sabxi_post_login", "/cart.html");
        location.href = "/login.html";
        return;
      }
      try {
        await SabxiApi.saveCart(items);
        SabxiUI.toast("Cart saved — opening app…");
        // Deep link + download fallback
        const deep = "sabxi://cart";
        location.href = deep;
        setTimeout(() => {
          location.href = SabxiApi.downloadUrl({ sub: "checkout" });
        }, 900);
      } catch (err) {
        SabxiUI.toast(err.message || "Could not sync cart");
        location.href = SabxiApi.downloadUrl({ sub: "checkout_fail" });
      }
    }
  });

  window.addEventListener("sabxi:cart", () => SabxiUI.renderShellChrome());
  await render();
})();
