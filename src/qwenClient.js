import { Client, handle_file } from "@gradio/client";

const GRADIO_URL =
  "https://62bcde7d528eec37d5.gradio.live";
   
let clientPromise = null;

function getQwenClient() {
  if (!clientPromise) {
    clientPromise = Client.connect(GRADIO_URL);
  }

  return clientPromise;
}

export async function askQwen(imageFile, question) {
  if (!imageFile) {
    throw new Error("No satellite image was provided.");
  }

  if (!question?.trim()) {
    throw new Error("No question was provided.");
  }

  const client = await getQwenClient();

  const result = await client.predict("/predict", {
    image: handle_file(imageFile),
    question: question.trim(),
  });

  const answer = result?.data?.[0];

  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("The VLM returned an empty response.");
  }

  return answer.trim();
}