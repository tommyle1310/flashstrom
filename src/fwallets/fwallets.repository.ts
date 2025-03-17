import { Injectable } from '@nestjs/common';
import { Repository, EntityManager, UpdateResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FWallet } from './entities/fwallet.entity';
import { CreateFWalletDto } from './dto/create-fwallet.dto';
import { UpdateFwalletDto } from './dto/update-fwallet.dto';

@Injectable()
export class FWalletsRepository {
  constructor(
    @InjectRepository(FWallet)
    private repository: Repository<FWallet>
  ) {}

  async create(
    createDto: CreateFWalletDto,
    manager?: EntityManager
  ): Promise<FWallet> {
    const repo = manager ? manager.getRepository(FWallet) : this.repository;
    const wallet = repo.create(createDto);
    return await repo.save(wallet);
  }

  async findAll(manager?: EntityManager): Promise<FWallet[]> {
    const repo = manager ? manager.getRepository(FWallet) : this.repository;
    return await repo.find();
  }

  async findById(id: string, manager?: EntityManager): Promise<FWallet> {
    const repo = manager ? manager.getRepository(FWallet) : this.repository;
    return await repo.findOne({ where: { id } });
  }

  async findByUserId(
    userId: string,
    manager?: EntityManager
  ): Promise<FWallet> {
    const repo = manager ? manager.getRepository(FWallet) : this.repository;
    return await repo.findOne({ where: { user_id: userId } });
  }

  async findByCondition(
    condition: any,
    manager?: EntityManager
  ): Promise<FWallet> {
    const repo = manager ? manager.getRepository(FWallet) : this.repository;
    return await repo.findOne({ where: condition });
  }

  async update(
    id: string,
    updateDto: UpdateFwalletDto,
    manager?: EntityManager
  ): Promise<UpdateResult> {
    const repo = manager ? manager.getRepository(FWallet) : this.repository;
    const result = await repo.update(id, {
      ...updateDto,
      updated_at: Math.floor(Date.now() / 1000)
    });
    console.log('repository update result', result);
    return result;
  }

  async delete(id: string, manager?: EntityManager): Promise<boolean> {
    const repo = manager ? manager.getRepository(FWallet) : this.repository;
    const result = await repo.delete(id);
    return result.affected > 0;
  }
}
