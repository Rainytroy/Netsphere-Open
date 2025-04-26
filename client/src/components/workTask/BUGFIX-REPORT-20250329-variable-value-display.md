# BUGFIX 报告: 工作任务可用变量面板值显示优化

## 问题描述

在工作任务表单右侧的可用变量面板中，变量值显示区域存在问题：

1. 变量值显示超出控制，例如"@云透的测试.output#3369"等变量的值完整显示，导致面板项目高度过高
2. 需要将值显示限制为单行，以保持界面整洁性和一致性

## 原因分析

经过检查 `VariableList.tsx` 文件中的样式设置：
```jsx
<Text 
  type="secondary" 
  style={{ 
    display: '-webkit-box', 
    WebkitLineClamp: 2, // 原设置为2行
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    fontSize: '12px'
  }}
>
```

虽然代码中设置了 `WebkitLineClamp: 2`，但在某些情况下此样式可能未能正确应用，或缺少其他必要的辅助样式来确保限制生效。

## 解决方案

修改 `VariableList.tsx` 中的 Text 组件样式：

```jsx
<Text 
  type="secondary" 
  style={{ 
    display: '-webkit-box', 
    WebkitLineClamp: 1, // 改为仅显示1行
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis', // 添加确保显示省略号
    maxHeight: '20px', // 添加固定高度限制
    fontSize: '12px'
  }}
>
  {variable.value || '(空值)'}
</Text>
```

这组样式修改能够实现：
- 将文本严格限制为1行
- 确保超出部分显示省略号
- 通过固定高度进一步限制垂直空间占用

## 变更影响范围

此修复仅影响工作任务表单右侧的可用变量面板中变量值的显示方式，不会对其他功能造成影响。修改集中在：

1. `VariableList.tsx` - 修改了变量值显示的CSS样式

## 测试验证步骤

1. 打开任意工作任务表单
2. 查看右侧变量面板中具有长文本值的变量（如"@云透的测试.output#3369"）
3. 确认值部分只显示一行并以省略号结尾
4. 验证鼠标悬停时仍能通过Tooltip查看完整值

## 兼容性分析

此修改完全向后兼容，只是改进了显示效果而不影响功能。用户仍然可以通过Tooltip查看完整的变量值内容。

## 修复日期

2025-03-29
