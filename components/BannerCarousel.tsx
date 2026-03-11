import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData, Banner } from '@/contexts/AppDataContext';

const { width: SCREEN_W } = Dimensions.get('window');

const BANNER_COLORS: Record<string, { bg: string; text: string; icon: string; emoji: string }> = {
  offer:  { bg: '#ECFDF5', text: '#065F46', icon: 'gift-outline',     emoji: '🎁' },
  alert:  { bg: '#FEF2F2', text: '#991B1B', icon: 'warning-outline',  emoji: '⚠️' },
  event:  { bg: '#EFF6FF', text: '#1E3A8A', icon: 'sparkles-outline', emoji: '🎉' },
  ad:     { bg: '#FFFBEB', text: '#92400E', icon: 'megaphone-outline', emoji: '📢' },
};

function BannerItem({ banner, width }: { banner: Banner; width: number }) {
  const cfg = BANNER_COLORS[banner.type] ?? BANNER_COLORS.ad;
  return (
    <View style={[bSty.slide, { width, backgroundColor: cfg.bg }]}>
      <Text style={bSty.emoji}>{cfg.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[bSty.title, { color: cfg.text }]} numberOfLines={1}>{banner.title}</Text>
        {banner.subtitle ? (
          <Text style={[bSty.subtitle, { color: cfg.text + 'CC' }]} numberOfLines={1}>{banner.subtitle}</Text>
        ) : null}
      </View>
      {banner.link ? (
        <Ionicons name="chevron-back" size={16} color={cfg.text + '80'} />
      ) : null}
    </View>
  );
}

export default function BannerCarousel() {
  const { banners } = useAppData();
  const activeBanners = banners.filter(b => b.active);
  const scrollRef = useRef<ScrollView>(null);
  const [current, setCurrent] = useState(0);
  const slideWidth = Math.min(SCREEN_W - 40, 600);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => {
        const next = (prev + 1) % activeBanners.length;
        scrollRef.current?.scrollTo({ x: next * slideWidth, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, [activeBanners.length, slideWidth]);

  if (activeBanners.length === 0) return null;

  return (
    <View style={bSty.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={activeBanners.length > 1}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
          setCurrent(idx);
        }}
        style={{ borderRadius: 14 }}
      >
        {activeBanners.map((b, i) => (
          <BannerItem key={b.id} banner={b} width={slideWidth} />
        ))}
      </ScrollView>

      {activeBanners.length > 1 && (
        <View style={bSty.dots}>
          {activeBanners.map((_, i) => (
            <View key={i} style={[bSty.dot, i === current && bSty.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const bSty = StyleSheet.create({
  container: { marginHorizontal: 0, marginBottom: 16 },
  slide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  emoji: { fontSize: 22 },
  title: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.borderLight },
  dotActive: { backgroundColor: Colors.primary, width: 14 },
});
