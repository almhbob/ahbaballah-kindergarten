export type SubscriptionTier = 'trial' | 'basic' | 'professional' | 'enterprise';

export interface TierLimits {
  students:      number;
  teachers:      number;
  parents:       number;
  galleryPhotos: number;
}

export interface TierDefinition {
  id:             SubscriptionTier;
  nameAr:         string;
  price:          number;
  trialDays:      number;
  limits:         TierLimits;
  customBranding: boolean;
  multiAdmin:     boolean;
  analytics:      boolean;
  exportData:     boolean;
  color:          string;
  badgeAr:        string;
  description:    string;
  emoji:          string;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierDefinition> = {
  trial: {
    id: 'trial', nameAr: 'تجريبي', price: 0, trialDays: 30, emoji: '🆓',
    limits: { students: 30, teachers: 3, parents: 60, galleryPhotos: 20 },
    customBranding: false, multiAdmin: false, analytics: false, exportData: false,
    color: '#6b7280', badgeAr: 'مجاني 30 يوم', description: 'تجربة كاملة لمدة 30 يوماً',
  },
  basic: {
    id: 'basic', nameAr: 'أساسي', price: 99, trialDays: 0, emoji: '⭐',
    limits: { students: 100, teachers: 8, parents: 200, galleryPhotos: 200 },
    customBranding: true, multiAdmin: false, analytics: false, exportData: true,
    color: '#3b82f6', badgeAr: '99 ر.س / شهر', description: 'للروضات الصغيرة',
  },
  professional: {
    id: 'professional', nameAr: 'احترافي', price: 199, trialDays: 0, emoji: '💎',
    limits: { students: 300, teachers: 20, parents: 600, galleryPhotos: 1000 },
    customBranding: true, multiAdmin: true, analytics: true, exportData: true,
    color: '#8b5cf6', badgeAr: '199 ر.س / شهر', description: 'للروضات المتوسطة',
  },
  enterprise: {
    id: 'enterprise', nameAr: 'مؤسسي', price: 349, trialDays: 0, emoji: '🏆',
    limits: { students: -1, teachers: -1, parents: -1, galleryPhotos: -1 },
    customBranding: true, multiAdmin: true, analytics: true, exportData: true,
    color: '#f59e0b', badgeAr: '349 ر.س / شهر', description: 'بلا حدود — للمجموعات التعليمية',
  },
};

export const TIER_ORDER: SubscriptionTier[] = ['trial', 'basic', 'professional', 'enterprise'];

export function getTierById(id: SubscriptionTier | string): TierDefinition {
  return SUBSCRIPTION_TIERS[id as SubscriptionTier] ?? SUBSCRIPTION_TIERS.trial;
}

export interface CapacityCheck {
  pct:       number;
  isOk:      boolean;
  isWarning: boolean;
  isFull:    boolean;
  isUnlimited: boolean;
}

export function checkCapacity(current: number, limit: number): CapacityCheck {
  if (limit === -1) return { pct: 0, isOk: true, isWarning: false, isFull: false, isUnlimited: true };
  const pct = Math.min(100, Math.round((current / limit) * 100));
  return {
    pct,
    isUnlimited: false,
    isOk:        pct < 70,
    isWarning:   pct >= 70 && pct < 90,
    isFull:      pct >= 90,
  };
}

export function capacityColor(check: CapacityCheck): string {
  if (check.isUnlimited) return '#10b981';
  if (check.isFull)      return '#ef4444';
  if (check.isWarning)   return '#f59e0b';
  return '#10b981';
}
