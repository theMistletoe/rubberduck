import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, thinking }: { messages: UIMessage[]; thinking?: string } = await req.json();

  // thinkingが渡された場合はシステムプロンプトと組み合わせる
  const systemPrompt = `あなたは提示された文章の文脈や構造を理解し、理解しやすい形に構造化・整理することが得意です。出力するのはMarkdownのプレーンテキストです。`;

  // messagesが空の場合、thinkingを使用してメッセージを構築
  const finalMessages = messages.length > 0 
    ? convertToModelMessages(messages)
    : [
        {
          role: 'user' as const,
          content: `以下の文章の文脈を汲み取り、誤字脱字と推測される部分を適切に修正した上で、人間が理解しやすい形で構造化したMarkdown形式で出力してください。出力するのはあなたが整理したMarkdownプレーンテキストのみにしてください。「${thinking}」`,
        },
      ];

  const result = streamText({
    model: openai('gpt-5.2'),
    temperature: 0.7,
    system: systemPrompt,
    messages: finalMessages,
  });

  return result.toUIMessageStreamResponse();
}
