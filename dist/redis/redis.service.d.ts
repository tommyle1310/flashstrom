export declare class RedisService {
    private client;
    private isConnecting;
    constructor();
    connect(): Promise<void>;
    getClient(): any;
    setNx(key: string, value: string, ttl: number): Promise<boolean>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<void>;
    quit(): Promise<void>;
}
