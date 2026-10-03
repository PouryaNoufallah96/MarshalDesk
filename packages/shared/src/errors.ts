import { error } from "@orpc/contract";
import * as z from "zod";
import { conversationStateSchema } from "./schemas/conversation";

export const UnauthorizedError = error("UNAUTHORIZED", {
  message: "Sign in to continue.",
});
export const EmailNotVerifiedError = error("EMAIL_NOT_VERIFIED", {
  message: "Verify your email to continue.",
});
export const WorkspaceRequiredError = error("WORKSPACE_REQUIRED", {
  message: "Name your business to continue.",
});
export const AvatarRejectedError = error("AVATAR_REJECTED", {
  message: "That image couldn't be used.",
});
export const VisitorUnauthorizedError = error("VISITOR_UNAUTHORIZED", {
  message: "Your chat session has expired.",
});
export const DomainNotAllowedError = error("DOMAIN_NOT_ALLOWED", {
  message: "The widget isn't allowed on this website.",
});
export const ConversationNotFoundError = error("NOT_FOUND", {
  message: "This conversation doesn't exist.",
});
export const ConversationConflictError = error("CONFLICT", {
  message: "This conversation changed. Refresh to see its current state.",
  data: z.object({ state: conversationStateSchema }),
});
export const SourceNotFoundError = error("NOT_FOUND", {
  message: "This source doesn't exist.",
});
export const WidgetNotFoundError = error("NOT_FOUND", {
  message: "This widget doesn't exist.",
});
export const NoConversationError = error("NOT_FOUND", {
  message: "There's no conversation to follow yet.",
});

export const signedInErrors = {
  [UnauthorizedError.code]: UnauthorizedError,
  [EmailNotVerifiedError.code]: EmailNotVerifiedError,
};

export const ownerErrors = {
  ...signedInErrors,
  [WorkspaceRequiredError.code]: WorkspaceRequiredError,
};

export const avatarErrors = {
  ...ownerErrors,
  [AvatarRejectedError.code]: AvatarRejectedError,
};

export const visitorErrors = {
  [VisitorUnauthorizedError.code]: VisitorUnauthorizedError,
  [DomainNotAllowedError.code]: DomainNotAllowedError,
};

export const conversationErrors = {
  ...ownerErrors,
  [ConversationNotFoundError.code]: ConversationNotFoundError,
  [ConversationConflictError.code]: ConversationConflictError,
};

export const sourceErrors = {
  ...ownerErrors,
  [SourceNotFoundError.code]: SourceNotFoundError,
};
