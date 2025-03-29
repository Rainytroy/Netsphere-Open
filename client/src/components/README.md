# 组件说明文档

## 通用组件

### VariableTag

**路径**: `src/components/common/VariableTag.tsx`

**描述**: 
全局通用的变量标签展示组件，用于在系统所有位置统一变量标识符的视觉表现。该组件根据变量类型提供一致的颜色和样式，并支持悬停、错误状态和删除等功能。

**Props**:
- `identifier`: 变量标识符
- `displayIdentifier`: 显示用的友好标识符
- `error`: 是否为错误状态
- `errorMessage`: 错误信息
- `onDelete`: 删除回调函数
- `readOnly`: 是否只读
- `type`: 变量类型
- `value`: 变量值

**样式规范**:
- NPC类型: 蓝色系
- 任务类型: 绿色系
- 工作流类型: 紫色系
- 自定义类型: 橙色系
- 文件类型: 青色系
- 系统类型: 灰色系

**使用示例**:
```tsx
import VariableTag from 'components/common/VariableTag';

<VariableTag
  identifier="gv_1234_name"
  displayIdentifier="@云透.name#1234"
  type="npc"
  value="云透"
  readOnly={true}
/>
```

### 使用规范

为了确保系统中变量标识符的一致性，在以下场景中应使用VariableTag组件：
1. 变量列表展示
2. 变量选择器
3. 任何需要展示变量标识符的位置

编辑器组件内部也应尽量保持与VariableTag组件相同的视觉风格，以增强用户体验的一致性。
