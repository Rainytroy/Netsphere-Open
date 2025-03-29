# 全局变量系统配置指南

**版本号**: v2.2.0  
**创建时间**: 2025年3月23日  
**最后更新**: 2025年3月23日  
**文档状态**: 草稿  
**关键词**: 变量配置, 字段映射, 类型定义, 主题样式

## 配置概述

全局变量系统采用集中式配置管理，所有的变量类型定义、字段映射和UI主题均在`VariableSchemaConfig.ts`中统一配置。这种集中配置方式确保了系统各部分的一致性，并为扩展提供了便利。

本文档详细介绍全局配置项的结构、使用方法和最佳实践，以帮助开发者正确集成和扩展变量系统。

## 配置结构

全局配置主要包含以下几个部分：

1. **类型定义接口** - 定义变量类型和字段的数据结构
2. **变量类型模式** - 配置每种变量类型的属性和行为
3. **字段映射表** - 建立中英文字段名称的映射关系
4. **辅助函数** - 提供类型生成和查询功能

### 类型定义接口

```typescript
// 字段定义
export interface FieldDefinition {
  english: string;     // 英文字段名(用于系统标识符)
  chinese: string;     // 中文字段名
  description?: string; // 字段描述
  isRequired?: boolean; // 是否必填
  defaultValue?: any;   // 默认值
}

// 变量类型主题
export interface VariableTypeTheme {
  bgColor: string;      // 背景色
  borderColor: string;  // 边框色
  textColor: string;    // 文本色
  icon?: string;        // 可选图标名称或路径
}

// 变量类型模式
export interface VariableTypeSchema {
  systemKey: string;    // 系统内部使用的键，如'npc', 'task'
  enumKey: string;      // 枚举值，如VariableType.NPC
  displayName: string;  // 中文显示名称，如'角色/NPC'
  description?: string; // 类型描述
  theme: VariableTypeTheme;  // 主题配置
  fields: Record<string, FieldDefinition>;  // 字段定义
}
```

### 变量类型配置

配置文件中定义了所有受支持的变量类型，每种类型包含其元数据、主题样式和字段定义：

```typescript
export const VariableSchemas: Record<string, VariableTypeSchema> = {
  npc: {
    systemKey: 'npc',
    enumKey: 'NPC',
    displayName: '角色/NPC',
    description: '用于表示游戏中的角色和NPC',
    theme: {
      bgColor: '#E6F7FF',
      borderColor: '#1890FF',
      textColor: '#1890FF',
      icon: 'user'
    },
    fields: {
      // 字段定义...
    }
  },
  
  // 其他变量类型...
}
```

## 支持的变量类型

系统目前支持以下变量类型，每种类型都有特定的字段集和样式主题：

### 1. NPC变量 (npc)

表示角色和NPC的变量类型，用于存储角色属性和行为规则。

| 字段英文名 | 字段中文名 | 描述 | 必填 |
|-----------|-----------|------|------|
| name | 名称 | 角色名称 | 是 |
| description | 描述 | 角色基本描述 | 否 |
| knowledge | 知识背景 | 角色的知识背景 | 否 |
| act | 行动原则 | 角色的行动原则与决策逻辑 | 否 |
| actlv | 活跃度 | 角色在场景中的活跃程度 | 否 |

**特殊说明**：
- `act`字段支持多种中文映射，包括"行动原则"和"行为原则"
- 已废弃的字段前缀：`kb`(知识背景)、`ap`(行动原则)、`al`(活跃度)

### 2. 工作任务变量 (task)

表示工作流中的任务节点，存储任务输入、输出和状态信息。

| 字段英文名 | 字段中文名 | 描述 | 必填 |
|-----------|-----------|------|------|
| input | 输入 | 任务的输入内容 | 是 |
| output | 输出 | 任务的输出结果 | 否 |
| status | 状态 | 任务的当前状态 | 否 |

### 3. 工作流变量 (workflow)

表示工作流定义，包含工作流的基本信息和状态。

| 字段英文名 | 字段中文名 | 描述 | 必填 |
|-----------|-----------|------|------|
| name | 名称 | 工作流名称 | 是 |
| description | 描述 | 工作流描述 | 否 |
| status | 状态 | 工作流当前状态 | 否 |

### 4. 自定义变量 (custom)

用户自定义的全局变量，用于存储全局设置或常量。

| 字段英文名 | 字段中文名 | 描述 | 必填 |
|-----------|-----------|------|------|
| value | 值 | 变量值 | 是 |

### 5. 文件变量 (file)

表示文件类型的变量，存储文件路径和内容。

| 字段英文名 | 字段中文名 | 描述 | 必填 |
|-----------|-----------|------|------|
| path | 路径 | 文件路径 | 是 |
| content | 内容 | 文件内容 | 否 |

### 6. 系统变量 (system)

系统内置变量，用于系统级别的全局配置。

| 字段英文名 | 字段中文名 | 描述 | 必填 |
|-----------|-----------|------|------|
| value | 值 | 系统变量值 | 是 |

## 字段映射与中英文转换

系统通过`FieldMappings`数据结构实现中英文字段的双向映射，主要用于:

1. 在UI中显示用户友好的中文字段名
2. 在系统内部处理中使用标准的英文字段名
3. 支持用户输入中文字段名时自动转换为系统标识符

```typescript
// 字段映射表示例：
// FieldMappings = {
//   'npc': {
//     '名称': 'name',
//     '知识背景': 'knowledge',
//     '行动原则': 'act',
//     '行为原则': 'act'  // 注意同一英文字段可以有多个中文映射
//   },
//   'task': {
//     '输入': 'input',
//     '输出': 'output'
//   }
//   // ...其他类型
// }
```

字段映射表在系统初始化时自动从`VariableSchemas`生成，确保中英文命名的一致性。

## 主题配置

每种变量类型都有对应的主题配置，用于在UI中展示一致的视觉风格：

```typescript
theme: {
  bgColor: '#E6F7FF',    // 背景色
  borderColor: '#1890FF', // 边框色
  textColor: '#1890FF',   // 文本色
  icon: 'user'            // 图标
}
```

这些主题配置被用于：

1. 变量标签的样式展示（VariableTag组件）
2. 变量列表中的类型标识（VariableTable组件）
3. 变量选择器中的类型过滤（VariableSelector组件）

## 配置使用示例

### 从配置获取字段定义

```typescript
import VariableSchemas from '../config/VariableSchemaConfig';

// 获取NPC类型的所有字段
const npcFields = VariableSchemas.npc.fields;

// 检查字段是否必填
const isNameRequired = npcFields.name.isRequired; // true
```

### 应用主题样式

```typescript
import VariableSchemas from '../config/VariableSchemaConfig';

// 获取工作流变量的主题配置
const workflowTheme = VariableSchemas.workflow.theme;

// 应用到CSS样式
const tagStyle = {
  backgroundColor: workflowTheme.bgColor,
  color: workflowTheme.textColor,
  border: `1px solid ${workflowTheme.borderColor}`
};
```

### 中英文字段转换

```typescript
import { FieldMappings } from '../config/VariableSchemaConfig';
import VariableSchemaService from '../services/VariableSchemaService';

// 通过服务API转换字段名
const englishField = VariableSchemaService.normalizeFieldName('知识背景', 'npc'); // 'knowledge'

// 或直接使用映射表
const englishField2 = FieldMappings.npc['知识背景']; // 'knowledge'
```

## 最佳实践

1. **使用VariableSchemaService**：尽量通过服务API访问配置，而不是直接操作配置对象，这样可以利用服务提供的各种辅助功能。

2. **字段名规范化**：在处理用户输入或外部数据时，始终使用`normalizeFieldName`和`normalizeSourceType`方法进行规范化，确保数据一致性。

3. **主题复用**：使用`VariableThemeService.getTypeColor`和`VariableThemeService.getTagStyle`方法获取主题样式，保持UI风格一致。

4. **配置扩展**：添加新的变量类型或字段时，确保同时更新`VariableSchemas`和对应的类型定义。

5. **向后兼容**：添加新字段时，考虑添加相关的别名映射，以支持不同的命名变体。

## 配置维护

当需要对变量系统进行扩展或修改时，主要涉及以下配置更新：

### 添加新的变量类型

1. 在`VariableSchemas`中添加新的类型定义
2. 更新`variableService.ts`中的`VariableType`枚举
3. 确保相关服务和组件支持新类型

```typescript
// 添加新类型示例
VariableSchemas.apiResource = {
  systemKey: 'apiResource',
  enumKey: 'API_RESOURCE',
  displayName: 'API资源',
  description: '表示外部API资源',
  theme: {
    bgColor: '#FCF5E5',
    borderColor: '#D4B106',
    textColor: '#D4B106',
    icon: 'api'
  },
  fields: {
    url: {
      english: 'url',
      chinese: '地址',
      isRequired: true,
      description: 'API地址'
    },
    method: {
      english: 'method',
      chinese: '方法',
      isRequired: true,
      description: '请求方法'
    }
  }
};
```

### 添加新字段

1. 在相应类型的`fields`对象中添加新字段定义
2. 在相关服务逻辑中处理新字段

```typescript
// 为工作流类型添加新字段
VariableSchemas.workflow.fields.owner = {
  english: 'owner',
  chinese: '负责人',
  description: '工作流负责人'
};
```

### 更新主题样式

直接修改相应类型的`theme`对象即可更新样式：

```typescript
// 更新NPC变量的主题颜色
VariableSchemas.npc.theme = {
  bgColor: '#EBF5FF',  // 更浅的蓝色背景
  borderColor: '#40A9FF', // 更亮的边框色
  textColor: '#0050B3',   // 更深的文本色
  icon: 'user'
};
```

## 相关文档

- [变量系统概述](./variable-system-overview.md)
- [变量系统架构设计](./variable-system-architecture.md)
- [变量标识符解析规范](./variable-identifier-parsing.md)
- [变量系统使用指南](./variable-system-usage-guide.md)
