import { renderToBuffer } from "@react-pdf/renderer";
import { QuotePdf, type QuotePdfProps } from "./quote";

/** Render a quote PDF to a Buffer. Server-only. */
export async function renderQuotePdf(props: QuotePdfProps): Promise<Buffer> {
  return await renderToBuffer(<QuotePdf {...props} />);
}
