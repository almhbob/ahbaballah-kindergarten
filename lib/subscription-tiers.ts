export type SubscriptionTier = 'trial' | 'basic' | 'professional' | 'enterprise';

export const BILLING_CURRENCY = 'USD';
export const BILLING_INTERVAL_AR = 'شهر';

export interface TierLimits {
  students: number;
  teachers: number;
  parents: number;
  galleryPhotos: number;
}

export interface TierDefinition {
  id: SubscriptionTier;
  nameAr: string;
  price: number;
  currency: 'USD';
  trialDays: number;
  limits: TierLimits;
  customBranding: boolean;
  multiAdmin: boolean;
  analytics: boolean;
  exportData: boolean;
  color: string;
  badgeAr: string;
  description: string;
  emoji: string;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierDefinition> = {
  trial: {
    id: 'trial', nameAr: 'تجريبي', price: 0, currency: 'USD', trialDays: 30, emoji: '🆓',
    limits: { students: 30, teachers: 3, parents: 60, galleryPhotos: 20 },
    customBranding: false, multiAdmin: false, analytics: false, exportData: false,
    color: '#6b7280', badgeAr: 'مجاني 30 يوم', description: 'تجربة كاملة لمدة 30 يوماً متاحة عالمياً',
  },
  basic: {
    id: 'basic', nameAr: 'أساسي', price: 29, currency: 'USD', trialDays: 0, emoji: '⭐',
    limits: { students: 100, teachers: 8, parents: 200, galleryPhotos: 200 },
    customBranding: true, multiAdmin: false, analytics: false, exportData: true,
    color: '#3b82f6', badgeAr: 'USD 29 / شهر', description: 'للروضات الصغيرة في أي دولة',
  },
  professional: {
    id: 'professional', nameAr: 'احترافي', price: 59, currency: 'USD', trialDays: 0, emoji: '💎',
    limits: { students: 300, teachers: 20, parents: 600, galleryPhotos: 1000 },
    customBranding: true, multiAdmin: true, analytics: true, exportData: true,
    color: '#8b5cf6', badgeAr: 'USD 59 / شهر', description: 'للروضات المتوسطة عالمياً',
  },
  enterprise: {
    id: 'enterprise', nameAr: 'مؤسسي', price: 99, currency: 'USD', trialDays: 0, emoji: '🏆',
    limits: { students: -1, teachers: -1, parents: -1, galleryPhotos: -1 },
    customBranding: true, multiAdmin: true, analytics: true, exportData: true,
    color: '#f59e0b', badgeAr: 'USD 99 / شهر', description: 'بلا حدود للمجموعات التعليمية عالمياً',
  },
};

export const TIER_ORDER: SubscriptionTier[] = ['trial', 'basic', 'professional', 'enterprise'];

export function getTierById(id: SubscriptionTier | string): TierDefinition {
  return SUBSCRIPTION_TIERS[id as SubscriptionTier] ?? SUBSCRIPTION_TIERS.trial;
}

export interface CapacityCheck {
  pct: number;
  isOk: boolean;
  isWarning: boolean;
  isFull: boolean;
  isUnlimited: boolean;
}

export function checkCapacity(current: number, limit: number): CapacityCheck {
  if (limit === -1) return { pct: 0, isOk: true, isWarning: false, isFull: false, isUnlimited: true };
  const pct = Math.min(100, Math.round((current / limit) * 100));
  return {
    pct,
    isUnlimited: false,
    isOk: pct < 70,
    isWarning: pct >= 70 && pct < 90,
    isFull: pct >= 90,
  };
}

export function capacityColor(check: CapacityCheck): string {
  if (check.isUnlimited) return '#10b981';
  if (check.isFull) return '#ef4444';
  if (check.isWarning) return '#f59e0b';
  return '#10b981';
}
