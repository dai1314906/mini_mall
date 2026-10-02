"""M4 下单+模拟支付+会员 Playwright 验证：
下单快照/库存扣减/购物车清空、支付状态流转、会员升级、下单折扣、取消回补、并发下单、越权访问"""
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


def add_to_cart(page, keyword: str, quantity: str = "1"):
    open_product(page, keyword)
    if quantity != "1":
        page.select_option('select[name="quantity"]', quantity)
    page.get_by_role("button", name="加入购物车").click()
    page.wait_for_timeout(1500)


def checkout(page, name="测试收货人", phone="13800138000", address="北京市朝阳区测试街道 88 号"):
    page.goto(BASE + "/checkout")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    page.fill('input[name="receiverName"]', name)
    page.fill('input[name="receiverPhone"]', phone)
    page.fill('textarea[name="receiverAddress"]', address)
    page.get_by_role("button", name="提交订单").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    return page.url


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # 管理员：创建高价商品（1 万元）与库存 1 商品
    admin_ctx = browser.new_context()
    apage = admin_ctx.new_page()
    login(apage, "admin@minimall.com", "admin123")

    def create_product(name, price, stock):
        apage.goto(BASE + "/admin/products/new")
        apage.wait_for_load_state("networkidle")
        apage.wait_for_timeout(1500)
        apage.fill('input[name="name"]', name)
        apage.fill('input[name="price"]', price)
        apage.fill('input[name="stock"]', stock)
        apage.select_option('select[name="categoryId"]', label="数码")
        apage.get_by_role("button", name="保存", exact=True).click()
        apage.wait_for_load_state("networkidle")
        apage.wait_for_timeout(1500)

    expensive = f"万元旗舰手机{int(time.time())}"
    create_product(expensive, "10000.00", "5")
    limited = f"限量一枚{int(time.time())}"
    create_product(limited, "66.00", "1")
    admin_ctx.close()

    # 用户上下文
    ctx = browser.new_context()
    page = ctx.new_page()
    page.on("dialog", lambda d: d.accept())  # 自动接受 confirm 弹窗
    login(page, "user@minimall.com", "user123")

    # ── 1. 下单：耳机 ×3 ──
    add_to_cart(page, "无线蓝牙耳机", "3")
    detail_url = checkout(page)
    check("下单跳转订单详情（created 横幅）", "/orders/" in detail_url and page.locator("text=下单成功").count() > 0)
    check("订单状态待支付", page.locator("text=待支付").count() > 0)
    check("订单快照正确（原价 ¥597.00）", page.locator("text=¥597.00").count() >= 2)
    check("订单无折扣", page.locator("text=无折扣").count() > 0)
    check("收货信息正确", page.locator("text=测试收货人 · 13800138000").count() > 0)

    # 库存扣减 + 购物车清空
    open_product(page, "无线蓝牙耳机")
    check("库存从 50 扣到 47", page.locator("text=库存：47").count() > 0)
    page.goto(BASE + "/cart")
    page.wait_for_load_state("networkidle")
    check("下单后购物车已清空", page.locator("text=购物车是空的").count() > 0)

    # ── 2. 模拟支付 ──
    order_url = detail_url
    page.goto(order_url)
    page.wait_for_load_state("networkidle")
    page.get_by_role("button", name="确认支付").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    check("支付成功（URL 带 paid=1 + banner）", "paid=1" in page.url and page.locator("text=支付成功！").count() > 0)
    check("状态变为已支付", page.locator("text=已支付").count() > 0)
    check("支付后面板消失（不能重复支付）", page.locator("button", has_text="确认支付").count() == 0)
    check("Header 仍是普通会员", page.locator("header").locator("text=普通会员").count() > 0)

    # ── 3. 会员升级：买 1 万元商品 → 累计 10059.70 → 心悦1级 ──
    add_to_cart(page, expensive, "1")
    checkout(page)
    page.get_by_role("button", name="确认支付").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    check("升级提示（恭喜升级为心悦1级）", "level=LV1" in page.url and page.locator("text=恭喜升级为心悦1级").count() > 0)
    page.goto(BASE + "/")
    page.wait_for_load_state("networkidle")
    check("Header 显示心悦1级", page.locator("header").locator("text=心悦1级").count() > 0)

    # ── 4. 下单折扣：9.8 折 ──
    add_to_cart(page, "无线蓝牙耳机", "1")
    page.goto(BASE + "/checkout")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    check("结算页显示 9.8 折", page.locator("text=会员折扣（9.8折）").count() > 0)
    check("结算页优惠 ¥3.98", page.locator("text=-¥3.98").count() > 0)
    check("结算页实付 ¥195.02", page.locator("text=¥195.02").count() > 0)
    page.fill('input[name="receiverName"]', "测试收货人")
    page.fill('input[name="receiverPhone"]', "13800138000")
    page.fill('textarea[name="receiverAddress"]', "北京市朝阳区测试街道 88 号")
    page.get_by_role("button", name="提交订单").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    check("订单详情展示折扣明细", page.locator("text=会员折扣（9.8折）").count() > 0 and page.locator("text=-¥3.98").count() > 0)
    page.get_by_role("button", name="确认支付").click()
    page.wait_for_timeout(1000)
    check("折扣订单支付成功", page.locator("text=已支付").count() > 0)

    # ── 5. 取消订单回补库存 ──
    add_to_cart(page, "智能手表 Pro", "1")
    checkout(page)
    page.get_by_role("button", name="取消订单").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    check("取消提示与状态已取消", "cancelled=1" in page.url and page.locator("text=订单已取消，库存已回补").count() > 0 and page.locator("text=已取消").count() > 0)
    open_product(page, "智能手表 Pro")
    check("取消后库存回补为 20", page.locator("text=库存：20").count() > 0)

    # ── 6. 并发下单：库存 1，双页面同时提交，只成功一单 ──
    add_to_cart(page, limited, "1")
    page2 = ctx.new_page()
    login(page2, "user@minimall.com", "user123")
    for pg in (page, page2):
        pg.goto(BASE + "/checkout")
        pg.wait_for_load_state("networkidle")
        pg.wait_for_timeout(1000)
        pg.fill('input[name="receiverName"]', "并发测试")
        pg.fill('input[name="receiverPhone"]', "13800138000")
        pg.fill('textarea[name="receiverAddress"]', "北京市并发测试街道 1 号")
    # 同时提交
    page.get_by_role("button", name="提交订单").click()
    page2.get_by_role("button", name="提交订单").click()
    page.wait_for_timeout(2500)
    page2.wait_for_timeout(1000)
    urls = [page.url, page2.url]
    success_count = sum(1 for u in urls if "/orders/" in u)
    check(f"并发下单只成功一单（成功 {success_count}）", success_count == 1)

    # ── 7. 越权访问他人订单 → 404 ──
    order_id = urls[0].rstrip("/").split("/")[-1]
    other_ctx = browser.new_context()
    opage = other_ctx.new_page()
    login(opage, "admin@minimall.com", "admin123")  # admin 是另一个用户
    opage.goto(BASE + f"/orders/{order_id}")
    opage.wait_for_load_state("networkidle")
    check("他人订单越权访问 404", "404" in opage.locator("body").inner_text() or opage.locator("text=页面不存在").count() > 0)
    other_ctx.close()

    browser.close()

failed = [n for n, c in results if not c]
print(f"\n{len(results) - len(failed)}/{len(results)} 通过")
if failed:
    print("失败项:", failed)
    raise SystemExit(1)
