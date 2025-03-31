export declare class CreateTransactionDto {
    user_id: string;
    fwallet_id: string;
    transaction_type: 'DEPOSIT' | 'WITHDRAW' | 'PURCHASE' | 'REFUND';
    amount: number;
    balance_after: number;
    status: 'PENDING' | 'CANCELLED' | 'FAILED' | 'COMPLETED';
    source: 'MOMO' | 'FWALLET';
    destination: string;
    destination_type: 'FWALLET' | 'TEMPORARY_WALLET_BALANCE';
}
