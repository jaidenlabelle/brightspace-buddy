import { LMStudioClient } from "@lmstudio/sdk";
const client = new LMStudioClient();

export async function testAI() {
  console.log("Testing AI integration...");
  const model = await client.llm.model("qwen3.5-9b-uncensored-hauhaucs-aggressive");
  const result = await model.respond("What is the meaning of life?");

  console.info("AI Response:", result.content);
}
