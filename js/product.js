/** Product detail */
(async function productPage() {
  const mount = document.getElementById("app");
  if (!mount) return;
  const id = new URLSearchParams(location.search).get("id");
  mount.innerHTML =
    SabxiUI.shellHtml({ active: "shop" }) +
    `<main class="wrap"><section class="panel" id="detail"><div class="loading">Loading…</div></section></main>` +
    SabxiUI.footerHtml();

  SabxiUI.bindCartClicks(document);
  SabxiUI.renderShellChrome();
  SabxiUI.initLocation();

  try {
    const cats = await SabxiApi.categories();
    await SabxiUI.fillCategoryNav(cats);
    if (!id) throw new Error("Missing product");
    const p = await SabxiApi.product(id);
    const off = SabxiUI.discount(p);
    const sold = p.is_available === false;
    document.title = `${p.name} · Sabxi`;
    const payload = {
      sku_id: p.sku_id,
      product_id: p.product_id,
      name: p.name,
      price: p.price,
      mrp: p.mrp,
      images: p.images || [],
      selling_uom: p.selling_uom,
      is_available: p.is_available,
    };
    document.getElementById("detail").innerHTML = `
      <div class="detail">
        <div class="detail-img"><img src="${SabxiUI.imgUrl(p)}" alt="" /></div>
        <div>
          ${off ? `<span class="badge offer">${off}% off</span>` : `<span class="badge">Live menu</span>`}
          <h1>${escape(p.name)}</h1>
          <div class="price">
            <span class="now">${SabxiUI.money(p.price)}</span>
            ${off ? `<span class="was">${SabxiUI.money(p.mrp)}</span><span class="off">${off}% off</span>` : ""}
          </div>
          <div class="uom">${escape(p.selling_uom || "pack")}${p.eta_mins ? ` · ETA ${p.eta_mins} mins` : ""}${
            p.stock_qty != null ? ` · Stock ${p.stock_qty}` : ""
          }</div>
          <p class="desc">${escape(
            p.description || "Fresh cut and packed at Sabxi Studio. Same live catalog as the app."
          )}</p>
          <div class="qty-row" data-add-row="${p.sku_id}" style="max-width:220px">
            ${
              sold
                ? `<button class="btn ghost" disabled>Sold out</button>`
                : `<button class="btn add block" type="button" data-add="${escapeAttr(
                    JSON.stringify(payload)
                  )}">ADD TO CART</button>`
            }
          </div>
          <p style="margin-top:14px;font-size:13px;color:var(--muted)">
            Prefer the app? <a href="${SabxiApi.downloadUrl({ sub: "pdp" })}" style="color:var(--orange);font-weight:700">Download Sabxi</a>
          </p>
        </div>
      </div>`;
    SabxiUI.refreshQtyRows();
  } catch (e) {
    document.getElementById("detail").innerHTML =
      `<div class="empty">${e.message || "Product not found"} · <a href="/shop.html">Back to shop</a></div>`;
  }

  function escape(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escape(s);
  }
})();
