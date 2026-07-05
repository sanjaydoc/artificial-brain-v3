// Robustly extracts and parses JSON from LLM output.
// Handles: <think> tags, ```json blocks, trailing text, truncated JSON.

export function extractJson(text) {
  let cleaned = String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').trim()

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  const jsonStr = cleaned.slice(start, end + 1)

  try {
    return JSON.parse(jsonStr)
  } catch {
    const fixed = jsonStr
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/'/g, '"')
      .replace(/(\w+):/g, '"$1":')
    try {
      return JSON.parse(fixed)
    } catch {
      return null
    }
  }
}
