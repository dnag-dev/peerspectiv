import { StyleSheet, Font } from '@react-pdf/renderer';

// Register Geist if reachable; otherwise fall back to Helvetica.
// Wrapped in try/catch so a registration failure never blocks rendering.
try {
  Font.register({
    family: 'Geist',
    fonts: [
      {
        src: 'https://cdn.jsdelivr.net/npm/@fontsource/geist/files/geist-latin-400-normal.woff',
        fontWeight: 400,
      },
      {
        src: 'https://cdn.jsdelivr.net/npm/@fontsource/geist/files/geist-latin-500-normal.woff',
        fontWeight: 500,
      },
      {
        src: 'https://cdn.jsdelivr.net/npm/@fontsource/geist/files/geist-latin-700-normal.woff',
        fontWeight: 700,
      },
    ],
  });
} catch {
  /* fall back to default font */
}

export const colors = {
  ink900: '#0F172A',
  ink700: '#334155',
  ink600: '#475569',
  ink500: '#64748B',
  ink300: '#CBD5E1',
  ink200: '#E2E8F0',
  ink100: '#F1F5F9',
  paperCanvas: '#F5F8FB',
  paperSurface: '#FFFFFF',
  cobalt700: '#1D4ED8',
  cobalt500: '#3B82F6',
  cobalt100: '#DBEAFE',
  cobalt50: '#EFF6FF',
  mint700: '#00956E',
  mint600: '#00B582',
  mint100: '#D1FAE5',
  mint50: '#ECFDF5',
  amber700: '#92400E',
  amber600: '#D97706',
  amber100: '#FEF3C7',
  amber50: '#FFFBEB',
  critical700: '#B91C1C',
  critical600: '#DC2626',
  critical100: '#FEE2E2',
  critical50: '#FEF2F2',
};

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.ink900,
    backgroundColor: colors.paperSurface,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 12,
    borderBottom: `0.5pt solid ${colors.ink200}`,
  },
  brand: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.cobalt700,
  },
  reportTitle: { fontSize: 22, fontWeight: 700, color: colors.ink900, marginTop: 4 },
  reportSubtitle: { fontSize: 11, color: colors.ink500, marginTop: 2 },
  dateRange: { fontSize: 9, color: colors.ink500, marginTop: 6 },
  scoreCallout: {
    backgroundColor: colors.mint50,
    border: `0.5pt solid ${colors.mint100}`,
    padding: 10,
    borderRadius: 6,
    minWidth: 140,
  },
  scorePct: { fontSize: 22, fontWeight: 700, color: colors.mint700 },
  scoreLabel: { fontSize: 8, color: colors.ink500, marginTop: 2 },
  eyebrow: {
    fontSize: 8,
    color: colors.ink500,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  // Provider Highlights
  providerBlock: { marginBottom: 14 },
  providerNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  providerName: { fontSize: 11, fontWeight: 700 },
  scoreBadge: {
    backgroundColor: colors.mint100,
    color: colors.mint700,
    fontSize: 10,
    fontWeight: 700,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.mint50,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 3,
    borderRadius: 3,
  },
  reviewName: { fontSize: 10, color: colors.ink700 },
  reviewScore: { fontSize: 10, color: colors.ink900, fontWeight: 500 },
  // Question Analytics
  questionBlock: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: `0.5pt solid ${colors.ink200}`,
  },
  questionText: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  responseCounts: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
    fontSize: 9,
    color: colors.ink600,
  },
  // Invoice
  invoiceTable: { marginTop: 16 },
  invoiceTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.ink100,
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 9,
    fontWeight: 700,
    color: colors.ink700,
  },
  invoiceTableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottom: `0.5pt solid ${colors.ink100}`,
    fontSize: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: 700,
    color: colors.ink900,
  },
  // Quality Certificate
  certPage: {
    padding: 60,
    fontFamily: 'Helvetica',
    backgroundColor: colors.paperSurface,
  },
  certBanner: {
    backgroundColor: colors.mint600,
    color: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 40,
    textAlign: 'center',
  },
  certTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.cobalt700,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 2,
  },
  certBody: {
    fontSize: 12,
    color: colors.ink700,
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: 30,
  },
  certOrg: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.ink900,
    textAlign: 'center',
    marginBottom: 8,
  },
  signatureBlock: {
    marginTop: 60,
    paddingTop: 12,
    borderTop: `1pt solid ${colors.ink200}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export const scoreColor = (pct: number) => {
  if (pct >= 90) return { bg: colors.mint100, text: colors.mint700 };
  if (pct >= 50) return { bg: colors.amber100, text: colors.amber700 };
  return { bg: colors.critical100, text: colors.critical700 };
};
