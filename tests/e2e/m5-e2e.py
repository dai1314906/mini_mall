"""M5 后台订单+权限收口 Playwright 验证：
USER 访问 /admin 被 proxy 拦截、发货→确认收货链路、退款取消（库存回补+累计扣回+等级不降）、状态筛选"""
import time
from urllib.parse import quote

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
results = []


def check(name: str, cond: bool):
    results.append((name, cond))
    print(("✓ " if cond else "✗ ") + name)


def login(page, email, password):
    page.goto(BASE + "/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    page.fill('input[name="email"]', email)
    page.fill('input[name="password"]', password)
    page.get_by_role("button", name="登录", exact=True).click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)


def open_product(page, keyword: str):
    page.goto(BASE + "/products?q=" + quote(keyword))
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    page.locator('a[href^="/products/"]', has_text=keyword).first.click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)


def buy(page, keyword: str, quantity: str = "1") -> str:
    """加购→结算→返回订单详情 URL"""
    open_product(page, keyword)
    if quantity != "1":
        page.select_option('select[name="quantity"]', quantity)
    page.get_by_role("button", name="加入购物车").click()
    page.wait_for_timeout(1500)
    page.goto(BASE + "/checkout")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    page.fill('input[name="receiverName"]', "收货测试")
    page.fill('input[name="receiverPhone"]', "13800138000")
    page.fill('textarea[name="receiverAddress"]', "北京市测试街道 1 号")
    page.get_by_role("button", name="提交订单").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    return page.url


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # 管理员：造一个万元商品
    admin_ctx = browser.new_context()
    apage = admin_ctx.new_page()
    apage.on("dialog", lambda d: d.accept())
    login(apage, "admin@minimall.com", "admin123")
    apage.goto(BASE + "/admin/products/new")
    apage.wait_for_load_state("networkidle")
    apage.wait_for_timeout(1500)
    expensive = f"万元旗舰机{int(time.time())}"
    apage.fill('input[name="name"]', expensive)
    apage.fill('input[name="price"]', "10000.00")
    apage.fill('input[name="stock"]', "5")
    apage.select_option('select[name="categoryId"]', label="数码")
    apage.get_by_role("button", name="保存", exact=True).click()
    apage.wait_for_load_state("networkidle")
    apage.wait_for_timeout(1500)

    # ── 1. USER 访问 /admin 被拦截 ──
    ctx = browser.new_context()
    page = ctx.new_page()
    page.on("dialog", lambda d: d.accept())
    login(page, "user@minimall.com", "user123")
    page.goto(BASE + "/admin")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    check("USER 访问 /admin 被 proxy 拦回首页", page.url.rstrip("/") == BASE)
    page.goto(BASE + "/admin/orders")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    check("USER 访问 /admin/orders 同样被拦截", page.url.rstrip("/") == BASE)

    # ── 2. 发货→确认收货链路 ──
    order1_url = buy(page, "智能手表 Pro", "1")
    page.get_by_role("button", name="确认支付").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    check("用户支付成功", page.locator("text=已支付").count() > 0)

    # 管理员：订单列表可见 + 详情发货
    apage.goto(BASE + "/admin/orders")
    apage.wait_for_load_state("networkidle")
    check(
        "后台订单列表可见（含买家邮箱与商品）",
        apage.locator("text=user@minimall.com").count() > 0 and apage.locator("text=智能手表 Pro × 1").count() > 0,
    )
    apage.locator("a", has_text="详情").first.click()
    apage.wait_for_load_state("networkidle")
    apage.wait_for_timeout(1000)
    apage.get_by_role("button", name="发货").click()
    apage.wait_for_load_state("networkidle")
    apage.wait_for_timeout(1500)
    check("后台发货成功（banner+状态）", "shipped=1" in apage.url and apage.locator("text=已发货").count() > 0)

    # 用户确认收货
    page.goto(order1_url)
    page.wait_for_load_state("networkidle")
    check("用户看到已发货状态", page.locator("text=已发货").count() > 0)
    page.get_by_role("button", name="确认收货").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    check("用户确认收货 → 已完成", "completed=1" in page.url and page.locator("text=已完成").count() > 0)

    # ── 3. 退款取消：扣回累计消费 + 库存回补 + 等级不降 ──
    order2_url = buy(page, expensive, "1")
    page.get_by_role("button", name="确认支付").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    check("万元订单支付并升级心悦1级", page.locator("header").locator("text=心悦1级").count() > 0)

    apage.goto(BASE + "/admin/orders")
    apage.wait_for_load_state("networkidle")
    apage.locator("tr", has_text=expensive).locator("a", has_text="详情").click()
    apage.wait_for_load_state("networkidle")
    apage.wait_for_timeout(1000)
    apage.get_by_role("button", name="退款取消").click()
    apage.wait_for_load_state("networkidle")
    apage.wait_for_timeout(1500)
    check("后台退款成功", "refunded=1" in apage.url and apage.locator("text=已退款，库存已回补").count() > 0)

    # 用户侧：等级不降 + 库存回补
    page.goto(BASE + "/")
    page.wait_for_load_state("networkidle")
    check("退款后等级不降（仍是心悦1级）", page.locator("header").locator("text=心悦1级").count() > 0)
    open_product(page, expensive)
    check("退款后库存回补为 5", page.locator("text=库存：5").count() > 0)

    # ── 4. 状态筛选 ──
    apage.goto(BASE + "/admin/orders?status=CANCELLED")
    apage.wait_for_load_state("networkidle")
    # 注：筛选标签栏本身含「待支付」文本，需断言商品名而非标签
    check(
        "已取消筛选只显示已取消订单",
        apage.locator("text=" + expensive).count() > 0 and apage.locator("text=智能手表").count() == 0,
    )

    admin_ctx.close()
    browser.close()

failed = [n for n, c in results if not c]
print(f"\n{len(results) - len(failed)}/{len(results)} 通过")
if failed:
    print("失败项:", failed)
    raise SystemExit(1)
