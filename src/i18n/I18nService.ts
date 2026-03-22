/**
 * I18nService.ts
 *
 * Localization service for Civil BIM Viewer. Supports EN, VI, FR.
 * UI strings are externalized to JSON translation files.
 * Language preference persists in localStorage and is applied
 * before the first render.
 *
 * Phase 5, Task 5.6
 */

import enMessages from "./en.json";
import viMessages from "./vi.json";
import frMessages from "./fr.json";

/** Supported locale codes */
export type Locale = "en" | "vi" | "fr";

/** All supported locales */
export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "vi", "fr"] as const;

/** Human-readable locale names */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  fr: "Français",
};

const STORAGE_KEY = "civil-bim-locale";

/** Translation dictionary type */
type TranslationDict = Record<string, string>;

/** Pre-loaded translation bundles */
const TRANSLATIONS: Record<Locale, TranslationDict> = {
  en: enMessages as TranslationDict,
  vi: viMessages as TranslationDict,
  fr: frMessages as TranslationDict,
};

export class I18nService {
  private _locale: Locale;
  private _messages: TranslationDict;
  private _listeners: Set<(locale: Locale) => void> = new Set();

  constructor() {
    this._locale = this._detectLocale();
    this._messages = TRANSLATIONS[this._locale];
  }

  // ── Public API ──────────────────────────────────────────

  /** Current locale */
  get locale(): Locale {
    return this._locale;
  }

  /**
   * Translate a key, with optional interpolation.
   * Falls back to English, then to the key itself.
   *
   * @example
   * t("toolbar.measure") → "Measure"
   * t("utilities.undergroundCount", { count: 5 }) → "5 underground element(s)"
   */
  t(key: string, params?: Record<string, string | number>): string {
    let message = this._messages[key] ?? TRANSLATIONS.en[key] ?? key;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        message = message.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }

    return message;
  }

  /**
   * Set the active locale. Persists to localStorage and notifies listeners.
   */
  setLocale(locale: Locale): void {
    if (!SUPPORTED_LOCALES.includes(locale)) {
      console.warn(`[I18n] Unsupported locale "${locale}", falling back to "en".`);
      locale = "en";
    }

    this._locale = locale;
    this._messages = TRANSLATIONS[locale];
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;

    // Notify listeners
    for (const fn of this._listeners) {
      fn(locale);
    }

    console.info(`[I18n] Locale set to "${locale}".`);
  }

  /**
   * Subscribe to locale changes.
   * Returns an unsubscribe function.
   */
  onLocaleChange(callback: (locale: Locale) => void): () => void {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  /**
   * Get all available translations for a given locale.
   */
  getTranslations(locale?: Locale): Readonly<TranslationDict> {
    return TRANSLATIONS[locale ?? this._locale];
  }

  /**
   * Check if a translation key exists in the current locale.
   */
  has(key: string): boolean {
    return key in this._messages;
  }

  // ── Private ─────────────────────────────────────────────

  /** Detect locale from localStorage, then browser, then default to "en" */
  private _detectLocale(): Locale {
    // 1. Check localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      return stored as Locale;
    }

    // 2. Check browser language
    const browserLang = navigator.language?.slice(0, 2)?.toLowerCase();
    if (browserLang && SUPPORTED_LOCALES.includes(browserLang as Locale)) {
      return browserLang as Locale;
    }

    // 3. Default
    return "en";
  }
}

/** Singleton instance for the app */
export const i18n = new I18nService();
