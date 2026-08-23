/** OTP login */
(async function loginPage() {
  const mount = document.getElementById("app");
  if (!mount) return;

  const existing = SabxiApi.auth();
  mount.innerHTML =
    SabxiUI.shellHtml({ active: "account" }) +
    `<main class="wrap">
      <section class="panel auth-box" id="auth-box"></section>
    </main>` +
    SabxiUI.footerHtml();

  SabxiUI.renderShellChrome();
  try {
    await SabxiUI.fillCategoryNav(await SabxiApi.categories());
  } catch {}

  const box = document.getElementById("auth-box");

  function loggedInView() {
    const a = SabxiApi.auth();
    const c = a?.customer || {};
    box.innerHTML = `
      <h2 style="margin-bottom:8px">Your account</h2>
      <p class="hint">Signed in as <strong>${c.mobile || "customer"}</strong></p>
      <a class="btn block" href="/orders.html" style="margin-bottom:8px">Order history</a>
      <a class="btn ghost block" href="/cart.html" style="margin-bottom:8px">Go to cart</a>
      <a class="btn ghost block" href="/checkout.html" style="margin-bottom:8px">Checkout</a>
      <a class="btn ghost block" href="${SabxiApi.downloadUrl({
        sub: "account",
      })}" style="margin-bottom:8px">Open full app</a>
      <button class="btn ghost block" type="button" id="logout">Log out</button>`;
    box.querySelector("#logout").onclick = () => {
      SabxiApi.setAuth(null);
      SabxiUI.toast("Logged out");
      location.reload();
    };
  }

  function loginView() {
    box.innerHTML = `
      <h2 style="margin-bottom:8px">Login</h2>
      <p class="hint">Same OTP login as the Sabxi customer app. Use 9999999999 / 9999 for demo.</p>
      <label for="mobile">Mobile</label>
      <input id="mobile" inputmode="numeric" maxlength="10" placeholder="10-digit mobile" />
      <div id="otp-wrap" hidden>
        <label for="otp">OTP</label>
        <input id="otp" inputmode="numeric" maxlength="6" placeholder="4–6 digit OTP" />
      </div>
      <button class="btn block" type="button" id="auth-go">Send OTP</button>
      <p class="hint" id="auth-msg" style="margin-top:12px"></p>`;

    let step = "otp";
    const msg = () => document.getElementById("auth-msg");
    document.getElementById("auth-go").onclick = async () => {
      const mobile = document.getElementById("mobile").value.replace(/\D/g, "");
      const btn = document.getElementById("auth-go");
      try {
        if (step === "otp") {
          if (mobile.length !== 10) throw new Error("Enter a valid 10-digit mobile");
          btn.disabled = true;
          btn.textContent = "Sending…";
          await SabxiApi.requestOtp(mobile);
          document.getElementById("otp-wrap").hidden = false;
          step = "verify";
          btn.textContent = "Verify & login";
          msg().textContent = "OTP sent on WhatsApp.";
        } else {
          const otp = document.getElementById("otp").value.trim();
          if (!otp) throw new Error("Enter OTP");
          btn.disabled = true;
          btn.textContent = "Verifying…";
          await SabxiApi.verifyOtp(mobile, otp);
          SabxiUI.toast("Logged in");
          const next = sessionStorage.getItem("sabxi_post_login") || "/cart.html";
          sessionStorage.removeItem("sabxi_post_login");
          // sync cart if any
          const items = SabxiCart.read();
          if (items.length) {
            try {
              await SabxiApi.saveCart(items);
            } catch {}
          }
          location.href = next;
          return;
        }
      } catch (e) {
        msg().textContent = e.message || "Failed";
      } finally {
        btn.disabled = false;
        if (step === "otp") btn.textContent = "Send OTP";
        else if (document.getElementById("auth-go"))
          document.getElementById("auth-go").textContent = "Verify & login";
      }
    };
  }

  if (existing?.access_token) loggedInView();
  else loginView();
})();
