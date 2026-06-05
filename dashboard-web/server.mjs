import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');
const port = Number(process.env.PORT || 5177);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function parseApplications() {
  const file = join(root, 'data', 'applications.md');
  const raw = readFileSync(file, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|') && !line.includes('---') && !line.startsWith('| #'))
    .map((line) => line.slice(1, -1).split('|').map((cell) => cell.trim()))
    .filter((cols) => cols.length >= 9 && /^\d+$/.test(cols[0]))
    .map((cols) => ({
      number: Number(cols[0]),
      date: cols[1],
      company: cols[2],
      role: cols[3],
      score: cols[4],
      status: cols[5],
      pdf: cols[6],
      report: cols[7],
      notes: cols.slice(8).join(' | '),
    }))
    .sort((a, b) => b.number - a.number);
}

function statusSummary(apps) {
  const counts = {};
  for (const app of apps) counts[app.status] = (counts[app.status] || 0) + 1;
  const applied = counts.Applied || 0;
  const responded = counts.Responded || 0;
  const interview = counts.Interview || 0;
  const offer = counts.Offer || 0;
  return {
    total: apps.length,
    active: apps.filter((app) => !['Discarded', 'Rejected', 'SKIP'].includes(app.status)).length,
    counts,
    responseRate: applied ? Math.round(((responded + interview + offer) / applied) * 1000) / 10 : 0,
    interviewRate: applied ? Math.round(((interview + offer) / applied) * 1000) / 10 : 0,
  };
}

function readJsonIfExists(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function tailFile(file, lines = 30) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').trim().split(/\r?\n/).slice(-lines);
}

function parseQuestions() {
  const file = join(root, 'data', 'application-questions.jsonl');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
}

function fileInfo(relativePath) {
  const file = join(root, relativePath);
  if (!existsSync(file)) return { path: relativePath, exists: false };
  const stat = statSync(file);
  return {
    path: relativePath,
    exists: true,
    updatedAt: stat.mtime.toISOString(),
    size: stat.size,
  };
}

function controlSnapshot() {
  const apps = parseApplications();
  const summary = statusSummary(apps);
  const agent = readJsonIfExists(join(__dirname, 'agent-status.json'), { state: 'offline', alerts: [] });
  const recent = apps.slice(0, 10);
  const needsAttention = apps.filter((app) => ['Responded', 'Interview', 'Offer', 'Evaluated'].includes(app.status)).slice(0, 12);
  const practicesDiscarded = apps.filter((app) => app.status === 'Discarded' && /practica|practicante|pasant/i.test(`${app.role} ${app.notes}`)).length;
  const policyText = existsSync(join(root, 'modes', '_profile.md')) ? readFileSync(join(root, 'modes', '_profile.md'), 'utf8') : '';
  const noPracticePolicy = /Do not search for or apply to practice\/internship roles/i.test(policyText);
  const questions = parseQuestions();

  return {
    generatedAt: new Date().toISOString(),
    health: {
      dashboard: 'running',
      agent: agent.state || 'offline',
      trackerRows: summary.total,
      activeApplications: summary.active,
      portalState: agent.portalState || 'unknown',
      verifyOk: agent.verifyOk === true,
    },
    policy: {
      noPracticeRoles: noPracticePolicy,
      practicesDiscarded,
      minimumCompensation: '$800.000 CLP',
      preferredMode: 'Remoto o semipresencial en Santiago',
    },
    portals: agent.portalChecks || [],
    alerts: agent.alerts || [],
    recent,
    needsAttention,
    files: [
      fileInfo('data/applications.md'),
      fileInfo('data/application-questions.jsonl'),
      fileInfo('data/application-questions.md'),
      fileInfo('config/profile.yml'),
      fileInfo('portals.yml'),
      fileInfo('modes/_profile.md'),
      fileInfo('dashboard-web/agent-status.json'),
    ],
    questions: {
      total: questions.length,
      recent: questions.slice(0, 24),
    },
    logTail: tailFile(join(__dirname, 'agent-monitor.log'), 20),
  };
}

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${port}`);
  if (url.pathname === '/api/applications') {
    const apps = parseApplications();
    return send(res, 200, JSON.stringify({ generatedAt: new Date().toISOString(), summary: statusSummary(apps), applications: apps }), mime['.json']);
  }

  if (url.pathname === '/api/agent-status') {
    const file = join(__dirname, 'agent-status.json');
    if (!existsSync(file)) {
      return send(res, 200, JSON.stringify({
        state: 'offline',
        alerts: ['El agente de monitoreo aun no esta corriendo.'],
        summary: {},
      }), mime['.json']);
    }
    return send(res, 200, readFileSync(file), mime['.json']);
  }

  if (url.pathname === '/api/control') {
    return send(res, 200, JSON.stringify(controlSnapshot()), mime['.json']);
  }

  if (url.pathname === '/api/questions') {
    const questions = parseQuestions();
    return send(res, 200, JSON.stringify({
      generatedAt: new Date().toISOString(),
      total: questions.length,
      questions,
    }), mime['.json']);
  }

  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = join(__dirname, path.replace(/^\/+/, ''));
  if (!file.startsWith(__dirname) || !existsSync(file)) {
    return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  }
  send(res, 200, readFileSync(file), mime[extname(file)] || 'application/octet-stream');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`career-ops dashboard running at http://127.0.0.1:${port}`);
});
