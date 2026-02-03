@echo off
echo ============================================
echo Git 代理清除并推送到 GitHub
echo ============================================

echo.
echo [1/3] 清除 Git 代理配置...
git config --global --unset http.proxy
git config --global --unset https.proxy
echo 完成！

echo.
echo [2/3] 推送到 GitHub...
git push -u origin main

echo.
echo [3/3] 完成！
pause
