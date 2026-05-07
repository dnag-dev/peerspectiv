/* eslint-disable react/no-unknown-property */
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles, colors } from '../theme';

export interface PerProviderReviewAnswersData {
  companyName: string;
  providerName: string;
  providerSpecialty: string | null;
  reviewType: string;
  mrn: string | null;
  peerName: string | null;
  peerLicense: string | null;
  peerLicenseState: string | null;
  submittedAt: string;
  totalMeasuresMetPct: number | null;
  numerator: number;
  denominator: number;
  questions: Array<{
    field_label: string;
    default_answer: string | null;
    peer_answer: string | null;
    score: 100 | 0 | null; // null = excluded (NA / narrative)
    excluded: boolean;
    comment?: string | null;
  }>;
  generalComments?: string | null;
}

function fmtAnswer(v: string | null): string {
  if (v == null || v === '') return '—';
  return String(v);
}

function scoreCell(score: 100 | 0 | null, excluded: boolean): { label: string; color: string } {
  if (excluded) return { label: 'Excluded', color: colors.ink500 };
  if (score === 100) return { label: '100', color: colors.mint700 };
  return { label: '0', color: colors.critical700 };
}

export function PerProviderReviewAnswersPdf({ data }: { data: PerProviderReviewAnswersData }) {
  const pct = data.totalMeasuresMetPct == null ? '—' : `${data.totalMeasuresMetPct.toFixed(2)}%`;
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Peerspectiv</Text>
            <Text style={styles.reportTitle}>Per-Provider Review</Text>
            <Text style={styles.reportSubtitle}>{data.companyName}</Text>
            <Text style={styles.dateRange}>
              Submitted {data.submittedAt} · {data.reviewType}
            </Text>
          </View>
          <View style={styles.scoreCallout}>
            <Text style={styles.scorePct}>{pct}</Text>
            <Text style={styles.scoreLabel}>
              Total measures met ({data.numerator}/{data.denominator})
            </Text>
          </View>
        </View>

        {/* Provider + peer block */}
        <View
          style={{
            marginBottom: 16,
            padding: 10,
            backgroundColor: colors.cobalt50,
            borderRadius: 4,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: 700, color: colors.ink900 }}>
            {data.providerName}
            {data.providerSpecialty ? ` — ${data.providerSpecialty}` : ''}
          </Text>
          <Text style={{ fontSize: 9, color: colors.ink600, marginTop: 2 }}>
            MRN: {data.mrn ?? '—'}
          </Text>
          <Text style={{ fontSize: 9, color: colors.ink600, marginTop: 8 }}>
            Reviewed by: {data.peerName ?? '—'}
            {data.peerLicense
              ? ` · License ${data.peerLicense}${data.peerLicenseState ? ` (${data.peerLicenseState})` : ''}`
              : ''}
          </Text>
        </View>

        {/* Questions table */}
        <View>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.ink100,
              paddingVertical: 6,
              paddingHorizontal: 6,
            }}
          >
            <Text style={{ flex: 4, fontSize: 9, fontWeight: 700, color: colors.ink700 }}>Question</Text>
            <Text style={{ flex: 1.5, fontSize: 9, fontWeight: 700, color: colors.ink700 }}>Default</Text>
            <Text style={{ flex: 1.5, fontSize: 9, fontWeight: 700, color: colors.ink700 }}>Answer</Text>
            <Text
              style={{
                flex: 1,
                fontSize: 9,
                fontWeight: 700,
                color: colors.ink700,
                textAlign: 'right',
              }}
            >
              Score
            </Text>
          </View>

          {data.questions.map((q, i) => {
            const sc = scoreCell(q.score, q.excluded);
            return (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  paddingVertical: 5,
                  paddingHorizontal: 6,
                  borderBottom: `0.5pt solid ${colors.ink100}`,
                }}
                wrap={false}
              >
                <View style={{ flex: 4 }}>
                  <Text style={{ fontSize: 10 }}>{q.field_label}</Text>
                  {q.comment ? (
                    <Text style={{ fontSize: 8, color: colors.ink500, marginTop: 2 }}>
                      Comment: {q.comment}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ flex: 1.5, fontSize: 10, color: colors.ink600 }}>
                  {fmtAnswer(q.default_answer)}
                </Text>
                <Text style={{ flex: 1.5, fontSize: 10 }}>{fmtAnswer(q.peer_answer)}</Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 10,
                    fontWeight: 700,
                    color: sc.color,
                    textAlign: 'right',
                  }}
                >
                  {sc.label}
                </Text>
              </View>
            );
          })}
        </View>

        {data.generalComments ? (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.eyebrow}>PEER COMMENTS</Text>
            <Text style={{ fontSize: 10, color: colors.ink700 }}>{data.generalComments}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
