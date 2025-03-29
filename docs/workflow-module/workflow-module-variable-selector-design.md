# 工作流节点编辑器中的全局变量选择器设计方案

本文档描述工作流节点编辑器中实现全局变量选择器的设计方案，确保其与系统中现有的变量选择功能保持一致性。

## 1. 需求概述

在工作流编辑器中，当用户选择节点调出节点编辑弹窗时，需要实现全局变量的选择功能，主要需求包括：

1. 用户可以通过输入@符号调出全局变量选择器
2. 变量选择器只显示系统中已存在的全局变量
3. 选择后的变量以特殊标识符组件的形式展示（而非普通文本）
4. 只有实际存在的变量才会转化为标识符组件，不存在的变量仅显示为普通文本
5. 全局变量的格式和样式需要与系统中其他部分保持一致

## 2. 全局变量类型与颜色定义

为确保系统一致性，我们将为所有变量类型统一使用以下颜色定义：

| 变量类型 | 中文名称 | 颜色代码 | 颜色示例 | 图标 |
|---------|--------|---------|---------|------|
| NPC | NPC | #722ED1 | <span style="color:#722ED1">■■■</span> | UserOutlined |
| TASK | 工作任务 | #52C41A | <span style="color:#52C41A">■■■</span> | FileTextOutlined |
| WORKFLOW | 工作流 | #FA8C16 | <span style="color:#FA8C16">■■■</span> | ApiOutlined |
| CUSTOM | 自定义变量 | #1890FF | <span style="color:#1890FF">■■■</span> | EditOutlined |
| FILE | 文件 | #6C757D | <span style="color:#6C757D">■■■</span> | FileOutlined |

## 3. 变量标识符规范

全局变量标识符使用固定格式，确保在系统的所有位置保持一致：

- 格式：`@sourceName.attribute`
- 例如：`@npc1.name`，`@task1.output`，`@workflow1.result`

## 4. 变量标识符组件样式

变量标识符在编辑器中显示为具有特殊样式的组件，而非普通文本：

```css
{
  backgroundColor: '#F0F7FF',
  border: '1px solid #D0E8FF',
  borderRadius: '4px',
  padding: '2px 8px',
  margin: '0 2px',
  color: '#0F56B3',
  fontFamily: 'inherit',
  fontSize: '13px',
  cursor: 'default',
  display: 'inline-block',
  userSelect: 'all'
}
```

## 5. 技术实现方案

### 5.1 复用现有组件

我们将直接复用现有的 `VariableEditor` 组件，该组件已在工作任务编辑页面中得到应用，具有以下功能：

- 富文本编辑功能（基于Slate编辑器）
- 通过@触发变量选择器
- 将变量标识符渲染为特殊组件
- 变量的序列化和反序列化

### 5.2 集成到节点配置组件

在各类型的节点配置组件中集成 `VariableEditor`：

```tsx
// 在节点配置组件（如AssignmentNodeConfig.tsx）中
<Form.Item 
  name="expression" 
  label="赋值表达式"
  rules={[{ required: true, message: '请输入赋值表达式' }]}
>
  <VariableEditor
    variables={variables}
    placeholder="输入赋值表达式，使用@选择全局变量"
    onChange={(value) => form.setFieldsValue({ expression: value })}
    minHeight="100px"
  />
</Form.Item>
```

### 5.3 加载全局变量数据

在节点配置组件中加载全局变量数据：

```tsx
const [variables, setVariables] = useState<VariableView[]>([]);

useEffect(() => {
  const loadVariables = async () => {
    try {
      const response = await variableService.getVariables();
      const variableViews = response.data.map(v => ({
        id: v.id,
        name: v.name,
        identifier: v.identifier,
        type: v.type,
        sourceId: v.source?.id || '',
        sourceName: v.source?.name || '',
        value: v.value
      }));
      setVariables(variableViews);
    } catch (error) {
      console.error('加载变量列表失败:', error);
    }
  };
  
  loadVariables();
}, []);
```

### 5.4 变量验证机制

确保只有合法变量才能以标识符形式保存：

1. 在编辑器中输入@字符会触发变量选择器
2. 只有在选择器中选择的变量才会被转换为变量组件
3. 手动输入的@格式文本仅被视为普通文本
4. 变量组件通过特殊样式与普通文本区分

## 6. 应用场景

此全局变量选择器将应用于以下节点类型的配置面板：

1. 起点卡配置（StartNodeConfig）
2. 赋值卡配置（AssignmentNodeConfig）
3. 循环卡配置（LoopNodeConfig）
4. 展示卡配置（DisplayNodeConfig）
5. 工作任务卡配置（WorkTaskNodeConfig）

## 7. 使用流程

1. 用户在工作流编辑器中选择一个节点
2. 调出节点配置弹窗
3. 在配置面板的相关输入字段中，输入@字符
4. 系统显示变量选择器，列出所有可用的全局变量
5. 用户选择一个变量，或通过输入关键词筛选后选择
6. 变量以特殊样式的组件形式显示在输入字段中
7. 保存配置时，变量标识符被正确保存

## 8. 实现步骤

1. 更新各节点配置组件，引入VariableEditor
2. 统一变量类型的颜色定义
3. 确保变量标识符格式和样式的一致性
4. 测试各类型变量在编辑器中的正确显示和交互
