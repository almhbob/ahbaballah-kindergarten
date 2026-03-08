import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    outer: ['#6B3E08', '#A0660E', '#C89030', '#E8C060'] as const,
    inner: '#FDFAF2',
    accent: '#6B3E08',
    gold: '#A0660E',
    textColor: '#3C2005',
    lightTint: '#F8EDD0',
    label: 'شهادة تفوق وتميز',
    icon: 'star-four-points',
  },
  participation: {
    outer: ['#174E40', '#22705A', '#30947A', '#68BAA0'] as const,
    inner: '#F2FAF8',
    accent: '#174E40',
    gold: '#22705A',
    textColor: '#0D3028',
    lightTint: '#D0EDE8',
    label: 'شهادة مشاركة فعّالة',
    icon: 'hand-clap',
  },
  behavior: {
    outer: ['#1A3C1A', '#2C5E2C', '#408440', '#78B478'] as const,
    inner: '#F2FAF2',
    accent: '#1A3C1A',
    gold: '#2C5E2C',
    textColor: '#0D240D',
    lightTint: '#CEEACE',
    label: 'شهادة سلوك قويم',
    icon: 'heart-circle',
  },
  attendance: {
    outer: ['#182A4E', '#263C70', '#385494', '#6A88C0'] as const,
    inner: '#F2F5FF',
    accent: '#182A4E',
    gold: '#263C70',
    textColor: '#0E1A38',
    lightTint: '#D0DCEE',
    label: 'شهادة حضور مثالي',
    icon: 'calendar-check',
  },
  creativity: {
    outer: ['#562040', '#7C3060', '#A84C80', '#D088B0'] as const,
    inner: '#FEF2F8',
    accent: '#562040',
    gold: '#7C3060',
    textColor: '#380D28',
    lightTint: '#F0D4E4',
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
      {/* Outer gradient border */}
      <LinearGradient
        colors={t.outer}
        style={[lx.outerFrame, { borderRadius: sz(22), padding: sz(5) }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        {/* Mid decorative border */}
        <View style={[lx.midBorder, { borderRadius: sz(18), borderColor: t.lightTint, padding: sz(3) }]}>
          {/* Inner thin gold line */}
          <View style={[lx.innerBorder, { borderRadius: sz(15), borderColor: t.gold + '80', padding: sz(3) }]}>
            {/* Card body */}
            <View style={[lx.innerCard, { backgroundColor: t.inner, borderRadius: sz(12), padding: sz(18) }]}>

              {/* Corner ornaments */}
              {[
                { top: sz(8), right: sz(10), rx: false, ry: false },
                { top: sz(8), left: sz(10), rx: true, ry: false },
                { bottom: sz(8), right: sz(10), rx: false, ry: true },
                { bottom: sz(8), left: sz(10), rx: true, ry: true },
              ].map((pos, i) => (
                <Text
                  key={i}
                  style={[
                    lx.corner,
                    { color: t.gold, fontSize: fs(16) },
                    pos as any,
                    { transform: [{ scaleX: pos.rx ? -1 : 1 }, { scaleY: pos.ry ? -1 : 1 }] },
                  ]}
                >
                  ❋
                </Text>
              ))}

              {/* ─── Header ─── */}
              <View style={lx.header}>
                {/* School logo — hexagonal shape preserved */}
                <View style={[lx.logoWrap, {
                  width: sz(88), height: sz(88),
                  shadowColor: t.gold,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.6,
                  shadowRadius: sz(8),
                  elevation: 8,
                }]}>
                  {/* Soft golden glow ring */}
                  <View style={[lx.logoGlowRing, {
                    width: sz(88), height: sz(88),
                    borderColor: t.gold,
                    borderRadius: sz(6),
                  }]} />
                  <Image
                    source={require('@/assets/images/logo_new.jpg')}
                    style={{ width: sz(82), height: sz(82) }}
                    resizeMode="contain"
                  />
                </View>

                <Text style={[lx.schoolName, { color: t.accent, fontSize: fs(12) }]}>{schoolName}</Text>
                <Text style={[lx.schoolSub, { color: t.gold + 'BB', fontSize: fs(8) }]}>روضة أطفال معتمدة — السودان</Text>

                <OrnamentLine color={t.gold} scale={s} />

                <LinearGradient
                  colors={[t.outer[0], t.outer[1], t.outer[0]]}
                  style={[lx.typeBanner, { borderRadius: sz(20), paddingHorizontal: sz(20), paddingVertical: sz(6) }]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Text style={[lx.typeBannerTxt, { fontSize: fs(10) }]}>{t.label}</Text>
                </LinearGradient>
              </View>

              <OrnamentLine color={t.gold} scale={s} faint />

              {/* ─── Body ─── */}
              <View style={lx.body}>
                <Text style={[lx.basmala, { fontSize: fs(10), color: t.textColor + '88' }]}>
                  بسم الله الرحمن الرحيم
                </Text>
                <Text style={[lx.declare, { fontSize: fs(12), color: t.textColor }]}>
                  تشهد إدارة الروضة بأن
                </Text>

                {/* Recipient name box */}
                <View style={[lx.recipientBox, {
                  borderColor: t.gold,
                  backgroundColor: t.lightTint + '80',
                  borderRadius: sz(12),
                }]}>
                  <Text style={[lx.recipientName, { color: t.accent, fontSize: fs(22) }]}>
                    {cert.recipientName}
                  </Text>
                </View>

                <Text style={[lx.declare, { fontSize: fs(12), color: t.textColor }]}>
                  قد استحق / استحقت شهادة
                </Text>

                {/* Certificate title */}
                <Text style={[lx.certTitle, { color: t.gold, fontSize: fs(16) }]}>
                  {cert.title}
                </Text>

                {cert.message ? (
                  <View style={[lx.msgBox, {
                    borderColor: t.gold + '40',
                    backgroundColor: t.lightTint + '40',
                    borderRadius: sz(10),
                  }]}>
                    <Text style={[lx.msgText, { fontSize: fs(10), color: t.textColor + 'CC', lineHeight: fs(16) }]}>
                      {cert.message}
                    </Text>
                  </View>
                ) : null}
              </View>

              <OrnamentLine color={t.gold} scale={s} faint />

              {/* ─── Footer ─── */}
              <View style={lx.footer}>
                {/* Stamp / seal */}
                <View style={[lx.seal, {
                  borderColor: t.gold,
                  width: sz(58), height: sz(58), borderRadius: sz(29),
                }]}>
                  <View style={[lx.sealInner, {
                    borderColor: t.gold + '60',
                    width: sz(46), height: sz(46), borderRadius: sz(23),
                  }]}>
                    <Text style={[lx.sealTxt1, { fontSize: fs(6.5), color: t.accent }]}>روضة</Text>
                    <Text style={[lx.sealTxt2, { fontSize: fs(6), color: t.gold }]}>أحباب الله</Text>
                    <Text style={[{ fontSize: fs(8), color: t.gold, marginTop: 1 }]}>✦</Text>
                  </View>
                </View>

                {/* Date */}
                <View style={lx.dateBox}>
                  <Text style={[lx.dateVal, { color: t.gold, fontSize: fs(12) }]}>{cert.date}</Text>
                  <Text style={[lx.dateLbl, { color: t.textColor + '77', fontSize: fs(8) }]}>تاريخ الإصدار</Text>
                </View>

                {/* Signature */}
                <View style={lx.sigBox}>
                  <View style={[lx.sigLine, { borderColor: t.gold + '70', width: sz(90) }]} />
                  <Text style={[lx.sigName, { color: t.textColor, fontSize: fs(8.5) }]}>{principalName}</Text>
                  <Text style={[lx.sigRole, { color: t.textColor + '66', fontSize: fs(7.5) }]}>مديرة الروضة</Text>
                </View>
              </View>

              {/* Tagline */}
              <Text style={[lx.tagline, { color: t.gold + '80', fontSize: fs(7.5) }]}>
                ✦ هذه الشهادة معتمدة من إدارة روضة أحباب الله ✦
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});

function OrnamentLine({ color, scale, faint }: { color: string; scale: number; faint?: boolean }) {
  const op = faint ? 0.35 : 0.75;
  const sz = (n: number) => Math.round(n * scale);
  return (
    <View style={[lx.ornRow, { opacity: op, marginVertical: sz(7) }]}>
      <View style={[lx.ornLine, { backgroundColor: color }]} />
      <Text style={{ color, fontSize: sz(11), marginHorizontal: sz(3) }}>✦</Text>
      <Text style={{ color, fontSize: sz(7), marginHorizontal: sz(1) }}>◆</Text>
      <Text style={{ color, fontSize: sz(11), marginHorizontal: sz(3) }}>✦</Text>
      <View style={[lx.ornLine, { backgroundColor: color }]} />
    </View>
  );
}

const lx = StyleSheet.create({
  outerFrame: {},
  midBorder: { borderWidth: 1.5 },
  innerBorder: { borderWidth: 1 },
  innerCard: { alignItems: 'center', overflow: 'hidden' },
  corner: { position: 'absolute' },

  header: { alignItems: 'center', width: '100%', marginBottom: 4 },
  logoWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 10, position: 'relative' },
  logoGlowRing: { position: 'absolute', borderWidth: 1.5, top: 0, left: 0 },
  schoolName: { fontFamily: 'Inter_700Bold', textAlign: 'center', letterSpacing: 0.4, marginBottom: 2 },
  schoolSub: { fontFamily: 'Inter_400Regular', textAlign: 'center', letterSpacing: 0.8, marginBottom: 8 },
  typeBanner: {},
  typeBannerTxt: { fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 0.6 },

  ornRow: { flexDirection: 'row', alignItems: 'center', width: '80%' },
  ornLine: { flex: 1, height: 0.8 },

  body: { alignItems: 'center', width: '100%', gap: 7 },
  basmala: { fontFamily: 'Inter_400Regular', textAlign: 'center' },
  declare: { fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  recipientBox: { borderWidth: 1.5, paddingHorizontal: 24, paddingVertical: 10, minWidth: '65%', alignItems: 'center' },
  recipientName: { fontFamily: 'Inter_700Bold', textAlign: 'center' },
  certTitle: { fontFamily: 'Inter_700Bold', textAlign: 'center' },
  msgBox: { borderWidth: 1, padding: 10, width: '90%', alignItems: 'center' },
  msgText: { fontFamily: 'Inter_400Regular', textAlign: 'center' },

  footer: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  seal: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  sealInner: { borderWidth: 1, borderStyle: 'dotted', alignItems: 'center', justifyContent: 'center' },
  sealTxt1: { fontFamily: 'Inter_700Bold', textAlign: 'center' },
  sealTxt2: { fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  dateBox: { alignItems: 'center' },
  dateVal: { fontFamily: 'Inter_700Bold' },
  dateLbl: { fontFamily: 'Inter_400Regular' },
  sigBox: { alignItems: 'flex-start' },
  sigLine: { borderBottomWidth: 1, marginBottom: 4 },
  sigName: { fontFamily: 'Inter_600SemiBold' },
  sigRole: { fontFamily: 'Inter_400Regular' },

  tagline: { fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 8, letterSpacing: 0.6 },
});

export default CertificateLuxury;
