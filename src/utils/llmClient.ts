// src/utils/llmClient.ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function queryLLM(prompt: string) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini", // or gpt-4-mini if you want smaller/faster
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: 0.2,
  });

  return response.choices?.[0]?.message?.content ?? "";
}
