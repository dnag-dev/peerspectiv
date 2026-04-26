/* eslint-disable react/no-unknown-property */
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles, scoreColor, colors } from '../theme';

export interface SpecialtyHighlightsData {
  companyName: string;
  rangeStart: string;
  rangeEnd: string;
  overallScore: number;
  specialties: Array<{
    specialty: string;
    avgScore: number;
    reviewCount: number;
    providerCount: number;
  }>;
}

const fmtPct = (n: number) => `${Math.round(n)}%`;

export function SpecialtyHighlightsPdf({ data }: { data: SpecialtyHighlightsData }) {
  const overallTone = scoreColor(data.overallScore);
  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Peerspectiv</Text>
            <Text style={styles.eyebrow}>QUALITY REPORT</Text>
            <Text style={styles.reportTitle}>Specialty Highlights</Text>
            <Text style={styles.reportSubtitle}>{data.companyName}</Text>
            <Text style={styles.dateRange}>
              {data.rangeStart} — {data.rangeEnd}
            </Text>
          </View>
          <View style={[styles.scoreCallout, { backgroundColor: overallTone.bg }]}>
            <Text style={styles.eyebrow}>OVERALL SCORE</Text>
            <Text style={[styles.scorePct, { color: overallTone.text }]}>
              {fmtPct(data.overallScore)}
            </Text>
            <Text style={styles.scoreLabel}>{data.specialties.length} specialties</Text>
          </View>
        </View>

        {/* Table header */}
        <View style={styles.invoiceTableHeader}>
          <Text style={{ flex: 3 }}>Specialty</Text>
          <Text style={{ flex: 1, textAlign: 'right' }}>Providers</Text>
          <Text style={{ flex: 1, textAlign: 'right' }}>Reviews</Text>
          <Text style={{ flex: 1, textAlign: 'right' }}>Avg Score</Text>
        </View>

        {data.specialties.map((s, i) => {
          const tone = scoreColor(s.avgScore);
          return (
            <View key={i} style={styles.invoiceTableRow}>
              <Text style={{ flex: 3, fontWeight: 500 }}>{s.specialty}</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>{s.providerCount}</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>{s.reviewCount}</Text>
              <Text
                style={[
                  styles.scoreBadge,
                  {
                    flex: 1,
                    textAlign: 'center',
                    backgroundColor: tone.bg,
                    color: tone.text,
                  },
                ]}
              >
                {fmtPct(s.avgScore)}
              </Text>
            </View>
          );
        })}

        {data.specialties.length === 0 && (
          <Text style={{ fontSize: 11, color: colors.ink500, textAlign: 'center', marginTop: 40 }}>
            No specialty data in the selected period.
          </Text>
        )}
      </Page>
    </Document>
  );
}
