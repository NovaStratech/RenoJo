import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { QuoteTotals } from "@/lib/quotes/totals";

// Use built-in Helvetica to avoid network font fetches at runtime.
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 32,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  brand: { fontSize: 18, fontWeight: 700 },
  meta: { fontSize: 9, color: "#555" },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    marginTop: 12,
  },
  twoCol: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  block: { flex: 1 },
  table: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#ddd" },
  rowHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    paddingVertical: 4,
    fontWeight: 700,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 4,
  },
  cellDesc: { flex: 4, paddingRight: 4 },
  cellQty: { flex: 1, textAlign: "right" },
  cellUnit: { flex: 1, textAlign: "right" },
  cellPrice: { flex: 1.2, textAlign: "right" },
  cellLine: { flex: 1.3, textAlign: "right" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2 },
  totalsLabel: { width: 100, textAlign: "right", marginRight: 8, color: "#444" },
  totalsVal: { width: 80, textAlign: "right" },
  grand: { fontWeight: 700, fontSize: 12, marginTop: 4 },
  notes: { marginTop: 16, fontSize: 9, color: "#444" },
  footer: { marginTop: 24, fontSize: 8, color: "#888", textAlign: "center" },
});

export type QuoteLineRender = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  lineTotal: string;
  taxable: boolean;
};

export type QuotePdfProps = {
  locale: "fr" | "en";
  company: {
    businessName: string;
    legalName?: string | null;
    addressLine?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    phone?: string | null;
    email?: string | null;
    gstNumber?: string | null;
    qstNumber?: string | null;
  };
  client: {
    fullName: string;
    email: string;
    phone?: string | null;
    addressLine?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
  };
  quote: {
    number: string;
    issuedAt: Date;
    validUntil?: Date | null;
    notes?: string | null;
    terms?: string | null;
    currency: string;
  };
  lines: QuoteLineRender[];
  totals: QuoteTotals;
};

function fmt(n: string | number, currency: string) {
  const v = typeof n === "string" ? Number(n) : n;
  return `${v.toFixed(2)} ${currency}`;
}

export function QuotePdf(props: QuotePdfProps) {
  const { locale, company, client, quote, lines, totals } = props;
  const isFr = locale === "fr";
  const L = (fr: string, en: string) => (isFr ? fr : en);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{company.businessName}</Text>
            <Text style={styles.meta}>
              {[company.addressLine, company.city, company.province, company.postalCode]
                .filter(Boolean)
                .join(", ")}
            </Text>
            <Text style={styles.meta}>
              {[company.phone, company.email].filter(Boolean).join(" · ")}
            </Text>
            {(company.gstNumber || company.qstNumber) && (
              <Text style={styles.meta}>
                {company.gstNumber ? `TPS ${company.gstNumber}  ` : ""}
                {company.qstNumber ? `TVQ ${company.qstNumber}` : ""}
              </Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.sectionTitle}>
              {L("Devis", "Quote")} {quote.number}
            </Text>
            <Text style={styles.meta}>
              {L("Émis le", "Issued")}:{" "}
              {new Intl.DateTimeFormat(isFr ? "fr-CA" : "en-CA").format(
                quote.issuedAt,
              )}
            </Text>
            {quote.validUntil && (
              <Text style={styles.meta}>
                {L("Valide jusqu'au", "Valid until")}:{" "}
                {new Intl.DateTimeFormat(isFr ? "fr-CA" : "en-CA").format(
                  quote.validUntil,
                )}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>{L("Client", "Client")}</Text>
            <Text>{client.fullName}</Text>
            <Text style={styles.meta}>{client.email}</Text>
            {client.phone && <Text style={styles.meta}>{client.phone}</Text>}
            {client.addressLine && (
              <Text style={styles.meta}>{client.addressLine}</Text>
            )}
            <Text style={styles.meta}>
              {[client.city, client.province, client.postalCode]
                .filter(Boolean)
                .join(", ")}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.rowHead}>
            <Text style={styles.cellDesc}>{L("Description", "Description")}</Text>
            <Text style={styles.cellQty}>{L("Qté", "Qty")}</Text>
            <Text style={styles.cellUnit}>{L("Unité", "Unit")}</Text>
            <Text style={styles.cellPrice}>{L("Prix", "Price")}</Text>
            <Text style={styles.cellLine}>{L("Total", "Total")}</Text>
          </View>
          {lines.map((l, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cellDesc}>
                {l.description}
                {!l.taxable ? L("  (non taxable)", "  (non-taxable)") : ""}
              </Text>
              <Text style={styles.cellQty}>{l.quantity}</Text>
              <Text style={styles.cellUnit}>{l.unit}</Text>
              <Text style={styles.cellPrice}>{fmt(l.unitPrice, quote.currency)}</Text>
              <Text style={styles.cellLine}>{fmt(l.lineTotal, quote.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>{L("Sous-total", "Subtotal")}</Text>
            <Text style={styles.totalsVal}>{fmt(totals.subtotal, quote.currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>TPS (5%)</Text>
            <Text style={styles.totalsVal}>{fmt(totals.gst, quote.currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>TVQ (9.975%)</Text>
            <Text style={styles.totalsVal}>{fmt(totals.qst, quote.currency)}</Text>
          </View>
          <View style={[styles.totalsRow, styles.grand]}>
            <Text style={styles.totalsLabel}>{L("Total", "Total")}</Text>
            <Text style={styles.totalsVal}>{fmt(totals.total, quote.currency)}</Text>
          </View>
        </View>

        {quote.notes && (
          <View>
            <Text style={styles.sectionTitle}>{L("Notes", "Notes")}</Text>
            <Text style={styles.notes}>{quote.notes}</Text>
          </View>
        )}
        {quote.terms && (
          <View>
            <Text style={styles.sectionTitle}>{L("Conditions", "Terms")}</Text>
            <Text style={styles.notes}>{quote.terms}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          {L(
            "Merci de votre confiance — RenoJo",
            "Thank you for your business — RenoJo",
          )}
        </Text>
      </Page>
    </Document>
  );
}
