# BUGFIX 报告: 工作任务变量显示改进

## 问题描述

在工作任务表单右侧的变量面板存在两个问题：

1. **值显示超出两行**：当变量值较长时需要确保只显示最多两行并截断，避免面板项目高度过高
2. **变量列表去重逻辑不一致**：与全局变量表格（`VariableTable`）组件使用的去重方法不同，导致显示不一致

## 原因分析

1. 对于值显示问题：已有样式限制为两行，但需要确保样式的一致应用
2. 对于去重逻辑问题：`AvailableVariablePanel`组件中没有实现与`VariableTable`组件相同的以`identifier`为键的去重逻辑

## 解决方案

### 1. 确保值显示最多两行

经过检查，`VariableList`组件中已经包含了限制文本为两行的样式设置：
```jsx
<Text 
  type="secondary" 
  style={{ 
    display: '-webkit-box', 
    WebkitLineClamp: 2, 
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    fontSize: '12px'
  }}
>
  {variable.value || '(空值)'}
</Text>
```

这个样式配置能够实现：
- 将文本限制为最多2行
- 超出部分显示省略号
- 防止单个变量项占用过高的垂直空间

### 2. 统一变量去重逻辑

在`AvailableVariablePanel`组件中实现与`VariableTable`相同的去重逻辑：

```typescript
// 使用Map来确保唯一性，以identifier为键，保持与VariableTable相同的去重逻辑
const uniqueVars = new Map<string, VariableView>();

// 添加所有变量，仅保留最新的版本（如果有重复）
variableViews.forEach(variable => {
  uniqueVars.set(variable.identifier, variable);
});

// 转换回数组
const deduplicatedVars = Array.from(uniqueVars.values());

setVariables(deduplicatedVars);
logger.debug('加载变量列表成功:', { 
  count: variableViews.length, 
  uniqueCount: deduplicatedVars.length 
});
```

## 变更影响范围

此修复仅影响工作任务表单中的变量面板显示，不会对其他功能造成影响。修改集中在：

1. `AvailableVariablePanel.tsx` - 添加了变量去重逻辑

## 测试验证步骤

1. 打开任意工作任务表单
2. 确认右侧变量面板中长文本值只显示最多两行
3. 验证变量列表中不存在重复的变量（相同`identifier`只显示一个）

## 兼容性分析

此修改完全向后兼容，只是改进了显示效果和数据处理逻辑，不会影响功能或API。

## 修复日期

2025-03-29
