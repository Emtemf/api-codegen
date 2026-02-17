#!/bin/bash
# =============================================================================
# API Codegen 全面测试检查脚本
# =============================================================================
# 用法: ./run-all-tests.sh
# 或在 Git hook 中调用: ./run-all-tests.sh --hook
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检测是否是 Windows
IS_WINDOWS=false
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OSTYPE" == "cygwin" ]]; then
    IS_WINDOWS=true
fi

# 设置 JDK 21
if [ -d "C:/Program Files/Java/jdk-21.0.10" ]; then
    export JAVA_HOME="C:/Program Files/Java/jdk-21.0.10"
    export PATH="$JAVA_HOME/bin:$PATH"
fi

echo -e "${BLUE}======================================================================"
echo "API Codegen 全面测试检查"
echo -e "======================================================================${NC}"
echo ""

# 统计变量
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
MODULE_RESULTS=()

# -----------------------------------------------------------------------------
# 1. Maven 后端测试
# -----------------------------------------------------------------------------
echo -e "${BLUE}[1/3] 运行 Maven 后端测试 (api-codegen-core)...${NC}"

if mvn test -DskipTests=false -q 2>&1 | tee /tmp/mvn-test-output.txt; then
    # 提取测试统计
    MVN_TESTS=$(grep -oP "Tests run: \K\d+" /tmp/mvn-test-output.txt | tail -1 || echo "0")
    echo -e "${GREEN}✓ Maven 测试通过: $MVN_TESTS 个测试${NC}"
    MODULE_RESULTS+=("Maven: $MVN_TESTS 通过")
    PASSED_TESTS=$((PASSED_TESTS + MVN_TESTS))
else
    echo -e "${RED}✗ Maven 测试失败${NC}"
    MODULE_RESULTS+=("Maven: 失败")
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# 2. Web UI 单元测试 (analyzer)
# -----------------------------------------------------------------------------
echo -e "${BLUE}[2/3] 运行 Web UI 单元测试 (analyzer)...${NC}"

cd web-ui
if node test/analyzer-test.js 2>&1 | tee /tmp/ui-analyzer-output.txt; then
    UI_ANALYZER_TESTS=$(grep -oP "总计: \K\d+" /tmp/ui-analyzer-output.txt || echo "0")
    UI_ANALYZER_PASSED=$(grep -oP "通过: \K\d+" /tmp/ui-analyzer-output.txt || echo "0")
    echo -e "${GREEN}✓ Web UI (analyzer) 测试通过: $UI_ANALYZER_PASSED/$UI_ANALYZER_TESTS${NC}"
    MODULE_RESULTS+=("UI-analyzer: $UI_ANALYZER_PASSED 通过")
    PASSED_TESTS=$((PASSED_TESTS + UI_ANALYZER_PASSED))
else
    echo -e "${RED}✗ Web UI (analyzer) 测试失败${NC}"
    MODULE_RESULTS+=("UI-analyzer: 失败")
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# -----------------------------------------------------------------------------
# 3. Web UI 单元测试 (diff)
# -----------------------------------------------------------------------------
echo -e "${BLUE}[3/3] 运行 Web UI 单元测试 (diff & render)...${NC}"

# diff 测试
if node test/diff-test.js 2>&1 | tee /tmp/ui-diff-output.txt; then
    UI_DIFF_PASSED=$(grep -oP "Passed: \K\d+" /tmp/ui-diff-output.txt || echo "0")
    echo -e "${GREEN}✓ Web UI (diff) 测试通过: $UI_DIFF_PASSED${NC}"
    MODULE_RESULTS+=("UI-diff: $UI_DIFF_PASSED 通过")
    PASSED_TESTS=$((PASSED_TESTS + UI_DIFF_PASSED))
else
    echo -e "${RED}✗ Web UI (diff) 测试失败${NC}"
    MODULE_RESULTS+=("UI-diff: 失败")
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# render 测试
if node test/render-test.js 2>&1 | tee /tmp/ui-render-output.txt; then
    UI_RENDER_PASSED=$(grep -oP "通过: \K\d+" /tmp/ui-render-output.txt | tail -1 || echo "0")
    echo -e "${GREEN}✓ Web UI (render) 测试通过: $UI_RENDER_PASSED${NC}"
    MODULE_RESULTS+=("UI-render: $UI_RENDER_PASSED 通过")
    PASSED_TESTS=$((PASSED_TESTS + UI_RENDER_PASSED))
else
    echo -e "${RED}✗ Web UI (render) 测试失败${NC}"
    MODULE_RESULTS+=("UI-render: 失败")
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

cd ..

# -----------------------------------------------------------------------------
# 测试结果汇总
# -----------------------------------------------------------------------------
echo ""
echo -e "${BLUE}======================================================================"
echo "测试结果汇总"
echo -e "======================================================================${NC}"
echo ""

for result in "${MODULE_RESULTS[@]}"; do
    echo -e "  $result"
done

echo ""
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    echo -e "总计: $PASSED_TESTS 个测试通过"
    exit 0
else
    echo -e "${RED}✗ 有 $FAILED_TESTS 个模块测试失败${NC}"
    exit 1
fi
