/**
 * Validação de destino para URLs de QR code (M2).
 * 
 * Regras (plano seção 7/M2):
 * - Só http/https
 - ≤ 2048 chars
 - Bloquear localhost, IPs privados, link-local, próprio host yonkolab.xyz
 */

const encoder = new TextEncoder();

/** Regex para validar hostname (aceita domínio e IP). */
const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Regex para IPv4. */
const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
/** Regex para IPv6 (simplificado). */
const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,}[0-9a-fA-F]{0,4}$/;

/** Converte um hostname para lowercase e remove www. */
function normalizeHostname(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

/** Verifica se o hostname é um IP (v4 ou v6). */
function isIPHost(host: string): boolean {
  const normalized = normalizeHostname(host);
  return ipv4Regex.test(normalized) || ipv6Regex.test(normalized);
}

/** Gera um regex para matcher de IP privado. */
function privateIPv4Regex(): RegExp {
  return /^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^192\.168\./;
}

/** Verifica se é IP privado (v4). */
function isPrivateIPv4(host: string): boolean {
  return privateIPv4Regex().test(normalizeHostname(host));
}

/** Verifica se é link-local (v6 começa fe80::). */
function isLinkLocalIPv6(host: string): boolean {
  return /^fe80::/i.test(normalizeHostname(host));
}

/** Verifica se é localhost. */
function isLocalhost(host: string): boolean {
  const normalized = normalizeHostname(host);
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

/** Verifica se o hostname é do próprio serviço (yonkolab.xyz). */
function isOwnHost(host: string): boolean {
  return normalizeHostname(host) === 'yonkolab.xyz' || normalizeHostname(host) === 'yonkolab.xyz/qrcode';
}

/**
 * Valida se o destino é permitido.
 * - Apenas http/https
 - Tamanho ≤ 2048
 - Bloqueia localhost, IPs privados, link-local, próprio host
 - Retorna motivo da rejeição
 */
export async function validateDestination(
  db: D1Database,
  destination: string,
  ownHost: string
): Promise<{ valid: boolean; reason?: string }> {
  // 1. Tamanho
  if (destination.length > 2048) {
    return { valid: false, reason: 'Destination exceeds maximum length of 2048 characters' };
  }

  try {
    const url = new URL(destination);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, reason: 'Only http:// and https:// protocols are allowed' };
    }
    const host = url.hostname;

    // 2. Bloquear localhost
    if (isLocalhost(host)) {
      return { valid: false, reason: 'Localhost addresses are not allowed' };
    }

    // 3. Bloquear IPs privados (v4)
    if (isPrivateIPv4(host)) {
      return { valid: false, reason: 'Private IP addresses are not allowed' };
    }

    // 4. Bloquear link-local (v6)
    if (isLinkLocalIPv6(host)) {
      return { valid: false, reason: 'Link-local IPv6 addresses are not allowed' };
    }

    // 5. Bloquear próprio host (yonkolab.xyz)
    if (isOwnHost(host)) {
      return { valid: false, reason: 'Destination cannot be the same as the service host' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

/** Tipo para o banco de dados D1. */
declare global {
  namespace NodeJS {
    interface D1Database {
      exec(sql: string, ...args: unknown[]): Promise<unknown[]>;
    }
  }
}