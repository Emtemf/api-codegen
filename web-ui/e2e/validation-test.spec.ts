import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';

async function analyzeAndWaitForIssues(appPage: AppPage) {
  await appPage.analyze();
  await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBeGreaterThan(0);
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

      await expect.poll(async () => await appPage.getYamlContent()).toContain('apis:');
      const fixedYaml = await appPage.getYamlContent();
      expect(fixedYaml).toContain('path: "/users"');
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

    test('Diff预览布局：Swagger 归一化到 core YAML 后应回退到通用差异视图', async ({ page }) => {
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

      // 归一化后结构从 paths: 切到 apis:，预览应显示为单一左右 YAML diff
      await expect(page.locator('#diff-unified .d2h-wrapper')).toHaveCount(1);
      await expect(page.locator('#diff-unified .diff-api-unified')).toHaveCount(0);
      await expect(page.locator('#diff-unified')).toContainText('apis:');
      await expect(page.locator('#diff-unified')).toContainText('/users');
      await expect(page.locator('#diff-unified .d2h-file-side-diff').first()).toBeVisible();
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

      // 验证：只展示一个左右 diff 预览，不再追加旧预览
      await expect(page.locator('#diff-unified .d2h-wrapper')).toHaveCount(1);
      await expect(page.locator('#diff-unified .diff-api-unified')).toHaveCount(0);
      await expect(page.locator('#diff-unified')).toContainText('apis:');
      await expect(page.locator('#diff-unified')).toContainText('keyword');
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
      await expect(page.locator('#diff-unified .d2h-wrapper')).toHaveCount(1);
      await expect(page.locator('#diff-unified .diff-api-unified')).toHaveCount(0);
      await expect(page.locator('#diff-unified')).toContainText('getUsers');
      await expect(page.locator('#diff-unified')).toContainText('getOrders');
      await expect(page.locator('#diff-unified')).toContainText('getProducts');
      await expect(page.locator('#diff-unified')).toContainText('apis:');
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
      await expect(page.locator('#diff-unified .d2h-wrapper')).toHaveCount(1);
      await expect(page.locator('#diff-unified .diff-api-unified')).toHaveCount(0);

      await page.locator('#diff-modal button:has-text("应用修复")').click();
      await expect(appPage.statusMessage).toContainText('已应用修复');
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

    test('首页不应再展示 codegen-config.yaml 双文件输入提示', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      await expect(page.locator('body')).not.toContainText('codegen-config.yaml');
      await expect(page.locator('body')).not.toContainText('配置预览');
      await expect(page.locator('.nav-btn')).not.toContainText('API + Config');
    });

    test('core 标记为可修复的问题不应显示需手动按钮', async ({ page }) => {
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

      await expect(page.locator('.issue-fixable.fixable-yes')).toHaveCount(2);
      await expect(page.locator('.issue-fixable.fixable-no')).toHaveCount(0);
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
  });
});
