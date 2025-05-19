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
    return this.adminRepository.findOne({
      where: { id },
      relations: ['user_id']
    });
  }

  async findByUserId(userId: string): Promise<Admin | null> {
    try {
      return this.adminRepository.findOne({
        where: {
          user_id: { id: userId } // Nested condition to match User.id
        },
        relations: ['user_id']
      });
    } catch (error) {
      console.error('Error in findByUserId:', error);
      // Fallback query if the nested query fails
      return this.adminRepository
        .createQueryBuilder('admin')
        .leftJoinAndSelect('admin.user_id', 'user')
        .where('user.id = :userId', { userId })
        .getOne();
    }
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
