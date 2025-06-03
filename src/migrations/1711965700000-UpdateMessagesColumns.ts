import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMessagesColumns1711965700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First check if columns exist with snake_case names
    const hasRoomId = await queryRunner.hasColumn('messages', 'room_id');
    const hasSenderId = await queryRunner.hasColumn('messages', 'sender_id');
    const hasSenderType = await queryRunner.hasColumn(
      'messages',
      'sender_type'
    );
    const hasMessageType = await queryRunner.hasColumn(
      'messages',
      'message_type'
    );
    const hasReadBy = await queryRunner.hasColumn('messages', 'read_by');

    // Add missing columns or rename existing ones
    if (!hasRoomId) {
      await queryRunner.query(
        `ALTER TABLE "messages" ADD COLUMN "room_id" UUID REFERENCES "chatrooms"(id)`
      );
    }

    if (!hasSenderId) {
      await queryRunner.query(
        `ALTER TABLE "messages" ADD COLUMN "sender_id" VARCHAR(255)`
      );
    }

    if (!hasSenderType) {
      await queryRunner.query(
        `ALTER TABLE "messages" ADD COLUMN "sender_type" VARCHAR(255)`
      );
    }

    if (!hasMessageType) {
      await queryRunner.query(
        `ALTER TABLE "messages" ADD COLUMN "message_type" VARCHAR(255) DEFAULT 'TEXT'`
      );
    }

    if (!hasReadBy) {
      await queryRunner.query(
        `ALTER TABLE "messages" ADD COLUMN "read_by" TEXT[] DEFAULT '{}'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "room_id"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "sender_id"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "sender_type"`);
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN "message_type"`
    );
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "read_by"`);
  }
}
