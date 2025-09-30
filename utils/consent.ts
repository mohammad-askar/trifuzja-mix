//E:\trifuzja-mix\utils\consent.ts
// مفاتيح وثوابت
const CONSENT_KEY = 'ia_consent_analytics';
const ONE_YEAR_DAYS = 365;

// قراءة قيمة الكوكي (granted/denied)
function readRaw(): string | null {
  if (typeof document === 'undefined') return null;
  const map = new Map(
    document.cookie.split(';').map(c => {
      const [k, ...rest] = c.trim().split('=');
      return [k, rest.join('=')];
    }),
  );
  return map.get(CONSENT_KEY) ?? null;
}

export function getAnalyticsConsent(): boolean {
  return readRaw() === 'granted';
}

// حفظ الموافقة + بث حدث للتطبيق ليستجيب فوراً
export function setAnalyticsConsent(granted: boolean): void {
  if (typeof document === 'undefined') return;
  const value = granted ? 'granted' : 'denied';
  const expires = new Date(Date.now() + ONE_YEAR_DAYS * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${CONSENT_KEY}=${value}; Path=/; Expires=${expires}; SameSite=Lax`;
  // إشعار بقية الأجزاء (GA مثلاً)
  window.dispatchEvent(new CustomEvent<boolean>('ia:analytics-consent', { detail: granted }));
}

// إلغاء الموافقة (مثلاً من رابط في الفوتر)
export function revokeAnalyticsConsent(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${CONSENT_KEY}=denied; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent<boolean>('ia:analytics-consent', { detail: false }));
}
