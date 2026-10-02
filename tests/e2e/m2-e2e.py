"""M2 商品与分类 Playwright 验证：后台分类 CRUD、商品 CRUD+图片上传+上下架、前台列表/搜索/筛选/详情"""
import base64
import os
import tempfile
import time
from urllib.parse import quote

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
# 1x1 红色 PNG
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)

results = []


def check(name: str, cond: bool):
    results.append((name, cond))
    print(("✓ " if cond else "✗ ") + name)


with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
    f.write(PNG)
    png_path = f.name

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        alerts = []
        page.on("dialog", lambda d: (alerts.append(d.message), d.accept()))

        # 登录 admin
        page.goto(BASE + "/login")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        page.fill('input[name="email"]', "admin@minimall.com")
        page.fill('input[name="password"]', "admin123")
        page.get_by_role("button", name="登录", exact=True).click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        check("admin 登录成功", page.locator("header").get_by_text("管理员").count() > 0)

        # 后台仪表盘
        page.goto(BASE + "/admin")
        page.wait_for_load_state("networkidle")
        check("后台仪表盘可访问", page.locator("h1", has_text="仪表盘").count() > 0)

        # ── 分类 CRUD ──
        page.goto(BASE + "/admin/categories")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        cat_name = f"测试分类{int(time.time())}"
        page.fill("#new-cat", cat_name)
        page.get_by_role("button", name="创建", exact=True).click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        check("新建分类", page.locator("td", has_text=cat_name).count() > 0)

        row = page.locator("tr", has_text=cat_name)
        row.get_by_text("编辑").click()
        page.wait_for_timeout(300)
        # 编辑模式下 input 的 value 不计入文本，has_text 匹配不到行；编辑表单在创建表单之后
        page.locator('input[name="name"]').last.fill(cat_name + "改")
        page.get_by_role("button", name="保存").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        check("编辑分类", page.locator("td", has_text=cat_name + "改").count() > 0)

        page.locator("tr", has_text=cat_name + "改").get_by_text("删除").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        check("删除空分类", page.locator("td", has_text=cat_name + "改").count() == 0)

        page.locator("tr", has_text="数码").get_by_text("删除").click()
        page.wait_for_timeout(1000)
        check("删除非空分类被拒并提示", any("无法删除" in a for a in alerts))

        # ── 商品 CRUD + 图片上传 ──
        page.goto(BASE + "/admin/products/new")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        pname = f"测试商品{int(time.time())}"
        page.fill('input[name="name"]', pname)
        page.fill('textarea[name="description"]', "这是测试商品描述")
        page.fill('input[name="price"]', "123.45")
        page.fill('input[name="stock"]', "7")
        page.select_option('select[name="categoryId"]', label="图书")
        page.set_input_files('input[type="file"]', png_path)
        page.wait_for_selector("img[alt=商品图]", timeout=10000)
        check("图片上传成功显示预览", True)
        page.get_by_role("button", name="保存", exact=True).click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        check(
            "新建商品保存并回到列表",
            page.url.rstrip("/").endswith("/admin/products") and page.locator("text=" + pname).count() > 0,
        )

        # ── 前台 ──
        page.goto(BASE + "/products")
        page.wait_for_load_state("networkidle")
        check("前台列表可见新商品", page.locator("text=" + pname).count() > 0)

        # 搜索
        page.fill('header input[name="q"]', pname)
        page.get_by_role("banner").get_by_role("button", name="搜索").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        check("搜索命中新商品", page.locator("text=" + pname).count() > 0)

        # 分类筛选：图书分类下应有小王子、无蓝牙耳机
        page.goto(BASE + "/products")
        page.wait_for_load_state("networkidle")
        page.locator("a", has_text="图书").first.click()
        page.wait_for_load_state("networkidle")
        check(
            "分类筛选正确",
            page.locator("text=小王子").count() > 0 and page.locator("text=无线蓝牙耳机").count() == 0,
        )

        # 详情页（点击卡片链接，等渲染完成再断言）
        page.locator(f'a[href^="/products/"]', has_text=pname).first.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1500)
        check(
            "详情页展示价格与描述",
            page.locator("text=¥123.45").count() > 0 and page.locator("text=这是测试商品描述").count() > 0,
        )

        # ── 下架/上架 ──
        page.goto(BASE + "/admin/products")
        page.wait_for_load_state("networkidle")
        page.locator("tr", has_text=pname).get_by_text("下架").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        page.goto(BASE + "/products?q=" + quote(pname))
        page.wait_for_load_state("networkidle")
        check("下架后前台搜索不可见", page.locator("text=" + pname).count() == 0)

        page.goto(BASE + "/admin/products")
        page.wait_for_load_state("networkidle")
        page.locator("tr", has_text=pname).get_by_text("上架").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        page.goto(BASE + "/products?q=" + quote(pname))
        page.wait_for_load_state("networkidle")
        check("重新上架后前台可见", page.locator("text=" + pname).count() > 0)

        # 清理：删除测试商品
        page.goto(BASE + "/admin/products")
        page.wait_for_load_state("networkidle")
        page.locator("tr", has_text=pname).get_by_text("删除").click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        check("清理删除测试商品", page.locator("text=" + pname).count() == 0)

        browser.close()

    failed = [n for n, c in results if not c]
    print(f"\n{len(results) - len(failed)}/{len(results)} 通过")
    if failed:
        print("失败项:", failed)
        raise SystemExit(1)
finally:
    os.unlink(png_path)
