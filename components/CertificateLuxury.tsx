import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Certificate, CertificateTemplate } from '@/contexts/AppDataContext';

const BASE_W = 340;

export const LUXURY_THEMES: Record<CertificateTemplate, {
  outer: readonly [string, string, string, string];
  inner: string;
  accent: string;
  gold: string;
  textColor: string;
  lightTint: string;
  label: string;
  icon: string;
}> = {
  excellence: {
    outer: ['#5c2800', '#92400e', '#d97706', '#fcd34d'] as const,
    inner: '#fffef0',
    accent: '#78350f',
    gold: '#b45309',
    textColor: '#3c1a00',
    lightTint: '#fef3c7',
    label: 'شهادة تفوق وتميز',
    icon: 'star-four-points',
  },
  participation: {
    outer: ['#0a1628', '#1e3a8a', '#2563eb', '#93c5fd'] as const,
    inner: '#f0f7ff',
    accent: '#1e3a8a',
    gold: '#2563eb',
    textColor: '#0c1a3a',
    lightTint: '#dbeafe',
    label: 'شهادة مشاركة فعّالة',
    icon: 'hand-clap',
  },
  behavior: {
    outer: ['#022c16', '#064e3b', '#047857', '#6ee7b7'] as const,
    inner: '#f0fdf7',
    accent: '#064e3b',
    gold: '#059669',
    textColor: '#022c16',
    lightTint: '#d1fae5',
    label: 'شهادة سلوك قويم',
    icon: 'heart-circle',
  },
  attendance: {
    outer: ['#1e0a3c', '#4c1d95', '#6d28d9', '#c4b5fd'] as const,
    inner: '#faf8ff',
    accent: '#3b0764',
    gold: '#7c3aed',
    textColor: '#1e0a3c',
    lightTint: '#ede9fe',
    label: 'شهادة حضور مثالي',
    icon: 'calendar-check',
  },
  creativity: {
    outer: ['#3d0018', '#831843', '#be185d', '#f9a8d4'] as const,
    inner: '#fff5fb',
    accent: '#831843',
    gold: '#be185d',
    textColor: '#3d0018',
    lightTint: '#fce7f3',
    label: 'شهادة إبداع وتميز',
    icon: 'palette',
  },
};

interface Props {
  cert: Certificate;
  schoolName?: string;
  principalName?: string;
  targetWidth?: number;
}

const CertificateLuxury = forwardRef<View, Props>(function CertificateLuxury(
  {
    cert,
    schoolName = 'روضة أحباب الله — الخاصة',
    principalName = 'أ. سلوى أحمد داموس',
    targetWidth = Dimensions.get('window').width - 32,
  },
  ref
) {
  const t = LUXURY_THEMES[cert.template];
  const s = targetWidth / BASE_W;

  const fs = (n: number) => Math.round(n * s);
  const sz = (n: number) => Math.round(n * s);

  return (
    <View ref={ref} style={{ width: targetWidth }} collapsable={false}>
      <LinearGradient colors={t.outer} style={[lx.outerFrame, { borderRadius: sz(22), padding: sz(5) }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={[lx.midBorder, { borderRadius: sz(18), borderColor: t.lightTint + 'CC', padding: sz(4) }]}>
          <View style={[lx.innerBorder, { borderRadius: sz(15), borderColor: t.gold + '60', padding: sz(3) }]}>
            <View style={[lx.innerCard, { backgroundColor: t.inner, borderRadius: sz(12), padding: sz(18) }]}>

              {/* Corner ornaments */}
              {[
                { top: sz(8), right: sz(10), rx: false, ry: false },
                { top: sz(8), left: sz(10), rx: true, ry: false },
                { bottom: sz(8), right: sz(10), rx: false, ry: true },
                { bottom: sz(8), left: sz(10), rx: true, ry: true },
              ].map((pos, i) => (
                <Text key={i} style={[lx.corner, { color: t.gold, fontSize: fs(16) }, pos as any,
                  { transform: [{ scaleX: pos.rx ? -1 : 1 }, { scaleY: pos.ry ? -1 : 1 }] }]}>
                  ❋
                </Text>
              ))}

              {/* ─── Header ─── */}
              <View style={lx.header}>
                <LinearGradient colors={[t.accent, t.gold, t.accent]} style={[lx.emblem, { width: sz(76), height: sz(76), borderRadius: sz(38), padding: sz(3) }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Image
                    source={require('@/assets/images/logo_new.jpg')}
                    style={{ width: sz(70), height: sz(70), borderRadius: sz(35) }}
                    resizeMode="cover"
                  />
                </LinearGradient>

                <Text style={[lx.schoolName, { color: t.accent, fontSize: fs(11) }]}>{schoolName}</Text>
                <Text style={[lx.schoolSub, { color: t.gold, fontSize: fs(8) }]}>روضة أطفال معتمدة</Text>

                <OrnamentRow color={t.gold} scale={s} />

                <LinearGradient colors={[t.accent, t.gold, t.accent]} style={[lx.banner, { borderRadius: sz(20), paddingHorizontal: sz(18), paddingVertical: sz(5) }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={[lx.bannerTxt, { fontSize: fs(10) }]}>{t.label}</Text>
                </LinearGradient>
              </View>

              <OrnamentRow color={t.gold} scale={s} faint />

              {/* ─── Body ─── */}
              <View style={lx.body}>
                <Text style={[lx.declareSmall, { fontSize: fs(10), color: t.textColor + 'AA' }]}>
                  بسم الله الرحمن الرحيم
                </Text>
                <Text style={[lx.declare, { fontSize: fs(12), color: t.textColor }]}>
                  تُشهد إدارة الروضة بأن
                </Text>

                <View style={[lx.recipientBox, { borderColor: t.gold, backgroundColor: t.lightTint + '60', borderRadius: sz(12) }]}>
                  <Text style={[lx.recipientName, { color: t.accent, fontSize: fs(22) }]}>
                    {cert.recipientName}
                  </Text>
                </View>

                <Text style={[lx.declare, { fontSize: fs(12), color: t.textColor }]}>
                  قد استحق / استحقت
                </Text>

                <Text style={[lx.certTitle, { color: t.gold, fontSize: fs(16) }]}>
                  {cert.title}
                </Text>

                {cert.message ? (
                  <View style={[lx.msgBox, { borderColor: t.gold + '30', backgroundColor: t.lightTint + '30', borderRadius: sz(10) }]}>
                    <Text style={[lx.msgText, { fontSize: fs(9.5), color: t.textColor + 'BB', lineHeight: fs(15) }]}>
                      {cert.message}
                    </Text>
                  </View>
                ) : null}
              </View>

              <OrnamentRow color={t.gold} scale={s} faint />

              {/* ─── Footer ─── */}
              <View style={lx.footer}>
                <View style={[lx.seal, { borderColor: t.gold, width: sz(60), height: sz(60), borderRadius: sz(30) }]}>
                  <View style={[lx.sealInner, { borderColor: t.gold + '50', width: sz(50), height: sz(50), borderRadius: sz(25) }]}>
                    <Text style={[lx.sealLine1, { fontSize: fs(7), color: t.accent }]}>روضة</Text>
                    <Text style={[lx.sealLine2, { fontSize: fs(6), color: t.gold }]}>أحباب الله</Text>
                    <MaterialCommunityIcons name="seal" size={fs(10)} color={t.gold} style={{ marginTop: 1 }} />
                  </View>
                </View>

                <View style={lx.dateCenter}>
                  <Text style={[lx.dateVal, { fontSize: fs(12), color: t.gold }]}>{cert.date}</Text>
                  <Text style={[lx.dateLbl, { fontSize: fs(8), color: t.textColor + '88' }]}>تاريخ الإصدار</Text>
                </View>

                <View style={lx.sigArea}>
                  <View style={[lx.sigLine, { borderColor: t.gold + '80', width: sz(85) }]} />
                  <Text style={[lx.sigName, { fontSize: fs(8), color: t.textColor }]}>{principalName}</Text>
                  <Text style={[lx.sigRole, { fontSize: fs(7.5), color: t.textColor + '70' }]}>مديرة الروضة</Text>
                </View>
              </View>

              {/* Bottom tagline */}
              <Text style={[lx.tagline, { fontSize: fs(7.5), color: t.gold + '70' }]}>
                ✦ هذه الشهادة معتمدة من إدارة الروضة ✦
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});

function OrnamentRow({ color, scale, faint }: { color: string; scale: number; faint?: boolean }) {
  const opacity = faint ? 0.4 : 0.8;
  return (
    <View style={[lx.ornRow, { opacity, marginVertical: Math.round(6 * scale) }]}>
      <View style={[lx.ornLine, { backgroundColor: color }]} />
      <Text style={{ color, fontSize: Math.round(10 * scale) }}>✦</Text>
      <Text style={{ color, fontSize: Math.round(7 * scale), marginHorizontal: 1 }}>✧</Text>
      <Text style={{ color, fontSize: Math.round(10 * scale) }}>✦</Text>
      <View style={[lx.ornLine, { backgroundColor: color }]} />
    </View>
  );
}

const lx = StyleSheet.create({
  outerFrame: {},
  midBorder: { borderWidth: 1 },
  innerBorder: { borderWidth: 1.5 },
  innerCard: { alignItems: 'center', overflow: 'hidden' },
  corner: { position: 'absolute' },

  header: { alignItems: 'center', width: '100%', marginBottom: 4 },
  emblem: { justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emblemInner: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  schoolName: { fontFamily: 'Inter_700Bold', textAlign: 'center', letterSpacing: 0.3, marginBottom: 2 },
  schoolSub: { fontFamily: 'Inter_400Regular', textAlign: 'center', letterSpacing: 1, marginBottom: 6 },
  banner: {},
  bannerTxt: { fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.5 },

  ornRow: { flexDirection: 'row', alignItems: 'center', width: '75%', gap: 4 },
  ornLine: { flex: 1, height: 1 },

  body: { alignItems: 'center', width: '100%', gap: 6 },
  declareSmall: { fontFamily: 'Inter_400Regular', textAlign: 'center' },
  declare: { fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  recipientBox: { borderWidth: 2, paddingHorizontal: 24, paddingVertical: 8, minWidth: '65%', alignItems: 'center' },
  recipientName: { fontFamily: 'Inter_700Bold', textAlign: 'center' },
  certTitle: { fontFamily: 'Inter_700Bold', textAlign: 'center' },
  msgBox: { borderWidth: 1, padding: 8, width: '90%', alignItems: 'center' },
  msgText: { fontFamily: 'Inter_400Regular', textAlign: 'center' },

  footer: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  seal: { borderWidth: 2, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  sealInner: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderStyle: 'dotted' },
  sealLine1: { fontFamily: 'Inter_700Bold', textAlign: 'center' },
  sealLine2: { fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  dateCenter: { alignItems: 'center' },
  dateVal: { fontFamily: 'Inter_700Bold' },
  dateLbl: { fontFamily: 'Inter_400Regular' },
  sigArea: { alignItems: 'flex-start' },
  sigLine: { borderBottomWidth: 1, marginBottom: 4 },
  sigName: { fontFamily: 'Inter_600SemiBold' },
  sigRole: { fontFamily: 'Inter_400Regular' },

  tagline: { fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8, letterSpacing: 0.5 },
});

export default CertificateLuxury;
