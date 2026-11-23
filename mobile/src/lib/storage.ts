import AsyncStorage from '@react-native-async-storage/async-storage';

import { resetAnswers } from '@/lib/answers';
import type { Card, Relationship } from '@/lib/types';

// Estado local do app. A sessão do Supabase fica em chaves próprias do supabase-js.

const KEYS = {
  onboarding: 'dailycards:onboarding',
  selectedArea: 'dailycards:selected-area',
  track: (areaId: string) => `dailycards:track:${areaId}`,
} as const;

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache é conveniência: falha ao gravar não interrompe o app.
  }
}

// --- Escolhas do onboarding, guardadas até a conta existir ------------------

export type OnboardingChoice = {
  areaId: string;
  areaSlug: string;
  relationship: Relationship | null;
};

export const onboardingStore = {
  get: () => readJson<OnboardingChoice>(KEYS.onboarding),
  set: (choice: OnboardingChoice) => writeJson(KEYS.onboarding, choice),
  clear: () => AsyncStorage.removeItem(KEYS.onboarding).catch(() => undefined),
};

// --- Profissão aberta na tela Hoje -----------------------------------------

export const selectedAreaStore = {
  get: () => AsyncStorage.getItem(KEYS.selectedArea).catch(() => null),
  set: (areaId: string) => AsyncStorage.setItem(KEYS.selectedArea, areaId).catch(() => undefined),
};

// --- Cache da trilha (hoje-2 até hoje+14) -----------------------------------
// Base para o app funcionar sem internet e, depois, para o widget nativo.

export type TrackCache = {
  areaId: string;
  fetchedAt: string;
  cards: Card[];
};

export const trackStore = {
  get: (areaId: string) => readJson<TrackCache>(KEYS.track(areaId)),
  set: (areaId: string, cards: Card[]) =>
    writeJson(KEYS.track(areaId), { areaId, fetchedAt: new Date().toISOString(), cards }),
};

/** Apaga tudo do app no aparelho (sair e excluir conta). */
export async function clearLocalData() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith('dailycards:')));
    resetAnswers();
  } catch {
    // Sem dados locais para apagar.
  }
}
