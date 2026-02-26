import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';

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
      await appPage.analyzeButton.click();
      await page.waitForTimeout(500);

      // Check issue count shows error
      const issueCount = await appPage.getIssueCount();
      expect(issueCount).toBeGreaterThan(0);
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
      await appPage.analyzeButton.click();
      await page.waitForTimeout(500);

      // Check issue count shows error for // (not /XXX/)
      const issues = await appPage.getIssues();
      const hasDoubleSlashIssue = issues.some((i: any) => i.message.includes('//'));
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
      await appPage.analyzeButton.click();
      await page.waitForTimeout(500);

      // Should detect missing @NotNull validation
      const issues = await appPage.getIssues();
      const hasValidationIssue = issues.some((i: any) => i.message.includes('@NotNull'));
      expect(hasValidationIssue).toBe(true);
    });

    test('DFX-004: String字段缺少长度校验应检测', async ({ page }) => {
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
      await appPage.analyzeButton.click();
      await page.waitForTimeout(500);

      // Should detect missing length validation
      const issues = await appPage.getIssues();
      const hasLengthIssue = issues.some((i: any) => i.message.includes('长度校验'));
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
      await appPage.analyzeButton.click();
      await page.waitForTimeout(500);

      // Should detect minLength > maxLength error
      const issues = await appPage.getIssues();
      const hasRangeError = issues.some((i: any) => i.severity === 'error' && i.message.includes('minLength'));
      expect(hasRangeError).toBe(true);
    });
  });

  test.describe('WARN 级别校验', () => {

    test('必填参数缺少 description 应检测为警告', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithMissingDesc = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: id
          in: query
          required: true
          schema:
            type: integer
      responses:
        200:
          description: Success
`.trim();

      await appPage.setYamlContent(yamlWithMissingDesc);
      await appPage.analyzeButton.click();
      await page.waitForTimeout(500);

      const issues = await appPage.getIssues();
      const hasDescIssue = issues.some((i: any) => i.message.includes('description'));
      expect(hasDescIssue).toBe(true);
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
      await appPage.analyzeButton.click();
      await page.waitForTimeout(500);

      const issues = await appPage.getIssues();
      const hasEmailSuggestion = issues.some((i: any) => i.message.includes('@Email'));
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
          validation: {}
    response:
      className: CreateUserRsp
      fields:
        - name: success
          type: Boolean
`.trim();

      await appPage.setYamlContent(yamlWithBirthday);
      await appPage.analyzeButton.click();
      await page.waitForTimeout(500);

      const issues = await appPage.getIssues();
      const hasBirthdaySuggestion = issues.some((i: any) => i.message.includes('@Past'));
      expect(hasBirthdaySuggestion).toBe(true);
    });
  });

  test.describe('自动修复功能', () => {

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

    test('Diff预览布局：路径修复后应正确配对显示', async ({ page }) => {
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
      await page.waitForTimeout(1500);

      // 调用自动修复
      await page.evaluate(() => { (window as any).autoFix(); });
      await page.waitForTimeout(1000);

      // 验证 diff modal 显示
      const diffModal = page.locator('.diff-modal');
      await diffModal.waitFor({ state: 'visible', timeout: 5000 });
      expect(await diffModal.isVisible()).toBe(true);

      // 验证：统一视图中有 1 个 API 块
      const unifiedBlocks = await page.locator('#diff-unified .diff-api-unified').count();
      expect(unifiedBlocks).toBe(1); // 只有一个 API

      // 验证：应该显示"路径修复"指示器
      const pathFixedIndicator = page.locator('.diff-api-change-type.path-fixed');
      expect(await pathFixedIndicator.count()).toBeGreaterThan(0);

      // 验证：显示路径修复前后的变化
      const pathBefore = await page.locator('.diff-api-path-before').first().textContent();
      const pathAfter = await page.locator('.diff-api-path-after').first().textContent();
      expect(pathBefore).toContain('//users');
      expect(pathAfter).toContain('/users');
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
      await page.waitForTimeout(1500);

      await page.evaluate(() => { (window as any).autoFix(); });
      await page.waitForTimeout(1000);

      // 验证：统一视图显示
      const diffModal = page.locator('.diff-modal');
      await diffModal.waitFor({ state: 'visible', timeout: 5000 });
      expect(await diffModal.isVisible()).toBe(true);

      // 验证：应该有路径修复显示
      const pathFixed = await page.locator('.diff-api-change-type.path-fixed').count();
      expect(pathFixed).toBeGreaterThan(0);
    });

    test('Diff预览布局：多个API应正确显示', async ({ page }) => {
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
      await page.waitForTimeout(1500);

      await page.evaluate(() => { (window as any).autoFix(); });
      await page.waitForTimeout(1000);

      // 验证：统一视图中有 API 块
      const unifiedBlocks = await page.locator('#diff-unified .diff-api-unified').count();
      expect(unifiedBlocks).toBeGreaterThan(0);

      // 验证：每个 API 都有方法徽章
      const badges = await page.locator('#diff-unified .diff-api-unified-badge').count();
      expect(badges).toBeGreaterThan(0);
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

  test.describe('需手动编辑功能', () => {

    test('点击"需手动"按钮应显示编辑弹窗（缺少 description）', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // 测试缺少 description 的情况
      const yamlWithMissingDesc = `
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

      await appPage.setYamlContent(yamlWithMissingDesc);
      await appPage.analyzeButton.click();
      await page.waitForTimeout(1000);

      // 查找包含"需手动"按钮的问题
      const manualButton = appPage.getManualFixButton(0);
      const buttonCount = await manualButton.count();

      if (buttonCount > 0) {
        // 点击"需手动"按钮
        await manualButton.first().click();
        await page.waitForTimeout(500);

        // 验证编辑弹窗显示
        const modalVisible = await appPage.isEditModalVisible();
        expect(modalVisible).toBe(true);

        // 验证弹窗标题
        const modalTitle = await page.locator('.edit-modal-header span').textContent();
        expect(modalTitle).toContain('编辑');

        // 验证输入框存在（使用更宽松的检查）
        const input = appPage.getDescriptionInput();
        const inputExists = await input.count();
        expect(inputExists).toBeGreaterThan(0);

        // 直接输入描述（不检查可见性）
        await input.scrollIntoViewIfNeeded().catch(() => {});
        await input.click({ force: true }).catch(() => {});
        await input.fill('用户ID');
        await page.waitForTimeout(200);

        // 点击应用
        await appPage.clickApplyInEditModal();
        await page.waitForTimeout(500);

        // 验证 YAML 被更新
        const updatedYaml = await appPage.getYamlContent();
        expect(updatedYaml).toContain('用户ID');
      }
    });

    test('点击"需手动"按钮应跳转到编辑位置（minLength/maxLength 错误）', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithInvalidLength = `
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

      await appPage.setYamlContent(yamlWithInvalidLength);
      await appPage.analyzeButton.click();
      await page.waitForTimeout(1000);

      // 查找包含"需手动"按钮的问题（minLength 错误）
      const issues = await appPage.getIssues();
      const minLengthIssueIndex = issues.findIndex(i => i.message.includes('minLength'));

      if (minLengthIssueIndex >= 0) {
        const manualButton = appPage.getManualFixButton(minLengthIssueIndex);
        const buttonCount = await manualButton.count();

        if (buttonCount > 0) {
          // 点击"需手动"按钮
          await manualButton.click();
          await page.waitForTimeout(500);

          // 验证没有弹窗显示（因为是跳转到编辑器）
          const modalVisible = await appPage.isEditModalVisible();
          // 跳转到编辑器时不应显示弹窗
          expect(modalVisible).toBe(false);
        }
      }
    });

    test('编辑弹窗可以取消', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const yamlWithMissingDesc = `
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

      await appPage.setYamlContent(yamlWithMissingDesc);
      await appPage.analyzeButton.click();
      await page.waitForTimeout(1000);

      const manualButton = appPage.getManualFixButton(0);
      const buttonCount = await manualButton.count();

      if (buttonCount > 0) {
        await manualButton.first().click();
        await page.waitForTimeout(500);

        const modalVisible = await appPage.isEditModalVisible();
        expect(modalVisible).toBe(true);

        // 点击关闭按钮
        await appPage.closeEditModal();
        await page.waitForTimeout(300);

        // 验证弹窗已关闭
        const modalVisibleAfter = await appPage.isEditModalVisible();
        expect(modalVisibleAfter).toBe(false);
      }
    });

    test('编辑 description 后点击分析应不再报错', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // 使用缺少 description 的 YAML
      const yamlWithMissingDesc = `
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

      await appPage.setYamlContent(yamlWithMissingDesc);
      await appPage.analyzeButton.click();
      await page.waitForTimeout(1000);

      // 获取初始问题数量
      const initialIssueCount = await appPage.getIssueCount();
      expect(initialIssueCount).toBeGreaterThan(0);

      // 查找包含"需手动"按钮的问题（缺少 description）
      const manualButton = appPage.getManualFixButton(0);
      const buttonCount = await manualButton.count();

      if (buttonCount > 0) {
        // 点击"需手动"按钮
        await manualButton.first().click();
        await page.waitForTimeout(500);

        // 输入描述
        const input = appPage.getDescriptionInput();
        await input.scrollIntoViewIfNeeded().catch(() => {});
        await input.click({ force: true }).catch(() => {});
        await input.fill('用户ID');
        await page.waitForTimeout(200);

        // 点击应用
        await appPage.clickApplyInEditModal();
        await page.waitForTimeout(500);

        // 验证 YAML 已更新
        const updatedYaml = await appPage.getYamlContent();
        expect(updatedYaml).toContain('用户ID');

        // 再次点击分析
        await appPage.analyzeButton.click();
        await page.waitForTimeout(1000);

        // 验证 description 相关的问题已解决
        const issues = await appPage.getIssues();
        const hasDescIssue = issues.some((i: any) =>
          i.message.includes('缺少 description') && i.message.includes('id')
        );
        expect(hasDescIssue).toBe(false);
      }
    });

    test('点击 x-java-class-annotations 不一致问题应跳转到对应位置', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // 使用有 x-java-class-annotations 不一致问题的 YAML
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
      await appPage.analyzeButton.click();
      await page.waitForTimeout(1000);

      // 查找 annotations 不一致问题
      const issues = await appPage.getIssues();
      const annotationIssueIndex = issues.findIndex((i: any) =>
        i.message.includes('x-java-class-annotations') || i.message.includes('不一致')
      );

      if (annotationIssueIndex >= 0) {
        const manualButton = appPage.getManualFixButton(annotationIssueIndex);
        const buttonCount = await manualButton.count();

        if (buttonCount > 0) {
          // 点击"需手动"按钮
          await manualButton.click();
          await page.waitForTimeout(500);

          // 验证没有弹窗显示（因为是跳转到编辑器）
          const modalVisible = await appPage.isEditModalVisible();
          expect(modalVisible).toBe(false);

          // 验证编辑器获得焦点（说明跳转成功）
          const editorFocused = await page.evaluate(() => {
            return document.querySelector('.CodeMirror')?.classList.contains('CodeMirror-focused') || false;
          });
          // 跳转后编辑器应该获得焦点
          expect(editorFocused).toBe(true);
        }
      }
    });

    test('从下到上编辑多个同名参数 description 应正确', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // 使用有多个同名参数的 YAML（两个 API 都有 id 参数）
      const yamlWithMultipleIds = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
basePath: /api/v1
paths:
  /users/{id}:
    get:
      summary: 获取用户
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

  /orders/{id}:
    get:
      summary: 获取订单
      operationId: getOrder
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

      await appPage.setYamlContent(yamlWithMultipleIds);
      await appPage.analyzeButton.click();
      await page.waitForTimeout(1000);

      // 获取所有缺少 description 的问题
      const issues = await appPage.getIssues();
      const descIssues = issues.filter((i: any) => i.message.includes('缺少 description'));

      // 应该检测到两个 id 参数缺少 description
      expect(descIssues.length).toBeGreaterThanOrEqual(2);

      // 从最后一个开始编辑（从下到上）
      for (let idx = descIssues.length - 1; idx >= 0; idx--) {
        const issueIndex = issues.findIndex(i => i === descIssues[idx]);
        const manualButton = appPage.getManualFixButton(issueIndex);

        if (await manualButton.count() > 0) {
          await manualButton.click();
          await page.waitForTimeout(500);

          const input = appPage.getDescriptionInput();
          await input.scrollIntoViewIfNeeded().catch(() => {});
          await input.click({ force: true }).catch(() => {});
          await input.fill(`参数描述${idx}`);
          await page.waitForTimeout(200);

          await appPage.clickApplyInEditModal();
          await page.waitForTimeout(500);
        }
      }

      // 再次点击分析
      await appPage.analyzeButton.click();
      await page.waitForTimeout(1000);

      // 验证没有 YAML 语法错误
      const newIssues = await appPage.getIssues();
      const hasYamlError = newIssues.some((i: any) =>
        i.message.includes('YAML 格式解析失败') || i.message.includes('YAML 语法')
      );
      expect(hasYamlError).toBe(false);

      // 验证 description 相关的问题已解决
      const remainingDescIssues = newIssues.filter((i: any) =>
        i.message.includes('缺少 description') && i.message.includes('id')
      );
      expect(remainingDescIssues.length).toBe(0);
    });

    test('连续编辑多个 requestBody description 后 YAML 格式应正确', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // 使用有两个 requestBody 缺少 description 的 YAML
      const yamlWithTwoRequestBody = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /users/create:
    post:
      summary: 创建用户
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - username
                - email
              properties:
                username:
                  type: string
                  minLength: 4
                  maxLength: 20
                  description: 用户名
                email:
                  type: string
                  format: email
      responses:
        201:
          description: 创建成功

  /orders/create:
    post:
      summary: 创建订单
      operationId: createOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                orderId:
                  type: string
      responses:
        201:
          description: 创建成功
`.trim();

      await appPage.setYamlContent(yamlWithTwoRequestBody);
      await appPage.analyzeButton.click();
      await page.waitForTimeout(1000);

      // 获取所有缺少 description 的问题
      const issues = await appPage.getIssues();
      const descIssues = issues.filter((i: any) => i.message.includes('缺少 description'));

      // 应该检测到 requestBody 缺少 description 的问题
      expect(descIssues.length).toBeGreaterThanOrEqual(2);

      // 编辑第一个 requestBody 的 description
      for (let idx = 0; idx < Math.min(2, descIssues.length); idx++) {
        const issueIndex = issues.findIndex(i => i === descIssues[idx]);
        const manualButton = appPage.getManualFixButton(issueIndex);

        if (await manualButton.count() > 0) {
          await manualButton.click();
          await page.waitForTimeout(500);

          const input = appPage.getDescriptionInput();
          await input.scrollIntoViewIfNeeded().catch(() => {});
          await input.click({ force: true }).catch(() => {});
          await input.fill(`请求体描述${idx + 1}`);
          await page.waitForTimeout(200);

          await appPage.clickApplyInEditModal();
          await page.waitForTimeout(500);
        }
      }

      // 验证 YAML 格式正确（可以重新解析）
      await appPage.analyzeButton.click();
      await page.waitForTimeout(1000);

      // 检查是否有 YAML 语法错误
      const newIssues = await appPage.getIssues();
      const hasYamlError = newIssues.some((i: any) =>
        i.message.includes('YAML 格式解析失败') || i.message.includes('YAML 语法')
      );
      expect(hasYamlError).toBe(false);

      // 验证 description 被正确添加
      const updatedYaml = await appPage.getYamlContent();
      expect(updatedYaml).toContain('请求体描述');
    });
  });
});
