"""M6 生产模式全链路冒烟（自动等待式断言，避免 count() 竞态）：
注册→加购→下单（无折扣）→支付→管理员造万元商品→购买升级心悦1级→9.8折下单→发货→确认收货→退款（等级不降）→权限拦截"""
import time
from urllib.parse import quote

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
results = []


def check(name: str, cond: bool):
    results.append((name, cond))
    print(("✓ " if cond else "✗ ") + name)


def expect_text(page, text: str, timeout: int = 8000) -> bool:
    """自动等待文本出现"""
    try:
        page.get_by_text(text).first.wait_for(timeout=timeout)
        return True
    except Exception:
        return False


def nav(page, url: str):
    page.goto(BASE + url)
    page.wait_for_load_state("networkidle")


def open_detail(page, keyword: str):
    """搜索并进入商品详情（等待 URL 变为 /products/<id>）"""
    nav(page, "/products?q=" + quote(keyword))
    card = page.locator('a[href^="/products/"]', has_text=keyword).first
    card.wait_for(timeout=8000)
    card.click()
    page.wait_for_url(lambda u: "/products/" in u and "q=" not in u, timeout=10000)
    page.wait_for_timeout(1000)


def add_to_cart(page, keyword: str, quantity: str = "1"):
    open_detail(page, keyword)
    if quantity != "1":
        page.select_option('select[name="quantity"]', quantity)
    page.get_by_role("button", name="加入购物车").click()
    page.get_by_text("已加入购物车").first.wait_for(timeout=8000)


def fill_checkout_and_submit(page):
    nav(page, "/checkout")
    page.fill('input[name="receiverName"]', "冒烟测试员")
    page.fill('input[name="receiverPhone"]', "13800138000")
    page.fill('textarea[name="receiverAddress"]', "北京市冒烟测试街道 1 号")
    page.get_by_role("button", name="提交订单").click()
    page.wait_for_url(lambda u: "/orders/" in u, timeout=10000)
    page.wait_for_timeout(1000)


def pay(page):
    page.get_by_role("button", name="确认支付").click()
    page.wait_for_url(lambda u: "paid=1" in u, timeout=10000)
    page.wait_for_timeout(1000)


def login(page, email, password):
    nav(page, "/login")
    page.fill('input[name="email"]', email)
    page.fill('input[name="password"]', password)
    page.get_by_role("button", name="登录", exact=True).click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()
    page.on("dialog", lambda d: d.accept())

    # ── 0. 注册新用户（自动登录）──
    email = f"smoke{int(time.time())}@test.com"
    nav(page, "/register")
    page.fill('input[name="name"]', "冒烟用户")
    page.fill('input[name="email"]', email)
    page.fill('input[name="password"]', "password123")
    page.get_by_role("button", name="注册", exact=True).click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1200)
    check("注册自动登录", expect_text(page, "冒烟用户"))

    # ── 1. 下单（无折扣）：耳机 ×2 = ¥398.00 ──
    add_to_cart(page, "无线蓝牙耳机", "2")
    fill_checkout_and_submit(page)
    check("下单成功横幅", expect_text(page, "下单成功"))
    check("原价 ¥398.00 快照", expect_text(page, "¥398.00"))
    check("无折扣", expect_text(page, "无折扣"))
    check("待支付状态", expect_text(page, "待支付"))

    # 库存 50 → 48
    open_detail(page, "无线蓝牙耳机")
    check("库存扣到 48", expect_text(page, "库存：48"))

    # 购物车清空
    nav(page, "/cart")
    check("购物车已清空", expect_text(page, "购物车是空的"))

    # ── 2. 支付 ──
    page.goto(page.url.replace("/cart", ""))  # 回首页
    nav(page, "/orders")
    page.locator("a", has_text="查看详情").first.wait_for(timeout=8000)
    page.locator("a", has_text="查看详情").first.click()
    page.wait_for_timeout(1000)
    pay(page)
    check("支付成功 banner", expect_text(page, "支付成功！"))
    check("已支付状态", expect_text(page, "已支付"))
    check("普通会员（累计不足）", expect_text(page, "普通会员"))

    # ── 3. 管理员创建万元商品 ──
    admin_ctx = browser.new_context()
    apage = admin_ctx.new_page()
    apage.on("dialog", lambda d: d.accept())
    login(apage, "admin@minimall.com", "admin123")
    expensive = f"万元旗舰{int(time.time())}"
    nav(apage, "/admin/products/new")
    apage.fill('input[name="name"]', expensive)
    apage.fill('input[name="price"]', "10000.00")
    apage.fill('input[name="stock"]', "5")
    apage.select_option('select[name="categoryId"]', label="数码")
    apage.get_by_role("button", name="保存", exact=True).click()
    apage.wait_for_load_state("networkidle")
    apage.wait_for_timeout(1200)
    check("管理员创建万元商品", expect_text(apage, expensive))

    # ── 4. 购买万元商品 → 升级心悦1级 ──
    add_to_cart(page, expensive, "1")
    fill_checkout_and_submit(page)
    pay(page)
    check("升级心悦1级 banner", expect_text(page, "恭喜升级为心悦1级"))
    check("Header 心悦1级徽章", expect_text(page, "心悦1级"))

    # ── 5. 9.8 折下单：耳机 ×1 = ¥195.02 ──
    add_to_cart(page, "无线蓝牙耳机", "1")
    nav(page, "/cart")
    check("购物车页会员折扣明细", expect_text(page, "会员等级 · 心悦1级（9.8折）"))
    check("购物车页预计实付 ¥195.02", expect_text(page, "¥195.02"))
    nav(page, "/checkout")
    check("结算页 9.8 折明细", expect_text(page, "会员折扣（9.8折）"))
    check("结算页实付 ¥195.02", expect_text(page, "¥195.02"))
    fill_checkout_and_submit(page)
    check("订单详情折扣快照", expect_text(page, "会员折扣（9.8折）"))
    pay(page)
    check("折扣订单支付成功", expect_text(page, "已支付"))

    # ── 6. 发货 → 确认收货 ──
    nav(apage, "/admin/orders")
    check("后台订单显示买家等级", expect_text(apage, "心悦1级"))
    apage.locator("tr", has_text="无线蓝牙耳机").locator("a", has_text="详情").first.wait_for(timeout=8000)
    apage.locator("tr", has_text="无线蓝牙耳机").locator("a", has_text="详情").first.click()
    apage.wait_for_timeout(1000)
    apage.get_by_role("button", name="发货").click()
    apage.wait_for_url(lambda u: "shipped=1" in u, timeout=10000)
    check("后台发货成功", expect_text(apage, "已发货"))

    nav(page, "/orders")
    # 找到发货订单（待收货）
    shipped_row = page.locator("li", has_text="已发货").first
    shipped_row.wait_for(timeout=8000)
    shipped_row.locator("a", has_text="查看详情").click()
    page.wait_for_timeout(1000)
    page.get_by_role("button", name="确认收货").click()
    page.wait_for_url(lambda u: "completed=1" in u, timeout=10000)
    check("用户确认收货 → 已完成", expect_text(page, "已完成"))

    # ── 7. 退款万元订单：等级不降 + 库存回补 ──
    nav(apage, "/admin/orders")
    apage.locator("tr", has_text=expensive).locator("a", has_text="详情").first.wait_for(timeout=8000)
    apage.locator("tr", has_text=expensive).locator("a", has_text="详情").first.click()
    apage.wait_for_timeout(1000)
    apage.get_by_role("button", name="退款取消").click()
    apage.wait_for_url(lambda u: "refunded=1" in u, timeout=10000)
    check("后台退款成功", expect_text(apage, "已退款"))
    nav(page, "/")
    check("退款后等级不降（心悦1级）", expect_text(page, "心悦1级"))
    open_detail(page, expensive)
    check("退款后库存回补为 5", expect_text(page, "库存：5"))

    # ── 8. USER 访问 /admin 被拦截 ──
    nav(page, "/admin")
    page.wait_for_timeout(1200)
    check("USER 访问 /admin 被拦回首页", page.url.rstrip("/") == BASE)

    admin_ctx.close()
    browser.close()

failed = [n for n, c in results if not c]
print(f"\n{len(results) - len(failed)}/{len(results)} 通过")
if failed:
    print("失败项:", failed)
    raise SystemExit(1)
