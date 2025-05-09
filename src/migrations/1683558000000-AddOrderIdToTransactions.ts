import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderIdToTransactions1683558000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" ADD COLUMN "order_id" VARCHAR(255)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP COLUMN "order_id"`
    );
  }
}
