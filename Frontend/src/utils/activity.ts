import { Activity, ActivityType } from '@/src/types';

type ActivityDescription = {
  title: string;
  detail?: string;
};

function label(value: unknown) {
  return typeof value === 'string' ? value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Unknown';
}

export function formatActivity(activity: Activity): ActivityDescription {
  const { actor, meta, type } = activity;
  const actorName = actor.name;

  switch (type) {
    case ActivityType.STATUS_CHANGED:
      return { title: `${actorName} changed status`, detail: `${label(meta.before)} → ${label(meta.after)}` };
    case ActivityType.PRIORITY_CHANGED:
      return { title: `${actorName} changed priority`, detail: `${label(meta.before)} → ${label(meta.after)}` };
    case ActivityType.ASSIGNEE_CHANGED: {
      const previousAssignee = meta.beforeName ?? (meta.before ? 'another user' : null);
      const nextAssignee = meta.afterName ?? (meta.after ? 'another user' : null);
      if (!nextAssignee) return { title: `${actorName} unassigned this issue` };
      if (previousAssignee) return { title: `${actorName} reassigned this issue from ${previousAssignee} to ${nextAssignee}` };
      return { title: `${actorName} assigned this issue to ${nextAssignee}` };
    }
    case ActivityType.COMMENT_ADDED: {
      const snippet = typeof meta.snippet === 'string' ? meta.snippet.trim() : '';
      return { title: `${actorName} commented`, detail: snippet ? snippet.slice(0, 40) + (snippet.length > 40 ? '…' : '') : undefined };
    }
    case ActivityType.ISSUE_CREATED:
      return { title: `${actorName} created this issue` };
    default:
      return { title: `${actorName} updated this issue` };
  }
}

export function formatRelativeTime(timestamp: string) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (elapsedSeconds < 60) return 'just now';
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
}
