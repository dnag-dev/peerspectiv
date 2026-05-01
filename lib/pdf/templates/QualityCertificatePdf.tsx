/* eslint-disable react/no-unknown-property */
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles, colors } from '../theme';

export interface QualityCertificateData {
  organizationName: string;
  period: string;          // e.g. "Q4 2025" or "Jan 1 — Mar 31 2026"
  hrsaRegistration?: string;
  signedByName: string;
  signedByTitle: string;
  signedDate: string;
  // Optional rendered signature image data URL (PNG/JPG); leave undefined to omit.
  signatureImageUrl?: string;
  // Optional provider attestation list (added per HRSA section)
  providers?: Array<{ name: string; score: number }>;
  scoreThreshold?: number;
}

export function QualityCertificatePdf({ data }: { data: QualityCertificateData }) {
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.certPage}>
        <Text style={styles.certBanner}>
          Independent FQHC Peer Reviews · Certification Network
        </Text>

        <Text style={styles.certTitle}>QUALITY CERTIFICATE</Text>

        <Text style={[styles.certBody, { marginBottom: 18 }]}>
          This is to certify that
        </Text>
        <Text style={styles.certOrg}>{data.organizationName}</Text>

        <Text style={[styles.certBody, { marginTop: 18 }]}>
          has successfully completed the independent peer-review process for the
          assessment period <Text style={{ fontWeight: 700 }}>{data.period}</Text>.
          {'\n'}We attest that the providers listed below were peer-reviewed and
          determined to be clinically competent in compliance with HRSA
          quality-improvement standards for Federally Qualified Health Centers.
        </Text>

        {data.providers && data.providers.length > 0 && (
          <View style={{ marginTop: 14, alignSelf: 'center', maxWidth: '80%' }}>
            <Text style={[styles.eyebrow, { textAlign: 'center', marginBottom: 4 }]}>
              ATTESTED PROVIDERS
              {data.scoreThreshold != null
                ? ` (score ≥ ${Math.round(data.scoreThreshold)}%)`
                : ''}
            </Text>
            {data.providers.map((p, i) => (
              <Text
                key={i}
                style={{ fontSize: 10, color: colors.ink900, textAlign: 'center' }}
              >
                {p.name} — {Math.round(p.score)}%
              </Text>
            ))}
          </View>
        )}

        {data.hrsaRegistration ? (
          <View style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={styles.eyebrow}>HRSA REGISTRATION</Text>
            <Text style={{ fontSize: 11, color: colors.ink900 }}>{data.hrsaRegistration}</Text>
          </View>
        ) : null}

        <View style={styles.signatureBlock}>
          <View style={{ width: '45%' }}>
            <Text style={{ fontSize: 9, color: colors.ink500, marginBottom: 4 }}>
              Authorized signatory
            </Text>
            <Text style={{ fontSize: 12, color: colors.ink900, fontWeight: 700 }}>
              {data.signedByName}
            </Text>
            <Text style={{ fontSize: 10, color: colors.ink600 }}>{data.signedByTitle}</Text>
          </View>
          <View style={{ width: '45%', alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 9, color: colors.ink500, marginBottom: 4 }}>Issued</Text>
            <Text style={{ fontSize: 12, color: colors.ink900, fontWeight: 700 }}>
              {data.signedDate}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
