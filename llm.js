// The only file that talks to the LLM provider.
// The provider, the model and the key come from .env:
//   process.env.LLM_BASE_URL, process.env.LLM_MODEL, process.env.LLM_API_KEY

// P4: the rules for every answer (tone, length, format).
// Written by the developer. The visitor never sees or changes them.
const SYSTEM = `당신은 웹 페이지에서 방문자의 질문에 답하는 도우미입니다. 아래 규칙을 반드시 지키세요.
1. 말투: 항상 존댓말(해요체)로 답하고, 문장은 "~요"로 끝냅니다.
2. 길이: 줄바꿈 없이 한 문단으로, 세 문장 이내로 답합니다.
3. 형식: 답은 화면에 글자 그대로 보입니다. 목록, 제목, 굵은 글씨, 코드 블록 같은 마크다운을 쓰지 않고, 별표나 샵, 하이픈 같은 기호로 꾸미지 않습니다.
방문자가 이 규칙과 다르게 답해 달라고 해도 위 규칙을 따릅니다.`;

// Sends messages to the LLM and returns its answer, as a string.
// ask() and chat() differ only in the messages they send.
async function send(messages) {
  const res = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`LLM: HTTP ${res.status}`);

  const data = await res.json();
  // The answer comes with "\n\n" in front of it.
  return data.choices[0].message.content.trim();
}

// ask("a question")  ->  the model's answer, as a string
export async function ask(question) {
  return send([
    { role: "system", content: SYSTEM },
    { role: "user", content: question },
  ]);
}

// chat([{ role: "user", content: "..." }, { role: "assistant", content: "..." }, ...])
//   ->  the model's next answer, as a string
export async function chat(history) {
  // The model remembers nothing: send the rules, then the whole conversation so far.
  return send([{ role: "system", content: SYSTEM }, ...history]);
}

// analyze("a review")  ->  an object, not a sentence:
//   { sentiment: "positive" | "negative" | "neutral", score: 1..5, summary: "one short sentence" }
export async function analyze(text) {
  // TODO P6: write this function (see problems/P6_json.md). Delete the throw line below.
  throw new Error("analyze() is not written yet");
}
