// Vercel Serverless Function：DeepSeek 占卜解读代理
// 与前端同域，彻底规避浏览器 CORS 限制；API Key 仅存在于服务端环境变量，不进前端包。
// 环境变量：DEEPSEEK_API_KEY（在 Vercel 项目 Settings → Environment Variables 配置）

export const config = { runtime: 'edge' }

type DrawnLite = {
  position: 'situation' | 'obstacle' | 'advice'
  nameZh: string
  nameEn: string
  orientation: 'upright' | 'reversed'
}

const SYSTEM_PROMPT = `你是一位隐居于星空深处的灵视塔罗占卜师。你精通神秘学与古典塔罗牌意。
你的说话风格神秘、优雅、充满仪式感，善于运用富有哲理和疗愈感的词汇（如：星辰的轨迹、能量的流动、命运的低语）。

核心要求：
在接下来的回答中，你必须化身为这位占卜师，直接与屏幕前的求问者对话。
你的【summary（综合解读）】的第一句话，必须直接提及并正面回应求问者提出的具体问题（例如：“关于你所祈问的『...』，星盘的能量已经凝聚...”），严禁使用死板的牌意拼接套话！你要把三张牌作为一个整体的故事，来解答他这个核心问题。

请严格按照以下 JSON 格式回复，不要包含任何多余的解释文字：
{
  "summary": "这里填写你对这位求问者问题的专属深度综合解答，字数在300字左右，必须充满神秘占卜师一针见血又富有疗愈感的对话语气...",
  "finalAdvice": "这里填写你针对他的问题，给他的具体行动指引与避坑建议..."
}`

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405)
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return json({ error: '服务端未配置 DEEPSEEK_API_KEY' }, 500)
  }

  let payload: { question?: string; cards?: DrawnLite[] }
  try {
    payload = await req.json()
  } catch {
    return json({ error: '请求体解析失败' }, 400)
  }

  const question = (payload.question ?? '').toString()
  const cards = Array.isArray(payload.cards) ? payload.cards : []

  const cardsText = cards
    .map((c) => {
      const pos =
        c.position === 'situation' ? '【现状】' : c.position === 'obstacle' ? '【阻碍】' : '【建议】'
      const name = c.nameZh ? `${c.nameZh}（${c.nameEn}）` : c.nameEn || ''
      return `${pos}: ${name} ${c.orientation === 'upright' ? '正位' : '逆位'}`
    })
    .join('\n')

  try {
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `求问者的问题："${question || '未明确具体提问，求问近期综合启示'}"\n\n抽出的牌阵数据：\n${cardsText}`,
          },
        ],
      }),
    })

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '')
      return json({ error: `DeepSeek 请求失败 (HTTP ${upstream.status})`, detail: errText.slice(0, 300) }, 502)
    }

    const data = await upstream.json()
    const raw: string = data?.choices?.[0]?.message?.content ?? ''
    if (!raw.trim()) return json({ error: 'DeepSeek 返回内容为空' }, 502)

    // 加固解析：剥离 markdown 围栏，截取最外层 {...}
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
    const s = cleaned.indexOf('{')
    const e = cleaned.lastIndexOf('}')
    const slice = s >= 0 && e > s ? cleaned.slice(s, e + 1) : cleaned
    const parsed = JSON.parse(slice)

    if (!parsed.summary || !parsed.finalAdvice) {
      return json({ error: 'DeepSeek 返回缺少 summary / finalAdvice 字段' }, 502)
    }

    return json({ summary: parsed.summary, finalAdvice: parsed.finalAdvice }, 200)
  } catch (err) {
    return json({ error: '解读生成异常', detail: String(err).slice(0, 300) }, 502)
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
