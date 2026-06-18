const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}
const initData = tg?.initData || "";
let state = { me: null, catalog: null, keys: null, tx: null, tab: "catalog" };

async function api(path) {
  const res = await fetch(path, { headers: { "X-Telegram-Init-Data": initData } });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "API hatası");
  return data;
}

function money(n) { return `$${Number(n || 0).toFixed(2)}`; }
function esc(v) { return String(v ?? "").replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function renderProfile() {
  const u = state.me?.user;
  const t = state.me?.telegram;
  const card = document.getElementById("profileCard");
  if (state.me?.banned) {
    card.innerHTML = `<div class="item"><span class="label">Durum</span><span class="value">⛔ Banlı</span></div>`;
    return;
  }
  card.innerHTML = `
    <div class="item"><span class="label">Telegram</span><span class="value">${esc(t?.first_name || t?.username || "Kullanıcı")}</span></div>
    <div class="item"><span class="label">ID</span><span class="value">${esc(t?.id)}</span></div>
    <div class="item"><span class="label">Rol</span><span class="value">${esc(u?.role || "kayıtsız")}</span></div>
    <div class="item"><span class="label">Bakiye</span><span class="value">${money(u?.balance)}</span></div>
  `;
}

function renderCatalog() {
  const products = state.catalog?.products || [];
  if (!products.length) return `<div class="empty">Aktif ürün yok.</div>`;
  return `<div class="grid">${products.map(p => `
    <article class="card product">
      <h3>${esc(p.name)}</h3>
      <div class="meta">📦 ${esc(p.category_name)}<br>⏳ ${esc(p.duration_days)} gün<br><span class="stock ${p.stock > 0 ? 'ok' : 'warn'}">🔑 Stok: ${esc(p.stock)}</span></div>
      <div class="price">${money(p.base_price)}</div>
    </article>`).join("")}</div>`;
}

function renderKeys() {
  const keys = state.keys?.keys || [];
  if (!keys.length) return `<div class="empty">Henüz satın aldığın key yok.</div>`;
  return `<div class="grid">${keys.map(k => `
    <article class="card key">
      <h3>${esc(k.product_name)}</h3>
      <p class="code">${esc(k.key_value)}</p>
      <div class="meta">Durum: ${esc(k.status)}<br>Bitiş: ${esc(k.expires_at || '-')}<br>Reset: ${esc(k.reset_count)}/${esc(k.max_resets)}</div>
    </article>`).join("")}</div>`;
}

function renderTx() {
  const rows = state.tx?.transactions || [];
  if (!rows.length) return `<div class="empty">İşlem geçmişi boş.</div>`;
  return `<div class="grid">${rows.map(x => `
    <article class="card tx">
      <h3>#${esc(x.id)} · ${esc(x.type)}</h3>
      <div class="price">${money(x.amount)}</div>
      <div class="meta">${esc(x.created_at)}<br>${esc(x.note || '')}</div>
    </article>`).join("")}</div>`;
}

async function load(tab = state.tab) {
  document.getElementById("status").textContent = "Yükleniyor...";
  try {
    state.me = await api("/api/me");
    if (tab === "catalog" && !state.catalog) state.catalog = await api("/api/catalog");
    if (tab === "keys" && !state.keys) state.keys = await api("/api/my-keys");
    if (tab === "tx" && !state.tx) state.tx = await api("/api/transactions");
    state.tab = tab;
    renderProfile();
    document.getElementById("content").innerHTML = tab === "catalog" ? renderCatalog() : tab === "keys" ? renderKeys() : renderTx();
    document.getElementById("status").textContent = "Hazır";
  } catch (err) {
    document.getElementById("status").textContent = err.message;
    document.getElementById("content").innerHTML = `<div class="empty">${esc(err.message)}<br><br>MiniApp Telegram içinden açılmalıdır.</div>`;
  }
}

document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  load(btn.dataset.tab);
}));
document.getElementById("refreshBtn").addEventListener("click", () => {
  state.catalog = state.keys = state.tx = null;
  load(state.tab);
});
load();
