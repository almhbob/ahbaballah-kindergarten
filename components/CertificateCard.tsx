import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Certificate, CertificateTemplate } from '@/contexts/AppDataContext';

export const CERT_TEMPLATES: Record<CertificateTemplate, {
  label: string;
  icon: string;
  colors: [string, string, string];
  accent: string;
  bg: string;
}> = {
  excellence:    { label: 'تفوق وتميز',    icon: 'star-four-points', colors: ['#78350f','#b45309','#fde68a'], accent: '#fcd34d', bg: '#FFF8E7' },
  participation: { label: 'مشاركة فعّالة', icon: 'hand-clap',        colors: ['#1e3a8a','#1d4ed8','#93c5fd'], accent: '#93c5fd', bg: '#EFF6FF' },
  behavior:      { label: 'سلوك قويم',     icon: 'heart-circle',     colors: ['#052e16','#15803d','#86efac'], accent: '#6ee7b7', bg: '#F0FDF4' },
  attendance:    { label: 'حضور مثالي',    icon: 'calendar-check',   colors: ['#3b0764','#7c3aed','#c4b5fd'], accent: '#c4b5fd', bg: '#F5F3FF' },
  creativity:    { label: 'إبداع وتميز',   icon: 'palette',          colors: ['#701a75','#c026d3','#f0abfc'], accent: '#f9a8d4', bg: '#FDF4FF' },
};

interface Props {
  cert: Certificate;
  schoolName?: string;
  principalName?: string;
  compact?: boolean;
}

export default function CertificateCard({ cert, schoolName = 'نظم إدارة رياض الأطفال — الخاصة', principalName = 'أ. سلوى أحمد داموس', compact = false }: Props) {
  const tmpl = CERT_TEMPLATES[cert.template];

  if (compact) {
    return (
      <View style={[styles.compact, { backgroundColor: tmpl.bg, borderLeftColor: tmpl.colors[1] }]}>
        <View style={[styles.compactIcon, { backgroundColor: tmpl.colors[1] }]}>
          <MaterialCommunityIcons name={tmpl.icon as any} size={20} color="#fff" />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle}>{cert.title}</Text>
          <Text style={styles.compactRecipient}>{cert.recipientName}</Text>
          <Text style={styles.compactDate}>{cert.date} · {tmpl.label}</Text>
        </View>
        <View style={[styles.statusDot, {
          backgroundColor: cert.status === 'approved' ? '#22c55e' : cert.status === 'pending' ? '#f59e0b' : '#ef4444'
        }]} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Outer border frame */}
      <LinearGradient colors={[tmpl.colors[0], tmpl.colors[1], tmpl.colors[2]]} style={styles.outerBorder}>
        <View style={styles.innerCard}>
          {/* Corner ornaments */}
          <Text style={[styles.corner, { color: tmpl.colors[1], top: 8, right: 10 }]}>❋</Text>
          <Text style={[styles.corner, { color: tmpl.colors[1], top: 8, left: 10 }]}>❋</Text>
          <Text style={[styles.corner, { color: tmpl.colors[1], bottom: 8, right: 10 }]}>❋</Text>
          <Text style={[styles.corner, { color: tmpl.colors[1], bottom: 8, left: 10 }]}>❋</Text>

          {/* Header */}
          <View style={styles.certHeader}>
            <LinearGradient colors={[tmpl.colors[0], tmpl.colors[1]]} style={styles.iconCircle}>
              <MaterialCommunityIcons name={tmpl.icon as any} size={28} color="#fff" />
            </LinearGradient>
            <Text style={[styles.schoolName, { color: tmpl.colors[0] }]}>{schoolName}</Text>
            <View style={[styles.dividerLine, { backgroundColor: tmpl.colors[1] }]} />
          </View>

          {/* Certificate declaration */}
          <Text style={styles.declarationText}>تشهد إدارة الروضة بأن</Text>

          {/* Recipient */}
          <View style={[styles.recipientBox, { borderColor: tmpl.colors[1], backgroundColor: tmpl.bg }]}>
            <Text style={[styles.recipientName, { color: tmpl.colors[0] }]}>{cert.recipientName}</Text>
          </View>

          {/* Title */}
          <Text style={styles.declarationText}>قد استحق/ت شهادة</Text>
          <Text style={[styles.certTitle, { color: tmpl.colors[0] }]}>{cert.title}</Text>

          {/* Decorative line */}
          <View style={styles.ornamentRow}>
            <View style={[styles.ornamentLine, { backgroundColor: tmpl.colors[1] }]} />
            <MaterialCommunityIcons name={tmpl.icon as any} size={16} color={tmpl.colors[1]} />
            <View style={[styles.ornamentLine, { backgroundColor: tmpl.colors[1] }]} />
          </View>

          {/* Message */}
          {cert.message ? (
            <Text style={styles.messageText}>{cert.message}</Text>
          ) : null}

          {/* Footer */}
          <View style={styles.certFooter}>
            <View style={styles.signatureBox}>
              <View style={[styles.sigLine, { borderColor: tmpl.colors[1] }]} />
              <Text style={styles.sigLabel}>توقيع: {cert.issuedBy}</Text>
            </View>
            <View style={styles.dateBox}>
              <Text style={[styles.dateLabel, { color: tmpl.colors[1] }]}>{cert.date}</Text>
              <Text style={styles.dateHint}>تاريخ الإصدار</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 16 },
  outerBorder: { borderRadius: 20, padding: 3 },
  innerCard: { backgroundColor: '#fffdf7', borderRadius: 18, padding: 20, alignItems: 'center' },
  corner: { position: 'absolute', fontSize: 18 },
  certHeader: { alignItems: 'center', marginBottom: 14, width: '100%' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  schoolName: { fontSize: 14, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 8 },
  dividerLine: { height: 2, width: '80%', borderRadius: 1, opacity: 0.4 },
  declarationText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#64748b', textAlign: 'center', marginBottom: 6 },
  recipientBox: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 8, marginVertical: 10, minWidth: 200, alignItems: 'center' },
  recipientName: { fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  certTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', textAlign: 'center', marginTop: 4, marginBottom: 12 },
  ornamentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '70%', marginBottom: 12 },
  ornamentLine: { flex: 1, height: 1.5, opacity: 0.5 },
  messageText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#475569', textAlign: 'center', marginBottom: 16, lineHeight: 20, paddingHorizontal: 12 },
  certFooter: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  signatureBox: { alignItems: 'flex-end' },
  sigLine: { width: 100, borderBottomWidth: 1, marginBottom: 4 },
  sigLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#94a3b8', textAlign: 'right' },
  dateBox: { alignItems: 'flex-start' },
  dateLabel: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  dateHint: { fontSize: 10, fontFamily: 'Inter_400Regular', color: '#94a3b8' },

  // Compact styles
  compact: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, gap: 12, borderRightWidth: 4, marginBottom: 10 },
  compactIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  compactContent: { flex: 1 },
  compactTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#1e293b', textAlign: 'right' },
  compactRecipient: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#475569', textAlign: 'right', marginTop: 2 },
  compactDate: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#94a3b8', textAlign: 'right', marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
});
