import "server-only";
import {
  createTextSource,
  deleteAbandonedUpload,
  deleteSource as deleteSourceRecord,
  getSource as getSourceRecord,
  getSuggestedQuestions,
  hasKnowledge,
  listSourceChunks,
  listSources,
  markSourceFailed,
  type TextSourceSave,
  updateTextSource,
  upsertFileSource,
} from "@marshaldesk/db";
import {
  knowledgeErrors,
  SOURCE_FILE_TYPES,
  sourceFileExtension,
  sourceStorageKey,
} from "@marshaldesk/shared";
import { ORPCError } from "@orpc/server";
import { after } from "next/server";
import {
  requestSuggestedQuestions,
  requestTextIngest,
} from "@/lib/functions/client";
import {
  publishSourceDeleted,
  publishSourceUpdated,
  toSource,
} from "@/lib/knowledge/publish";
import { deleteUploadQuietly, presignUpload } from "@/lib/storage/uploads";
import { ownerProcedure } from "../procedures";

const INGEST_START_FAILED =
  "We couldn't start processing this source. Try saving it again.";

function notFound(): ORPCError<"NOT_FOUND", unknown> {
  return new ORPCError("NOT_FOUND", {
    message: knowledgeErrors.NOT_FOUND.message,
  });
}

/** Runs after the response, so the owner never waits on the ingest function. */
function ingestTextAfterResponse(
  workspaceId: string,
  save: TextSourceSave,
): void {
  const sourceId = save.source.id;
  after(async () => {
    if (await requestTextIngest(workspaceId, sourceId)) return;
    const failed = await markSourceFailed(
      workspaceId,
      sourceId,
      save.revision,
      INGEST_START_FAILED,
    );
    if (failed) {
      await publishSourceUpdated(workspaceId, toSource(failed));
    }
  });
}

export const get = ownerProcedure.knowledge.get.handler(async ({ context }) => {
  const [sources, suggestedQuestions, knowledge] = await Promise.all([
    listSources(context.workspaceId),
    getSuggestedQuestions(context.workspaceId),
    hasKnowledge(context.workspaceId),
  ]);
  return {
    sources: sources.map(toSource),
    suggestedQuestions,
    hasKnowledge: knowledge,
  };
});

export const getSource = ownerProcedure.knowledge.getSource.handler(
  async ({ context, input }) => {
    const record = await getSourceRecord(context.workspaceId, input.id);
    if (!record) {
      throw notFound();
    }
    return { ...toSource(record), text: record.text };
  },
);

export const createUpload = ownerProcedure.knowledge.createUpload.handler(
  async ({ context, input }) => {
    const extension = sourceFileExtension(input.name);
    if (!extension) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Use a PDF, Markdown or text file.",
      });
    }
    const mimeType = SOURCE_FILE_TYPES[extension];
    const { source, replaced } = await upsertFileSource(context.workspaceId, {
      name: input.name,
      size: input.size,
      mimeType,
      storageKeyFor: (id) =>
        sourceStorageKey(context.workspaceId, id, extension),
    });
    if (!source.storageKey) {
      throw new Error(`File source ${source.id} has no storage key`);
    }
    const upload = await presignUpload(source.storageKey, mimeType, input.size);
    const mapped = toSource(source);
    await publishSourceUpdated(context.workspaceId, mapped);
    return { source: mapped, ...upload, replaced };
  },
);

export const createText = ownerProcedure.knowledge.createText.handler(
  async ({ context, input }) => {
    const save = await createTextSource(context.workspaceId, input);
    const source = toSource(save.source);
    await publishSourceUpdated(context.workspaceId, source);
    ingestTextAfterResponse(context.workspaceId, save);
    return source;
  },
);

export const updateText = ownerProcedure.knowledge.updateText.handler(
  async ({ context, input }) => {
    const save = await updateTextSource(context.workspaceId, input.id, {
      title: input.title,
      text: input.text,
    });
    if (!save) {
      throw notFound();
    }
    const source = toSource(save.source);
    await publishSourceUpdated(context.workspaceId, source);
    ingestTextAfterResponse(context.workspaceId, save);
    return source;
  },
);

export const deleteSource = ownerProcedure.knowledge.deleteSource.handler(
  async ({ context, input }) => {
    const deleted = await deleteSourceRecord(context.workspaceId, input.id);
    if (!deleted) {
      throw notFound();
    }
    if (deleted.storageKey) {
      await deleteUploadQuietly(deleted.storageKey);
    }
    await publishSourceDeleted(context.workspaceId, deleted.id);
    after(() => requestSuggestedQuestions(context.workspaceId));
    return { id: deleted.id };
  },
);

export const abandonUpload = ownerProcedure.knowledge.abandonUpload.handler(
  async ({ context, input }) => {
    const deleted = await deleteAbandonedUpload(
      context.workspaceId,
      input.id,
      input.updatedAt,
    );
    if (!deleted) {
      return { deleted: false };
    }
    if (deleted.storageKey) {
      await deleteUploadQuietly(deleted.storageKey);
    }
    await publishSourceDeleted(context.workspaceId, input.id);
    return { deleted: true };
  },
);

export const listChunks = ownerProcedure.knowledge.listChunks.handler(
  async ({ context, input }) => {
    const source = await getSourceRecord(context.workspaceId, input.id);
    if (!source) {
      throw notFound();
    }
    return {
      chunks: await listSourceChunks(context.workspaceId, input.id),
    };
  },
);
