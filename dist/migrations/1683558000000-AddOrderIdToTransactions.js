"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddOrderIdToTransactions1683558000000 = void 0;
class AddOrderIdToTransactions1683558000000 {
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "transactions" ADD COLUMN "order_id" VARCHAR(255)`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "order_id"`);
    }
}
exports.AddOrderIdToTransactions1683558000000 = AddOrderIdToTransactions1683558000000;
//# sourceMappingURL=1683558000000-AddOrderIdToTransactions.js.map