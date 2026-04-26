/* eslint-disable react/no-unknown-property */
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles, scoreColor, colors } from '../theme';

export interface QuestionAnalyticsData {
  companyName: string;
  rangeStart: string;
  rangeEnd: string;
  specialty?: string;
  totalReviews: number;
  questions: Array<{
    questionText: string;
    yes: number;
    no: number;
    na: number;
    compliancePct: number;
    noRespondents: string[];
  }>;
}

const fmtPct = (n: number) => `${Math.round(n)}%`;

export function QuestionAnalyticsPdf({ data }: { data: QuestionAnalyticsData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>Peerspectiv</Text>
            <Text style={styles.eyebrow}>QUALITY REPORT</Text>
            <Text style={styles.reportTitle}>Question Analytics</Text>
            <Text style={styles.reportSubtitle}>
              {data.companyName}
              {data.specialty ? ` · ${data.specialty}` : ''}
            </Text>
            <Text style={styles.dateRange}>
              {data.rangeStart} — {data.rangeEnd} · {data.totalReviews} reviews
            </Text>
          </View>
        </View>

        {data.questions.map((q, i) => {
          const tone = scoreColor(q.compliancePct);
          return (
            <View key={i} style={styles.questionBlock} wrap={false}>
              <Text style={styles.questionText}>
                {i + 1}. {q.questionText}
              </Text>

              <View style={styles.responseCounts}>
                <Text style={{ marginRight: 16 }}>Yes: {q.yes}</Text>
                <Text style={{ marginRight: 16 }}>No: {q.no}</Text>
                <Text style={{ marginRight: 16 }}>N/A: {q.na}</Text>
                <Text
                  style={[
                    styles.scoreBadge,
                    { backgroundColor: tone.bg, color: tone.text },
                  ]}
                >
                  {fmtPct(q.compliancePct)} compliant
                </Text>
              </View>

              {q.noRespondents.length > 0 && (
                <View style={{ marginTop: 6 }}>
                  <Text
                    style={{
                      fontSize: 8,
                      color: colors.ink500,
                      letterSpacing: 1.0,
                      textTransform: 'uppercase',
                      marginBottom: 2,
                    }}
                  >
                    NO Respondents
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.critical700 }}>
                    {q.noRespondents.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {data.questions.length === 0 && (
          <Text style={{ fontSize: 11, color: colors.ink500, textAlign: 'center', marginTop: 40 }}>
            No question data available for the selected period.
          </Text>
        )}
      </Page>
    </Document>
  );
}
