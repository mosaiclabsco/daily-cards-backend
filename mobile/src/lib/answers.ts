import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

// Respostas às perguntas, guardadas só no aparelho: alternativa escolhida por card.
// Servem para mostrar acertou/errou de novo ao reabrir e para o placar em Explorar.

const KEY = 'dailycards:answers';
let cache: Record<string, number> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

async function load() {
  if (cache) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    cache = {};
  }
  notify();
}

export function setAnswer(cardId: string, option: number) {
  cache = { ...(cache ?? {}), [cardId]: option };
  void AsyncStorage.setItem(KEY, JSON.stringify(cache)).catch(() => undefined);
  notify();
}

/** Esquece as respostas em memória (o AsyncStorage é limpo por clearLocalData). */
export function resetAnswers() {
  cache = null;
  notify();
}

const EMPTY: Record<string, number> = {};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => cache ?? EMPTY;

/** Respostas atuais; re-renderiza quando o cache carrega ou muda (useSyncExternalStore). */
export function useAnswers(): Record<string, number> {
  useEffect(() => {
    void load();
  }, []);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
