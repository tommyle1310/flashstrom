import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaggedUsersToMessages1700000002000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages"
      ADD COLUMN IF NOT EXISTS "taggedUsers" text[] DEFAULT '{}';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "messages"
      DROP COLUMN IF EXISTS "taggedUsers";
    `);
  }
}
