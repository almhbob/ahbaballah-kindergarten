import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSchoolTheme } from '@/contexts/SchoolThemeContext';
import { getTierById } from '@/lib/subscription-tiers';

export default function SubscriptionExpiryBanner() {
  const { schools, activeSchoolId } = useSchoolTheme();

  const warningInfo = useMemo(() => {
    const school = schools.find(s => s.id === activeSchoolId);
    if (!school || !school.expiresAt) return null;

    const tier = getTierById(school.tier ?? 'trial');
    const expiresDate = new Date(school.expiresAt);
    const now = new Date();
    const diffMs = expiresDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 14) return null;

    if (diffDays < 0) {
      return {
        days: diffDays,
        tierName: tier.nameAr,
        color:       '#ef4444',
        bgColor:     '#fef2f2',
        borderColor: '#fecaca',
        mciIcon:     'alert-circle' as const,
        message:     'انتهت صلاحية اشتراكك. يرجى التجديد للاستمرار.',
      };
    }
    if (diffDays <= 3) {
      return {
        days: diffDays,
        tierName: tier.nameAr,
        color:       '#dc2626',
        bgColor:     '#fff1f2',
        borderColor: '#fecdd3',
        mciIcon:     'alert' as const,
        message:     `ينتهي اشتراكك ${tier.nameAr} خلال ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}!`,
      };
    }
    return {
      days: diffDays,
      tierName: tier.nameAr,
      color:       '#d97706',
      bgColor:     '#fffbeb',
      borderColor: '#fde68a',
      mciIcon:     'clock-alert-outline' as const,
      message:     `ينتهي اشتراكك ${tier.nameAr} خلال ${diffDays} يوماً`,
    };
  }, [schools, activeSchoolId]);

  if (!warningInfo) return null;

  return (
    <Pressable
      style={[
        s.banner,
        { backgroundColor: warningInfo.bgColor, borderColor: warningInfo.borderColor },
      ]}
      onPress={() => router.push('/(admin)/developer')}
    >
      <Ionicons name="chevron-back" size={16} color={warningInfo.color} />
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text style={[s.msg, { color: warningInfo.color }]}>{warningInfo.message}</Text>
        <Text style={[s.sub, { color: warningInfo.color + 'aa' }]}>
          اضغط للتجديد أو الترقية
        </Text>
      </View>
      <View style={[s.iconWrap, { backgroundColor: warningInfo.color + '20' }]}>
        <MaterialCommunityIcons name={warningInfo.mciIcon} size={20} color={warningInfo.color} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 14, borderWidth: 1.5,
    marginBottom: 14,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  msg:  { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'right' },
  sub:  { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2, textAlign: 'right' },
});
