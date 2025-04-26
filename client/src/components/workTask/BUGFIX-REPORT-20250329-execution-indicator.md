# 工作任务执行状态显示修复报告

## 问题描述

在工作任务卡片中，当点击"执行任务"按钮启动任务执行时，执行状态指示器组件直接显示为API_CALLING阶段，跳过了PREPARING阶段。这在视觉上不够连贯，使用户无法看到完整的执行流程从头开始。

期望的行为是：任务开始执行时，执行状态指示器应该从第一个阶段（PREPARING）开始显示，然后再进入API_CALLING等后续阶段。

## 问题原因

问题出在WorkTaskCard.tsx文件中的`mapTaskStatusToExecutionPhase`函数：

```typescript
const mapTaskStatusToExecutionPhase = (status: string): ExecutionPhase => {
  switch (status) {
    case 'idle':
      return ExecutionPhase.IDLE;
    case 'running':
      return ExecutionPhase.API_CALLING; // 默认显示API调用中
    case 'completed':
      return ExecutionPhase.COMPLETED;
    case 'failed':
      return ExecutionPhase.ERROR;
    default:
      return ExecutionPhase.IDLE;
  }
};
```

当任务状态为'running'时，该函数将其映射到ExecutionPhase.API_CALLING，直接跳过了PREPARING阶段。

## 解决方案

修改`mapTaskStatusToExecutionPhase`函数，将'running'状态映射到ExecutionPhase.PREPARING而不是API_CALLING：

```typescript
const mapTaskStatusToExecutionPhase = (status: string): ExecutionPhase => {
  switch (status) {
    case 'idle':
      return ExecutionPhase.IDLE;
    case 'running':
      return ExecutionPhase.PREPARING; // 修改为从PREPARING开始，而不是直接跳到API_CALLING
    case 'completed':
      return ExecutionPhase.COMPLETED;
    case 'failed':
      return ExecutionPhase.ERROR;
    default:
      return ExecutionPhase.IDLE;
  }
};
```

这个修改只影响视觉展示，不改变实际的执行逻辑和数据流，因此非常安全和合理。

## 修复效果

修复后，当用户点击"执行任务"按钮时，执行状态指示器将显示从PREPARING阶段开始，让用户能够感知到任务执行是从头开始的，提供了更加连贯和直观的用户体验。

## 修复日期

2025年3月29日
