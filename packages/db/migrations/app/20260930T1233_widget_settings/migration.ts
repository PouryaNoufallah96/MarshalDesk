#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1bee861835870bc1049d4db2e2add182abeecb62542734819fc787d8417b13d0/contract';
import startContract from '../../snapshots/1bee861835870bc1049d4db2e2add182abeecb62542734819fc787d8417b13d0/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/27110bc5899087831e3bf607bc6e68f1ddb630ea69fee986e3f38cffb6bbf475/contract';
import endContract from '../../snapshots/27110bc5899087831e3bf607bc6e68f1ddb630ea69fee986e3f38cffb6bbf475/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('agent_avatar_key', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('agent_enabled', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('agent_name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('allowed_domains', 'text[]', {
          notNull: true,
          default: lit([]),
          codecRef: { codecId: 'pg/text@1', many: true },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('color', 'text', {
          notNull: true,
          default: lit('blue'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('greeting', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'workspaces',
        column: col('position', 'text', {
          notNull: true,
          default: lit('bottom-right'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'workspaces',
        constraint: 'workspaces_allowed_domains_elem_not_null_50f9fffb',
        expression: 'array_position("allowed_domains", NULL) IS NULL',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'workspaces',
        constraint: 'workspaces_color_check_5299eb4e',
        expression: "\"color\" IN ('blue', 'indigo', 'violet', 'pink', 'red', 'orange', 'green')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'workspaces',
        constraint: 'workspaces_position_check_dbe7ba49',
        expression: "\"position\" IN ('bottom-left', 'bottom-right')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
