import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { generateInvoiceNumber } from "@/lib/invoice-utils";

export async function POST() {
  const supabase = createServiceClient();
  const today = new Date();
  const currentDay = today.getUTCDate();

  // Fetch active recurring templates due today
  const { data: templates, error: fetchError } = await supabase
    .from("recurring_invoices")
    .select("*, client:invoice_clients(*)")
    .eq("is_active", true)
    .eq("send_day", currentDay);

  if (fetchError) {
    console.error("[invoices/process-recurring] Fetch error:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!templates || templates.length === 0) {
    return NextResponse.json({ processed: 0, message: "No templates due today" });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const template of templates) {
    try {
      // Check if already sent this month
      const monthStart = new Date(today.getUTCFullYear(), today.getUTCMonth(), 1).toISOString();
      if (template.last_sent_at && template.last_sent_at >= monthStart) {
        continue; // Already generated this month
      }

      // Get next invoice number
      const { data: lastInvoice } = await supabase
        .from("invoices")
        .select("invoice_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const invoiceNumber = generateInvoiceNumber(lastInvoice?.invoice_number ?? null);

      // Calculate due date (14 days from issue)
      const dueDate = new Date(today);
      dueDate.setUTCDate(dueDate.getUTCDate() + 14);

      // Create invoice from template
      const { error: insertError } = await supabase
        .from("invoices")
        .insert({
          client_id: template.client_id,
          invoice_number: invoiceNumber,
          issue_date: today.toISOString().split("T")[0],
          due_date: dueDate.toISOString().split("T")[0],
          line_items: template.line_items,
          subtotal: template.subtotal,
          currency: template.currency,
          bank_details: template.bank_details,
          notes: template.notes,
          status: "draft",
          is_recurring: true,
          recurring_template_id: template.id,
        });

      if (insertError) {
        errors.push(`Template ${template.id}: ${insertError.message}`);
        continue;
      }

      // Update last_sent_at
      await supabase
        .from("recurring_invoices")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("id", template.id);

      processed++;
      console.log(`[invoices/process-recurring] Generated ${invoiceNumber} for client ${template.client_id}`);
    } catch (err) {
      errors.push(`Template ${template.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({ processed, errors });
}
