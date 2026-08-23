/** Checkout — address + Razorpay / cash */
(async function checkoutPage() {
  const mount = document.getElementById("app");
  if (!mount) return;

  if (!SabxiApi.token()) {
    sessionStorage.setItem("sabxi_post_login", "/checkout.html");
    location.href = "/login.html";
    return;
  }

  const items = SabxiCart.read();
  if (!items.length) {
    location.href = "/cart.html";
    return;
  }

  mount.innerHTML =
    SabxiUI.shellHtml({ active: "cart" }) +
    `<main class="wrap" id="checkout-main"></main>` +
    SabxiUI.footerHtml();

  SabxiUI.bindCartClicks(document);
  SabxiUI.renderShellChrome();
  SabxiUI.initLocation();
  try {
    await SabxiUI.fillCategoryNav(await SabxiApi.categories());
  } catch {}

  const state = {
    addresses: [],
    addressId: null,
    payment: "online",
    coupon: "",
    quote: null,
    placing: false,
    showNewAddress: false,
  };

  function requireLoginRedirect(err) {
    if (err?.status === 401) {
      sessionStorage.setItem("sabxi_post_login", "/checkout.html");
      location.href = "/login.html";
      return true;
    }
    return false;
  }

  async function refreshQuote() {
    try {
      state.quote = (await SabxiApi.quote(items)).data;
    } catch (e) {
      if (requireLoginRedirect(e)) return;
      state.quote = null;
    }
  }

  async function loadAddresses() {
    try {
      state.addresses = await SabxiApi.listAddresses();
      const def =
        state.addresses.find((a) => a.is_default) || state.addresses[0] || null;
      state.addressId = def?.id || null;
      state.showNewAddress = state.addresses.length === 0;
    } catch (e) {
      if (requireLoginRedirect(e)) return;
      state.addresses = [];
      state.showNewAddress = true;
    }
  }

  function addressLabel(a) {
    const bits = [
      a.label,
      a.house_no_floor,
      a.building_block,
      a.address,
      a.area,
      a.pincode,
    ].filter(Boolean);
    return bits.join(", ");
  }

  function render() {
    const main = document.getElementById("checkout-main");
    const q = state.quote;
    const subtotal = q?.subtotal;
    const delivery = q?.delivery_fee;
    const total = q?.total;

    main.innerHTML = `
      <div class="cart-layout">
        <section class="panel checkout-panel">
          <h2 class="checkout-title">Delivery address</h2>
          ${
            state.addresses.length
              ? `<div class="addr-list">
            ${state.addresses
              .map(
                (a) => `<label class="addr-card ${
                  state.addressId === a.id ? "on" : ""
                }">
              <input type="radio" name="addr" value="${a.id}" ${
                  state.addressId === a.id ? "checked" : ""
                } />
              <span>
                <strong>${SabxiUI.escapeHtml?.(a.label || "Home") || a.label || "Home"}</strong>
                <div class="uom">${SabxiUI.escapeHtml?.(addressLabel(a)) || addressLabel(a)}</div>
              </span>
            </label>`
              )
              .join("")}
          </div>
          <button type="button" class="btn ghost" id="toggle-addr" style="margin-top:10px">
            ${state.showNewAddress ? "Hide new address" : "Add new address"}
          </button>`
              : `<p class="hint">Add a delivery address to continue.</p>`
          }

          <div id="new-addr" ${state.showNewAddress ? "" : "hidden"}>
            <h3 class="checkout-sub">New address</h3>
            <label>Label</label>
            <input id="addr-label" placeholder="Home / Office" value="Home" />
            <label>Full address</label>
            <textarea id="addr-line" rows="3" placeholder="Flat, building, street, area"></textarea>
            <label>Pincode</label>
            <input id="addr-pin" inputmode="numeric" maxlength="6" placeholder="400071" value="${
              SabxiApi.studio()?.pincode || ""
            }" />
            <button type="button" class="btn block" id="save-addr" style="margin-top:10px">Save address</button>
          </div>

          <h2 class="checkout-title" style="margin-top:22px">Payment</h2>
          <div class="pay-list">
            <label class="addr-card ${state.payment === "online" ? "on" : ""}">
              <input type="radio" name="pay" value="online" ${
                state.payment === "online" ? "checked" : ""
              } />
              <span><strong>Pay online</strong><div class="uom">UPI / card / netbanking via Razorpay</div></span>
            </label>
            <label class="addr-card ${state.payment === "cash" ? "on" : ""}">
              <input type="radio" name="pay" value="cash" ${
                state.payment === "cash" ? "checked" : ""
              } />
              <span><strong>Cash on delivery</strong><div class="uom">Pay when your order arrives</div></span>
            </label>
          </div>

          <h2 class="checkout-title" style="margin-top:22px">Coupon (optional)</h2>
          <input id="coupon" placeholder="e.g. FIRST100" value="${SabxiUI.escapeHtml?.(
            state.coupon
          ) || state.coupon}" />
          <p class="hint" id="checkout-msg" style="margin-top:12px"></p>
        </section>

        <aside class="panel cart-summary">
          <h2 style="margin-bottom:12px;font-size:18px">Bill details</h2>
          ${
            q
              ? `<div class="row"><span>Item total</span><span>${SabxiUI.money(
                  subtotal
                )}</span></div>
          <div class="row"><span>Delivery</span><span>${SabxiUI.money(
            delivery
          )}</span></div>
          <div class="row total"><span>To pay</span><span>${SabxiUI.money(
            total
          )}</span></div>`
              : `<div class="row"><span>Item total</span><span>${SabxiUI.money(
                  SabxiCart.subtotal()
                )}</span></div>`
          }
          <button class="btn block" type="button" id="place-order" ${
            state.placing ? "disabled" : ""
          } style="margin-top:14px">
            ${
              state.placing
                ? "Placing…"
                : state.payment === "online"
                  ? "Pay & place order"
                  : "Place order"
            }
          </button>
          <a class="btn ghost block" style="margin-top:8px" href="/cart.html">Back to cart</a>
          <a class="btn ghost block" style="margin-top:8px" href="/orders.html">Order history</a>
        </aside>
      </div>`;

    main.querySelectorAll('input[name="addr"]').forEach((el) => {
      el.onchange = () => {
        state.addressId = el.value;
        render();
      };
    });
    main.querySelectorAll('input[name="pay"]').forEach((el) => {
      el.onchange = () => {
        state.payment = el.value;
        render();
      };
    });
    const coupon = main.querySelector("#coupon");
    if (coupon) {
      coupon.onchange = () => {
        state.coupon = coupon.value.trim();
      };
    }
    const toggle = main.querySelector("#toggle-addr");
    if (toggle) {
      toggle.onclick = () => {
        state.showNewAddress = !state.showNewAddress;
        render();
      };
    }
    const saveAddr = main.querySelector("#save-addr");
    if (saveAddr) {
      saveAddr.onclick = async () => {
        const msg = main.querySelector("#checkout-msg");
        const address = (main.querySelector("#addr-line")?.value || "").trim();
        const pincode = (main.querySelector("#addr-pin")?.value || "").replace(
          /\D/g,
          ""
        );
        const label = (main.querySelector("#addr-label")?.value || "Home").trim();
        if (address.length < 5) {
          msg.textContent = "Enter a fuller delivery address.";
          return;
        }
        saveAddr.disabled = true;
        try {
          const auth = SabxiApi.auth()?.customer || {};
          const created = await SabxiApi.createAddress({
            label,
            address,
            pincode: pincode || null,
            city: "Mumbai",
            state: "Maharashtra",
            recipient_name: auth.name || null,
            mobile: auth.mobile || null,
            is_default: state.addresses.length === 0,
          });
          await loadAddresses();
          state.addressId = created.id;
          state.showNewAddress = false;
          SabxiUI.toast("Address saved");
          render();
        } catch (e) {
          if (requireLoginRedirect(e)) return;
          msg.textContent = e.message || "Could not save address";
        } finally {
          saveAddr.disabled = false;
        }
      };
    }
    const place = main.querySelector("#place-order");
    if (place) place.onclick = () => void placeOrder();
  }

  function openRazorpay(intent) {
    return new Promise((resolve, reject) => {
      if (typeof Razorpay === "undefined") {
        reject(new Error("Razorpay failed to load. Refresh and try again."));
        return;
      }
      const rzp = new Razorpay({
        key: intent.key_id,
        amount: intent.amount,
        currency: intent.currency || "INR",
        name: intent.company_name || "SABXI",
        description: intent.description || "Sabxi order",
        order_id: intent.razorpay_order_id,
        prefill: {
          name: intent.prefill_name || undefined,
          contact: intent.prefill_contact || undefined,
          email: intent.prefill_email || undefined,
        },
        theme: { color: "#ff6b00" },
        handler: (response) => resolve(response),
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled")),
        },
      });
      rzp.on("payment.failed", (resp) => {
        reject(
          new Error(
            resp?.error?.description || resp?.error?.reason || "Payment failed"
          )
        );
      });
      rzp.open();
    });
  }

  async function placeOrder() {
    const msg = document.getElementById("checkout-msg");
    if (!state.addressId) {
      msg.textContent = "Select or add a delivery address.";
      return;
    }
    if (state.placing) return;
    state.placing = true;
    render();
    const coupon =
      document.getElementById("coupon")?.value.trim() || state.coupon || null;
    try {
      // Keep server cart in sync before create
      try {
        await SabxiApi.saveCart(items);
      } catch {}

      const order = await SabxiApi.createOrder({
        items,
        delivery_address_id: state.addressId,
        payment_mode: state.payment === "online" ? "online" : "cash",
        coupon_code: coupon || null,
        notes: "Placed via sabxi.com checkout",
      });

      let paidOnline = false;
      if (state.payment === "online") {
        try {
          const intent = await SabxiApi.createRazorpayIntent(order.id);
          const rzResponse = await openRazorpay(intent);
          await SabxiApi.verifyRazorpayPayment({
            order_id: order.id,
            razorpay_order_id: rzResponse.razorpay_order_id,
            razorpay_payment_id: rzResponse.razorpay_payment_id,
            razorpay_signature: rzResponse.razorpay_signature,
          });
          paidOnline = true;
        } catch (payErr) {
          try {
            await SabxiApi.cancelRazorpayPayment(order.id);
          } catch {}
          throw payErr;
        }
        if (!paidOnline) {
          throw new Error("Payment was not completed");
        }
      }

      SabxiCart.clear();
      try {
        await SabxiApi.saveCart([]);
      } catch {}
      SabxiUI.toast(`Order ${order.order_number || ""} placed`);
      location.href = `/orders.html?placed=${encodeURIComponent(order.id)}`;
    } catch (e) {
      if (requireLoginRedirect(e)) return;
      msg.textContent = e.message || "Could not place order";
      state.placing = false;
      render();
    }
  }

  await Promise.all([loadAddresses(), refreshQuote()]);
  render();
})();
