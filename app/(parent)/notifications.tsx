import React from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useAppData } from '@/contexts/AppDataContext';
import * as Haptics from 'expo-haptics';

const PARENT_COLOR = '#7B3FA0';

const TYPE_CONFIG = {
  news: { icon: 'newspaper-variant', color: Colors.accent, bg: '#FFF7ED', label: 'خبر' },
  trip: { icon: 'bus', color: Colors.success, bg: '#ECFDF5', label: 'رحلة' },
  activity: { icon: 'star-shooting', color: '#3B82F6', bg: '#EFF6FF', label: 'نشاط' },
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { news } = useAppData();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Text style={styles.headerTitle}>الأخبار والتنبيهات</Text>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <MaterialCommunityIcons name="bus" size={14} color={Colors.success} />
            <Text style={[styles.statText, { color: Colors.success }]}>
              {news.filter(n => n.type === 'trip').length} رحلة
            </Text>
          </View>
          <View style={styles.statChip}>
            <MaterialCommunityIcons name="star-shooting" size={14} color="#3B82F6" />
            <Text style={[styles.statText, { color: '#3B82F6' }]}>
              {news.filter(n => n.type === 'activity').length} نشاط
            </Text>
          </View>
          <View style={styles.statChip}>
            <MaterialCommunityIcons name="newspaper-variant" size={14} color={Colors.accent} />
            <Text style={[styles.statText, { color: Colors.accent }]}>
              {news.filter(n => n.type === 'news').length} خبر
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={news}
        keyExtractor={n => n.id}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const cfg = TYPE_CONFIG[item.type];
          return (
            <Pressable
              style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
                <MaterialCommunityIcons name={cfg.icon as any} size={26} color={cfg.color} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <Text style={styles.cardDate}>{item.date}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="bell-sleep-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>لا توجد أخبار حالياً</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: PARENT_COLOR, paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFFFFF', textAlign: 'right', marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: 18, padding: 16, flexDirection: 'row', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  iconBox: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  cardDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textLight },
  cardTitle: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.text, textAlign: 'right', marginBottom: 6 },
  cardBody: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, textAlign: 'right', lineHeight: 18 },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.textLight },
});
