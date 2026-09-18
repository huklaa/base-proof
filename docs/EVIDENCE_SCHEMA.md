# GitHub Evidence Schema v1

The current GitHub adapter canonicalizes an object with this logical shape:

```json
{
  "version": 1,
  "source": "github",
  "repository": "owner/repo",
  "pullRequest": {
    "number": 123,
    "url": "https://github.com/owner/repo/pull/123",
    "title": "...",
    "author": "login",
    "state": "open|closed",
    "merged": false,
    "headSha": "...",
    "baseSha": "...",
    "additions": 0,
    "deletions": 0,
    "changedFiles": 0,
    "createdAt": "...",
    "updatedAt": "...",
    "mergedAt": null
  },
  "commits": [],
  "reviews": [],
  "checks": []
}
```

## Canonicalization rules

1. Object keys are sorted lexicographically at every object depth.
2. Array order is preserved.
3. Primitive values are encoded with JSON semantics.
4. The final canonical string is UTF-8 encoded.
5. `evidenceHash = keccak256(canonicalUtf8Bytes)`.

## Source ID

For GitHub PRs:

```
source = "github:<owner>/<repo>#<pull_number>"
sourceId = keccak256(utf8(source))
```

## Snapshot semantics

Evidence is a snapshot, not a permanent claim about future state.

If a PR receives a new review, commit, CI result, or merge state after an earlier snapshot, a new evidence object may correctly produce a different evidence hash while retaining the same source ID.
