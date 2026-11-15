/**
 * Constantes, tipos e schemas compartilhados entre o Worker (API/redirector)
 * e o Web (SPA). Somente código puro — nada que exija runtime específico.
 */

/** Subcaminho onde o SPA + API são servidos em produção. */
export const APP_BASE_PATH = '/qrcode';

/** Prefixo da API dentro do app. */
export const API_BASE_PATH = `${APP_BASE_PATH}/api`;

/** Prefixo das URLs curtas codificadas nos QR codes. */
export const SHORT_PATH_PREFIX = '/q';

/** Domínio de produção dos QR codes (sem scheme). */
export const PRODUCTION_HOST = 'qr.yonkolab.xyz';

/** Monta a URL curta de um código (ex.: https://qr.yonkolab.xyz/q/ab3xk9m). */
export function shortUrl(code: string): string {
  return `https://${PRODUCTION_HOST}${SHORT_PATH_PREFIX}/${code}`;
}

/** Alfabeto do código curto, sem caracteres ambíguos (0/O, 1/l/I). */
export const QR_CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

/** Tamanho do código curto. */
export const QR_CODE_LENGTH = 7;

/** Limite de QRs dinâmicos por usuário (protege a cota global do Workers Free). */
export const MAX_QRS_PER_USER = 5;

/** Tamanho máximo do destino, em caracteres. */
export const MAX_DESTINATION_LENGTH = 2048;

/** Tamanho máximo do logo embutido (data URL), em bytes. */
export const MAX_LOGO_DATA_URL_BYTES = 100 * 1024;

/** Validade da sessão, em dias. */
export const SESSION_TTL_DAYS = 30;

/** Estados possíveis de um QR code (coluna `qr_codes.status`). */
export const QR_STATUSES = ['active', 'paused', 'expired'] as const;
export type QrStatus = (typeof QR_STATUSES)[number];
