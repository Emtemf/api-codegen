@echo off
:: =============================================================================
:: Git pre-commit hook for API Codegen (Windows)
:: =============================================================================
:: 此脚本会在每次 git commit 前自动运行测试
:: 安装方法: 复制此文件到 .git\hooks\pre-commit
:: =============================================================================

cd /d "%CD%"

echo Running API Codegen tests before commit...
echo.

call run-all-tests.bat

if %ERRORLEVEL% neq 0 (
    echo.
    echo ==========================================
    echo 测试失败，commit 已取消
    echo 请修复测试问题后重试
    echo ==========================================
    exit /b 1
)
