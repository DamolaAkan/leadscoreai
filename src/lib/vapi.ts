export async function placeOutboundCall({
  phoneNumber,
  prospectName,
  score,
  percentage,
  qualification,
  quizAnswersSummary,
  organizationName,
  responseId,
  organizationId,
  assistantId,
  phoneNumberId,
}: {
  phoneNumber: string;
  prospectName: string;
  score: number;
  percentage: number;
  qualification: string;
  quizAnswersSummary: string;
  organizationName: string;
  responseId: string;
  organizationId: string;
  assistantId: string;
  phoneNumberId: string;
}): Promise<string | null> {
  const firstName = prospectName.split(" ")[0];

  const tierLabel =
    ({
      HOT_LEAD: "Peak Performer",
      WARM_LEAD: "High Potential",
      COLD_LEAD: "Building Momentum",
      NOT_QUALIFIED: "Early Stage",
    } as Record<string, string>)[qualification] ?? "High Potential";

  const response = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId,
      assistantId,
      assistantOverrides: {
        variableValues: {
          firstName,
          score,
          percentage,
          tierLabel,
          organizationName,
          quizAnswersSummary,
        },
      },
      customer: {
        number: phoneNumber,
        name: firstName,
      },
      metadata: {
        responseId,
        organizationId,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[vapi] Call failed:", error);
    return null;
  }

  const data = await response.json();
  console.log("[vapi] Call placed successfully:", data.id);
  return data.id ?? null;
}
