import { ECSClient, StopTaskCommand } from '@aws-sdk/client-ecs';
import type { TaskListQuery } from '../repositories/task.repository';
import { taskRepository } from '../repositories/task.repository';

const clusterArn = process.env.PIPELINE_CLUSTER_ARN ?? '';

export const taskService = {
  async list(query: TaskListQuery) {
    return taskRepository.findMany(query);
  },

  async getById(id: string) {
    return taskRepository.findById(id);
  },

  async cancel(id: string) {
    const task = await taskRepository.findById(id);
    if (!task) return null;
    if (task.status !== 'running' && task.status !== 'pending') {
      throw new Error(`Task cannot be cancelled (status: ${task.status})`);
    }
    if (!task.taskArn) {
      await taskRepository.updateStatus(id, 'cancelled');
      return taskRepository.findById(id);
    }
    if (!clusterArn) {
      throw new Error('PIPELINE_CLUSTER_ARN not configured');
    }
    const ecs = new ECSClient({});
    await ecs.send(
      new StopTaskCommand({
        cluster: clusterArn,
        task: task.taskArn,
        reason: 'Cancelled via API',
      })
    );
    await taskRepository.updateStatus(id, 'cancelled');
    return taskRepository.findById(id);
  },
};
