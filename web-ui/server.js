const http = require('http');
const { execFile, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8080);
const WEB_ROOT = __dirname;
const PROJECT_ROOT = path.resolve(WEB_ROOT, '..');
const MVNW_PATH = path.resolve(PROJECT_ROOT, 'mvnw');
const CORE_JAR_PATH = path.resolve(PROJECT_ROOT, 'api-codegen-core', 'target', 'api-codegen.jar');
const CONTRACT_PATH = path.resolve(PROJECT_ROOT, 'api-codegen-core', 'src', 'main', 'resources', 'ui-bridge-contract.json');

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ts': 'application/typescript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.yaml': 'application/yaml; charset=utf-8',
  '.yml': 'application/yaml; charset=utf-8',
};

function loadBridgeContract() {
  const raw = fs.readFileSync(CONTRACT_PATH, 'utf8');
  const contract = JSON.parse(raw);

  if (!contract.bridge || !Number.isInteger(contract.contractVersion)) {
    throw new Error(`Invalid ui bridge contract: ${CONTRACT_PATH}`);
  }

  if (!contract.commands || !contract.commands.analyze || !contract.commands.fix) {
    throw new Error(`Invalid ui bridge commands in contract: ${CONTRACT_PATH}`);
  }

  return contract;
}

const BRIDGE_CONTRACT = loadBridgeContract();

function send(res, statusCode, body, contentType) {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(body);
}

function sendJson(res, statusCode, data) {
  send(res, statusCode, JSON.stringify(data), 'application/json; charset=utf-8');
}

function createErrorEnvelope(command, code, message) {
  return {
    bridge: BRIDGE_CONTRACT.bridge,
    contractVersion: BRIDGE_CONTRACT.contractVersion,
    command,
    error: {
      code,
      message
    }
  };
}

function normalizeRequestPath(urlPath) {
  const requestPath = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  return normalized === '/' ? 'index.html' : normalized.replace(/^[/\\]+/, '');
}

function resolveCandidatePaths(urlPath) {
  const targetPath = normalizeRequestPath(urlPath);
  return [
    path.resolve(WEB_ROOT, targetPath),
    path.resolve(PROJECT_ROOT, targetPath),
  ];
}

function isSafePath(basePath, targetPath) {
  return targetPath === basePath || targetPath.startsWith(basePath + path.sep);
}

function sendFile(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[extension] || 'application/octet-stream';

  fs.readFile(filePath, (readError, data) => {
    if (readError) {
      send(res, 500, 'Internal Server Error', 'text/plain; charset=utf-8');
      return;
    }

    send(res, 200, data, contentType);
  });
}

let coreBridgeReady = false;

function ensureCoreBridgeReady() {
  if (coreBridgeReady && fs.existsSync(CORE_JAR_PATH)) {
    return;
  }

  const result = spawnSync(MVNW_PATH, ['-q', '-pl', 'api-codegen-core', '-am', '-DskipTests', 'package'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });

  if (result.status !== 0 || !fs.existsSync(CORE_JAR_PATH)) {
    throw new Error((result.stderr || result.stdout || 'Failed to build api-codegen-core bridge').trim());
  }

  coreBridgeReady = true;
}

function runCoreBridge(command, payload) {
  return new Promise((resolve, reject) => {
    try {
      ensureCoreBridgeReady();
    } catch (error) {
      reject(error);
      return;
    }

    const child = execFile(
      'java',
      ['-cp', CORE_JAR_PATH, 'com.apicgen.bridge.UiBridgeMain', command],
      {
        cwd: PROJECT_ROOT,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error((stderr || stdout || error.message).trim()));
          return;
        }

        try {
          resolve(JSON.parse(stdout || '{}'));
        } catch (parseError) {
          reject(new Error(`Invalid core bridge response: ${parseError.message}`));
        }
      }
    );

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        const wrapped = new Error('Invalid JSON body');
        wrapped.code = 'INVALID_JSON_BODY';
        reject(wrapped);
      }
    });
    req.on('error', reject);
  });
}

function tryServeFile(res, candidates, index) {
  if (index >= candidates.length) {
    send(res, 404, 'Not Found', 'text/plain; charset=utf-8');
    return;
  }

  const filePath = candidates[index];
  const basePath = index === 0 ? WEB_ROOT : PROJECT_ROOT;

  if (!isSafePath(basePath, filePath)) {
    send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      tryServeFile(res, candidates, index + 1);
      return;
    }

    sendFile(res, filePath);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = req.url || '/';

  if (req.method === 'POST' && (requestUrl === '/api/analyze' || requestUrl === '/api/fix')) {
    const command = requestUrl === '/api/fix'
      ? BRIDGE_CONTRACT.commands.fix
      : BRIDGE_CONTRACT.commands.analyze;
    try {
      const payload = await readJsonBody(req);
      const result = await runCoreBridge(command, payload);
      sendJson(res, 200, result);
    } catch (error) {
      const code = error && error.code ? error.code : 'CORE_BRIDGE_REQUEST_FAILED';
      const message = (error && error.message) ? error.message : 'Core bridge request failed';
      sendJson(res, 500, createErrorEnvelope(command, code, message));
    }
    return;
  }

  tryServeFile(res, resolveCandidatePaths(requestUrl), 0);
});

server.listen(PORT, () => {
  console.log(`Static server listening on http://localhost:${PORT}`);
});
