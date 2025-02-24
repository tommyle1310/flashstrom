import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.userRepository.create(userData);
    return this.userRepository.save(newUser);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async update(id: string, updateData: UpdateUserDto): Promise<void> {
    // Convert UpdateUserDto to the correct type expected by TypeORM
    const sanitizedData = {
      ...updateData,
      verification_code: updateData.verification_code
        ? parseInt(updateData.verification_code)
        : undefined
    } as Partial<User>;

    await this.userRepository.update(id, sanitizedData);
  }

  async delete(id: string): Promise<{ affected?: number }> {
    return this.userRepository.delete(id);
  }

  async findOne(condition: { [key: string]: any }): Promise<User | null> {
    return this.userRepository.findOne({ where: condition });
  }
}
