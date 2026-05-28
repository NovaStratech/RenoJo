export type LineInput = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxable: boolean;
};

export type QuoteTotals = {
  subtotal: number;
  taxableBase: number;
  gst: number;
  qst: number;
  total: number;
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeLineTotal(line: LineInput): number {
  return round2(line.quantity * line.unitPrice);
}

export function computeQuoteTotals(
  lines: LineInput[],
  rates: { gstRate: number; qstRate: number },
): QuoteTotals {
  let subtotal = 0;
  let taxableBase = 0;
  for (const l of lines) {
    const total = computeLineTotal(l);
    subtotal += total;
    if (l.taxable) taxableBase += total;
  }
  subtotal = round2(subtotal);
  taxableBase = round2(taxableBase);
  const gst = round2(taxableBase * rates.gstRate);
  const qst = round2(taxableBase * rates.qstRate);
  const total = round2(subtotal + gst + qst);
  return { subtotal, taxableBase, gst, qst, total };
}
