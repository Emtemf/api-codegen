import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';

async function analyzeAndWaitForIssues(appPage: AppPage) {
  await appPage.analyze();
  await expect.poll(async () => (await appPage.getIssues()).length, { timeout: 20000 }).toBeGreaterThan(0);
  return appPage.getIssues();
}

test.describe('API Codegen Web UI - 校验规则测试', () => {

  test.describe('ERROR 级别校验', () => {

    test('DFX-001: 路径包含 // 应检测为错误', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Use actual double slash in path
      const yamlWithDoubleSlash = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /api//users:
    get:
      operationId: getUser
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithDoubleSlash);
      const issues = await analyzeAndWaitForIssues(appPage);

      const hasDoubleSlashIssue = issues.some((i: any) =>
        i.severity === 'error' && i.message.includes('路径不能包含重复斜杠')
      );
      expect(hasDoubleSlashIssue).toBe(true);
    });

    // 注意：/XXX/ 不再被视为错误，因为它是业务路径占位符
    // test('DFX-001: 路径包含 /XXX/ 占位符应检测为错误', ...);

    test('DFX-001: 路径包含 //XXX/ 组合应检测为 // 错误', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Use //XXX/ combination in path - should detect // error
      const yamlWithDoubleXXX = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  //XXXXX/services/web/message:
    get:
      operationId: getWebMessage
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithDoubleXXX);
      const issues = await analyzeAndWaitForIssues(appPage);

      // Check issue count shows error for // (not /XXX/)
      const hasDoubleSlashIssue = issues.some((i: any) =>
        i.severity === 'error' && i.message.includes('路径不能包含重复斜杠')
      );
      expect(hasDoubleSlashIssue).toBe(true);
    });

    test('DFX-003: 必填参数缺少 @NotNull 应检测', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithMissingValidation = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: userId
          in: query
          required: true
          schema:
            type: integer
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithMissingValidation);
      const issues = await analyzeAndWaitForIssues(appPage);

      // Should detect missing @NotNull validation
      const hasValidationIssue = issues.some((i: any) =>
        i.severity === 'error' && i.message.includes('@NotNull')
      );
      expect(hasValidationIssue).toBe(true);
    });

    test('DFX-004: String字段缺少长度校验应检测为警告', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithMissingLength = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /search:
    get:
      operationId: search
      parameters:
        - name: keyword
          in: query
          schema:
            type: string
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithMissingLength);
      const issues = await analyzeAndWaitForIssues(appPage);

      // Should detect missing length validation
      const hasLengthIssue = issues.some((i: any) =>
        i.severity === 'warn' && i.message.includes('String 字段缺少长度校验')
      );
      expect(hasLengthIssue).toBe(true);
    });

    test('DFX-009: minLength > maxLength 应检测为错误', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithInvalidRange = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /search:
    get:
      operationId: search
      parameters:
        - name: keyword
          in: query
          schema:
            type: string
            minLength: 100
            maxLength: 10
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithInvalidRange);
      const issues = await analyzeAndWaitForIssues(appPage);

      // Should detect minLength > maxLength error
      const hasRangeError = issues.some((i: any) =>
        i.severity === 'error' && i.message.includes('minLength 不能大于 maxLength')
      );
      expect(hasRangeError).toBe(true);
    });
  });

  test.describe('WARN 级别校验', () => {

    test('路径参数缺少最小长度校验应检测为警告', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithMissingPathValidation = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /users/{id}:
    get:
      operationId: getUsers
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithMissingPathValidation);
      const issues = await analyzeAndWaitForIssues(appPage);

      const hasPathValidationIssue = issues.some((i: any) =>
        i.severity === 'warn' && i.message.includes('路径参数缺少最小长度校验')
      );
      expect(hasPathValidationIssue).toBe(true);
    });
  });

  test.describe('INFO 级别校验（优化建议）', () => {

    test('邮箱字段建议添加 @Email 应显示为信息', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithEmailField = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /register:
    post:
      operationId: register
      parameters:
        - name: email
          in: query
          schema:
            type: string
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithEmailField);
      const issues = await analyzeAndWaitForIssues(appPage);

      const hasEmailSuggestion = issues.some((i: any) =>
        i.severity === 'info' && i.message.includes('邮箱字段建议添加 email 校验')
      );
      expect(hasEmailSuggestion).toBe(true);
    });

    test('生日字段建议添加 @Past 应显示为信息', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithBirthday = `
apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: birthday
          type: LocalDate
    response:
      className: CreateUserRsp
      fields:
        - name: success
          type: Boolean
`.trim();

      await appPage.setYamlContent(yamlWithBirthday);
      const issues = await analyzeAndWaitForIssues(appPage);

      const hasBirthdaySuggestion = issues.some((i: any) =>
        i.severity === 'info' && i.message.includes('生日字段建议添加 past 校验')
      );
      expect(hasBirthdaySuggestion).toBe(true);
    });
  });

  test.describe('自动修复功能', () => {

    test('选中建议后应用修复应更新编辑器并减少问题数', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithFixableIssues = `
apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: username
          type: String
          required: false
    response:
      className: CreateUserRsp
      fields:
        - name: success
          type: Boolean
`.trim();

      await appPage.setYamlContent(yamlWithFixableIssues);
      await appPage.analyzeButton.click();
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBeGreaterThan(0);

      const initialYaml = await appPage.getYamlContent();
      const initialIssueCount = await appPage.getIssueCount();
      expect(initialIssueCount).toBeGreaterThan(0);

      const firstIssueCheckbox = page.locator('#issue-list .issue input[type="checkbox"]').first();
      await expect(firstIssueCheckbox).toBeChecked();
      await firstIssueCheckbox.click();
      await expect(firstIssueCheckbox).not.toBeChecked();
      await firstIssueCheckbox.click();
      await expect(firstIssueCheckbox).toBeChecked();

      await appPage.autoFix();

      const diffModal = page.locator('#diff-modal');
      await expect(diffModal).toBeVisible({ timeout: 20000 });

      const applyFixButton = page.locator('#diff-modal button:has-text("应用修复")');
      await applyFixButton.click();
      await expect(diffModal).not.toBeVisible();

      await expect.poll(async () => await appPage.getYamlContent()).not.toBe(initialYaml);
      const updatedYaml = await appPage.getYamlContent();
      expect(updatedYaml).toContain('validation:');
      expect(updatedYaml).toContain('minLength: 1');
      expect(updatedYaml).toContain('maxLength: 255');
      expect(updatedYaml).not.toBe(initialYaml);

      await expect.poll(async () => await appPage.getIssueCount()).toBeLessThan(initialIssueCount);
    });

    test('路径重复斜杠应用修复后重新分析不应再次报错', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithDoubleSlash = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  //users:
    get:
      operationId: getUsers
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithDoubleSlash);
      await appPage.analyze();
      await expect.poll(async () => {
        const issues = await appPage.getIssues();
        return issues.some((issue: any) => issue.message.includes('路径不能包含重复斜杠'));
      }, { timeout: 20000 }).toBe(true);

      await appPage.autoFix();

      const diffModal = page.locator('#diff-modal');
      await expect(diffModal).toBeVisible({ timeout: 20000 });

      const applyFixButton = page.locator('#diff-modal button:has-text("应用修复")');
      await applyFixButton.click();
      await expect(diffModal).not.toBeVisible();

      await expect.poll(async () => await appPage.getYamlContent()).toContain('paths:');
      const fixedYaml = await appPage.getYamlContent();
      expect(fixedYaml).toContain('/users:');
      expect(fixedYaml).not.toContain('apis:');
      expect(fixedYaml).not.toContain('//users');

      await appPage.analyze();
      await page.waitForTimeout(1000);

      const remainingIssues = await appPage.getIssues();
      expect(remainingIssues.some((issue: any) => issue.message.includes('路径不能包含重复斜杠'))).toBe(false);
      expect(await appPage.getIssueCount()).toBeGreaterThanOrEqual(0);
    });

    test('应能修复路径 // 问题', async ({ page }) => {
      // Collect console logs
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        consoleLogs.push(msg.text());
      });

      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Use // in path (double slash)
      const yamlWithDoubleSlash = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /api//users/detail:
    get:
      operationId: getUser
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithDoubleSlash);
      await page.waitForTimeout(500);

      // Click analyze button
      await appPage.analyzeButton.click();
      await page.waitForTimeout(2000);

      // Check that issues are detected
      const issueCount = await appPage.getIssueCount();
      expect(issueCount).toBeGreaterThan(0);

      // Call autoFix directly via evaluate with timeout
      await Promise.race([
        page.evaluate(() => {
          (window as any).autoFix();
        }),
        page.waitForTimeout(8000)
      ]);

      await page.waitForTimeout(1000);

      // Should show diff preview
      const diffModal = page.locator('.diff-modal');
      await diffModal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
      const hasDiffModal = await diffModal.isVisible().catch(() => false);
      expect(hasDiffModal).toBe(true);
    });

    test('Diff预览布局：Swagger 自动修复预览应保持 Swagger 结构而不是泄漏 core YAML', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // 测试路径修复场景：//users -> /users（重复斜杠修复）
      const yamlWithPathFix = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  //users:
    get:
      operationId: getUsers
      summary: 获取用户列表
      parameters:
        - name: page
          in: query
          required: true
          schema:
            type: integer
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithPathFix);
      await appPage.analyzeButton.click();
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBeGreaterThan(0);

      // 调用自动修复
      await page.evaluate(() => { (window as any).autoFix(); });

      // 验证 diff modal 显示
      const diffModal = page.locator('.diff-modal');
      await diffModal.waitFor({ state: 'visible', timeout: 20000 });
      expect(await diffModal.isVisible()).toBe(true);

      // 预览应保持 Swagger 结构，不应泄漏 core 的 apis YAML
      await expect(page.locator('#diff-unified #diff-monaco-root')).toHaveCount(1);
      await expect(page.locator('#diff-unified .monaco-diff-editor')).toHaveCount(1);
      await expect(page.locator('#diff-unified .d2h-wrapper')).toHaveCount(0);
      await expect(page.locator('#diff-unified .diff-api-unified')).toHaveCount(0);
      await expect(page.locator('#diff-unified')).not.toContainText('apis:');
    });

    test('Diff预览布局：仅缩进差异不应被渲染为可见变更', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const before = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /users:
    get:
      operationId: getUsers
`.trim();

      const after = `
swagger: "2.0"
info:
 title: Test API
 version: "1.0"
paths:
 /users:
   get:
     operationId: getUsers
`.trim();

      await page.evaluate(({ beforeYaml, afterYaml }) => {
        (window as any).showDiffPreview(beforeYaml, afterYaml);
      }, { beforeYaml: before, afterYaml: after });

      await expect(page.locator('#diff-modal')).toBeVisible({ timeout: 20000 });
      await expect(page.locator('#diff-unified .diff-no-changes')).toBeVisible();
      await expect(page.locator('#diff-unified .d2h-wrapper')).toHaveCount(0);
      await expect(page.locator('#diff-unified #diff-monaco-root')).toHaveCount(0);
      await expect(page.locator('#diff-unified')).toContainText('没有需要修复的问题');
      await expect(page.locator('#diff-adds')).toHaveText('0 处修改');
      await expect(page.locator('#diff-removes')).toHaveText('0 处删除');
    });

    test('Diff预览布局：不应有重复的参数表格', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // 使用有 // 路径问题的 YAML（这种问题会被自动修复）
      const yamlWithParams = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  //users:
    get:
      operationId: getUsers
      summary: 获取用户列表
      parameters:
        - name: keyword
          in: query
          required: true
          schema:
            type: string
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithParams);
      await appPage.analyzeButton.click();
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBeGreaterThan(0);

      await page.evaluate(() => { (window as any).autoFix(); });

      // 验证：统一视图显示
      const diffModal = page.locator('.diff-modal');
      await diffModal.waitFor({ state: 'visible', timeout: 20000 });
      expect(await diffModal.isVisible()).toBe(true);
      await expect(page.locator('.diff-container.diff-container-compact')).toHaveCount(1);

      // 验证：只展示一个左右 diff 预览，不再追加旧预览
      await expect(page.locator('#diff-unified #diff-monaco-root')).toHaveCount(1);
      await expect(page.locator('#diff-unified .monaco-diff-editor')).toHaveCount(1);
      await expect(page.locator('#diff-unified .d2h-wrapper')).toHaveCount(0);
      await expect(page.locator('#diff-unified .diff-api-unified')).toHaveCount(0);
      await expect(page.locator('#diff-unified')).not.toContainText('apis:');
      await expect(page.locator('#diff-unified .diff-param-table')).toHaveCount(0);
    });

    test('Diff预览布局：多个 Swagger API 归一化后仍应展示差异内容', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // 测试多个 API 有 // 路径问题（会被自动修复）
      const yamlWithMultipleApis = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  //users:
    get:
      operationId: getUsers
      summary: 获取用户
      responses:
        200:
          description: Success
  //orders:
    get:
      operationId: getOrders
      summary: 获取订单
      responses:
        200:
          description: Success
  //products:
    get:
      operationId: getProducts
      summary: 获取产品
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithMultipleApis);
      await appPage.analyzeButton.click();
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBeGreaterThan(0);

      await page.evaluate(() => { (window as any).autoFix(); });
      await expect(page.locator('.diff-modal')).toBeVisible({ timeout: 20000 });

      // 验证：统一视图仍能展示差异，且只保留左右 diff
      await expect(page.locator('#diff-unified #diff-monaco-root')).toHaveCount(1);
      await expect(page.locator('#diff-unified .monaco-diff-editor')).toHaveCount(1);
      await expect(page.locator('#diff-unified .d2h-wrapper')).toHaveCount(0);
      await expect(page.locator('#diff-unified .diff-api-unified')).toHaveCount(0);
      await expect(page.locator('#diff-unified')).not.toContainText('apis:');
    });

    test('非法范围问题应只保留可修复项，并在应用修复后消失', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const invalidRangeYaml = `
swagger: "2.0"
info:
  title: Invalid Range API
  version: "1.0"
paths:
  /invalid-length:
    get:
      operationId: searchInvalidLength
      parameters:
        - name: keyword
          in: query
          schema:
            type: string
            minLength: 100
            maxLength: 10
      responses:
        200:
          description: Success
  /invalid-range:
    get:
      operationId: queryInvalidRange
      parameters:
        - name: age
          in: query
          schema:
            type: integer
            minimum: 100
            maximum: 10
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(invalidRangeYaml);
      await appPage.analyze();
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBe(2);

      await expect(page.locator('.issue-fixable.fixable-yes')).toHaveCount(2);
      await expect(page.locator('.issue-fixable.fixable-no')).toHaveCount(0);

      await appPage.autoFix();
      await expect(page.locator('#diff-modal')).toBeVisible({ timeout: 20000 });
      await expect(page.locator('#diff-unified #diff-monaco-root')).toHaveCount(1);
      await expect(page.locator('#diff-unified .monaco-diff-editor')).toHaveCount(1);
      await expect(page.locator('#diff-unified .d2h-wrapper')).toHaveCount(0);
      await expect(page.locator('#diff-unified .diff-api-unified')).toHaveCount(0);
      await expect(page.locator('#diff-unified')).not.toContainText('apis:');

      await page.locator('#diff-modal button:has-text("应用修复")').click();
      await expect(appPage.statusMessage).toContainText('已应用修复');
      await expect.poll(async () => await appPage.getYamlContent()).toContain('paths:');
      await expect.poll(async () => await appPage.getYamlContent()).not.toContain('apis:');
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBe(0);
    });
  });

  test.describe('自定义注解', () => {

    test('应能解析 x-java-class-annotations', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithClassAnnotations = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /admin/users:
    x-java-class-annotations:
      - "@Secured"
      - "@AuditLog"
    get:
      operationId: getAdminUsers
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithClassAnnotations);
      await appPage.analyzeButton.click();
      await page.waitForTimeout(500);

      // Should not crash - just analyze
      const issueCount = await appPage.getIssueCount();
      expect(issueCount).toBeGreaterThanOrEqual(0);
    });

    test('应能解析 x-java-method-annotations', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithMethodAnnotations = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /users/{id}:
    get:
      operationId: getUserById
      x-java-method-annotations:
        - "@Permission('user:read')"
        - "@Cacheable"
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithMethodAnnotations);
      await appPage.analyzeButton.click();
      await page.waitForTimeout(500);

      // Should not crash - just analyze
      const issueCount = await appPage.getIssueCount();
      expect(issueCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Contract 收敛', () => {

    test('首页不应再展示双文件输入提示', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const bodyText = await page.locator('body').textContent();
      expect(bodyText || '').not.toContain('第二份配置文件');
      expect(bodyText || '').not.toContain('配置预览');
      expect(bodyText || '').not.toContain('API + Config');
    });

    test('core 返回 fixable 元数据时 UI 应分别展示可修复与需手动入口', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithFixableIssues = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /users/{id}:
    get:
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithFixableIssues);
      await appPage.analyze();
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBeGreaterThan(0);

      await expect(page.locator('.issue-fixable.fixable-yes')).toHaveCount(1);
      await expect(page.locator('.issue-fixable.fixable-no')).toHaveCount(1);
    });

    test('annotations 扩展字段不应让前端额外制造需手动问题', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithAnnotations = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /inconsistent:
    x-java-class-annotations:
      - "@Secured"
    get:
      summary: 获取资源
      operationId: getInconsistent
      x-java-class-annotations:
        - "@DifferentAnnotation"
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithAnnotations);
      await appPage.analyze();
      await page.waitForTimeout(1000);

      await expect(page.locator('.issue-fixable.fixable-no')).toHaveCount(0);
    });

    test('无法定位的语法错误应显示静态人工处理提示而不是可点击需手动', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const invalidYaml = `
apis:
  - name: broken
    path: /broken
    method: GET
    request:
      className: BrokenReq
      fields:
        - name: keyword
          type: String
          validation:
            minLength: [1
`.trim();

      await appPage.setYamlContent(invalidYaml);
      await appPage.analyze();
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBeGreaterThan(0);

      await expect(page.locator('.issue-fixable.fixable-no')).toHaveCount(0);
      await expect(page.locator('.issue-fixable.fixable-manual-static')).toHaveCount(1);
      await expect(page.locator('.issue-fixable.fixable-manual-static')).toContainText('需人工处理');
    });

    test('仅剩手动问题时不应显示误导性的选中计数，自动修复应明确提示无可修复项', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const invalidYaml = `
apis:
  - name: broken
    path: /broken
    method: GET
    request:
      className: BrokenReq
      fields:
        - name: keyword
          type: String
          validation:
            minLength: [1
`.trim();

      await appPage.setYamlContent(invalidYaml);
      await appPage.analyze();
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBeGreaterThan(0);

      await expect(page.locator('#issue-count')).not.toContainText('/');
      await expect(page.locator('.issue-fixable.fixable-yes')).toHaveCount(0);
      await expect(page.locator('#selected-issue-summary')).toContainText('已选手动处理项 1/1');
      await appPage.autoFix();
      await expect(appPage.statusMessage).toContainText('当前没有可自动修复的问题，剩余 1 个问题需手动处理');
      await expect(page.locator('#diff-modal')).not.toBeVisible();
    });

    test('Swagger 二次分析仅剩手动问题时应明确展示手动处理数量', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const response = await page.request.get('/swagger2-example.yaml');
      const yaml = await response.text();
      await appPage.setYamlContent(yaml);

      await appPage.analyze();
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBeGreaterThan(0);
      const initialSummaryText = await page.locator('#selected-issue-summary').textContent() || '';
      const initialAutoFixMatch = initialSummaryText.match(/已选自动修复项\s+(\d+)\/(\d+)/);
      expect(initialAutoFixMatch).not.toBeNull();
      const initialAutoFixCount = Number(initialAutoFixMatch![1]);
      expect(initialAutoFixCount).toBeGreaterThan(0);
      await expect(page.locator('#selected-issue-summary')).toContainText('手动项将在自动修复后重新计算');
      await expect(page.locator('.issue-select-all-meta')).toHaveCount(1);
      await expect(page.locator('.issue-select-all-legend')).toHaveCount(1);

      await appPage.autoFix();
      await expect(page.locator('#diff-modal')).toBeVisible({ timeout: 20000 });
      await page.locator('#diff-modal button:has-text("应用修复")').click();
      await expect(page.locator('#diff-modal')).not.toBeVisible();

      await expect.poll(async () => {
        const statusText = await appPage.statusMessage.textContent() || '';
        const match = statusText.match(/剩余\s+(\d+)\s+个问题需手动处理/);
        return match ? Number(match[1]) : 0;
      }, { timeout: 20000 }).toBeGreaterThan(0);

      const statusText = await appPage.statusMessage.textContent() || '';
      const remainingMatch = statusText.match(/剩余\s+(\d+)\s+个问题需手动处理/);
      expect(remainingMatch).not.toBeNull();
      const remainingIssueCount = Number(remainingMatch![1]);

      const manualSummaryText = await page.locator('#selected-issue-summary').textContent() || '';
      const manualSummaryMatch = manualSummaryText.match(/已选手动处理项\s+(\d+)\/(\d+)/);
      expect(manualSummaryMatch).not.toBeNull();
      const manualEntryCount = Number(manualSummaryMatch![2]);

      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBe(remainingIssueCount);
      await expect(appPage.statusMessage).toContainText(`自动修复 ${initialAutoFixCount} 项`);
      await expect(page.locator('#issue-count')).toContainText(`总 ${remainingIssueCount}`);
      await expect(page.locator('#selected-issue-summary')).toContainText(`已选手动处理项 ${manualEntryCount}/${manualEntryCount}`);
      await expect(appPage.autoFixButton).toContainText('自动修复 (0)');
      await expect(page.locator('#issue-list .issue')).toHaveCount(manualEntryCount);
      await expect(page.locator('.issue-fixable.fixable-no')).toHaveCount(manualEntryCount);
      await expect(page.locator('.issue-fixable.fixable-manual-linked')).toHaveCount(0);
      await expect(page.locator('#issue-list')).not.toContainText('存在循环引用');

      await appPage.autoFix();
      await expect(appPage.statusMessage).toContainText(`当前没有可自动修复的问题，剩余 ${remainingIssueCount} 个问题需手动处理`);
      await expect(page.locator('#diff-modal')).not.toBeVisible();
    });

    test('core 提供 locator 的人工问题应支持点击定位', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const invalidCustomYaml = `
apis:
  - name: createUser
    path: api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: username
          type: String
`.trim();

      await appPage.setYamlContent(invalidCustomYaml);
      await appPage.analyze();
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBeGreaterThan(0);

      const manualButton = page.locator('.issue-fixable.fixable-no').first();
      await expect(manualButton).toHaveCount(1);
      await manualButton.click();
      await expect(appPage.statusMessage).toContainText('已跳转到位置，行 3');
    });

    test('Swagger 手动问题应支持补全类型和长度并自动重新分析', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const swaggerYaml = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /users/detail:
    get:
      operationId: getUserDetail
      parameters:
        - name: id
          in: query
          required: true
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(swaggerYaml);
      await appPage.analyze();
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBe(2);
      await expect(page.locator('#issue-list .issue')).toHaveCount(1);
      await expect(page.locator('.issue-fixable.fixable-yes')).toHaveCount(0);
      await expect(page.locator('.issue-fixable.fixable-no')).toHaveCount(1);
      await expect(page.locator('.issue-fixable.fixable-no')).toContainText('需手动');
      await expect(page.locator('.issue-fixable.fixable-manual-linked')).toHaveCount(0);
      await expect(page.locator('#issue-list .issue').first()).toContainText('必填字段缺少 @NotNull/@NotBlank 校验');
      await expect(page.locator('#issue-list .issue').first()).toContainText('String 字段缺少长度校验');

      const manualButton = page.locator('.issue-fixable.fixable-no').first();
      await manualButton.click();

      await expect(page.locator('#manual-fix-modal')).toBeVisible();
      await expect(page.locator('#manual-fix-title')).toContainText('getUserDetail');
      await expect(page.locator('#manual-fix-subtitle')).toContainText('当前字段关联 2 个问题');
      await expect(page.locator('#manual-fix-type')).toHaveValue('string');
      await expect(page.locator('#manual-fix-min')).toHaveValue('1');
      await expect(page.locator('#manual-fix-max')).toHaveValue('255');

      await page.locator('#manual-fix-max').fill('64');
      await page.locator('#manual-fix-apply').click();

      await expect(page.locator('#manual-fix-modal')).not.toBeVisible();
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBe(0);

      const updatedYaml = await appPage.getYamlContent();
      expect(updatedYaml).not.toContain('schema:');
      expect(updatedYaml).toContain('in: query');
      expect(updatedYaml).toContain('type: string');
      expect(updatedYaml).toContain('minLength: 1');
      expect(updatedYaml).toContain('maxLength: 64');
      await expect(appPage.statusMessage).toContainText('已应用手动补全并重新分析');
      await expect(appPage.statusMessage).toContainText('已同时处理 2 个关联问题');
    });

    test('手动补全弹窗打开后不应再滚动底层页面', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 560 });
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const swaggerYaml = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /users/detail:
    get:
      operationId: getUserDetail
      parameters:
        - name: id
          in: query
          required: true
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(swaggerYaml);
      await appPage.analyze();
      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBe(2);

      await page.mouse.wheel(0, 1200);
      await page.waitForFunction(() => window.scrollY > 0, null, { timeout: 5000 });

      await page.locator('.issue-fixable.fixable-no').click();
      await expect(page.locator('#manual-fix-modal')).toBeVisible();

      await expect.poll(async () => {
        return await page.evaluate(() => ({
          htmlLocked: document.documentElement.classList.contains('manual-fix-open'),
          bodyLocked: document.body.classList.contains('manual-fix-open'),
          preservedScrollY: Number(document.body.dataset.manualFixScrollY || '0'),
          bodyTop: document.body.style.top
        }));
      }).toEqual(expect.objectContaining({
        htmlLocked: true,
        bodyLocked: true,
        bodyTop: expect.stringMatching(/-\d+px/)
      }));
      const lockedState = await page.evaluate(() => ({
        preservedScrollY: Number(document.body.dataset.manualFixScrollY || '0'),
        bodyTop: document.body.style.top
      }));
      expect(lockedState.preservedScrollY).toBeGreaterThan(0);

      await page.locator('.manual-fix-container').hover();
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(200);

      const afterLockState = await page.evaluate(() => ({
        preservedScrollY: Number(document.body.dataset.manualFixScrollY || '0'),
        bodyTop: document.body.style.top
      }));
      expect(afterLockState.preservedScrollY).toBe(lockedState.preservedScrollY);
      expect(afterLockState.bodyTop).toBe(lockedState.bodyTop);

      await page.locator('.manual-fix-footer .btn-secondary').click();
      await expect(page.locator('#manual-fix-modal')).not.toBeVisible();
      await expect.poll(async () => {
        return await page.evaluate(() => ({
          htmlLocked: document.documentElement.classList.contains('manual-fix-open'),
          bodyLocked: document.body.classList.contains('manual-fix-open')
        }));
      }).toEqual({ htmlLocked: false, bodyLocked: false });
    });

    test('关联手动问题重渲染时应始终保留一个主入口', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      await page.evaluate(() => {
        const issues = [
          {
            severity: 'warn',
            message: 'String 字段缺少长度校验',
            line: 0,
            api: 'getUserDetail',
            field: 'request.Request.id',
            rule: 'DFX-004',
            ruleCode: 'DFX-004',
            key: 'warn-1',
            fixable: false,
            locator: {
              kind: 'swagger-field',
              apiName: 'getUserDetail',
              path: '/users/detail',
              method: 'GET',
              section: 'request',
              className: 'Request',
              fieldName: 'id',
              property: 'validation'
            }
          },
          {
            severity: 'error',
            message: '必填字段缺少 @NotNull/@NotBlank 校验',
            line: 0,
            api: 'getUserDetail',
            field: 'request.Request.id',
            rule: 'DFX-003',
            ruleCode: 'DFX-003',
            key: 'error-1',
            fixable: false,
            locator: {
              kind: 'swagger-field',
              apiName: 'getUserDetail',
              path: '/users/detail',
              method: 'GET',
              section: 'request',
              className: 'Request',
              fieldName: 'id',
              property: 'validation'
            }
          }
        ];
        (window as any).renderIssues(issues);
      });

      await expect(page.locator('#issue-list .issue')).toHaveCount(1);
      await expect(page.locator('.issue-fixable.fixable-no')).toHaveCount(1);
      await expect(page.locator('.issue-fixable.fixable-no')).toContainText('需手动 (2)');
      await expect(page.locator('.issue-fixable.fixable-manual-linked')).toHaveCount(0);
      await expect(page.locator('#issue-list .issue').first()).toContainText('必填字段缺少 @NotNull/@NotBlank 校验');
      await expect(page.locator('#issue-list .issue').first()).toContainText('String 字段缺少长度校验');
    });
  });
});
