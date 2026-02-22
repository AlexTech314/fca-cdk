import { locationRepository } from '../repositories/location.repository';

export const locationService = {
  async search(q: string, type: 'city' | 'state' | 'both' = 'both', limit = 10) {
    const result: {
      cities?: Array<{ id: number; name: string; stateId: string; stateName: string }>;
      states?: Array<{ id: string; name: string }>;
    } = {};

    if (type === 'city' || type === 'both') {
      const cities = await locationRepository.searchCities(q, limit);
      result.cities = cities.map((c) => ({
        id: c.id,
        name: c.name,
        stateId: c.stateId,
        stateName: c.state.name,
      }));
    }

    if (type === 'state' || type === 'both') {
      const states = await locationRepository.searchStates(q, limit);
      result.states = states.map((s) => ({ id: s.id, name: s.name }));
    }

    return result;
  },

  async getAllStates() {
    return locationRepository.getAllStates();
  },

  async getCitiesByState(stateId: string) {
    return locationRepository.getCitiesByState(stateId);
  },
};
