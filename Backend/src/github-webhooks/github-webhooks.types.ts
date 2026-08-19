export interface GithubWebhookJob {
  deliveryId: string;
  event: string;
  rawPayload: string;
}

export interface GithubPullRequestWebhookPayload {
  action: string;
  repository?: { full_name?: string };
  pull_request?: {
    number?: number;
    title?: string;
    html_url?: string;
    user?: { login?: string };
  };
  requested_reviewer?: { login?: string };
  sender?: { login?: string };
}
