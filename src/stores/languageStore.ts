import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translations, Translations } from '../i18n/translations';

const STORAGE_KEY = 'athliq_language';

interface LanguageStore {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => Promise<void>;
  loadLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: 'en',
  t: translations.en,

  setLanguage: async (lang: Language) => {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    set({ language: lang, t: translations[lang] });
  },

  loadLanguage: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'de') {
        set({ language: stored, t: translations[stored] });
      }
    } catch {
      // default to English
    }
  },
}));

/** Convenience hook — returns just the translation object */
export function useT(): Translations {
  return useLanguageStore((s) => s.t);
}
