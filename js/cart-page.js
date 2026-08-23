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
    let quoteErr = null;
    try {
      const r = await SabxiApi.quote(items);
      quote = r.data;
    } catch (e) {
      quoteErr = e.message || "Could not refresh prices";
      quote = null;
    }

    const lines = quote?.lines?.length
      ? quote.lines.map((line) => {
          const local = items.find((i) => i.sku_id === line.product_sku_id);
          return {
            sku_id: line.product_sku_id,
            name: local?.name || "Item",
            price: line.unit_price,
            qty: line.quantity,
            images: local?.images,
            selling_uom: local?.selling_uom,
            line_total: line.line_subtotal,
          };
        })
      : items.map((i) => ({
          ...i,
          line_total: SabxiCart.lineTotal(i),
        }));

    const oos = quote?.out_of_stock || [];
    // Keep local cart aligned with billable lines so checkout can't re-send OOS SKUs.
    if (Array.isArray(oos) && oos.length) {
      const drop = new Set(
        oos
          .map((o) => o.product_sku_id || o.sku_id)
          .filter(Boolean)
          .map(String)
      );
      if (drop.size) {
        const cur = SabxiCart.read();
        const next = cur.filter((i) => !drop.has(String(i.sku_id)));
        if (next.length !== cur.length) SabxiCart.write(next);
      }
    }
    const notice = quote?.notice || quoteErr;

    const subtotal = quote?.subtotal;
    const delivery = quote?.delivery_fee;
    const gst = quote?.gst_amount;
    const total = quote?.total;

    main.innerHTML = `
      <div class="cart-layout">
        <section class="panel" id="cart-lines">
          ${
            notice
              ? `<div class="callout" style="margin:12px 14px 0">${SabxiUI.escapeHtml?.(notice) || notice}</div>`
              : ""
          }
          ${lines
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
                <strong>${SabxiUI.money(i.line_total)}</strong>
              </div>`
            )
            .join("")}
          ${oos
            .map(
              (o) => `<div class="cart-item" style="opacity:.55">
                <div style="grid-column:1/-1;padding:4px 0">
                  <strong>${o.name || "Item"}</strong>
                  <div class="uom">Out of stock — remove to checkout</div>
                </div>
              </div>`
            )
            .join("")}
        </section>
        <aside class="panel cart-summary">
          <h2 style="margin-bottom:12px;font-size:18px">Bill details</h2>
          ${
            quote
              ? `<div class="row"><span>Item total</span><span>${SabxiUI.money(subtotal)}</span></div>
          <div class="row"><span>Delivery</span><span>${SabxiUI.money(delivery)}</span></div>
          ${
            gst
              ? `<div class="row"><span>GST</span><span>${SabxiUI.money(gst)}</span></div>`
              : ""
          }
          <div class="row total"><span>To pay</span><span>${SabxiUI.money(total)}</span></div>`
              : `<div class="row"><span>Item total</span><span>${SabxiUI.money(
                  SabxiCart.subtotal()
                )}</span></div>
          <p style="font-size:12px;color:var(--muted);margin:8px 0">Live bill unavailable — totals refresh at checkout.</p>`
          }
          <p style="font-size:12px;color:var(--muted);margin:10px 0 14px">
            Prices from Chembur studio. Place your order on the next step.
          </p>
          <a class="btn block" href="/checkout.html" id="checkout-btn">Continue to checkout</a>
          <a class="btn ghost block" style="margin-top:8px" href="/orders.html">Order history</a>
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
    }
  });

  window.addEventListener("sabxi:cart", () => SabxiUI.renderShellChrome());
  await render();
})();
