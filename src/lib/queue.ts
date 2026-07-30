import { Queue } from "bullmq";
import { Redis } from "ioredis";

export const redisConnection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const COMMENT_EVENTS_QUEUE = "comment-events";
export const ACTIONS_QUEUE = "actions";

export interface CommentEventJobData {
  accountExternalId: string;
  commentId: string;
  mediaId: string;
  text: string;
  fromId: string;
  fromUsername: string | null;
  raw: unknown;
}

export interface ActionJobData {
  eventId: string;
  automationId: string;
}

export const commentEventsQueue = new Queue<CommentEventJobData>(COMMENT_EVENTS_QUEUE, {
  connection: redisConnection,
});

export const actionsQueue = new Queue<ActionJobData>(ACTIONS_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5_000 },
  },
});
