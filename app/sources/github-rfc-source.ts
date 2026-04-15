import type RfcGateway from '../gateways/rfc-gateway';
import type { JsonApiDocument, JsonApiResource } from '../gateways/rfc-gateway';
import type { RfcStatus } from '../models/rfc';

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: { login: string };
  labels: Array<{ name: string }>;
}

const GITHUB_API_URL =
  'https://api.github.com/repos/emberjs/rfcs/issues?state=all&per_page=100';

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
  return 'proposed';
}

export default class GitHubRfcSource implements RfcGateway {
  async fetchAll(): Promise<JsonApiDocument> {
    const response = await fetch(GITHUB_API_URL);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    const issues: GitHubIssue[] = await response.json();
    return this.#toDocument(issues);
  }

  async fetchOne(id: string): Promise<JsonApiDocument> {
    const response = await fetch(
      `https://api.github.com/repos/emberjs/rfcs/issues/${id}`,
    );
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    const issue: GitHubIssue = await response.json();
    return {
      data: this.#issueToResource(issue),
      included: [this.#authorResource(issue.user.login)],
    };
  }

  #issueToResource(issue: GitHubIssue): JsonApiResource {
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
        author: { data: { id: issue.user.login, type: 'author' } },
      },
    };
  }

  #authorResource(login: string): JsonApiResource {
    return {
      id: login,
      type: 'author',
      attributes: { name: login, 'github-handle': login },
    };
  }

  #toDocument(issues: GitHubIssue[]): JsonApiDocument {
    const data = issues.map((i) => this.#issueToResource(i));
    const seen = new Set<string>();
    const included: JsonApiResource[] = [];
    for (const issue of issues) {
      if (!seen.has(issue.user.login)) {
        seen.add(issue.user.login);
        included.push(this.#authorResource(issue.user.login));
      }
    }
    return { data, included };
  }
}
