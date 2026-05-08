/* eslint-disable react/no-unknown-property */
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import path from 'path';
import { styles, colors } from '../theme';

const LOGO_PATH = path.join(process.cwd(), 'public', 'peerspectiv-logo.png');

export interface PerProviderReviewAnswersData {
  companyName: string;
  providerName: string;
  providerSpecialty: string | null;
  reviewType: string;
  mrn: string | null;
  encounterDate: string | null;
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
  if (v === 'true' || v === 'yes') return 'Yes';
  if (v === 'false' || v === 'no') return 'No';
  if (v === 'na' || v === 'NA') return 'N/A';
  return String(v);
}

export function PerProviderReviewAnswersPdf({ data }: { data: PerProviderReviewAnswersData }) {
  const pct = data.totalMeasuresMetPct == null ? '—' : `${data.totalMeasuresMetPct.toFixed(2)}%`;
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Image src={LOGO_PATH} style={{ width: 150, height: 30, marginBottom: 6 }} />
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
            {data.encounterDate ? `    Date of Encounter: ${data.encounterDate}` : ''}
          </Text>
          <Text style={{ fontSize: 9, color: colors.ink600, marginTop: 8 }}>
            Reviewed by: {data.peerName ?? '—'}
            {data.peerLicense
              ? ` · License ${data.peerLicense}${data.peerLicenseState ? ` (${data.peerLicenseState})` : ''}`
              : ''}
          </Text>
        </View>

        {/* Questions — numbered list matching the legacy report format */}
        <View>
          {data.questions.map((q, i) => {
            const answer = fmtAnswer(q.peer_answer);
            const isNo = answer === 'No';
            return (
              <View
                key={i}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 6,
                }}
                wrap={false}
              >
                <Text style={{ fontSize: 10, color: colors.ink900 }}>
                  {i + 1}. {q.field_label}{q.field_label.trimEnd().endsWith('?') ? '' : '?'}{' '}
                  <Text style={{ fontWeight: 700, color: isNo ? colors.critical700 : colors.ink900 }}>
                    {answer}
                  </Text>
                </Text>
                {q.comment && isNo && (
                  <Text style={{ fontSize: 9, color: colors.ink600, marginTop: 2, marginLeft: 12 }}>
                    Additional Response: {q.comment}
                  </Text>
                )}
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
