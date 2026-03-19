type InvoiceEmailInput = {
  to: string;
  memberName: string;
  gymName: string;
  invoiceNumber: string;
  description: string;
  amountCents: number;
  dueDate: string;
  notes?: string | null;
};

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountCents / 100);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendInvoiceEmail(input: InvoiceEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVOICE_FROM_EMAIL;
  const replyTo = process.env.INVOICE_REPLY_TO;

  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and INVOICE_FROM_EMAIL are required to email invoices.");
  }

  const dueDate = new Date(input.dueDate).toLocaleDateString();
  const subject = `${input.gymName} invoice ${input.invoiceNumber}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827">
      <p style="font-size:14px;color:#4b5563;margin:0 0 16px">Hi ${escapeHtml(input.memberName)},</p>
      <h1 style="font-size:24px;margin:0 0 16px">${escapeHtml(input.gymName)} invoice</h1>
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px">
          <span>Invoice number</span>
          <strong>${escapeHtml(input.invoiceNumber)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px">
          <span>Description</span>
          <strong>${escapeHtml(input.description)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px">
          <span>Amount due</span>
          <strong>${escapeHtml(formatCurrency(input.amountCents))}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px">
          <span>Due date</span>
          <strong>${escapeHtml(dueDate)}</strong>
        </div>
      </div>
      <p style="font-size:14px;line-height:1.6;margin:0 0 12px">
        Payment is collected in person by cash at the gym. Please bring this invoice number with you when paying.
      </p>
      ${
        input.notes
          ? `<p style="font-size:14px;line-height:1.6;margin:0 0 12px"><strong>Notes:</strong> ${escapeHtml(input.notes)}</p>`
          : ""
      }
      <p style="font-size:14px;line-height:1.6;margin:0;color:#4b5563">
        Thanks,<br />${escapeHtml(input.gymName)}
      </p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      reply_to: replyTo ? [replyTo] : undefined,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Invoice email failed: ${message}`);
  }
}
