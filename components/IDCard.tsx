import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export type IDCardPerson =
  | { type: 'employee'; id: string; name: string; role: string; level?: string; phone: string; email: string }
  | { type: 'parent'; id: string; name: string; studentName: string; studentLevel: string; phone: string };

const CARD_BASE_W = 340;
const CARD_BASE_H = 214;

const ROLE_THEME: Record<string, {
  bg: readonly [string, string, string];
  chip: readonly [string, string];
  accent: string;
  badge: string;
  roleLabel: string;
}> = {
  'إدارة':            { bg: ['#0a0e2a','#0f1540','#1a2260'] as const, chip: ['#c9a227','#f0d060'] as const, accent: '#f0d060', badge: '#c9a227', roleLabel: 'إدارة' },
  'معلمة':            { bg: ['#0d1a2e','#0f2744','#163460'] as const, chip: ['#7eb8d4','#b8ddf0'] as const, accent: '#b8ddf0', badge: '#4a9fcc', roleLabel: 'معلمة' },
  'معلم':             { bg: ['#0d1a2e','#0f2744','#163460'] as const, chip: ['#7eb8d4','#b8ddf0'] as const, accent: '#b8ddf0', badge: '#4a9fcc', roleLabel: 'معلم' },
  'مساعدة معلمة':    { bg: ['#0d1f2e','#122e40','#1a4158'] as const, chip: ['#68c4b0','#a8e8d8'] as const, accent: '#a8e8d8', badge: '#3aab92', roleLabel: 'مساعدة معلمة' },
  'إشراف':            { bg: ['#0e1a0e','#142414','#1c3a1c'] as const, chip: ['#7dcc7d','#b8f0b8'] as const, accent: '#b8f0b8', badge: '#4caf50', roleLabel: 'إشراف' },
  'مستقبلة':          { bg: ['#1a0a2a','#2a1040','#3a1860'] as const, chip: ['#c47ed4','#e8b8f0'] as const, accent: '#e8b8f0', badge: '#a855f7', roleLabel: 'مستقبلة' },
  'أخصائي':           { bg: ['#1a0a2a','#2a1040','#3a1860'] as const, chip: ['#c47ed4','#e8b8f0'] as const, accent: '#e8b8f0', badge: '#a855f7', roleLabel: 'أخصائي' },
  'ولي أمر':          { bg: ['#1a0808','#2e1010','#3d1818'] as const, chip: ['#d4936e','#f0c8a8'] as const, accent: '#f0c8a8', badge: '#c0703a', roleLabel: 'ولي أمر' },
  'default':          { bg: ['#0f0f1e','#181828','#202038'] as const, chip: ['#aaaacc','#ddddee'] as const, accent: '#ddddee', badge: '#8888aa', roleLabel: '' },
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

const YEAR = '2025 – 2026';
const SCHOOL = 'روضة أحباب الله — الخاصة';

interface Props {
  person: IDCardPerson;
  targetWidth?: number;
}

const IDCard = forwardRef<View, Props>(function IDCard(
  { person, targetWidth = Dimensions.get('window').width - 32 },
  ref
) {
  const t = getTheme(person);
  const s = targetWidth / CARD_BASE_W;
  const h = Math.round(CARD_BASE_H * s);
  const fs = (n: number) => Math.round(n * s);
  const sz = (n: number) => Math.round(n * s);

  const accessList =
    person.type === 'employee'
      ? ['الروضة', 'الاجتماعات', 'الاحتفالات']
      : ['الاجتماعات', 'الاحتفالات'];

  return (
    <View ref={ref} style={{ width: targetWidth }} collapsable={false}>
      <LinearGradient colors={t.bg} style={[card.outer, { height: h, borderRadius: sz(16) }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>

        {/* Holographic shimmer strip */}
        <LinearGradient
          colors={['transparent', t.accent + '18', t.accent + '08', 'transparent']}
          style={[card.shimmer, { height: h, borderRadius: sz(16) }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />

        {/* Dot grid watermark (top-right) */}
        <View style={[card.dotGrid, { right: sz(12), top: sz(12), opacity: 0.12 }]}>
          {[0,1,2,3,4].map(row => (
            <View key={row} style={{ flexDirection: 'row', gap: sz(5), marginBottom: sz(4) }}>
              {[0,1,2,3,4,5].map(col => (
                <View key={col} style={{ width: sz(2), height: sz(2), borderRadius: 1, backgroundColor: t.accent }} />
              ))}
            </View>
          ))}
        </View>

        {/* ── Top row: logo + school + chip ── */}
        <View style={[card.topRow, { paddingHorizontal: sz(14), paddingTop: sz(12) }]}>
          {/* Emblem */}
          <LinearGradient colors={[t.chip[0], t.chip[1]]} style={[card.emblem, { width: sz(34), height: sz(34), borderRadius: sz(8) }]}>
            <MaterialCommunityIcons name="school" size={fs(16)} color={t.bg[0]} />
          </LinearGradient>

          <View style={{ flex: 1, marginHorizontal: sz(8) }}>
            <Text style={[card.schoolName, { color: t.accent, fontSize: fs(8.5) }]}>{SCHOOL}</Text>
            <Text style={[card.schoolSub, { color: t.accent + '80', fontSize: fs(6.5) }]}>بطاقة دخول رسمية</Text>
          </View>

          {/* Chip */}
          <LinearGradient colors={[t.chip[0], t.chip[1]]} style={[card.chip, { width: sz(38), height: sz(26), borderRadius: sz(5) }]}>
            <View style={[card.chipLine, { borderColor: t.bg[0] + '60', width: sz(30), borderRadius: sz(3) }]} />
            <View style={[card.chipLineH, { borderColor: t.bg[0] + '40', height: sz(18) }]} />
          </LinearGradient>
        </View>

        {/* Separator line */}
        <View style={[card.sep, { marginHorizontal: sz(14), backgroundColor: t.accent + '25', marginTop: sz(8) }]} />

        {/* ── Middle: photo + info ── */}
        <View style={[card.midRow, { paddingHorizontal: sz(14), marginTop: sz(8), gap: sz(12) }]}>
          {/* Avatar */}
          <LinearGradient colors={[t.chip[0] + '60', t.chip[1] + '40']} style={[card.avatar, { width: sz(58), height: sz(72), borderRadius: sz(10), borderColor: t.accent + '50' }]}>
            <Text style={[card.avatarInitials, { fontSize: fs(18), color: t.accent }]}>{initials(person.name)}</Text>
            <View style={[card.avatarBar, { backgroundColor: t.badge + '80', height: sz(16) }]}>
              <MaterialCommunityIcons name={person.type === 'parent' ? 'account-child' : 'account-tie'} size={fs(10)} color="#fff" />
            </View>
          </LinearGradient>

          {/* Info */}
          <View style={{ flex: 1, justifyContent: 'center', gap: sz(3) }}>
            <Text style={[card.personName, { color: '#ffffff', fontSize: fs(13) }]}>{person.name}</Text>

            {person.type === 'employee' ? (
              <>
                <View style={[card.rolePill, { backgroundColor: t.badge + '35', borderColor: t.badge + '60' }]}>
                  <Text style={[card.roleText, { color: t.accent, fontSize: fs(9) }]}>{person.role}</Text>
                  {person.level ? <Text style={[card.levelText, { color: t.accent + 'AA', fontSize: fs(8) }]}> · {person.level}</Text> : null}
                </View>
                <Text style={[card.infoLine, { color: t.accent + '99', fontSize: fs(8) }]}>
                  <MaterialCommunityIcons name="phone" size={fs(7)} color={t.accent + '80'} />  {person.phone}
                </Text>
              </>
            ) : (
              <>
                <View style={[card.rolePill, { backgroundColor: t.badge + '35', borderColor: t.badge + '60' }]}>
                  <Text style={[card.roleText, { color: t.accent, fontSize: fs(9) }]}>ولي أمر</Text>
                </View>
                <Text style={[card.infoLine, { color: t.accent + '99', fontSize: fs(8) }]}>
                  الطالب/ة: {person.studentName}
                </Text>
                <Text style={[card.infoLine, { color: t.accent + '80', fontSize: fs(7.5) }]}>
                  {person.studentLevel}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* ── Bottom row: card number + access + year ── */}
        <View style={[card.bottomRow, { paddingHorizontal: sz(14), paddingBottom: sz(12), marginTop: sz(6) }]}>
          <View style={{ flex: 1 }}>
            <Text style={[card.cardNum, { color: t.accent + 'CC', fontSize: fs(8.5), letterSpacing: fs(1.5) }]}>
              {cardNumber(person.id)}
            </Text>
            <View style={[{ flexDirection: 'row', gap: sz(5), marginTop: sz(4) }]}>
              {accessList.map(a => (
                <View key={a} style={[card.accessBadge, { backgroundColor: t.badge + '30', borderColor: t.badge + '60', borderRadius: sz(8), paddingHorizontal: sz(5), paddingVertical: sz(2) }]}>
                  <Text style={[card.accessText, { color: t.accent + 'DD', fontSize: fs(6.5) }]}>● {a}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ alignItems: 'flex-end', gap: sz(2) }}>
            <Text style={[card.yearLbl, { color: t.accent + '60', fontSize: fs(6.5) }]}>صالحة لعام</Text>
            <Text style={[card.yearVal, { color: t.accent, fontSize: fs(8.5) }]}>{YEAR}</Text>
          </View>
        </View>

        {/* Bottom gradient accent */}
        <LinearGradient
          colors={[t.badge + '00', t.badge + '40']}
          style={[card.bottomAccent, { height: sz(4), borderRadius: sz(16) }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />
      </LinearGradient>
    </View>
  );
});

const card = StyleSheet.create({
  outer: { overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12 },
  shimmer: { position: 'absolute', left: 0, right: 0, top: 0 },
  dotGrid: { position: 'absolute' },

  topRow: { flexDirection: 'row', alignItems: 'center' },
  emblem: { alignItems: 'center', justifyContent: 'center' },
  schoolName: { fontFamily: 'Inter_700Bold', textAlign: 'right' },
  schoolSub: { fontFamily: 'Inter_400Regular', textAlign: 'right', letterSpacing: 0.5 },
  chip: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  chipLine: { borderWidth: 0.5, position: 'absolute', left: 4, right: 4, top: 4, bottom: 4 },
  chipLineH: { borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: '#00000040', position: 'absolute', left: '45%', top: 4, bottom: 4 },

  sep: { height: 0.5 },

  midRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: 'Inter_700Bold', textAlign: 'center', flex: 1, textAlignVertical: 'center', paddingTop: 4 },
  avatarBar: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },

  personName: { fontFamily: 'Inter_700Bold', textAlign: 'right' },
  rolePill: { borderWidth: 0.5, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, flexDirection: 'row', alignSelf: 'flex-start' },
  roleText: { fontFamily: 'Inter_600SemiBold' },
  levelText: { fontFamily: 'Inter_400Regular' },
  infoLine: { fontFamily: 'Inter_400Regular', textAlign: 'right' },

  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  cardNum: { fontFamily: 'Inter_500Medium', textAlign: 'right', letterSpacing: 2 },
  accessBadge: { borderWidth: 0.5 },
  accessText: { fontFamily: 'Inter_500Medium' },
  yearLbl: { fontFamily: 'Inter_400Regular' },
  yearVal: { fontFamily: 'Inter_700Bold' },

  bottomAccent: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});

export default IDCard;
