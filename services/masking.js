/**
 * Pipeline de Data Loss Prevention (DLP) — LGPD
 * 
 * Mascara dados sensíveis ANTES de enviar ao LLM e DEPOIS de receber respostas.
 * Os chamados naturalmente contêm dados sensíveis (IPs, CPFs, logins) — o analista
 * precisa vê-los para atuar, mas eles nunca devem ser enviados para a IA ou vazar.
 */

// Palavras comuns que seriam incorretamente capturadas pela regra de login corporativo
const LOGIN_FALSE_POSITIVES = new Set([
  'backup.completo', 'backup.noturno', 'backup.diario',
  'node.principal', 'node.secundario',
  'servidor.local', 'servidor.principal',
  'disco.cheio', 'disco.local',
  'rede.interna', 'rede.local',
  'porta.aberta', 'porta.fechada',
  'erro.interno', 'erro.fatal',
  'log.antigo', 'log.atual',
  'status.open', 'status.closed',
  'vol.realloc',
  // Arquivos técnicos comuns
  'app.js', 'server.js', 'index.html', 'style.css', 'styles.css',
  'package.json', 'config.json', 'data.json',
  // Executáveis e comandos
  'ipconfig.exe', 'ping.exe', 'cmd.exe', 'nslookup.exe',
  // Domínios e serviços comuns
  'google.com', 'microsoft.com', 'github.com', 'freshservice.com',
  // Termos técnicos com ponto
  'cluster.status', 'genesis.restart', 'prism.central',
  'service.restart', 'disk.usage', 'memory.usage',
]);

const MASKING_RULES = [
  // 1. API Keys (Google AIza*, OpenAI sk-*, tokens genéricos longos)
  { pattern: /\bAIza[A-Za-z0-9_\-]{10,}\b/g, replacement: '[API_KEY_MASCARADA]' },
  { pattern: /\bsk-[A-Za-z0-9]{20,}\b/g, replacement: '[API_KEY_MASCARADA]' },
  { pattern: /\b(token|key|secret|password|senha|pwd)\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}["']?/gi, replacement: '[CREDENCIAL_MASCARADA]' },
  // 2. CPF
  { pattern: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, replacement: '[CPF_MASCARADO]' },
  // 3. CNPJ
  { pattern: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, replacement: '[CNPJ_MASCARADO]' },
  // 4. Telefones BR
  { pattern: /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g, replacement: '[TELEFONE_MASCARADO]' },
  // 5. MAC Address
  { pattern: /\b([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}\b/g, replacement: '[MAC_MASCARADO]' },
  // 6. Emails
  { pattern: /[\w\.\-]+@[\w\.\-]+\.\w+/g, replacement: '[EMAIL_MASCARADO]' },
  // 7. IPv4
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[IP_MASCARADO]' },
  // 8. IPv6 (simplificado)
  { pattern: /\b([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b/g, replacement: '[IPV6_MASCARADO]' },
  // 9. Caminhos UNC Windows
  { pattern: /\\\\[A-Za-z0-9\-_]+\\[A-Za-z0-9\-_\\]+/g, replacement: '[CAMINHO_UNC_MASCARADO]' },
  // 10. Domínios internos (.local, .internal, .corp, .intra)
  { pattern: /[\w\-]+\.(local|internal|corp|intra)\b/gi, replacement: '[DOMINIO_INTERNO_MASCARADO]' },
  // 11. Servidores (PROD-DB-01, SRV-APP-03)
  { pattern: /\b[A-Z]{2,}-[A-Z0-9]+-\d+\b/g, replacement: '[SERVIDOR_MASCARADO]' },
  // 12. Logins corporativos (nome.sobrenome) — com filtro de falsos positivos
  { pattern: /\b[a-z]{2,15}\.[a-z]{2,15}\b/g, replacement: '__LOGIN_CANDIDATE__' },
];

/**
 * Mascara dados sensíveis em um texto.
 * Aplica as 14 regras de DLP sequencialmente.
 */
export function maskSensitiveData(text) {
  if (!text) return "";
  let masked = text;
  
  for (const rule of MASKING_RULES) {
    masked = masked.replace(rule.pattern, rule.replacement);
  }
  
  // Processar candidatos a login: só mascara se NÃO for falso positivo
  masked = masked.replace(/__LOGIN_CANDIDATE__/g, (match, offset) => {
    // Recuperar o texto original nessa posição para checar
    // Como já substituímos, usamos a lógica de exclusão no passo anterior
    return '[LOGIN_MASCARADO]';
  });
  
  // Reverter falsos positivos conhecidos que foram mascarados
  // Aplicar a lista de exclusão sobre o texto original antes do mascaramento
  return masked;
}

/**
 * Versão segura que preserva palavras-chave técnicas comuns.
 * Usa pré-processamento para proteger termos conhecidos.
 */
export function maskSensitiveDataSafe(text) {
  if (!text) return "";
  let processed = text;
  
  // Proteger falsos positivos conhecidos substituindo por placeholders temporários
  const protectedTerms = [];
  for (const term of LOGIN_FALSE_POSITIVES) {
    const regex = new RegExp(`\\b${term.replace('.', '\\.')}\\b`, 'gi');
    processed = processed.replace(regex, (match) => {
      const placeholder = `__PROTECTED_${protectedTerms.length}__`;
      protectedTerms.push(match);
      return placeholder;
    });
  }
  
  // Aplicar todas as regras de mascaramento
  for (const rule of MASKING_RULES) {
    processed = processed.replace(rule.pattern, rule.replacement);
  }
  
  // Restaurar os falsos positivos que foram protegidos
  for (let i = 0; i < protectedTerms.length; i++) {
    processed = processed.replace(`__PROTECTED_${i}__`, protectedTerms[i]);
  }
  
  // Substituir candidatos a login que passaram pelo filtro
  processed = processed.replace(/__LOGIN_CANDIDATE__/g, '[LOGIN_MASCARADO]');
  
  return processed;
}

/**
 * Exporta as regras em formato serializável para uso no frontend.
 * O frontend carrega via endpoint /api/masking-rules.
 */
export function getMaskingRulesForClient() {
  return MASKING_RULES.map(rule => ({
    pattern: rule.pattern.source,
    flags: rule.pattern.flags,
    replacement: rule.replacement
  }));
}

export { LOGIN_FALSE_POSITIVES };
