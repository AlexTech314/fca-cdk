import { sellerIntakeRepository } from '../repositories/seller-intake.repository';
import type { SellerIntakeInput, UpdateSellerIntakeInput, SellerIntakeQuery } from '../models/seller-intake.model';

export const sellerIntakeService = {
  async list(query: SellerIntakeQuery) {
    return sellerIntakeRepository.findMany(query);
  },

  async getById(id: string) {
    return sellerIntakeRepository.findById(id);
  },

  async create(data: SellerIntakeInput) {
    return sellerIntakeRepository.create(data);
  },

  async update(id: string, data: UpdateSellerIntakeInput) {
    return sellerIntakeRepository.update(id, data);
  },

  async getStatusCounts() {
    return sellerIntakeRepository.getStatusCounts();
  },
};
