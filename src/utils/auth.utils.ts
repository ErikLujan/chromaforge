import type { AuthError } from '@supabase/supabase-js';

/**
 * Auth feedback boundary.
 *
 * Maps Supabase auth errors to friendly Spanish copy. Raw error codes,
 * technical details, and network internals are never shown to the user; the
 * toast copy names the problem and, where possible, the recovery.
 */

export const AUTH_GENERIC_ERROR = 'Algo salió mal. Inténtalo de nuevo en un momento.';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Credenciales incorrectas. Inténtalo de nuevo.',
  invalid_grant: 'Credenciales incorrectas. Inténtalo de nuevo.',
  email_not_confirmed: 'Aún no confirmas tu correo. Revisa tu bandeja de entrada.',
  user_already_exists: 'Ya existe una cuenta con este correo. Inicia sesión.',
  email_taken: 'Ya existe una cuenta con este correo. Inicia sesión.',
  weak_password: 'La contraseña debe tener al menos 6 caracteres.',
  validation_failed: 'Ingresa un correo electrónico válido.',
  over_email_send_rate_limit: 'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
  rate_limit: 'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
  network_error: 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
};

/**
 * Resolves a friendly Spanish message for a Supabase auth error.
 *
 * Resolution order: mapped error `code`/`name`, then message heuristics for
 * connection and validation failures, then a generic fallback. Unknown codes
 * never leak through.
 *
 * @param {AuthError | null} error The auth error to translate, or `null`.
 * @returns {string} A user-safe Spanish message.
 */
export function getAuthErrorMessage(error: AuthError | null): string {
  if (!error) return AUTH_GENERIC_ERROR;

  const code = error.code ?? error.name;
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }

  const message = error.message ?? '';
  if (
    error.name === 'AuthRetryableFetchError' ||
    /network|fetch failed|connection|unexpected end of stream/i.test(message)
  ) {
    return AUTH_ERROR_MESSAGES.network_error;
  }
  if (code === 'validation_failed' || /unable to validate email|invalid email/i.test(message)) {
    return AUTH_ERROR_MESSAGES.validation_failed;
  }

  return AUTH_GENERIC_ERROR;
}
