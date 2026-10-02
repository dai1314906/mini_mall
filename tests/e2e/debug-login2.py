"""调试：M2 环境下的登录失败"""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("console", lambda m: print("[console]", m.type, m.text[:200]))
    page.on("request", lambda r: print("[req]", r.method, r.url[:120]) if r.method == "POST" else None)

    page.goto(BASE + "/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)  # 冷启动后给更长的 hydration 时间

    print("表单是否存在:", page.locator('input[name="email"]').count())
    page.fill('input[name="email"]', "admin@minimall.com")
    page.fill('input[name="password"]', "admin123")
    print("填入后值:", page.input_value('input[name="email"]'), page.input_value('input[name="password"]'))

    page.click('button[type="submit"]')
    page.wait_for_timeout(3000)
    print("点击后 URL:", page.url)
    print("点击后 header:", [t for t in page.locator("header").inner_text().split("\n") if t.strip()][:8])
    print("页面错误提示:", page.locator("text=邮箱或密码错误").count())
    browser.close()
