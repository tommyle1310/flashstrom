import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateChatroomsTimestamps1711965600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First check if columns exist
    const createdAtExists = await queryRunner.hasColumn(
      'chatrooms',
      'created_at'
    );
    const lastActivityExists = await queryRunner.hasColumn(
      'chatrooms',
      'last_activity'
    );

    if (!createdAtExists) {
      await queryRunner.query(
        `ALTER TABLE "chatrooms" ADD COLUMN "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
      );
    }

    if (!lastActivityExists) {
      await queryRunner.query(
        `ALTER TABLE "chatrooms" ADD COLUMN "last_activity" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chatrooms" DROP COLUMN "created_at"`);
    await queryRunner.query(
      `ALTER TABLE "chatrooms" DROP COLUMN "last_activity"`
    );
  }
}
