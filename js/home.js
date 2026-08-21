/** Home page — live catalog */
(async function home() {
  const mount = document.getElementById("app");
  if (!mount) return;

  mount.innerHTML =
    SabxiUI.shellHtml({ active: "home" }) +
    `<main class="wrap">
      <section class="panel hero" id="hero">
        <div class="hero-track" id="hero-track"></div>
        <div class="hero-dots" id="hero-dots"></div>
      </section>
      <section class="panel">
        <div class="circles" id="circles"><div class="loading">Loading categories…</div></div>
      </section>
      <section class="banners" id="banners"></section>
      <section class="panel" id="deals">
        <div class="sec-head"><h2>Deals of the Day</h2><span class="meta" id="deal-timer">Ends soon</span></div>
        <div class="grid" id="deals-grid"><div class="loading">Loading deals…</div></div>
      </section>
      <div id="sections"></div>
    </main>` +
    SabxiUI.footerHtml();

  SabxiUI.bindCartClicks(document);
  SabxiUI.renderShellChrome();
  SabxiUI.initLocation();

  let cats = [];
  let all = [];
  try {
    cats = await SabxiApi.categories();
    await SabxiUI.fillCategoryNav(cats);
    const studioId = SabxiApi.studio().id;
    // pull first 2 pages (~200) for home merchandising
    const p1 = await SabxiApi.products({ page: 1, pageSize: 100, studioId });
    const p2 = await SabxiApi.products({ page: 2, pageSize: 100, studioId });
    all = [...p1.items, ...p2.items];
  } catch (e) {
    document.getElementById("circles").innerHTML =
      `<div class="empty">Couldn’t load catalog. <a href="/shop.html">Retry shop</a></div>`;
    return;
  }

  // Circles
  document.getElementById("circles").innerHTML = cats
    .map(
      (c) => `<a class="circle" href="/shop.html?category=${encodeURIComponent(c.id)}">
        <span class="thumb"><img src="${c.image || "/assets/products/cut-produce-bowl.png"}" alt="" loading="lazy" /></span>
        <span>${c.name}</span>
      </a>`
    )
    .join("");

  // Hero from first products with images
  const heroes = all.filter((p) => p.images?.length).slice(0, 3);
  const heroCopy = [
    { t: "Cut veggies & fruits, ready in minutes", s: "Prep done. Cook faster. Delivered from Chembur Studio." },
    { t: "Fresh juices & smoothie mixes", s: "Blend-ready packs with real produce photos from our kitchen." },
    { t: "Same-day cut, same-day delivered", s: "Browse the live menu — prices and stock match the Sabxi app." },
  ];
  const track = document.getElementById("hero-track");
  track.innerHTML = heroes
    .map(
      (p, i) => `<div class="hero-slide">
        <div>
          <h1>${heroCopy[i]?.t || p.name}</h1>
          <p>${heroCopy[i]?.s || ""}</p>
          <a class="btn" href="/product.html?id=${encodeURIComponent(p.product_id)}">Shop ${escape(p.name)}</a>
        </div>
        <div class="hero-media"><img src="${p.images[0]}" alt="${escape(p.name)}" /></div>
      </div>`
    )
    .join("");
  const dots = document.getElementById("hero-dots");
  dots.innerHTML = heroes.map((_, i) => `<button type="button" data-slide="${i}" class="${i === 0 ? "on" : ""}"></button>`).join("");
  let slide = 0;
  const go = (n) => {
    slide = (n + heroes.length) % heroes.length;
    track.style.transform = `translateX(-${slide * 100}%)`;
    dots.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === slide));
  };
  dots.addEventListener("click", (e) => {
    const b = e.target.closest("[data-slide]");
    if (b) go(Number(b.dataset.slide));
  });
  setInterval(() => go(slide + 1), 4500);

  document.getElementById("banners").innerHTML = `
    <div class="banner b1"><h3>30-min delivery</h3><p>Cut fresh near you in Chembur</p><a class="chip" href="/shop.html">Order now</a></div>
    <div class="banner b2"><h3>First order perk</h3><p>Open the app for offers</p><a class="chip" href="/download/?utm_source=website&utm_sub_source=first_order">Get app</a></div>
    <div class="banner b3"><h3>Refer &amp; earn</h3><p>Share Sabxi with friends</p><a class="chip" href="/download/?utm_source=website&utm_sub_source=refer">Invite</a></div>`;

  // Deals = biggest % off or lowest vs mrp
  const deals = all
    .map((p) => ({ p, off: SabxiUI.discount(p) }))
    .filter((x) => x.off > 0)
    .sort((a, b) => b.off - a.off)
    .slice(0, 10)
    .map((x) => x.p);
  const dealItems = deals.length ? deals : all.slice(0, 10);
  document.getElementById("deals-grid").innerHTML = dealItems.map(SabxiUI.productCard).join("");

  // Countdown to midnight IST-ish local midnight
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const tick = () => {
    const ms = Math.max(0, end - Date.now());
    const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
    const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
    const el = document.getElementById("deal-timer");
    if (el) el.textContent = `Ends in ${h}:${m}:${s}`;
  };
  tick();
  setInterval(tick, 1000);

  // Category sections
  const byCat = new Map(cats.map((c) => [c.id, { cat: c, items: [] }]));
  for (const p of all) {
    const bucket = byCat.get(p.category);
    if (bucket && bucket.items.length < 10) bucket.items.push(p);
  }
  document.getElementById("sections").innerHTML = [...byCat.values()]
    .filter((b) => b.items.length)
    .map(
      (b) => `<section class="panel">
        <div class="sec-head">
          <h2>${escape(b.cat.name)}</h2>
          <a class="meta" href="/shop.html?category=${encodeURIComponent(b.cat.id)}">View all →</a>
        </div>
        <div class="grid">${b.items.map(SabxiUI.productCard).join("")}</div>
      </section>`
    )
    .join("");

  function escape(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
