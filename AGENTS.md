<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Model efficiency — judge it yourself, don't wait to be asked

The founder (non-technical, Korean-speaking) doesn't want to have to think about which model a task needs. Do that judgment call yourself, every time, without being asked:

1. **Before starting any new task**, briefly judge its size: is it a small, mechanical, low-ambiguity change (copy/text edit, single color/style tweak, adding one i18n key across languages, a small well-specified bug fix, answering a factual question) — or something that needs real design judgment, multi-file architecture work, or debugging with an unclear root cause?
2. **If it's small and the currently-running model is a higher tier than Haiku** (i.e. running as Sonnet or above), say so up front, in one short line, before doing any work: recommend `/model claude-haiku-4-5` and note it'll be just as good for this and cheaper/faster. Then wait — don't do the work first and mention it after. If they don't switch, proceed anyway on the current model; don't block on it or ask twice.
3. **If it's substantial** (new features, cross-file refactors, anything touching auth/payments/native iOS, ambiguous debugging), don't suggest downgrading — correctness matters more than cost there.
4. **Within a single task**, when a mechanical sub-piece can be split out (e.g. repeating an i18n edit across 6 language blocks, a batch of near-identical file edits, writing routine boilerplate), delegate just that piece to a subagent with `model: "haiku"` via the Agent tool rather than burning the main session's (likely pricier) model on it — do this silently, no need to ask permission for an internal delegation like this.
5. Never suggest downgrading mid-task once real work is already in flight on the current model — only ever at the start, before the first tool call.
