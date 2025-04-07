import { Admin } from './entities/admin.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { ApiResponse } from 'src/utils/createResponse';
import { AdminRepository } from './admin.repository';
import { UsersService } from '../users/users.service';
export declare class AdminService {
    private readonly adminRepository;
    private readonly usersService;
    constructor(adminRepository: AdminRepository, usersService: UsersService);
    create(createAdminDto: CreateAdminDto): Promise<ApiResponse<Admin>>;
    findAll(): Promise<ApiResponse<Admin[]>>;
    findOne(id: string): Promise<ApiResponse<Admin>>;
    findOneByUserId(userId: string): Promise<ApiResponse<Admin>>;
    updateEntityAvatar(uploadResult: {
        url: string;
        public_id: string;
    }, entityId: string): Promise<ApiResponse<any>>;
    update(id: string, updateAdminDto: UpdateAdminDto): Promise<ApiResponse<Admin>>;
    remove(id: string): Promise<ApiResponse<null>>;
}
