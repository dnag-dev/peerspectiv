/* eslint-disable react/no-unknown-property */
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles, colors } from '../theme';

export interface PeerEarningsLine {
  date: string;
  caseId: string;
  providerReviewed: string;
  timeSpentMinutes: number;
  rate: number;
  amount: number;
}

export interface PeerEarningsSummaryData {
  reviewerName: string;
  reviewerEmail?: string;
  rangeStart: string;
  rangeEnd: string;
  currency: string;
  lines: PeerEarningsLine[];
  totalAmount: number;
  ytdTotal: number; // calendar-year total used to drive 1099 note
}

const fmtMoney = (n: number, ccy: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: ccy || 'USD',
  }).format(n);

export function PeerEarningsSummaryPdf({ data }: { data: PeerEarningsSummaryData }) {
  const showTaxNote = data.ytdTotal >= 600;
  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Peerspectiv</Text>
            <Text style={styles.eyebrow}>EARNINGS STATEMENT</Text>
            <Text style={styles.reportTitle}>Peer Earnings Summary</Text>
            <Text style={styles.reportSubtitle}>{data.reviewerName}</Text>
            {data.reviewerEmail ? (
              <Text style={{ fontSize: 9, color: colors.ink500 }}>{data.reviewerEmail}</Text>
            ) : null}
            <Text style={styles.dateRange}>
              {data.rangeStart} — {data.rangeEnd}
            </Text>
          </View>
          <View style={[styles.scoreCallout, { backgroundColor: colors.cobalt50 }]}>
            <Text style={styles.eyebrow}>PERIOD TOTAL</Text>
            <Text style={[styles.scorePct, { color: colors.cobalt700 }]}>
              {fmtMoney(data.totalAmount, data.currency)}
            </Text>
            <Text style={styles.scoreLabel}>{data.lines.length} reviews</Text>
          </View>
        </View>

        {/* Line items */}
        <View style={styles.invoiceTable}>
          <View style={styles.invoiceTableHeader}>
            <Text style={{ flex: 1.2 }}>Date</Text>
            <Text style={{ flex: 1.5 }}>Case</Text>
            <Text style={{ flex: 2 }}>Provider</Text>
            <Text style={{ flex: 1, textAlign: 'right' }}>Minutes</Text>
            <Text style={{ flex: 1, textAlign: 'right' }}>Rate</Text>
            <Text style={{ flex: 1.2, textAlign: 'right' }}>Amount</Text>
          </View>
          {data.lines.map((l, i) => (
            <View key={i} style={styles.invoiceTableRow}>
              <Text style={{ flex: 1.2 }}>{l.date}</Text>
              <Text style={{ flex: 1.5 }}>{l.caseId.slice(0, 8)}…</Text>
              <Text style={{ flex: 2 }}>{l.providerReviewed}</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>{l.timeSpentMinutes}</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>
                {fmtMoney(l.rate, data.currency)}
              </Text>
              <Text style={{ flex: 1.2, textAlign: 'right' }}>
                {fmtMoney(l.amount, data.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View
          style={[
            styles.totalRow,
            { borderTop: `1pt solid ${colors.ink200}`, marginTop: 6, paddingTop: 8 },
          ]}
        >
          <Text style={{ marginRight: 24, color: colors.ink500 }}>Total Earned:</Text>
          <Text style={{ color: colors.cobalt700, fontSize: 14, fontWeight: 700 }}>
            {fmtMoney(data.totalAmount, data.currency)}
          </Text>
        </View>

        {showTaxNote && (
          <View
            style={{
              marginTop: 24,
              padding: 10,
              backgroundColor: colors.amber50,
              border: `0.5pt solid ${colors.amber100}`,
              borderRadius: 6,
            }}
          >
            <Text style={styles.eyebrow}>1099-NEC NOTICE</Text>
            <Text style={{ fontSize: 10, color: colors.amber700, marginTop: 2 }}>
              YTD earnings of {fmtMoney(data.ytdTotal, data.currency)} exceed the
              $600 reporting threshold. A Form 1099-NEC will be issued at year end
              for tax filing purposes.
            </Text>
          </View>
        )}

        {data.lines.length === 0 && (
          <Text style={{ fontSize: 11, color: colors.ink500, textAlign: 'center', marginTop: 40 }}>
            No earnings recorded in the selected period.
          </Text>
        )}
      </Page>
    </Document>
  );
}
