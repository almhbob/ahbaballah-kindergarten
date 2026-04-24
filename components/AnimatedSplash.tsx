import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Easing, Platform, Image,
} from 'react-native';
import Svg, { Polygon, Circle, Defs, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import * as Haptics from 'expo-haptics';

const { width: W, height: H } = Dimensions.get('window');
const ACCENT = '#C9952A';
const ACCENT2 = '#F0B93A';

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const HEX_GRID = (() => {
  const items: { cx: number; cy: number; r: number; opacity: number }[] = [];
  const r = 36; const rh = r * Math.sqrt(3);
  const cols = Math.ceil(W / rh) + 2;
  const rows = Math.ceil(H / (r * 1.5)) + 2;
  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const cx = col * rh + (row % 2 === 0 ? rh / 2 : 0);
      const cy = row * r * 1.5;
      const dist = Math.hypot(cx - W / 2, cy - H / 2) / Math.max(W, H);
      const opacity = Math.max(0.025, 0.12 - dist * 0.22);
      items.push({ cx, cy, r: r - 3, opacity });
    }
  }
  return items;
})();

interface Props {
  onDone: () => void;
}

export default function AnimatedSplash({ onDone }: Props) {
  const bgOpacity    = useRef(new Animated.Value(0)).current;
  const gridOpacity  = useRef(new Animated.Value(0)).current;
  const gridScale    = useRef(new Animated.Value(1.12)).current;
  const logoScale    = useRef(new Animated.Value(0.4)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const glowRadius   = useRef(new Animated.Value(0)).current;
  const shimmer      = useRef(new Animated.Value(-W)).current;
  const titleY       = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const tag1X        = useRef(new Animated.Value(40)).current;
  const tag1O        = useRef(new Animated.Value(0)).current;
  const tag2X        = useRef(new Animated.Value(40)).current;
  const tag2O        = useRef(new Animated.Value(0)).current;
  const tag3X        = useRef(new Animated.Value(40)).current;
  const tag3O        = useRef(new Animated.Value(0)).current;
  const exitOpacity  = useRef(new Animated.Value(1)).current;

  const ease = Easing.out(Easing.cubic);

  useEffect(() => {
    const seq = Animated.sequence([
      // 1. Background fades in
      Animated.parallel([
        Animated.timing(bgOpacity,   { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(gridOpacity, { toValue: 1, duration: 600, useNativeDriver: true, easing: ease }),
        Animated.timing(gridScale,   { toValue: 1, duration: 900, useNativeDriver: true, easing: ease }),
      ]),
      // 2. Logo pops in
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, tension: 180, friction: 9, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(glowRadius,  { toValue: 1, duration: 700, useNativeDriver: true, easing: ease }),
      ]),
      // 3. Shimmer sweep
      Animated.timing(shimmer, { toValue: W * 1.5, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      // 4. Title slides in
      Animated.parallel([
        Animated.timing(titleY,       { toValue: 0, duration: 450, useNativeDriver: true, easing: ease }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      // 5. Taglines staggered
      Animated.stagger(120, [
        Animated.parallel([
          Animated.timing(tag1X, { toValue: 0, duration: 380, useNativeDriver: true, easing: ease }),
          Animated.timing(tag1O, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(tag2X, { toValue: 0, duration: 380, useNativeDriver: true, easing: ease }),
          Animated.timing(tag2O, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(tag3X, { toValue: 0, duration: 380, useNativeDriver: true, easing: ease }),
          Animated.timing(tag3O, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      ]),
      // 6. Hold
      Animated.delay(900),
      // 7. Exit fade
      Animated.timing(exitOpacity, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
    ]);

    seq.start(({ finished }) => { if (finished) onDone(); });

    if (Platform.OS !== 'web') {
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 350);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 750);
    }

    return () => seq.stop();
  }, []);

  const glowSize = glowRadius.interpolate({ inputRange: [0, 1], outputRange: [80, 140] });

  return (
    <Animated.View style={[sty.root, { opacity: exitOpacity }]}>
      <Animated.View style={[sty.bg, { opacity: bgOpacity }]} />

      {/* Hexagonal Grid Background */}
      <Animated.View style={[
        StyleSheet.absoluteFill,
        { opacity: gridOpacity, transform: [{ scale: gridScale }] },
      ]}>
        <Svg width={W} height={H}>
          <Defs>
            <RadialGradient id="radGrad" cx="50%" cy="45%" rx="55%" ry="55%">
              <Stop offset="0%"   stopColor="#1a2a8a" stopOpacity="0.0" />
              <Stop offset="70%"  stopColor="#030612" stopOpacity="0.0" />
              <Stop offset="100%" stopColor="#000"    stopOpacity="0.6" />
            </RadialGradient>
          </Defs>
          {HEX_GRID.map((h, i) => (
            <Polygon
              key={i}
              points={hexPoints(h.cx, h.cy, h.r)}
              stroke={ACCENT}
              strokeWidth="0.7"
              fill="none"
              opacity={h.opacity}
            />
          ))}
          <Polygon points={`0,0 ${W},0 ${W},${H} 0,${H}`} fill="url(#radGrad)" />
        </Svg>
      </Animated.View>

      {/* Glow halo behind logo */}
      <Animated.View style={[sty.glow, { width: glowSize, height: glowSize, borderRadius: 200 }]} />

      {/* Logo Hex */}
      <Animated.View style={[sty.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        <Svg width={120} height={120} viewBox="0 0 120 120" style={sty.hexSvg}>
          <Defs>
            <SvgLinearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor="#1a2f9e" />
              <Stop offset="100%" stopColor="#0a0e4a" />
            </SvgLinearGradient>
            <SvgLinearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor={ACCENT2} />
              <Stop offset="100%" stopColor={ACCENT} />
            </SvgLinearGradient>
          </Defs>
          <Polygon points={hexPoints(60, 60, 55)} fill="url(#hexGrad)" stroke="url(#strokeGrad)" strokeWidth="2.5" />
          <Polygon points={hexPoints(60, 60, 48)} fill="none" stroke={ACCENT} strokeWidth="0.8" opacity={0.4} />
        </Svg>
        <Image
          source={require('@/assets/images/logo_main.png')}
          style={sty.logoImg}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Shimmer overlay */}
      <Animated.View style={[sty.shimmer, { transform: [{ translateX: shimmer }] }]} />

      {/* School name */}
      <Animated.Text style={[sty.schoolName, { transform: [{ translateY: titleY }], opacity: titleOpacity }]}>
        نظم إدارة رياض الأطفال
      </Animated.Text>
      <Animated.Text style={[sty.schoolSub, { opacity: titleOpacity }]}>
        صفيتة الغنوماب
      </Animated.Text>

      {/* Taglines staggered */}
      <View style={sty.tagsRow}>
        {([
          { anim: tag1X, opacity: tag1O, label: 'تميّز', icon: '✨' },
          { anim: tag2X, opacity: tag2O, label: 'التزام', icon: '🤝' },
          { anim: tag3X, opacity: tag3O, label: 'جودة',  icon: '🏆' },
        ] as const).map((t, i) => (
          <Animated.View key={i} style={[sty.tagChip, { transform: [{ translateX: t.anim }], opacity: t.opacity }]}>
            <Text style={sty.tagIcon}>{t.icon}</Text>
            <Text style={sty.tagLabel}>{t.label}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Bottom slogan */}
      <Animated.Text style={[sty.slogan, { opacity: titleOpacity }]}>
        نبني جيلاً واثقاً ومبدعاً
      </Animated.Text>
    </Animated.View>
  );
}

const sty = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#030612',
  },
  glow: {
    position: 'absolute',
    backgroundColor: ACCENT,
    opacity: 0.18,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 60,
    elevation: 20,
  },
  shimmer: {
    position: 'absolute',
    width: 80,
    height: H * 0.6,
    backgroundColor: 'rgba(255,215,0,0.13)',
    transform: [{ rotate: '12deg' }],
    top: H * 0.2,
    zIndex: 10,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  hexSvg: {
    position: 'absolute',
  },
  logoImg: {
    width: 104,
    height: 104,
    borderRadius: 8,
  },
  schoolName: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 16,
    textShadowColor: ACCENT,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  schoolSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 28,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(201,149,42,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201,149,42,0.4)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tagIcon: { fontSize: 14 },
  tagLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: ACCENT2,
  },
  slogan: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
