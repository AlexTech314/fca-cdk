import { subscriberRepository } from '../repositories/subscriber.repository';
import type { SubscribeInput, SubscriberQuery } from '../models/subscriber.model';

export const subscriberService = {
  async list(query: SubscriberQuery) {
    return subscriberRepository.findMany(query);
  },

  async subscribe(data: SubscribeInput) {
    return subscriberRepository.subscribe(data);
  },

  async unsubscribe(email: string) {
    return subscriberRepository.unsubscribe(email);
  },

  async delete(id: string) {
    return subscriberRepository.delete(id);
  },

  async getActiveCount() {
    return subscriberRepository.getActiveCount();
  },
};
