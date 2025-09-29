# Branch protection (GitHub)

Recommended settings for `main`:
- Require a pull request before merging
- Require approvals: 1+
- Require status checks to pass before merging:
  - ci
  - release-tag (optional)
  - monitor (optional)
- Dismiss stale pull request approvals when new commits are pushed
- Require branches to be up to date before merging
- Restrict who can push to matching branches: on (optional)

Apply in: Settings → Branches → Add rule → Branch name pattern: `main`.
