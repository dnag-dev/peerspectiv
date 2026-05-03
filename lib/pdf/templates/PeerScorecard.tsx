/* eslint-disable react/no-unknown-property */
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles, colors } from '../theme';

export interface PeerScorecardPdfData {
  rangeStart: string;
  rangeEnd: string;
  generatedAt?: string;
  rows: Array<{
    full_name: string;
    cases_reviewed: number;
    avg_turnaround_days: number | null;
    ai_agreement_pct: number | null;
    quality_score: number | null;
    avg_minutes_per_chart: number | null;
    earnings: number;
  }>;
}

const cellPad = { paddingVertical: 4, paddingHorizontal: 4 };

function fmt(v: number | null, suffix = '', digits = 1): string {
  if (v == null) return '—';
  return `${v.toFixed(digits)}${suffix}`;
}

function fmtMoney(v: number): string {
  return `$${v.toFixed(2)}`;
}

export function PeerScorecardPdf({ data }: { data: PeerScorecardPdfData }) {
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Peerspectiv</Text>
            <Text style={styles.eyebrow}>QUALITY REPORT</Text>
            <Text style={styles.reportTitle}>Peer Scorecard</Text>
            <Text style={styles.dateRange}>
              {data.rangeStart} — {data.rangeEnd}
            </Text>
            {data.generatedAt && (
              <Text style={styles.dateRange}>Generated: {data.generatedAt}</Text>
            )}
          </View>
        </View>

        {/* Header row */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.ink100,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.ink300,
            marginTop: 12,
          }}
        >
          <Text style={[{ flex: 2, fontSize: 9, fontWeight: 700 }, cellPad]}>Peer</Text>
          <Text style={[{ flex: 1, fontSize: 9, fontWeight: 700, textAlign: 'right' }, cellPad]}>
            Cases
          </Text>
          <Text style={[{ flex: 1, fontSize: 9, fontWeight: 700, textAlign: 'right' }, cellPad]}>
            Turnaround (d)
          </Text>
          <Text style={[{ flex: 1, fontSize: 9, fontWeight: 700, textAlign: 'right' }, cellPad]}>
            AI Agreement
          </Text>
          <Text style={[{ flex: 1, fontSize: 9, fontWeight: 700, textAlign: 'right' }, cellPad]}>
            Quality
          </Text>
          <Text style={[{ flex: 1, fontSize: 9, fontWeight: 700, textAlign: 'right' }, cellPad]}>
            Min/Chart
          </Text>
          <Text style={[{ flex: 1, fontSize: 9, fontWeight: 700, textAlign: 'right' }, cellPad]}>
            Earnings
          </Text>
        </View>

        {data.rows.map((r, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              borderBottomWidth: 0.5,
              borderColor: colors.ink200,
            }}
            wrap={false}
          >
            <Text style={[{ flex: 2, fontSize: 9 }, cellPad]}>{r.full_name}</Text>
            <Text style={[{ flex: 1, fontSize: 9, textAlign: 'right' }, cellPad]}>
              {r.cases_reviewed}
            </Text>
            <Text style={[{ flex: 1, fontSize: 9, textAlign: 'right' }, cellPad]}>
              {fmt(r.avg_turnaround_days)}
            </Text>
            <Text style={[{ flex: 1, fontSize: 9, textAlign: 'right' }, cellPad]}>
              {fmt(r.ai_agreement_pct, '%')}
            </Text>
            <Text style={[{ flex: 1, fontSize: 9, textAlign: 'right' }, cellPad]}>
              {fmt(r.quality_score)}
            </Text>
            <Text style={[{ flex: 1, fontSize: 9, textAlign: 'right' }, cellPad]}>
              {fmt(r.avg_minutes_per_chart)}
            </Text>
            <Text style={[{ flex: 1, fontSize: 9, textAlign: 'right' }, cellPad]}>
              {fmtMoney(r.earnings)}
            </Text>
          </View>
        ))}

        {data.rows.length === 0 && (
          <Text style={{ fontSize: 11, color: colors.ink500, textAlign: 'center', marginTop: 40 }}>
            No peer data for the selected period.
          </Text>
        )}
      </Page>
    </Document>
  );
}
