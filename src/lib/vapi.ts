const VAPI_BASE = "https://api.vapi.ai";

interface PlaceCallParams {
  apiKey: string;
  phoneNumberId: string;
  customerPhone: string;
  assistantConfig: {
    firstMessage: string;
    systemPrompt: string;
    voiceId: string;
    voiceProvider: string;
  };
  metadata?: Record<string, string>;
}

interface VapiCallResponse {
  id: string;
  status: string;
  [key: string]: unknown;
}

export async function placeOutboundCall({
  apiKey,
  phoneNumberId,
  customerPhone,
  assistantConfig,
  metadata,
}: PlaceCallParams): Promise<VapiCallResponse> {
  const body = {
    phoneNumberId,
    customer: {
      number: customerPhone,
    },
    assistant: {
      firstMessage: assistantConfig.firstMessage,
      model: {
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        messages: [
          {
            role: "system",
            content: assistantConfig.systemPrompt,
          },
        ],
      },
      voice: {
        provider: assistantConfig.voiceProvider,
        voiceId: assistantConfig.voiceId,
      },
      endCallFunctionEnabled: true,
      recordingEnabled: true,
    },
    metadata: metadata || {},
  };

  console.log("[vapi] Request body:", JSON.stringify(body, null, 2));

  const res = await fetch(`${VAPI_BASE}/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Vapi API error ${res.status}: ${errorBody}`);
  }

  return res.json();
}
