"""M1 认证流程 Playwright 验证：注册→自动登录→刷新保持→登出→错误密码→admin 登录"""
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
results = []


def check(name: str, cond: bool):
    results.append((name, cond))
    print(("✓ " if cond else "✗ ") + name)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # 1. 注册 → 自动登录 → 跳首页
    email = f"e2e{int(time.time())}@test.com"
    page.goto(BASE + "/register")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)  # 等待 React hydration 完成，避免填充被 hydration 重置
    page.fill('input[name="name"]', "测试用户")
    page.fill('input[name="email"]', email)
    page.fill('input[name="password"]', "password123")
    page.get_by_role("button", name="注册", exact=True).click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    check(
        "注册后自动登录并跳转首页",
        page.url.rstrip("/") == BASE and page.locator("header").get_by_text("测试用户").count() > 0,
    )

    # 2. 刷新后登录态保持
    page.reload()
    page.wait_for_load_state("networkidle")
    check("刷新后登录态保持", page.locator("header").get_by_text("测试用户").count() > 0)

    # 3. 登出
    page.get_by_role("button", name="退出").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    check(
        "登出后 header 恢复登录/注册入口",
        page.locator("header").get_by_text("登录", exact=True).count() > 0
        and page.locator("header").get_by_text("测试用户").count() == 0,
    )

    # 4. 错误密码提示
    page.goto(BASE + "/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)  # 等待 React hydration 完成，避免填充被 hydration 重置
    page.fill('input[name="email"]', email)
    page.fill('input[name="password"]', "wrongpass1")
    page.get_by_role("button", name="登录", exact=True).click()
    page.wait_for_selector("text=邮箱或密码错误", timeout=8000)
    check("错误密码提示「邮箱或密码错误」", True)

    # 5. 正确密码登录（React 19 表单 action 完成后会重置表单，需重填全部字段）
    page.fill('input[name="email"]', email)
    page.fill('input[name="password"]', "password123")
    page.get_by_role("button", name="登录", exact=True).click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    check("正确密码登录成功", page.locator("header").get_by_text("测试用户").count() > 0)

    # 6. admin 种子账号登录
    page.get_by_role("button", name="退出").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    page.goto(BASE + "/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)  # 等待 React hydration 完成，避免填充被 hydration 重置
    page.fill('input[name="email"]', "admin@minimall.com")
    page.fill('input[name="password"]', "admin123")
    page.get_by_role("button", name="登录", exact=True).click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    check("admin 种子账号登录成功", page.locator("header").get_by_text("管理员").count() > 0)

    browser.close()

failed = [n for n, c in results if not c]
print(f"\n{len(results) - len(failed)}/{len(results)} 通过")
if failed:
    print("失败项:", failed)
    raise SystemExit(1)
