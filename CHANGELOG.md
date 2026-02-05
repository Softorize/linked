# Changelog

## 0.1.0 (2024-01-01)

### Features

- Initial release
- Cookie-based authentication (env vars, config file, browser extraction)
- Profile viewing (`whoami`, `profile`)
- Feed reading (`feed`, `read`)
- Post creation (`post`)
- Engagement (`comment`, `react`, `unreact`)
- Search (`search` — people, posts, companies, jobs, groups)
- Connection management (`connections`, `connect`)
- Invitation management (`invitations`, `accept`, `reject`)
- Messaging (`inbox`, `messages`, `send`)
- Notifications (`notifications`)
- Company lookup (`company`)
- Job search (`jobs`)
- Analytics (`views`, `network`)
- Output modes: human-readable, `--json`, `--json-full`, `--plain`
- Library usage via `LinkedInClient` class
- Exponential backoff retry on rate limits and transient errors
- macOS browser cookie extraction (Safari, Chrome, Firefox)
