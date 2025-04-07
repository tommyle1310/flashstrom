import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from './entities/admin.entity';
// import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AdminRepository {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>
  ) {}

  async create(adminData: Partial<Admin>): Promise<Admin> {
    const newAdmin = this.adminRepository.create(adminData);
    return this.adminRepository.save(newAdmin);
  }

  async findAll(): Promise<Admin[]> {
    return this.adminRepository.find();
  }

  async findById(id: string): Promise<Admin | null> {
    return this.adminRepository.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: {
        user_id: { id: userId } // Nested condition to match User.id
      }
    });
  }

  async update(id: string, updateData: UpdateAdminDto): Promise<Admin> {
    // Create updateEntity without spreading user_id directly
    const { user_id, ...rest } = updateData as any;
    const updateEntity: Partial<Admin> = { ...rest };

    // If user_id is provided, convert it to a partial User object
    if (user_id) {
      updateEntity.user_id = { id: user_id } as User;
    }

    await this.adminRepository.update(id, updateEntity);

    // Fetch and return the updated admin with relations
    return await this.adminRepository.findOne({
      where: { id },
      relations: ['user_id'] // Include any other relations you need
    });
  }

  async delete(id: string): Promise<{ affected?: number }> {
    return this.adminRepository.delete(id);
  }
}
