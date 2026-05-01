/* eslint-disable react/no-unknown-property */
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles, scoreColor, colors } from '../theme';

export interface ProviderHighlightsData {
  companyName: string;
  rangeStart: string;
  rangeEnd: string;
  generatedAt?: string;
  overallScore: number;
  providers: Array<{
    providerName: string;
    overallScore: number;
    reviews: Array<{ reviewType: string; count: number; score: number }>;
    previousQuarters?: Array<{ label: string; score: number | null }>;
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
            <Text style={[styles.reportTitle, { fontSize: 22 }]}>{data.companyName}</Text>
            <Text style={styles.reportSubtitle}>Provider Score Report</Text>
            <Text style={styles.dateRange}>
              Period: {data.rangeStart} — {data.rangeEnd}
            </Text>
            {data.generatedAt && (
              <Text style={styles.dateRange}>Generated: {data.generatedAt}</Text>
            )}
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
                    {r.reviewType} ({r.count} review{r.count === 1 ? '' : 's'})
                  </Text>
                  <Text style={styles.reviewScore}>{fmtPct(r.score)}</Text>
                </View>
              ))}
              {p.previousQuarters && p.previousQuarters.length > 0 && (
                <View style={[styles.reviewRow, { marginTop: 4 }]}>
                  <Text style={[styles.reviewName, { fontSize: 9, color: colors.ink500 }]}>
                    Trend:&nbsp;
                    {p.previousQuarters
                      .map((q) => `${q.label}: ${q.score == null ? '—' : fmtPct(q.score)}`)
                      .join('  ·  ')}
                    {`  ·  Current: ${fmtPct(p.overallScore)}`}
                  </Text>
                </View>
              )}
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
