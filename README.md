# linked

Fast LinkedIn CLI — read, post, message, and network from your terminal. Built for humans and AI agents.

> **Warning**: This project uses LinkedIn's internal Voyager API (the same API the LinkedIn webapp uses). LinkedIn can change endpoints and anti-bot behavior at any time. This is not officially supported by LinkedIn. Use at your own risk and respect LinkedIn's Terms of Service.

## Install

```bash
npm install -g @anthropic/linked
```

Or with pnpm:

```bash
pnpm add -g @anthropic/linked
```

## Authentication

`linked` uses cookie-based auth (the same way the LinkedIn web app works). You need two cookies:

- **`li_at`** — Your main session token
- **`JSESSIONID`** — Used as the CSRF token

### Option 1: Environment Variables (recommended for CI/agents)

```bash
export LINKEDIN_LI_AT="your-li-at-cookie"
export LINKEDIN_JSESSIONID="your-jsessionid-cookie"
```

### Option 2: Config File

Create `~/.config/linked/config.json5`:

```json5
{
  li_at: "your-li-at-cookie",
  jsessionid: "your-jsessionid-cookie",
}
```

### Option 3: Browser Cookie Extraction

`linked` can auto-extract cookies from Safari, Chrome, or Firefox on macOS:

```bash
linked whoami  # Will auto-detect cookies from your browser
linked whoami --cookie-source chrome  # Force a specific browser
```

### How to get your cookies manually

1. Log into [linkedin.com](https://www.linkedin.com) in your browser
2. Open DevTools (F12) → Application → Cookies → `https://www.linkedin.com`
3. Copy the values for `li_at` and `JSESSIONID`

## Usage

### Identity

```bash
linked whoami                              # Show logged-in account info
linked help [command]                      # Help for a command
```

### Profiles

```bash
linked profile <username-or-url>           # View a LinkedIn profile
linked profile <username> --json           # JSON output
linked profile <username> --contact        # Show contact info
```

### Feed

```bash
linked feed [-n count]                     # Home feed
linked feed --json                         # JSON output
linked read <post-url-or-urn>              # Read a single post
```

### Posts

```bash
linked post "Hello LinkedIn!"              # Create a text post
linked comment <post-url-or-urn> "Great!"  # Comment on a post
linked react <post-url-or-urn>             # Like (default)
linked react <post-url-or-urn> --type celebrate  # React with type
linked unreact <post-url-or-urn>           # Remove reaction
```

### Search

```bash
linked search "machine learning" [-n 5]           # Search people (default)
linked search "machine learning" --type posts      # Search posts
linked search "Google" --type companies            # Search companies
linked search "senior engineer" --type jobs        # Search jobs
```

### Connections

```bash
linked connections [-n 20]                 # List connections
linked connect <username> ["message"]      # Send connection request
linked connect --withdraw <username>       # Withdraw request
linked invitations                         # List pending invitations
linked invitations --sent                  # List sent invitations
linked accept <invitation-id>              # Accept invitation
linked reject <invitation-id>              # Reject invitation
```

### Messaging

```bash
linked inbox [-n 10]                       # List conversations
linked messages <conversation-id>          # Read messages
linked send <username> "Hello!"            # Send a message
linked send --conversation <id> "Reply"    # Reply in conversation
```

### Notifications

```bash
linked notifications [-n 10]               # List notifications
```

### Companies

```bash
linked company <slug-or-url>               # View company info
linked company <slug> --json               # JSON output
```

### Jobs

```bash
linked jobs "software engineer" [-n 10]    # Search jobs
linked jobs --id <job-id>                  # View specific job
```

### Analytics

```bash
linked views                               # Who viewed my profile
linked network                             # Network stats
```

## Output Modes

All commands support these output flags:

- **Default**: Colored, formatted terminal output with hyperlinks
- **`--json`**: Clean JSON output (normalized, camelCase fields)
- **`--json-full`**: Full raw API response (for debugging)
- **`--plain`**: No colors, no hyperlinks (for piping)

## Library Usage

`linked` works as both a CLI and an importable TypeScript/JavaScript library:

```typescript
import { LinkedInClient, resolveCredentials } from '@anthropic/linked';

const cookies = resolveCredentials({ cookieSource: 'chrome' });
const client = new LinkedInClient({ cookies });

const profile = await client.getProfile('satyanadella');
console.log(profile.headline);

const feed = await client.getFeed({ count: 10 });
for (const item of feed) {
  console.log(item.authorName, item.text);
}
```

## Configuration

Global config: `~/.config/linked/config.json5`
Local config: `./.linkedrc.json5` (overrides global)

```json5
{
  // Authentication
  li_at: "your-token",
  jsessionid: "your-session",
  cookieSource: "chrome",  // safari, chrome, firefox

  // Defaults
  timeoutMs: 30000,
  defaultCount: 10,
  delayMs: 500,
}
```

## Development

```bash
pnpm install
pnpm run dev -- whoami          # Run in dev mode
pnpm test                       # Run tests
pnpm run build                  # Build to dist/
pnpm run lint                   # Lint with Biome
```

## License

MIT
