// ===== ClearIT Copilot Demo — Product-Focused =====
// O Copilot é uma ferramenta de CONSULTA para o analista L1.
// Ele NÃO envia respostas ao cliente. Ele SUGERE diagnóstico e solução.
// O analista usa a informação para tomar sua própria decisão.

const API_URL = "";  // Same origin (served by Express)

// ===== TICKET DATA (Nutanix domain - from Pulse.ipynb) =====
const tickets = [
    { id: "INC-20001", subject: "Alerta de Alto Uso de Disco em CVM", texto: "Pessoal, disparou alerta de disco na CVM do node 3 do cluster de prod. Tá em 92% e subindo. Não sei o que tá consumindo, mas precisa resolver antes de estourar. Alerta veio pelo Prism hoje de manhã cedo.", category: "Infrastructure", priority: "high", status: "open", requester: "Ana Paula Costa", date: "há 2 horas", sla: "3h 22min" },
    { id: "INC-20003", subject: "Falha no Cluster por Crash do Serviço Acropolis", texto: "Acropolis caiu de novo no node 2. Já é a terceira vez essa semana. As VMs ficaram fora uns 10min agora de manhã, o cliente já ligou reclamando. No prism tá aparecendo status degraded.", category: "Cluster", priority: "high", status: "open", requester: "Alexandre Guidorzi", date: "há 4 horas", sla: "1h 45min" },
    { id: "INC-20005", subject: "Migração de VM travada no meio do processo", texto: "Tentei migrar a VM do banco (DB-PROD-02) pro node 4 pra fazer manutenção no node 1, mas travou em 40% faz uns 25 min. Não sei se cancelo ou espero. É VM de produção.", category: "VM Management", priority: "medium", status: "open", requester: "Beatriz Lima", date: "há 1 dia", sla: "6h 10min" },
    { id: "INC-20007", subject: "Snapshot de VM falhando constantemente", texto: "Os snapshots das VMs de prod não completam desde sexta. Sempre dá timeout. Último backup bom foi dia 03. O cliente ainda não sabe mas se perder dado vai ser complicado.", category: "Backup", priority: "high", status: "overdue", requester: "Carlos Mendes", date: "há 2 dias", sla: "EXPIRADO" },
    { id: "INC-20009", subject: "Sistema lento", texto: "O cliente ligou falando que tá tudo lento. Perguntei qual sistema e ele disse \"tudo\". Não tenho mais informação por enquanto.", category: "Performance", priority: "medium", status: "open", requester: "Daniela Ferreira", date: "há 3 horas", sla: "5h 00min" },
    { id: "INC-20014", subject: "Storage pool com espaço crítico", texto: "Storage pool SP-PROD-01 chegou em 87%, tá crescendo rápido. Ontem tava em 82%. Se bater 95% as VMs param. Precisa liberar espaço urgente, provavelmente tem snapshot antigo ocupando.", category: "Storage", priority: "high", status: "open", requester: "Eduardo Santos", date: "há 5 horas", sla: "2h 30min" },
    { id: "INC-20015", subject: "Prism Central inacessível", texto: "Prism Central não abre, fica dando timeout no browser. Já testei de duas máquinas diferentes, mesmo problema. SSH na VM do prism ainda funciona. Sem o prism não consigo gerenciar nada pelo gráfico.", category: "Management", priority: "high", status: "overdue", requester: "Fernanda Oliveira", date: "há 1 dia", sla: "EXPIRADO" },
    { id: "INC-20012", subject: "Algo está errado no servidor", texto: "algo ta errado no servidor do cliente, ele ligou agora falando que tem algo estranho mas nao soube explicar direito", category: "General", priority: "low", status: "open", requester: "Isabela Ramos", date: "há 12 horas", sla: "14h 00min" },
];

// ===== COPILOT MOCK RESPONSES (replace with real API when backend available) =====
const copilotResponses = {
    "INC-20001": { diagnostico: "A causa mais provável para o alto uso de disco na CVM é o acúmulo excessivo de logs antigos que não estão sendo rotacionados.", solucoes: ["Executar limpeza via logrotate na CVM do node 3", "Verificar consumo com df -h e du -sh /var/log/*", "Configurar job de limpeza automática semanal como prevenção"], fonte: "Ticket #20001 — Alerta de Alto Uso de Disco em CVM", fonteType: "ticket", confianca: 92, troubleshooting: null },
    "INC-20003": { diagnostico: "O crash repetido do serviço Acropolis indica corrupção em metadado local. Padrão já identificado e resolvido anteriormente.", solucoes: ["Acessar CVM do node afetado via SSH", "Executar: genesis restart acropolis", "Monitorar logs por 15min para confirmar estabilidade"], fonte: "Ticket #20003 — Falha no Cluster por Crash do Serviço Acropolis", fonteType: "ticket", confianca: 88, troubleshooting: null },
    "INC-20005": { diagnostico: "Live migrations travadas geralmente indicam gargalo de rede entre nodes, especialmente em horários de pico.", solucoes: ["Cancelar migração atual", "Verificar utilização de banda entre nodes via Prism > Network", "Reagendar para horário de menor tráfego (após 22h)"], fonte: "Ticket #20005 — Migração de VM travada", fonteType: "ticket", confianca: 85, troubleshooting: null },
    "INC-20007": { diagnostico: "Falhas de snapshot com timeout estão associadas a VSS (Volume Shadow Copy) que não responde no tempo configurado.", solucoes: ["Verificar logs do VSS nas VMs afetadas", "Aumentar timeout do VSS para 900s", "Reagendar snapshots para 3h-5h (menor carga)"], fonte: "Ticket #20007 — Snapshot de VM falhando", fonteType: "ticket", confianca: 90, troubleshooting: null },
    "INC-20009": { diagnostico: null, solucoes: null, fonte: "Ticket #20009 — Caso similar com descrição vaga", fonteType: "troubleshooting", confianca: 55, troubleshooting: ["Contactar o cliente: qual sistema especificamente está lento?", "Desde quando? Horário específico ou o dia todo?", "Verificar no Prism se há alertas ativos de CPU/RAM/Rede", "Identificar se há VMs com processos travados", "Somente após mais dados, propor solução"] },
    "INC-20014": { diagnostico: "Storage pool acima de 85% — procedimento documentado na KB-N002 indica limpeza de snapshots antigos como solução.", solucoes: ["Acessar Prism > Storage > Pool", "Identificar snapshots antigos (>30 dias)", "Executar limpeza conforme procedimento KB-N002", "Espaço deve cair para ~67% após limpeza"], fonte: "KB-N002 — Gestão de Capacidade de Storage Pool", fonteType: "kb", confianca: 95, troubleshooting: null },
    "INC-20015": { diagnostico: "Timeout no Prism Central indica serviço travado ou com erro interno. Solução documentada na KB.", solucoes: ["SSH na VM do Prism Central", "Verificar: cluster status | grep prism", "Reiniciar: cluster restart prism_central", "Aguardar ~5 minutos e testar acesso"], fonte: "KB-N005 — Falhas de Conectividade do Prism Central", fonteType: "kb", confianca: 93, troubleshooting: null },
    "INC-20012": { diagnostico: null, solucoes: null, fonte: "Base histórica — casos com descrição insuficiente", fonteType: "troubleshooting", confianca: 40, troubleshooting: ["Contactar o cliente para obter mais detalhes", "Perguntar: qual servidor? Qual erro? Desde quando?", "Verificar alertas ativos no Prism", "Checar status de RF (Replication Factor)", "NÃO propor solução sem informação suficiente"] },
};

// ===== FREE-TEXT query responses (for when analyst types custom question) =====
function findBestMatch(query) {
    // Simple keyword matching for demo (real version uses embeddings)
    const keywords = {
        "disco": "INC-20001", "espaço": "INC-20001", "cvm": "INC-20001", "log": "INC-20001",
        "acropolis": "INC-20003", "crash": "INC-20003", "cluster": "INC-20003", "vm caindo": "INC-20003",
        "migração": "INC-20005", "vmotion": "INC-20005", "travad": "INC-20005",
        "snapshot": "INC-20007", "backup": "INC-20007", "timeout": "INC-20007",
        "lento": "INC-20009", "lentidão": "INC-20009", "performance": "INC-20009",
        "storage": "INC-20014", "capacidade": "INC-20014", "espaço pool": "INC-20014",
        "prism": "INC-20015", "inacessível": "INC-20015", "timeout navegador": "INC-20015",
        "errado": "INC-20012", "não funciona": "INC-20012",
    };
    const q = query.toLowerCase();
    for (const [kw, id] of Object.entries(keywords)) {
        if (q.includes(kw)) return copilotResponses[id];
    }
    // Default: troubleshooting
    return { diagnostico: null, solucoes: null, fonte: "Nenhum caso similar encontrado com alta confiança", fonteType: "troubleshooting", confianca: 30, troubleshooting: ["Não foram encontrados tickets ou KBs com alta similaridade", "Tente descrever o problema com mais detalhes técnicos", "Verifique manualmente: Prism > Alerts para alertas ativos", "Considere escalar para L2 se não houver progresso"] };
}

// ===== TOAST =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ===== RENDER TICKET LIST =====
function renderTicketList() {
    const container = document.getElementById('ticket-rows');
    const avatarColors = ['#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#e53e3e', '#38b2ac', '#d69e2e', '#667eea'];
    document.getElementById('ticket-count').textContent = `1 - ${tickets.length} of ${tickets.length}`;
    
    container.innerHTML = tickets.map((t, i) => `
        <div class="ticket-row" data-id="${t.id}" onclick="openTicket('${t.id}')">
            <span class="col-check"><input type="checkbox" onclick="event.stopPropagation()"></span>
            <span class="col-subject">${t.subject} <span class="ticket-id">#${t.id}</span></span>
            <span class="col-requester">
                <span class="requester-avatar" style="background:${avatarColors[i % avatarColors.length]}">${t.requester.charAt(0)}</span>
                ${t.requester}
            </span>
            <span class="col-status"><span class="status-pill status-${t.status}">${t.status === 'overdue' ? 'Overdue' : 'Open'}</span></span>
            <span class="col-priority"><span class="priority-dot priority-${t.priority}"></span>${t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}</span>
            <span class="col-sla" style="font-size:11px;color:${t.sla === 'EXPIRADO' ? '#c53030' : '#718096'}">${t.sla}</span>
        </div>
    `).join('');
}

// ===== OPEN TICKET =====
function openTicket(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    document.getElementById('detail-ticket-id').textContent = '#' + ticket.id;
    document.getElementById('detail-subject').textContent = ticket.subject;
    document.getElementById('detail-requester').textContent = ticket.requester;
    document.getElementById('detail-date').textContent = ticket.date;
    document.getElementById('detail-description-text').textContent = ticket.texto;
    document.getElementById('detail-status').textContent = ticket.status === 'overdue' ? 'Overdue' : 'Open';
    document.getElementById('detail-sla').innerHTML = `<i class="fas fa-clock"></i> SLA: ${ticket.sla}`;
    document.getElementById('detail-sla').style.color = ticket.sla === 'EXPIRADO' ? '#c53030' : '#c05621';
    document.getElementById('detail-avatar').textContent = ticket.requester.charAt(0);
    document.getElementById('sidebar-status').textContent = ticket.status === 'overdue' ? 'Overdue' : 'Open';
    document.getElementById('sidebar-priority').innerHTML = `<i class="fas fa-square" style="color:${ticket.priority === 'high' ? '#e53e3e' : ticket.priority === 'medium' ? '#4299e1' : '#48bb78'}"></i> ${ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}`;
    document.getElementById('sidebar-category').textContent = ticket.category;
    document.getElementById('sidebar-requester-name').textContent = ticket.requester;
    document.getElementById('sidebar-sla').textContent = ticket.sla === 'EXPIRADO' ? '⚠️ EXPIRADO' : 'by today';

    // Reset Copilot
    resetCopilot();
    
    // Pre-fill the copilot input with ticket description
    document.getElementById('copilot-input').value = ticket.texto;

    window.currentTicketId = ticketId;
    window.currentTicket = ticket;

    document.getElementById('ticket-list-view').classList.remove('active');
    document.getElementById('ticket-detail-view').classList.add('active');
}

// ===== BACK TO LIST =====
document.getElementById('back-to-list').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('ticket-detail-view').classList.remove('active');
    document.getElementById('ticket-list-view').classList.add('active');
});

// ===== COPILOT: ANALYZE =====
document.getElementById('copilot-analyze-btn').addEventListener('click', () => {
    const input = document.getElementById('copilot-input').value.trim();
    if (!input) {
        showToast('Descreva o problema antes de analisar', 'warning');
        return;
    }
    runCopilotAnalysis(input);
});

// Also trigger on Enter (Ctrl+Enter)
document.getElementById('copilot-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        document.getElementById('copilot-analyze-btn').click();
    }
});

async function runCopilotAnalysis(query) {
    // Prevenir duplo clique
    const btn = document.getElementById('copilot-analyze-btn');
    if (btn.disabled) return;
    btn.disabled = true;

    // Show loading with animated steps
    document.getElementById('copilot-input-section').style.display = 'none';
    document.getElementById('copilot-loading').style.display = 'block';
    document.getElementById('copilot-result').style.display = 'none';

    const steps = ['load-step-1', 'load-step-2', 'load-step-3', 'load-step-4'];
    steps.forEach(s => { document.getElementById(s).className = 'load-step'; });

    // Animate steps
    let delay = 0;
    steps.forEach((stepId, i) => {
        delay += 500 + Math.random() * 400;
        setTimeout(() => {
            if (i > 0) document.getElementById(steps[i-1]).classList.replace('active', 'done');
            document.getElementById(stepId).classList.add('active');
        }, delay);
    });

    // Try real backend, fallback to mock
    let response;
    try {
        const ticket = window.currentTicket;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(`${API_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticketId: ticket ? ticket.id.replace('INC-', '') : null,
                subject: ticket ? ticket.subject : '',
                description: query
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            // Map backend response to frontend format
            response = {
                diagnostico: data.diagnosis,
                solucoes: data.actions,
                fonte: data.sources && data.sources.length > 0
                    ? data.sources[0].title + ' (' + data.sources[0].similarity + '%)'
                    : 'Análise gerada pelo Gemini',
                fonteType: data.sources && data.sources.length > 0
                    ? (data.sources[0].type === 'KB' ? 'kb' : 'ticket')
                    : 'ticket',
                confianca: data.sources && data.sources.length > 0
                    ? data.sources[0].similarity : 70,
                troubleshooting: data.isVague ? data.actions : null,
                allSources: data.sources || [],
                lowConfidence: data.lowConfidence || false,
                webReferences: data.webReferences || []
            };
            if (data.isVague) {
                response.diagnostico = null;
                response.solucoes = null;
            }
            window.usedGemini = true;
        } else throw new Error('backend error');
    } catch (e) {
        // Fallback: use mock based on current ticket or keyword match
        if (e.name === 'AbortError') {
            console.log("Timeout: resposta demorou mais de 30s");
            response = { diagnostico: "Tempo esgotado — o servidor demorou para responder. Tente novamente.", solucoes: ["Clique em 'Nova consulta' e tente novamente", "Se persistir, o servidor pode estar sobrecarregado"], fonte: "Timeout", fonteType: "troubleshooting", confianca: 0, troubleshooting: null, lowConfidence: true, webReferences: [] };
        } else {
            console.log("Backend indisponível, usando fallback:", e.message);
            window.usedGemini = false;
            response = copilotResponses[window.currentTicketId] || findBestMatch(query);
        }
    }

    // Show result when response arrives (not tied to animation)
    document.getElementById('copilot-loading').style.display = 'none';
    btn.disabled = false;
    showCopilotResult(response, query);
}

function showCopilotResult(response, query) {
    document.getElementById('copilot-loading').style.display = 'none';
    const resultDiv = document.getElementById('copilot-result');
    resultDiv.style.display = 'block';

    const isTroubleshooting = response.troubleshooting && !response.diagnostico;
    const fonteIcon = response.fonteType === 'kb' ? 'fa-book' : response.fonteType === 'troubleshooting' ? 'fa-exclamation-triangle' : 'fa-ticket-alt';
    const fonteColor = response.fonteType === 'kb' ? '#276749' : response.fonteType === 'troubleshooting' ? '#c05621' : '#2b6cb0';
    const fonteBg = response.fonteType === 'kb' ? '#f0fff4' : response.fonteType === 'troubleshooting' ? '#fffaf0' : '#ebf8ff';
    const fonteBorder = response.fonteType === 'kb' ? '#c6f6d5' : response.fonteType === 'troubleshooting' ? '#feebc8' : '#bee3f8';
    const confianca = response.confianca || 50;

    let contentHtml = '';

    if (isTroubleshooting) {
        // F-05: Troubleshooting para descrição vaga
        contentHtml = `
            <div class="result-section result-warning">
                <div class="result-section-title">⚠️ Informação insuficiente para diagnóstico</div>
                <p>A descrição fornecida não contém detalhes técnicos suficientes para um diagnóstico confiável. Sugerimos os passos abaixo antes de propor uma solução:</p>
            </div>
            <div class="result-section">
                <div class="result-section-title">🔎 Troubleshooting Sugerido</div>
                <ol class="result-steps">
                    ${response.troubleshooting.map(s => `<li>${s}</li>`).join('')}
                </ol>
            </div>
        `;
    } else {
        // F-04: Diagnóstico + soluções com fonte
        contentHtml = `
            <div class="result-section">
                <div class="result-section-title">🔍 Diagnóstico Provável</div>
                <p>${response.diagnostico}</p>
            </div>
            <div class="result-section">
                <div class="result-section-title">🔧 Possíveis Soluções</div>
                <ol class="result-steps">
                    ${(response.solucoes || []).map(s => `<li>${s}</li>`).join('')}
                </ol>
            </div>
        `;
    }

    // Fonte (sempre presente - critério de aceite #3)
    contentHtml += `
        <div class="result-section">
            <div class="result-section-title">📚 Fonte</div>
            <div class="result-source" style="background:${fonteBg};border-color:${fonteBorder};color:${fonteColor}">
                <i class="fas ${fonteIcon}"></i> ${response.fonte}
            </div>
        </div>
    `;

    // Confiança — logo após as fontes
    contentHtml += `
        <div class="result-section">
            <div class="result-section-title">📊 Nível de Confiança na Base Interna</div>
            <div class="confidence-bar">
                <div class="confidence-fill">
                    <div class="confidence-fill-inner" style="width:0%" data-target="${confianca}"></div>
                </div>
                <span class="confidence-label ${confianca < 60 ? 'low-confidence' : ''}">${confianca}%</span>
            </div>
            ${confianca < 70 ? '<p class="confidence-warning">⚠️ Confiança baixa — recomendado buscar fontes externas</p>' : ''}
        </div>
    `;

    // Ações do analista (critério de aceite #5: aceitar, editar ou rejeitar)
    contentHtml += `
        <div class="copilot-feedback">
            <p class="feedback-label">Esta sugestão foi útil?</p>
            <div class="feedback-actions">
                <button class="feedback-btn feedback-accept" onclick="submitFeedback('aceito')">
                    <i class="fas fa-thumbs-up"></i> Útil
                </button>
                <button class="feedback-btn feedback-partial" onclick="submitFeedback('parcial')">
                    <i class="fas fa-pencil-alt"></i> Parcialmente
                </button>
                <button class="feedback-btn feedback-reject" onclick="submitFeedback('rejeitado')">
                    <i class="fas fa-thumbs-down"></i> Não ajudou
                </button>
            </div>
        </div>
    `;

    // Botões de ação: Regerar + Buscar na web
    contentHtml += `
        <div class="result-section action-buttons-row">
            <button class="regenerate-btn" onclick="regenerateResponse()">
                🔄 Regerar resposta
            </button>
            <button class="web-search-btn" onclick="searchWeb()">
                🌐 Buscar na web
            </button>
        </div>
        <div id="web-results" style="display:none;"></div>
    `;

    // Se lowConfidence e já veio webReferences automaticamente, exibir direto
    if (response.lowConfidence && response.webReferences && response.webReferences.length > 0) {
        const refs = response.webReferences.slice(0, 5);
        contentHtml += `
            <div class="web-summary-card" style="margin-top:10px;">
                <div class="web-summary-header">🌐 Pesquisa automática (confiança baixa nas fontes internas)</div>
                <div class="web-summary-body">
                    ${refs.map(r => `<p>• <strong>${r.title}</strong>${r.source ? ` — <em>${r.source}</em>` : ''}${r.date ? ` <span style="color:#4ade80;font-size:10px;">(${r.date})</span>` : ''}</p>`).join('')}
                </div>
                <div class="web-summary-meta">
                    <span class="web-summary-sources-label">Referências sugeridas pela IA — datas aproximadas baseadas no treinamento do modelo</span>
                </div>
            </div>
        `;
    }

    resultDiv.innerHTML = contentHtml;

    // Mostrar chat sempre após resultado
    showChat();

    // Animate confidence bar
    setTimeout(() => {
        const bar = resultDiv.querySelector('.confidence-fill-inner');
        if (bar) bar.style.width = bar.dataset.target + '%';
    }, 100);

    window.currentResponse = response;
    window.currentQuery = query;
}

// ===== FEEDBACK (critério #5 + melhoria contínua) =====
function submitFeedback(acao) {
    const feedbackDetail = document.getElementById('copilot-result');
    
    // Replace action buttons with confirmation
    const feedbackSection = feedbackDetail.querySelector('.copilot-feedback');
    
    if (acao === 'parcial') {
        feedbackSection.innerHTML = `
            <div class="feedback-detail">
                <p class="feedback-label">O que poderia melhorar?</p>
                <textarea class="feedback-textarea" id="feedback-note" placeholder="Ex: diagnóstico correto mas faltou mencionar o comando específico..."></textarea>
                <button class="feedback-submit" onclick="saveFeedback('parcial')">Enviar feedback</button>
            </div>
        `;
    } else {
        saveFeedback(acao);
    }
}

// ===== BUSCA WEB SOB DEMANDA =====
async function searchWeb() {
    const btn = document.querySelector('.web-search-btn');
    const resultsDiv = document.getElementById('web-results');
    
    btn.textContent = '⏳ Pesquisando na internet...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/api/web-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: window.currentQuery || '',
                diagnosis: window.currentResponse ? window.currentResponse.diagnostico : ''
            })
        });

        const data = await res.json();

        if (data.summary) {
            let compatHtml = '';
            if (data.compatibility) {
                const statusMap = {
                    'compativel': { icon: '✅', color: '#4ade80', label: 'Compatível' },
                    'parcialmente_compativel': { icon: '⚠️', color: '#fbbf24', label: 'Parcialmente compatível' },
                    'divergente': { icon: '❌', color: '#f87171', label: 'Divergente' }
                };
                const st = statusMap[data.compatibility.status] || statusMap['parcialmente_compativel'];
                compatHtml = `
                    <div class="web-compatibility" style="border-left: 3px solid ${st.color}; padding: 8px 12px; margin-top: 10px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                        <strong style="color:${st.color}">${st.icon} ${st.label}</strong>
                        <p style="margin-top:4px; font-size:11px; color:#ffffff;">${data.compatibility.analysis}</p>
                    </div>
                `;
            }

            resultsDiv.innerHTML = `
                <div class="web-summary-card">
                    <div class="web-summary-header">🌐 Resultado da pesquisa na internet</div>
                    <div class="web-summary-body">${data.summary.replace(/\n/g, '<br>')}</div>
                    <div class="web-summary-meta">
                        <span class="web-summary-confidence">Relevância: ${data.confidence}%</span>
                        <span class="web-summary-sources-label">Fontes: ${(data.sources || []).join(' · ')}</span>
                    </div>
                    ${compatHtml}
                </div>
            `;
            resultsDiv.style.display = 'block';
            btn.style.display = 'none';
        } else {
            resultsDiv.innerHTML = '<p class="web-refs-disclaimer">Não foi possível encontrar informações relevantes na internet.</p>';
            resultsDiv.style.display = 'block';
            btn.textContent = '🌐 Buscar na web';
            btn.disabled = false;
        }
    } catch (e) {
        btn.textContent = '⚠️ Erro na busca';
        setTimeout(() => { btn.textContent = '🌐 Buscar na web'; btn.disabled = false; }, 2000);
    }
}

// ===== REGERAR RESPOSTA =====
async function regenerateResponse() {
    const btn = document.querySelector('.regenerate-btn');
    btn.textContent = '⏳ Regerando...';
    btn.disabled = true;

    // Re-chama o analyze com os mesmos dados
    try {
        const res = await fetch(`${API_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticketId: window.currentTicketId || null,
                subject: window.selectedTicket ? window.selectedTicket.subject : '',
                description: window.currentQuery || ''
            })
        });

        const data = await res.json();
        const response = {
            diagnostico: data.diagnosis,
            solucoes: data.actions,
            fonte: data.sources && data.sources.length > 0
                ? data.sources[0].title + ' (' + data.sources[0].similarity + '%)'
                : 'Nenhuma fonte correspondente',
            fonteType: data.sources && data.sources.length > 0
                ? (data.sources[0].type === 'KB' ? 'kb' : 'ticket')
                : 'troubleshooting',
            confianca: data.sources && data.sources.length > 0
                ? data.sources[0].similarity : 70,
            troubleshooting: data.isVague ? data.actions : null,
            allSources: data.sources || []
        };
        renderResult(response, window.currentQuery);
    } catch (e) {
        btn.textContent = '⚠️ Erro';
        setTimeout(() => { btn.textContent = '🔄 Regerar'; btn.disabled = false; }, 2000);
    }
}

function saveFeedback(acao) {
    const note = document.getElementById('feedback-note')?.value || '';
    
    const feedback = {
        ticketId: window.currentTicketId,
        query: window.currentQuery,
        diagnosis: window.currentResponse ? (window.currentResponse.diagnostico || window.currentResponse.diagnosis || '') : '',
        sources: window.currentResponse ? (window.currentResponse.allSources || []) : [],
        action: acao === 'parcial' ? 'parcial' : (acao === 'rejeitado' ? 'rejeitado' : 'aceito'),
        editedResponse: null,
        rejectionReason: acao === 'rejeitado' ? note : null
    };

    console.log('💾 Feedback (→ Firestore):', feedback);

    // Try sending to backend
    fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback)
    }).catch(() => {});

    // Show confirmation
    const feedbackSection = document.getElementById('copilot-result').querySelector('.copilot-feedback') || document.getElementById('copilot-result').querySelector('.feedback-detail')?.parentElement;
    if (feedbackSection) {
        const messages = {
            'aceito': '✅ Obrigado! Feedback registrado. Esta fonte será priorizada em buscas futuras.',
            'parcial': '✏️ Feedback registrado. Sua nota será usada para melhorar as sugestões.',
            'rejeitado': '📝 Registrado. Vamos melhorar. Considere buscar com mais detalhes ou escalar para L2.'
        };
        feedbackSection.innerHTML = `<div class="feedback-confirmed"><i class="fas fa-check-circle"></i> ${messages[acao]}</div>`;
    }

    // Show new query button
    setTimeout(() => {
        const resultDiv = document.getElementById('copilot-result');
        const btn = document.createElement('button');
        btn.className = 'copilot-new-query-btn';
        btn.innerHTML = '<i class="fas fa-redo"></i> Nova consulta';
        btn.onclick = resetCopilot;
        resultDiv.appendChild(btn);
    }, 500);

    showToast(`Feedback "${acao}" salvo → usado para melhorar respostas futuras`, 'success');
    showChat();
}

// ===== RESET COPILOT =====
function resetCopilot() {
    document.getElementById('copilot-input-section').style.display = 'block';
    document.getElementById('copilot-loading').style.display = 'none';
    document.getElementById('copilot-result').style.display = 'none';
    document.getElementById('copilot-chat').style.display = 'none';
    document.getElementById('chat-messages').innerHTML = '';
}

// ===== SHOW CHAT (after feedback) =====
function showChat() {
    document.getElementById('copilot-chat').style.display = 'block';
}

// ===== CHAT FOLLOW-UP =====
document.getElementById('chat-send-btn').addEventListener('click', sendChatMessage);
document.getElementById('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const query = input.value.trim();
    if (!query) return;

    const messagesDiv = document.getElementById('chat-messages');
    messagesDiv.innerHTML += `<div class="chat-msg user">${query}</div>`;
    input.value = '';

    const loadingId = 'chat-loading-' + Date.now();
    messagesDiv.innerHTML += `<div class="chat-msg bot loading" id="${loadingId}">Pensando...</div>`;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
        const response = window.currentResponse;
        const ticket = window.currentTicket;
        const chatController = new AbortController();
        const chatTimeout = setTimeout(() => chatController.abort(), 45000);
        const res = await fetch(`${API_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                queryText: query,
                ticketDesc: ticket ? ticket.texto : '',
                diagnosis: response ? (response.diagnostico || response.diagnosis || '') : '',
                actions: response ? (response.solucoes || response.troubleshooting || []) : []
            }),
            signal: chatController.signal
        });
        clearTimeout(chatTimeout);

        const loadingEl = document.getElementById(loadingId);
        if (res.ok) {
            const data = await res.json();
            if (loadingEl) loadingEl.outerHTML = `<div class="chat-msg bot">${(data.reply || '').replace(/\n/g, '<br>')}</div>`;
        } else {
            const errData = await res.json().catch(() => ({}));
            if (loadingEl) loadingEl.outerHTML = `<div class="chat-msg bot">${errData.error || 'API indisponível. Verifique a chave Gemini.'}</div>`;
        }
    } catch (e) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.outerHTML = `<div class="chat-msg bot">${e.name === 'AbortError' ? 'Tempo esgotado. Tente novamente.' : 'Backend indisponível.'}</div>`;
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ===== INIT =====
renderTicketList();

// ===== MANUAL DO SISTEMA =====
function showManual() {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('manual-view').style.display = 'block';
}
function hideManual() {
    document.getElementById('manual-view').style.display = 'none';
    document.getElementById('ticket-list-view').style.display = 'block';
}
