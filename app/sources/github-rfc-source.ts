import type RfcGateway from '../gateways/rfc-gateway';
import type {
  JsonApiCollectionDocument,
  JsonApiSingularDocument,
  JsonApiResource,
} from '../gateways/rfc-gateway';
import type { RfcStatus } from '../models/rfc';

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: { login: string } | null; // null for deleted GitHub accounts
  labels: Array<{ name: string }>;
}

// Unauthenticated requests are rate-limited to 60 req/hr by GitHub.
// Pass a personal access token via Authorization header to raise the limit to 5000 req/hr.
const GITHUB_API_URL =
  'https://api.github.com/repos/emberjs/rfcs/issues?state=all&per_page=100';

const FETCH_TIMEOUT_MS = 10_000;

function mapStatus(issue: GitHubIssue): RfcStatus {
  const labelNames = issue.labels.map((l) => l.name.toLowerCase());
  if (labelNames.some((l) => l.includes('s-released'))) return 'released';
  if (
    labelNames.some(
      (l) => l.includes('s-recommended') || l.includes('s-ready for release'),
    )
  )
    return 'accepted';
  if (labelNames.some((l) => l.includes('s-discontinued'))) return 'closed';
  // No matching stage label — open issues without a label are treated as proposed
  return 'proposed';
}

export default class GitHubRfcSource implements RfcGateway {
  async fetchAll(): Promise<JsonApiCollectionDocument> {
    const { signal, clear } = this.#makeTimeout();
    try {
      const response = await fetch(GITHUB_API_URL, { signal });
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
      const issues = await this.#parseJson<GitHubIssue[]>(response);
      if (issues.length === 100) {
        console.warn(
          'GitHubRfcSource: received exactly 100 issues — results may be truncated ' +
            '(GitHub API per_page limit is 100 items per request).',
        );
      }
      return this.#toDocument(issues);
    } finally {
      clear();
    }
  }

  async fetchOne(id: string): Promise<JsonApiSingularDocument> {
    const { signal, clear } = this.#makeTimeout();
    try {
      const response = await fetch(
        `https://api.github.com/repos/emberjs/rfcs/issues/${id}`,
        { signal },
      );
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
      const issue = await this.#parseJson<GitHubIssue>(response);
      const login = issue.user?.login ?? 'unknown';
      return {
        data: this.#issueToResource(issue),
        included: [this.#authorResource(login)],
      };
    } finally {
      clear();
    }
  }

  #makeTimeout(): { signal: AbortSignal; clear: () => void } {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    return { signal: controller.signal, clear: () => clearTimeout(id) };
  }

  async #parseJson<T>(response: Response): Promise<T> {
    try {
      return (await response.json()) as T;
    } catch (e) {
      throw new Error(
        `GitHubRfcSource: failed to parse response from ${response.url}: ${String(e)}`,
      );
    }
  }

  #issueToResource(issue: GitHubIssue): JsonApiResource {
    const login = issue.user?.login ?? 'unknown';
    return {
      id: String(issue.number),
      type: 'rfc',
      attributes: {
        title: issue.title,
        number: issue.number,
        status: mapStatus(issue),
        summary: issue.body ?? '',
      },
      relationships: {
        author: { data: { id: login, type: 'author' } },
      },
    };
  }

  #authorResource(login: string): JsonApiResource {
    return {
      id: login,
      type: 'author',
      // GitHub Issues API does not return display names; name falls back to login
      attributes: { name: login, 'github-handle': login },
    };
  }

  #toDocument(issues: GitHubIssue[]): JsonApiCollectionDocument {
    const data = issues.map((i) => this.#issueToResource(i));
    const seen = new Set<string>();
    const included: JsonApiResource[] = [];
    for (const issue of issues) {
      const login = issue.user?.login ?? 'unknown';
      if (!seen.has(login)) {
        seen.add(login);
        included.push(this.#authorResource(login));
      }
    }
    return { data, included };
  }
}
