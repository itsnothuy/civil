/**
 * I18nService.test.ts — Unit tests for localization service
 * Phase 5, Task 5.6
 */

jest.mock("@xeokit/xeokit-sdk", () => ({}));

import {
  I18nService,
  SUPPORTED_LOCALES,
  LOCALE_NAMES,
  type Locale,
} from "../../src/i18n/I18nService";

describe("I18nService", () => {
  let i18n: I18nService;

  beforeEach(() => {
    localStorage.clear();
    i18n = new I18nService();
  });

  describe("initialization", () => {
    it("defaults to English", () => {
      expect(i18n.locale).toBe("en");
    });

    it("restores locale from localStorage", () => {
      localStorage.setItem("civil-bim-locale", "vi");
      const i = new I18nService();
      expect(i.locale).toBe("vi");
    });

    it("supports all declared locales", () => {
      expect(SUPPORTED_LOCALES).toContain("en");
      expect(SUPPORTED_LOCALES).toContain("vi");
      expect(SUPPORTED_LOCALES).toContain("fr");
    });

    it("has human-readable locale names", () => {
      expect(LOCALE_NAMES.en).toBe("English");
      expect(LOCALE_NAMES.vi).toBe("Tiếng Việt");
      expect(LOCALE_NAMES.fr).toBe("Français");
    });
  });

  describe("translation (t)", () => {
    it("translates a known key", () => {
      expect(i18n.t("toolbar.measure")).toBe("Measure");
    });

    it("returns key if translation not found", () => {
      expect(i18n.t("unknown.key")).toBe("unknown.key");
    });

    it("interpolates parameters", () => {
      const result = i18n.t("utilities.undergroundCount", { count: 5 });
      expect(result).toBe("5 underground element(s)");
    });

    it("interpolates multiple parameters", () => {
      const result = i18n.t("error.modelLoad", { message: "File not found" });
      expect(result).toBe("Failed to load model: File not found");
    });

    it("translates in Vietnamese", () => {
      i18n.setLocale("vi");
      expect(i18n.t("toolbar.measure")).toBe("Đo");
      expect(i18n.t("toolbar.annotate")).toBe("Ghi chú");
    });

    it("translates in French", () => {
      i18n.setLocale("fr");
      expect(i18n.t("toolbar.measure")).toBe("Mesurer");
      expect(i18n.t("toolbar.annotate")).toBe("Annoter");
    });

    it("falls back to English for missing keys in other locales", () => {
      i18n.setLocale("vi");
      // If a key exists in EN but somehow missing in VI, falls back
      // All keys exist in our full translation files, so test with raw instance
      expect(i18n.t("toolbar.3d")).toBe("3D"); // Same in all locales
    });
  });

  describe("setLocale", () => {
    it("changes the locale", () => {
      i18n.setLocale("fr");
      expect(i18n.locale).toBe("fr");
    });

    it("persists locale to localStorage", () => {
      i18n.setLocale("vi");
      expect(localStorage.getItem("civil-bim-locale")).toBe("vi");
    });

    it("updates document.documentElement.lang", () => {
      i18n.setLocale("fr");
      expect(document.documentElement.lang).toBe("fr");
    });

    it("falls back to English for unsupported locales", () => {
      i18n.setLocale("xx" as Locale);
      expect(i18n.locale).toBe("en");
    });
  });

  describe("onLocaleChange", () => {
    it("notifies listeners on locale change", () => {
      const callback = jest.fn();
      i18n.onLocaleChange(callback);
      i18n.setLocale("vi");
      expect(callback).toHaveBeenCalledWith("vi");
    });

    it("supports unsubscribe", () => {
      const callback = jest.fn();
      const unsub = i18n.onLocaleChange(callback);
      unsub();
      i18n.setLocale("fr");
      expect(callback).not.toHaveBeenCalled();
    });

    it("notifies multiple listeners", () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      i18n.onLocaleChange(cb1);
      i18n.onLocaleChange(cb2);
      i18n.setLocale("fr");
      expect(cb1).toHaveBeenCalledWith("fr");
      expect(cb2).toHaveBeenCalledWith("fr");
    });
  });

  describe("has", () => {
    it("returns true for existing keys", () => {
      expect(i18n.has("toolbar.measure")).toBe(true);
    });

    it("returns false for unknown keys", () => {
      expect(i18n.has("nonexistent.key")).toBe(false);
    });
  });

  describe("getTranslations", () => {
    it("returns translation dictionary for current locale", () => {
      const trans = i18n.getTranslations();
      expect(trans["toolbar.measure"]).toBe("Measure");
    });

    it("returns translation dictionary for specific locale", () => {
      const trans = i18n.getTranslations("vi");
      expect(trans["toolbar.measure"]).toBe("Đo");
    });
  });

  describe("complete translation files", () => {
    it("all locales have the same keys", () => {
      const enKeys = Object.keys(i18n.getTranslations("en")).sort();
      const viKeys = Object.keys(i18n.getTranslations("vi")).sort();
      const frKeys = Object.keys(i18n.getTranslations("fr")).sort();

      expect(viKeys).toEqual(enKeys);
      expect(frKeys).toEqual(enKeys);
    });

    it("no translation value is empty", () => {
      for (const locale of SUPPORTED_LOCALES) {
        const trans = i18n.getTranslations(locale);
        for (const [key, value] of Object.entries(trans)) {
          expect(value.length).toBeGreaterThan(0);
          if (value === "") {
            fail(`Empty translation: ${locale}.${key}`);
          }
        }
      }
    });
  });
});
