import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActionCodeToChatbotResponses1700000001000
  implements MigrationInterface
{
  name = 'AddActionCodeToChatbotResponses1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add action_code column to chatbot_responses table
    await queryRunner.query(`
      ALTER TABLE "chatbot_responses" 
      ADD COLUMN "action_code" varchar(100)
    `);

    // Update the response_type enum to include 'ACTION'
    await queryRunner.query(`
      ALTER TYPE "chatbot_responses_response_type_enum" 
      ADD VALUE IF NOT EXISTS 'ACTION'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove action_code column
    await queryRunner.query(`
      ALTER TABLE "chatbot_responses" 
      DROP COLUMN "action_code"
    `);

    // Note: PostgreSQL doesn't support removing enum values directly
    // You would need to recreate the enum type to remove 'ACTION'
    // For now, we'll leave the enum value as it won't cause issues
  }
}
