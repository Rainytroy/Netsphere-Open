# 工作任务管理模块技术实现规范

**版本号**: v1.2.0  
**创建时间**: 2025年3月9日 05:58  
**更新时间**: 2025年3月10日 16:55  
**文档状态**: 已修订  

> 注意：本文档是《工作任务管理模块》规范的一部分，专注于技术实现细节。
> - 概念设计和界面规范请参见：[工作任务模块概念设计与界面规范](work-task-module-concept-design.md)
> - API接口详细设计请参见：[工作任务模块API接口规范](work-task-module-api-spec.md)

## 目录
1. [模块简介](#模块简介)
2. [数据模型设计](#数据模型设计)
3. [变量集成机制](#变量集成机制)
4. [触发机制设计](#触发机制设计)
5. [工作任务事件服务](#工作任务事件服务)
6. [技术开发设计](#技术开发设计)
7. [实施计划](#实施计划)

## 模块简介

工作任务管理模块是Netsphere系统的核心功能，用于创建和管理能够调用AI服务执行特定任务的工作单元。本文档重点阐述该模块的技术实现细节，包括数据模型、变量集成机制等方面。API接口设计请参考[工作任务模块API接口规范](work-task-module-api-spec.md)文档。

## 数据模型设计

### 1. 工作任务数据模型

```typescript
// 工作任务状态枚举
export enum WorkTaskStatus {
  DRAFT = 'draft',       // 草稿
  ACTIVE = 'active',     // 激活
  ARCHIVED = 'archived'  // 归档
}

// 工作任务执行状态枚举
export enum ExecutionStatus {
  IDLE = 'idle',               // 空闲状态
  RUNNING = 'running',         // 执行中
  COMPLETED = 'completed',     // 执行完成
  FAILED = 'failed'            // 执行失败
}

// NPC提示词模板自定义设置
export interface NpcPromptTemplate {
  template: string;      // 提示词模板
  isCustomized: boolean; // 是否自定义（false则使用默认模板）
}

// 工作任务数据模型
export interface WorkTask {
  id: string;                     // 唯一标识
  name: string;                   // 任务名称（也用作全局变量来源名称）
  input: string;                  // 输入内容（包含可能的变量引用）
  npcId: string;                  // 关联的NPC ID
  npcName: string;                // NPC名称（冗余字段，便于前端显示）
  aiServiceId: string;            // 关联的AI服务 ID
  aiServiceName: string;          // AI服务名称（冗余字段，便于前端显示）
  npcPromptTemplate: NpcPromptTemplate; // NPC提示词模板设置
  output: string;                 // 输出内容（最近一次执行的结果）
  status: WorkTaskStatus;         // 任务状态
  executionStatus: ExecutionStatus; // 执行状态
  executionMessage?: string;      // 执行状态消息（如错误信息）
  createdAt: Date;                // 创建时间
  updatedAt: Date;                // 更新时间
  lastRunAt?: Date;               // 最后一次执行时间（可选）
}

// 工作任务变量字段类型
export enum WorkTaskVariableField {
  INPUT = 'input',
  OUTPUT = 'output'
}

// 工作任务事件类型
export enum WorkTaskEventType {
  INPUT_CHANGED = 'input_changed',   // 输入内容变更
  OUTPUT_CHANGED = 'output_changed', // 输出内容变更
  EXECUTION_STARTED = 'execution_started', // 开始执行
  EXECUTION_COMPLETED = 'execution_completed', // 执行完成
  EXECUTION_FAILED = 'execution_failed' // 执行失败
}
```

### 2. 变量引用处理相关模型

```typescript
// 变量引用信息
export interface VariableReference {
  identifier: string;    // 变量标识符（如@云透.知识背景）
  sourceId: string;      // 变量来源ID
  sourceType: string;    // 变量来源类型
  fieldName: string;     // 字段名称
  startIndex: number;    // 在文本中的起始位置
  endIndex: number;      // 在文本中的结束位置
}

// 变量解析结果
export interface ResolvedVariable {
  identifier: string;    // 变量标识符
  value: string;         // 解析后的实际值
  found: boolean;        // 是否找到变量
  errorMessage?: string; // 错误信息（如果有）
}
```

## 变量集成机制

工作任务模块将作为变量源，为全局变量系统提供工作任务相关的变量：

### 1. 工作任务变量生成

- **自动变量生成**
  - 每个工作任务创建后，自动生成两个全局变量：input和output
  - 变量类型设置为VariableType.TASK
  - 变量来源设置为工作任务名称

- **变量标识符格式**
  - Input变量标识符：`@工作任务名称.input`
  - Output变量标识符：`@工作任务名称.output`

- **变量同步更新**
  - 当工作任务被更新时，相关变量自动更新
  - 当工作任务被删除时，相关变量自动删除
  - 当工作任务名称更改时，相关变量的标识符自动更新

### 2. 变量引用与循环检测

- **变量解析流程**
  1. 提取文本中的所有变量引用（正则表达式匹配`@xxx.yyy`格式）
  2. 查询每个变量的实际值
  3. 替换文本中的变量引用为实际值
  4. 对于嵌套变量，递归执行上述过程（设置最大递归深度防止无限循环）

- **循环引用检测**
  - 在保存工作任务前检查是否存在循环引用
  - 禁止在工作任务中引用自己产生的变量
  - 如果检测到循环引用，显示错误提示并阻止保存

### 3. 变量集成实现

工作任务模块需要实现`VariableSourceProvider`接口，为全局变量系统提供工作任务相关的变量。

主要功能包括：
- 提供工作任务变量的获取接口
- 监听工作任务的变更事件，同步更新相关变量
- 同时支持按工作任务ID获取单个任务的变量

详细API实现请参见[工作任务模块API接口规范](work-task-module-api-spec.md)文档中的"工作任务变量集成API"部分。

## 触发机制设计

工作任务的执行可以通过多种触发机制启动：

### 1. 手动触发

- **用户界面触发**：用户可以在任务列表或任务详情页面手动点击"执行"按钮启动任务
- **测试模式**：用户可以在任务创建/编辑页面点击"测试"按钮，预览任务执行结果而不保存

### 2. 程序化触发

- **REST API触发**：其他模块可以通过调用工作任务模块的REST API触发任务执行
- **事件触发**：监听其他模块的事件，基于事件条件触发任务执行

### 3. 触发流程

1. 接收触发请求（手动或程序化）
2. 验证工作任务状态（仅激活状态的任务可执行）
3. 更新任务执行状态为"执行中"
4. 发布任务执行开始事件
5. 异步执行任务
   - 解析变量引用
   - 组合Prompt
   - 调用AI服务
   - 更新任务输出和状态
   - 发布任务执行完成/失败事件
6. 返回执行确认

### 4. 错误处理机制

- **鲁棒性设计**：每个触发入口都需要进行参数验证和错误捕获
- **状态恢复**：执行失败时自动将状态恢复为"空闲"，并记录错误信息
- **重试机制**：允许用户针对执行失败的任务进行重试

## 工作任务事件服务

工作任务事件服务用于发布和订阅工作任务相关的事件，为系统提供松耦合的事件通知机制。

### 1. 事件类型

工作任务模块产生的事件类型包括：
- `INPUT_CHANGED`: 输入内容变更时发布
- `OUTPUT_CHANGED`: 输出内容变更时发布
- `EXECUTION_STARTED`: 开始执行任务时发布
- `EXECUTION_COMPLETED`: 任务执行完成时发布
- `EXECUTION_FAILED`: 任务执行失败时发布

### 2. 事件数据结构

每个事件包含以下数据：
- `taskId`: 工作任务的唯一标识
- `data`: 事件相关的数据（如输出结果、错误信息等）

### 3. 订阅方式

系统提供两种订阅方式：
- **全局订阅**：订阅所有工作任务的特定事件类型
- **特定任务订阅**：仅订阅特定工作任务的事件

### 4. 应用场景

工作任务事件服务的主要应用场景包括：
- 全局变量系统监听输出变更事件，同步更新相关变量
- 前端界面监听执行状态事件，更新UI显示
- 工作流模块监听执行完成事件，触发后续流程

详细API实现请参见[工作任务模块API接口规范](work-task-module-api-spec.md)文档中的"工作任务事件服务API"部分。

## 技术开发设计

### 1. 技术栈选择

- **前端技术栈**
  - 框架：React 18.0+
  - 状态管理：Redux Toolkit
  - UI组件库：Ant Design 5.0+
  - 富文本编辑器：基于Slate.js自定义

- **后端技术栈**
  - 框架：Express.js
  - 数据库：MongoDB
  - ODM：Mongoose
  - API文档：Swagger/OpenAPI

### 2. 模块分层设计

- **表示层**
  - React组件
  - Redux状态管理
  - API调用服务

- **业务逻辑层**
  - Express控制器
  - 业务服务
  - 事件处理

- **数据访问层**
  - Mongoose模型
  - 数据访问服务
  - 数据验证

### 3. 关键技术实现

- **变量标签编辑器**
  - 基于Slate.js，实现带变量标签的富文本编辑器
  - 支持变量标签的插入、删除和显示
  - 实现@触发的变量自动补全

- **Prompt处理引擎**
  - 实现变量引用的解析和替换
  - 支持嵌套变量引用的递归解析
  - 防止循环引用

- **事件发布订阅系统**
  - 基于Node.js的EventEmitter实现
  - 支持全局和特定任务的事件订阅
  - 提供事件发布和取消订阅接口

## 技术实现最佳实践与问题解决

本节记录了在工作任务模块开发过程中遇到的技术问题和解决方案，作为今后开发的参考。

### 1. 变量编辑器问题与解决方案

#### 1.1 标签插入后光标问题

**问题描述**：在Slate编辑器中插入变量标签后，光标消失，导致用户体验不佳，需要再次点击编辑器继续输入。

**解决方案**：

```typescript
// 在插入变量标签后设置光标位置
const insertVariable = (variable: Variable) => {
  // 插入变量节点
  const variableNode = {
    type: 'variable',
    identifier: variable.identifier,
    children: [{ text: '' }],
  };
  
  Transforms.insertNodes(editor, variableNode);
  
  // 插入空格，便于光标定位
  Transforms.insertText(editor, ' ');
  
  // 延迟设置焦点和光标位置，确保DOM已更新
  setTimeout(() => {
    ReactEditor.focus(editor);
    
    // 移动光标到插入的变量标签之后
    const path = [...editor.selection.anchor.path];
    path[path.length - 1] = path[path.length - 1] + 1;
    
    Transforms.select(editor, {
      anchor: { path, offset: 0 },
      focus: { path, offset: 0 },
    });
  }, 100);
  
  // 更新编辑器内容
  onChange(editor);
};
```

#### 1.2 编辑器内容更新不同步问题

**问题描述**：使用`setValue()`方法更新Slate编辑器状态时，React状态已更新但编辑器DOM表示未同步更新。

**解决方案**：实现直接操作Slate编辑器DOM的逻辑，强制刷新编辑器内容：

```typescript
// 强制更新编辑器内容
const updateContent = (content: string) => {
  // 解析文本为编辑器节点
  const newNodes = deserializeFromText(content);
  
  // 更新React状态
  setValue(newNodes);
  
  // 直接操作编辑器DOM
  try {
    // 清空当前编辑器内容
    const nodeCount = editor.children.length;
    if (nodeCount > 0) {
      for (let i = nodeCount - 1; i >= 0; i--) {
        Transforms.delete(editor, { at: [i] });
      }
    }
    
    // 插入新内容
    Transforms.insertNodes(editor, newNodes);
    
    // 设置焦点到编辑器
    ReactEditor.focus(editor);
  } catch (error) {
    console.error("强制更新编辑器内容时出错:", error);
  }
};
```

### 2. 变量解析与循环检测优化

#### 2.1 变量解析缓存机制

**问题描述**：变量解析过程在处理大量嵌套变量时性能不佳，重复解析相同变量浪费资源。

**解决方案**：实现变量值缓存机制，减少重复解析：

```typescript
// 使用Map缓存已解析的变量
class PromptProcessingService {
  private variableCache = new Map<string, string>();
  
  /**
   * 解析包含变量引用的文本（带缓存）
   */
  public async resolveVariablesWithCache(text: string, taskId?: string): Promise<string> {
    // 重置缓存或使用现有缓存
    this.variableCache = new Map<string, string>();
    return this.resolveWithDepth(text, 0);
  }
  
  private async resolveWithDepth(text: string, depth = 0): Promise<string> {
    // 最大递归深度检查
    if (depth >= this.MAX_DEPTH) {
      console.warn('达到最大递归深度，可能存在循环引用');
      return text;
    }
    
    // 提取所有变量引用
    const references = this.extractVariableReferences(text);
    if (references.length === 0) {
      return text; // 没有变量引用，直接返回原文本
    }
    
    let resolvedText = text;
    
    // 处理每个变量引用
    for (const ref of references) {
      // 检查缓存
      if (this.variableCache.has(ref.identifier)) {
        const cachedValue = this.variableCache.get(ref.identifier);
        resolvedText = resolvedText.replace(ref.identifier, cachedValue);
        continue;
      }
      
      // 正常解析逻辑...
      try {
        const variable = await this.variableService.getVariableByIdentifier(ref.identifier);
        
        if (variable) {
          // 递归解析变量值中可能包含的变量引用
          const nestedValue = await this.resolveWithDepth(variable.value, depth + 1);
          
          // 替换文本中的变量引用
          resolvedText = resolvedText.replace(ref.identifier, nestedValue);
          
          // 添加到缓存
          this.variableCache.set(ref.identifier, nestedValue);
        } else {
          // 变量不存在处理...
        }
      } catch (error) {
        // 错误处理...
      }
    }
    
    return resolvedText;
  }
}
```

#### 2.2 改进的循环引用检测

**问题描述**：简单的循环引用检测可能会错过复杂的间接循环，如A引用B，B引用C，C引用A。

**解决方案**：实现基于路径追踪的循环引用检测：

```typescript
/**
 * 检查变量引用是否存在循环
 */
public checkCircularReferences(
  taskId: string,
  input: string,
  output: string
): boolean {
  // 存储已访问的变量标识符路径
  const visitedPath = new Set<string>();
  
  // 添加任务自身的变量标识符到访问路径
  const taskIdentifiers = [
    this.identifierFormatter.formatIdentifier('work_task', taskId, 'input'),
    this.identifierFormatter.formatIdentifier('work_task', taskId, 'output')
  ];
  
  // 检查输入和输出中的循环引用
  return this.checkCircularInText(input, visitedPath, taskIdentifiers) ||
         this.checkCircularInText(output, visitedPath, taskIdentifiers);
}

/**
 * 检查文本中是否存在循环引用
 */
private async checkCircularInText(
  text: string,
  visitedPath: Set<string>,
  taskIdentifiers: string[]
): Promise<boolean> {
  // 提取文本中的所有变量引用
  const references = this.extractVariableReferences(text);
  
  // 遍历所有变量引用
  for (const ref of references) {
    // 自引用检查
    if (taskIdentifiers.includes(ref.identifier)) {
      return true;
    }
    
    // 访问路径检查（避免重复检查）
    if (visitedPath.has(ref.identifier)) {
      return true; // 发现循环
    }
    
    // 添加当前标识符到访问路径
    visitedPath.add(ref.identifier);
    
    // 获取变量值并递归检查
    try {
      const variable = await this.variableService.getVariableByIdentifier(ref.identifier);
      if (variable) {
        const hasCircular = await this.checkCircularInText(
          variable.value,
          visitedPath,
          taskIdentifiers
        );
        
        if (hasCircular) {
          return true;
        }
      }
    } catch (error) {
      console.error(`检查循环引用时出错: ${ref.identifier}`, error);
    } finally {
      // 回溯：移除当前标识符，以便检查其他路径
      visitedPath.delete(ref.identifier);
    }
  }
  
  return false; // 未发现循环
}
```

### 3. 变量系统集成优化

#### 3.1 变量去重与标准化

**问题描述**：工作任务模块生成的变量与数据库中已有变量冲突，导致变量重复和显示错误。

**解决方案**：实现基于身份的变量去重和字段标准化：

```typescript
/**
 * 工作任务变量源提供者
 */
export class WorkTaskVariableSourceProvider implements VariableSourceProvider {
  // 字段名称标准化映射表
  private static readonly FIELD_MAPPING: Record<string, string> = {
    'input': 'input',     // 保持英文一致
    'output': 'output',   // 保持英文一致
    '输入': 'input',      // 中文映射到英文
    '输出': 'output'      // 中文映射到英文
  };
  
  /**
   * 获取标准化字段名
   */
  private getNormalizedFieldName(field: string): string {
    return field in WorkTaskVariableSourceProvider.FIELD_MAPPING 
      ? WorkTaskVariableSourceProvider.FIELD_MAPPING[field] 
      : field;
  }
  
  /**
   * 获取工作任务变量
   */
  public async getTaskVariables(taskId: string): Promise<Variable[]> {
    const task = await this.workTaskService.getWorkTaskById(taskId);
    
    if (!task) {
      return [];
    }
    
    // 仅创建标准字段的变量
    const variables: Variable[] = [];
    
    // 输入变量
    variables.push({
      id: this.generateVariableId(task.id, WorkTaskVariableField.INPUT),
      name: `${task.name}.input`,
      sourceId: task.id,
      sourceType: this.getSourceType(),
      fieldName: WorkTaskVariableField.INPUT, // 使用标准字段名
      value: task.input,
      type: VariableType.TASK,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    });
    
    // 输出变量
    variables.push({
      id: this.generateVariableId(task.id, WorkTaskVariableField.OUTPUT),
      name: `${task.name}.output`,
      sourceId: task.id,
      sourceType: this.getSourceType(),
      fieldName: WorkTaskVariableField.OUTPUT, // 使用标准字段名
      value: task.output || '',
      type: VariableType.TASK,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    });
    
    return variables;
  }
}
```

#### 3.2 变量服务去重优化

**问题描述**：服务端从数据库和动态源提供者获取变量后简单合并，未进行去重，导致前端显示重复变量。

**解决方案**：在VariableService中实现高效去重：

```typescript
/**
 * 变量服务去重实现
 */
export class VariableService {
  /**
   * 获取所有变量（去重后）
   */
  public async getAllVariables(): Promise<Variable[]> {
    try {
      // 获取数据库变量
      const databaseVariables = await this.variableRepository.find();
      
      // 获取源提供者变量
      const sourceVariables: Variable[] = [];
      for (const provider of this.variableSourceRegistry.getProviders()) {
        const providerVariables = await provider.getVariables();
        sourceVariables.push(...providerVariables);
      }
      
      // 使用Map执行去重，优先保留数据库变量
      const variableMap = new Map<string, Variable>();
      
      // 先添加数据库变量
      for (const variable of databaseVariables) {
        variableMap.set(variable.identifier, variable);
      }
      
      // 再添加未在数据库中存在的源变量
      for (const variable of sourceVariables) {
        if (!variableMap.has(variable.identifier)) {
          variableMap.set(variable.identifier, variable);
        }
      }
      
      // 转换回数组并按来源名称排序
      const dedupedVariables = Array.from(variableMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
      
      // 记录去重过程
      console.log(`变量去重: 从 ${databaseVariables.length + sourceVariables.length} 个变量减少到 ${dedupedVariables.length} 个`);
      
      return dedupedVariables;
    } catch (error) {
      console.error('获取所有变量时出错:', error);
      throw error;
    }
  }
}
```

### 4. 前端组件改进

#### 4.1 表单控件优化

**问题描述**：工作任务表单的"输出测试"按钮在创建时被错误禁用，即使已选择所需选项。

**解决方案**：简化按钮禁用逻辑，将验证移至执行函数：

```typescript
// WorkTaskForm.tsx

// 优化的按钮禁用条件
<Button
  type="primary"
  onClick={handleTestExecute}
  loading={testLoading}
  disabled={!form.getFieldValue('npcId') || !form.getFieldValue('aiServiceId')}
>
  输出测试
</Button>

// 移至函数内的验证逻辑
const handleTestExecute = async () => {
  // 获取当前表单值
  const values = form.getFieldsValue();
  
  // 验证必要字段
  if (!values.npcId || !values.aiServiceId) {
    message.error('请选择NPC和AI服务');
    return;
  }
  
  // 验证输入内容
  if (!values.input || values.input.trim() === '') {
    message.error('请输入内容');
    return;
  }
  
  setTestLoading(true);
  
  try {
    // 调用测试接口...
  } catch (error) {
    // 错误处理...
  } finally {
    setTestLoading(false);
  }
};
```

#### 4.2 响应式设计与兼容性

**问题描述**：工作任务表单在小屏幕设备上布局不合理，影响用户体验。

**解决方案**：优化响应式布局设计：

```tsx
// 响应式布局设计
<Row gutter={[16, 16]}>
  <Col xs={24} lg={16}>
    {/* 任务创建区 */}
    {/* ... */}
  </Col>
  
  <Col xs={24} lg={8}>
    {/* 变量列表区 */}
    {/* 在小屏幕可折叠 */}
    <Collapse defaultActiveKey={['variables']}>
      <Panel header="全局变量" key="variables">
        {/* 变量列表内容 */}
      </Panel>
    </Collapse>
  </Col>
</Row>
```

## 实施计划

### 1. 开发阶段

| 阶段 | 时间 | 内容 |
|-----|------|-----|
| **设计阶段** | 3周 | 需求分析、UI设计、API设计、数据模型设计 |
| **前端开发** | 5周 | 组件开发、状态管理、变量标签编辑器开发 |
| **后端开发** | 4周 | API实现、业务逻辑、数据访问层、集成测试 |
| **集成测试** | 2周 | 前后端集成、功能测试、性能测试 |
| **上线准备** | 1周 | 文档编写、部署准备、用户培训 |

### 2. 里程碑计划

1. **T+0**: 项目启动，完成需求确认
2. **T+3周**: 完成详细设计，包括UI设计和API设计
3. **T+8周**: 完成前端核心功能开发，包括变量标签编辑器
4. **T+12周**: 完成后端开发和基础集成
5. **T+14周**: 完成完整集成测试
6. **T+15周**: 系统上线

### 3. 资源需求

- **人员配置**
  - 前端开发: 2人
  - 后端开发: 2人
  - UI/UX设计: 1人
  - 测试: 1人
  - 产品经理: 1人

- **开发环境**
  - 开发服务器
  - 测试服务器
  - CI/CD环境

### 4. 风险管理

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 变量标签编辑器开发复杂度高 | 延迟前端开发进度 | 提前研究Slate.js，准备备选方案 |
| 与全局变量系统集成出现问题 | 影响变量引用功能 | 加强与全局变量团队的沟通，提前进行集成测试 |
| 性能问题：变量解析过程耗时 | 影响用户体验 | 实现变量值缓存，限制嵌套深度，进行性能测试 |
| NPC和AI服务模块依赖 | 阻塞集成测试 | 创建模块的模拟实现，减少依赖 |

### 5. 后续版本规划

在完成核心功能后，下一阶段的优化方向包括：

1. **性能优化**:
   - 实现变量解析的多级缓存机制
   - 优化大量工作任务的前端渲染性能
   - 添加定期清理无用变量的机制

2. **功能增强**:
   - 实现工作任务模板功能
   - 添加工作任务分组和标签管理
   - 开发任务执行历史和对比功能
   - 实现工作任务的导入导出功能

3. **集成增强**:
   - 与工作流引擎集成，支持复杂流程
   - 集成通知系统，提供执行结果通知
   - 添加批量处理能力，支持多任务并行执行
