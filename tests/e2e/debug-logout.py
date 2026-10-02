"""调试：登出流程——区分 cookie 未删除 vs UI 未刷新"""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # 登录
    page.goto(BASE + "/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)
    page.fill('input[name="email"]', "user@minimall.com")
    page.fill('input[name="password"]', "user123")
    page.click('button[type="submit"]')
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    print("登录后 header:", [t for t in page.locator("header").inner_text().split("\n") if t.strip()])
    print("登录后 cookies:", [c["name"] for c in page.context.cookies()])

    # 点退出
    page.click("header button[type=submit]")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)
    print("退出后 URL:", page.url)
    print("退出后 header:", [t for t in page.locator("header").inner_text().split("\n") if t.strip()])
    print("退出后 cookies:", [c["name"] for c in page.context.cookies()])

    # 硬刷新
    page.reload()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    print("硬刷新后 header:", [t for t in page.locator("header").inner_text().split("\n") if t.strip()])

    browser.close()
