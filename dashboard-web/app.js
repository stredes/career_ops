let applications = [];

const statusOrder = ['Applied', 'Responded', 'Interview', 'Offer', 'Evaluated', 'Rejected', 'Discarded', 'SKIP'];

function byId(id) {
  return document.getElementById(id);
}

function setMetric(id, value) {
  byId(id).textContent = value;
}

function statusClass(status) {
  return String(status || '').replace(/[^A-Za-z]/g, '') || 'Evaluated';
}

function renderSummary(summary) {
  setMetric('totalCount', summary.total);
  setMetric('activeCount', summary.active);
  setMetric('appliedCount', summary.counts.Applied || 0);
  setMetric('respondedCount', summary.counts.Responded || 0);
  setMetric('interviewCount', summary.counts.Interview || 0);
  setMetric('discardedCount', summary.counts.Discarded || 0);
  byId('responseRate').textContent = `${summary.responseRate}%`;
  byId('interviewRate').textContent = `${summary.interviewRate}%`;

  const max = Math.max(1, ...Object.values(summary.counts));
  byId('statusBars').innerHTML = statusOrder
    .filter((status) => summary.counts[status])
    .map((status) => {
      const count = summary.counts[status];
      const width = Math.max(6, Math.round((count / max) * 100));
      return `
        <div class="bar-row">
          <div class="bar-label"><span>${status}</span><strong>${count}</strong></div>
          <div class="bar-track"><div class="bar-fill ${statusClass(status)}" style="width:${width}%"></div></div>
        </div>`;
    })
    .join('');

  const filter = byId('statusFilter');
  const current = filter.value;
  filter.innerHTML = '<option value="">Todos</option>' + statusOrder
    .filter((status) => summary.counts[status])
    .map((status) => `<option value="${status}">${status}</option>`)
    .join('');
  filter.value = current;
}

function renderTable() {
  const query = byId('searchInput').value.trim().toLowerCase();
  const status = byId('statusFilter').value;
  const rows = applications.filter((app) => {
    const text = `${app.company} ${app.role} ${app.notes}`.toLowerCase();
    return (!query || text.includes(query)) && (!status || app.status === status);
  });

  byId('applicationsBody').innerHTML = rows.map((app) => `
    <tr>
      <td>${app.number}</td>
      <td>${app.date}</td>
      <td>${escapeHtml(app.company)}</td>
      <td>${escapeHtml(app.role)}</td>
      <td><span class="status ${statusClass(app.status)}">${escapeHtml(app.status)}</span></td>
      <td>${escapeHtml(app.notes)}</td>
    </tr>
  `).join('');
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadData() {
  const res = await fetch('/api/applications');
  const data = await res.json();
  applications = data.applications;
  renderSummary(data.summary);
  renderTable();
  byId('updatedAt').textContent = `Actualizado ${new Date(data.generatedAt).toLocaleString('es-CL')}`;
  await loadAgentStatus();
  await loadControl();
}

async function loadAgentStatus() {
  const res = await fetch('/api/agent-status');
  const data = await res.json();
  const badge = byId('agentBadge');
  const state = data.state || 'offline';
  badge.textContent = state;
  badge.className = `agent-badge ${state}`;
  byId('agentLastCheck').textContent = data.lastCheck ? new Date(data.lastCheck).toLocaleString('es-CL') : '-';
  byId('agentNextCheck').textContent = data.nextCheck ? new Date(data.nextCheck).toLocaleString('es-CL') : '-';
  byId('agentInterval').textContent = data.intervalSec ? `${data.intervalSec}s` : '-';
  byId('agentAlerts').innerHTML = (data.alerts || []).map((alert) => `<li>${escapeHtml(alert)}</li>`).join('');
  renderPortalChecks(data);
  if (data.trackerUpdates?.length) {
    byId('agentAlerts').innerHTML += data.trackerUpdates.map((item) => `<li>Tracker actualizado: #${item.number} ${escapeHtml(item.from)} -> ${escapeHtml(item.to)}</li>`).join('');
  }
}

function renderPortalChecks(data) {
  const portalBadge = byId('portalBadge');
  const checks = data.portalChecks || [];
  const hasError = checks.some((check) => check.state === 'error' || check.state === 'needs-login');
  const state = checks.length ? (hasError ? 'attention' : 'running') : 'offline';
  portalBadge.textContent = checks.length ? data.portalState || state : 'pendiente';
  portalBadge.className = `agent-badge ${state}`;
  byId('portalLastCheck').textContent = data.lastPortalCheck
    ? `Ultima revision de portales: ${new Date(data.lastPortalCheck).toLocaleString('es-CL')} cada ${data.portalIntervalSec || '-'}s`
    : 'Sin revision de portales todavia.';
  byId('portalChecks').innerHTML = checks.map((check) => {
    const matches = (check.matches || []).slice(0, 4).map((match) => `
      <li>
        <strong>#${match.number}</strong> ${escapeHtml(match.company)} - ${escapeHtml(match.role)}
        <span class="status ${statusClass(match.portalStatus)}">${escapeHtml(match.portalStatus)}</span>
      </li>
    `).join('');
    return `
      <article class="portal-item">
        <div>
          <strong>${escapeHtml(check.source)}</strong>
          <span class="portal-state ${escapeHtml(check.state)}">${escapeHtml(check.state)}</span>
        </div>
        <p>${escapeHtml(check.summary || '')}</p>
        ${matches ? `<ul>${matches}</ul>` : ''}
      </article>
    `;
  }).join('');
}

async function loadControl() {
  const res = await fetch('/api/control');
  const data = await res.json();
  renderHealth(data.health);
  renderPolicy(data.policy);
  renderAttention(data);
  renderRecent(data.recent || []);
  renderQuestions(data.questions || { total: 0, recent: [] });
  byId('agentLog').textContent = (data.logTail || []).join('\n') || 'Sin registros aun.';
}

function renderHealth(health) {
  const ok = health.dashboard === 'running' && health.agent === 'running' && health.verifyOk;
  const badge = byId('healthBadge');
  badge.textContent = ok ? 'OK' : 'revisar';
  badge.className = `agent-badge ${ok ? 'running' : 'attention'}`;
  byId('healthList').innerHTML = [
    ['Dashboard', health.dashboard],
    ['Agente', health.agent],
    ['Pipeline', health.verifyOk ? 'limpio' : 'revisar'],
    ['Portales', health.portalState],
    ['Tracker', `${health.trackerRows} filas / ${health.activeApplications} activas`],
  ].map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
}

function renderPolicy(policy) {
  const badge = byId('policyBadge');
  badge.textContent = policy.noPracticeRoles ? 'OK' : 'revisar';
  badge.className = `agent-badge ${policy.noPracticeRoles ? 'running' : 'attention'}`;
  byId('policyList').innerHTML = [
    ['Sin practicas', policy.noPracticeRoles ? 'activo' : 'faltante'],
    ['Practicas descartadas', policy.practicesDiscarded],
    ['Minimo renta', policy.minimumCompensation],
    ['Modalidad', policy.preferredMode],
  ].map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
}

function renderAttention(data) {
  const items = [
    ...(data.alerts || []),
    ...(data.needsAttention || []).map((app) => `#${app.number} ${app.company} - ${app.role} (${app.status})`),
  ].slice(0, 8);
  byId('attentionBadge').textContent = String(items.length);
  byId('attentionList').innerHTML = items.length
    ? items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>Sin pendientes criticos.</li>';
}

function renderRecent(recent) {
  byId('recentList').innerHTML = recent.map((app) => `
    <li><strong>#${app.number}</strong> ${escapeHtml(app.company)} - ${escapeHtml(app.role)}
    <span class="status ${statusClass(app.status)}">${escapeHtml(app.status)}</span></li>
  `).join('');
}

function renderQuestions(data) {
  byId('questionsSummary').textContent = `${data.total || 0} pregunta(s) y respuesta(s) almacenadas`;
  byId('questionsTableSummary').textContent = `${data.total || 0} pregunta(s) almacenada(s). Mostrando respuestas recientes con contenido.`;
  const answered = (data.recent || []).filter((item) => String(item.answer || '').trim());
  byId('questionsTableBody').innerHTML = answered.map((item) => `
    <tr>
      <td>
        <strong>${escapeHtml(item.platform || 'Portal')}</strong>
        <span>${escapeHtml(item.company || '')}</span>
      </td>
      <td>${escapeHtml(item.question || '')}</td>
      <td>${escapeHtml(item.answer || '')}</td>
    </tr>
  `).join('') || '<tr><td colspan="3">Sin respuestas con contenido para mostrar.</td></tr>';

  byId('questionsList').innerHTML = (data.recent || []).map((item) => `
    <li class="qa-item">
      <div class="qa-meta">
        <strong>${escapeHtml(item.platform || 'Portal')}</strong>
        <span>${escapeHtml(item.company || '')} ${escapeHtml(item.role || '')}</span>
      </div>
      <div class="qa-question"><span>P</span>${escapeHtml(item.question || '')}</div>
      <div class="qa-answer"><span>R</span>${escapeHtml(item.answer || 'Sin respuesta guardada')}</div>
    </li>
  `).join('') || '<li>Sin preguntas y respuestas almacenadas todavia.</li>';
}

byId('refreshBtn').addEventListener('click', loadData);
byId('searchInput').addEventListener('input', renderTable);
byId('statusFilter').addEventListener('change', renderTable);

loadData();
setInterval(loadData, 30000);
