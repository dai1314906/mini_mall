"""M3 购物车 Playwright 验证：未登录跳转、加购合并、数量修改、金额合计、库存钳制、删除行"""
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
results = []


def check(name: str, cond: bool):
    results.append((name, cond))
    print(("✓ " if cond else "✗ ") + name)


def open_product(page, keyword: str) -> str:
    """搜索关键词并打开第一个商品卡片，返回详情页 URL"""
    page.goto(BASE + "/products?q=" + __import__("urllib.parse", fromlist=["quote"]).quote(keyword))
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    card = page.locator('a[href^="/products/"]', has_text=keyword).first
    card.click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    return page.url


def login(page, email, password):
    page.goto(BASE + "/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    page.fill('input[name="email"]', email)
    page.fill('input[name="password"]', password)
    page.get_by_role("button", name="登录", exact=True).click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ── 用户上下文 ──
    user_ctx = browser.new_context()
    page = user_ctx.new_page()

    # 1. 未登录加购 → 跳登录
    detail_url = open_product(page, "无线蓝牙耳机")
    check("详情页有加购按钮", page.get_by_role("button", name="加入购物车").count() > 0)
    page.get_by_role("button", name="加入购物车").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    check(
        "未登录加购跳转登录页（带 next 参数）",
        page.url.startswith(BASE + "/login?next=") and "products" in page.url,
    )

    # 2. 登录
    login(page, "user@minimall.com", "user123")
    check("用户登录成功", page.locator("header").get_by_text("演示用户").count() > 0)

    # 3. 加购 3 件
    detail_url = open_product(page, "无线蓝牙耳机")
    page.select_option('select[name="quantity"]', "3")
    page.get_by_role("button", name="加入购物车").click()
    page.wait_for_timeout(1500)
    check("加购 3 件成功提示", page.locator("text=已加入购物车").count() > 0)
    check("Header 角标显示 1 种", page.locator("header").locator("span", has_text="1").count() > 0)

    # 4. 再加 2 件 → 合并为 5
    page.select_option('select[name="quantity"]', "2")
    page.get_by_role("button", name="加入购物车").click()
    page.wait_for_timeout(1500)
    page.goto(BASE + "/cart")
    page.wait_for_load_state("networkidle")
    row1 = page.locator("tr", has_text="无线蓝牙耳机")
    check("重复加购合并为 5 件", row1.locator("span.w-8", has_text="5").count() > 0)

    # 5. 金额合计：199 × 5 = 995
    check("小计正确 ¥995.00", row1.locator("text=¥995.00").count() > 0)
    check("合计正确", page.locator("text=商品原价（5 件）").count() > 0 and page.locator("text=预计实付").count() > 0 and page.locator("text=¥995.00").count() >= 2)

    # 6. 数量 − → 4，合计变 796
    row1.get_by_role("button", name="−").click()
    page.wait_for_timeout(1500)
    row1 = page.locator("tr", has_text="无线蓝牙耳机")
    check("数量减到 4 且小计 ¥796.00", row1.locator("span.w-8", has_text="4").count() > 0 and row1.locator("text=¥796.00").count() > 0)

    # 7. 加第二件商品：机械键盘 349 × 1 → 合计 1145
    open_product(page, "机械键盘 87 键")
    page.get_by_role("button", name="加入购物车").click()
    page.wait_for_timeout(1500)
    page.goto(BASE + "/cart")
    page.wait_for_load_state("networkidle")
    check(
        "两行商品合计 ¥1,145.00",
        page.locator("text=机械键盘 87 键").count() > 0
        and page.locator("text=商品原价（5 件）").count() > 0
        and page.locator("text=¥1,145.00").count() > 0,
    )

    # ── 管理员上下文：创建库存 2 的测试商品 ──
    admin_ctx = browser.new_context()
    apage = admin_ctx.new_page()
    login(apage, "admin@minimall.com", "admin123")
    apage.goto(BASE + "/admin/products/new")
    apage.wait_for_load_state("networkidle")
    apage.wait_for_timeout(1500)
    limited_name = f"限量商品{int(time.time())}"
    apage.fill('input[name="name"]', limited_name)
    apage.fill('input[name="price"]', "10.00")
    apage.fill('input[name="stock"]', "2")
    apage.select_option('select[name="categoryId"]', label="食品")
    apage.get_by_role("button", name="保存", exact=True).click()
    apage.wait_for_load_state("networkidle")
    apage.wait_for_timeout(1500)
    check("管理员创建库存 2 测试商品", apage.locator("text=" + limited_name).count() > 0)
    # 找它的商品 ID
    apage.locator("tr", has_text=limited_name).locator("a", has_text="编辑").click()
    apage.wait_for_load_state("networkidle")
    apage.wait_for_timeout(1500)
    # URL 形如 /admin/products/<id>/edit
    limited_id = int(apage.url.rstrip("/").split("/")[-2])
    admin_ctx.close()

    # ── 用户上下文继续：钳制测试 ──
    page.goto(BASE + f"/products/{limited_id}")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    page.select_option('select[name="quantity"]', "2")
    page.get_by_role("button", name="加入购物车").click()
    page.wait_for_timeout(1500)
    page.get_by_role("button", name="加入购物车").click()
    page.wait_for_timeout(1500)
    check("加购超库存被钳制并提示", page.locator("text=已达库存上限（2 件）").count() > 0)

    page.goto(BASE + "/cart")
    page.wait_for_load_state("networkidle")
    row2 = page.locator("tr", has_text=limited_name)
    check("购物车中该商品数量为 2", row2.locator("span.w-8", has_text="2").count() > 0)
    row2.get_by_role("button", name="+").click()
    page.wait_for_timeout(1500)
    row2 = page.locator("tr", has_text=limited_name)
    check(
        "点 + 仍被钳制在 2 并提示",
        row2.locator("span.w-8", has_text="2").count() > 0 and page.locator("text=已达库存上限（2 件）").count() > 0,
    )

    # 8. 删除行
    row2.get_by_role("button", name="删除").click()
    page.wait_for_timeout(1500)
    check("删除后该商品消失", page.locator("text=" + limited_name).count() == 0)

    # 清理：管理员删除测试商品
    admin_ctx = browser.new_context()
    apage = admin_ctx.new_page()
    login(apage, "admin@minimall.com", "admin123")
    apage.goto(BASE + "/admin/products")
    apage.wait_for_load_state("networkidle")
    apage.locator("tr", has_text=limited_name).get_by_role("button", name="删除").click()
    apage.wait_for_load_state("networkidle")
    apage.wait_for_timeout(1000)
    admin_ctx.close()

    browser.close()

failed = [n for n, c in results if not c]
print(f"\n{len(results) - len(failed)}/{len(results)} 通过")
if failed:
    print("失败项:", failed)
    raise SystemExit(1)
