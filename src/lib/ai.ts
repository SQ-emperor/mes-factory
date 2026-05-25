const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletion {
  id: string;
  choices: {
    message: { role: string; content: string };
    finish_reason: string;
  }[];
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY 未配置");
  }

  const res = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API 错误: ${res.status} ${err}`);
  }

  const data: ChatCompletion = await res.json();
  return data.choices[0]?.message?.content ?? "抱歉，我无法回答这个问题。";
}

export async function chatCompletionStream(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<ReadableStream<string>> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY 未配置");
  }

  const res = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API 错误: ${res.status} ${err}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<string>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          controller.close();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            controller.enqueue(content);
          }
        } catch {
          // skip malformed chunks
        }
      }
    },
  });
}
