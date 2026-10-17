export interface MigratedProjector {
  host: string;
  id?: string;
  name?: string;
  password?: string;
  protocol?: string;
  [key: string]: unknown;
}
export interface MigrationResult {
  config: {
    platform: string;
    name: string;
    projectors: MigratedProjector[];
    options: string[];
    [key: string]: unknown;
  };
  warnings: string[];
}
export function migrateConfig(input: unknown): MigrationResult;
