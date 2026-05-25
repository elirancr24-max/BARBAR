/**
 * Lightweight i18n — no extra deps.
 * Default lang: Hebrew. Supports English + Russian.
 *
 * Usage:
 *   import { useLocale } from '@/store/locale';
 *   import { t } from '@/lib/i18n';
 *   const locale = useLocale((s) => s.locale);
 *   <h1>{t('landing.title', locale)}</h1>
 */

export const SUPPORTED_LOCALES = ['he', 'en', 'ru'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  he: 'עברית',
  en: 'English',
  ru: 'Русский',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  he: '🇮🇱',
  en: '🇺🇸',
  ru: '🇷🇺',
};

type Dict = Record<string, string | Record<string, string>>;

const dictionaries: Record<Locale, Dict> = {
  he: {
    'common.book': 'קבע תור',
    'common.book_now': 'קבע תור עכשיו',
    'common.cancel': 'ביטול',
    'common.confirm': 'אישור',
    'common.back': 'חזור',
    'common.save': 'שמור',
    'common.close': 'סגור',
    'common.loading': 'טוען...',
    'common.staff_login': 'כניסת צוות',
    'nav.home': 'בית',
    'nav.book': 'קבע תור',
    'nav.my_appointments': 'התורים שלי',
    'nav.login': 'כניסה',
    'landing.tagline': 'תספורת · עיצוב · סטייל',
    'landing.subtitle': 'קבע תור בקליק — בלי להמתין, בלי טלפונים.',
    'landing.hours': 'ראשון–חמישי 10:00–20:00 · שישי–שבת סגור',
    'landing.services_title': 'השירותים שלנו',
    'landing.team_title': 'הצוות שלנו',
    'landing.reviews_title': 'מה הלקוחות אומרים',
    'landing.gallery_title': 'העבודות שלנו',
    'landing.view_all': 'ראה הכל',
    'booking.step.service': 'שירות',
    'booking.step.barber': 'ספר',
    'booking.step.datetime': 'תאריך ושעה',
    'booking.step.details': 'פרטים ואישור',
    'booking.choose_service': 'בחר שירות',
    'booking.choose_barber': 'בחר ספר',
    'booking.choose_datetime': 'בחר תאריך ושעה',
    'booking.your_details': 'פרטים אישיים',
    'booking.full_name': 'שם מלא',
    'booking.phone': 'טלפון',
    'booking.email': 'אימייל (לא חובה)',
    'booking.notes': 'הערות (לא חובה)',
    'booking.confirm_button': 'אשר וקבע תור',
    'booking.success': 'התור שלך אושר!',
    'booking.confirmation_code': 'קוד אישור',
  },
  en: {
    'common.book': 'Book',
    'common.book_now': 'Book Now',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.staff_login': 'Staff Login',
    'nav.home': 'Home',
    'nav.book': 'Book',
    'nav.my_appointments': 'My Appointments',
    'nav.login': 'Login',
    'landing.tagline': 'Haircut · Design · Style',
    'landing.subtitle': 'Book in one click — no waiting, no phone calls.',
    'landing.hours': 'Sun–Thu 10:00–20:00 · Fri–Sat closed',
    'landing.services_title': 'Our Services',
    'landing.team_title': 'Our Team',
    'landing.reviews_title': 'What Clients Say',
    'landing.gallery_title': 'Our Work',
    'landing.view_all': 'View All',
    'booking.step.service': 'Service',
    'booking.step.barber': 'Barber',
    'booking.step.datetime': 'Date & Time',
    'booking.step.details': 'Details & Confirm',
    'booking.choose_service': 'Choose a service',
    'booking.choose_barber': 'Choose a barber',
    'booking.choose_datetime': 'Pick date & time',
    'booking.your_details': 'Your details',
    'booking.full_name': 'Full Name',
    'booking.phone': 'Phone',
    'booking.email': 'Email (optional)',
    'booking.notes': 'Notes (optional)',
    'booking.confirm_button': 'Confirm Booking',
    'booking.success': 'Your appointment is confirmed!',
    'booking.confirmation_code': 'Confirmation code',
  },
  ru: {
    'common.book': 'Записаться',
    'common.book_now': 'Записаться сейчас',
    'common.cancel': 'Отмена',
    'common.confirm': 'Подтвердить',
    'common.back': 'Назад',
    'common.save': 'Сохранить',
    'common.close': 'Закрыть',
    'common.loading': 'Загрузка...',
    'common.staff_login': 'Вход для персонала',
    'nav.home': 'Главная',
    'nav.book': 'Записаться',
    'nav.my_appointments': 'Мои записи',
    'nav.login': 'Войти',
    'landing.tagline': 'Стрижка · Стиль · Образ',
    'landing.subtitle': 'Запись в один клик — без ожидания, без звонков.',
    'landing.hours': 'Вс–Чт 10:00–20:00 · Пт–Сб закрыто',
    'landing.services_title': 'Наши услуги',
    'landing.team_title': 'Наша команда',
    'landing.reviews_title': 'Отзывы клиентов',
    'landing.gallery_title': 'Наши работы',
    'landing.view_all': 'Смотреть все',
    'booking.step.service': 'Услуга',
    'booking.step.barber': 'Парикмахер',
    'booking.step.datetime': 'Дата и время',
    'booking.step.details': 'Данные и подтверждение',
    'booking.choose_service': 'Выберите услугу',
    'booking.choose_barber': 'Выберите парикмахера',
    'booking.choose_datetime': 'Выберите дату и время',
    'booking.your_details': 'Ваши данные',
    'booking.full_name': 'Полное имя',
    'booking.phone': 'Телефон',
    'booking.email': 'Email (необязательно)',
    'booking.notes': 'Заметки (необязательно)',
    'booking.confirm_button': 'Подтвердить запись',
    'booking.success': 'Ваша запись подтверждена!',
    'booking.confirmation_code': 'Код подтверждения',
  },
};

export function t(key: string, locale: Locale = 'he'): string {
  const dict = dictionaries[locale] || dictionaries.he;
  const val = dict[key];
  if (typeof val === 'string') return val;
  // Fallback to Hebrew if missing
  const fb = dictionaries.he[key];
  return typeof fb === 'string' ? fb : key;
}

export function isRtl(locale: Locale): boolean {
  return locale === 'he';
}
