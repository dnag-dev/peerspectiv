/* eslint-disable react/no-unknown-property */
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles, scoreColor, colors } from '../theme';

export interface ProviderHighlightsData {
  companyName: string;
  rangeStart: string;
  rangeEnd: string;
  overallScore: number;
  providers: Array<{
    providerName: string;
    overallScore: number;
    reviews: Array<{ reviewType: string; count: number; score: number }>;
  }>;
}

function fmtPct(n: number) {
  return `${Math.round(n)}%`;
}

export function ProviderHighlightsPdf({ data }: { data: ProviderHighlightsData }) {
  const overallTone = scoreColor(data.overallScore);
  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Peerspectiv</Text>
            <Text style={styles.eyebrow}>QUALITY REPORT</Text>
            <Text style={styles.reportTitle}>Provider Score Report</Text>
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
            <Text style={styles.scoreLabel}>{data.providers.length} providers reviewed</Text>
          </View>
        </View>

        {/* Provider blocks */}
        {data.providers.map((p, i) => {
          const tone = scoreColor(p.overallScore);
          return (
            <View key={i} style={styles.providerBlock} wrap={false}>
              <View
                style={[
                  styles.providerNameRow,
                  { backgroundColor: colors.ink100 },
                ]}
              >
                <Text style={styles.providerName}>{p.providerName}</Text>
                <Text
                  style={[
                    styles.scoreBadge,
                    { backgroundColor: tone.bg, color: tone.text },
                  ]}
                >
                  {fmtPct(p.overallScore)}
                </Text>
              </View>
              {p.reviews.map((r, j) => (
                <View key={j} style={styles.reviewRow}>
                  <Text style={styles.reviewName}>
                    {r.reviewType} {r.count > 1 ? `(${r.count})` : ''}
                  </Text>
                  <Text style={styles.reviewScore}>{fmtPct(r.score)}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {data.providers.length === 0 && (
          <Text style={{ fontSize: 11, color: colors.ink500, textAlign: 'center', marginTop: 40 }}>
            No reviewed providers in the selected period.
          </Text>
        )}
      </Page>
    </Document>
  );
}
