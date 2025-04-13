import { WorkflowStructure } from '../types';

/**
 * 测试工作流数据 - 包含所有节点类型的简单工作流
 */
export const demoWorkflowStructure: WorkflowStructure = {
  nodes: [
    {
      id: 'start-1',
      type: 'start',
      name: '起点卡',
      config: {
        prompt: '请输入您的需求'
      }
    },
    {
      id: 'worktask-1',
      type: 'workTask',
      name: '需求处理任务',
      config: {
        taskName: '需求分析任务',
        npcId: 'npc-1',
        npcName: '分析师小助手',
        taskId: 'task-1'
      }
    },
    {
      id: 'display-1',
      type: 'display',
      name: '分析结果展示',
      config: {
        template: `# 需求分析结果

## 您的原始需求
@workflow.startinput

## 分析结果
1. 您的需求已经被我们的分析师小助手处理完成
2. 我们可以为您提供多种解决方案
3. 请查看下面的详细方案`
      }
    },
    {
      id: 'assignment-1',
      type: 'assignment',
      name: '结果保存',
      config: {
        assignments: [
          {
            sourceVariable: '@workflow.startinput',
            targetVariable: '@workflow.savedInput'
          }
        ]
      }
    },
    {
      id: 'loop-1',
      type: 'loop',
      name: '循环处理',
      config: {
        conditionType: 'runCount',
        conditionConfig: {
          maxRuns: 3
        }
      }
    },
    {
      id: 'display-2',
      type: 'display',
      name: '最终结果',
      config: {
        template: `# 处理完成

感谢您的耐心等待，工作流已经执行完毕。

您的原始输入：@workflow.startinput

已保存到系统中，后续处理将基于此内容进行。`
      }
    }
  ],
  connections: [
    {
      id: 'conn-1',
      sourceNodeId: 'start-1',
      targetNodeId: 'worktask-1'
    },
    {
      id: 'conn-2',
      sourceNodeId: 'worktask-1',
      targetNodeId: 'display-1'
    },
    {
      id: 'conn-3',
      sourceNodeId: 'display-1',
      targetNodeId: 'assignment-1'
    },
    {
      id: 'conn-4',
      sourceNodeId: 'assignment-1',
      targetNodeId: 'loop-1'
    },
    {
      id: 'conn-5',
      sourceNodeId: 'loop-1',
      targetNodeId: 'worktask-1',
      label: 'yes'
    },
    {
      id: 'conn-6',
      sourceNodeId: 'loop-1',
      targetNodeId: 'display-2',
      label: 'no'
    }
  ]
};

/**
 * 演示工作流
 */
export const demoWorkflow = {
  id: 'demo-1',
  name: '演示工作流',
  description: '这是一个演示工作流，包含所有节点类型的简单示例',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};
