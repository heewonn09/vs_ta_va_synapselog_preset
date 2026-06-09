export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { apiKey, action, nodes } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'Claude API 키가 필요해요' });
  if (!nodes?.length) return res.status(400).json({ error: 'nodes가 필요해요' });

  let userPrompt = '';

  if (action === 'summarize') {
    const n = nodes[0];
    userPrompt = `다음 노드의 내용을 분석하고 한국어로 답해주세요.

노드 제목: ${n.label}
내용:
${n.desc || '(내용 없음)'}

핵심 인사이트를 3~5개의 bullet point(•)로 간결하게 요약해주세요. 각 bullet은 한 문장으로 작성하세요.`;
  } else if (action === 'analyze') {
    const nodeList = nodes.map((n, i) => `[${i + 1}] ${n.label}\n${n.desc || '(내용 없음)'}`).join('\n\n');
    userPrompt = `다음 ${nodes.length}개의 노드들을 분석하고 한국어로 답해주세요.

${nodeList}

아래 형식으로 분석해주세요:
**공통 주제**: 노드들이 공유하는 핵심 주제나 개념
**연결 패턴**: 노드들 간의 관계나 흐름
**종합 인사이트**: 이 노드들을 통해 도출할 수 있는 통찰`;
  } else {
    return res.status(400).json({ error: '올바른 action이 아니에요 (summarize | analyze)' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Claude API 오류가 발생했어요' });
    }

    const data = await response.json();
    return res.status(200).json({ result: data.content[0].text });
  } catch(e) {
    return res.status(500).json({ error: e.message || '서버 오류가 발생했어요' });
  }
}
