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

// P6: the rules for analyze(). The answer is data for our code, not a sentence for a person.
const SYSTEM_JSON = `당신은 상품 후기를 분석하는 도구입니다. 사용자가 보낸 후기를 읽고 JSON 객체 하나로만 답합니다. JSON 앞뒤에 다른 글이나 마크다운 코드 블록을 붙이지 않습니다.
키는 정확히 아래 세 개만 씁니다. 키 이름을 바꾸거나 다른 키를 더하지 않습니다.
- "sentiment": 후기의 감정. "positive", "negative", "neutral" 셋 중 하나의 문자열입니다.
- "score": 후기의 만족도. 1 이상 5 이하의 정수입니다. 따옴표나 "점" 같은 단위를 붙이지 않은 숫자로 씁니다.
- "summary": 후기를 요약한 짧은 한 문장의 문자열입니다. 후기와 같은 언어로 씁니다.
예: {"sentiment": "positive", "score": 5, "summary": "가격 대비 만족스럽고 소리와 배터리 성능도 좋은 제품입니다."}`;

// Sends messages to the LLM and returns its answer, as a string.
// `extra` goes into the request body next to model and messages (P6: response_format).
async function send(messages, extra = {}) {
  const res = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      messages,
      ...extra,
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
  const content = await send(
    [
      { role: "system", content: SYSTEM_JSON },
      { role: "user", content: text },
    ],
    { response_format: { type: "json_object" } },
  );

  // content is still a string: turn it into an object first.
  const { sentiment, score, summary } = JSON.parse(content) ?? {};

  // Do not trust the model's answer any more than user input: check the shape.
  const ok =
    ["positive", "negative", "neutral"].includes(sentiment) &&
    Number.isInteger(score) &&
    score >= 1 &&
    score <= 5 &&
    typeof summary === "string";
  if (!ok) throw new Error("LLM: the answer has the wrong shape");

  return { sentiment, score, summary };
}
