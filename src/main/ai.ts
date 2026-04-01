import { Chat, LMStudioClient } from "@lmstudio/sdk";

const client = new LMStudioClient(  );

export async function testAI() {
  console.log("Testing AI integration...");
  const client = new LMStudioClient({
    baseUrl: "ws://24.246.0.21:1234",
  });

  const model = await client.llm.model("qwen3.5-9b-uncensored-hauhaucs-aggressive");
  const fileHandle = await client.files.prepareFile("Midterm Review.pdf");
  const parsedDocument = await client.files.parseDocument(fileHandle, {
    onParserLoaded: (parser) => {
      console.log(`Using parser: ${parser.library} v${parser.version}`);
    },
    onProgress: (progress) => {
      console.log(`Parsing: ${Math.round(progress * 100)}%`);
    }
  });
  console.log("Parsed Document Content:", parsedDocument.content);

  const result = await model.respond([
    { role: "user", content: "Summarize this document in a paragraph under 150 words please" },
    { role: "user", content: parsedDocument.content }
  ]);

  console.log("AI Response:", result.nonReasoningContent);
}
