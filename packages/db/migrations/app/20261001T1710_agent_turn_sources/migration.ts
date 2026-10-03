#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/03b4d18c4c12d27f10c77614849db9aa63f231a9d418922ebcaed75c7597b7a4/contract';
import startContract from '../../snapshots/03b4d18c4c12d27f10c77614849db9aa63f231a9d418922ebcaed75c7597b7a4/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b759717b02b8c792c5847b3548a557441861ec4a6ba83f65a527fd9c1ec8adc5/contract';
import endContract from '../../snapshots/b759717b02b8c792c5847b3548a557441861ec4a6ba83f65a527fd9c1ec8adc5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'agent_turns',
        column: col('source_ids', 'uuid[]', {
          notNull: true,
          default: lit([]),
          codecRef: { codecId: 'pg/uuid@1', many: true },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'agent_turns',
        constraint: 'agent_turns_source_ids_elem_not_null_d911fb98',
        expression: 'array_position("source_ids", NULL) IS NULL',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
