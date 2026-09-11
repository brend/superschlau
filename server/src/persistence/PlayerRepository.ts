import { DatabaseSync } from 'node:sqlite';

export interface PersistedPlayer {
  playerId: string;
  displayName: string;
  mapKey: string;
  x: number;
  y: number;
  facing: string;
}

export class PlayerRepository {
  private readonly database: DatabaseSync;

  constructor(databasePath: string) {
    this.database = new DatabaseSync(databasePath, {
      timeout: 5_000,
    });

    this.database.exec(`
            CREATE TABLE IF NOT EXISTS players (
                player_id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                map_key TEXT NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                facing TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) STRICT
       `);
  }

  findById(playerId: string): PersistedPlayer | undefined {
    const row = this.database
      .prepare(
        `
      SELECT
        player_id AS playerId,
        display_name AS displayName,
        map_key AS mapKey,
        x,
        y,
        facing
      FROM players
      WHERE player_id = ?
    `,
      )
      .get(playerId) as unknown as PersistedPlayer | undefined;

    if (!row) {
      return undefined;
    }

    return {
      playerId: row.playerId,
      displayName: row.displayName,
      mapKey: row.mapKey,
      x: row.x,
      y: row.y,
      facing: row.facing,
    };
  }

  save(player: PersistedPlayer): void {
    this.database
      .prepare(
        `
        INSERT INTO players (
          player_id,
          display_name,
          map_key,
          x,
          y,
          facing
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(player_id) DO UPDATE SET
          display_name = excluded.display_name,
          map_key = excluded.map_key,
          x = excluded.x,
          y = excluded.y,
          facing = excluded.facing,
          updated_at = CURRENT_TIMESTAMP
      `,
      )
      .run(player.playerId, player.displayName, player.mapKey, player.x, player.y, player.facing);
  }

  close(): void {
    this.database.close();
  }
}
