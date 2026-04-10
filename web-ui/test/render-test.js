/**
 * API Codegen Web UI - 渲染功能测试
 *
 * 测试分类：
 * 1. computeImpact 函数 - 验证变更检测逻辑
 * 2. 变更详情显示 - 验证变更内容的格式化
 * 3. Java代码生成 - 验证生成的代码语法正确性
 *
 * 运行方式：cd web-ui && node test/render-test.js
 */

const fs = require('fs');
const path = require('path');

// Load js-yaml
const jsyaml = require('js-yaml');

console.log('\n' + '='.repeat(70));
console.log('   API Codegen Web UI - 渲染功能测试');
console.log('='.repeat(70) + '\n');

let passed = 0;
let failed = 0;
const results = [];

function extractFunctionSource(fileContent, functionName) {
    const startToken = `function ${functionName}`;
    const startIndex = fileContent.indexOf(startToken);
    if (startIndex === -1) {
        throw new Error(`未在 index.html 中找到函数: ${functionName}`);
    }

    const bodyStart = fileContent.indexOf('{', startIndex);
    if (bodyStart === -1) {
        throw new Error(`函数 ${functionName} 缺少函数体`);
    }

    let depth = 0;
    for (let i = bodyStart; i < fileContent.length; i++) {
        const char = fileContent[i];
        if (char === '{') depth++;
        if (char === '}') depth--;
        if (depth === 0) {
            return fileContent.slice(startIndex, i + 1);
        }
    }

    throw new Error(`函数 ${functionName} 提取失败，括号未闭合`);
}

function loadComputeImpactFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const normalizePathForDiffSource = extractFunctionSource(indexHtml, 'normalizePathForDiff');
    const getSwaggerFieldChangesSource = extractFunctionSource(indexHtml, 'getSwaggerFieldChanges');
    const mapSchemaTypeToJavaSource = extractFunctionSource(indexHtml, 'mapSchemaTypeToJava');
    const computeImpactSource = extractFunctionSource(indexHtml, 'computeImpact');

    return eval(`(() => {
        ${normalizePathForDiffSource}
        ${getSwaggerFieldChangesSource}
        ${mapSchemaTypeToJavaSource}
        ${computeImpactSource}
        return computeImpact;
    })()`);
}

const computeImpact = loadComputeImpactFromIndex();

function loadIsAutoFixableFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const isAutoFixableSource = extractFunctionSource(indexHtml, 'isAutoFixable');

    return eval(`(() => {
        ${isAutoFixableSource}
        return isAutoFixable;
    })()`);
}

const isAutoFixable = loadIsAutoFixableFromIndex();

function loadIsManualLocatableFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const isManualLocatableSource = extractFunctionSource(indexHtml, 'isManualLocatable');

    return eval(`(() => {
        ${isManualLocatableSource}
        return isManualLocatable;
    })()`);
}

const isManualLocatable = loadIsManualLocatableFromIndex();

function loadComputePreviewDiffFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const computePreviewDiffSource = extractFunctionSource(indexHtml, 'computePreviewDiff');
    const Diff = {
        diffLines(before, after) {
            if (before === after) {
                return [{ value: before, added: false, removed: false }];
            }
            return [
                { value: before, removed: true, added: false },
                { value: after, added: true, removed: false }
            ];
        }
    };

    return eval(`(() => {
        ${computePreviewDiffSource}
        return computePreviewDiff;
    })()`);
}

const computePreviewDiff = loadComputePreviewDiffFromIndex();

function loadBuildImpactArtifactIndexFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const toPascalCasePreviewSource = extractFunctionSource(indexHtml, 'toPascalCasePreview');
    const inferEntityKindPreviewSource = extractFunctionSource(indexHtml, 'inferEntityKindPreview');
    const sortArtifactsByPreviewPrioritySource = extractFunctionSource(indexHtml, 'sortArtifactsByPreviewPriority');
    const getImpactStatusCopySource = extractFunctionSource(indexHtml, 'getImpactStatusCopy');
    const sortImpactIndexChildrenSource = extractFunctionSource(indexHtml, 'sortImpactIndexChildren');
    const buildControllerIndexChildrenSource = extractFunctionSource(indexHtml, 'buildControllerIndexChildren');
    const buildNestedModelIndexTreeSource = extractFunctionSource(indexHtml, 'buildNestedModelIndexTree');
    const buildModelIndexChildrenSource = extractFunctionSource(indexHtml, 'buildModelIndexChildren');
    const buildImpactArtifactIndexSource = extractFunctionSource(indexHtml, 'buildImpactArtifactIndex');
    const flattenImpactIndexTreeSource = extractFunctionSource(indexHtml, 'flattenImpactIndexTree');

    return eval(`(() => {
        ${toPascalCasePreviewSource}
        ${inferEntityKindPreviewSource}
        ${sortArtifactsByPreviewPrioritySource}
        ${getImpactStatusCopySource}
        ${sortImpactIndexChildrenSource}
        ${buildControllerIndexChildrenSource}
        ${buildNestedModelIndexTreeSource}
        ${buildModelIndexChildrenSource}
        ${buildImpactArtifactIndexSource}
        ${flattenImpactIndexTreeSource}
        return { buildImpactArtifactIndex, flattenImpactIndexTree };
    })()`);
}

const { buildImpactArtifactIndex, flattenImpactIndexTree } = loadBuildImpactArtifactIndexFromIndex();

function loadBuildControllerClassSummaryMessagesFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const buildControllerClassSummaryMessagesSource = extractFunctionSource(indexHtml, 'buildControllerClassSummaryMessages');

    return eval(`(() => {
        ${buildControllerClassSummaryMessagesSource}
        return buildControllerClassSummaryMessages;
    })()`);
}

const buildControllerClassSummaryMessages = loadBuildControllerClassSummaryMessagesFromIndex();

function loadBuildModelClassSummaryMessagesFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const buildModelClassSummaryMessagesSource = extractFunctionSource(indexHtml, 'buildModelClassSummaryMessages');

    return eval(`(() => {
        ${buildModelClassSummaryMessagesSource}
        return buildModelClassSummaryMessages;
    })()`);
}

const buildModelClassSummaryMessages = loadBuildModelClassSummaryMessagesFromIndex();

function loadGenerateJavaControllerClassStructureCodeFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const highlightJavaAnnotationPreviewSource = extractFunctionSource(indexHtml, 'highlightJavaAnnotationPreview');
    const generateJavaControllerClassStructureCodeSource = extractFunctionSource(indexHtml, 'generateJavaControllerClassStructureCode');

    return eval(`(() => {
        const currentFramework = 'spring';
        function escapeHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
        ${highlightJavaAnnotationPreviewSource}
        ${generateJavaControllerClassStructureCodeSource}
        return generateJavaControllerClassStructureCode;
    })()`);
}

const generateJavaControllerClassStructureCode = loadGenerateJavaControllerClassStructureCodeFromIndex();

function loadFindIssueLocationLineFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const splitIssueApiRefSource = extractFunctionSource(indexHtml, 'splitIssueApiRef');
    const extractIssueFieldNameSource = extractFunctionSource(indexHtml, 'extractIssueFieldName');
    const findIssueLocationLineSource = extractFunctionSource(indexHtml, 'findIssueLocationLine');

    return eval(`(() => {
        ${splitIssueApiRefSource}
        ${extractIssueFieldNameSource}
        ${findIssueLocationLineSource}
        return findIssueLocationLine;
    })()`);
}

const findIssueLocationLine = loadFindIssueLocationLineFromIndex();

function loadTableEditorFunctionsFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const normalizePathForDiffSource = extractFunctionSource(indexHtml, 'normalizePathForDiff');
    const escapeYamlTableScalarSource = extractFunctionSource(indexHtml, 'escapeYamlTableScalar');
    const splitTableAnnotationTextSource = extractFunctionSource(indexHtml, 'splitTableAnnotationText');
    const normalizeTableEditorPathSource = extractFunctionSource(indexHtml, 'normalizeTableEditorPath');
    const normalizeTableEditorMethodSource = extractFunctionSource(indexHtml, 'normalizeTableEditorMethod');
    const inferYamlDocumentKindSource = extractFunctionSource(indexHtml, 'inferYamlDocumentKind');
    const isHttpOperationKeySource = extractFunctionSource(indexHtml, 'isHttpOperationKey');
    const getTableEditorPathKeysSource = extractFunctionSource(indexHtml, 'getTableEditorPathKeys');
    const extractTableEditorSchemaRefsSource = extractFunctionSource(indexHtml, 'extractTableEditorSchemaRefs');
    const extractSchemaMetaForTableEditorSource = extractFunctionSource(indexHtml, 'extractSchemaMetaForTableEditor');
    const createTableParameterRowSource = extractFunctionSource(indexHtml, 'createTableParameterRow');
    const parseYamlForTableEditorSource = extractFunctionSource(indexHtml, 'parseYamlForTableEditor');
    const buildTableSchemaFromRowSource = extractFunctionSource(indexHtml, 'buildTableSchemaFromRow');
    const buildOperationParameterFromTableRowSource = extractFunctionSource(indexHtml, 'buildOperationParameterFromTableRow');
    const buildOpenApiRequestBodyFromRowSource = extractFunctionSource(indexHtml, 'buildOpenApiRequestBodyFromRow');
    const ensureTableOperationResponsesSource = extractFunctionSource(indexHtml, 'ensureTableOperationResponses');
    const clonePlainObjectSource = extractFunctionSource(indexHtml, 'clonePlainObject');
    const applyTableEditorStateToYamlSource = extractFunctionSource(indexHtml, 'applyTableEditorStateToYaml');

    return eval(`(() => {
        ${normalizePathForDiffSource}
        ${escapeYamlTableScalarSource}
        ${splitTableAnnotationTextSource}
        ${normalizeTableEditorPathSource}
        ${normalizeTableEditorMethodSource}
        ${inferYamlDocumentKindSource}
        ${isHttpOperationKeySource}
        ${getTableEditorPathKeysSource}
        ${extractTableEditorSchemaRefsSource}
        ${extractSchemaMetaForTableEditorSource}
        ${createTableParameterRowSource}
        ${parseYamlForTableEditorSource}
        ${buildTableSchemaFromRowSource}
        ${buildOperationParameterFromTableRowSource}
        ${buildOpenApiRequestBodyFromRowSource}
        ${ensureTableOperationResponsesSource}
        ${clonePlainObjectSource}
        ${applyTableEditorStateToYamlSource}
        return { parseYamlForTableEditor, applyTableEditorStateToYaml };
    })()`);
}

const { parseYamlForTableEditor, applyTableEditorStateToYaml } = loadTableEditorFunctionsFromIndex();

function loadTableEditorMarkupFunctionsFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const escapeHtmlSource = extractFunctionSource(indexHtml, 'escapeHtml');
    const escapeJsStringSource = extractFunctionSource(indexHtml, 'escapeJsString');
    const escapeYamlTableScalarSource = extractFunctionSource(indexHtml, 'escapeYamlTableScalar');
    const normalizeAnnotationBundleSource = extractFunctionSource(indexHtml, 'normalizeAnnotationBundle');
    const highlightJavaAnnotationPreviewSource = extractFunctionSource(indexHtml, 'highlightJavaAnnotationPreview');
    const toCamelCaseSource = extractFunctionSource(indexHtml, 'toCamelCase');
    const toPascalCasePreviewSource = extractFunctionSource(indexHtml, 'toPascalCasePreview');
    const generateJavaControllerMethodCodeSource = extractFunctionSource(indexHtml, 'generateJavaControllerMethodCode');
    const generateJavaControllerClassStructureCodeSource = extractFunctionSource(indexHtml, 'generateJavaControllerClassStructureCode');
    const getTableParameterDomIdSource = extractFunctionSource(indexHtml, 'getTableParameterDomId');
    const renderTableParameterLocationOptionsSource = extractFunctionSource(indexHtml, 'renderTableParameterLocationOptions');
    const renderTableParameterEditorKindOptionsSource = extractFunctionSource(indexHtml, 'renderTableParameterEditorKindOptions');
    const inferTableParameterEditorKindSource = extractFunctionSource(indexHtml, 'inferTableParameterEditorKind');
    const getAvailableTableEditorSchemaRefsSource = extractFunctionSource(indexHtml, 'getAvailableTableEditorSchemaRefs');
    const getTableEditorCreatedSchemasSource = extractFunctionSource(indexHtml, 'getTableEditorCreatedSchemas');
    const buildDefaultTableEditorSchemaRefSource = extractFunctionSource(indexHtml, 'buildDefaultTableEditorSchemaRef');
    const isKnownTableEditorSchemaRefSource = extractFunctionSource(indexHtml, 'isKnownTableEditorSchemaRef');
    const suggestTableEditorSchemaNameSource = extractFunctionSource(indexHtml, 'suggestTableEditorSchemaName');
    const ensureUniqueTableEditorSchemaNameSource = extractFunctionSource(indexHtml, 'ensureUniqueTableEditorSchemaName');
    const renderTableParameterRefOptionsSource = extractFunctionSource(indexHtml, 'renderTableParameterRefOptions');
    const buildTableParameterReferenceEditorSource = extractFunctionSource(indexHtml, 'buildTableParameterReferenceEditor');
    const buildTableParameterModelingHintSource = extractFunctionSource(indexHtml, 'buildTableParameterModelingHint');
    const buildTableParameterAddMenuSource = extractFunctionSource(indexHtml, 'buildTableParameterAddMenu');
    const resolveTableEditorControllerClassAnnotationsSource = extractFunctionSource(indexHtml, 'resolveTableEditorControllerClassAnnotations');
    const buildTableEditorJavaPreviewSource = extractFunctionSource(indexHtml, 'buildTableEditorJavaPreview');
    const buildTableEditorApiTableSource = extractFunctionSource(indexHtml, 'buildTableEditorApiTable');
    const buildTableEditorParameterJumpNavSource = extractFunctionSource(indexHtml, 'buildTableEditorParameterJumpNav');
    const buildTableEditorParameterTableSource = extractFunctionSource(indexHtml, 'buildTableEditorParameterTable');
    const buildTableEditorDetailSource = extractFunctionSource(indexHtml, 'buildTableEditorDetail');

    return eval(`(() => {
        var currentFramework = 'spring';
        var tableEditorState = null;
        var tableEditorSelectedOperationId = '';
        var tableEditorFocusedParamKey = '';
        var tableEditorParameterMenuOperationId = '';
        var document = {
            createElement() {
                return {
                    _text: '',
                    innerHTML: '',
                    set textContent(value) {
                        this._text = String(value || '');
                        this.innerHTML = this._text
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#39;');
                    },
                    get textContent() {
                        return this._text;
                    },
                    set innerText(value) {
                        this.textContent = value;
                    },
                    get innerText() {
                        return this._text;
                    }
                };
            },
            getElementById() { return null; },
            querySelectorAll() { return []; }
        };
        ${escapeHtmlSource}
        ${escapeJsStringSource}
        ${escapeYamlTableScalarSource}
        ${normalizeAnnotationBundleSource}
        ${highlightJavaAnnotationPreviewSource}
        ${toCamelCaseSource}
        ${toPascalCasePreviewSource}
        ${generateJavaControllerMethodCodeSource}
        ${generateJavaControllerClassStructureCodeSource}
        ${getTableParameterDomIdSource}
        ${renderTableParameterLocationOptionsSource}
        ${renderTableParameterEditorKindOptionsSource}
        ${inferTableParameterEditorKindSource}
        ${getAvailableTableEditorSchemaRefsSource}
        ${getTableEditorCreatedSchemasSource}
        ${buildDefaultTableEditorSchemaRefSource}
        ${isKnownTableEditorSchemaRefSource}
        ${suggestTableEditorSchemaNameSource}
        ${ensureUniqueTableEditorSchemaNameSource}
        ${renderTableParameterRefOptionsSource}
        ${buildTableParameterReferenceEditorSource}
        ${buildTableParameterModelingHintSource}
        ${buildTableParameterAddMenuSource}
        ${resolveTableEditorControllerClassAnnotationsSource}
        ${buildTableEditorJavaPreviewSource}
        ${buildTableEditorApiTableSource}
        ${buildTableEditorParameterJumpNavSource}
        ${buildTableEditorParameterTableSource}
        ${buildTableEditorDetailSource}
        return {
            setTableEditorState(value) {
                tableEditorState = value;
            },
            setSelectedOperationId(value) {
                tableEditorSelectedOperationId = value;
            },
            setFocusedParamKey(value) {
                tableEditorFocusedParamKey = value;
            },
            buildTableEditorApiTable,
            buildTableEditorDetail
        };
    })()`);
}

const tableEditorMarkup = loadTableEditorMarkupFunctionsFromIndex();

function uniqueStrings(values) {
    const seen = new Set();
    return (values || []).filter(value => {
        if (!value || typeof value !== 'string' || seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
}

function extractResourceAnnotationEntries(parsed) {
    if (!parsed) return [];
    const entries = [];
    const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

    if (parsed.paths) {
        Object.keys(parsed.paths).forEach(pathKey => {
            const pathItem = parsed.paths[pathKey] || {};
            const classAnnotations = Array.isArray(pathItem['x-java-class-annotations']) ? pathItem['x-java-class-annotations'] : [];

            httpMethods.forEach(method => {
                const operation = pathItem[method];
                if (!operation || typeof operation !== 'object') return;

                const methodAnnotations = Array.isArray(operation['x-java-method-annotations']) ? operation['x-java-method-annotations'] : [];
                const legacyAnnotations = Array.isArray(operation.annotations) ? operation.annotations : [];
                if (classAnnotations.length === 0 && methodAnnotations.length === 0 && legacyAnnotations.length === 0) return;

                entries.push({
                    path: `${method.toUpperCase()} ${pathKey}`,
                    classAnnotations: uniqueStrings(classAnnotations),
                    methodAnnotations: uniqueStrings(methodAnnotations.concat(legacyAnnotations))
                });
            });
        });
    }

    return entries;
}

function normalizeAnnotationBundle(annotations) {
    if (Array.isArray(annotations)) {
        return {
            classAnnotations: [],
            methodAnnotations: [],
            legacyAnnotations: annotations
        };
    }

    annotations = annotations || {};
    return {
        classAnnotations: annotations.classAnnotations || [],
        methodAnnotations: annotations.methodAnnotations || [],
        legacyAnnotations: annotations.legacyAnnotations || annotations.annotations || []
    };
}

function generateJavaControllerPreview(annotations) {
    const bundle = normalizeAnnotationBundle(annotations);
    const lines = [];

    if (bundle.classAnnotations.length > 0) {
        lines.push('// 资源组注解');
        bundle.classAnnotations.forEach(annotation => lines.push(annotation));
    }

    const methodAnnotations = bundle.methodAnnotations.concat(bundle.legacyAnnotations);
    if (methodAnnotations.length > 0) {
        lines.push('// 方法注解');
        methodAnnotations.forEach(annotation => lines.push(annotation));
    }

    lines.push('@GetMapping("/users")');
    return lines.join('\n');
}

/**
 * 简化的变更详情格式化函数（测试用）
 */
function formatParamChangeDetails(api) {
    var details = { before: [], after: [] };

    if (!api.changes || api.changes.length === 0) {
        return details;
    }

    api.changes.forEach(function(change) {
        if (change.prop === 'path') {
            details.before.push('修复路径: ' + change.before);
            details.after.push('→ ' + change.after);
        } else if (change.prop.startsWith('参数 ')) {
            var paramName = change.prop
                .replace('参数 ', '')
                .replace(/ minLength$/, '')
                .replace(/ maxLength$/, '')
                .replace(/ minimum$/, '')
                .replace(/ maximum$/, '')
                .replace(/ pattern$/, '')
                .replace(/ description$/, '')
                .replace(/ type$/, '')
                .trim();

            if (change.prop.includes('minLength')) {
                // minLength=0 相当于无限制，不显示
                if (change.after === 0) {
                    details.before.push('参数 ' + paramName + ': 缺失最大长度校验');
                    details.after.push('→ 新增 @Size(max=255)');
                } else {
                    details.before.push('参数 ' + paramName + ': 缺失最小长度校验');
                    details.after.push('→ 新增 @Size(min=' + change.after + ')');
                }
            } else if (change.prop.includes('maxLength')) {
                details.before.push('参数 ' + paramName + ': 缺失最大长度校验');
                details.after.push('→ 新增 @Size(max=' + change.after + ')');
            } else if (change.prop.includes('minimum')) {
                details.before.push('参数 ' + paramName + ': 缺失最小值校验');
                details.after.push('→ 新增 @Min(' + change.after + ')');
            } else if (change.prop.includes('maximum')) {
                details.before.push('参数 ' + paramName + ': 缺失最大值校验');
                details.after.push('→ 新增 @Max(' + change.after + ')');
            } else if (change.prop.includes('pattern')) {
                details.before.push('参数 ' + paramName + ': 缺失正则校验');
                details.after.push('→ 新增 @Pattern(regexp="' + change.after + '")');
            } else if (change.prop.includes('description')) {
                details.before.push('参数 ' + paramName + ': 缺少描述');
                details.after.push('→ 描述: ' + change.after);
            } else if (change.prop.includes('type')) {
                details.before.push('参数 ' + paramName + ': 缺少类型');
                details.after.push('→ 类型: ' + change.after);
            }
        }
    });

    return details;
}

/**
 * 测试框架
 */
function test(category, name, fn) {
    const testId = results.length + 1;
    try {
        const result = fn();
        if (result.pass) {
            passed++;
            results.push({ testId, category, name, status: 'PASS', actual: result });
            console.log(`\x1b[32m[PASS]\x1b[0m #${testId} ${name}`);
            if (result.message) {
                console.log(`       ${result.message}`);
            }
        } else {
            throw new Error(result.message || '测试失败');
        }
    } catch (e) {
        failed++;
        results.push({ testId, category, name, status: 'FAIL', actual: e.message });
        console.log(`\x1b[31m[FAIL]\x1b[0m #${testId} ${name}`);
        console.log(`       原因: ${e.message}`);
    }
}

// ============================================
// 测试用例
// ============================================

console.log('\n--- 1. computeImpact 函数测试 ---\n');

// 测试1: 检测路径修复 - 相同路径无变更
test('computeImpact', '检测路径相同无变更', function() {
    const before = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    return {
        pass: impact.apis.length === 0,
        message: '路径相同时应无变更，当前: ' + impact.apis.length + '个'
    };
});

// 测试1b: 检测路径 /XXX/ 前缀应被修复
test('computeImpact', '检测路径 /XXX/ 前缀修复', function() {
    const before = `swagger: "2.0"
paths:
  /XXX/users/detail:
    get:
      operationId: getUserDetail
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users/detail:
    get:
      operationId: getUserDetail
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    const hasPathChange = impact.apis.some(api =>
        api.changes && api.changes.some(c => c.prop === 'path')
    );

    return {
        pass: hasPathChange,
        message: `检测到路径变更: ${impact.apis.length} 个API, 变更: ${JSON.stringify(impact.apis[0]?.changes)}`
    };
});

// 测试2: 检测参数校验添加
test('computeImpact', '检测参数 minLength 添加', function() {
    const before = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: keyword
          in: query
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: keyword
          in: query
          minLength: 1
          maxLength: 255
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    const hasMinLengthChange = impact.apis.some(api =>
        api.changes && api.changes.some(c => c.prop.includes('minLength'))
    );

    return {
        pass: hasMinLengthChange,
        message: `检测到参数校验变更: ${impact.apis.length} 个API变更`
    };
});

// 测试3: 检测参数 minimum/maximum 添加
test('computeImpact', '检测参数数值范围添加', function() {
    const before = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: page
          in: query
          type: integer
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: page
          in: query
          type: integer
          minimum: 1
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    const hasMinChange = impact.apis.some(api =>
        api.changes && api.changes.some(c => c.prop.includes('minimum'))
    );

    return {
        pass: hasMinChange,
        message: `检测到minimum变更: ${JSON.stringify(impact.apis[0]?.changes)}`
    };
});

// 测试4: 检测参数 description 添加
test('computeImpact', '检测参数描述添加', function() {
    const before = `swagger: "2.0"
paths:
  /users/{id}:
    get:
      operationId: getUserById
      parameters:
        - name: id
          in: path
          required: true
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users/{id}:
    get:
      operationId: getUserById
      parameters:
        - name: id
          in: path
          required: true
          description: User ID
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    const hasDescChange = impact.apis.some(api =>
        api.changes && api.changes.some(c => c.prop.includes('description'))
    );

    return {
        pass: hasDescChange,
        message: `检测到description变更: ${impact.apis.length} 个API变更`
    };
});

// 测试5: 检测参数 type 添加
test('computeImpact', '检测参数类型添加', function() {
    const before = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: page
          in: query
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: page
          in: query
          type: integer
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    const hasTypeChange = impact.apis.some(api =>
        api.changes && api.changes.some(c => c.prop.includes('type'))
    );

    return {
        pass: hasTypeChange,
        message: `检测到type变更: ${impact.apis.length} 个API变更`
    };
});

// 测试6: 字段变更检测
test('computeImpact', '检测字段校验规则添加', function() {
    const before = `swagger: "2.0"
definitions:
  User:
    type: object
    properties:
      username:
        type: string`;

    const after = `swagger: "2.0"
definitions:
  User:
    type: object
    properties:
      username:
        type: string
        minLength: 4
        maxLength: 20`;

    const impact = computeImpact(before, after);
    const hasFieldChange = impact.fields.length > 0;

    return {
        pass: hasFieldChange,
        message: `检测到字段变更: ${impact.fields.length} 个字段变更`
    };
});

console.log('\n--- 2. 变更详情格式化测试 ---\n');

// 测试7: 变更详情格式化 - minLength=1 (正确规则)
test('formatParamChangeDetails', '格式化 minLength=1 变更', function() {
    const api = {
        changes: [
            { prop: '参数 keyword minLength', before: '(无)', after: 1 }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺失最小长度校验') &&
              details.after[0].includes('@Size(min=1)'),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

// 测试7b: 变更详情格式化 - minLength=0 (历史兼容)
test('formatParamChangeDetails', '格式化 minLength=0 变更(历史兼容)', function() {
    const api = {
        changes: [
            { prop: '参数 keyword minLength', before: '(无)', after: 0 }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺失最大长度校验') &&
              details.after[0].includes('@Size(max='),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

// 测试8: 变更详情格式化 - minimum
test('formatParamChangeDetails', '格式化 minimum 变更', function() {
    const api = {
        changes: [
            { prop: '参数 page minimum', before: '(无)', after: 1 }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺失最小值校验') &&
              details.after[0].includes('@Min('),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

// 测试9: 变更详情格式化 - maximum
test('formatParamChangeDetails', '格式化 maximum 变更', function() {
    const api = {
        changes: [
            { prop: '参数 size maximum', before: '(无)', after: 100 }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺失最大值校验') &&
              details.after[0].includes('@Max('),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

// 测试10: 变更详情格式化 - pattern
test('formatParamChangeDetails', '格式化 pattern 变更', function() {
    const api = {
        changes: [
            { prop: '参数 email pattern', before: '(无)', after: '^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$' }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺失正则校验') &&
              details.after[0].includes('@Pattern(regexp='),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

// 测试11: 变更详情格式化 - description
test('formatParamChangeDetails', '格式化 description 变更', function() {
    const api = {
        changes: [
            { prop: '参数 id description', before: '(无)', after: 'User ID' }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺少描述') &&
              details.after[0].includes('描述:'),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

// 测试12: 变更详情格式化 - type
test('formatParamChangeDetails', '格式化 type 变更', function() {
    const api = {
        changes: [
            { prop: '参数 page type', before: '(无)', after: 'integer' }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺少类型') &&
              details.after[0].includes('类型:'),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

console.log('\n--- 3. 边界情况测试 ---\n');

// 测试13: 空变更
test('computeImpact', '无变更时应返回空', function() {
    const yaml = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        200:
          description: OK`;

    const impact = computeImpact(yaml, yaml);

    return {
        pass: impact.apis.length === 0 && impact.fields.length === 0,
        message: `无变更时应返回空，当前: ${impact.apis.length}个API, ${impact.fields.length}个字段`
    };
});

// 测试14: 复杂多变更
test('computeImpact', '多参数变更应全部检测', function() {
    const before = `swagger: "2.0"
paths:
  /users/search:
    get:
      operationId: searchUsers
      parameters:
        - name: keyword
          in: query
        - name: page
          in: query
        - name: size
          in: query
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users/search:
    get:
      operationId: searchUsers
      parameters:
        - name: keyword
          in: query
          minLength: 0
          maxLength: 255
        - name: page
          in: query
          type: integer
          minimum: 1
        - name: size
          in: query
          type: integer
          minimum: 1
          maximum: 100
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);

    return {
        pass: impact.apis.length > 0,
        message: `检测到 ${impact.apis.length} 个API变更，共 ${impact.apis[0]?.changes?.length || 0} 处变更`
    };
});

test('computeImpact', 'Swagger 资源组注解应透传到预览模型', function() {
    const before = `swagger: "2.0"
paths:
  /users:
    x-java-class-annotations:
      - "@TenantScoped"
    get:
      operationId: getUsers
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users:
    x-java-class-annotations:
      - "@TenantScoped"
    get:
      operationId: getUsers
      x-java-method-annotations:
        - "@Permission(\\"user.read\\")"
      description: 获取用户列表
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    const api = impact.apis[0] || {};
    return {
        pass: Array.isArray(api.classAnnotations) &&
            api.classAnnotations.includes('@TenantScoped') &&
            Array.isArray(api.methodAnnotations) &&
            api.methodAnnotations.includes('@Permission("user.read")'),
        message: `类注解: ${JSON.stringify(api.classAnnotations)}, 方法注解: ${JSON.stringify(api.methodAnnotations)}`
    };
});

test('computeImpact', 'Swagger 归一化到 core YAML 时应回退为非结构化差异', function() {
    const before = `swagger: "2.0"
paths:
  //users:
    get:
      operationId: getUsers
      responses:
        200:
          description: OK`;

    const after = `---
apis:
- name: "getUsers"
  path: "/users"
  method: "GET"
  response:
    className: "Response"
    fields:
    - name: "success"
      type: "Boolean"
      required: false
      description: "操作是否成功"
      validation: {}`;

    const impact = computeImpact(before, after);
    return {
        pass: impact.apis.length === 0 && impact.fields.length === 0,
        message: `跨结构对比不应误报结构化变更，当前: ${impact.apis.length} 个 API, ${impact.fields.length} 个字段`
    };
});

test('computePreviewDiff', '仅缩进差异不应视为可见变更', function() {
    const before = `swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  /users:
    get:
      operationId: getUsers`;

    const after = `swagger: "2.0"
info:
 title: Test API
 version: "1.0"
paths:
 /users:
   get:
     operationId: getUsers`;

    const diff = computePreviewDiff(before, after);
    const hasVisibleChange = diff.some(part => part.added || part.removed);

    return {
        pass: hasVisibleChange === false,
        message: `仅缩进差异不应产生新增/删除片段，当前: ${JSON.stringify(diff)}`
    };
});

test('computeImpact', 'Swagger 预览应按单个统一 Controller 聚合方法', function() {
    const before = `openapi: "3.0.0"
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
        '200':
          description: OK
  /users:
    post:
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
`;

    const after = `openapi: "3.0.0"
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
            minimum: 1
      responses:
        '200':
          description: OK
  /users:
    post:
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
`;

    const impact = computeImpact(before, after);
    const controllers = impact.generatedArtifacts && impact.generatedArtifacts.controllers
        ? impact.generatedArtifacts.controllers
        : [];
    const controller = controllers[0] || {};
    const methods = controller.methods || [];

    return {
        pass: controllers.length === 1 &&
            controller.fileName === 'ApicgenApi.java' &&
            controller.kind === 'Unified Controller' &&
            controller.methodCount === 2 &&
            controller.changedMethodCount === 1 &&
            Array.isArray(methods) &&
            methods.length === 2 &&
            methods.some(item => item.operationId === 'getUser' && item.status === 'modified') &&
            methods.some(item => item.operationId === 'createUser' && item.status === 'unchanged'),
        message: JSON.stringify(controller)
    };
});

test('buildImpactArtifactIndex', '应汇总 Controller 与实体产物变化索引', function() {
    const impact = {
        apis: [
            {
                name: 'getUser',
                path: '/users/{id}',
                method: 'get',
                changes: [{ prop: '参数 id minimum', before: '(无)', after: 1 }]
            },
            {
                name: 'createUser',
                path: '/users',
                method: 'post',
                changes: [{ prop: 'requestBody.username minLength', before: '(无)', after: 1 }]
            }
        ],
        fields: [
            {
                className: 'CreateUserReq',
                field: 'username',
                changes: [{ prop: 'minLength', before: '(无)', after: 1 }]
            },
            {
                className: 'CreateUserReq',
                field: 'email',
                changes: [{ prop: 'format', before: '(无)', after: 'email' }]
            },
            {
                className: 'UserModel',
                field: 'phone',
                changes: [{ prop: 'pattern', before: '(无)', after: '^1[3-9]\\\\d{9}$' }]
            }
        ]
    };

    const index = buildImpactArtifactIndex(impact);

    return {
        pass: index.controllerCount === 2 &&
            index.modelClassCount === 2 &&
            Array.isArray(index.controllers) &&
            index.controllers[0].fileName === 'GetUserController.java' &&
            Array.isArray(index.models) &&
            index.models.some(item => item.fileName === 'CreateUserReq.java' && item.changeCount === 2) &&
            index.models.some(item => item.fileName === 'UserModel.java' && item.changeCount === 1),
        message: JSON.stringify(index)
    };
});

test('buildImpactArtifactIndex', '应将未变化产物归入参考区并排在变更项之后', function() {
    const impact = {
        apis: [],
        fields: [],
        generatedArtifacts: {
            controllers: [
                {
                    fileName: 'CreateUserController.java',
                    kind: 'Controller',
                    label: 'POST /users',
                    changeCount: 2,
                    status: 'modified'
                },
                {
                    fileName: 'GetUserController.java',
                    kind: 'Controller',
                    label: 'GET /users/{id}',
                    changeCount: 0,
                    status: 'unchanged'
                }
            ],
            models: [
                {
                    fileName: 'CreateUserReq.java',
                    kind: 'Request',
                    label: 'Request',
                    changeCount: 1,
                    status: 'modified'
                },
                {
                    fileName: 'UserModel.java',
                    kind: 'Model',
                    label: 'Model',
                    changeCount: 0,
                    status: 'unchanged'
                }
            ]
        }
    };

    const index = buildImpactArtifactIndex(impact);

    return {
        pass: index.controllerCount === 2 &&
            index.changedControllerCount === 1 &&
            index.referenceControllerCount === 1 &&
            index.modelClassCount === 2 &&
            index.changedModelCount === 1 &&
            index.referenceModelCount === 1 &&
            index.controllers[0].fileName === 'CreateUserController.java' &&
            index.controllers[0].section === 'changed' &&
            index.controllers[1].fileName === 'GetUserController.java' &&
            index.controllers[1].section === 'reference' &&
            index.models[0].fileName === 'CreateUserReq.java' &&
            index.models[0].section === 'changed' &&
            index.models[1].fileName === 'UserModel.java' &&
            index.models[1].section === 'reference',
        message: JSON.stringify(index)
    };
});

test('buildImpactArtifactIndex', '统一 Controller 应暴露方法层级，且未变化方法也应可见', function() {
    const impact = {
        apis: [],
        fields: [],
        generatedArtifacts: {
            controllers: [
                {
                    id: 'controller-unified',
                    fileName: 'ApicgenApi.java',
                    className: 'ApicgenApi',
                    kind: 'Unified Controller',
                    label: '3 个接口方法 · 1 个有变化',
                    changeCount: 1,
                    status: 'modified',
                    methods: [
                        {
                            id: 'controller-method-get-users-id',
                            method: 'get',
                            path: '/users/{id}',
                            originalPath: '/users/{id}',
                            operationId: 'getUserDetail',
                            status: 'modified',
                            changeCount: 1
                        },
                        {
                            id: 'controller-method-post-users',
                            method: 'post',
                            path: '/users',
                            originalPath: '/users',
                            operationId: 'createUser',
                            status: 'unchanged',
                            changeCount: 0
                        },
                        {
                            id: 'controller-method-put-users-tags',
                            method: 'put',
                            path: '/users/tags',
                            originalPath: '/users/tags',
                            operationId: 'setTags',
                            status: 'unchanged',
                            changeCount: 0
                        }
                    ]
                }
            ],
            models: []
        }
    };

    const index = buildImpactArtifactIndex(impact);
    const controller = index.controllers[0] || {};
    const children = controller.children || [];

    return {
        pass: index.controllerCount === 1 &&
            Array.isArray(children) &&
            children.length === 3 &&
            children[0].section === 'changed' &&
            children[0].label === 'GET /users/{id}' &&
            children[0].copy === 'getUserDetail' &&
            children[1].section === 'reference' &&
            children[1].label === 'POST /users' &&
            children[2].section === 'reference' &&
            children[2].copy === 'setTags',
        message: JSON.stringify(index)
    };
});

test('buildImpactArtifactIndex', '扁平实体索引不再按字段展开，保留类级入口即可', function() {
    const impact = {
        apis: [],
        fields: [],
        generatedArtifacts: {
            controllers: [],
            models: [
                {
                    id: 'model-CreateUserReq',
                    fileName: 'CreateUserReq.java',
                    className: 'CreateUserReq',
                    kind: 'Request',
                    label: 'Request',
                    changeCount: 2,
                    status: 'modified',
                    fields: [
                        {
                            id: 'model-field-CreateUserReq-username',
                            field: 'username',
                            fieldType: 'String',
                            status: 'modified',
                            changeCount: 1
                        },
                        {
                            id: 'model-field-CreateUserReq-email',
                            field: 'email',
                            fieldType: 'String',
                            status: 'modified',
                            changeCount: 1
                        },
                        {
                            id: 'model-field-CreateUserReq-birthday',
                            field: 'birthday',
                            fieldType: 'LocalDate',
                            status: 'unchanged',
                            changeCount: 0
                        }
                    ]
                }
            ]
        }
    };

    const index = buildImpactArtifactIndex(impact);
    const model = index.models[0] || {};

    return {
        pass: index.modelClassCount === 1 &&
            Array.isArray(model.children) &&
            model.children.length === 0 &&
            model.section === 'changed' &&
            model.fileName === 'CreateUserReq.java' &&
            model.kind === 'Request',
        message: JSON.stringify(index)
    };
});

test('buildImpactArtifactIndex', '嵌套实体索引应按实体引用关系生成层级', function() {
    const impact = {
        apis: [],
        fields: [],
        generatedArtifacts: {
            controllers: [],
            models: [
                {
                    id: 'model-UserModel',
                    fileName: 'UserModel.java',
                    className: 'UserModel',
                    kind: 'Model',
                    label: 'Model',
                    changeCount: 2,
                    status: 'modified',
                    nestedModelRefs: ['AddressInfo'],
                    fields: []
                },
                {
                    id: 'model-AddressInfo',
                    fileName: 'AddressInfo.java',
                    className: 'AddressInfo',
                    kind: 'Model',
                    label: 'Model',
                    changeCount: 0,
                    status: 'unchanged',
                    nestedModelRefs: ['GeoPoint'],
                    fields: []
                },
                {
                    id: 'model-GeoPoint',
                    fileName: 'GeoPoint.java',
                    className: 'GeoPoint',
                    kind: 'Model',
                    label: 'Model',
                    changeCount: 0,
                    status: 'unchanged',
                    nestedModelRefs: [],
                    fields: []
                }
            ]
        }
    };

    const index = buildImpactArtifactIndex(impact);
    const root = index.models[0] || {};
    const child = (root.children || [])[0] || {};
    const grandChild = (child.children || [])[0] || {};

    return {
        pass: index.modelClassCount === 3 &&
            index.models.length === 1 &&
            root.fileName === 'UserModel.java' &&
            root.section === 'changed' &&
            child.fileName === 'AddressInfo.java' &&
            child.section === 'reference' &&
            grandChild.fileName === 'GeoPoint.java' &&
            grandChild.section === 'reference',
        message: JSON.stringify(index)
    };
});

test('buildImpactArtifactIndex', '嵌套实体预览顺序应与左侧树一致', function() {
    const impact = {
        apis: [],
        fields: [],
        generatedArtifacts: {
            controllers: [],
            models: [
                {
                    id: 'model-UserModel',
                    fileName: 'UserModel.java',
                    className: 'UserModel',
                    kind: 'Model',
                    label: 'Model',
                    changeCount: 0,
                    status: 'unchanged',
                    nestedModelRefs: ['AddressInfo'],
                    fields: []
                },
                {
                    id: 'model-AddressInfo',
                    fileName: 'AddressInfo.java',
                    className: 'AddressInfo',
                    kind: 'Model',
                    label: 'Model',
                    changeCount: 0,
                    status: 'unchanged',
                    nestedModelRefs: ['GeoPoint'],
                    fields: []
                },
                {
                    id: 'model-GeoPoint',
                    fileName: 'GeoPoint.java',
                    className: 'GeoPoint',
                    kind: 'Model',
                    label: 'Model',
                    changeCount: 0,
                    status: 'unchanged',
                    nestedModelRefs: [],
                    fields: []
                }
            ]
        }
    };

    const index = buildImpactArtifactIndex(impact);
    const ordered = flattenImpactIndexTree(index.models).map(item => item.fileName);

    return {
        pass: JSON.stringify(ordered) === JSON.stringify(['UserModel.java', 'AddressInfo.java', 'GeoPoint.java']),
        message: JSON.stringify(ordered)
    };
});

test('previewSummary', '统一 Controller 类级摘要应保持简短，不重复展开所有方法变化', function() {
    const summary = buildControllerClassSummaryMessages({
        beforeClassAnnotations: [],
        afterClassAnnotations: ['@Secured'],
        methods: [
            { status: 'modified' },
            { status: 'modified' },
            { status: 'unchanged' },
            { status: 'added' }
        ]
    });

    return {
        pass: summary.before.length === 2 &&
            summary.after.length === 2 &&
            summary.before.includes('类级注解待同步') &&
            summary.after.includes('类级注解已同步') &&
            summary.before.includes('3 个方法生成结果待同步') &&
            summary.after.includes('3 个方法已同步到统一 Controller'),
        message: JSON.stringify(summary)
    };
});

test('previewSummary', '实体类级摘要应汇总为字段数量，不重复铺开字段明细', function() {
    const summary = buildModelClassSummaryMessages({
        fields: [
            { status: 'modified' },
            { status: 'unchanged' },
            { status: 'added' }
        ]
    });

    return {
        pass: summary.before.length === 1 &&
            summary.after.length === 1 &&
            summary.before[0] === '2 个字段生成结果待同步' &&
            summary.after[0] === '2 个字段已同步到实体生成结果',
        message: JSON.stringify(summary)
    };
});

test('previewSummary', '统一 Controller 类级预览应只展示类骨架，不再重复方法代码', function() {
    const code = generateJavaControllerClassStructureCode('ApicgenApi', ['@Secured'], 13);

    return {
        pass: code.includes('public</span> <span class="syntax-keyword">class</span> <span class="syntax-type">ApicgenApi</span>') &&
            code.includes('具体方法见上方方法明细（共 13 个）') &&
            code.includes('@Secured') &&
            !code.includes('Mapping(&quot;') &&
            !code.includes('return</span> <span class="syntax-keyword">null</span>;'),
        message: code
    };
});

test('singleInput', 'index.html 不应再包含双文件提示', function() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    return {
        pass: !indexHtml.includes('第二份配置文件') &&
            !indexHtml.includes('配置预览') &&
            !indexHtml.includes('API + Config'),
        message: '单一输入模式下不应再保留第二份配置文件相关文案'
    };
});

test('javaPreview', 'Java 预览应显示资源组与方法注解', function() {
    const preview = generateJavaControllerPreview({
        classAnnotations: ['@TenantScoped'],
        methodAnnotations: ['@Permission("user.read")']
    });

    return {
        pass: preview.includes('// 资源组注解') &&
            preview.includes('@TenantScoped') &&
            preview.includes('// 方法注解') &&
            preview.includes('@Permission("user.read")'),
        message: preview
    };
});

console.log('\n--- 4. Core Contract UI 行为测试 ---\n');

test('isAutoFixable', '应优先使用 core 返回的 fixable=false', function() {
    const issue = {
        severity: 'warn',
        message: 'String 字段缺少长度校验',
        fixable: false
    };

    return {
        pass: isAutoFixable(issue) === false,
        message: 'UI 不应再因为 message 命中旧规则而覆盖 core 的 fixable=false'
    };
});

test('isAutoFixable', '应优先使用 core 返回的 fixable=true', function() {
    const issue = {
        severity: 'info',
        message: '自定义 core 修复建议',
        fixable: true
    };

    return {
        pass: isAutoFixable(issue) === true,
        message: 'UI 应接受 core 的 fixable=true，而不是依赖前端关键字猜测'
    };
});

test('isAutoFixable', '缺少 fixable 元数据时不应再回退到 message 猜测', function() {
    const issue = {
        severity: 'warn',
        message: 'String 字段缺少长度校验'
    };

    return {
        pass: isAutoFixable(issue) === false,
        message: 'UI 不应在缺少 contract 元数据时自行推断可修复性'
    };
});

test('isManualLocatable', '缺少定位信息的人工问题不应显示可点击定位按钮', function() {
    const issue = {
        severity: 'error',
        message: 'YAML 格式解析失败',
        fixable: false,
        api: 'search',
        field: 'request.Request.keyword'
    };

    return {
        pass: isManualLocatable(issue) === false,
        message: '没有 locator 的问题不应再依赖 api/field 字符串推断定位能力'
    };
});

test('isManualLocatable', '带有定位信息的人工问题仍可点击定位', function() {
    const issue = {
        severity: 'error',
        message: 'minLength 不能大于 maxLength',
        fixable: false,
        locator: {
            kind: 'swagger-field',
            apiName: 'search',
            path: '/search',
            method: 'GET',
            section: 'request',
            className: 'Request',
            fieldName: 'keyword',
            property: 'validation'
        }
    };

    return {
        pass: isManualLocatable(issue) === true,
        message: '只有 core 提供稳定 locator 时 UI 才应显示可点击的手动定位入口'
    };
});

test('findIssueLocationLine', '应基于 operationId 和 field 在 Swagger 中定位参数行', function() {
    const lines = `swagger: "2.0"
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
            maxLength: 10`.split('\n');

    const line = findIssueLocationLine(lines, {
        api: '',
        field: '',
        locator: {
            kind: 'swagger-field',
            apiName: 'search',
            path: '/search',
            method: 'GET',
            section: 'request',
            className: 'Request',
            fieldName: 'keyword',
            property: 'validation'
        },
        message: 'minLength 不能大于 maxLength'
    });

    return {
        pass: line === 6,
        message: `期望定位到参数定义行 7，当前: ${line + 1}`
    };
});

test('findIssueLocationLine', '应基于 name 和 field 在 custom YAML 中定位字段行', function() {
    const lines = `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: username
          type: String`.split('\n');

    const line = findIssueLocationLine(lines, {
        api: '',
        field: '',
        locator: {
            kind: 'custom-field',
            apiName: 'createUser',
            path: '/api/users',
            method: 'POST',
            section: 'request',
            className: 'CreateUserReq',
            fieldName: 'username'
        },
        message: 'String 字段缺少长度校验'
    });

    return {
        pass: line === 7,
        message: `期望定位到字段定义行 8，当前: ${line + 1}`
    };
});

test('findIssueLocationLine', '路径类问题应优先定位到路径行', function() {
    const lines = `swagger: "2.0"
paths:
  //users:
    get:
      operationId: getUsers`.split('\n');

    const line = findIssueLocationLine(lines, {
        api: '',
        field: '',
        locator: {
            kind: 'swagger-path',
            path: '//users',
            method: 'GET',
            property: 'path'
        },
        message: '路径不能包含重复斜杠: //users'
    });

    return {
        pass: line === 2,
        message: `期望定位到路径行 3，当前: ${line + 1}`
    };
});

console.log('\n--- 8. YAML 表格编辑转换测试 ---\n');

test('tableEditor', '应能把 Swagger YAML 解析为 API 与参数表格行', function() {
    const yaml = `swagger: "2.0"
info:
  title: User API
  version: "1.0"
paths:
  /users:
    x-java-class-annotations:
      - "@Secured"
    get:
      summary: 查询用户
      operationId: getUsers
      x-java-method-annotations:
        - "@Permission(\\"user.read\\")"
      parameters:
        - name: keyword
          in: query
          description: 搜索词
          required: false
          schema:
            type: string
            minLength: 1
            maxLength: 32
      responses:
        "200":
          description: OK`;

    const state = parseYamlForTableEditor(yaml);
    const operation = state.operations[0] || {};
    const parameter = (operation.parameters || [])[0] || {};

    return {
        pass: state.kind === 'swagger2' &&
            state.operations.length === 1 &&
            operation.path === '/users' &&
            operation.method === 'get' &&
            operation.operationId === 'getUsers' &&
            Array.isArray(operation.classAnnotations) &&
            operation.classAnnotations[0] === '@Secured' &&
            Array.isArray(operation.methodAnnotations) &&
            operation.methodAnnotations[0] === '@Permission("user.read")' &&
            parameter.name === 'keyword' &&
            parameter.in === 'query' &&
            parameter.type === 'string' &&
            parameter.minLength === '1' &&
            parameter.maxLength === '32',
        message: JSON.stringify(state)
    };
});

test('tableEditor', '应能把 OpenAPI requestBody 解析为表格行', function() {
    const yaml = `openapi: 3.0.1
info:
  title: User API
  version: "1.0"
paths:
  /users:
    post:
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserReq'
      responses:
        "200":
          description: OK
components:
  schemas:
    CreateUserReq:
      type: object`;

    const state = parseYamlForTableEditor(yaml);
    const operation = state.operations[0] || {};
    const parameter = (operation.parameters || [])[0] || {};

    return {
        pass: state.kind === 'openapi3' &&
            Array.isArray(state.schemaRefs) &&
            state.schemaRefs.length === 1 &&
            state.schemaRefs[0].ref === '#/components/schemas/CreateUserReq' &&
            operation.method === 'post' &&
            parameter.in === 'body' &&
            parameter.ref === '#/components/schemas/CreateUserReq' &&
            parameter.required === true,
        message: JSON.stringify(parameter)
    };
});

test('tableEditor', '应能把表格编辑结果回写为 YAML 并保留定义区', function() {
    const yaml = `swagger: "2.0"
info:
  title: User API
  version: "1.0"
paths:
  /users:
    get:
      operationId: getUsers
      summary: 查询用户
      parameters:
        - name: keyword
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: OK
definitions:
  User:
    type: object
    properties:
      id:
        type: integer`;

    const state = parseYamlForTableEditor(yaml);
    state.operations[0].path = '/members';
    state.operations[0].method = 'post';
    state.operations[0].operationId = 'createMember';
    state.operations[0].summary = '创建成员';
    state.operations[0].description = '通过表格回写';
    state.operations[0].classAnnotations = ['@Secured'];
    state.operations[0].methodAnnotations = ['@AuditLog("create-member")'];
    state.operations[0].parameters[0].required = true;
    state.operations[0].parameters[0].minLength = '1';
    state.operations[0].parameters[0].maxLength = '64';

    const nextYaml = applyTableEditorStateToYaml(yaml, state);
    const parsed = jsyaml.load(nextYaml);
    const operation = parsed.paths['/members'].post;
    const parameter = operation.parameters[0];

    return {
        pass: !!parsed.definitions.User &&
            !parsed.paths['/users'] &&
            operation.operationId === 'createMember' &&
            operation.summary === '创建成员' &&
            operation.description === '通过表格回写' &&
            parsed.paths['/members']['x-java-class-annotations'][0] === '@Secured' &&
            operation['x-java-method-annotations'][0] === '@AuditLog("create-member")' &&
            parameter.required === true &&
            parameter.schema.minLength === 1 &&
            parameter.schema.maxLength === 64,
        message: nextYaml
    };
});

test('tableEditor', '应能把表格新增 OpenAPI requestBody 回写为 requestBody 结构', function() {
    const baseYaml = `openapi: 3.0.1
info:
  title: Demo
  version: "1.0"
paths: {}
components:
  schemas:
    CreateUserReq:
      type: object`;

    const state = {
        kind: 'openapi3',
        operations: [
            {
                path: '/users',
                method: 'post',
                operationId: 'createUser',
                summary: '创建用户',
                description: '',
                classAnnotations: [],
                methodAnnotations: [],
                parameters: [
                    {
                        name: 'body',
                        in: 'body',
                        required: true,
                        type: '',
                        format: '',
                        description: '',
                        minimum: '',
                        maximum: '',
                        minLength: '',
                        maxLength: '',
                        pattern: '',
                        ref: '#/components/schemas/CreateUserReq'
                    }
                ]
            }
        ]
    };

    const nextYaml = applyTableEditorStateToYaml(baseYaml, state);
    const parsed = jsyaml.load(nextYaml);
    const operation = parsed.paths['/users'].post;

    return {
        pass: !!operation.requestBody &&
            operation.requestBody.required === true &&
            operation.requestBody.content['application/json'].schema.$ref === '#/components/schemas/CreateUserReq' &&
            (!operation.parameters || operation.parameters.length === 0),
        message: nextYaml
    };
});

test('tableEditor', '应能把新建实体骨架一起回写到 Swagger definitions', function() {
    const baseYaml = `swagger: "2.0"
info:
  title: Demo
  version: "1.0"
paths: {}`;

    const state = {
        kind: 'swagger2',
        operations: [
            {
                path: '/users',
                method: 'post',
                operationId: 'createUser',
                summary: '创建用户',
                description: '',
                classAnnotations: [],
                methodAnnotations: [],
                parameters: [
                    {
                        name: 'body',
                        in: 'body',
                        required: true,
                        type: 'object',
                        ref: '#/definitions/CreateUserReq'
                    }
                ]
            }
        ],
        createdSchemas: {
            CreateUserReq: {
                type: 'object',
                description: 'TODO: 完善 CreateUserReq 字段',
                properties: {}
            }
        }
    };

    const nextYaml = applyTableEditorStateToYaml(baseYaml, state);
    const parsed = jsyaml.load(nextYaml);

    return {
        pass: !!parsed.definitions &&
            !!parsed.definitions.CreateUserReq &&
            parsed.definitions.CreateUserReq.type === 'object' &&
            parsed.paths['/users'].post.parameters[0].schema.$ref === '#/definitions/CreateUserReq' &&
            !parsed.paths['/users'].post.parameters[0].schema.type,
        message: nextYaml
    };
});

test('tableEditor', 'API 导航卡片应突出当前编辑项并收敛说明文案', function() {
    const operations = [
        {
            id: 'get /users',
            path: '/users',
            method: 'get',
            operationId: 'getUsers',
            summary: '查询用户列表',
            parameters: [{ name: 'keyword', in: 'query' }]
        },
        {
            id: 'post /users',
            path: '/users',
            method: 'post',
            operationId: 'createUser',
            summary: '创建用户',
            parameters: [{ name: 'body', in: 'body' }, { name: 'traceId', in: 'header' }]
        }
    ];

    tableEditorMarkup.setTableEditorState({ operations });
    tableEditorMarkup.setSelectedOperationId('post /users');
    const html = tableEditorMarkup.buildTableEditorApiTable(operations);

    return {
        pass: html.includes('当前编辑') &&
            html.includes('2 个参数') &&
            !html.includes('编辑当前接口') &&
            !html.includes('点卡片后在右侧编辑细节'),
        message: html
    };
});

test('tableEditor', '当前接口详情应按基础信息与校验约束分组展示参数编辑区', function() {
    const operation = {
        id: 'get /users',
        path: '/users',
        method: 'get',
        operationId: 'getUsers',
        summary: '查询用户',
        description: '按关键字搜索用户',
        classAnnotations: ['@Secured'],
        methodAnnotations: ['@AuditLog("query-users")'],
        parameters: [
            {
                name: 'keyword',
                in: 'query',
                required: false,
                type: 'string',
                ref: '',
                description: '搜索词',
                minLength: '1',
                maxLength: '32',
                minimum: '',
                maximum: ''
            }
        ]
    };

    tableEditorMarkup.setTableEditorState({ operations: [operation] });
    tableEditorMarkup.setFocusedParamKey('get /users::0');
    const html = tableEditorMarkup.buildTableEditorDetail(operation);

    return {
        pass: html.includes('参数导航') &&
            html.includes('参数胶囊可跳转') &&
            html.includes('YAML 原生字段') &&
            html.includes('校验约束') &&
            html.includes('说明与引用') &&
            html.includes('Swagger / OpenAPI 原生字段') &&
            html.includes('operationId（YAML）') &&
            html.includes('摘要 summary（YAML）') &&
            html.includes('代码预览') &&
            html.includes('注解归属') &&
            html.includes('类级作用范围') &&
            html.includes('当前方法注解') &&
            html.includes('统一 Controller 类') &&
            html.includes('当前方法预览') &&
            html.includes('@RestController') &&
            html.includes('@Secured') &&
            html.includes('@AuditLog'),
        message: html
    };
});

test('tableEditor', '参数形态应使用固定下拉，并提供引用实体入口', function() {
    const operation = {
        id: 'post /users',
        path: '/users',
        method: 'post',
        operationId: 'createUser',
        summary: '创建用户',
        description: '',
        classAnnotations: [],
        methodAnnotations: [],
        parameters: [
            {
                name: 'body',
                in: 'body',
                required: true,
                type: 'object',
                ref: '#/definitions/CreateUserReq',
                description: '请求体',
                minLength: '',
                maxLength: '',
                minimum: '',
                maximum: ''
            }
        ],
        schemaRefs: [
            { name: 'CreateUserReq', ref: '#/definitions/CreateUserReq' },
            { name: 'AddressInfo', ref: '#/definitions/AddressInfo' }
        ]
    };

    tableEditorMarkup.setTableEditorState({
        kind: 'swagger2',
        operations: [operation],
        schemaRefs: operation.schemaRefs
    });
    const html = tableEditorMarkup.buildTableEditorDetail(operation);

    return {
        pass: html.includes('参数形态') &&
            html.includes('实体对象（$ref）') &&
            html.includes('实体数组（items.$ref）') &&
            html.includes('已有实体') &&
            html.includes('CreateUserReq') &&
            html.includes('新建实体并引用') &&
            html.includes('高级：自定义 $ref 路径'),
        message: html
    };
});

test('tableEditor', '非 body 参数不应展示实体引用形态', function() {
    const operation = {
        id: 'get /users',
        path: '/users',
        method: 'get',
        operationId: 'getUsers',
        summary: '查询用户',
        description: '',
        classAnnotations: [],
        methodAnnotations: [],
        parameters: [
            {
                name: 'keyword',
                in: 'query',
                required: false,
                type: 'string',
                ref: '',
                description: '搜索词'
            }
        ]
    };

    tableEditorMarkup.setTableEditorState({ operations: [operation], schemaRefs: [] });
    const html = tableEditorMarkup.buildTableEditorDetail(operation);

    return {
        pass: html.includes('path / query / header') &&
            !html.includes('实体对象（$ref）') &&
            !html.includes('实体数组（items.$ref）'),
        message: html
    };
});

test('tableEditor', 'body 参数应明确提示 object 仅支持空壳回写，复杂字段需切回 YAML 或使用 $ref', function() {
    const operation = {
        id: 'post /users',
        path: '/users',
        method: 'post',
        operationId: 'createUser',
        summary: '创建用户',
        description: '创建用户',
        classAnnotations: [],
        methodAnnotations: [],
        parameters: [
            {
                name: 'body',
                in: 'body',
                required: true,
                type: 'object',
                ref: '',
                description: '请求体',
                minLength: '',
                maxLength: '',
                minimum: '',
                maximum: ''
            }
        ]
    };

    tableEditorMarkup.setTableEditorState({ operations: [operation] });
    const html = tableEditorMarkup.buildTableEditorDetail(operation);

    return {
        pass: html.includes('当前是 body / requestBody 建模') &&
            html.includes('内联 object') &&
            html.includes('暂不展开对象字段') &&
            html.includes('改用 $ref 或切回 YAML'),
        message: html
    };
});

test('tableEditor', '新增参数入口应提供 query/path/header/body 可选列表', function() {
    const operation = {
        id: 'get /users',
        path: '/users',
        method: 'get',
        operationId: 'getUsers',
        summary: '查询用户',
        description: '',
        classAnnotations: [],
        methodAnnotations: [],
        parameters: []
    };

    tableEditorMarkup.setTableEditorState({ operations: [operation] });
    const html = tableEditorMarkup.buildTableEditorDetail(operation);

    return {
        pass: html.includes('新增 query 参数') &&
            html.includes('新增 path 参数') &&
            html.includes('新增 header 参数') &&
            html.includes('新增 body 参数'),
        message: html
    };
});

// 注意：字段级别变更（requestBody schema）的检测逻辑在 index.html 中有完整实现
// 但 render-test.js 使用简化版 computeImpact，不包含该逻辑
// 如需测试字段变更，请在浏览器中手动验证

// ============================================
// 测试报告
// ============================================
console.log('\n' + '='.repeat(70));
console.log('   测试报告');
console.log('='.repeat(70) + '\n');

console.log(`总计: ${passed + failed} 个测试`);
console.log(`\x1b[32m通过: ${passed}\x1b[0m`);
console.log(`\x1b[31m失败: ${failed}\x1b[0m`);

if (failed > 0) {
    console.log('\n\x1b[31m' + '-'.repeat(50) + '\x1b[0m');
    console.log('\n\x1b[31m失败的测试:\x1b[0m\n');
    results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`#${r.testId} ${r.name}`);
        console.log(`  原因: ${r.actual}\n`);
    });
}

console.log('\n' + '='.repeat(70));

process.exit(failed > 0 ? 1 : 0);
