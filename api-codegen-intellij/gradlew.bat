@rem Gradle wrapper script for Windows
@echo off

setlocal

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar

set JAVA_EXE=java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

echo Error: JAVA_HOME is not set and no 'java' command could be found.
goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto execute

echo Error: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
goto fail

:execute
"%JAVA_EXE%" %JAVA_OPTS% -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*

:end
endlocal
exit /b 0

:fail
exit /b 1
