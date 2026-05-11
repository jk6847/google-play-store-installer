(function () {
  const STORE_KEY = "procurement-demo-v1";
  const SESSION_KEY = "procurement-demo-session";
  const ADMIN_PIN = "246810";

  const images = {
    apple: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80",
    rice: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=900&q=80",
    shrimp: "https://images.unsplash.com/photo-1504309250229-4f08315f3b5c?auto=format&fit=crop&w=900&q=80",
    tea: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=900&q=80"
  };

  const seed = {
    settings: {
      title: "集采运营中心",
      announcement: "今日主推：冷链海鲜、产地水果、米面粮油。",
      manualSales: 128600,
      manualActiveUsers: 486,
      servicePhone: "400-800-1024"
    },
    products: [
      {
        id: "p-apple",
        name: "产地直采红富士",
        category: "水果",
        price: 39.8,
        unit: "箱",
        stock: 260,
        sold: 1850,
        image: images.apple,
        status: "active"
      },
      {
        id: "p-rice",
        name: "东北长粒香大米",
        category: "粮油",
        price: 68,
        unit: "袋",
        stock: 180,
        sold: 934,
        image: images.rice,
        status: "active"
      },
      {
        id: "p-shrimp",
        name: "冷链鲜冻白虾",
        category: "生鲜",
        price: 99,
        unit: "盒",
        stock: 120,
        sold: 568,
        image: images.shrimp,
        status: "active"
      },
      {
        id: "p-tea",
        name: "高山云雾绿茶",
        category: "茶饮",
        price: 128,
        unit: "罐",
        stock: 80,
        sold: 241,
        image: images.tea,
        status: "active"
      }
    ],
    groupBuys: [
      { id: "g-1", productId: "p-rice", targetQty: 500, joinedQty: 318, deadline: "2026-05-18", status: "open" },
      { id: "g-2", productId: "p-shrimp", targetQty: 300, joinedQty: 196, deadline: "2026-05-16", status: "open" },
      { id: "g-3", productId: "p-apple", targetQty: 600, joinedQty: 522, deadline: "2026-05-20", status: "open" }
    ],
    users: [
      {
        id: "u-demo",
        phone: "13800000001",
        name: "演示用户",
        password: "123456",
        inviteCode: "A1001",
        parentInvite: "",
        balance: 286.5,
        teamCount: 12,
        teamVolume: 54890,
        addresses: ["上海市浦东新区世纪大道 100 号"]
      }
    ],
    orders: [
      {
        id: "O20260511001",
        userId: "u-demo",
        productId: "p-apple",
        qty: 3,
        total: 119.4,
        address: "上海市浦东新区世纪大道 100 号",
        status: "待发货",
        createdAt: "2026-05-11 09:30"
      }
    ],
    withdrawals: []
  };

  let state = {
    data: loadData(),
    session: loadSession(),
    toast: "",
    drawer: null
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadData() {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      localStorage.setItem(STORE_KEY, JSON.stringify(seed));
      return clone(seed);
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      localStorage.setItem(STORE_KEY, JSON.stringify(seed));
      return clone(seed);
    }
  }

  function saveData() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.data));
  }

  function loadSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveSession() {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
  }

  function money(value) {
    return Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function nowText() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function currentUser() {
    return state.data.users.find((user) => user.id === state.session.userId) || null;
  }

  function activeProducts() {
    return state.data.products.filter((product) => product.status === "active");
  }

  function getProduct(id) {
    return state.data.products.find((product) => product.id === id);
  }

  function getRoute() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (!hash) return state.session.userId ? "home" : "login";
    return hash;
  }

  function go(route) {
    window.location.hash = `#/${route}`;
  }

  function toast(message) {
    state.toast = message;
    render();
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => {
      state.toast = "";
      render();
    }, 1800);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function serializeForm(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function parseQuery(route) {
    const [, query = ""] = route.split("?");
    return Object.fromEntries(new URLSearchParams(query).entries());
  }

  function requireUser(route) {
    if (route.startsWith("admin") && state.session.role === "admin") {
      return true;
    }
    if (route.startsWith("admin") && route !== "admin-login") {
      go("admin-login");
      return false;
    }
    if (!state.session.userId && !["login", "register", "admin-login"].includes(route.split("?")[0])) {
      go("login");
      return false;
    }
    return true;
  }

  function layout(content, active = "home") {
    const user = currentUser();
    return `
      <main class="shell">
        <header class="topbar">
          <div class="brand">
            <div class="brand-mark">采</div>
            <h1 class="brand-name">${escapeHtml(state.data.settings.title)}</h1>
          </div>
          <div class="top-actions">
            ${user ? `<span class="muted tiny">${escapeHtml(user.name)}</span>` : ""}
            <button class="ghost" data-action="open-admin">后台</button>
          </div>
        </header>
        ${content}
        <nav class="tabs">
          <a class="tab ${active === "home" ? "active" : ""}" href="#/home">首页</a>
          <a class="tab ${active === "team" ? "active" : ""}" href="#/team">团队采购</a>
          <a class="tab ${active === "me" ? "active" : ""}" href="#/me">我的</a>
        </nav>
      </main>
    `;
  }

  function authPage(mode) {
    const isRegister = mode === "register";
    return `
      <main class="auth-page">
        <section class="auth-panel">
          <div class="brand">
            <div class="brand-mark">采</div>
            <h1 class="brand-name">${escapeHtml(state.data.settings.title)}</h1>
          </div>
          <h2 class="auth-title">${isRegister ? "注册账户" : "登录"}</h2>
          <p class="muted">${isRegister ? "创建会员账户后可提交采购单。" : "演示账号：13800000001 / 123456"}</p>
          <form class="form" data-form="${isRegister ? "register" : "login"}">
            <div class="field">
              <label>手机号</label>
              <input name="phone" type="tel" maxlength="11" required placeholder="请输入手机号" />
            </div>
            ${isRegister ? `
              <div class="field">
                <label>姓名</label>
                <input name="name" required placeholder="请输入姓名" />
              </div>
            ` : ""}
            <div class="field">
              <label>密码</label>
              <input name="password" type="password" minlength="6" maxlength="16" required placeholder="请输入密码" />
            </div>
            ${isRegister ? `
              <div class="field">
                <label>邀请码</label>
                <input name="parentInvite" maxlength="12" placeholder="可选" />
              </div>
            ` : ""}
            <button class="primary full" type="submit">${isRegister ? "立即注册" : "登录"}</button>
          </form>
          <div class="auth-switch">
            <button class="link-button" data-action="${isRegister ? "to-login" : "to-register"}">${isRegister ? "返回登录" : "去注册"}</button>
            <button class="link-button" data-action="open-admin">后台入口</button>
          </div>
        </section>
      </main>
    `;
  }

  function homePage() {
    const orderTotal = state.data.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const products = activeProducts().map(productCard).join("");
    return layout(`
      <section class="page">
        <div class="band tint">
          <div class="notice">
            <div>
              <strong>${escapeHtml(state.data.settings.announcement)}</strong>
              <span class="muted">服务电话 ${escapeHtml(state.data.settings.servicePhone)}</span>
            </div>
            <button class="secondary" data-action="open-admin">管理</button>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat"><span class="muted">平台销售额</span><b>¥${money(state.data.settings.manualSales + orderTotal)}</b></div>
          <div class="stat"><span class="muted">活跃会员</span><b>${state.data.settings.manualActiveUsers}</b></div>
          <div class="stat"><span class="muted">上架商品</span><b>${activeProducts().length}</b></div>
          <div class="stat"><span class="muted">待处理订单</span><b>${state.data.orders.filter((order) => order.status !== "已完成").length}</b></div>
        </div>
        <div class="section-title" style="margin-top:18px">
          <h2>精选采购</h2>
          <span class="muted tiny">库存和价格由后台维护</span>
        </div>
        <div class="grid product-grid">${products || `<div class="empty">暂无商品</div>`}</div>
      </section>
    `, "home");
  }

  function productCard(product) {
    return `
      <article class="product-card">
        <img class="product-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />
        <div class="product-body">
          <div class="product-name">
            <h3>${escapeHtml(product.name)}</h3>
            <span class="price">¥${money(product.price)}</span>
          </div>
          <div class="meta-line">
            <span>${escapeHtml(product.category)}</span>
            <span>库存 ${product.stock}${escapeHtml(product.unit)}</span>
            <span>已售 ${product.sold}</span>
          </div>
          <button class="primary full" data-action="buy" data-id="${product.id}">采购</button>
        </div>
      </article>
    `;
  }

  function teamPage() {
    const rows = state.data.groupBuys.map((item) => {
      const product = getProduct(item.productId);
      if (!product) return "";
      const percent = Math.min(100, Math.round((item.joinedQty / item.targetQty) * 100));
      return `
        <article class="row-card">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />
          <div>
            <h3>${escapeHtml(product.name)}</h3>
            <p class="muted">目标 ${item.targetQty}${escapeHtml(product.unit)}，已拼 ${item.joinedQty}${escapeHtml(product.unit)}</p>
            <div class="progress" style="--value:${percent}%"><i></i></div>
            <div class="meta-line"><span class="tag amber">${percent}%</span><span>截止 ${escapeHtml(item.deadline)}</span></div>
          </div>
          <div class="inline-actions">
            <button class="secondary" data-action="buy" data-id="${product.id}">加入</button>
          </div>
        </article>
      `;
    }).join("");
    const user = currentUser();
    return layout(`
      <section class="page">
        <div class="band">
          <div class="profile-head">
            <div>
              <h2>团队采购</h2>
              <p class="muted">团队人数 ${user.teamCount}，累计采购 ¥${money(user.teamVolume)}</p>
            </div>
            <button class="secondary" data-action="copy-invite">邀请码 ${escapeHtml(user.inviteCode)}</button>
          </div>
        </div>
        <div class="list">${rows}</div>
      </section>
    `, "team");
  }

  function mePage() {
    const user = currentUser();
    const orders = state.data.orders
      .filter((order) => order.userId === user.id)
      .slice()
      .reverse()
      .map((order) => {
        const product = getProduct(order.productId);
        return `
          <div class="list-item">
            <div>
              <strong>${escapeHtml(product ? product.name : "商品已下架")}</strong>
              <span class="muted tiny">${escapeHtml(order.createdAt)} · ${order.qty} 件 · ¥${money(order.total)}</span>
            </div>
            <span class="tag ${order.status === "已完成" ? "" : "amber"}">${escapeHtml(order.status)}</span>
          </div>
        `;
      }).join("");

    const addresses = user.addresses.map((address, index) => `
      <div class="list-item">
        <span>${escapeHtml(address)}</span>
        <button class="ghost" data-action="delete-address" data-index="${index}">删除</button>
      </div>
    `).join("");

    return layout(`
      <section class="page">
        <div class="band tint">
          <div class="profile-head">
            <div>
              <h2>${escapeHtml(user.name)}</h2>
              <p class="muted">${escapeHtml(user.phone)} · 邀请码 ${escapeHtml(user.inviteCode)}</p>
            </div>
            <button class="ghost" data-action="logout">退出</button>
          </div>
          <div class="balance">¥${money(user.balance)}</div>
        </div>
        <div class="split">
          <section>
            <div class="section-title">
              <h3>收货地址</h3>
              <button class="secondary" data-action="add-address">新增</button>
            </div>
            <div class="list">${addresses || `<div class="empty">暂无地址</div>`}</div>
          </section>
          <section>
            <div class="section-title">
              <h3>资金操作</h3>
              <button class="primary" data-action="withdraw">提现</button>
            </div>
            <div class="list-item">
              <div><strong>可用余额</strong><span class="muted tiny">后台确认后可变更</span></div>
              <span>¥${money(user.balance)}</span>
            </div>
          </section>
        </div>
        <div class="section-title" style="margin-top:18px">
          <h3>采购订单</h3>
        </div>
        <div class="list">${orders || `<div class="empty">暂无订单</div>`}</div>
      </section>
    `, "me");
  }

  function adminLoginPage() {
    return `
      <main class="auth-page">
        <section class="auth-panel">
          <h1 class="auth-title">后台登录</h1>
          <p class="muted">演示 PIN：${ADMIN_PIN}</p>
          <form class="form" data-form="admin-login">
            <div class="field">
              <label>PIN</label>
              <input name="pin" type="password" required placeholder="请输入后台 PIN" />
            </div>
            <button class="primary full" type="submit">进入后台</button>
          </form>
          <div class="auth-switch">
            <button class="link-button" data-action="to-login">返回前台</button>
          </div>
        </section>
      </main>
    `;
  }

  function adminLayout(content, active) {
    if (state.session.role !== "admin") return adminLoginPage();
    const nav = [
      ["admin", "数据总览"],
      ["admin-products", "商品维护"],
      ["admin-orders", "订单处理"],
      ["admin-users", "会员数据"]
    ];
    return `
      <main class="admin-shell">
        <aside class="side">
          <h1>${escapeHtml(state.data.settings.title)}</h1>
          ${nav.map(([route, label]) => `<a class="${active === route ? "active" : ""}" href="#/${route}">${label}</a>`).join("")}
          <button data-action="leave-admin">返回前台</button>
          <button data-action="admin-logout">退出后台</button>
        </aside>
        <section class="admin-main">${content}</section>
      </main>
    `;
  }

  function adminDashboard() {
    const orderTotal = state.data.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return adminLayout(`
      <div class="admin-head">
        <h2>数据总览</h2>
        <button class="secondary" data-action="reset-demo">重置演示数据</button>
      </div>
      <div class="stats-grid">
        <div class="stat"><span class="muted">自动订单额</span><b>¥${money(orderTotal)}</b></div>
        <div class="stat"><span class="muted">人工销售基数</span><b>¥${money(state.data.settings.manualSales)}</b></div>
        <div class="stat"><span class="muted">会员数</span><b>${state.data.users.length}</b></div>
        <div class="stat"><span class="muted">待发货</span><b>${state.data.orders.filter((order) => order.status === "待发货").length}</b></div>
      </div>
      <div class="split" style="margin-top:16px">
        <section class="panel" style="padding:16px">
          <div class="section-title"><h3>站点设置</h3></div>
          <form class="form" data-form="settings">
            <div class="field"><label>站点名称</label><input name="title" value="${escapeHtml(state.data.settings.title)}" /></div>
            <div class="field"><label>公告</label><textarea name="announcement">${escapeHtml(state.data.settings.announcement)}</textarea></div>
            <div class="field"><label>服务电话</label><input name="servicePhone" value="${escapeHtml(state.data.settings.servicePhone)}" /></div>
            <button class="primary" type="submit">保存</button>
          </form>
        </section>
        <section class="panel" style="padding:16px">
          <div class="section-title"><h3>人工统计修正</h3></div>
          <form class="form" data-form="manual-stats">
            <div class="field"><label>销售基数</label><input name="manualSales" type="number" min="0" step="0.01" value="${state.data.settings.manualSales}" /></div>
            <div class="field"><label>活跃会员数</label><input name="manualActiveUsers" type="number" min="0" step="1" value="${state.data.settings.manualActiveUsers}" /></div>
            <button class="primary" type="submit">更新</button>
          </form>
        </section>
      </div>
    `, "admin");
  }

  function adminProducts() {
    const rows = state.data.products.map((product) => `
      <tr>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.category)}</td>
        <td>¥${money(product.price)}</td>
        <td>${product.stock}${escapeHtml(product.unit)}</td>
        <td><span class="tag ${product.status === "active" ? "" : "red"}">${product.status === "active" ? "上架" : "下架"}</span></td>
        <td>
          <div class="inline-actions">
            <button class="ghost" data-action="edit-product" data-id="${product.id}">编辑</button>
            <button class="secondary" data-action="toggle-product" data-id="${product.id}">${product.status === "active" ? "下架" : "上架"}</button>
          </div>
        </td>
      </tr>
    `).join("");
    return adminLayout(`
      <div class="admin-head">
        <h2>商品维护</h2>
        <button class="primary" data-action="new-product">新增商品</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>商品</th><th>分类</th><th>价格</th><th>库存</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `, "admin-products");
  }

  function adminOrders() {
    const rows = state.data.orders.slice().reverse().map((order) => {
      const user = state.data.users.find((item) => item.id === order.userId);
      const product = getProduct(order.productId);
      return `
        <tr>
          <td>${escapeHtml(order.id)}</td>
          <td>${escapeHtml(user ? user.name : "未知会员")}</td>
          <td>${escapeHtml(product ? product.name : "商品已下架")}</td>
          <td>${order.qty}</td>
          <td>¥${money(order.total)}</td>
          <td><span class="tag ${order.status === "已完成" ? "" : "amber"}">${escapeHtml(order.status)}</span></td>
          <td>
            <div class="inline-actions">
              <button class="ghost" data-action="order-status" data-id="${order.id}" data-status="待发货">待发货</button>
              <button class="secondary" data-action="order-status" data-id="${order.id}" data-status="已发货">发货</button>
              <button class="primary" data-action="order-status" data-id="${order.id}" data-status="已完成">完成</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
    return adminLayout(`
      <div class="admin-head"><h2>订单处理</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>订单号</th><th>会员</th><th>商品</th><th>数量</th><th>金额</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>${rows || `<tr><td colspan="7" class="empty">暂无订单</td></tr>`}</tbody>
        </table>
      </div>
    `, "admin-orders");
  }

  function adminUsers() {
    const rows = state.data.users.map((user) => `
      <tr>
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.phone)}</td>
        <td>${escapeHtml(user.inviteCode)}</td>
        <td>¥${money(user.balance)}</td>
        <td>${user.teamCount}</td>
        <td>¥${money(user.teamVolume)}</td>
        <td><button class="ghost" data-action="edit-user" data-id="${user.id}">调整</button></td>
      </tr>
    `).join("");
    return adminLayout(`
      <div class="admin-head"><h2>会员数据</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>姓名</th><th>手机号</th><th>邀请码</th><th>余额</th><th>团队人数</th><th>团队采购额</th><th>操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `, "admin-users");
  }

  function drawerHtml() {
    if (!state.drawer) return "";
    const { type, id } = state.drawer;
    if (type === "buy") {
      const product = getProduct(id);
      const user = currentUser();
      if (!product || !user) return "";
      return `
        <div class="drawer" data-action="close-drawer">
          <section class="drawer-panel" data-stop>
            <div class="drawer-head"><h2>提交采购</h2><button class="ghost" data-action="close-drawer">关闭</button></div>
            <form class="form" data-form="buy" data-id="${product.id}">
              <img class="product-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />
              <div class="section-title"><h3>${escapeHtml(product.name)}</h3><span class="price">¥${money(product.price)}</span></div>
              <div class="split">
                <div class="field"><label>数量</label><input name="qty" type="number" min="1" max="${product.stock}" value="1" required /></div>
                <div class="field"><label>收货地址</label><select name="address">${user.addresses.map((address) => `<option>${escapeHtml(address)}</option>`).join("")}</select></div>
              </div>
              <div class="field"><label>备注</label><textarea name="note" placeholder="可选"></textarea></div>
              <button class="primary full" type="submit">提交订单</button>
            </form>
          </section>
        </div>
      `;
    }
    if (type === "address") {
      return `
        <div class="drawer" data-action="close-drawer">
          <section class="drawer-panel" data-stop>
            <div class="drawer-head"><h2>新增地址</h2><button class="ghost" data-action="close-drawer">关闭</button></div>
            <form class="form" data-form="address">
              <div class="field"><label>收货地址</label><textarea name="address" required placeholder="请输入详细地址"></textarea></div>
              <button class="primary full" type="submit">保存</button>
            </form>
          </section>
        </div>
      `;
    }
    if (type === "withdraw") {
      const user = currentUser();
      return `
        <div class="drawer" data-action="close-drawer">
          <section class="drawer-panel" data-stop>
            <div class="drawer-head"><h2>申请提现</h2><button class="ghost" data-action="close-drawer">关闭</button></div>
            <form class="form" data-form="withdraw">
              <div class="field"><label>金额</label><input name="amount" type="number" min="1" max="${user.balance}" step="0.01" required /></div>
              <div class="field"><label>收款账户</label><input name="account" required placeholder="银行卡或支付宝账号" /></div>
              <button class="primary full" type="submit">提交申请</button>
            </form>
          </section>
        </div>
      `;
    }
    if (type === "product") {
      const product = id ? getProduct(id) : null;
      return `
        <div class="drawer" data-action="close-drawer">
          <section class="drawer-panel" data-stop>
            <div class="drawer-head"><h2>${product ? "编辑商品" : "新增商品"}</h2><button class="ghost" data-action="close-drawer">关闭</button></div>
            <form class="form" data-form="product" data-id="${product ? product.id : ""}">
              <div class="field"><label>商品名称</label><input name="name" required value="${escapeHtml(product ? product.name : "")}" /></div>
              <div class="split">
                <div class="field"><label>分类</label><input name="category" required value="${escapeHtml(product ? product.category : "")}" /></div>
                <div class="field"><label>单位</label><input name="unit" required value="${escapeHtml(product ? product.unit : "件")}" /></div>
              </div>
              <div class="split">
                <div class="field"><label>价格</label><input name="price" type="number" min="0" step="0.01" required value="${product ? product.price : ""}" /></div>
                <div class="field"><label>库存</label><input name="stock" type="number" min="0" step="1" required value="${product ? product.stock : ""}" /></div>
              </div>
              <div class="field"><label>图片地址</label><input name="image" required value="${escapeHtml(product ? product.image : images.apple)}" /></div>
              <button class="primary full" type="submit">保存</button>
            </form>
          </section>
        </div>
      `;
    }
    if (type === "user") {
      const user = state.data.users.find((item) => item.id === id);
      if (!user) return "";
      return `
        <div class="drawer" data-action="close-drawer">
          <section class="drawer-panel" data-stop>
            <div class="drawer-head"><h2>调整会员</h2><button class="ghost" data-action="close-drawer">关闭</button></div>
            <form class="form" data-form="user" data-id="${user.id}">
              <div class="field"><label>姓名</label><input name="name" required value="${escapeHtml(user.name)}" /></div>
              <div class="split">
                <div class="field"><label>余额</label><input name="balance" type="number" step="0.01" value="${user.balance}" /></div>
                <div class="field"><label>团队人数</label><input name="teamCount" type="number" step="1" value="${user.teamCount}" /></div>
              </div>
              <div class="field"><label>团队采购额</label><input name="teamVolume" type="number" step="0.01" value="${user.teamVolume}" /></div>
              <button class="primary full" type="submit">保存</button>
            </form>
          </section>
        </div>
      `;
    }
    return "";
  }

  function render() {
    const route = getRoute();
    const page = route.split("?")[0];
    if (!requireUser(page)) return;

    let html = "";
    if (page === "login") html = authPage("login");
    else if (page === "register") html = authPage("register");
    else if (page === "home") html = homePage();
    else if (page === "team") html = teamPage();
    else if (page === "me") html = mePage();
    else if (page === "admin-login") html = adminLoginPage();
    else if (page === "admin") html = adminDashboard();
    else if (page === "admin-products") html = adminProducts();
    else if (page === "admin-orders") html = adminOrders();
    else if (page === "admin-users") html = adminUsers();
    else html = state.session.userId ? homePage() : authPage("login");

    document.getElementById("app").innerHTML = `
      ${html}
      ${drawerHtml()}
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
    `;
  }

  function handleLogin(form) {
    const values = serializeForm(form);
    const user = state.data.users.find((item) => item.phone === values.phone && item.password === values.password);
    if (!user) {
      toast("账号或密码不正确");
      return;
    }
    state.session = { userId: user.id, role: "user" };
    saveSession();
    go("home");
  }

  function handleRegister(form) {
    const values = serializeForm(form);
    if (!/^1\d{10}$/.test(values.phone)) {
      toast("手机号格式不正确");
      return;
    }
    if (state.data.users.some((user) => user.phone === values.phone)) {
      toast("手机号已注册");
      return;
    }
    const id = `u-${Date.now()}`;
    state.data.users.push({
      id,
      phone: values.phone,
      name: values.name,
      password: values.password,
      inviteCode: `A${Math.floor(1000 + Math.random() * 9000)}`,
      parentInvite: values.parentInvite || "",
      balance: 0,
      teamCount: 0,
      teamVolume: 0,
      addresses: []
    });
    saveData();
    toast("注册成功");
    go("login");
  }

  function handleBuy(form) {
    const user = currentUser();
    const values = serializeForm(form);
    const product = getProduct(form.dataset.id);
    const qty = Math.max(1, Number(values.qty || 1));
    if (!product || !user) return;
    if (!values.address) {
      toast("请先添加收货地址");
      return;
    }
    if (qty > product.stock) {
      toast("库存不足");
      return;
    }
    product.stock -= qty;
    product.sold += qty;
    const total = Number((product.price * qty).toFixed(2));
    state.data.orders.push({
      id: `O${Date.now()}`,
      userId: user.id,
      productId: product.id,
      qty,
      total,
      address: values.address,
      status: "待发货",
      createdAt: nowText()
    });
    const group = state.data.groupBuys.find((item) => item.productId === product.id);
    if (group) group.joinedQty += qty;
    user.teamVolume += total;
    saveData();
    state.drawer = null;
    toast("订单已提交");
    render();
  }

  function handleSettings(form) {
    const values = serializeForm(form);
    state.data.settings.title = values.title;
    state.data.settings.announcement = values.announcement;
    state.data.settings.servicePhone = values.servicePhone;
    saveData();
    toast("站点设置已保存");
    render();
  }

  function handleManualStats(form) {
    const values = serializeForm(form);
    state.data.settings.manualSales = Number(values.manualSales || 0);
    state.data.settings.manualActiveUsers = Number(values.manualActiveUsers || 0);
    saveData();
    toast("统计已更新");
    render();
  }

  function handleProduct(form) {
    const values = serializeForm(form);
    const id = form.dataset.id;
    if (id) {
      const product = getProduct(id);
      Object.assign(product, {
        name: values.name,
        category: values.category,
        unit: values.unit,
        price: Number(values.price || 0),
        stock: Number(values.stock || 0),
        image: values.image
      });
    } else {
      state.data.products.push({
        id: `p-${Date.now()}`,
        name: values.name,
        category: values.category,
        unit: values.unit,
        price: Number(values.price || 0),
        stock: Number(values.stock || 0),
        sold: 0,
        image: values.image,
        status: "active"
      });
    }
    saveData();
    state.drawer = null;
    toast("商品已保存");
    render();
  }

  function handleUser(form) {
    const user = state.data.users.find((item) => item.id === form.dataset.id);
    if (!user) return;
    const values = serializeForm(form);
    user.name = values.name;
    user.balance = Number(values.balance || 0);
    user.teamCount = Number(values.teamCount || 0);
    user.teamVolume = Number(values.teamVolume || 0);
    saveData();
    state.drawer = null;
    toast("会员数据已保存");
    render();
  }

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    const name = form.dataset.form;
    if (name === "login") handleLogin(form);
    if (name === "register") handleRegister(form);
    if (name === "admin-login") {
      const values = serializeForm(form);
      if (values.pin !== ADMIN_PIN) return toast("PIN 不正确");
      state.session = { ...state.session, role: "admin" };
      saveSession();
      go("admin");
    }
    if (name === "buy") handleBuy(form);
    if (name === "address") {
      const user = currentUser();
      const values = serializeForm(form);
      user.addresses.push(values.address);
      saveData();
      state.drawer = null;
      toast("地址已保存");
      render();
    }
    if (name === "withdraw") {
      const user = currentUser();
      const values = serializeForm(form);
      const amount = Number(values.amount || 0);
      if (amount <= 0 || amount > user.balance) return toast("提现金额不正确");
      user.balance -= amount;
      state.data.withdrawals.push({ id: `W${Date.now()}`, userId: user.id, amount, account: values.account, status: "待审核", createdAt: nowText() });
      saveData();
      state.drawer = null;
      toast("提现申请已提交");
      render();
    }
    if (name === "settings") handleSettings(form);
    if (name === "manual-stats") handleManualStats(form);
    if (name === "product") handleProduct(form);
    if (name === "user") handleUser(form);
  });

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) {
      const stopper = event.target.closest("[data-stop]");
      if (stopper) return;
    }
    if (!target) return;
    const action = target.dataset.action;
    if (action === "to-register") go("register");
    if (action === "to-login") go("login");
    if (action === "open-admin") go(state.session.role === "admin" ? "admin" : "admin-login");
    if (action === "leave-admin") go(state.session.userId ? "home" : "login");
    if (action === "admin-logout") {
      state.session = { userId: state.session.userId };
      saveSession();
      go("admin-login");
    }
    if (action === "logout") {
      state.session = {};
      saveSession();
      go("login");
    }
    if (action === "buy") {
      const user = currentUser();
      if (!user.addresses.length) {
        state.drawer = { type: "address" };
        toast("请先添加收货地址");
      } else {
        state.drawer = { type: "buy", id: target.dataset.id };
      }
      render();
    }
    if (action === "close-drawer") {
      state.drawer = null;
      render();
    }
    if (action === "add-address") {
      state.drawer = { type: "address" };
      render();
    }
    if (action === "delete-address") {
      const user = currentUser();
      user.addresses.splice(Number(target.dataset.index), 1);
      saveData();
      toast("地址已删除");
      render();
    }
    if (action === "withdraw") {
      state.drawer = { type: "withdraw" };
      render();
    }
    if (action === "copy-invite") {
      const code = currentUser().inviteCode;
      navigator.clipboard?.writeText(code);
      toast(`邀请码 ${code}`);
    }
    if (action === "reset-demo") {
      state.data = clone(seed);
      saveData();
      toast("演示数据已重置");
      render();
    }
    if (action === "new-product") {
      state.drawer = { type: "product" };
      render();
    }
    if (action === "edit-product") {
      state.drawer = { type: "product", id: target.dataset.id };
      render();
    }
    if (action === "toggle-product") {
      const product = getProduct(target.dataset.id);
      product.status = product.status === "active" ? "inactive" : "active";
      saveData();
      render();
    }
    if (action === "order-status") {
      const order = state.data.orders.find((item) => item.id === target.dataset.id);
      order.status = target.dataset.status;
      saveData();
      render();
    }
    if (action === "edit-user") {
      state.drawer = { type: "user", id: target.dataset.id };
      render();
    }
  });

  window.addEventListener("hashchange", render);
  render();
})();
