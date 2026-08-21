/** SABXI public API client */
window.SabxiApi = (() => {
  const BASE = "https://api.sabxi.com/api/v1";
  const STUDIO_KEY = "sabxi_studio";
  const AUTH_KEY = "sabxi_auth";
  const DEFAULT_STUDIO = {
    id: "33cead22-2a6e-4399-92ff-01bec5f642c7",
    name: "Chembur Studio",
    eta_mins: 15,
    pincode: "400071",
  };

  function auth() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    } catch {
      return null;
    }
  }

  function setAuth(data) {
    if (!data) localStorage.removeItem(AUTH_KEY);
    else localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  }

  function token() {
    return auth()?.access_token || null;
  }

  function studio() {
    try {
      return JSON.parse(localStorage.getItem(STUDIO_KEY) || "null") || DEFAULT_STUDIO;
    } catch {
      return DEFAULT_STUDIO;
    }
  }

  function setStudio(s) {
    localStorage.setItem(STUDIO_KEY, JSON.stringify(s));
  }

  async function request(path, opts = {}) {
    const headers = {
      Accept: "application/json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers || {}),
    };
    const t = token();
    if (t && !opts.noAuth) headers.Authorization = `Bearer ${t}`;
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (!res.ok) {
      const msg =
        json?.message ||
        json?.detail ||
        json?.errors?.[0]?.message ||
        `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.payload = json;
      throw err;
    }
    return json;
  }

  let snapshotPromise = null;
  function loadSnapshot() {
    if (!snapshotPromise) {
      snapshotPromise = fetch("/data/catalog.json")
        .then((r) => r.json())
        .catch(() => null);
    }
    return snapshotPromise;
  }

  async function categories() {
    try {
      const r = await request("/customer/categories?page=1&page_size=50", {
        noAuth: true,
      });
      return r.data || [];
    } catch {
      const snap = await loadSnapshot();
      return snap?.categories || [];
    }
  }

  async function products({ page = 1, pageSize = 100, category, search, studioId } = {}) {
    const q = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (category) q.set("category", category);
    if (search) q.set("search", search);
    if (studioId) q.set("studio_id", studioId);
    try {
      const r = await request(`/customer/products?${q}`, { noAuth: !token() });
      return { items: r.data || [], meta: r.meta || {} };
    } catch {
      const snap = await loadSnapshot();
      let items = snap?.products || [];
      if (category) items = items.filter((p) => p.category === category);
      if (search) {
        const s = search.toLowerCase();
        items = items.filter((p) => (p.name || "").toLowerCase().includes(s));
      }
      const start = (page - 1) * pageSize;
      const slice = items.slice(start, start + pageSize);
      return {
        items: slice,
        meta: { page, page_size: pageSize, total: items.length },
      };
    }
  }

  async function product(id) {
    try {
      const r = await request(`/customer/products/${encodeURIComponent(id)}`, {
        noAuth: !token(),
      });
      return r.data;
    } catch {
      const snap = await loadSnapshot();
      const hit = (snap?.products || []).find(
        (p) => p.product_id === id || p.sku_id === id
      );
      if (!hit) throw new Error("Product not found");
      return hit;
    }
  }

  async function resolveStudio(latitude, longitude) {
    const q = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });
    const r = await request(`/locations/customer/studio?${q}`, { noAuth: true });
    const s = r.data?.studio;
    if (s?.id) {
      const next = {
        id: s.id,
        name: s.name,
        eta_mins: s.eta_mins,
        pincode: s.pincode,
        address: s.address,
        is_online: s.is_online,
        serviceable: !!r.data.serviceable,
      };
      setStudio(next);
      return next;
    }
    return studio();
  }

  async function requestOtp(mobile, country_code = "+91") {
    return request("/users/customers/auth/otp", {
      method: "POST",
      body: { mobile, country_code },
      noAuth: true,
    });
  }

  async function verifyOtp(mobile, otp, country_code = "+91") {
    const r = await request("/users/customers/auth/verify", {
      method: "POST",
      body: { mobile, country_code, otp },
      noAuth: true,
    });
    const data = r.data || {};
    setAuth({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      customer: data.customer || data.user || { mobile, country_code },
    });
    return data;
  }

  async function quote(items) {
    const s = studio();
    return request("/customer/cart/quote", {
      method: "POST",
      body: {
        studio_id: s.id,
        fulfillment_type: "delivery",
        items: items.map((i) => ({
          product_sku_id: i.sku_id,
          quantity: i.qty,
        })),
      },
    });
  }

  async function saveCart(items) {
    return request("/customer/cart", {
      method: "PUT",
      body: {
        items: items.map((i) => ({
          product: {
            product_id: i.product_id,
            sku_id: i.sku_id,
            name: i.name,
            price: i.price,
            images: i.images,
          },
          quantity: i.qty,
        })),
      },
    });
  }

  async function getCart() {
    return request("/customer/cart");
  }

  function downloadUrl(extra = {}) {
    const q = new URLSearchParams({
      utm_source: "website",
      utm_sub_source: extra.sub || "store",
      ...extra.params,
    });
    return `/download/?${q}`;
  }

  return {
    BASE,
    DEFAULT_STUDIO,
    auth,
    setAuth,
    token,
    studio,
    setStudio,
    categories,
    products,
    product,
    resolveStudio,
    requestOtp,
    verifyOtp,
    quote,
    saveCart,
    getCart,
    downloadUrl,
  };
})();
