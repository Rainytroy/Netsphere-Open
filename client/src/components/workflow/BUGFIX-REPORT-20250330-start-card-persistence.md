# 起点卡保存问题修复

## 问题描述

工作流编辑器中，自动添加的起点卡在保存后会丢失，导致加载工作流时画布为空。

## 问题原因分析

经过详细分析日志和代码，发现以下两个关键问题：

1. **React状态更新延迟**：在`WorkflowEditorContext.tsx`中，起点卡添加后使用`setTimeout`延迟调用`handleNodesChange`，导致React状态可能未及时更新就执行了保存操作。

2. **保存数据准备逻辑缺乏保障**：在`WorkflowDataHandler.ts`中，没有针对起点卡缺失的检查机制，导致即使UI中起点卡未正确保存，也没有自动补偿措施。

## 修复方案

### 1. 修复WorkflowEditorContext.tsx中的状态更新

```diff
- // 调用handleNodesChange确保状态更新通知到父组件
- setTimeout(() => {
-   handleNodesChange([startNode]);
- }, 10);
+ // 直接调用handleNodesChange进行状态更新，不使用setTimeout
+ // 这确保状态更新立即进行并同步完成
+ handleNodesChange([startNode]);
```

### 2. 修复WorkflowDataHandler.ts中的数据准备逻辑

增加了对起点卡的检查和自动添加逻辑：

```javascript
// 安全检查：确保至少有一个起点卡，如果没有则自动添加
let cleanedNodes = [...validNodes];

// 检查是否有起点卡
const hasStartNode = validNodes.some(node => node.type === 'start');

if (validNodes.length === 0) {
  console.warn(`[WorkflowDataHandler] 警告: 没有有效节点，添加默认起点卡`);
  // 添加默认起点卡
  cleanedNodes = [{
    id: `start-${Date.now()}`,
    type: 'start',
    position: { x: 300, y: 200 },
    data: {
      label: '起点',
      id: 'start',
      type: 'process',
      title: '起点',
      description: '工作流起点',
      config: {
        promptText: '这是工作流的起点'
      }
    }
  }];
} else if (!hasStartNode) {
  console.warn(`[WorkflowDataHandler] 警告: 工作流中没有起点卡，添加默认起点卡`);
  // 添加默认起点卡
  cleanedNodes.push({
    id: `start-${Date.now()}`,
    type: 'start',
    position: { x: 300, y: 200 },
    data: {
      label: '起点',
      id: 'start',
      type: 'process',
      title: '起点',
      description: '工作流起点',
      config: {
        promptText: '这是工作流的起点'
      }
    }
  });
}
```

另外，确保使用包含自动添加起点卡的节点列表来计算边的有效性。

## 效果

1. 起点卡现在能够立即被同步到React状态中
2. 即使状态未及时更新，保存时也会自动检查并添加起点卡
3. 提高了日志详细程度，便于排查问题

## 总结

这个修复通过双重保障机制解决了起点卡保存问题：一方面改进了React状态更新机制，另一方面在数据处理层增加了额外的安全检查，确保工作流始终包含必要的起点卡。
