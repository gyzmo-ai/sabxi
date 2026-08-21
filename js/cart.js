/** Local cart + badge helpers */
window.SabxiCart = (() => {
  const KEY = "sabxi_web_cart_v1";

  function read() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("sabxi:cart", { detail: items }));
    updateBadges();
  }

  function count() {
    return read().reduce((n, i) => n + (i.qty || 0), 0);
  }

  function updateBadges() {
    const n = count();
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = String(n);
      el.hidden = n === 0;
    });
  }

  function add(product, qty = 1) {
    if (!product?.sku_id) return;
    if (product.is_available === false) {
      window.SabxiUI?.toast("Sold out");
      return;
    }
    const items = read();
    const i = items.findIndex((x) => x.sku_id === product.sku_id);
    if (i >= 0) items[i].qty += qty;
    else {
      items.push({
        sku_id: product.sku_id,
        product_id: product.product_id,
        name: product.name,
        price: product.price,
        mrp: product.mrp,
        images: product.images || [],
        selling_uom: product.selling_uom,
        qty,
      });
    }
    write(items);
    window.SabxiUI?.toast("Added to cart");
  }

  function setQty(skuId, qty) {
    let items = read();
    if (qty <= 0) items = items.filter((x) => x.sku_id !== skuId);
    else {
      const row = items.find((x) => x.sku_id === skuId);
      if (row) row.qty = qty;
    }
    write(items);
  }

  function clear() {
    write([]);
  }

  function lineTotal(item) {
    return (Number(item.price) || 0) * (item.qty || 0);
  }

  function subtotal() {
    return read().reduce((s, i) => s + lineTotal(i), 0);
  }

  return { read, write, count, updateBadges, add, setQty, clear, lineTotal, subtotal };
})();
