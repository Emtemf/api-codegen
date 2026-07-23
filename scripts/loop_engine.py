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
    started_at: str = ""
    completed_at: str = ""
    status: str = "idle"  # idle, running, completed, failed
    current_yaml_path: str = ""
    notifications: list = field(default_factory=list)


# ============================================================
# GitHub 集成
# ============================================================

class GitHubIntegration:
    """GitHub API 集成"""

    def __init__(self, repo: str = None):
        self.repo = repo or self._detect_repo()
        self.token = os.environ.get("GITHUB_TOKEN", "")

    def _detect_repo(self) -> str:
        """自动检测仓库"""
        exit_code, stdout, _ = run_command(
            ["git", "remote", "get-url", "origin"]
        )
        if exit_code == 0 and "github.com" in stdout:
            # 解析 owner/repo
            match = re.search(r'github\.com[:/](.+?)(?:\.git)?$', stdout)
            if match:
                return match.group(1)
        return ""

    def get_issues(self, state: str = "open") -> list:
        """获取 GitHub issues"""
        if not self.repo or not self.token:
            return []

        import urllib.request

        url = f"https://api.github.com/repos/{self.repo}/issues?state={state}"
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"token {self.token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"Failed to fetch issues: {e}")
            return []

    def extract_yaml_from_issue(self, issue: dict) -> str:
        """从 issue 内容提取 YAML"""
        body = issue.get("body", "")

        # 尝试提取 YAML 代码块
        yaml_match = re.search(r'```yaml\s*\n(.*?)\n```', body, re.DOTALL)
        if yaml_match:
            return yaml_match.group(1).strip()

        # 尝试提取 URL
        url_match = re.search(r'https?://[^\s]+\.yaml', body)
        if url_match:
            import urllib.request
            try:
                with urllib.request.urlopen(url_match.group(0), timeout=10) as resp:
                    return resp.read().decode("utf-8")
            except:
                pass

        return ""

    def create_issue_comment(self, issue_number: int, comment: str) -> bool:
        """在 issue 上添加评论"""
        if not self.repo or not self.token:
            return False

        import urllib.request

        url = f"https://api.github.com/repos/{self.repo}/issues/{issue_number}/comments"
        data = json.dumps({"body": comment}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Authorization": f"token {self.token}",
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status == 201
        except Exception as e:
            print(f"Failed to create comment: {e}")
            return False

    def close_issue(self, issue_number: int) -> bool:
        """关闭 issue"""
        if not self.repo or not self.token:
            return False

        import urllib.request

        url = f"https://api.github.com/repos/{self.repo}/issues/{issue_number}"
        data = json.dumps({"state": "closed"}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            method="PATCH",
            headers={
                "Authorization": f"token {self.token}",
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status == 200
        except Exception as e:
            print(f"Failed to close issue: {e}")
            return False


# ============================================================
# 持久化状态
# ============================================================

class StatePersistence:
    """状态持久化管理"""

    def __init__(self, state_dir: Path = None):
        self.state_dir = state_dir or (PROJECT_ROOT / ".omc" / "state" / "loop-engine")
        self.state_dir.mkdir(parents=True, exist_ok=True)

    def save_state(self, state: LoopState):
        """保存状态到文件"""
        state_file = self.state_dir / "state.json"
        state_data = {
            "iteration": state.iteration,
            "issues_found": state.issues_found,
            "issues_fixed": state.issues_fixed,
            "issues_manual": state.issues_manual,
            "yaml_changed": state.yaml_changed,
            "commit_hash": state.commit_hash,
            "started_at": state.started_at,
            "completed_at": state.completed_at,
            "status": state.status,
            "current_yaml_path": state.current_yaml_path,
            "notifications": state.notifications,
            "saved_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        state_file.write_text(json.dumps(state_data, indent=2, ensure_ascii=False), encoding="utf-8")

    def load_state(self) -> LoopState:
        """从文件加载状态"""
        state_file = self.state_dir / "state.json"
        if not state_file.exists():
            return LoopState()

        try:
            data = json.loads(state_file.read_text(encoding="utf-8"))
            return LoopState(
                iteration=data.get("iteration", 0),
                issues_found=data.get("issues_found", 0),
                issues_fixed=data.get("issues_fixed", 0),
                issues_manual=data.get("issues_manual", 0),
                yaml_changed=data.get("yaml_changed", False),
                commit_hash=data.get("commit_hash", ""),
                started_at=data.get("started_at", ""),
                completed_at=data.get("completed_at", ""),
                status=data.get("status", "idle"),
                current_yaml_path=data.get("current_yaml_path", ""),
                notifications=data.get("notifications", [])
            )
        except Exception:
            return LoopState()

    def clear_state(self):
        """清除状态"""
        state_file = self.state_dir / "state.json"
        if state_file.exists():
            state_file.unlink()


# ============================================================
# 通知系统
# ============================================================

class NotificationSystem:
    """通知系统"""

    def __init__(self):
        self.notifications = []

    def add_notification(self, message: str, level: str = "info", channel: str = "default"):
        """添加通知"""
        notification = {
            "message": message,
            "level": level,
            "channel": channel,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        self.notifications.append(notification)

    def send_webhook(self, url: str, message: str) -> bool:
        """发送 webhook 通知"""
        if not url:
            return False

        import urllib.request

        data = json.dumps({
            "text": message,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
        }).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status == 200
        except Exception as e:
            print(f"Webhook failed: {e}")
            return False

    def send_slack(self, webhook_url: str, message: str) -> bool:
        """发送 Slack 通知"""
        if not webhook_url:
            return False

        import urllib.request

        data = json.dumps({
            "text": message,
            "username": "Loop Engine",
            "icon_emoji": ":robot_face:"
        }).encode("utf-8")

        req = urllib.request.Request(
            webhook_url,
            data=data,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status == 200
        except Exception as e:
            print(f"Slack notification failed: {e}")
            return False

    def get_summary(self) -> str:
        """获取通知摘要"""
        if not self.notifications:
            return "No notifications"

        lines = []
        for n in self.notifications[-5:]:  # 最近 5 条
            lines.append(f"[{n['timestamp']}] [{n['level'].upper()}] {n['message']}")
        return "\n".join(lines)


# ============================================================
# Web UI 状态 API
# ============================================================

class WebUIStatusAPI:
    """Web UI 状态 API"""

    def __init__(self, port: int = 19090):
        self.port = port
        self.base_url = f"http://127.0.0.1:{port}"

    def update_status(self, state: LoopState) -> bool:
        """更新 Web UI 状态"""
        import urllib.request

        url = f"{self.base_url}/api/loop-engine/status"
        data = json.dumps({
            "iteration": state.iteration,
            "issues_found": state.issues_found,
            "issues_fixed": state.issues_fixed,
            "issues_manual": state.issues_manual,
            "status": state.status,
            "commit_hash": state.commit_hash,
            "started_at": state.started_at,
            "completed_at": state.completed_at
        }).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status == 200
        except:
            # Web UI 可能没有这个端点，静默失败
            return False

    def get_status(self) -> dict:
        """获取 Web UI 状态"""
        import urllib.request

        url = f"{self.base_url}/api/loop-engine/status"
        req = urllib.request.Request(url)

        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except:
            return {}


# ============================================================
# 配置文件
# ============================================================

CONFIG_PATH = PROJECT_ROOT / ".loop-engine.yml"
CONFIG_DEFAULTS = {
    "max_iterations": 5,
    "dry_run": False,
    "github_mode": False,
    "run_tests_before_commit": True,
    "test_command": ["./mvnw", "-q", "test"],
    "watch_interval": 60,
    "notify_webhook": "",
    "notify_slack": "",
    "default_yaml": "api-example.yaml",
    "auto_close_issues": True,
    "commit_message_template": "fix: auto-fix {count} issues (loop engine)",
}


class Config:
    """配置文件管理"""

    def __init__(self, path: Path = None):
        self.path = path or CONFIG_PATH
        self.data = dict(CONFIG_DEFAULTS)
        self.load()

    def load(self):
        """加载配置文件"""
        if not self.path.exists():
            return

        try:
            content = self.path.read_text(encoding="utf-8")
            # 简单的 YAML 解析（避免依赖 PyYAML）
            for line in content.splitlines():
                line = line.split("#")[0].strip()
                if not line or ":" not in line:
                    continue
                key, _, value = line.partition(":")
                key = key.strip()
                value = value.strip().strip('"').strip("'")

                if key in self.data:
                    current = self.data[key]
                    if isinstance(current, bool):
                        self.data[key] = value.lower() in ("true", "1", "yes")
                    elif isinstance(current, int):
                        self.data[key] = int(value)
                    elif isinstance(current, list):
                        self.data[key] = [v.strip() for v in value.split(",")]
                    else:
                        self.data[key] = value
        except Exception as e:
            print(f"Failed to load config: {e}")

    def get(self, key, default=None):
        return self.data.get(key, default if default is not None else CONFIG_DEFAULTS.get(key))

    def save(self):
        """保存配置到文件"""
        lines = ["# Loop Engine 配置", ""]
        for key, value in self.data.items():
            if isinstance(value, bool):
                lines.append(f"{key}: {str(value).lower()}")
            elif isinstance(value, list):
                lines.append(f"{key}: {', '.join(str(v) for v in value)}")
            else:
                lines.append(f'{key}: "{value}"')
        self.path.write_text("\n".join(lines) + "\n", encoding="utf-8")


# ============================================================
# 历史指标
# ============================================================

class MetricsTracker:
    """历史指标追踪"""

    def __init__(self, metrics_dir: Path = None):
        self.metrics_dir = metrics_dir or (PROJECT_ROOT / ".omc" / "state" / "loop-engine")
        self.metrics_dir.mkdir(parents=True, exist_ok=True)
        self.history_file = self.metrics_dir / "history.json"

    def record_run(self, state: LoopState):
        """记录一次运行"""
        history = self.load_history()

        entry = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "iteration": state.iteration,
            "issues_found": state.issues_found,
            "issues_fixed": state.issues_fixed,
            "issues_manual": state.issues_manual,
            "yaml_changed": state.yaml_changed,
            "commit_hash": state.commit_hash,
            "status": state.status,
            "duration_seconds": self._calc_duration(state)
        }

        history.append(entry)

        # 只保留最近 100 条
        if len(history) > 100:
            history = history[-100:]

        self.history_file.write_text(
            json.dumps(history, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )

    def _calc_duration(self, state: LoopState) -> float:
        """计算运行时长"""
        try:
            fmt = "%Y-%m-%d %H:%M:%S"
            start = time.mktime(time.strptime(state.started_at, fmt))
            end = time.mktime(time.strptime(state.completed_at or state.started_at, fmt))
            return round(end - start, 1)
        except Exception:
            return 0.0

    def load_history(self) -> list:
        """加载历史记录"""
        if not self.history_file.exists():
            return []
        try:
            return json.loads(self.history_file.read_text(encoding="utf-8"))
        except Exception:
            return []

    def get_stats(self) -> dict:
        """获取统计信息"""
        history = self.load_history()
        if not history:
            return {"total_runs": 0}

        total_runs = len(history)
        successful = sum(1 for h in history if h.get("status") == "completed")
        total_fixed = sum(h.get("issues_fixed", 0) for h in history)
        total_manual = sum(h.get("issues_manual", 0) for h in history)
        avg_duration = sum(h.get("duration_seconds", 0) for h in history) / total_runs

        return {
            "total_runs": total_runs,
            "successful_runs": successful,
            "success_rate": f"{(successful / total_runs * 100):.0f}%",
            "total_issues_fixed": total_fixed,
            "total_issues_manual": total_manual,
            "avg_duration_seconds": round(avg_duration, 1),
            "last_run": history[-1].get("timestamp", "N/A"),
            "recent_runs": history[-5:]
        }


# ============================================================
# 提交前测试验证
# ============================================================

class TestValidator:
    """提交前测试验证"""

    def __init__(self, command: list = None):
        self.command = command or ["./mvnw", "-q", "test"]

    def run_tests(self) -> tuple:
        """运行测试，返回 (passed, output)"""
        exit_code, stdout, stderr = run_command(self.command, timeout=600)
        output = stdout + stderr
        return exit_code == 0, output

    def run_web_ui_tests(self) -> tuple:
        """运行 Web UI 测试"""
        exit_code, stdout, stderr = run_command(
            ["npm", "run", "test:ci"],
            cwd=str(WEB_UI_ROOT),
            timeout=300
        )
        output = stdout + stderr
        return exit_code == 0, output


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

    def __init__(self, yaml_path: str = None, dry_run: bool = False, max_iterations: int = 5,
                 github_mode: bool = False, resume: bool = False, notify_webhook: str = None,
                 config: Config = None, run_tests: bool = None):
        self.config = config or Config()
        self.yaml_path = yaml_path or self.config.get("default_yaml")
        self.dry_run = dry_run if dry_run else self.config.get("dry_run", False)
        self.max_iterations = max_iterations or self.config.get("max_iterations", 5)
        self.github_mode = github_mode if github_mode else self.config.get("github_mode", False)
        self.resume = resume
        self.log_lines = []

        # 是否提交前跑测试
        self.run_tests_enabled = run_tests if run_tests is not None else self.config.get("run_tests_before_commit", True)

        # 集成组件
        self.github = GitHubIntegration()
        self.persistence = StatePersistence()
        self.notifier = NotificationSystem()
        self.webui_api = WebUIStatusAPI()
        self.metrics = MetricsTracker()
        self.test_validator = TestValidator(self.config.get("test_command"))

        # Webhook 通知
        self.notify_webhook = notify_webhook or self.config.get("notify_webhook") or os.environ.get("LOOP_WEBHOOK_URL", "")
        self.notify_slack = self.config.get("notify_slack") or os.environ.get("LOOP_SLACK_WEBHOOK", "")

        # 加载或初始化状态
        if self.resume:
            self.state = self.persistence.load_state()
            self.log(f"Resumed from iteration {self.state.iteration}", "INFO")
        else:
            self.state = LoopState()

    def log(self, message: str, level: str = "INFO"):
        """记录日志"""
        timestamp = time.strftime("%H:%M:%S")
        line = f"[{timestamp}] [{level}] {message}"
        self.log_lines.append(line)
        print(line)

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
        if self.github_mode:
            self.log("Mode: GitHub Integration")
        if self.dry_run:
            self.log("Mode: DRY RUN")
        if self.resume:
            self.log("Mode: RESUME")
        self.log("=" * 60)

        # 初始化状态
        self.state.status = "running"
        self.state.started_at = time.strftime("%Y-%m-%d %H:%M:%S")
        self.persistence.save_state(self.state)
        self.webui_api.update_status(self.state)

        # 1. 确保环境就绪
        if not self.ensure_core_built():
            self.state.status = "failed"
            self.persistence.save_state(self.state)
            return False

        if not self.ensure_server_running():
            self.state.status = "failed"
            self.persistence.save_state(self.state)
            return False

        # 2. 读取输入
        if self.github_mode:
            yaml_contents = self.read_from_github_issues()
            if not yaml_contents:
                self.log("No YAML found in GitHub issues", "WARN")
                yaml_contents = [(self.read_input(), None)]
        else:
            yaml_content = self.read_input()
            if not yaml_content:
                self.log("No YAML content found", "ERROR")
                self.state.status = "failed"
                self.persistence.save_state(self.state)
                return False
            yaml_contents = [(yaml_content, None)]

        # 3. 处理每个 YAML
        total_processed = 0
        for yaml_content, issue_info in yaml_contents:
            if issue_info:
                self.log(f"\n{'='*40}")
                self.log(f"Processing GitHub Issue #{issue_info['number']}: {issue_info['title']}")
                self.log(f"{'='*40}")

            success = self.process_single_yaml(yaml_content, issue_info)
            if success:
                total_processed += 1

        # 4. 最终报告
        self.state.status = "completed"
        self.state.completed_at = time.strftime("%Y-%m-%d %H:%M:%S")
        self.persistence.save_state(self.state)
        self.webui_api.update_status(self.state)

        # 5. 发送通知
        self.send_final_notifications()

        # 6. 记录指标
        self.metrics.record_run(self.state)

        self.print_report()

        return True

    def read_from_github_issues(self) -> list:
        """从 GitHub issues 读取 YAML"""
        self.log("Fetching GitHub issues...")
        issues = self.github.get_issues(state="open")

        if not issues:
            self.log("No issues found or GitHub not configured", "WARN")
            return []

        yaml_list = []
        for issue in issues:
            if "pull_request" in issue:
                continue

            yaml_content = self.github.extract_yaml_from_issue(issue)
            if yaml_content:
                yaml_list.append((yaml_content, {
                    "number": issue.get("number"),
                    "title": issue.get("title"),
                    "body": issue.get("body", "")
                }))
                self.log(f"  Found YAML in issue #{issue.get('number')}")

        self.log(f"Found {len(yaml_list)} issues with YAML content")
        return yaml_list

    def process_single_yaml(self, yaml_content: str, issue_info: dict = None) -> bool:
        """处理单个 YAML 文件"""
        self.log(f"Loaded YAML: {len(yaml_content)} bytes")

        original_yaml = yaml_content

        # 循环分析和修复
        local_iteration = 0
        while local_iteration < self.max_iterations:
            local_iteration += 1
            self.state.iteration += 1
            self.log(f"\n--- Iteration {local_iteration} ---")

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

            self.log(f"  Fixable: {len(fixable)}")
            self.log(f"  Manual: {len(manual)}")

            # 生成解答
            explanations = []
            for issue in issues:
                explanation = self.generate_explanation(issue, issue.fixable)
                self.log(f"  {issue.key}: {explanation}")
                explanations.append({
                    "key": issue.key,
                    "explanation": explanation,
                    "fixable": issue.fixable
                })

            # 更新 Web UI 状态
            self.webui_api.update_status(self.state)

            # 修复
            if fixable:
                fixed_yaml, fixed_count = self.fix_issues(yaml_content, fixable)

                if fixed_count > 0:
                    self.log(f"Applied {fixed_count} fixes")
                    self.state.issues_fixed += fixed_count

                    if not self.dry_run:
                        output_path = TEMP_OUTPUT / f"fixed_iter{self.state.iteration}.yaml"
                        output_path.parent.mkdir(parents=True, exist_ok=True)
                        output_path.write_text(fixed_yaml, encoding="utf-8")

                        yaml_content = fixed_yaml
                        self.state.yaml_changed = True
                        self.persistence.save_state(self.state)
                    else:
                        self.log("[DRY RUN] Would write fixed YAML", "DRY")
                        break
                else:
                    self.log("No fixes applied, stopping")
                    break
            else:
                self.log("No fixable issues, stopping")
                break

            # 持久化状态
            self.persistence.save_state(self.state)

        # 处理 GitHub issue 回复
        if issue_info and not self.dry_run:
            self.handle_github_issue_response(issue_info, explanations, original_yaml, yaml_content)

        # 提交前测试验证
        if self.state.yaml_changed and not self.dry_run and self.run_tests_enabled:
            self.log("\nRunning tests before commit...")
            tests_passed, test_output = self.test_validator.run_tests()
            if not tests_passed:
                self.log("Tests FAILED, aborting commit", "ERROR")
                self.log(test_output[-500:], "ERROR")
                self.state.status = "failed_tests"
                self.persistence.save_state(self.state)
                self.webui_api.update_status(self.state)
                return False
            self.log("Tests passed, proceeding to commit")

        # 提交
        if self.state.yaml_changed and not self.dry_run:
            self.log("\nCommitting changes...")
            commit_msg = self.config.get("commit_message_template").format(
                count=self.state.issues_fixed
            ) + f" (iter {local_iteration})"
            if issue_info:
                commit_msg += f"\n\nCloses #{issue_info['number']}"
            self.state.commit_hash = git_commit(commit_msg)

            if self.state.commit_hash:
                self.log(f"Committed: {self.state.commit_hash[:8]}")
                if git_push():
                    self.log("Pushed to remote")
                else:
                    self.log("Push failed (may need manual push)", "WARN")

        self.state.issues_manual += len([i for i in issues if not i.fixable]) if 'issues' in dir() else 0
        return True

    def handle_github_issue_response(self, issue_info: dict, explanations: list, original_yaml: str, fixed_yaml: str):
        """处理 GitHub issue 的回复"""
        self.log(f"Commenting on issue #{issue_info['number']}...")

        # 构建评论内容
        comment_lines = [
            "## 🤖 Loop Engine 自动处理结果",
            "",
            f"**处理时间**: {time.strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "### 处理详情",
            ""
        ]

        fixed_count = sum(1 for e in explanations if e["fixable"])
        manual_count = sum(1 for e in explanations if not e["fixable"])

        comment_lines.append(f"- ✅ 自动修复: {fixed_count} 项")
        comment_lines.append(f"- ⚠️ 需手动处理: {manual_count} 项")
        comment_lines.append("")

        if fixed_count > 0:
            comment_lines.append("### ✅ 已自动修复")
            comment_lines.append("")
            for e in explanations:
                if e["fixable"]:
                    comment_lines.append(f"- {e['explanation']}")
            comment_lines.append("")

        if manual_count > 0:
            comment_lines.append("### ⚠️ 需手动处理")
            comment_lines.append("")
            for e in explanations:
                if not e["fixable"]:
                    comment_lines.append(f"- {e['explanation']}")
            comment_lines.append("")

        if self.state.commit_hash:
            comment_lines.append(f"### 📦 提交")
            comment_lines.append(f"Commit: `{self.state.commit_hash[:8]}`")
            comment_lines.append("")

        comment = "\n".join(comment_lines)

        # 发送评论
        if self.github.create_issue_comment(issue_info["number"], comment):
            self.log(f"  Commented on issue #{issue_info['number']}")

            # 如果全部修复了，关闭 issue
            if manual_count == 0 and fixed_count > 0:
                if self.github.close_issue(issue_info["number"]):
                    self.log(f"  Closed issue #{issue_info['number']}")

    def send_final_notifications(self):
        """发送最终通知"""
        summary = self.notifier.get_summary()

        # 添加总结通知
        self.notifier.add_notification(
            f"Loop Engine 完成: 修复 {self.state.issues_fixed} 项, "
            f"手动 {self.state.issues_manual} 项, commit {self.state.commit_hash[:8] if self.state.commit_hash else 'N/A'}",
            level="info"
        )

        # Webhook
        if self.notify_webhook:
            message = (
                f"🔄 Loop Engine 完成\n"
                f"迭代: {self.state.iteration}\n"
                f"修复: {self.state.issues_fixed} 项\n"
                f"手动: {self.state.issues_manual} 项\n"
                f"Commit: {self.state.commit_hash[:8] if self.state.commit_hash else 'N/A'}"
            )
            if self.notifier.send_webhook(self.notify_webhook, message):
                self.log("Webhook notification sent")

        # Slack
        if self.notify_slack:
            message = (
                f"🔄 *Loop Engine 完成*\n"
                f"• 迭代: {self.state.iteration}\n"
                f"• 修复: {self.state.issues_fixed} 项\n"
                f"• 手动: {self.state.issues_manual} 项\n"
                f"• Commit: `{self.state.commit_hash[:8] if self.state.commit_hash else 'N/A'}`"
            )
            if self.notifier.send_slack(self.notify_slack, message):
                self.log("Slack notification sent")

    def print_report(self):
        """输出最终报告"""
        self.log("\n" + "=" * 60)
        self.log("Loop Engine Report")
        self.log("=" * 60)
        self.log(f"  Status: {self.state.status}")
        self.log(f"  Started: {self.state.started_at}")
        self.log(f"  Completed: {self.state.completed_at}")
        self.log(f"  Iterations: {self.state.iteration}")
        self.log(f"  Issues found: {self.state.issues_found}")
        self.log(f"  Issues fixed: {self.state.issues_fixed}")
        self.log(f"  Issues manual: {self.state.issues_manual}")
        self.log(f"  YAML changed: {self.state.yaml_changed}")
        self.log(f"  Commit: {self.state.commit_hash[:8] if self.state.commit_hash else 'N/A'}")
        if self.github_mode:
            self.log(f"  GitHub repo: {self.github.repo or 'N/A'}")
        self.log("=" * 60)

        # 保存日志
        log_path = TEMP_OUTPUT / "loop_engine.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text("\n".join(self.log_lines), encoding="utf-8")
        self.log(f"Log saved to: {log_path}")
        self.log(f"State saved to: {self.persistence.state_dir / 'state.json'}")


# ============================================================
# Watch 守护模式
# ============================================================

class LoopEngineDaemon:
    """守护进程：持续监听并处理新 issue"""

    def __init__(self, config: Config = None):
        self.config = config or Config()
        self.interval = self.config.get("watch_interval", 60)
        self.running = True
        self.github = GitHubIntegration()
        self.processed_issues = set()

    def stop(self):
        self.running = False

    def run(self):
        """持续运行"""
        print("=" * 60)
        print(f"Loop Engine Daemon - 监听间隔 {self.interval}s")
        print(f"GitHub repo: {self.github.repo or 'N/A'}")
        print("按 Ctrl+C 停止")
        print("=" * 60)

        # 加载已处理的 issue
        processed_file = PROJECT_ROOT / ".omc" / "state" / "loop-engine" / "processed_issues.json"
        if processed_file.exists():
            try:
                self.processed_issues = set(json.loads(processed_file.read_text(encoding="utf-8")))
            except Exception:
                pass

        while self.running:
            try:
                self._tick()
            except KeyboardInterrupt:
                print("\nDaemon stopped")
                break
            except Exception as e:
                print(f"[{time.strftime('%H:%M:%S')}] Tick error: {e}")

            # 等待下一个间隔（每秒检查是否要停止）
            for _ in range(self.interval):
                if not self.running:
                    break
                time.sleep(1)

    def _tick(self):
        """单次检查"""
        timestamp = time.strftime("%H:%M:%S")
        print(f"\n[{timestamp}] Checking for new issues...")

        issues = self.github.get_issues(state="open")
        if not issues:
            print(f"[{timestamp}] No issues or GitHub not configured")
            return

        new_issues = []
        for issue in issues:
            if "pull_request" in issue:
                continue
            number = issue.get("number")
            if number and number not in self.processed_issues:
                yaml = self.github.extract_yaml_from_issue(issue)
                if yaml:
                    new_issues.append(issue)

        if not new_issues:
            print(f"[{timestamp}] No new issues with YAML")
            return

        print(f"[{timestamp}] Found {len(new_issues)} new issue(s)")

        for issue in new_issues:
            print(f"[{timestamp}] Processing issue #{issue.get('number')}")
            engine = LoopEngine(
                github_mode=False,
                config=self.config
            )
            # 直接处理单个 issue
            yaml_content = self.github.extract_yaml_from_issue(issue)
            engine.process_single_yaml(yaml_content, {
                "number": issue.get("number"),
                "title": issue.get("title"),
                "body": issue.get("body", "")
            })

            self.processed_issues.add(issue.get("number"))

        # 持久化已处理列表
        processed_file = PROJECT_ROOT / ".omc" / "state" / "loop-engine" / "processed_issues.json"
        processed_file.parent.mkdir(parents=True, exist_ok=True)
        processed_file.write_text(
            json.dumps(list(self.processed_issues)),
            encoding="utf-8"
        )
        print(f"[{timestamp}] Done, waiting {self.interval}s...")


# ============================================================
# CLI 入口
# ============================================================

def print_stats():
    """打印统计信息"""
    metrics = MetricsTracker()
    stats = metrics.get_stats()

    print("=" * 50)
    print("Loop Engine 统计")
    print("=" * 50)
    if stats.get("total_runs", 0) == 0:
        print("  暂无运行记录")
        print("=" * 50)
        return

    print(f"  总运行次数: {stats['total_runs']}")
    print(f"  成功运行: {stats['successful_runs']}")
    print(f"  成功率: {stats['success_rate']}")
    print(f"  总修复 issue: {stats['total_issues_fixed']}")
    print(f"  总手动 issue: {stats['total_issues_manual']}")
    print(f"  平均时长: {stats['avg_duration_seconds']}s")
    print(f"  最近运行: {stats['last_run']}")
    print()
    print("最近 5 次运行:")
    for run in stats.get("recent_runs", []):
        status_icon = "✅" if run.get("status") == "completed" else "❌"
        print(f"  {status_icon} {run.get('timestamp', '')} | "
              f"修复 {run.get('issues_fixed', 0)} | "
              f"commit {run.get('commit_hash', 'N/A')[:8] if run.get('commit_hash') else 'N/A'}")
    print("=" * 50)


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
        "--github",
        action="store_true",
        help="从 GitHub issues 读取 YAML"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="从上次状态恢复"
    )
    parser.add_argument(
        "--max-iterations",
        type=int,
        default=5,
        help="最大迭代次数 (默认: 5)"
    )
    parser.add_argument(
        "--notify-webhook",
        type=str,
        help="Webhook 通知 URL"
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="显示当前状态"
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="显示历史统计"
    )
    parser.add_argument(
        "--watch",
        action="store_true",
        help="守护模式：持续监听 GitHub issues 并自动处理"
    )
    parser.add_argument(
        "--watch-interval",
        type=int,
        help="守护模式检查间隔（秒）"
    )
    parser.add_argument(
        "--no-tests",
        action="store_true",
        help="跳过提交前测试验证"
    )
    parser.add_argument(
        "--init-config",
        action="store_true",
        help="生成默认配置文件 .loop-engine.yml"
    )

    args = parser.parse_args()

    # 初始化配置文件
    if args.init_config:
        config = Config()
        config.save()
        print(f"✅ 配置文件已生成: {CONFIG_PATH}")
        sys.exit(0)

    # 显示统计
    if args.stats:
        print_stats()
        sys.exit(0)

    # 显示状态模式
    if args.status:
        persistence = StatePersistence()
        state = persistence.load_state()
        print("=" * 40)
        print("Loop Engine Status")
        print("=" * 40)
        print(f"  Status: {state.status}")
        print(f"  Iteration: {state.iteration}")
        print(f"  Issues fixed: {state.issues_fixed}")
        print(f"  Issues manual: {state.issues_manual}")
        print(f"  Commit: {state.commit_hash[:8] if state.commit_hash else 'N/A'}")
        print(f"  Started: {state.started_at}")
        print(f"  Completed: {state.completed_at}")
        print("=" * 40)
        sys.exit(0)

    # 守护模式
    if args.watch:
        config = Config()
        if args.watch_interval:
            config.data["watch_interval"] = args.watch_interval
        daemon = LoopEngineDaemon(config)
        try:
            daemon.run()
        except KeyboardInterrupt:
            print("\nDaemon stopped")
        sys.exit(0)

    config = Config()
    engine = LoopEngine(
        yaml_path=args.yaml,
        dry_run=args.dry_run,
        max_iterations=args.max_iterations,
        github_mode=args.github,
        resume=args.resume,
        notify_webhook=args.notify_webhook,
        config=config,
        run_tests=not args.no_tests if args.no_tests else None
    )

    success = engine.run()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
