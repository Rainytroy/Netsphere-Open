/**
 * 赋值节点测试脚本
 * 用于测试赋值节点处理器的重构
 */
import { WorkflowEngine } from '../WorkflowEngine';
import { ExecutionNode } from '../types';
import { AssignmentNodeHandler } from '../engine/nodes/AssignmentNode';

async function testAssignmentNode() {
  console.log('==== 开始测试赋值节点处理器 ====');

  // 测试数据
  const node: ExecutionNode = {
    id: 'assign-test-001',
    type: 'assign',
    name: '测试赋值节点',
    icon: null,
    status: 'waiting',
    config: {
      assignments: [
        {
          sourceVariable: null,
          targetVariable: '@gv_custom_12345_name-=',
          value: '测试值'
        },
        {
          sourceVariable: '@gv_custom_12345_name-=',
          targetVariable: '@gv_custom_67890_value-=',
          value: null
        }
      ],
      displayIdMap: {
        '@gv_custom_12345_name-=': '@变量.名称#1234',
        '@gv_custom_67890_value-=': '@变量.值#6789'
      }
    },
    nextNodeId: 'next-node-001',
    executionData: {}
  };

  // 初始变量状态
  const variables: Record<string, any> = {};
  let updatedVariables = { ...variables };

  // 变量更新函数
  const updateVariables = (newVars: Record<string, any>) => {
    console.log('变量已更新:', newVars);
    updatedVariables = newVars;
  };

  // 1. 使用旧的调用方式测试
  console.log('\n[测试1] 使用WorkflowEngine.executeAssignmentNode静态方法');
  const oldResult = await WorkflowEngine.executeAssignmentNode(
    node,
    variables,
    updateVariables
  );
  console.log('结果:', oldResult);
  console.log('变量状态:', updatedVariables);

  // 重置变量状态
  updatedVariables = { ...variables };

  // 2. 直接使用AssignmentNodeHandler测试
  console.log('\n[测试2] 直接使用AssignmentNodeHandler');
  const handler = new AssignmentNodeHandler();
  
  // 创建执行上下文
  const context = {
    variables: { ...variables },
    updateNode: (nodeId: string, updates: any) => {
      console.log(`节点${nodeId}已更新:`, updates);
    },
    moveToNextNode: (nodeId?: string) => {
      console.log(`移动到下一个节点: ${nodeId}`);
    },
    onError: (nodeId: string, error: Error) => {
      console.error(`节点${nodeId}执行出错:`, error);
    }
  };
  
  await handler.execute(node, context);
  console.log('变量状态:', context.variables);

  console.log('\n==== 赋值节点处理器测试完成 ====');
}

// 执行测试
testAssignmentNode().catch(console.error);

export default testAssignmentNode;
