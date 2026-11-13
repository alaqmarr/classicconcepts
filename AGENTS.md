<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Classic Concepts Plain-Language & Anti-AI-Pattern Rules

All customer answers, catalog search summaries, inline AI suggestions, product bullet points, and admin enquiry replies MUST follow `agents/ai-writing-rules.md` and `.agents/rules/plain-language-no-ai-patterns.md`:
- Write in **simple everyday layman English** so a customer who knows nothing about acrylic or manufacturing immediately understands.
- **Zero em-dashes (`—`), spaced en-dashes (` – `), or `--`** anywhere in AI or fallback copy.
- **Zero high-level English or robotic AI buzzwords** (`bespoke`, `elevate`, `delve`, `meticulous`, `unparalleled`, `seamless`, `state-of-the-art`, `cutting-edge`, `optical-grade`, `utilize`, `leverage`, `robust`, `consultative`, etc.).
- Both Client (`agents/client-support-agent.yaml`) and Admin (`agents/admin-copilot-agent.yaml`) agents are strictly locked to `claude-haiku-5-5` with separate API keys.
