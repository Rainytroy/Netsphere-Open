# BUGFIX 报告: 移除可用变量列表点击插入功能

## 问题描述

工作任务表单右侧的可用变量面板目前包含一个功能，允许用户通过点击变量列表项将变量插入到编辑区。根据新的需求，需要移除这个点击插入功能。

## 实施范围

此更改涉及到两个组件：
1. `AvailableVariablePanel.tsx` - 不再传递点击处理函数到VariableList组件
2. `VariableList.tsx` - 修改以支持无点击事件的渲染模式

## 修改内容

### 1. VariableList.tsx 组件修改

修改了 `VariableList` 组件的 props 接口和列表项样式：

```typescript
// 修改前
interface VariableListProps {
  onVariableClick: (variable: VariableView) => void; // 必选参数
  usedVariables?: VariableView[];
}

// 修改后
interface VariableListProps {
  onVariableClick?: (variable: VariableView) => void; // 改为可选参数
  usedVariables?: VariableView[];
}
```

移除了列表项的点击相关样式和事件：

```jsx
// 修改前
<List.Item
  key={variable.id}
  style={{ cursor: 'pointer', padding: '8px 0' }}
  onClick={() => onVariableClick(variable)}
>

// 修改后
<List.Item
  key={variable.id}
  style={{ padding: '8px 0' }}
>
```

### 2. AvailableVariablePanel.tsx 组件修改

移除了传递给 VariableList 的 onVariableClick 属性：

```jsx
// 修改前
<VariableList onVariableClick={onVariableClick} usedVariables={variables} />

// 修改后
<VariableList usedVariables={variables} />
```

## 影响范围

1. 工作任务表单中的可用变量面板不再支持点击变量列表项插入变量到编辑区的功能
2. 变量列表仍然保持过滤、搜索和显示功能，只是移除了交互能力
3. 鼠标悬停在变量值上仍然会显示完整内容的工具提示

## 兼容性影响

由于进行了以下兼容性设计，此修改对现有代码的影响最小化：
1. VariableList 组件的 onVariableClick 参数改为可选，而不是完全移除
2. 保留了 AvailableVariablePanel 组件接口中的 onVariableClick 参数，只是不再传递给子组件

## 测试验证

1. 打开工作任务表单
2. 确认右侧变量面板中的变量列表项不再显示手型指针
3. 确认点击变量列表项不会触发任何动作
4. 确认其他功能（如搜索、过滤）仍然正常工作

## 修复日期

2025-03-29
