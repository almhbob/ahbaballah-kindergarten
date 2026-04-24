import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

export type IDCardPerson =
  | { type: 'employee'; id: string; name: string; role: string; level?: string; phone: string; email: string }
  | { type: 'parent'; id: string; name: string; studentName: string; studentLevel: string; phone: string };

export interface IDCardOverride {
  accessList?: string[];
  year?: string;
  note?: string;
}

const CARD_BASE_W = 340;
const CARD_BASE_H = 214;

const ROLE_THEME: Record<string, {
  bg: readonly [string, string, string];
  stripe: readonly [string, string];
  accent: string;
  badge: string;
}> = {
  'إدارة':          { bg: ['#0C2418', '#163424', '#204C34'] as const, stripe: ['#B08818', '#D4AC3A'] as const, accent: '#D4AC3A', badge: '#B08818' },
  'معلمة':          { bg: ['#0C1E30', '#142C46', '#1C3C5C'] as const, stripe: ['#3A9EBC', '#68C0D8'] as const, accent: '#68C0D8', badge: '#3A9EBC' },
  'معلم':           { bg: ['#0C1E30', '#142C46', '#1C3C5C'] as const, stripe: ['#3A9EBC', '#68C0D8'] as const, accent: '#68C0D8', badge: '#3A9EBC' },
  'مساعدة معلمة':  { bg: ['#0C2420', '#143430', '#1C4840'] as const, stripe: ['#38A890', '#60C8B0'] as const, accent: '#60C8B0', badge: '#38A890' },
  'إشراف':          { bg: ['#162410', '#20381A', '#2C4C22'] as const, stripe: ['#72A83A', '#9CC860'] as const, accent: '#9CC860', badge: '#72A83A' },
  'مستقبلة':        { bg: ['#1C1030', '#2A1848', '#382460'] as const, stripe: ['#9068C8', '#B898E0'] as const, accent: '#B898E0', badge: '#9068C8' },
  'أخصائي':         { bg: ['#1C1030', '#2A1848', '#382460'] as const, stripe: ['#9068C8', '#B898E0'] as const, accent: '#B898E0', badge: '#9068C8' },
  'ولي أمر':        { bg: ['#281410', '#3C1C14', '#50281C'] as const, stripe: ['#C08858', '#DCB080'] as const, accent: '#DCB080', badge: '#C08858' },
  'default':        { bg: ['#141420', '#1E1E2C', '#282838'] as const, stripe: ['#9090B0', '#C0C0D8'] as const, accent: '#C0C0D8', badge: '#9090B0' },
};

function getTheme(person: IDCardPerson) {
  if (person.type === 'parent') return ROLE_THEME['ولي أمر'];
  return ROLE_THEME[person.role] ?? ROLE_THEME['default'];
}

function cardNumber(id: string) {
  const h = id.replace(/\D/g, '').padEnd(12, '0').slice(0, 12);
  return `${h.slice(0,4)}  ${h.slice(4,8)}  ${h.slice(8,12)}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return name.slice(0, 2);
}

const DEFAULT_YEAR = '2025 – 2026';
const SCHOOL = 'نظم إدارة رياض الأطفال — الخاصة';
const DEFAULT_ACCESS_EMPLOYEE = ['الروضة', 'الاجتماعات', 'الاحتفالات'];
const DEFAULT_ACCESS_PARENT = ['الاجتماعات', 'الاحتفالات'];

interface Props {
  person: IDCardPerson;
  targetWidth?: number;
  override?: IDCardOverride;
}

const IDCard = forwardRef<View, Props>(function IDCard(
  { person, targetWidth = Dimensions.get('window').width - 32, override },
  ref
) {
  const t = getTheme(person);
  const s = targetWidth / CARD_BASE_W;
  const h = Math.round(CARD_BASE_H * s);
  const fs = (n: number) => Math.round(n * s);
  const sz = (n: number) => Math.round(n * s);

  const accessList = override?.accessList ??
    (person.type === 'employee' ? DEFAULT_ACCESS_EMPLOYEE : DEFAULT_ACCESS_PARENT);
  const year = override?.year ?? DEFAULT_YEAR;
  const note = override?.note;

  return (
    <View ref={ref} style={{ width: targetWidth }} collapsable={false}>
      <LinearGradient
        colors={t.bg}
        style={[card.outer, { height: h, borderRadius: sz(14) }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        {/* Top colour stripe */}
        <LinearGradient
          colors={[t.stripe[0], t.stripe[1], t.stripe[0]]}
          style={[card.topStripe, { height: sz(5), borderTopLeftRadius: sz(14), borderTopRightRadius: sz(14) }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />

        {/* Subtle diagonal shimmer */}
        <LinearGradient
          colors={['transparent', t.accent + '0C', 'transparent']}
          style={[card.shimmer, { height: h }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />

        {/* Dot watermark */}
        <View style={[card.dotGrid, { right: sz(10), top: sz(14) }]}>
          {[0,1,2,3].map(row => (
            <View key={row} style={{ flexDirection: 'row', gap: sz(5), marginBottom: sz(4) }}>
              {[0,1,2,3,4].map(col => (
                <View key={col} style={{ width: sz(2), height: sz(2), borderRadius: 1, backgroundColor: t.accent, opacity: 0.10 }} />
              ))}
            </View>
          ))}
        </View>

        {/* ── Header row: logo + school name + chip ── */}
        <View style={[card.headerRow, { paddingHorizontal: sz(14), paddingTop: sz(10) }]}>
          {/* School logo */}
          <LinearGradient
            colors={[t.stripe[0], t.stripe[1]]}
            style={[card.logoRing, { width: sz(36), height: sz(36), borderRadius: sz(8), padding: sz(2) }]}
          >
            <Image
              source={require('@/assets/images/logo_main.png')}
              style={{ width: sz(32), height: sz(32), borderRadius: sz(6) }}
              resizeMode="cover"
            />
          </LinearGradient>

          <View style={{ flex: 1, marginHorizontal: sz(8) }}>
            <Text style={[card.schoolName, { color: t.accent, fontSize: fs(8.5) }]}>{SCHOOL}</Text>
            <Text style={[card.schoolSub, { color: t.accent + '70', fontSize: fs(6.5) }]}>بطاقة دخول رسمية</Text>
          </View>

          {/* SIM chip */}
          <LinearGradient
            colors={[t.stripe[0], t.stripe[1]]}
            style={[card.chip, { width: sz(36), height: sz(24), borderRadius: sz(5) }]}
          >
            <View style={[card.chipInner, { borderColor: t.bg[0] + '50', width: sz(28), height: sz(16), borderRadius: sz(3) }]} />
            <View style={[card.chipBar, { borderColor: t.bg[0] + '40', height: sz(14) }]} />
          </LinearGradient>
        </View>

        {/* Thin separator */}
        <View style={[card.sep, { marginHorizontal: sz(14), marginTop: sz(6), backgroundColor: t.accent + '20' }]} />

        {/* ── Middle: avatar + info ── */}
        <View style={[card.midRow, { paddingHorizontal: sz(14), marginTop: sz(8), gap: sz(12) }]}>
          {/* Avatar block */}
          <View style={[card.avatarWrap, { width: sz(56), height: sz(68), borderRadius: sz(10), borderColor: t.accent + '40' }]}>
            <LinearGradient
              colors={[t.stripe[0] + '50', t.stripe[1] + '30']}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: sz(9) }}
            >
              <Text style={[card.avatarLetters, { fontSize: fs(17), color: t.accent }]}>
                {initials(person.name)}
              </Text>
            </LinearGradient>
            <LinearGradient
              colors={[t.badge + '90', t.badge]}
              style={[card.avatarRole, { height: sz(16) }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons
                name={person.type === 'parent' ? 'account-child' : 'account-tie'}
                size={fs(9)} color="#fff"
              />
            </LinearGradient>
          </View>

          {/* Text info */}
          <View style={{ flex: 1, gap: sz(3), justifyContent: 'center' }}>
            <Text style={[card.personName, { color: '#F0F0F0', fontSize: fs(13) }]} numberOfLines={1}>
              {person.name}
            </Text>

            <View style={[card.rolePill, { backgroundColor: t.badge + '30', borderColor: t.badge + '55' }]}>
              {person.type === 'employee' ? (
                <Text style={[card.roleText, { color: t.accent, fontSize: fs(8.5) }]}>
                  {person.role}{person.level ? `  ·  ${person.level}` : ''}
                </Text>
              ) : (
                <Text style={[card.roleText, { color: t.accent, fontSize: fs(8.5) }]}>ولي أمر</Text>
              )}
            </View>

            {person.type === 'employee' ? (
              <Text style={[card.infoLine, { color: t.accent + '88', fontSize: fs(7.5) }]}>
                📞  {person.phone}
              </Text>
            ) : (
              <>
                <Text style={[card.infoLine, { color: t.accent + '88', fontSize: fs(7.5) }]}>
                  الطالب/ة: {person.studentName}
                </Text>
                <Text style={[card.infoLine, { color: t.accent + '66', fontSize: fs(7) }]}>
                  {person.studentLevel}
                </Text>
              </>
            )}

            {note ? (
              <Text style={[card.infoLine, { color: t.accent + '77', fontSize: fs(7), fontStyle: 'italic' }]} numberOfLines={1}>
                ملاحظة: {note}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── Footer: card number + access + year ── */}
        <View style={[card.footerRow, { paddingHorizontal: sz(14), paddingBottom: sz(10), marginTop: sz(6) }]}>
          <View style={{ flex: 1 }}>
            <Text style={[card.cardNum, { color: t.accent + 'BB', fontSize: fs(8), letterSpacing: fs(1.2) }]}>
              {cardNumber(person.id)}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sz(4), marginTop: sz(3) }}>
              {accessList.map(a => (
                <View
                  key={a}
                  style={[card.accessChip, {
                    backgroundColor: t.badge + '28',
                    borderColor: t.badge + '55',
                    borderRadius: sz(7),
                    paddingHorizontal: sz(5), paddingVertical: sz(1.5),
                  }]}
                >
                  <Text style={[card.accessText, { color: t.accent + 'DD', fontSize: fs(6) }]}>● {a}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ alignItems: 'flex-end', gap: sz(4) }}>
            <View style={{ backgroundColor: '#fff', borderRadius: sz(4), padding: sz(3) }}>
              <QRCode
                value={`ahbaballah:${person.type}:${person.id}:${person.name}`}
                size={sz(38)}
                color="#000"
                backgroundColor="#fff"
              />
            </View>
            <Text style={[card.yearVal, { color: t.accent, fontSize: fs(7), textAlign: 'center' }]}>{year}</Text>
          </View>
        </View>

        {/* Bottom accent stripe */}
        <LinearGradient
          colors={[t.badge + '00', t.badge + '50', t.badge + '00']}
          style={[card.bottomStripe, { height: sz(3) }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />
      </LinearGradient>
    </View>
  );
});

const card = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  topStripe: { position: 'absolute', left: 0, right: 0, top: 0 },
  shimmer: { position: 'absolute', left: 0, right: 0, top: 0 },
  dotGrid: { position: 'absolute' },

  headerRow: { flexDirection: 'row', alignItems: 'center' },
  logoRing: { alignItems: 'center', justifyContent: 'center' },
  schoolName: { fontFamily: 'Inter_700Bold', textAlign: 'right' },
  schoolSub: { fontFamily: 'Inter_400Regular', textAlign: 'right' },
  chip: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  chipInner: { borderWidth: 0.5, position: 'absolute' },
  chipBar: { borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: '#00000030', position: 'absolute', left: '42%', top: 4, bottom: 4 },

  sep: { height: 0.5 },

  midRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarWrap: { borderWidth: 1, overflow: 'hidden' },
  avatarLetters: { fontFamily: 'Inter_700Bold', textAlign: 'center' },
  avatarRole: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },

  personName: { fontFamily: 'Inter_700Bold', textAlign: 'right' },
  rolePill: { borderWidth: 0.5, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  roleText: { fontFamily: 'Inter_600SemiBold' },
  infoLine: { fontFamily: 'Inter_400Regular', textAlign: 'right' },

  footerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  cardNum: { fontFamily: 'Inter_500Medium', letterSpacing: 2 },
  accessChip: { borderWidth: 0.5 },
  accessText: { fontFamily: 'Inter_500Medium' },
  yearLabel: { fontFamily: 'Inter_400Regular' },
  yearVal: { fontFamily: 'Inter_700Bold' },

  bottomStripe: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});

export default IDCard;
