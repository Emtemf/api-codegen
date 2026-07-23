#!/usr/bin/env python3
"""
Loop Engine - 自动化 issue 读取、修复、解答、修改、提交的循环引擎

使用方式:
  python scripts/loop_engine.py                    # 从 GitHub 读取 issues
  python scripts/loop_engine.py --yaml path.yaml   # 从本地 YAML 读取
  python scripts/loop_engine.py --dry-run          # 干跑模式，不实际修改
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# ============================================================
# 配置
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent
WEB_UI_ROOT = PROJECT_ROOT / "web-ui"
CORE_JAR = PROJECT_ROOT / "api-codegen-core" / "target" / "api-codegen.jar"
TEMP_OUTPUT = PROJECT_ROOT / "target" / "loop-engine-output"

# ============================================================
# 数据结构
# ============================================================

@dataclass
class Issue:
    """单个 issue 的表示"""
    key: str
    message: str
    severity: str  # error, warn, info
    rule: str = ""
    fixable: bool = False
    api: str = ""
    locator: dict = field(default_factory=dict)
    source: str = ""  # github, yaml, stdin


@dataclass
class LoopState:
    """循环状态"""
    iteration: int = 0
    issues_found: int = 0
    issues_fixed: int = 0
    issues_manual: int = 0
    yaml_changed: bool = False
    commit_hash: str = ""


# ============================================================
# 工具函数
# ============================================================

def run_command(cmd: list, cwd: str = None, timeout: int = 120) -> tuple:
    """运行命令并返回 (exit_code, stdout, stderr)"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd or str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except Exception as e:
        return -1, "", str(e)


def call_core_analyze(yaml_content: str) -> dict:
    """调用 core bridge 进行分析"""
    # 通过 web-ui server 的 /api/analyze 端点
    import urllib.request

    port = int(os.environ.get("PORT", "19090"))
    url = f"http://127.0.0.1:{port}/api/analyze"

    data = json.dumps({"yaml": yaml_content}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"error": str(e), "issues": []}


def call_core_fix(yaml_content: str, issue_keys: list) -> dict:
    """调用 core bridge 进行修复"""
    import urllib.request

    port = int(os.environ.get("PORT", "19090"))
    url = f"http://127.0.0.1:{port}/api/fix"

    data = json.dumps({
        "yaml": yaml_content,
        "selectedIssueKeys": issue_keys
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"error": str(e), "fixedYaml": yaml_content, "fixedCount": 0}


def read_yaml_from_github(issue_number: int = None) -> str:
    """从 GitHub 读取 issue 或 yaml"""
    # 读取 api-example.yaml 作为示例
    yaml_path = PROJECT_ROOT / "api-example.yaml"
    if yaml_path.exists():
        return yaml_path.read_text(encoding="utf-8")
    return ""


def read_yaml_from_file(path: str) -> str:
    """从本地文件读取 YAML"""
    p = Path(path)
    if p.exists():
        return p.read_text(encoding="utf-8")
    return ""


def parse_issues(response: dict) -> list:
    """解析分析结果为 Issue 列表"""
    issues = []
    for item in response.get("issues", []):
        issues.append(Issue(
            key=item.get("key", ""),
            message=item.get("message", ""),
            severity=item.get("severity", "info"),
            rule=item.get("rule", item.get("ruleCode", "")),
            fixable=item.get("fixable", False),
            api=item.get("api", ""),
            locator=item.get("locator", {}),
        ))
    return issues


def git_commit(message: str, files: list = None) -> str:
    """Git commit 并返回 commit hash"""
    if files:
        for f in files:
            run_command(["git", "add", str(f)])

    exit_code, stdout, stderr = run_command(
        ["git", "commit", "-m", message, "--allow-empty"]
    )

    if exit_code == 0:
        exit_code, hash_out, _ = run_command(
            ["git", "rev-parse", "HEAD"]
        )
        return hash_out.strip() if exit_code == 0 else ""
    return ""


def git_push() -> bool:
    """Git push"""
    exit_code, _, _ = run_command(
        ["git", "push", "origin", "HEAD"],
        timeout=60
    )
    return exit_code == 0


# ============================================================
# Loop Engine 主逻辑
# ============================================================

class LoopEngine:
    """自动化 issue 修复循环引擎"""

    def __init__(self, yaml_path: str = None, dry_run: bool = False, max_iterations: int = 5):
        self.yaml_path = yaml_path
        self.dry_run = dry_run
        self.max_iterations = max_iterations
        self.state = LoopState()
        self.log_lines = []

    def log(self, message: str, level: str = "INFO"):
        """记录日志"""
        timestamp = time.strftime("%H:%M:%S")
        line = f"[{timestamp}] [{level}] {message}"
        self.log_lines.append(line)
        print(line)

    def ensure_core_built(self) -> bool:
        """确保 core 已构建"""
        if CORE_JAR.exists():
            return True

        self.log("Building api-codegen-core...")
        exit_code, stdout, stderr = run_command(
            ["./mvnw", "-q", "-pl", "api-codegen-core", "-am", "-DskipTests", "package"]
        )

        if exit_code == 0:
            self.log("Core built successfully")
            return True
        else:
            self.log(f"Failed to build core: {stderr}", "ERROR")
            return False

    def ensure_server_running(self) -> bool:
        """确保 web-ui server 正在运行"""
        import urllib.request

        port = int(os.environ.get("PORT", "19090"))
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=2)
            return True
        except:
            # 启动 server
            self.log("Starting web-ui server...")
            subprocess.Popen(
                ["node", "server.js"],
                cwd=str(WEB_UI_ROOT),
                env={**os.environ, "PORT": str(port)},
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            time.sleep(3)
            return True

    def read_input(self) -> str:
        """读取输入 YAML"""
        if self.yaml_path:
            return read_yaml_from_file(self.yaml_path)
        else:
            return read_yaml_from_github()

    def analyze(self, yaml_content: str) -> list:
        """分析 YAML 并返回 issues"""
        response = call_core_analyze(yaml_content)
        return parse_issues(response)

    def fix_issues(self, yaml_content: str, issues: list) -> tuple:
        """修复 issues 并返回 (fixed_yaml, fixed_count)"""
        fixable_issues = [i for i in issues if i.fixable]

        if not fixable_issues:
            self.log("No fixable issues found")
            return yaml_content, 0

        issue_keys = [i.key for i in fixable_issues]
        self.log(f"Attempting to fix {len(issue_keys)} issues: {issue_keys}")

        response = call_core_fix(yaml_content, issue_keys)

        if "error" in response:
            self.log(f"Fix failed: {response['error']}", "ERROR")
            return yaml_content, 0

        fixed_yaml = response.get("fixedYaml", yaml_content)
        fixed_count = response.get("fixedCount", 0)

        return fixed_yaml, fixed_count

    def apply_fix(self, original_yaml: str, fixed_yaml: str, issue: Issue) -> str:
        """应用单个 issue 的修复到 YAML"""
        if not issue.locator:
            return original_yaml

        # 简单的路径修复示例
        if issue.rule == "DFX-001" and issue.locator.get("kind") == "swagger-path":
            path = issue.locator.get("path", "")
            if "//" in path:
                fixed_path = re.sub(r'/+', '/', path)
                return original_yaml.replace(path, fixed_path)

        # 其他类型的修复，使用 core 返回的结果
        return fixed_yaml

    def generate_explanation(self, issue: Issue, fix_applied: bool) -> str:
        """生成 issue 的解答/说明"""
        explanations = {
            "DFX-001": "路径包含重复斜杠，已规范化为单斜杠",
            "DFX-003": "必填参数缺少 @NotNull 校验注解",
            "DFX-004": "String 字段缺少长度校验",
            "DFX-005": "邮箱字段缺少 @Email 校验",
            "DFX-006": "电话字段缺少正则校验",
        }

        base_explanation = explanations.get(issue.rule, issue.message)

        if fix_applied:
            return f"✅ **已自动修复**: {base_explanation}"
        else:
            return f"⚠️ **需手动处理**: {base_explanation}"

    def run(self) -> bool:
        """运行循环引擎"""
        self.log("=" * 60)
        self.log("Loop Engine - 自动化 Issue 修复循环")
        self.log("=" * 60)

        # 1. 确保环境就绪
        if not self.ensure_core_built():
            return False

        if not self.ensure_server_running():
            return False

        # 2. 读取输入
        yaml_content = self.read_input()
        if not yaml_content:
            self.log("No YAML content found", "ERROR")
            return False

        self.log(f"Loaded YAML: {len(yaml_content)} bytes")

        # 3. 循环分析和修复
        while self.state.iteration < self.max_iterations:
            self.state.iteration += 1
            self.log(f"\n--- Iteration {self.state.iteration} ---")

            # 分析
            issues = self.analyze(yaml_content)
            self.state.issues_found = len(issues)
            self.log(f"Found {len(issues)} issues")

            if not issues:
                self.log("🎉 No issues found! YAML is clean.")
                break

            # 分类 issues
            fixable = [i for i in issues if i.fixable]
            manual = [i for i in issues if not i.fixable]

            self.state.issues_fixed += len(fixable)
            self.state.issues_manual += len(manual)

            self.log(f"  Fixable: {len(fixable)}")
            self.log(f"  Manual: {len(manual)}")

            # 生成解答
            for issue in issues:
                explanation = self.generate_explanation(issue, issue.fixable)
                self.log(f"  {issue.key}: {explanation}")

            # 修复
            if fixable:
                fixed_yaml, fixed_count = self.fix_issues(yaml_content, fixable)

                if fixed_count > 0:
                    self.log(f"Applied {fixed_count} fixes")

                    if not self.dry_run:
                        # 写入修复后的 YAML
                        output_path = TEMP_OUTPUT / f"fixed_iter{self.state.iteration}.yaml"
                        output_path.parent.mkdir(parents=True, exist_ok=True)
                        output_path.write_text(fixed_yaml, encoding="utf-8")

                        # 更新 YAML 继续下一轮
                        yaml_content = fixed_yaml
                        self.state.yaml_changed = True
                    else:
                        self.log("[DRY RUN] Would write fixed YAML", "DRY")
                        break
                else:
                    self.log("No fixes applied, stopping")
                    break
            else:
                self.log("No fixable issues, stopping")
                break

        # 4. 提交
        if self.state.yaml_changed and not self.dry_run:
            self.log("\nCommitting changes...")
            commit_msg = f"fix: auto-fix {self.state.issues_fixed} issues (loop engine)"
            self.state.commit_hash = git_commit(commit_msg)

            if self.state.commit_hash:
                self.log(f"Committed: {self.state.commit_hash[:8]}")

                # Push
                if git_push():
                    self.log("Pushed to remote")
                else:
                    self.log("Push failed (may need manual push)", "WARN")

        # 5. 输出报告
        self.print_report()

        return True

    def print_report(self):
        """输出最终报告"""
        self.log("\n" + "=" * 60)
        self.log("Loop Engine Report")
        self.log("=" * 60)
        self.log(f"  Iterations: {self.state.iteration}")
        self.log(f"  Issues found: {self.state.issues_found}")
        self.log(f"  Issues fixed: {self.state.issues_fixed}")
        self.log(f"  Issues manual: {self.state.issues_manual}")
        self.log(f"  YAML changed: {self.state.yaml_changed}")
        self.log(f"  Commit: {self.state.commit_hash[:8] if self.state.commit_hash else 'N/A'}")
        self.log("=" * 60)

        # 保存日志
        log_path = TEMP_OUTPUT / "loop_engine.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("\n".join(self.log_lines), encoding="utf-8")
        self.log(f"Log saved to: {log_path}")


# ============================================================
# CLI 入口
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="Loop Engine - 自动化 issue 修复循环"
    )
    parser.add_argument(
        "--yaml",
        type=str,
        help="输入 YAML 文件路径"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="干跑模式，不实际修改文件"
    )
    parser.add_argument(
        "--max-iterations",
        type=int,
        default=5,
        help="最大迭代次数 (默认: 5)"
    )

    args = parser.parse_args()

    engine = LoopEngine(
        yaml_path=args.yaml,
        dry_run=args.dry_run,
        max_iterations=args.max_iterations
    )

    success = engine.run()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
