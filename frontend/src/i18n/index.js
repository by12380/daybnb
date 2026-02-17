import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import ar from "./locales/ar.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import pt from "./locales/pt.json";
import hi from "./locales/hi.json";
import ru from "./locales/ru.json";
import it from "./locales/it.json";
import tr from "./locales/tr.json";
import nl from "./locales/nl.json";
import th from "./locales/th.json";

export const LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇺🇸", dir: "ltr" },
  { code: "es", label: "Spanish", nativeLabel: "Español", flag: "🇪🇸", dir: "ltr" },
  { code: "fr", label: "French", nativeLabel: "Français", flag: "🇫🇷", dir: "ltr" },
  { code: "de", label: "German", nativeLabel: "Deutsch", flag: "🇩🇪", dir: "ltr" },
  { code: "it", label: "Italian", nativeLabel: "Italiano", flag: "🇮🇹", dir: "ltr" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português", flag: "🇧🇷", dir: "ltr" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands", flag: "🇳🇱", dir: "ltr" },
  { code: "ru", label: "Russian", nativeLabel: "Русский", flag: "🇷🇺", dir: "ltr" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe", flag: "🇹🇷", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", flag: "🇮🇳", dir: "ltr" },
  { code: "zh", label: "Chinese", nativeLabel: "中文", flag: "🇨🇳", dir: "ltr" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語", flag: "🇯🇵", dir: "ltr" },
  { code: "ko", label: "Korean", nativeLabel: "한국어", flag: "🇰🇷", dir: "ltr" },
  { code: "th", label: "Thai", nativeLabel: "ไทย", flag: "🇹🇭", dir: "ltr" },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      ar: { translation: ar },
      zh: { translation: zh },
      ja: { translation: ja },
      ko: { translation: ko },
      pt: { translation: pt },
      hi: { translation: hi },
      ru: { translation: ru },
      it: { translation: it },
      tr: { translation: tr },
      nl: { translation: nl },
      th: { translation: th },
    },
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "daybnb_language",
    },
  });

export default i18n;
