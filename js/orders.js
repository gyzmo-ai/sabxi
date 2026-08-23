/** Order history */
(async function ordersPage() {
  const mount = document.getElementById("app");
  if (!mount) return;

  if (!SabxiApi.token()) {
    sessionStorage.setItem("sabxi_post_login", "/orders.html" + location.search);
    location.href = "/login.html";
    return;
  }

  mount.innerHTML =
    SabxiUI.shellHtml({ active: "account" }) +
    `<main class="wrap" id="orders-main"></main>` +
    SabxiUI.footerHtml();

  SabxiUI.bindCartClicks(document);
  SabxiUI.renderShellChrome();
  SabxiUI.initLocation();
  try {
    await SabxiUI.fillCategoryNav(await SabxiApi.categories());
  } catch {}

  const params = new URLSearchParams(location.search);
  const placedId = params.get("placed");
  const detailId = params.get("id") || placedId;

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function statusLabel(s) {
    return String(s || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function statusClass(s) {
    const v = String(s || "").toLowerCase();
    if (v.includes("deliver") || v === "completed") return "ok";
    if (v.includes("cancel") || v.includes("fail")) return "bad";
    if (v.includes("await") || v.includes("pending")) return "warn";
    return "";
  }

  async function showList() {
    const main = document.getElementById("orders-main");
    main.innerHTML = `<div class="loading">Loading orders…</div>`;
    try {
      const { items } = await SabxiApi.listOrders({ page: 1, pageSize: 50 });
      if (!items.length) {
        main.innerHTML = `
          <section class="panel" style="padding:24px;text-align:center">
            <h2>No orders yet</h2>
            <p class="hint" style="margin:10px 0 16px">Your past orders will show up here.</p>
            <a class="btn" href="/shop.html">Start shopping</a>
          </section>`;
        return;
      }
      main.innerHTML = `
        <div class="orders-head">
          <h1>Your orders</h1>
          ${
            placedId
              ? `<p class="callout ok">Order placed successfully. Track it below.</p>`
              : ""
          }
        </div>
        <div class="order-list">
          ${items
            .map((o) => {
              const n = o.items?.length || 0;
              return `<a class="panel order-card" href="/orders.html?id=${encodeURIComponent(
                o.id
              )}">
              <div class="order-card-top">
                <strong>${SabxiUI.escapeHtml(o.order_number || "")}</strong>
                <span class="pill ${statusClass(o.status)}">${SabxiUI.escapeHtml(
                  statusLabel(o.status)
                )}</span>
              </div>
              <div class="uom">${fmtDate(o.placed_at || o.created_at)} · ${n} item${
                n === 1 ? "" : "s"
              }</div>
              <div class="order-card-bot">
                <span>${SabxiUI.money(o.total)}</span>
                <span class="uom">${SabxiUI.escapeHtml(
                  statusLabel(o.payment_status)
                )}${o.payment_mode ? ` · ${o.payment_mode}` : ""}</span>
              </div>
            </a>`;
            })
            .join("")}
        </div>
        <p style="margin:16px 0"><a class="btn ghost" href="/shop.html">Continue shopping</a></p>`;
    } catch (e) {
      if (e?.status === 401) {
        sessionStorage.setItem("sabxi_post_login", "/orders.html");
        location.href = "/login.html";
        return;
      }
      main.innerHTML = `<section class="panel" style="padding:20px">
        <p class="hint">${SabxiUI.escapeHtml(e.message || "Could not load orders")}</p>
        <button class="btn" type="button" id="retry">Retry</button>
      </section>`;
      main.querySelector("#retry").onclick = () => void showList();
    }
  }

  async function showDetail(id) {
    const main = document.getElementById("orders-main");
    main.innerHTML = `<div class="loading">Loading order…</div>`;
    try {
      const o = await SabxiApi.getOrder(id);
      const lines = (o.items || [])
        .map((it) => {
          const sku = it.product_sku || {};
          const name =
            sku.product_name ||
            [sku.variant_name, sku.unit_key].filter(Boolean).join(" · ") ||
            "Item";
          const qty = it.ordered_quantity ?? 0;
          const uom = sku.unit_key || "";
          return `<div class="cart-item" style="grid-template-columns:1fr auto">
          <div>
            <strong>${SabxiUI.escapeHtml(name)}</strong>
            <div class="uom">× ${qty}${
              uom ? ` · ${SabxiUI.escapeHtml(uom)}` : ""
            }</div>
          </div>
          <strong>${SabxiUI.money(it.line_total)}</strong>
        </div>`;
        })
        .join("");

      main.innerHTML = `
        <p style="margin:8px 0 12px"><a href="/orders.html">← All orders</a></p>
        <div class="cart-layout">
          <section class="panel">
            <div class="order-card-top" style="padding:14px 14px 0">
              <h2 style="margin:0;font-size:18px">${SabxiUI.escapeHtml(
                o.order_number || ""
              )}</h2>
              <span class="pill ${statusClass(o.status)}">${SabxiUI.escapeHtml(
                statusLabel(o.status)
              )}</span>
            </div>
            <p class="uom" style="padding:6px 14px 12px">${fmtDate(
              o.placed_at || o.created_at
            )}</p>
            ${lines || `<p class="hint" style="padding:14px">No line items.</p>`}
            ${
              o.delivery_address
                ? `<div style="padding:12px 14px;border-top:1px solid var(--line)">
              <strong>Deliver to</strong>
              <div class="uom">${SabxiUI.escapeHtml(o.delivery_address)}</div>
            </div>`
                : ""
            }
          </section>
          <aside class="panel cart-summary">
            <h2 style="margin-bottom:12px;font-size:18px">Bill</h2>
            <div class="row"><span>Item total</span><span>${SabxiUI.money(
              o.subtotal
            )}</span></div>
            ${
              o.discount_total
                ? `<div class="row"><span>Discount</span><span>−${SabxiUI.money(
                    o.discount_total
                  )}</span></div>`
                : ""
            }
            <div class="row"><span>Delivery</span><span>${SabxiUI.money(
              o.delivery_fee
            )}</span></div>
            ${
              o.gst_amount
                ? `<div class="row"><span>GST</span><span>${SabxiUI.money(
                    o.gst_amount
                  )}</span></div>`
                : ""
            }
            <div class="row total"><span>Total</span><span>${SabxiUI.money(
              o.total
            )}</span></div>
            <p class="uom" style="margin-top:10px">
              Payment: ${SabxiUI.escapeHtml(statusLabel(o.payment_status))}
              ${o.payment_mode ? ` · ${SabxiUI.escapeHtml(o.payment_mode)}` : ""}
            </p>
            <a class="btn block" style="margin-top:14px" href="/shop.html">Shop again</a>
          </aside>
        </div>`;
    } catch (e) {
      if (e?.status === 401) {
        sessionStorage.setItem(
          "sabxi_post_login",
          `/orders.html?id=${encodeURIComponent(id)}`
        );
        location.href = "/login.html";
        return;
      }
      main.innerHTML = `<section class="panel" style="padding:20px">
        <p class="hint">${SabxiUI.escapeHtml(e.message || "Order not found")}</p>
        <a class="btn" href="/orders.html">Back to orders</a>
      </section>`;
    }
  }

  if (detailId) await showDetail(detailId);
  else await showList();
})();
