import { Repository } from 'typeorm';
import { Admin } from './entities/admin.entity';
import { UpdateAdminDto } from './dto/update-admin.dto';
export declare class AdminRepository {
    private adminRepository;
    constructor(adminRepository: Repository<Admin>);
    create(adminData: Partial<Admin>): Promise<Admin>;
    findAll(): Promise<Admin[]>;
    findById(id: string): Promise<Admin | null>;
    findByUserId(userId: string): Promise<Admin | null>;
    update(id: string, updateData: UpdateAdminDto): Promise<void>;
    delete(id: string): Promise<{
        affected?: number;
    }>;
}
