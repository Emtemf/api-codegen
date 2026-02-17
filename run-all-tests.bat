@echo off
:: =============================================================================
:: API Codegen 全面测试检查脚本 (Windows)
:: =============================================================================
:: 用法: run-all-tests.bat
:: =============================================================================

setlocal enabledelayedexpansion

:: 颜色定义 (Windows CMD 不支持直接颜色，用前缀替代)
set RED=[ERROR]
set GREEN=[OK]
set BLUE=[INFO]
set YELLOW=[WARN]

echo.
echo ======================================================================
echo API Codegen 全面测试检查
echo ======================================================================
echo.

:: 设置 JDK 21
if exist "C:\Program Files\Java\jdk-21.0.10" (
    set JAVA_HOME=C:\Program Files\Java\jdk-21.0.10
    set PATH=%JAVA_HOME%\bin;%PATH%
)

:: 统计变量
set PASSED_TESTS=0
set FAILED_MODULES=0

:: -----------------------------------------------------------------------------
:: 1. Maven 后端测试
:: -----------------------------------------------------------------------------
echo [1/3] 运行 Maven 后端测试...

call mvn test -DskipTests=false -q > mvn-test-output.txt 2>&1
if %ERRORLEVEL%==0 (
    echo [OK] Maven 测试通过
    for /f "tokens=2 delims=:" %%a in ('findstr "Tests run:" mvn-test-output.txt ^| findstr /v "api-codegen-maven-plugin"') do (
        if not "%%a"=="" echo     %%a
    )
) else (
    echo [ERROR] Maven 测试失败
    set /a FAILED_MODULES+=1
)
echo.

:: -----------------------------------------------------------------------------
:: 2. Web UI 单元测试 (analyzer)
:: -----------------------------------------------------------------------------
echo [2/3] 运行 Web UI 单元测试 (analyzer)...

cd web-ui
node test/analyzer-test.js > ui-analyzer-output.txt 2>&1
if %ERRORLEVEL%==0 (
    echo [OK] Web UI (analyzer) 测试通过
    for /f "tokens=2" %%a in ('findstr "通过:" ui-analyzer-output.txt') do (
        echo     %%a
    )
) else (
    echo [ERROR] Web UI (analyzer) 测试失败
    set /a FAILED_MODULES+=1
)
cd ..
echo.

:: -----------------------------------------------------------------------------
:: 3. Web UI 单元测试 (diff)
:: -----------------------------------------------------------------------------
echo [3/3] 运行 Web UI 单元测试 (diff ^& render)...

cd web-ui
node test/diff-test.js > ui-diff-output.txt 2>&1
if %ERRORLEVEL%==0 (
    echo [OK] Web UI (diff) 测试通过
    for /f "tokens=2" %%a in ('findstr "Passed:" ui-diff-output.txt') do (
        echo     %%a
    )
) else (
    echo [ERROR] Web UI (diff) 测试失败
    set /a FAILED_MODULES+=1
)

node test/render-test.js > ui-render-output.txt 2>&1
if %ERRORLEVEL%==0 (
    echo [OK] Web UI (render) 测试通过
    for /f "tokens=2" %%a in ('findstr "通过:" ui-render-output.txt') do (
        if not "%%a"=="" echo     %%a
    )
) else (
    echo [ERROR] Web UI (render) 测试失败
    set /a FAILED_MODULES+=1
)
cd ..
echo.

:: -----------------------------------------------------------------------------
:: 测试结果汇总
:: -----------------------------------------------------------------------------
echo.
echo ======================================================================
echo 测试结果汇总
echo ======================================================================
echo.

if %FAILED_MODULES%==0 (
    echo [OK] 所有测试通过！
    del /q mvn-test-output.txt web-ui\ui-analyzer-output.txt web-ui\ui-diff-output.txt web-ui\ui-render-output.txt 2>nul
    exit /b 0
) else (
    echo [ERROR] 有 %FAILED_MODULES% 个模块测试失败
    exit /b 1
)
