/* eslint-disable react/no-unknown-property */
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import path from 'path';

const LOGO_PATH = path.join(process.cwd(), 'public', 'peerspectiv-logo.png');

// Brand colors matching the reference certificate
const BRAND_GREEN = '#4CAF7D';
const DARK_NAVY = '#1A2744';
const INK_700 = '#374151';
const INK_500 = '#6B7280';

export interface QualityCertificateData {
  organizationName: string;
  organizationAddress?: string | null;
  period: string;
  hrsaRegistration?: string;
  signedByName: string;
  signedByTitle: string;
  signedDate: string;
  signatureImageUrl?: string;
  providers?: Array<{ name: string; score: number }>;
  scoreThreshold?: number;
}

export function QualityCertificatePdf({ data }: { data: QualityCertificateData }) {
  return (
    <Document>
      <Page
        size="LETTER"
        orientation="landscape"
        style={{
          fontFamily: 'Helvetica',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* ─── Green header banner ─── */}
        <View
          style={{
            backgroundColor: BRAND_GREEN,
            paddingVertical: 28,
            paddingHorizontal: 50,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Image src={LOGO_PATH} style={{ width: 180, height: 36 }} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textAlign: 'right' }}>
              Independent
            </Text>
            <Text style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textAlign: 'right' }}>
              FQHC Peer Reviews
            </Text>
            <Text style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', textAlign: 'right' }}>
              Certification Network
            </Text>
          </View>
        </View>

        {/* ─── Certificate body ─── */}
        <View style={{ paddingHorizontal: 60, paddingTop: 40, alignItems: 'center' }}>
          {/* Title */}
          <Text
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: DARK_NAVY,
              textAlign: 'center',
              letterSpacing: 3,
              marginBottom: 8,
            }}
          >
            QUALITY CERTIFICATE
          </Text>

          {/* Subtitle */}
          <Text
            style={{
              fontSize: 11,
              color: INK_700,
              textAlign: 'center',
              marginBottom: 28,
            }}
          >
            Peerspectiv™ has issued an FQHC recognized certificate that the organization:
          </Text>

          {/* Organization name */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: DARK_NAVY,
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            {data.organizationName}
          </Text>

          {/* Address */}
          {data.organizationAddress && (
            <Text
              style={{
                fontSize: 12,
                color: INK_700,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              {data.organizationAddress}
            </Text>
          )}

          {/* Body text */}
          <Text
            style={{
              fontSize: 11,
              color: INK_700,
              textAlign: 'center',
              lineHeight: 1.6,
              maxWidth: 480,
              marginTop: 8,
              marginBottom: 24,
            }}
          >
            Has had licensed health care professionals conduct QI/QA assessments on their providers.{'\n'}
            The organization's providers were reviewed and certified as clinically competent,{'\n'}
            fulfilling HRSA compliance manual requirements.
          </Text>

          {/* Registration + Period */}
          {data.hrsaRegistration && (
            <Text style={{ fontSize: 11, color: INK_700, textAlign: 'center', marginBottom: 4 }}>
              Registration Number:  <Text style={{ fontWeight: 700, color: DARK_NAVY }}>{data.hrsaRegistration}</Text>
            </Text>
          )}
          <Text style={{ fontSize: 11, color: INK_700, textAlign: 'center', marginBottom: 4 }}>
            Assessment Period:  <Text style={{ fontWeight: 700, color: DARK_NAVY }}>{data.period}</Text>
          </Text>

          {/* Signed date */}
          <Text
            style={{
              fontSize: 10,
              color: INK_500,
              textAlign: 'center',
              marginTop: 8,
              marginBottom: 16,
            }}
          >
            Signed: {data.signedDate}
          </Text>

          {/* Signature image (if available) */}
          {data.signatureImageUrl && (
            <Image
              src={data.signatureImageUrl}
              style={{ width: 120, height: 50, marginBottom: 8 }}
            />
          )}

          {/* Signatory */}
          <Text
            style={{
              fontSize: 11,
              fontStyle: 'italic',
              color: DARK_NAVY,
              textAlign: 'center',
            }}
          >
            {data.signedByName}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: INK_500,
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            {data.signedByTitle}
          </Text>
        </View>

        {/* ─── Footer ─── */}
        <View
          style={{
            position: 'absolute',
            bottom: 30,
            right: 50,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: 700, color: DARK_NAVY }}>
            Peerspectiv.com
          </Text>
        </View>
      </Page>
    </Document>
  );
}
