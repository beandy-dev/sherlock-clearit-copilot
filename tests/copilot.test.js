import { describe, it, expect } from 'vitest';
import { cosineSimilarity, tokenSearch } from '../services/rag.js';
import { maskSensitiveDataSafe } from '../services/masking.js';
import fs from 'fs';

// Carregar dados de teste
const mockData = JSON.parse(fs.readFileSync('./data/mock-tickets.json', 'utf-8'));

// ═══════════════════════════════════════════════
// TESTES: Mascaramento LGPD (DLP)
// ═══════════════════════════════════════════════
describe('Mascaramento LGPD', () => {
  it('mascara CPF', () => {
    const result = maskSensitiveDataSafe('O CPF do cliente é 123.456.789-00');
    expect(result).toContain('[CPF_MASCARADO]');
    expect(result).not.toContain('123.456.789-00');
  });

  it('mascara email', () => {
    const result = maskSensitiveDataSafe('Contato: joao.silva@empresa.com.br');
    expect(result).toContain('[EMAIL_MASCARADO]');
    expect(result).not.toContain('joao.silva@empresa.com.br');
  });

  it('mascara IPv4', () => {
    const result = maskSensitiveDataSafe('Servidor em 192.168.1.50 não responde');
    expect(result).toContain('[IP_MASCARADO]');
    expect(result).not.toContain('192.168.1.50');
  });

  it('mascara API key do Google', () => {
    const result = maskSensitiveDataSafe('Key: AIzaSyBLl_K_S5tf3co0QLpmNATr4f2mSMnAj_w');
    expect(result).toContain('[API_KEY_MASCARADA]');
    expect(result).not.toContain('AIzaSy');
  });

  it('não mascara termos técnicos comuns (falsos positivos)', () => {
    const result = maskSensitiveDataSafe('Editar o arquivo app.js e rodar server.js');
    expect(result).not.toContain('[LOGIN_MASCARADO]');
  });

  it('mascara múltiplos dados na mesma string', () => {
    const result = maskSensitiveDataSafe('Email: ana@corp.com, IP: 10.0.0.1, CPF: 111.222.333-44');
    expect(result).toContain('[EMAIL_MASCARADO]');
    expect(result).toContain('[IP_MASCARADO]');
    expect(result).toContain('[CPF_MASCARADO]');
  });
});

// ═══════════════════════════════════════════════
// TESTES: Busca por Tokens (fallback)
// ═══════════════════════════════════════════════
describe('Busca por Tokens (fallback)', () => {
  it('encontra tickets relevantes por keyword', () => {
    const results = tokenSearch('backup falhou commvault', mockData);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe('Ticket');
  });

  it('encontra KBs relevantes', () => {
    const results = tokenSearch('configuração MTU VPN Cisco', mockData);
    const hasKB = results.some(r => r.type === 'KB');
    expect(hasKB).toBe(true);
  });

  it('retorna vazio para termos sem correspondência', () => {
    const results = tokenSearch('xyz123abc', mockData);
    expect(results.length).toBe(0);
  });

  it('resultados vêm ordenados por similaridade', () => {
    const results = tokenSearch('disco cheio CVM Nutanix', mockData);
    if (results.length > 1) {
      expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity);
    }
  });
});

// ═══════════════════════════════════════════════
// TESTES: Cosine Similarity
// ═══════════════════════════════════════════════
describe('Cosine Similarity', () => {
  it('vetores idênticos retornam 1', () => {
    const vec = [1, 0, 1, 0, 1];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
  });

  it('vetores opostos retornam -1', () => {
    const vecA = [1, 0, 0];
    const vecB = [-1, 0, 0];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1, 5);
  });

  it('vetores ortogonais retornam 0', () => {
    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0, 5);
  });

  it('vetores nulos retornam 0', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });

  it('vetores de tamanhos diferentes retornam 0', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
});

// ═══════════════════════════════════════════════
// TESTES: Dados (integridade da base)
// ═══════════════════════════════════════════════
describe('Integridade dos Dados', () => {
  it('mock-tickets.json tem 40 tickets', () => {
    expect(mockData.tickets.length).toBe(40);
  });

  it('mock-tickets.json tem 13 KBs', () => {
    expect(mockData.articles.length).toBe(13);
  });

  it('cada ticket tem campos obrigatórios', () => {
    mockData.tickets.forEach(t => {
      expect(t).toHaveProperty('id');
      expect(t).toHaveProperty('subject');
      expect(t).toHaveProperty('description');
      expect(t).toHaveProperty('tags');
      expect(t).toHaveProperty('resolution_notes');
    });
  });

  it('cada KB tem campos obrigatórios', () => {
    mockData.articles.forEach(kb => {
      expect(kb).toHaveProperty('id');
      expect(kb).toHaveProperty('title');
      expect(kb).toHaveProperty('description');
      expect(kb).toHaveProperty('tags');
    });
  });
});
