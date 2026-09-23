declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { metrics, score } = await req.json();
    if (!metrics || !score) {
      return json({ error: 'metrics and score are required' }, 400);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return json({ error: 'OPENAI_API_KEY is not configured' }, 500);
    }

    const prompt = buildPrompt(metrics, score);

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You write short, specific, plain-language summaries of a developer\'s ' +
              'GitHub portfolio for other developers to read. 3-5 sentences. No fluff, ' +
              'no generic praise, reference the actual numbers given.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 300,
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      console.error('OpenAI error', aiRes.status, detail);
      return json({ error: 'AI report generation failed' }, 502);
    }

    const data = await aiRes.json();
    const report = data.choices?.[0]?.message?.content?.trim();
    if (!report) {
      return json({ error: 'AI report generation failed' }, 502);
    }

    return json({ report });
  } catch (err) {
    console.error(err);
    return json({ error: 'unexpected server error' }, 500);
  }
});

function buildPrompt(metrics: any, score: any) {
  const langs = (metrics.topLanguages ?? [])
    .map((l: any) => `${l.name} (${l.percentage}%)`)
    .join(', ');

  return [
    `Developer score: ${score.total}/100.`,
    `Breakdown: ${JSON.stringify(score.breakdown)}.`,
    `Total stars: ${metrics.totalStars}.`,
    `Active repos: ${metrics.activeRepoCount}.`,
    `Repos per year: ${metrics.reposPerYear}.`,
    langs ? `Top languages: ${langs}.` : '',
    'Write the report now.',
  ]
    .filter(Boolean)
    .join(' ');
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}