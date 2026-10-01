#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8b101c65cbf915c98859bc7b75349fc6df2e44b4370997cdd0814bb6092d1d7c/contract';
import startContract from '../../snapshots/8b101c65cbf915c98859bc7b75349fc6df2e44b4370997cdd0814bb6092d1d7c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/dbe9e7c1297b919fc34f8581b338167cb4a39d72f6f51d27553b42d94af794cb/contract';
import endContract from '../../snapshots/dbe9e7c1297b919fc34f8581b338167cb4a39d72f6f51d27553b42d94af794cb/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'conversations',
        column: col('updated_at', 'timestamptz', {
          notNull: true,
          default: fn('now()'),
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
