# Forth Decision Log

Use this file for durable product, architecture, security, data, and collaboration decisions. Do not use it as a work log or duplicate the backlog.

## How to add a decision

Add a dated entry before or with the implementing PR:

```markdown
## YYYY-MM-DD - Short decision title

- Status: proposed | accepted | superseded
- Context: What problem or constraint required a decision?
- Decision: What did we choose?
- Consequences: What becomes easier, harder, or intentionally unsupported?
- Related: TICKET-###, issue link, PR link
```

Changing an accepted decision requires a new entry that links to and supersedes the earlier decision. Never rewrite history to hide an earlier tradeoff.

## 2026-07-21 - Coordinate external contributions through backlog claims

- Status: accepted
- Context: Forth now has active stacked branches and an extensive production-readiness backlog. Helpful external contributions have overlapped changes already in progress and have been based on product behavior that changed before review.
- Decision: Contributors claim an existing backlog ticket or approved slice and wait for explicit scope confirmation before implementation. Draft PRs are encouraged after confirmation. The maintainer owns integration order, protected-path review, deployment, and release timing.
- Consequences: Contributors may wait briefly before coding, but duplicate work and unsafe architectural collisions should decrease. Useful overlapping commits may still be adapted or cherry-picked with authorship preserved.
- Related: TICKET-019, PR #18
