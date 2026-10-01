#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/03b4d18c4c12d27f10c77614849db9aa63f231a9d418922ebcaed75c7597b7a4/contract';
import endContract from '../../snapshots/03b4d18c4c12d27f10c77614849db9aa63f231a9d418922ebcaed75c7597b7a4/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/dbe9e7c1297b919fc34f8581b338167cb4a39d72f6f51d27553b42d94af794cb/contract';
import startContract from '../../snapshots/dbe9e7c1297b919fc34f8581b338167cb4a39d72f6f51d27553b42d94af794cb/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'messages',
        constraint: 'messages_classification_check_2bc1fc42',
      }),
      this.createTable({
        schema: 'public',
        table: 'agent_turns',
        columns: [
          col('chunk_ids', 'uuid[]', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/uuid@1', many: true },
          }),
          col('classification', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('classifier_model', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('conversation_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('error', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('first_token_ms', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('handoff_reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('latency_ms', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('message_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('model', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('outcome', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reply_message_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('scores', 'float8[]', {
            notNull: true,
            default: lit([]),
            codecRef: { codecId: 'pg/float8@1', many: true },
          }),
          col('tokens_in', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('tokens_out', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'agent_turns_chunk_ids_elem_not_null_32a7e526',
            'array_position("chunk_ids", NULL) IS NULL',
          ),
          checkExpression(
            'agent_turns_classification_check_2c7798de',
            "\"classification\" IN ('support_question', 'small_talk', 'off_topic', 'human_request')",
          ),
          checkExpression(
            'agent_turns_handoff_reason_check_ae20b9e1',
            "\"handoff_reason\" IN ('low_confidence', 'no_relevant_knowledge', 'visitor_requested', 'agent_off')",
          ),
          checkExpression(
            'agent_turns_outcome_check_91d3b97c',
            "\"outcome\" IN ('answered', 'small_talk', 'declined', 'handoff', 'discarded', 'failed')",
          ),
          checkExpression(
            'agent_turns_scores_elem_not_null_0d0de0bd',
            'array_position("scores", NULL) IS NULL',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'chunks',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('embedding', 'vector(1024)', {
            notNull: true,
            codecRef: { codecId: 'pg/vector@1', typeParams: { length: 1024 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('position', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('source_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('token_count', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'sources',
        columns: [
          col('chunk_count', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('error', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('ingested_etag', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('mime_type', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('revision', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('size', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('storage_key', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('text', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('workspace_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('sources_kind_check_6299d266', "\"kind\" IN ('file', 'text')"),
          checkExpression(
            'sources_status_check_fde2d523',
            "\"status\" IN ('uploaded', 'processing', 'ready', 'failed')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('suggested_questions', 'text[]', {
          notNull: true,
          default: lit([]),
          codecRef: { codecId: 'pg/text@1', many: true },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'messages',
        constraint: 'messages_classification_check_2c7798de',
        expression:
          "\"classification\" IN ('support_question', 'small_talk', 'off_topic', 'human_request')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'workspaces',
        constraint: 'workspaces_suggested_questions_elem_not_null_4bc52d93',
        expression: 'array_position("suggested_questions", NULL) IS NULL',
      }),
      this.createIndex({
        schema: 'public',
        table: 'agent_turns',
        index: 'agent_turns_message_id_idx_8a7ff1ba',
        columns: ['message_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'agent_turns',
        index: 'agent_turns_workspace_id_created_at_idx_3f0db799',
        columns: ['workspace_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'agent_turns',
        index: 'agent_turns_workspace_id_idx_90a9f461',
        columns: ['workspace_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'chunks',
        index: 'chunks_source_id_idx_b2d19e21',
        columns: ['source_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'chunks',
        index: 'chunks_source_id_position_idx_6221f888',
        columns: ['source_id', 'position'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'chunks',
        index: 'chunks_workspace_id_idx_90a9f461',
        columns: ['workspace_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sources',
        index: 'sources_one_file_per_name_53efca60',
        columns: ['workspace_id', 'name'],
        extras: { where: "(kind = 'file')", unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'sources',
        index: 'sources_workspace_id_created_at_idx_3f0db799',
        columns: ['workspace_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sources',
        index: 'sources_workspace_id_idx_90a9f461',
        columns: ['workspace_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'agent_turns',
        foreignKey: {
          name: 'agent_turns_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'agent_turns',
        foreignKey: {
          name: 'agent_turns_message_id_fkey',
          columns: ['message_id'],
          references: { schema: 'public', table: 'messages', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'chunks',
        foreignKey: {
          name: 'chunks_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'chunks',
        foreignKey: {
          name: 'chunks_source_id_fkey',
          columns: ['source_id'],
          references: { schema: 'public', table: 'sources', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sources',
        foreignKey: {
          name: 'sources_workspace_id_fkey',
          columns: ['workspace_id'],
          references: { schema: 'public', table: 'workspaces', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      // The contract can't declare HNSW indexes yet, so this one is hand-written.
      this.createIndex({
        schema: 'public',
        table: 'chunks',
        index: 'chunks_embedding_hnsw_idx',
        expression: '"embedding" vector_cosine_ops',
        extras: { type: 'hnsw' },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
