import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

// Login com e-mail e senha, Google e Apple (Supabase Auth com PKCE).
// As URLs abaixo precisam estar em Authentication › URL Configuration › Redirect URLs no Supabase.

WebBrowser.maybeCompleteAuthSession();

export const AUTH_CALLBACK_PATH = 'auth/callback';
export const RESET_PASSWORD_PATH = 'auth/reset';

export function callbackUrl() {
  return Linking.createURL(AUTH_CALLBACK_PATH);
}

export function resetPasswordUrl() {
  return Linking.createURL(RESET_PASSWORD_PATH);
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_exists'
  | 'weak_password'
  | 'rate_limited'
  | 'cancelled'
  | 'unknown';

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
  }
}

function toAuthError(error: { code?: string; message?: string }) {
  const code = error.code ?? '';
  const message = error.message ?? '';
  if (code === 'invalid_credentials' || /invalid login/i.test(message)) {
    return new AuthError('invalid_credentials');
  }
  if (code === 'email_not_confirmed') return new AuthError('email_not_confirmed');
  if (code === 'user_already_exists' || code === 'email_exists') return new AuthError('user_exists');
  if (code === 'weak_password') return new AuthError('weak_password');
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return new AuthError('rate_limited');
  }
  return new AuthError('unknown');
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw toAuthError(error);
}

/** Devolve `true` quando a conta já entrou e `false` quando falta confirmar o e-mail. */
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: callbackUrl() },
  });
  if (error) throw toAuthError(error);
  // Com confirmação de e-mail ativa, o Supabase devolve o usuário sem sessão (e sem
  // identidades quando o e-mail já existe, para não revelar contas).
  if (data.user && data.user.identities?.length === 0) throw new AuthError('user_exists');
  return Boolean(data.session);
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: resetPasswordUrl(),
  });
  if (error) throw toAuthError(error);
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toAuthError(error);
}

/** Troca o `code` de um link de retorno (OAuth, confirmação, nova senha) por uma sessão. */
export async function exchangeCodeFromUrl(url: string) {
  const { queryParams } = Linking.parse(url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  if (!code) return false;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // O mesmo código pode chegar duas vezes (navegador e deep link); se já há sessão, está ok.
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  }
  return true;
}

export async function signInWithProvider(provider: 'google' | 'apple') {
  const redirectTo = callbackUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new AuthError('unknown');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new AuthError('cancelled');
  const ok = await exchangeCodeFromUrl(result.url);
  if (!ok) throw new AuthError('unknown');
}
