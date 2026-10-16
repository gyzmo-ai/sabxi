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
    const diet = p.jain_option && (p.jain_option.roots || []).length ? p.jain_option : null;
    const choices = {};
    (diet?.roots || []).forEach((root) => {
      choices[root.id] = "keep";
    });
    let dietMode = "normal";

    function dietNote() {
      if (!diet) return "";
      const changes = diet.roots
        .map((root) => {
          const choice = choices[root.id] || "keep";
          if (choice === "keep") return "";
          if (choice === "remove") return `no ${root.label.toLowerCase()}`;
          const pool = [...(root.substitutes || []), ...(diet.replacements || [])];
          const sub = pool.find((item) => item.id === choice);
          return sub ? `${root.label.toLowerCase()} → ${sub.label.toLowerCase()}` : "";
        })
        .filter(Boolean);
      if (dietMode === "normal") return changes.join(", ");
      const label = (diet.modes || []).find((mode) => mode.value === dietMode)?.label || dietMode;
      return changes.length ? `${label}: ${changes.join(", ")}` : label;
    }

    function payload() {
      return {
        sku_id: p.sku_id,
        product_id: p.product_id,
        name: p.name,
        price: p.price,
        mrp: p.mrp,
        images: p.images || [],
        selling_uom: p.selling_uom,
        is_available: p.is_available,
        note: dietNote(),
      };
    }

    function dietHtml() {
      if (!diet) return "";
      const modes = [
        { value: "normal", label: "Regular" },
        ...(diet.modes || []).map((mode) => ({
          value: mode.value,
          label: mode.value === "upwas" ? "Fast" : mode.value === "jain" ? "Jain" : mode.label,
        })),
      ];
      return `<div class="diet" id="diet">
        <h2>How should we make it?</h2>
        <p class="uom">Same price. Keep, leave, or swap any item.</p>
        <div class="diet-modes">
          ${modes
            .map(
              (mode) =>
                `<button type="button" class="diet-chip ${dietMode === mode.value ? "on" : ""}" data-diet-mode="${escapeAttr(
                  mode.value
                )}">${escape(mode.label)}</button>`
            )
            .join("")}
        </div>
        ${diet.roots
          .map((root) => {
            const choice = choices[root.id] || "keep";
            const subs = root.remove_only ? [] : root.substitutes || diet.replacements || [];
            return `<div class="diet-row">
              <strong>${escape(root.label)}</strong>
              <div class="diet-actions">
                <button type="button" class="diet-chip ${choice === "keep" ? "on" : ""}" data-diet-root="${escapeAttr(
                  root.id
                )}" data-diet-choice="keep">Keep</button>
                <button type="button" class="diet-chip ${choice === "remove" ? "on" : ""}" data-diet-root="${escapeAttr(
                  root.id
                )}" data-diet-choice="remove">Leave</button>
              </div>
              ${
                subs.length
                  ? `<select data-diet-swap="${escapeAttr(root.id)}">
                <option value="">Swap with…</option>
                ${subs
                  .map(
                    (item) =>
                      `<option value="${escapeAttr(item.id)}" ${choice === item.id ? "selected" : ""}>${escape(
                        item.label
                      )}</option>`
                  )
                  .join("")}
              </select>`
                  : ""
              }
            </div>`;
          })
          .join("")}
      </div>`;
    }

    function paint() {
      const note = dietNote();
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
          <div class="uom">${escape(p.selling_uom || "")}${p.eta_mins ? `${p.selling_uom ? " · " : ""}ETA ${p.eta_mins} mins` : ""}</div>
          <p class="desc">${escape(
            p.description || "Fresh cut and packed at Sabxi Studio. Same live catalog as the app."
          )}</p>
          ${dietHtml()}
          ${note ? `<p class="uom">Your mix: ${escape(note)}</p>` : ""}
          <div class="line-price">${SabxiUI.money(p.price)}</div>
          <div class="qty-row" style="max-width:220px;margin-top:12px">
            ${
              sold
                ? `<button class="btn ghost" disabled>Sold out</button>`
                : `<button class="btn add block" type="button" id="add-product">ADD TO CART</button>`
            }
          </div>
          <p style="margin-top:14px;font-size:13px;color:var(--muted)">
            Prefer the app? <a href="${SabxiApi.downloadUrl({ sub: "pdp" })}" style="color:var(--orange);font-weight:700">Download Sabxi</a>
          </p>
        </div>
      </div>`;
    }

    paint();
    document.getElementById("detail").addEventListener("click", (event) => {
      const modeBtn = event.target.closest("[data-diet-mode]");
      if (modeBtn) {
        dietMode = modeBtn.getAttribute("data-diet-mode");
        (diet?.roots || []).forEach((root) => {
          const next = dietMode === "normal" ? "keep" : root.defaults?.[dietMode] || "keep";
          choices[root.id] = next === "remove" || next === "keep" ? next : "keep";
        });
        paint();
        return;
      }
      const choiceBtn = event.target.closest("[data-diet-choice]");
      if (choiceBtn) {
        choices[choiceBtn.getAttribute("data-diet-root")] = choiceBtn.getAttribute("data-diet-choice");
        paint();
        return;
      }
      if (event.target.id === "add-product") {
        SabxiCart.add(payload());
      }
    });
    document.getElementById("detail").addEventListener("change", (event) => {
      const swap = event.target.closest("[data-diet-swap]");
      if (!swap) return;
      const value = swap.value;
      if (!value) return;
      choices[swap.getAttribute("data-diet-swap")] = value;
      paint();
    });
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
