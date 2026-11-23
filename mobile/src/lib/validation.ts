export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export const MIN_PASSWORD = 8;

/**
 * Fonte da sugestão de correção: referência em texto ou link https sem usuário/senha antes do
 * domínio. Mesma regra do banco (dailycards_private.is_safe_source); aqui só para avisar antes.
 */
export function isSafeSource(value: string) {
  const v = value.trim();
  if (!v) return true;
  if (v.length > 500 || /[\u0000-\u001f\u007f]/.test(v)) return false;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) return true;
  return /^https:\/\/[^/?#@\s]+([/?#]\S*)?$/i.test(v);
}
