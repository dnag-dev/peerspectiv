/* eslint-disable react/no-unknown-property */
import { Document, Page, View, Text, Image } from '@react-pdf/renderer';
import path from 'path';

const LOGO_PATH = path.join(process.cwd(), 'public', 'peerspectiv-logo.png');

// Colors from the reference certificate
const BANNER_GREEN = '#5EAA82';   // muted sage green from reference
const DARK_NAVY = '#0F2044';      // dark navy for title + headings
const BODY_TEXT = '#2D3748';      // dark gray for body copy
const MUTED_TEXT = '#718096';      // lighter gray for captions

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
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* ═══════════ GREEN HEADER BANNER ═══════════ */}
        <View
          style={{
            backgroundColor: BANNER_GREEN,
            paddingVertical: 24,
            paddingHorizontal: 48,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Image src={LOGO_PATH} style={{ width: 200, height: 40 }} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 16, color: '#FFFFFF', lineHeight: 1.4 }}>
              Independent
            </Text>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 16, color: '#FFFFFF', lineHeight: 1.4 }}>
              FQHC Peer Reviews
            </Text>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 16, color: '#FFFFFF', lineHeight: 1.4 }}>
              Certification Network
            </Text>
          </View>
        </View>

        {/* ═══════════ CERTIFICATE BODY ═══════════ */}
        <View style={{ paddingHorizontal: 80, paddingTop: 50, alignItems: 'center', flex: 1 }}>

          {/* ── QUALITY CERTIFICATE title ── */}
          <Text
            style={{
              fontFamily: 'Times-Roman',
              fontSize: 56,
              color: DARK_NAVY,
              textAlign: 'center',
              letterSpacing: 4,
              marginBottom: 6,
            }}
          >
            QUALITY CERTIFICATE
          </Text>

          {/* ── Subtitle ── */}
          <Text
            style={{
              fontFamily: 'Helvetica',
              fontSize: 11,
              color: BODY_TEXT,
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            Peerspectiv™ has issued an FQHC recognized certificate that the organization:
          </Text>

          {/* ── Organization name ── */}
          <Text
            style={{
              fontFamily: 'Helvetica-Bold',
              fontSize: 28,
              color: DARK_NAVY,
              textAlign: 'center',
              marginBottom: 6,
            }}
          >
            {data.organizationName}
          </Text>

          {/* ── Address ── */}
          {data.organizationAddress && (
            <Text
              style={{
                fontFamily: 'Helvetica',
                fontSize: 12,
                color: BODY_TEXT,
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              {data.organizationAddress}
            </Text>
          )}

          {/* ── Body text ── */}
          <View style={{ maxWidth: 500, marginTop: 6, marginBottom: 28, alignSelf: 'center', alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'Helvetica',
                fontSize: 11,
                color: BODY_TEXT,
                textAlign: 'center',
                lineHeight: 1.7,
              }}
            >
              Has had licensed health care professionals conduct QI/QA assessments on their providers.
            </Text>
            <Text
              style={{
                fontFamily: 'Helvetica',
                fontSize: 11,
                color: BODY_TEXT,
                textAlign: 'center',
                lineHeight: 1.7,
              }}
            >
              The organization's providers were reviewed and certified as clinically competent,
            </Text>
            <Text
              style={{
                fontFamily: 'Helvetica',
                fontSize: 11,
                color: BODY_TEXT,
                textAlign: 'center',
                lineHeight: 1.7,
              }}
            >
              fulfilling HRSA compliance manual requirements.
            </Text>
          </View>

          {/* ── Registration Number ── */}
          {data.hrsaRegistration && (
            <Text style={{ fontFamily: 'Helvetica', fontSize: 12, color: BODY_TEXT, textAlign: 'center', marginBottom: 4 }}>
              Registration Number:{'  '}
              <Text style={{ fontFamily: 'Helvetica-Bold', color: DARK_NAVY }}>{data.hrsaRegistration}</Text>
            </Text>
          )}

          {/* ── Assessment Period ── */}
          <Text style={{ fontFamily: 'Helvetica', fontSize: 12, color: BODY_TEXT, textAlign: 'center', marginBottom: 6 }}>
            Assessment Period:{'  '}
            <Text style={{ fontFamily: 'Helvetica-Bold', color: DARK_NAVY }}>{data.period}</Text>
          </Text>

          {/* ── Signed date ── */}
          <Text
            style={{
              fontFamily: 'Helvetica',
              fontSize: 10,
              color: MUTED_TEXT,
              textAlign: 'center',
              marginTop: 6,
              marginBottom: 20,
            }}
          >
            Signed: {data.signedDate}
          </Text>

          {/* ── Signature image ── */}
          {data.signatureImageUrl && (
            <Image
              src={data.signatureImageUrl}
              style={{ width: 130, height: 55, marginBottom: 8 }}
            />
          )}

          {/* ── Signatory ── */}
          <Text
            style={{
              fontFamily: 'Helvetica-Oblique',
              fontSize: 12,
              color: DARK_NAVY,
              textAlign: 'center',
            }}
          >
            {data.signedByName}
          </Text>
          <Text
            style={{
              fontFamily: 'Helvetica',
              fontSize: 10,
              color: MUTED_TEXT,
              textAlign: 'center',
            }}
          >
            {data.signedByTitle}
          </Text>
        </View>

        {/* ═══════════ FOOTER ═══════════ */}
        <View
          style={{
            position: 'absolute',
            bottom: 28,
            right: 48,
          }}
        >
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, color: DARK_NAVY }}>
            Peerspectiv.com
          </Text>
        </View>
      </Page>
    </Document>
  );
}
