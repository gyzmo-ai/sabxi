/** Shop / category / search */
(async function shop() {
  const mount = document.getElementById("app");
  if (!mount) return;
  const params = new URLSearchParams(location.search);
  const category = params.get("category") || "";
  const q = params.get("q") || params.get("search") || "";
  const catName = params.get("cat") || "";

  mount.innerHTML =
    SabxiUI.shellHtml({ active: "shop" }) +
    `<main class="wrap">
      <section class="panel">
        <div class="sec-head">
          <h2 id="shop-title">Shop</h2>
          <span class="meta" id="shop-meta"></span>
        </div>
        <div class="grid" id="shop-grid"><div class="loading">Loading products…</div></div>
      </section>
    </main>` +
    SabxiUI.footerHtml();

  SabxiUI.bindCartClicks(document);
  SabxiUI.renderShellChrome();
  SabxiUI.initLocation();

  const searchInput = document.querySelector('.search input[name="q"]');
  if (searchInput && q) searchInput.value = q;

  try {
    const cats = await SabxiApi.categories();
    await SabxiUI.fillCategoryNav(cats);
    let categoryId = category;
    if (!categoryId && catName) {
      const hit = cats.find((c) => c.name.toLowerCase().includes(catName.toLowerCase()));
      if (hit) categoryId = hit.id;
    }
    const titleCat = cats.find((c) => c.id === categoryId);
    document.getElementById("shop-title").textContent =
      titleCat?.name || (q ? `Results for “${q}”` : "All products");

    const studioId = SabxiApi.studio().id;
    const { items, meta } = await SabxiApi.products({
      page: 1,
      pageSize: 100,
      category: categoryId || undefined,
      search: q || undefined,
      studioId,
    });
    document.getElementById("shop-meta").textContent = `${meta.total ?? items.length} items`;
    document.getElementById("shop-grid").innerHTML = items.length
      ? items.map(SabxiUI.productCard).join("")
      : `<div class="empty">No products found. <a href="/shop.html">Clear filters</a></div>`;
  } catch (e) {
    document.getElementById("shop-grid").innerHTML =
      `<div class="empty">${e.message || "Failed to load"}</div>`;
  }
})();
