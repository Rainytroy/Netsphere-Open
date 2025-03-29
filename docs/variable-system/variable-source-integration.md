# 全局变量系统变量源集成指南

**版本号**: v2.0.0  
**创建时间**: 2025年3月18日  
**文档状态**: 已定稿  
**关键词**: 变量源, 集成, 提供者

## 概述

变量源是全局变量系统的核心概念，指的是能够产生变量的功能模块。通过实现标准的变量源接口，任何模块都可以将其内部数据作为变量开放给系统中的其他模块使用。本文档提供了关于如何将新的变量源集成到全局变量系统的详细指南。

## 变量源接口

要将新的数据源集成到全局变量系统中，需要实现`VariableSourceProvider`接口：

```typescript
export interface VariableSourceProvider {
  // 获取该源的所有变量
  getVariables(): Promise<Variable[]>;
  
  // 同步所有变量到数据库
  syncVariablesToDatabase(): Promise<void>;
  
  // 获取源类型
  getSourceType(): string;
  
  // 订阅变化事件
  subscribeToChanges(callback: ChangeCallback): void;
}

// 变更回调类型
export type ChangeCallback = (
  action: 'create' | 'update' | 'delete', 
  variables: Variable[]
) => void;
```

## 集成步骤

### 1. 创建变量源提供者类

首先，创建一个新的类来实现`VariableSourceProvider`接口：

```typescript
import { AppDataSource } from '../database';
import { Variable, VariableType } from '../models/Variable';
import { CustomEntity } from '../models/CustomEntity'; // 替换为你的实体模型
import { VariableSourceProvider } from './VariableSourceRegistry';
import { VariableEventPublisher, VariableEventType } from './VariableEventPublisher';
import { IdentifierFormatterService } from './IdentifierFormatterService';
import { Repository } from 'typeorm';

/**
 * 自定义变量源提供者
 * 负责将自定义实体数据转换为变量格式
 */
export class CustomVariableSourceProvider implements VariableSourceProvider {
  private identifierFormatter: IdentifierFormatterService;
  private eventPublisher: VariableEventPublisher;
  private variableRepo: Repository<Variable>;
  
  constructor() {
    // 获取服务实例
    this.identifierFormatter = IdentifierFormatterService.getInstance();
    this.eventPublisher = VariableEventPublisher.getInstance();
    this.variableRepo = AppDataSource.getRepository(Variable);
    
    // 监听事件（可选）
    this.setupEventListeners();
  }
  
  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听源对象重命名事件
    this.eventPublisher.subscribe(VariableEventType.SOURCE_RENAMED, (payload) => {
      if (payload.sourceType === this.getSourceType()) {
        console.log(`源对象重命名: ${payload.oldSourceName} -> ${payload.newSourceName}`);
        // 处理重命名逻辑
      }
    });
  }
  
  /**
   * 获取所有变量
   */
  public async getVariables(): Promise<Variable[]> {
    try {
      // 获取所有自定义实体
      const entityRepo = AppDataSource.getRepository(CustomEntity);
      const entities = await entityRepo.find();
      
      const variables: Variable[] = [];
      
      // 为每个实体创建变量
      for (const entity of entities) {
        // 根据实体属性创建变量
        variables.push(this.createEntityVariable(entity, 'name', entity.name));
        variables.push(this.createEntityVariable(entity, 'description', entity.description || ''));
        // 添加更多字段...
      }
      
      return variables;
    } catch (error) {
      console.error("获取自定义变量失败:", error);
      return [];
    }
  }
  
  /**
   * 同步所有变量到数据库
   */
  public async syncVariablesToDatabase(): Promise<void> {
    try {
      console.log('开始同步自定义变量到数据库...');
      
      // 获取所有变量
      const variables = await this.getVariables();
      
      // 找出已存在的变量
      const identifiers = variables.map(v => v.identifier);
      const existingVariables = await this.variableRepo.find({
        where: { identifier: { $in: identifiers } }
      });
      
      // 创建标识符到变量的映射
      const existingVariableMap = new Map<string, Variable>();
      for (const variable of existingVariables) {
        existingVariableMap.set(variable.identifier, variable);
      }
      
      // 批量保存所有变量
      const variablesToSave: Variable[] = [];
      
      for (const variable of variables) {
        // 检查变量是否已存在
        const existingVariable = existingVariableMap.get(variable.identifier);
        
        if (existingVariable) {
          // 更新已存在的变量
          existingVariable.value = variable.value;
          variablesToSave.push(existingVariable);
        } else {
          // 添加新变量
          variablesToSave.push(variable);
        }
      }
      
      // 保存所有变量
      await this.variableRepo.save(variablesToSave);
      
      console.log(`成功同步 ${variablesToSave.length} 个自定义变量到数据库`);
    } catch (error) {
      console.error('同步自定义变量到数据库失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取源类型
   */
  public getSourceType(): string {
    return 'custom_entity';
  }
  
  /**
   * 监听变化并同步变量
   */
  public subscribeToChanges(
    callback: (action: 'create' | 'update' | 'delete', variables: Variable[]) => void
  ): void {
    console.log('自定义变量源已注册变更监听');
    
    // 实现变化监听逻辑
    // 例如，监听数据库事件或消息队列
    // 当实体发生变化时，调用callback通知系统
    
    // 初始同步一次
    this.syncVariablesToDatabase().catch(error => {
      console.error('初始同步自定义变量失败:', error);
    });
  }
  
  /**
   * 创建实体相关的变量
   */
  private createEntityVariable(entity: CustomEntity, field: string, value: string): Variable {
    // 创建唯一标识符 - 使用新的UUID格式
    const identifier = this.identifierFormatter.formatIdentifier(
      'custom_entity',
      entity.name,
      field,
      entity.id
    );
    
    // 创建显示用标识符
    const displayIdentifier = this.identifierFormatter.formatDisplayIdentifier(
      'custom_entity',
      entity.name,
      field,
      entity.id
    );
    
    // 创建变量
    const variable: any = {
      id: `custom_entity_${entity.id}_${field}`, // 构建一个唯一ID
      name: this.getFieldDisplayName(field),
      value: value,
      type: VariableType.CUSTOM,
      source: {
        id: entity.id,
        name: entity.name,
        type: 'custom_entity'
      },
      identifier: identifier,
      displayIdentifier: displayIdentifier,
      entityId: entity.id,
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return variable;
  }
  
  /**
   * 获取字段的显示名称
   */
  private getFieldDisplayName(field: string): string {
    const displayNames: Record<string, string> = {
      'name': '名称',
      'description': '描述',
      // 添加更多字段映射...
    };
    
    return displayNames[field] || field;
  }
}
```

### 2. 注册变量源提供者

在应用程序启动时，将变量源提供者注册到变量源注册中心：

```typescript
import { VariableSourceRegistry } from './services/VariableSourceRegistry';
import { CustomVariableSourceProvider } from './services/CustomVariableSourceProvider';

// 获取变量源注册中心实例
const variableSourceRegistry = VariableSourceRegistry.getInstance();

// 创建变量源提供者实例
const customVariableSource = new CustomVariableSourceProvider();

// 注册变量源提供者
variableSourceRegistry.registerProvider(customVariableSource);

// 启动初始化同步
customVariableSource.syncVariablesToDatabase()
  .then(() => console.log('自定义变量初始化同步完成'))
  .catch(error => console.error('自定义变量初始化同步失败:', error));
```

### 3. 处理源对象变更

在源对象（如实体）发生变更时，需要同步更新相关的变量。这可以通过在实体控制器或服务中添加代码来实现：

```typescript
// 在实体控制器中处理变量同步
import { CustomVariableSourceProvider } from '../services/CustomVariableSourceProvider';
import { VariableSourceRegistry } from '../services/VariableSourceRegistry';

export class CustomEntityController {
  private variableSourceProvider: CustomVariableSourceProvider;
  
  constructor() {
    // 获取变量源提供者
    const variableSourceRegistry = VariableSourceRegistry.getInstance();
    this.variableSourceProvider = variableSourceRegistry.getProviderByType('custom_entity') as CustomVariableSourceProvider;
  }
  
  // 创建实体
  async createEntity(data: CreateEntityDTO): Promise<CustomEntity> {
    // 创建实体的代码...
    const entity = await this.entityRepo.save(data);
    
    // 同步变量
    await this.variableSourceProvider.syncVariablesToDatabase();
    
    return entity;
  }
  
  // 更新实体
  async updateEntity(id: string, data: UpdateEntityDTO): Promise<CustomEntity> {
    // 获取旧实体
    const oldEntity = await this.entityRepo.findOne(id);
    
    // 更新实体的代码...
    const entity = await this.entityRepo.save({ id, ...data });
    
    // 如果名称发生变化，处理变量标识符更新
    if (oldEntity && oldEntity.name !== entity.name) {
      // 发布源对象重命名事件
      const identifierFormatter = IdentifierFormatterService.getInstance();
      await identifierFormatter.updateIdentifiers(
        oldEntity.name,
        entity.name,
        'custom_entity'
      );
    } else {
      // 正常同步变量
      await this.variableSourceProvider.syncVariablesToDatabase();
    }
    
    return entity;
  }
  
  // 删除实体
  async deleteEntity(id: string): Promise<boolean> {
    // 删除实体的代码...
    await this.entityRepo.delete(id);
    
    // 删除相关变量
    await this.deleteEntityVariables(id);
    
    return true;
  }
  
  // 删除实体相关的变量
  private async deleteEntityVariables(entityId: string): Promise<void> {
    try {
      const entity = await this.entityRepo.findOne(entityId);
      if (!entity) {
        return;
      }
      
      const variableService = VariableService.getInstance();
      await variableService.deleteVariablesBySource('custom_entity', entityId);
    } catch (error) {
      console.error(`删除实体(ID: ${entityId})变量时发生错误:`, error);
      throw error;
    }
  }
}
```

## 变量源与事件系统

变量源可以利用系统的事件机制来响应变量的变化：

```typescript
// 在变量源提供者中监听事件
constructor() {
  // 获取事件发布器
  this.eventPublisher = VariableEventPublisher.getInstance();
  
  // 监听变量创建事件
  this.eventPublisher.subscribe(VariableEventType.CREATED, (variable) => {
    if (variable.source.type === this.getSourceType()) {
      console.log(`创建了新变量: ${variable.name} (${variable.identifier})`);
    }
  });
  
  // 监听变量更新事件
  this.eventPublisher.subscribe(VariableEventType.UPDATED, (variable) => {
    if (variable.source.type === this.getSourceType()) {
      console.log(`更新了变量: ${variable.name} (${variable.identifier})`);
    }
  });
  
  // 监听变量删除事件
  this.eventPublisher.subscribe(VariableEventType.DELETED, (variable) => {
    if (variable.source.type === this.getSourceType()) {
      console.log(`删除了变量: ${variable.name} (${variable.identifier})`);
    }
  });
  
  // 监听源对象重命名事件
  this.eventPublisher.subscribe(VariableEventType.SOURCE_RENAMED, (payload) => {
    if (payload.sourceType === this.getSourceType()) {
      console.log(`源对象重命名: ${payload.oldSourceName} -> ${payload.newSourceName}`);
    }
  });
}
```

## 变量源最佳实践

### 1. 变量命名

- 使用清晰、一致的字段名称
- 对于中文名称，使用简短易懂的词语
- 对于英文名称，使用camelCase命名法

### 2. 变量值处理

- 确保变量值不超过系统限制（默认最大10000字符）
- 对于结构化数据，使用JSON字符串格式存储
- 对于敏感数据，考虑加密或脱敏处理

### 3. 性能优化

- 批量获取和保存变量，减少数据库操作次数
- 实现高效的变更检测机制，避免不必要的同步
- 使用缓存减少频繁访问数据库

### 4. 错误处理

- 捕获并记录所有异常，但不要影响主业务流程
- 实现自动重试机制，处理临时性错误
- 提供详细的错误日志，便于排查问题

### 5. 测试建议

- 测试变量创建、更新和删除的正确性
- 测试源对象重命名时变量标识符的更新
- 测试异常情况下的系统恢复能力

## 变量源示例

### NPC变量源（简化版）

```typescript
export class NpcVariableSourceProvider implements VariableSourceProvider {
  // 获取所有NPC变量
  public async getVariables(): Promise<Variable[]> {
    const npcRepo = AppDataSource.getRepository(Npc);
    const npcs = await npcRepo.find();
    
    const variables: Variable[] = [];
    
    for (const npc of npcs) {
      variables.push(this.createNpcVariable(npc, 'name', npc.name));
      variables.push(this.createNpcVariable(npc, 'description', npc.description || ''));
      variables.push(this.createNpcVariable(npc, 'kb', npc.knowledgeBackground));
      variables.push(this.createNpcVariable(npc, 'ap', npc.actionPrinciples));
      variables.push(this.createNpcVariable(npc, 'al', npc.activityLevelDescription));
    }
    
    return variables;
  }
  
  // 其他方法实现...
}
```

### 工作任务变量源（简化版）

```typescript
export class WorkTaskVariableSourceProvider implements VariableSourceProvider {
  // 获取所有工作任务变量
  public async getVariables(): Promise<Variable[]> {
    const taskRepo = AppDataSource.getRepository(WorkTask);
    const tasks = await taskRepo.find();
    
    const variables: Variable[] = [];
    
    for (const task of tasks) {
      variables.push(this.createTaskVariable(task, 'input', task.input || ''));
      variables.push(this.createTaskVariable(task, 'output', task.output || ''));
      variables.push(this.createTaskVariable(task, 'status', task.status));
    }
    
    return variables;
  }
  
  // 其他方法实现...
}
```

## 扩展功能

### 1. 变量值验证器

为变量源添加值验证器，确保变量值符合预期格式：

```typescript
// 变量值验证器接口
interface VariableValidator {
  validate(value: string): boolean;
  getErrorMessage(): string;
}

// 示例：JSON验证器
class JsonValidator implements VariableValidator {
  validate(value: string): boolean {
    try {
      JSON.parse(value);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  getErrorMessage(): string {
    return '值必须是有效的JSON格式';
  }
}

// 在变量源中使用验证器
private validateVariableValue(field: string, value: string): boolean {
  const validators: Record<string, VariableValidator> = {
    'config': new JsonValidator(),
    // 添加更多字段的验证器...
  };
  
  const validator = validators[field];
  if (validator && !validator.validate(value)) {
    console.error(`字段 ${field} 的值验证失败: ${validator.getErrorMessage()}`);
    return false;
  }
  
  return true;
}
```

### 2. 变量值转换器

为变量源添加值转换器，实现高级数据转换：

```typescript
// 变量值转换器接口
interface ValueTransformer {
  transform(value: any): string;
  reverseTransform(value: string): any;
}

// 示例：日期转换器
class DateTransformer implements ValueTransformer {
  transform(value: Date): string {
    return value.toISOString();
  }
  
  reverseTransform(value: string): Date {
    return new Date(value);
  }
}

// 在变量源中使用转换器
private transformValue(field: string, value: any): string {
  const transformers: Record<string, ValueTransformer> = {
    'createdAt': new DateTransformer(),
    // 添加更多字段的转换器...
  };
  
  const transformer = transformers[field];
  if (transformer) {
    return transformer.transform(value);
  }
  
  return String(value);
}
```

## 相关文档

- [系统概述与标识符规范](./variable-system-overview.md)
- [UI设计规范](./variable-system-ui-design.md)
- [系统架构设计](./variable-system-architecture.md)
- [迁移与最佳实践](./variable-system-migration.md)
