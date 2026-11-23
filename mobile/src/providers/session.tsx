import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  followArea,
  getSubscription,
  isPremiumActive,
  listFollowedAreas,
  saveProfile,
} from '@/lib/api';
import { cardStore } from '@/lib/card-store';
import { clearLocalData, onboardingStore } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { FollowedArea } from '@/lib/types';

// Estado de conta do app: sessão do Supabase, profissões seguidas e plano.
// "ready" = logado e seguindo ao menos uma profissão; é o que libera as abas.

type SessionState = {
  loading: boolean;
  session: Session | null;
  followed: FollowedArea[];
  premium: boolean;
  /** Erro ao carregar o perfil (ex.: sem internet); o app mostra tentar de novo. */
  loadError: boolean;
  ready: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [followed, setFollowed] = useState<FollowedArea[]>([]);
  const [premium, setPremium] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const userId = session?.user.id ?? null;
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id ?? null;
    if (!uid) return;
    setLoadError(false);
    try {
      // Mantém idioma, país e fuso do perfil iguais aos do aparelho (o banco usa o fuso para o "hoje").
      const pending = await onboardingStore.get();
      await saveProfile(pending?.relationship ?? null);
      let areas = await listFollowedAreas();
      // Primeira entrada depois do onboarding: segue a profissão escolhida antes da conta existir.
      if (areas.length === 0 && pending) {
        await followArea(pending.areaId);
        areas = await listFollowedAreas();
      }
      if (pending) await onboardingStore.clear();
      const sub = await getSubscription();
      setFollowed(areas);
      setPremium(isPremiumActive(sub));
    } catch {
      setLoadError(true);
    } finally {
      setLoadedUserId(uid);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current === userId) return;
    loadedFor.current = userId;
    void load();
  }, [userId, load]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setFollowed([]);
    setPremium(false);
    setLoadedUserId(null);
    cardStore.clear();
    await clearLocalData();
  }, []);

  const value = useMemo<SessionState>(() => {
    // Sem sessão, nada do usuário anterior vale (troca de conta ou sessão expirada).
    const loaded = Boolean(userId) && loadedUserId === userId;
    const mine = loaded ? followed : [];
    // Logado mas com o perfil ainda carregando: segura na tela de espera, sem piscar o onboarding.
    const pendingFirstLoad = Boolean(userId) && !loaded;
    return {
      loading: authLoading || pendingFirstLoad,
      session,
      followed: mine,
      premium: loaded && premium,
      loadError: loaded && loadError,
      ready: Boolean(session) && mine.length > 0,
      refresh: load,
      signOut,
    };
  }, [authLoading, userId, loadedUserId, session, followed, premium, loadError, load, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession fora do SessionProvider');
  return ctx;
}
