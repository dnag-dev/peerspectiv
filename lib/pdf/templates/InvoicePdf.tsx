/* eslint-disable react/no-unknown-property */
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles, colors } from '../theme';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string | null;
  rangeStart: string;
  rangeEnd: string;
  // Issuer (Peerspectiv)
  issuer: {
    companyName: string;
    address?: string;
    email?: string;
  };
  // Bill-to (client)
  billTo: {
    companyName: string;
    contactPerson?: string | null;
    contactEmail?: string | null;
    address?: string | null;
  };
  reviewCount: number;
  providerCount: number;
  unitPrice: number;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentLinkUrl?: string | null;
  notes?: string | null;
}

const fmtMoney = (n: number, ccy: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: ccy || 'USD',
  }).format(n);

export function InvoicePdf({ data }: { data: InvoicePdfData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>{data.issuer.companyName}</Text>
            {data.issuer.address ? (
              <Text style={{ fontSize: 9, color: colors.ink500, marginTop: 4 }}>
                {data.issuer.address}
              </Text>
            ) : null}
            {data.issuer.email ? (
              <Text style={{ fontSize: 9, color: colors.ink500 }}>{data.issuer.email}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.eyebrow}>INVOICE</Text>
            <Text style={[styles.reportTitle, { fontSize: 18 }]}>{data.invoiceNumber}</Text>
            <Text style={{ fontSize: 9, color: colors.ink500, marginTop: 4 }}>
              Issued: {data.issueDate}
            </Text>
            {data.dueDate ? (
              <Text style={{ fontSize: 9, color: colors.ink500 }}>Due: {data.dueDate}</Text>
            ) : null}
          </View>
        </View>

        {/* Bill-to */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.eyebrow}>BILL TO</Text>
          <Text style={{ fontSize: 12, fontWeight: 700, color: colors.ink900 }}>
            {data.billTo.companyName}
          </Text>
          {data.billTo.contactPerson ? (
            <Text style={{ fontSize: 10, color: colors.ink700 }}>{data.billTo.contactPerson}</Text>
          ) : null}
          {data.billTo.contactEmail ? (
            <Text style={{ fontSize: 10, color: colors.ink700 }}>{data.billTo.contactEmail}</Text>
          ) : null}
          {data.billTo.address ? (
            <Text style={{ fontSize: 10, color: colors.ink700 }}>{data.billTo.address}</Text>
          ) : null}
        </View>

        {/* Period summary */}
        <View
          style={{
            backgroundColor: colors.cobalt50,
            padding: 10,
            borderRadius: 6,
            marginBottom: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={styles.eyebrow}>SERVICE PERIOD</Text>
            <Text style={{ fontSize: 11, color: colors.ink900 }}>
              {data.rangeStart} — {data.rangeEnd}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.eyebrow}>REVIEWS / PROVIDERS</Text>
            <Text style={{ fontSize: 11, color: colors.ink900 }}>
              {data.reviewCount} reviews · {data.providerCount} providers
            </Text>
          </View>
        </View>

        {/* Line items table */}
        <View style={styles.invoiceTable}>
          <View style={styles.invoiceTableHeader}>
            <Text style={{ flex: 4 }}>Description</Text>
            <Text style={{ flex: 1, textAlign: 'right' }}>Qty</Text>
            <Text style={{ flex: 1.5, textAlign: 'right' }}>Unit Price</Text>
            <Text style={{ flex: 1.5, textAlign: 'right' }}>Total</Text>
          </View>
          {data.lineItems.map((li, i) => (
            <View key={i} style={styles.invoiceTableRow}>
              <Text style={{ flex: 4 }}>{li.description}</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>{li.quantity}</Text>
              <Text style={{ flex: 1.5, textAlign: 'right' }}>
                {fmtMoney(li.unitPrice, data.currency)}
              </Text>
              <Text style={{ flex: 1.5, textAlign: 'right' }}>
                {fmtMoney(li.lineTotal, data.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={{ marginTop: 12, paddingHorizontal: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', fontSize: 10 }}>
            <Text style={{ width: 110, textAlign: 'right', color: colors.ink500 }}>Subtotal:</Text>
            <Text style={{ width: 110, textAlign: 'right', color: colors.ink900 }}>
              {fmtMoney(data.subtotal, data.currency)}
            </Text>
          </View>
          {data.taxAmount > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', fontSize: 10, marginTop: 2 }}>
              <Text style={{ width: 110, textAlign: 'right', color: colors.ink500 }}>Tax:</Text>
              <Text style={{ width: 110, textAlign: 'right', color: colors.ink900 }}>
                {fmtMoney(data.taxAmount, data.currency)}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.totalRow,
              { borderTop: `1pt solid ${colors.ink200}`, marginTop: 6, paddingTop: 8 },
            ]}
          >
            <Text style={{ width: 110, textAlign: 'right', color: colors.ink500 }}>Total Due:</Text>
            <Text
              style={{
                width: 110,
                textAlign: 'right',
                color: colors.cobalt700,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {fmtMoney(data.totalAmount, data.currency)}
            </Text>
          </View>
        </View>

        {/* Payment block */}
        <View
          style={{
            marginTop: 30,
            padding: 12,
            border: `0.5pt solid ${colors.ink200}`,
            borderRadius: 6,
            backgroundColor: colors.ink100,
          }}
        >
          <Text style={styles.eyebrow}>PAYMENT INSTRUCTIONS</Text>
          {data.paymentLinkUrl ? (
            <Text style={{ fontSize: 10, color: colors.cobalt700, marginTop: 4 }}>
              Pay online: {data.paymentLinkUrl}
            </Text>
          ) : null}
          {data.issuer.address ? (
            <Text style={{ fontSize: 9, color: colors.ink600, marginTop: 4 }}>
              Or mail check to: {data.issuer.address}
            </Text>
          ) : null}
          {data.issuer.email ? (
            <Text style={{ fontSize: 9, color: colors.ink600 }}>
              Questions? {data.issuer.email}
            </Text>
          ) : null}
        </View>

        {data.notes ? (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.eyebrow}>NOTES</Text>
            <Text style={{ fontSize: 9, color: colors.ink600 }}>{data.notes}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
