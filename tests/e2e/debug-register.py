"""调试：注册表单提交前后状态"""
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(BASE + "/register")
    page.wait_for_load_state("networkidle")

    page.fill('input[name="name"]', "测试用户")
    page.fill('input[name="email"]', f"dbg{int(time.time())}@test.com")
    page.fill('input[name="password"]', "password123")

    print("== 提交前 input 值 ==")
    for sel in ['input[name="name"]', 'input[name="email"]', 'input[name="password"]']:
        print(sel, "=>", repr(page.input_value(sel)))

    print("== 表单数量 ==", page.locator("form").count())
    print("== 表单 HTML ==")
    print(page.locator("form").first.evaluate("el => el.outerHTML")[:600])

    page.click('button[type="submit"]')
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)

    print("== 提交后 URL ==", page.url)
    body = page.locator("body").inner_text()
    print("== 提交后页面文本（前 500 字）==")
    print(body[:500])
    browser.close()
