// @ts-nocheck
import axios from "axios";
import _ from "lodash";
import sanitizeApiResponse from "./sanitizeApiResponse";
import logger from "./logger";
import type { StrapiContext } from "../types/strapi";
import type { SlackBlock, SlackMessage } from "../types/external";

interface SlackEntry {
  id: number;
  title?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

type SlackMessageType = "form" | "additionRequest" | "editRequest" | "comment";

type MessageHandler = (
  ctx: StrapiContext,
  entry: SlackEntry
) => Promise<SlackMessage>;

const getKeyValFields = (entry: Record<string, unknown>): SlackBlock["fields"] => {
  const keyVal = Object.entries(entry).map(([key, value]) => ({
    type: "mrkdwn" as const,
    text: `*${_.capitalize(key)}*\n ${value}`,
  }));
  return keyVal;
};

const formSubmission: MessageHandler = async (ctx, entry) => {
  // @ts-expect-error - strapi is a global in Strapi apps
  const formSubmitted = await strapi.db.query("api::form.form").findOne({
    where: { id: ctx.params.id },
  });
  const fields = getKeyValFields(entry.data || {});
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":mailbox: *Form submission received* :mailbox:\n",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Form: ${_.startCase(
          (formSubmitted?.name || "").replace("-", " ")
        )}* \n <https://nomadapp-api.herokuapp.com/admin/content-manager/collectionType/api::form-submission.form-submission/${
          entry.id
        }|View submission>`,
      },
    },
    {
      type: "section",
      fields,
    },
  ];
  return { blocks };
};

const additionRequest: MessageHandler = async (_ctx, entry) => {
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":round_pushpin: *Addition request received* :round_pushpin: \n",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Title: ${_.startCase(
          entry.title || ""
        )}* \n <https://nomadapp-api.herokuapp.com/admin/content-manager/collectionType/api::addition-request.addition-request/${
          entry.id
        }|View addition request>`,
      },
    },
  ];
  return { blocks };
};

const editRequest: MessageHandler = async (_ctx, entry) => {
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":pencil: *Edit request received* :pencil: \n",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<https://nomadapp-api.herokuapp.com/admin/content-manager/collectionType/api::edit-request.edit-request/${entry.id}|View edit request>`,
      },
    },
  ];
  return { blocks };
};

const comment: MessageHandler = async (_ctx, entry) => {
  const blocks: SlackBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":speech_balloon: *Comment posted* :speech_balloon: \n",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Title: ${_.startCase(
          entry.title || ""
        )}* \n <https://nomadapp-api.herokuapp.com/admin/content-manager/collectionType/api::comment.comment/${
          entry.id
        }|View comment>`,
      },
    },
  ];
  return { blocks };
};

const getSlackMessageForDataType = (type: SlackMessageType): MessageHandler | undefined => {
  switch (type) {
    case "form":
      return formSubmission;
    case "additionRequest":
      return additionRequest;
    case "editRequest":
      return editRequest;
    case "comment":
      return comment;
    default:
      return undefined;
  }
};

interface StrapiEntityResponse {
  data: {
    id: number;
    attributes: Record<string, unknown>;
  } | null;
}

export const sendEntryToSlack = async (
  entry: StrapiEntityResponse,
  type: SlackMessageType,
  ctx: StrapiContext
): Promise<void> => {
  const sanitizedEntry = sanitizeApiResponse(entry) as SlackEntry | undefined;
  if (sanitizedEntry) {
    const messageHandler = getSlackMessageForDataType(type);
    if (messageHandler) {
      const message = await messageHandler(ctx, sanitizedEntry);
      try {
        await axios.post(
          process.env.SLACK_FORM_WEBHOOK_URL || "",
          message,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      } catch (e) {
        logger.warn("Error sending to Slack", {
          error: e,
        });
      }
    }
  }
};
