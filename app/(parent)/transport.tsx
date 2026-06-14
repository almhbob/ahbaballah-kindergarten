import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Platform, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';

const BUS_GREEN = '#0D7C4A';
const BUS_LIGHT = '#E8F8F0';

export default function ParentTransportScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    students, transportRoutes, transportSubscriptions,
    setTransportSubscription,
  } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const child = students.find(s => s.id === user?.studentId) ?? null;

  const mySubscription = useMemo(() =>
    transportSubscriptions.find(sub => sub.studentId === child?.id),
    [transportSubscriptions, child]
  );

  const myRoute = useMemo(() =>
    mySubscription ? transportRoutes.find(r => r.id === mySubscription.routeId) : null,
    [mySubscription, transportRoutes]
  );

  const activeRoutes = transportRoutes.filter(r => r.active);

  function handleSubscribe(routeId: string) {
    if (!child) return;
    const route = transportRoutes.find(r => r.id === routeId);
    if (!route) return;

    if (mySubscription) {
      Alert.alert(
        'تغيير الخط',
        `هل تريد تغيير اشتراكك إلى "${route.name}"؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'تأكيد', onPress: () => {
              setTransportSubscription(child.id, routeId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'الاشتراك في الترحيل',
        `هل تريد الاشتراك في "${route.name}"؟\nالرسوم الشهرية: ${route.monthlyFee.toLocaleString()} ج.س`,
        [
          { text: 'لا', style: 'cancel' },
          {
            text: 'اشتراك', onPress: () => {
              setTransportSubscription(child.id, routeId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    }
  }

  function handleUnsubscribe() {
    if (!child) return;
    Alert.alert(
      'إلغاء الاشتراك',
      'هل أنت متأكد من إلغاء اشتراكك في خدمة الترحيل؟',
      [
        { text: 'لا', style: 'cancel' },
        {
          text: 'إلغاء الاشتراك', style: 'destructive', onPress: () => {
            setTransportSubscription(child.id, null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          },
        },
      ]
    );
  }

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad + 24 }}>

        {/* Header */}
        <LinearGradient
          colors={['#07311E', '#0D4D2C', '#116638']}
          style={[s.header, { paddingTop: topPadding + 16 }]}
        >
          <View style={s.headerContent}>
            <MaterialCommunityIcons name="bus-school" size={36} color="#68D89A" />
            <Text style={s.headerTitle}>خدمة الترحيل</Text>
            <Text style={s.headerSub}>نظم إدارة رياض الأطفال — الخاصة</Text>
          </View>

          {/* Current status badge */}
          <View style={[s.statusBadge, { backgroundColor: mySubscription ? 'rgba(104,216,154,0.2)' : 'rgba(255,255,255,0.1)' }]}>
            <Ionicons
              name={mySubscription ? 'checkmark-circle' : 'close-circle-outline'}
              size={18}
              color={mySubscription ? '#68D89A' : 'rgba(255,255,255,0.5)'}
            />
            <Text style={[s.statusTxt, { color: mySubscription ? '#68D89A' : 'rgba(255,255,255,0.6)' }]}>
              {mySubscription ? `مشترك في ${myRoute?.name ?? '...'}` : 'غير مشترك في خدمة الترحيل'}
            </Text>
          </View>
        </LinearGradient>

        {/* ── Active subscription card ── */}
        {myRoute ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>اشتراكك الحالي</Text>
            <View style={s.activeCard}>
              <LinearGradient
                colors={['#07311E', '#116638']}
                style={s.activeCardHeader}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="bus-school" size={22} color="#68D89A" />
                <Text style={s.activeCardName}>{myRoute.name}</Text>
                <View style={s.activeCardBadge}>
                  <Text style={s.activeCardBadgeTxt}>نشط</Text>
                </View>
              </LinearGradient>

              <View style={s.activeCardBody}>
                {/* Areas */}
                <View style={s.activeRow}>
                  <Ionicons name="location" size={15} color={BUS_GREEN} />
                  <Text style={s.activeRowLabel}>المناطق</Text>
                  <Text style={s.activeRowValue} numberOfLines={2}>{myRoute.areas.join(' · ')}</Text>
                </View>

                {/* Times */}
                <View style={s.timesRow}>
                  <View style={s.timeBox}>
                    <Ionicons name="sunny" size={20} color="#F59E0B" />
                    <Text style={s.timeLabel}>موعد الذهاب</Text>
                    <Text style={s.timeValue}>{myRoute.morningTime}</Text>
                    <Text style={s.timeNote}>صباحاً</Text>
                  </View>
                  <View style={s.timeDivider} />
                  <View style={s.timeBox}>
                    <Ionicons name="moon" size={20} color="#6366F1" />
                    <Text style={s.timeLabel}>موعد العودة</Text>
                    <Text style={s.timeValue}>{myRoute.afternoonTime}</Text>
                    <Text style={s.timeNote}>ظهراً</Text>
                  </View>
                </View>

                {/* Fee */}
                <View style={[s.feeBox, { backgroundColor: BUS_LIGHT }]}>
                  <MaterialCommunityIcons name="cash-multiple" size={20} color={BUS_GREEN} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.feeLabel}>الرسوم الشهرية</Text>
                    <Text style={s.feeValue}>{myRoute.monthlyFee.toLocaleString()} ج.س / شهر</Text>
                  </View>
                </View>

                {/* Driver */}
                <View style={s.driverCard}>
                  <View style={s.driverAvatar}>
                    <Ionicons name="person" size={20} color={BUS_GREEN} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.driverLabel}>السائق</Text>
                    <Text style={s.driverNameTxt}>{myRoute.driverName}</Text>
                  </View>
                  <Pressable
                    style={s.callBtn}
                    onPress={async () => {
                      try {
                        const url = `tel:${myRoute.driverPhone}`;
                        const can = await Linking.canOpenURL(url);
                        if (can) { await Linking.openURL(url); }
                        else { Alert.alert('اتصال', `رقم السائق: ${myRoute.driverPhone}`); }
                      } catch { Alert.alert('اتصال', `رقم السائق: ${myRoute.driverPhone}`); }
                    }}
                  >
                    <Ionicons name="call" size={16} color="#fff" />
                    <Text style={s.callBtnTxt}>اتصال</Text>
                  </Pressable>
                </View>

                {myRoute.notes ? (
                  <View style={s.notesBox}>
                    <Text style={s.notesTxt}>📋 {myRoute.notes}</Text>
                  </View>
                ) : null}
              </View>

              {/* Unsubscribe */}
              <Pressable style={s.unsubBtn} onPress={handleUnsubscribe}>
                <Ionicons name="close-circle-outline" size={16} color={Colors.danger} />
                <Text style={s.unsubTxt}>إلغاء الاشتراك</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={s.section}>
            <View style={s.noSubCard}>
              <MaterialCommunityIcons name="bus" size={44} color={Colors.textLight} />
              <Text style={s.noSubTitle}>لم تشترك في خدمة الترحيل بعد</Text>
              <Text style={s.noSubHint}>اختر أحد الخطوط المتاحة أدناه للاشتراك</Text>
            </View>
          </View>
        )}

        {/* ── Available routes ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>الخطوط المتاحة</Text>

          {activeRoutes.length === 0 ? (
            <View style={s.noRouteCard}>
              <Text style={s.noRouteTxt}>لا توجد خطوط متاحة حالياً</Text>
            </View>
          ) : (
            activeRoutes.map(route => {
              const isMyRoute = myRoute?.id === route.id;
              const subCount = transportSubscriptions.filter(s => s.routeId === route.id).length;
              const isFull = subCount >= route.capacity;

              return (
                <View
                  key={route.id}
                  style={[s.routeCard, isMyRoute && s.routeCardActive]}
                >
                  {/* Route name + status */}
                  <View style={s.routeCardTop}>
                    <View style={[s.routeIcon, { backgroundColor: isMyRoute ? BUS_GREEN + '18' : Colors.background }]}>
                      <MaterialCommunityIcons name="bus-school" size={20} color={isMyRoute ? BUS_GREEN : Colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={[s.routeName, isMyRoute && { color: BUS_GREEN }]}>{route.name}</Text>
                      <Text style={s.routeAreas} numberOfLines={1}>{route.areas.join(' · ')}</Text>
                    </View>
                    {isMyRoute && (
                      <View style={s.myRouteBadge}>
                        <Text style={s.myRouteBadgeTxt}>اشتراكك</Text>
                      </View>
                    )}
                    {isFull && !isMyRoute && (
                      <View style={s.fullBadge}>
                        <Text style={s.fullBadgeTxt}>ممتلئ</Text>
                      </View>
                    )}
                  </View>

                  {/* Times + fee summary */}
                  <View style={s.routeSummaryRow}>
                    <View style={s.summaryChip}>
                      <Ionicons name="sunny-outline" size={12} color="#F59E0B" />
                      <Text style={s.summaryChipTxt}>{route.morningTime}</Text>
                    </View>
                    <View style={s.summaryChip}>
                      <Ionicons name="moon-outline" size={12} color="#6366F1" />
                      <Text style={s.summaryChipTxt}>{route.afternoonTime}</Text>
                    </View>
                    <View style={[s.summaryChip, { backgroundColor: BUS_LIGHT }]}>
                      <MaterialCommunityIcons name="cash" size={12} color={BUS_GREEN} />
                      <Text style={[s.summaryChipTxt, { color: BUS_GREEN }]}>{route.monthlyFee.toLocaleString()} ج.س</Text>
                    </View>
                    <View style={s.summaryChip}>
                      <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
                      <Text style={s.summaryChipTxt}>{subCount}/{route.capacity}</Text>
                    </View>
                  </View>

                  {/* Driver */}
                  <View style={s.routeDriverRow}>
                    <Ionicons name="person-circle-outline" size={14} color={Colors.textSecondary} />
                    <Text style={s.routeDriverTxt}>{route.driverName}</Text>
                    <Pressable onPress={async () => {
                    try {
                      const url = `tel:${route.driverPhone}`;
                      const can = await Linking.canOpenURL(url);
                      if (can) { await Linking.openURL(url); }
                      else { Alert.alert('اتصال', `رقم السائق: ${route.driverPhone}`); }
                    } catch { Alert.alert('اتصال', `رقم السائق: ${route.driverPhone}`); }
                  }} style={s.miniCallBtn}>
                      <Ionicons name="call-outline" size={12} color={BUS_GREEN} />
                    </Pressable>
                  </View>

                  {/* Subscribe / unsubscribe button */}
                  {isMyRoute ? (
                    <Pressable style={s.unsubSmallBtn} onPress={handleUnsubscribe}>
                      <Text style={s.unsubSmallTxt}>إلغاء الاشتراك</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[s.subBtn, isFull && s.subBtnDisabled]}
                      disabled={isFull}
                      onPress={() => handleSubscribe(route.id)}
                    >
                      <LinearGradient
                        colors={isFull ? [Colors.border, Colors.border] : ['#07311E', '#116638']}
                        style={s.subBtnGrad}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name={isFull ? 'close-circle-outline' : 'add-circle-outline'} size={16} color={isFull ? Colors.textLight : '#fff'} />
                        <Text style={[s.subBtnTxt, isFull && { color: Colors.textLight }]}>
                          {isFull ? 'الخط ممتلئ' : mySubscription ? 'تغيير لهذا الخط' : 'اشتراك'}
                        </Text>
                      </LinearGradient>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerContent: { alignItems: 'center', gap: 6, marginBottom: 14 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff' },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.55)' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  statusTxt: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  section: { padding: 16, gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 4 },

  activeCard: {
    backgroundColor: Colors.surface, borderRadius: 18,
    borderWidth: 1.5, borderColor: BUS_GREEN + '50',
    overflow: 'hidden',
  },
  activeCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  activeCardName: { flex: 1, fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
  activeCardBadge: { backgroundColor: '#68D89A30', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  activeCardBadgeTxt: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#68D89A' },
  activeCardBody: { padding: 16, gap: 12 },

  activeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  activeRowLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary, width: 60, textAlign: 'right' },
  activeRowValue: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.text, textAlign: 'right' },

  timesRow: {
    flexDirection: 'row', backgroundColor: Colors.background,
    borderRadius: 14, padding: 12, gap: 0,
  },
  timeBox: { flex: 1, alignItems: 'center', gap: 4 },
  timeDivider: { width: 1, backgroundColor: Colors.border },
  timeLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  timeValue: { fontSize: 22, fontFamily: 'Inter_700Bold', color: Colors.text },
  timeNote: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textLight },

  feeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, padding: 12,
  },
  feeLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  feeValue: { fontSize: 16, fontFamily: 'Inter_700Bold', color: BUS_GREEN },

  driverCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.background, borderRadius: 12, padding: 12,
  },
  driverAvatar: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: BUS_GREEN + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  driverLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  driverNameTxt: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.text },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BUS_GREEN, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  callBtnTxt: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },

  notesBox: { backgroundColor: Colors.background, borderRadius: 10, padding: 10 },
  notesTxt: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right' },

  unsubBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderTopWidth: 1, borderColor: Colors.border, padding: 12,
  },
  unsubTxt: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.danger },

  noSubCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderRightWidth: 4, borderRightColor: BUS_GREEN + '60',
    padding: 28, alignItems: 'center', gap: 8,
    shadowColor: BUS_GREEN, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  noSubTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text, textAlign: 'center' },
  noSubHint: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'center' },

  routeCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    borderRightWidth: 4, borderRightColor: Colors.borderLight,
    padding: 14, gap: 10,
    shadowColor: BUS_GREEN, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  routeCardActive: { borderRightColor: BUS_GREEN },
  routeCardTop: { flexDirection: 'row', alignItems: 'center' },
  routeIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  routeName: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.text },
  routeAreas: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  myRouteBadge: { backgroundColor: BUS_GREEN + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  myRouteBadgeTxt: { fontSize: 11, fontFamily: 'Inter_700Bold', color: BUS_GREEN },
  fullBadge: { backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  fullBadgeTxt: { fontSize: 11, fontFamily: 'Inter_700Bold', color: Colors.danger },

  routeSummaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  summaryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.background, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  summaryChipTxt: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },

  routeDriverRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  routeDriverTxt: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  miniCallBtn: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: BUS_GREEN + '18',
    alignItems: 'center', justifyContent: 'center',
  },

  subBtn: { borderRadius: 12, overflow: 'hidden' },
  subBtnDisabled: { opacity: 0.5 },
  subBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11 },
  subBtnTxt: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },

  unsubSmallBtn: {
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.danger,
    paddingVertical: 10, alignItems: 'center',
  },
  unsubSmallTxt: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.danger },

  noRouteCard: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    padding: 24, alignItems: 'center',
  },
  noRouteTxt: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textLight },

});
