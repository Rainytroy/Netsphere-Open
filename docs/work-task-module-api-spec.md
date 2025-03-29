# 工作任务管理模块API接口规范

**版本号**: v1.2.0  
**创建时间**: 2025年3月9日 05:58  
**更新时间**: 2025年3月10日 16:55  
**文档状态**: 已修订  

> 注意：本文档是《工作任务管理模块》规范的一部分，专注于API接口设计。
> 概念设计和界面规范请参见：[工作任务模块概念设计与界面规范](work-task-module-concept-design.md)
> 技术实现规范请参见：[工作任务模块技术实现规范](work-task-module-technical-spec.md)

## 目录

1. [API概述](#api概述)
2. [RESTful接口定义](#restful接口定义)
3. [工作任务管理API](#工作任务管理api)
4. [工作任务服务层](#工作任务服务层)
5. [工作任务变量集成API](#工作任务变量集成api)
6. [工作任务事件服务API](#工作任务事件服务api)
7. [Prompt处理API](#prompt处理api)

## API概述

工作任务管理模块的API接口主要分为以下几类：

- **RESTful API**: 提供给前端的HTTP接口，用于工作任务的CRUD操作和执行
- **服务层API**: 内部服务之间的调用接口，处理业务逻辑
- **变量集成API**: 与全局变量系统的集成接口
- **事件服务API**: 工作任务事件的发布与订阅接口
- **Prompt处理API**: 处理变量引用和组合Prompt的接口

## RESTful接口定义

| 方法   | URL                         | 描述                 | 请求体                   | 响应                        |
|------|-----------------------------|--------------------|------------------------|-----------------------------|
| GET  | /api/work-tasks             | 获取所有工作任务          | -                      | 工作任务列表                     |
| GET  | /api/work-tasks/:id         | 获取单个工作任务          | -                      | 单个工作任务                     |
| POST | /api/work-tasks             | 创建工作任务            | 工作任务数据                | 创建的工作任务                    |
| PUT  | /api/work-tasks/:id         | 更新工作任务            | 工作任务数据                | 更新后的工作任务                   |
| DELETE | /api/work-tasks/:id       | 删除工作任务            | -                      | 204 No Content              |
| POST | /api/work-tasks/test        | 测试工作任务执行结果        | 输入、NPC、AI服务和提示词模板数据 | 执行结果                       |
| POST | /api/work-tasks/:id/execute | 执行工作任务            | -                      | 202 Accepted（任务已接受，异步执行） |

## 工作任务管理API

```typescript
/**
 * 工作任务控制器
 */
export class WorkTaskController {
  private workTaskService: WorkTaskService;
  private promptProcessingService: PromptProcessingService;
  private aiServiceService: AiServiceService;
  private workTaskEventService: WorkTaskEventService;

  constructor(
    workTaskService: WorkTaskService,
    promptProcessingService: PromptProcessingService,
    aiServiceService: AiServiceService,
    workTaskEventService: WorkTaskEventService
  ) {
    this.workTaskService = workTaskService;
    this.promptProcessingService = promptProcessingService;
    this.aiServiceService = aiServiceService;
    this.workTaskEventService = workTaskEventService;
  }

  /**
   * 获取所有工作任务
   */
  async getAllWorkTasks(req: Request, res: Response) {
    try {
      const tasks = await this.workTaskService.getAllWorkTasks();
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 获取单个工作任务
   */
  async getWorkTaskById(req: Request, res: Response) {
    try {
      const taskId = req.params.id;
      const task = await this.workTaskService.getWorkTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ error: "工作任务不存在" });
      }
      
      res.status(200).json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 创建工作任务
   */
  async createWorkTask(req: Request, res: Response) {
    try {
      const taskData = req.body;
      
      // 检查循环引用
      const hasCircularReferences = 
        this.promptProcessingService.checkCircularReferences(
          'temp_id', // 临时ID用于检查
          taskData.input,
          taskData.output || ''
        );
      
      if (hasCircularReferences) {
        return res.status(400).json({ 
          error: "检测到循环变量引用，请修改后重试" 
        });
      }
      
      const task = await this.workTaskService.createWorkTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 更新工作任务
   */
  async updateWorkTask(req: Request, res: Response) {
    try {
      const taskId = req.params.id;
      const taskData = req.body;
      
      // 检查循环引用
      const hasCircularReferences = 
        this.promptProcessingService.checkCircularReferences(
          taskId,
          taskData.input,
          taskData.output || ''
        );
      
      if (hasCircularReferences) {
        return res.status(400).json({ 
          error: "检测到循环变量引用，请修改后重试" 
        });
      }
      
      const task = await this.workTaskService.updateWorkTask(taskId, taskData);
      
      if (!task) {
        return res.status(404).json({ error: "工作任务不存在" });
      }
      
      res.status(200).json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 删除工作任务
   */
  async deleteWorkTask(req: Request, res: Response) {
    try {
      const taskId = req.params.id;
      const result = await this.workTaskService.deleteWorkTask(taskId);
      
      if (!result) {
        return res.status(404).json({ error: "工作任务不存在" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 测试工作任务执行结果
   */
  async testWorkTask(req: Request, res: Response) {
    try {
      const { input, npcId, aiServiceId, npcPromptTemplate } = req.body;
      
      // 解析输入中的变量引用
      const resolvedInput = await this.promptProcessingService.resolveVariables(input);
      
      // 组合完整的Prompt
      const template = npcPromptTemplate?.template || await this.workTaskService.getDefaultPromptTemplate(npcId);
      const fullPrompt = await this.promptProcessingService.composeFullPrompt(
        resolvedInput,
        npcId,
        template
      );
      
      // 调用AI服务
      const aiService = await this.aiServiceService.getAiServiceById(aiServiceId);
      if (!aiService) {
        return res.status(400).json({ error: "指定的AI服务不存在" });
      }
      
      const output = await this.aiServiceService.executePrompt(
        aiServiceId,
        fullPrompt
      );
      
      res.status(200).json({ output });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 执行工作任务
   */
  async executeWorkTask(req: Request, res: Response) {
    try {
      const taskId = req.params.id;
      const task = await this.workTaskService.getWorkTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ error: "工作任务不存在" });
      }
      
      // 设置任务状态为执行中
      await this.workTaskService.updateWorkTaskExecutionStatus(
        taskId, 
        ExecutionStatus.RUNNING, 
        null
      );
      
      // 发布执行开始事件
      this.workTaskEventService.publish(
        WorkTaskEventType.EXECUTION_STARTED,
        taskId
      );
      
      // 启动异步执行过程
      this.executeWorkTaskAsync(task)
        .then(() => {
          console.log(`工作任务 ${taskId} 执行完成`);
        })
        .catch(error => {
          console.error(`工作任务 ${taskId} 执行失败:`, error);
        });
      
      // 立即返回响应，不等待执行完成
      res.status(202).json({ 
        message: "工作任务执行已启动", 
        taskId 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 异步执行工作任务
   * 这是一个内部方法，不暴露为API
   */
  private async executeWorkTaskAsync(task: WorkTask) {
    try {
      // 解析输入中的变量引用
      const resolvedInput = await this.promptProcessingService.resolveVariables(
        task.input, 
        task.id
      );
      
      // 组合完整的Prompt
      const template = task.npcPromptTemplate?.template || 
        await this.workTaskService.getDefaultPromptTemplate(task.npcId);
      
      const fullPrompt = await this.promptProcessingService.composeFullPrompt(
        resolvedInput,
        task.npcId,
        template
      );
      
      // 调用AI服务
      const output = await this.aiServiceService.executePrompt(
        task.aiServiceId,
        fullPrompt
      );
      
      // 保存输出结果并更新任务状态
      await this.workTaskService.updateTaskOutput(
        task.id, 
        output, 
        ExecutionStatus.COMPLETED
      );
      
      // 发布执行完成事件
      this.workTaskEventService.publish(
        WorkTaskEventType.EXECUTION_COMPLETED,
        task.id,
        { output }
      );
      
      return output;
    } catch (error) {
      // 更新任务执行状态为失败
      await this.workTaskService.updateWorkTaskExecutionStatus(
        task.id, 
        ExecutionStatus.FAILED, 
        error.message
      );
      
      // 发布执行失败事件
      this.workTaskEventService.publish(
        WorkTaskEventType.EXECUTION_FAILED,
        task.id,
        { error: error.message }
      );
      
      throw error;
    }
  }
}

/**
 * 工作任务路由配置
 */
export function configureWorkTaskRoutes(app: Express) {
  const controller = new WorkTaskController(
    new WorkTaskService(),
    new PromptProcessingService(
      new VariableService(),
      new NpcService(),
      new AiServiceService()
    ),
    new AiServiceService(),
    WorkTaskEventService.getInstance()
  );
  
  app.get('/api/work-tasks', controller.getAllWorkTasks.bind(controller));
  app.get('/api/work-tasks/:id', controller.getWorkTaskById.bind(controller));
  app.post('/api/work-tasks', controller.createWorkTask.bind(controller));
  app.put('/api/work-tasks/:id', controller.updateWorkTask.bind(controller));
  app.delete('/api/work-tasks/:id', controller.deleteWorkTask.bind(controller));
  app.post('/api/work-tasks/test', controller.testWorkTask.bind(controller));
  app.post('/api/work-tasks/:id/execute', controller.executeWorkTask.bind(controller));
}
```

## 工作任务服务层

```typescript
/**
 * 工作任务服务类
 */
export class WorkTaskService {
  private npcService: NpcService;
  private variableService: VariableService;
  
  constructor(
    npcService: NpcService = new NpcService(),
    variableService: VariableService = new VariableService()
  ) {
    this.npcService = npcService;
    this.variableService = variableService;
  }
  
  /**
   * 获取所有工作任务
   */
  public async getAllWorkTasks(): Promise<WorkTask[]> {
    // 实现数据访问逻辑
  }
  
  /**
   * 获取单个工作任务
   */
  public async getWorkTaskById(id: string): Promise<WorkTask | null> {
    // 实现数据访问逻辑
  }
  
  /**
   * 创建工作任务
   */
  public async createWorkTask(taskData: Partial<WorkTask>): Promise<WorkTask> {
    // 实现数据访问逻辑
    // 同时注册相关的全局变量
  }
  
  /**
   * 更新工作任务
   */
  public async updateWorkTask(
    id: string, 
    taskData: Partial<WorkTask>
  ): Promise<WorkTask | null> {
    // 实现数据访问逻辑
    // 同时更新相关的全局变量
  }
  
  /**
   * 删除工作任务
   */
  public async deleteWorkTask(id: string): Promise<boolean> {
    // 实现数据访问逻辑
    // 同时删除相关的全局变量
  }
  
  /**
   * 更新工作任务的执行状态
   */
  public async updateWorkTaskExecutionStatus(
    id: string,
    status: ExecutionStatus,
    message: string | null
  ): Promise<WorkTask | null> {
    // 实现数据访问逻辑
  }
  
  /**
   * 更新工作任务的输出内容和执行状态
   */
  public async updateTaskOutput(
    id: string,
    output: string,
    status: ExecutionStatus
  ): Promise<WorkTask | null> {
    // 实现数据访问逻辑
    // 同时更新相关的全局变量
  }
  
  /**
   * 获取默认的NPC提示词模板
   */
  public async getDefaultPromptTemplate(npcId: string): Promise<string> {
    const npc = await this.npcService.getNpcById(npcId);
    
    if (!npc) {
      throw new Error(`NPC不存在: ${npcId}`);
    }
    
    return `你是@${npc.name}.姓名，现在你具备的知识背景是：@${npc.name}.知识背景，根据你的行动原则：@${npc.name}.行动原则，请你给出以上输入的反馈。`;
  }
}
```

## 工作任务变量集成API

```typescript
/**
 * 工作任务变量提供者服务
 * 实现VariableSourceProvider接口，为全局变量系统提供工作任务变量
 */
export class WorkTaskVariableSourceProvider implements VariableSourceProvider {
  private workTaskService: WorkTaskService;
  private identifierFormatter: IdentifierFormatterService;
  private workTaskEventService: WorkTaskEventService;
  
  constructor(
    workTaskService: WorkTaskService = new WorkTaskService(),
    workTaskEventService: WorkTaskEventService = WorkTaskEventService.getInstance()
  ) {
    this.workTaskService = workTaskService;
    this.identifierFormatter = IdentifierFormatterService.getInstance();
    this.workTaskEventService = workTaskEventService;
    
    // 注册事件监听
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // 监听输出变更事件，同步变量
    this.workTaskEventService.subscribe(
      WorkTaskEventType.OUTPUT_CHANGED,
      async ({ taskId, data }) => {
        const task = await this.workTaskService.getWorkTaskById(taskId);
        if (task) {
          await this.updateTaskVariables(task);
        }
      }
    );
  }
  
  /**
   * 获取所有工作任务相关的变量
   */
  public async getVariables(): Promise<Variable[]> {
    const tasks = await this.workTaskService.getAllWorkTasks();
    let variables: Variable[] = [];
    
    for (const task of tasks) {
      const taskVariables = await this.getTaskVariables(task.id);
      variables = [...variables, ...taskVariables];
    }
    
    return variables;
  }
  
  /**
   * 获取单个工作任务的变量
   */
  public async getTaskVariables(taskId: string): Promise<Variable[]> {
    const task = await this.workTaskService.getWorkTaskById(taskId);
    
    if (!task) {
      return [];
    }
    
    const variables: Variable[] = [];
    
    // 输入变量
    variables.push({
      id: this.generateVariableId(task.id, WorkTaskVariableField.INPUT),
      name: `${task.name}.input`,
      sourceId: task.id,
      sourceType: this.getSourceType(),
      fieldName: WorkTaskVariableField.INPUT,
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
      fieldName: WorkTaskVariableField.OUTPUT,
      value: task.output || '',
      type: VariableType.TASK,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    });
    
    return variables;
  }
  
  /**
   * 更新单个工作任务的变量
   */
  private async updateTaskVariables(task: WorkTask): Promise<void> {
    const variables = await this.getTaskVariables(task.id);
    
    // 使用变量服务更新变量
    const variableService = new VariableService();
    for (const variable of variables) {
      await variableService.updateOrCreateVariable(variable);
    }
  }
  
  /**
   * 生成变量ID
   */
  private generateVariableId(taskId: string, fieldName: WorkTaskVariableField): string {
    return `${this.getSourceType()}_${taskId}_${fieldName}`;
  }
  
  /**
   * 监听工作任务变化并同步变量
   */
  public subscribeToChanges(
    callback: (action: 'create' | 'update' | 'delete', variables: Variable[]) => void
  ): void {
    // 当工作任务创建时
    this.workTaskEventService.subscribe(
      WorkTaskEventType.INPUT_CHANGED,
      async ({ taskId }) => {
        const task = await this.workTaskService.getWorkTaskById(taskId);
        if (task) {
          const variables = await this.getTaskVariables(task.id);
          callback('update', variables);
        }
      }
    );
    
    // 当工作任务输出更新时
    this.workTaskEventService.subscribe(
      WorkTaskEventType.OUTPUT_CHANGED,
      async ({ taskId }) => {
        const task = await this.workTaskService.getWorkTaskById(taskId);
        if (task) {
          const variables = await this.getTaskVariables(task.id);
          callback('update', variables);
        }
      }
    );
  }
  
  /**
   * 获取变量源类型标识
   */
  public getSourceType(): string {
    return 'work_task';
  }
}
```

## 工作任务事件服务API

```typescript
/**
 * 工作任务事件服务
 * 用于发布和订阅工作任务相关事件
 */
export class WorkTaskEventService {
  private static instance: WorkTaskEventService;
  private eventEmitter: EventEmitter;
  
  private constructor() {
    this.eventEmitter = new EventEmitter();
  }
  
  /**
   * 获取单例实例
   */
  public static getInstance(): WorkTaskEventService {
    if (!WorkTaskEventService.instance) {
      WorkTaskEventService.instance = new WorkTaskEventService();
    }
    return WorkTaskEventService.instance;
  }
  
  /**
   * 发布工作任务事件
   */
  public publish(
    eventType: WorkTaskEventType,
    taskId: string,
    data?: any
  ): void {
    console.log(`发布事件 ${eventType} 对于任务 ${taskId}`);
    this.eventEmitter.emit(eventType, { taskId, data });
    
    // 同时发布带有taskId的特定事件，方便只订阅特定任务的事件
    this.eventEmitter.emit(`${eventType}:${taskId}`, { taskId, data });
  }
  
  /**
   * 订阅工作任务事件
   */
  public subscribe(
    eventType: WorkTaskEventType,
    handler: (data: { taskId: string, data?: any }) => void
  ): () => void {
    this.eventEmitter.on(eventType, handler);
    
    // 返回取消订阅的函数
    return () => {
      this.eventEmitter.off(eventType, handler);
    };
  }
  
  /**
   * 订阅特定工作任务的事件
   */
  public subscribeToTask(
    eventType: WorkTaskEventType,
    taskId: string,
    handler: (data: { taskId: string, data?: any }) => void
  ): () => void {
    const specificEvent = `${eventType}:${taskId}`;
    this.eventEmitter.on(specificEvent, handler);
    
    // 返回取消订阅的函数
    return () => {
      this.eventEmitter.off(specificEvent, handler);
    };
  }
}
```

## Prompt处理API增强

### 1. 变量解析缓存实现

```typescript
/**
 * Prompt处理服务 - 增强版
 */
export class PromptProcessingService {
  private variableService: VariableService;
  private npcService: NpcService;
  private aiServiceService: AiServiceService;
  private identifierFormatter: IdentifierFormatterService;
  private variableCache: Map<string, string> = new Map();
  private readonly MAX_DEPTH = 5;
  
  constructor(
    variableService: VariableService,
    npcService: NpcService,
    aiServiceService: AiServiceService
  ) {
    this.variableService = variableService;
    this.npcService = npcService;
    this.aiServiceService = aiServiceService;
    this.identifierFormatter = IdentifierFormatterService.getInstance();
  }
  
  /**
   * 使用缓存解析包含变量引用的文本
   */
  public async resolveVariablesWithCache(text: string, taskId?: string): Promise<string> {
    // 重置缓存
    this.variableCache = new Map<string, string>();
    return this.resolveWithDepth(text, 0, taskId);
  }
  
  /**
   * 带缓存和深度控制的变量解析
   */
  private async resolveWithDepth(text: string, depth = 0, taskId?: string): Promise<string> {
    if (depth >= this.MAX_DEPTH) {
      console.warn(`达到最大递归深度(${this.MAX_DEPTH})，可能存在循环引用`);
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
      
      // 检查是否自引用（循环引用）
      if (taskId) {
        const taskIdentifiers = [
          this.identifierFormatter.formatIdentifier('work_task', taskId, 'input'),
          this.identifierFormatter.formatIdentifier('work_task', taskId, 'output')
        ];
        
        if (taskIdentifiers.includes(ref.identifier)) {
          const errorText = `[无法解析: ${ref.identifier} - 循环引用]`;
          resolvedText = resolvedText.replace(ref.identifier, errorText);
          this.variableCache.set(ref.identifier, errorText);
          continue;
        }
      }
      
      try {
        // 获取变量值
        const variable = await this.variableService.getVariableByIdentifier(ref.identifier);
        
        if (variable) {
          // 递归解析变量值中可能包含的变量引用
          const nestedValue = await this.resolveWithDepth(variable.value, depth + 1, taskId);
          
          // 替换文本中的变量引用
          resolvedText = resolvedText.replace(ref.identifier, nestedValue);
          
          // 添加到缓存
          this.variableCache.set(ref.identifier, nestedValue);
        } else {
          // 变量不存在，用占位符替换
          const notFoundText = `[未找到变量: ${ref.identifier}]`;
          resolvedText = resolvedText.replace(ref.identifier, notFoundText);
          this.variableCache.set(ref.identifier, notFoundText);
        }
      } catch (error) {
        console.error(`解析变量 ${ref.identifier} 失败:`, error);
        // 用错误信息替换
        const errorText = `[错误: ${error.message}]`;
        resolvedText = resolvedText.replace(ref.identifier, errorText);
        this.variableCache.set(ref.identifier, errorText);
      }
    }
    
    return resolvedText;
  }
  
  /**
   * 兼容旧版API的变量解析方法
   */
  public async resolveVariables(text: string, taskId?: string): Promise<string> {
    return this.resolveVariablesWithCache(text, taskId);
  }
  
  /**
   * 提取文本中的所有变量引用
   */
  public extractVariableReferences(text: string): VariableReference[] {
    const references: VariableReference[] = [];
    // 匹配 @xxx.yyy 格式的变量引用
    const regex = /@([a-zA-Z0-9\u4e00-\u9fa5_]+)\.([a-zA-Z0-9_]+)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const identifier = match[0]; // 完整的标识符
      const sourceName = match[1]; // 来源名称
      const fieldName = match[2];  // 字段名称
      
      references.push({
        identifier,
        sourceId: '', // 需要根据sourceName查询实际ID
        sourceType: '', // 需要确定
        fieldName,
        startIndex: match.index,
        endIndex: match.index + identifier.length
      });
    }
    
    return references;
  }
  
  /**
   * 增强版循环引用检测（支持间接循环检测）
   */
  public async checkCircularReferencesEnhanced(
    taskId: string,
    input: string,
    output: string
  ): Promise<boolean> {
    // 存储已访问的变量路径
    const visitedPath = new Set<string>();
    
    // 生成当前任务的变量标识符
    const taskIdentifiers = [
      this.identifierFormatter.formatIdentifier('work_task', taskId, 'input'),
      this.identifierFormatter.formatIdentifier('work_task', taskId, 'output')
    ];
    
    // 检查输入和输出是否存在循环引用
    const inputHasCircular = await this.checkCircularInText(input, visitedPath, taskIdentifiers);
    
    // 重置已访问路径
    visitedPath.clear();
    
    const outputHasCircular = await this.checkCircularInText(output, visitedPath, taskIdentifiers);
    
    return inputHasCircular || outputHasCircular;
  }
  
  /**
   * 检查文本中是否存在循环引用（递归实现）
   */
  private async checkCircularInText(
    text: string,
    visitedPath: Set<string>,
    taskIdentifiers: string[]
  ): Promise<boolean> {
    // 提取文本中的所有变量引用
    const references = this.extractVariableReferences(text);
    
    // 遍历处理每个引用
    for (const ref of references) {
      // 检查直接自引用
      if (taskIdentifiers.includes(ref.identifier)) {
        return true;
      }
      
      // 检查间接循环引用
      if (visitedPath.has(ref.identifier)) {
        return true; // 已经访问过，存在循环
      }
      
      // 将当前变量添加到访问路径
      visitedPath.add(ref.identifier);
      
      try {
        // 获取变量值
        const variable = await this.variableService.getVariableByIdentifier(ref.identifier);
        
        if (variable) {
          // 递归检查变量值中是否存在循环引用
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
        console.error(`检查循环引用过程中出错: ${ref.identifier}`, error);
      } finally {
        // 回溯：从访问路径中移除当前变量
        visitedPath.delete(ref.identifier);
      }
    }
    
    return false; // 未发现循环引用
  }
  
  /**
   * 兼容旧版API的循环引用检测
   */
  public checkCircularReferences(
    taskId: string,
    input: string,
    output: string
  ): boolean {
    // 获取输入和输出中的所有变量引用
    const inputRefs = this.extractVariableReferences(input);
    const outputRefs = this.extractVariableReferences(output);
    
    // 检查是否有直接自引用
    const taskIdentifiers = [
      this.identifierFormatter.formatIdentifier('work_task', taskId, 'input'),
      this.identifierFormatter.formatIdentifier('work_task', taskId, 'output')
    ];
    
    // 如果输入中引用了自己的输出，或输出中引用了自己的输入，则存在循环
    return inputRefs.some(ref => taskIdentifiers.includes(ref.identifier)) ||
           outputRefs.some(ref => taskIdentifiers.includes(ref.identifier));
  }
  
  /**
   * 组合完整的Prompt
   */
  public async composeFullPrompt(
    taskInput: string,
    npcId: string,
    promptTemplate: string
  ): Promise<string> {
    // 获取NPC信息
    const npc = await this.npcService.getNpcById(npcId);
    
    if (!npc) {
      throw new Error(`NPC不存在: ${npcId}`);
    }
    
    // 替换模板中的NPC名称
    let template = promptTemplate.replace(/{npcName}/g, npc.name);
    
    // 解析模板中的变量引用（使用缓存版本）
    template = await this.resolveVariablesWithCache(template);
    
    // 组合最终的Prompt
    return `${taskInput}\n\n${template}`;
  }
  
  /**
   * 性能统计：获取缓存命中情况
   */
  public getCacheStats(): { total: number, hits: number, hitRate: string } {
    const total = this.variableCache.size;
    // 命中计数需要在实际解析过程中收集，这里仅为示例
    const hits = 0; // 实际实现中应跟踪命中次数
    const hitRate = total > 0 ? `${(hits / total * 100).toFixed(2)}%` : '0%';
    
    return { total, hits, hitRate };
  }
}
```

### 2. 错误处理增强

```typescript
/**
 * 工作任务API错误类型定义
 */
export enum WorkTaskErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  DUPLICATE_NAME = 'DUPLICATE_NAME',
  VARIABLE_RESOLUTION_FAILED = 'VARIABLE_RESOLUTION_FAILED',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * 工作任务API错误类
 */
export class WorkTaskError extends Error {
  public code: WorkTaskErrorCode;
  public statusCode: number;
  public details?: any;
  
  constructor(
    code: WorkTaskErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.name = 'WorkTaskError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
  
  /**
   * 转换为API响应格式
   */
  public toResponse() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
  
  /**
   * 创建循环引用错误
   */
  public static circularReference(details: any): WorkTaskError {
    return new WorkTaskError(
      WorkTaskErrorCode.CIRCULAR_REFERENCE,
      '检测到循环变量引用，请修改后重试',
      400,
      details
    );
  }
  
  /**
   * 创建任务未找到错误
   */
  public static notFound(taskId: string): WorkTaskError {
    return new WorkTaskError(
      WorkTaskErrorCode.NOT_FOUND,
      `工作任务不存在: ${taskId}`,
      404
    );
  }
  
  /**
   * 创建变量解析失败错误
   */
  public static variableResolutionFailed(details: any): WorkTaskError {
    return new WorkTaskError(
      WorkTaskErrorCode.VARIABLE_RESOLUTION_FAILED,
      '变量解析失败，请检查变量引用',
      400,
      details
    );
  }
}

/**
 * 错误处理中间件
 */
export function workTaskErrorHandler(
  err: Error, 
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  // 处理工作任务特定错误
  if (err instanceof WorkTaskError) {
    return res.status(err.statusCode).json(err.toResponse());
  }
  
  // 处理其他错误
  console.error('工作任务API未处理错误:', err);
  res.status(500).json({
    error: {
      code: WorkTaskErrorCode.INTERNAL_ERROR,
      message: '服务器内部错误',
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    }
  });
}
```

### 3. API请求/响应模型增强

```typescript
/**
 * 工作任务测试请求
 */
export interface TestWorkTaskRequest {
  input: string;
  npcId: string;
  aiServiceId: string;
  npcPromptTemplate?: {
    template: string;
    isCustomized: boolean;
  };
}

/**
 * 工作任务测试响应
 */
export interface TestWorkTaskResponse {
  output: string;
  resolvedVariables?: {
    original: string;
    resolved: string;
  }[];
  prompt?: string; // 仅调试模式返回
  executionTime?: number; // 毫秒
}

/**
 * 工作任务执行响应
 */
export interface ExecuteWorkTaskResponse {
  message: string;
  taskId: string;
  executionId?: string; // 执行ID，用于后续查询执行状态
  estimatedCompletionTime?: number; // 预计完成时间（毫秒）
}

/**
 * 工作任务执行结果查询
 */
export interface WorkTaskExecutionResult {
  taskId: string;
  executionId: string;
  status: ExecutionStatus;
  output?: string;
  startTime: Date;
  endTime?: Date;
  executionTime?: number; // 毫秒
  errorMessage?: string;
}

/**
 * 工作任务分页查询参数
 */
export interface WorkTaskQueryParams {
  page?: number;
  pageSize?: number;
  status?: WorkTaskStatus;
  search?: string; // 搜索关键词
  sort?: 'createdAt' | 'updatedAt' | 'name'; // 排序字段
  order?: 'asc' | 'desc'; // 排序方向
}

/**
 * 工作任务分页响应
 */
export interface WorkTaskPaginatedResponse {
  tasks: WorkTask[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

## API增强控制器

使用上述增强模型，WorkTaskController的部分实现如下：

```typescript
/**
 * 增强的工作任务控制器
 */
export class EnhancedWorkTaskController {
  private workTaskService: WorkTaskService;
  private promptProcessingService: PromptProcessingService;
  private aiServiceService: AiServiceService;
  private workTaskEventService: WorkTaskEventService;
  
  constructor(/* 依赖注入 */) {
    // ...初始化依赖
  }
  
  /**
   * 获取工作任务列表（支持分页和搜索）
   */
  async getAllWorkTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const params: WorkTaskQueryParams = {
        page: parseInt(req.query.page as string) || 1,
        pageSize: parseInt(req.query.pageSize as string) || 10,
        status: req.query.status as WorkTaskStatus,
        search: req.query.search as string,
        sort: req.query.sort as 'createdAt' | 'updatedAt' | 'name',
        order: req.query.order as 'asc' | 'desc'
      };
      
      const result = await this.workTaskService.getWorkTasksWithPagination(params);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * 测试工作任务执行结果（增强版）
   */
  async testWorkTask(req: Request, res: Response, next: NextFunction) {
    try {
      const requestData: TestWorkTaskRequest = req.body;
      
      // 验证请求数据
      if (!requestData.input || !requestData.npcId || !requestData.aiServiceId) {
        throw new WorkTaskError(
          WorkTaskErrorCode.INVALID_REQUEST,
          '缺少必要参数',
          400
        );
      }
      
      // 解析输入中的变量引用（使用缓存版本）
      const resolvedInput = await this.promptProcessingService.resolveVariablesWithCache(
        requestData.input
      );
      
      // 记录开始时间（性能监控）
      const startTime = Date.now();
      
      // 组合完整的Prompt
      const template = requestData.npcPromptTemplate?.template || 
        await this.workTaskService.getDefaultPromptTemplate(requestData.npcId);
      
      const fullPrompt = await this.promptProcessingService.composeFullPrompt(
        resolvedInput,
        requestData.npcId,
        template
      );
      
      // 调用AI服务
      const aiService = await this.aiServiceService.getAiServiceById(requestData.aiServiceId);
      if (!aiService) {
        throw new WorkTaskError(
          WorkTaskErrorCode.NOT_FOUND,
          `指定的AI服务不存在: ${requestData.aiServiceId}`,
          404
        );
      }
      
      const output = await this.aiServiceService.executePrompt(
        requestData.aiServiceId,
        fullPrompt
      );
      
      // 计算执行时间
      const executionTime = Date.now() - startTime;
      
      // 准备响应
      const response: TestWorkTaskResponse = {
        output,
        executionTime
      };
      
      // 在调试模式下添加额外信息
      if (req.query.debug === 'true') {
        response.prompt = fullPrompt;
        response.resolvedVariables = this.promptProcessingService
          .extractVariableReferences(requestData.input)
          .map(ref => ({
            original: ref.identifier,
            resolved: this.variableCache.get(ref.identifier) || '[未解析]'
          }));
      }
      
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * 异步执行工作任务并跟踪执行状态
   */
  async executeWorkTask(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      
      // 获取工作任务
      const task = await this.workTaskService.getWorkTaskById(taskId);
      if (!task) {
        throw WorkTaskError.notFound(taskId);
      }
      
      // 生成执行ID
      const executionId = uuidv4();
      
      // 设置任务状态为执行中
      await this.workTaskService.updateWorkTaskExecutionStatus(
        taskId, 
        ExecutionStatus.RUNNING, 
        null
      );
      
      // 发布执行开始事件
      this.workTaskEventService.publish(
        WorkTaskEventType.EXECUTION_STARTED,
        taskId,
        { executionId }
      );
      
      // 启动异步执行过程
      this.executeWorkTaskAsync(task, executionId)
        .then(() => {
          console.log(`工作任务 ${taskId} 执行完成，执行ID: ${executionId}`);
        })
        .catch(error => {
          console.error(`工作任务 ${taskId} 执行失败，执行ID: ${executionId}:`, error);
        });
      
      // 立即返回响应，包含执行ID用于后续查询
      res.status(202).json({
        message: "工作任务执行已启动",
        taskId,
        executionId,
        estimatedCompletionTime: 10000 // 预计10秒完成，实际应基于任务复杂度和历史数据估算
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * 获取工作任务执行结果
   */
  async getExecutionResult(req: Request, res: Response, next: NextFunction) {
    try {
      const taskId = req.params.id;
      const executionId = req.params.executionId;
      
      // 获取执行结果
      const result = await this.workTaskService.getTaskExecutionResult(taskId, executionId);
      
      if (!result) {
        throw new WorkTaskError(
          WorkTaskErrorCode.NOT_FOUND,
          `找不到执行记录: ${executionId}`,
          404
        );
      }
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
```

## 新增API端点

除了增强现有API，我们还添加了以下新端点：

| 方法   | URL                                      | 描述                   | 请求体                        | 响应                               |
|------|------------------------------------------|----------------------|-----------------------------|------------------------------------|
| GET  | /api/work-tasks?page=1&pageSize=10       | 分页获取工作任务列表          | -                           | 分页工作任务列表                         |
| POST | /api/work-tasks/batch                    | 批量创建工作任务            | 工作任务数据数组                    | 创建的工作任务数组                        |
| GET  | /api/work-tasks/:id/executions           | 获取工作任务执行历史          | -                           | 执行历史列表                           |
| GET  | /api/work-tasks/:id/executions/:executionId | 获取特定执行的结果        | -                           | 执行结

> 注意：本文档是《工作任务管理模块》规范的一部分，专注于API接口设计。
> 概念设计和界面规范请参见：[工作任务模块概念设计与界面规范](work-task-module-concept-design.md)
> 技术实现规范请参见：[工作任务模块技术实现规范](work-task-module-technical-spec.md)

## 目录

1. [API概述](#api概述)
2. [RESTful接口定义](#restful接口定义)
3. [工作任务管理API](#工作任务管理api)
4. [工作任务服务层](#工作任务服务层)
5. [工作任务变量集成API](#工作任务变量集成api)
6. [工作任务事件服务API](#工作任务事件服务api)
7. [Prompt处理API](#prompt处理api)

## API概述

工作任务管理模块的API接口主要分为以下几类：

- **RESTful API**: 提供给前端的HTTP接口，用于工作任务的CRUD操作和执行
- **服务层API**: 内部服务之间的调用接口，处理业务逻辑
- **变量集成API**: 与全局变量系统的集成接口
- **事件服务API**: 工作任务事件的发布与订阅接口
- **Prompt处理API**: 处理变量引用和组合Prompt的接口

## RESTful接口定义

| 方法   | URL                         | 描述                 | 请求体                   | 响应                        |
|------|-----------------------------|--------------------|------------------------|-----------------------------|
| GET  | /api/work-tasks             | 获取所有工作任务          | -                      | 工作任务列表                     |
| GET  | /api/work-tasks/:id         | 获取单个工作任务          | -                      | 单个工作任务                     |
| POST | /api/work-tasks             | 创建工作任务            | 工作任务数据                | 创建的工作任务                    |
| PUT  | /api/work-tasks/:id         | 更新工作任务            | 工作任务数据                | 更新后的工作任务                   |
| DELETE | /api/work-tasks/:id       | 删除工作任务            | -                      | 204 No Content              |
| POST | /api/work-tasks/test        | 测试工作任务执行结果        | 输入、NPC、AI服务和提示词模板数据 | 执行结果                       |
| POST | /api/work-tasks/:id/execute | 执行工作任务            | -                      | 202 Accepted（任务已接受，异步执行） |

## 工作任务管理API

```typescript
/**
 * 工作任务控制器
 */
export class WorkTaskController {
  private workTaskService: WorkTaskService;
  private promptProcessingService: PromptProcessingService;
  private aiServiceService: AiServiceService;
  private workTaskEventService: WorkTaskEventService;

  constructor(
    workTaskService: WorkTaskService,
    promptProcessingService: PromptProcessingService,
    aiServiceService: AiServiceService,
    workTaskEventService: WorkTaskEventService
  ) {
    this.workTaskService = workTaskService;
    this.promptProcessingService = promptProcessingService;
    this.aiServiceService = aiServiceService;
    this.workTaskEventService = workTaskEventService;
  }

  /**
   * 获取所有工作任务
   */
  async getAllWorkTasks(req: Request, res: Response) {
    try {
      const tasks = await this.workTaskService.getAllWorkTasks();
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 获取单个工作任务
   */
  async getWorkTaskById(req: Request, res: Response) {
    try {
      const taskId = req.params.id;
      const task = await this.workTaskService.getWorkTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ error: "工作任务不存在" });
      }
      
      res.status(200).json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 创建工作任务
   */
  async createWorkTask(req: Request, res: Response) {
    try {
      const taskData = req.body;
      
      // 检查循环引用
      const hasCircularReferences = 
        this.promptProcessingService.checkCircularReferences(
          'temp_id', // 临时ID用于检查
          taskData.input,
          taskData.output || ''
        );
      
      if (hasCircularReferences) {
        return res.status(400).json({ 
          error: "检测到循环变量引用，请修改后重试" 
        });
      }
      
      const task = await this.workTaskService.createWorkTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 更新工作任务
   */
  async updateWorkTask(req: Request, res: Response) {
    try {
      const taskId = req.params.id;
      const taskData = req.body;
      
      // 检查循环引用
      const hasCircularReferences = 
        this.promptProcessingService.checkCircularReferences(
          taskId,
          taskData.input,
          taskData.output || ''
        );
      
      if (hasCircularReferences) {
        return res.status(400).json({ 
          error: "检测到循环变量引用，请修改后重试" 
        });
      }
      
      const task = await this.workTaskService.updateWorkTask(taskId, taskData);
      
      if (!task) {
        return res.status(404).json({ error: "工作任务不存在" });
      }
      
      res.status(200).json(task);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 删除工作任务
   */
  async deleteWorkTask(req: Request, res: Response) {
    try {
      const taskId = req.params.id;
      const result = await this.workTaskService.deleteWorkTask(taskId);
      
      if (!result) {
        return res.status(404).json({ error: "工作任务不存在" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 测试工作任务执行结果
   */
  async testWorkTask(req: Request, res: Response) {
    try {
      const { input, npcId, aiServiceId, npcPromptTemplate } = req.body;
      
      // 解析输入中的变量引用
      const resolvedInput = await this.promptProcessingService.resolveVariables(input);
      
      // 组合完整的Prompt
      const template = npcPromptTemplate?.template || await this.workTaskService.getDefaultPromptTemplate(npcId);
      const fullPrompt = await this.promptProcessingService.composeFullPrompt(
        resolvedInput,
        npcId,
        template
      );
      
      // 调用AI服务
      const aiService = await this.aiServiceService.getAiServiceById(aiServiceId);
      if (!aiService) {
        return res.status(400).json({ error: "指定的AI服务不存在" });
      }
      
      const output = await this.aiServiceService.executePrompt(
        aiServiceId,
        fullPrompt
      );
      
      res.status(200).json({ output });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 执行工作任务
   */
  async executeWorkTask(req: Request, res: Response) {
    try {
      const taskId = req.params.id;
      const task = await this.workTaskService.getWorkTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ error: "工作任务不存在" });
      }
      
      // 设置任务状态为执行中
      await this.workTaskService.updateWorkTaskExecutionStatus(
        taskId, 
        ExecutionStatus.RUNNING, 
        null
      );
      
      // 发布执行开始事件
      this.workTaskEventService.publish(
        WorkTaskEventType.EXECUTION_STARTED,
        taskId
      );
      
      // 启动异步执行过程
      this.executeWorkTaskAsync(task)
        .then(() => {
          console.log(`工作任务 ${taskId} 执行完成`);
        })
        .catch(error => {
          console.error(`工作任务 ${taskId} 执行失败:`, error);
        });
      
      // 立即返回响应，不等待执行完成
      res.status(202).json({ 
        message: "工作任务执行已启动", 
        taskId 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  /**
   * 异步执行工作任务
   * 这是一个内部方法，不暴露为API
   */
  private async executeWorkTaskAsync(task: WorkTask) {
    try {
      // 解析输入中的变量引用
      const resolvedInput = await this.promptProcessingService.resolveVariables(
        task.input, 
        task.id
      );
      
      // 组合完整的Prompt
      const template = task.npcPromptTemplate?.template || 
        await this.workTaskService.getDefaultPromptTemplate(task.npcId);
      
      const fullPrompt = await this.promptProcessingService.composeFullPrompt(
        resolvedInput,
        task.npcId,
        template
      );
      
      // 调用AI服务
      const output = await this.aiServiceService.executePrompt(
        task.aiServiceId,
        fullPrompt
      );
      
      // 保存输出结果并更新任务状态
      await this.workTaskService.updateTaskOutput(
        task.id, 
        output, 
        ExecutionStatus.COMPLETED
      );
      
      // 发布执行完成事件
      this.workTaskEventService.publish(
        WorkTaskEventType.EXECUTION_COMPLETED,
        task.id,
        { output }
      );
      
      return output;
    } catch (error) {
      // 更新任务执行状态为失败
      await this.workTaskService.updateWorkTaskExecutionStatus(
        task.id, 
        ExecutionStatus.FAILED, 
        error.message
      );
      
      // 发布执行失败事件
      this.workTaskEventService.publish(
        WorkTaskEventType.EXECUTION_FAILED,
        task.id,
        { error: error.message }
      );
      
      throw error;
    }
  }
}

/**
 * 工作任务路由配置
 */
export function configureWorkTaskRoutes(app: Express) {
  const controller = new WorkTaskController(
    new WorkTaskService(),
    new PromptProcessingService(
      new VariableService(),
      new NpcService(),
      new AiServiceService()
    ),
    new AiServiceService(),
    WorkTaskEventService.getInstance()
  );
  
  app.get('/api/work-tasks', controller.getAllWorkTasks.bind(controller));
  app.get('/api/work-tasks/:id', controller.getWorkTaskById.bind(controller));
  app.post('/api/work-tasks', controller.createWorkTask.bind(controller));
  app.put('/api/work-tasks/:id', controller.updateWorkTask.bind(controller));
  app.delete('/api/work-tasks/:id', controller.deleteWorkTask.bind(controller));
  app.post('/api/work-tasks/test', controller.testWorkTask.bind(controller));
  app.post('/api/work-tasks/:id/execute', controller.executeWorkTask.bind(controller));
}
```

## 工作任务服务层

```typescript
/**
 * 工作任务服务类
 */
export class WorkTaskService {
  private npcService: NpcService;
  private variableService: VariableService;
  
  constructor(
    npcService: NpcService = new NpcService(),
    variableService: VariableService = new VariableService()
  ) {
    this.npcService = npcService;
    this.variableService = variableService;
  }
  
  /**
   * 获取所有工作任务
   */
  public async getAllWorkTasks(): Promise<WorkTask[]> {
    // 实现数据访问逻辑
  }
  
  /**
   * 获取单个工作任务
   */
  public async getWorkTaskById(id: string): Promise<WorkTask | null> {
    // 实现数据访问逻辑
  }
  
  /**
   * 创建工作任务
   */
  public async createWorkTask(taskData: Partial<WorkTask>): Promise<WorkTask> {
    // 实现数据访问逻辑
    // 同时注册相关的全局变量
  }
  
  /**
   * 更新工作任务
   */
  public async updateWorkTask(
    id: string, 
    taskData: Partial<WorkTask>
  ): Promise<WorkTask | null> {
    // 实现数据访问逻辑
    // 同时更新相关的全局变量
  }
  
  /**
   * 删除工作任务
   */
  public async deleteWorkTask(id: string): Promise<boolean> {
    // 实现数据访问逻辑
    // 同时删除相关的全局变量
  }
  
  /**
   * 更新工作任务的执行状态
   */
  public async updateWorkTaskExecutionStatus(
    id: string,
    status: ExecutionStatus,
    message: string | null
  ): Promise<WorkTask | null> {
    // 实现数据访问逻辑
  }
  
  /**
   * 更新工作任务的输出内容和执行状态
   */
  public async updateTaskOutput(
    id: string,
    output: string,
    status: ExecutionStatus
  ): Promise<WorkTask | null> {
    // 实现数据访问逻辑
    // 同时更新相关的全局变量
  }
  
  /**
   * 获取默认的NPC提示词模板
   */
  public async getDefaultPromptTemplate(npcId: string): Promise<string> {
    const npc = await this.npcService.getNpcById(npcId);
    
    if (!npc) {
      throw new Error(`NPC不存在: ${npcId}`);
    }
    
    return `你是@${npc.name}.姓名，现在你具备的知识背景是：@${npc.name}.知识背景，根据你的行动原则：@${npc.name}.行动原则，请你给出以上输入的反馈。`;
  }
}
```

## 工作任务变量集成API

```typescript
/**
 * 工作任务变量提供者服务
 * 实现VariableSourceProvider接口，为全局变量系统提供工作任务变量
 */
export class WorkTaskVariableSourceProvider implements VariableSourceProvider {
  private workTaskService: WorkTaskService;
  private identifierFormatter: IdentifierFormatterService;
  private workTaskEventService: WorkTaskEventService;
  
  constructor(
    workTaskService: WorkTaskService = new WorkTaskService(),
    workTaskEventService: WorkTaskEventService = WorkTaskEventService.getInstance()
  ) {
    this.workTaskService = workTaskService;
    this.identifierFormatter = IdentifierFormatterService.getInstance();
    this.workTaskEventService = workTaskEventService;
    
    // 注册事件监听
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // 监听输出变更事件，同步变量
    this.workTaskEventService.subscribe(
      WorkTaskEventType.OUTPUT_CHANGED,
      async ({ taskId, data }) => {
        const task = await this.workTaskService.getWorkTaskById(taskId);
        if (task) {
          await this.updateTaskVariables(task);
        }
      }
    );
  }
  
  /**
   * 获取所有工作任务相关的变量
   */
  public async getVariables(): Promise<Variable[]> {
    const tasks = await this.workTaskService.getAllWorkTasks();
    let variables: Variable[] = [];
    
    for (const task of tasks) {
      const taskVariables = await this.getTaskVariables(task.id);
      variables = [...variables, ...taskVariables];
    }
    
    return variables;
  }
  
  /**
   * 获取单个工作任务的变量
   */
  public async getTaskVariables(taskId: string): Promise<Variable[]> {
    const task = await this.workTaskService.getWorkTaskById(taskId);
    
    if (!task) {
      return [];
    }
    
    const variables: Variable[] = [];
    
    // 输入变量
    variables.push({
      id: this.generateVariableId(task.id, WorkTaskVariableField.INPUT),
      name: `${task.name}.input`,
      sourceId: task.id,
      sourceType: this.getSourceType(),
      fieldName: WorkTaskVariableField.INPUT,
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
      fieldName: WorkTaskVariableField.OUTPUT,
      value: task.output || '',
      type: VariableType.TASK,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    });
    
    return variables;
  }
  
  /**
   * 更新单个工作任务的变量
   */
  private async updateTaskVariables(task: WorkTask): Promise<void> {
    const variables = await this.getTaskVariables(task.id);
    
    // 使用变量服务更新变量
    const variableService = new VariableService();
    for (const variable of variables) {
      await variableService.updateOrCreateVariable(variable);
    }
  }
  
  /**
   * 生成变量ID
   */
  private generateVariableId(taskId: string, fieldName: WorkTaskVariableField): string {
    return `${this.getSourceType()}_${taskId}_${fieldName}`;
  }
  
  /**
   * 监听工作任务变化并同步变量
   */
  public subscribeToChanges(
    callback: (action: 'create' | 'update' | 'delete', variables: Variable[]) => void
  ): void {
    // 当工作任务创建时
    this.workTaskEventService.subscribe(
      WorkTaskEventType.INPUT_CHANGED,
      async ({ taskId }) => {
        const task = await this.workTaskService.getWorkTaskById(taskId);
        if (task) {
          const variables = await this.getTaskVariables(task.id);
          callback('update', variables);
        }
      }
    );
    
    // 当工作任务输出更新时
    this.workTaskEventService.subscribe(
      WorkTaskEventType.OUTPUT_CHANGED,
      async ({ taskId }) => {
        const task = await this.workTaskService.getWorkTaskById(taskId);
        if (task) {
          const variables = await this.getTaskVariables(task.id);
          callback('update', variables);
        }
      }
    );
  }
  
  /**
   * 获取变量源类型标识
   */
  public getSourceType(): string {
    return 'work_task';
  }
}
```

## 工作任务事件服务API

```typescript
/**
 * 工作任务事件服务
 * 用于发布和订阅工作任务相关事件
 */
export class WorkTaskEventService {
  private static instance: WorkTaskEventService;
  private eventEmitter: EventEmitter;
  
  private constructor() {
    this.eventEmitter = new EventEmitter();
  }
  
  /**
   * 获取单例实例
   */
  public static getInstance(): WorkTaskEventService {
    if (!WorkTaskEventService.instance) {
      WorkTaskEventService.instance = new WorkTaskEventService();
    }
    return WorkTaskEventService.instance;
  }
  
  /**
   * 发布工作任务事件
   */
  public publish(
    eventType: WorkTaskEventType,
    taskId: string,
    data?: any
  ): void {
    console.log(`发布事件 ${eventType} 对于任务 ${taskId}`);
    this.eventEmitter.emit(eventType, { taskId, data });
    
    // 同时发布带有taskId的特定事件，方便只订阅特定任务的事件
    this.eventEmitter.emit(`${eventType}:${taskId}`, { taskId, data });
  }
  
  /**
   * 订阅工作任务事件
   */
  public subscribe(
    eventType: WorkTaskEventType,
    handler: (data: { taskId: string, data?: any }) => void
  ): () => void {
    this.eventEmitter.on(eventType, handler);
    
    // 返回取消订阅的函数
    return () => {
      this.eventEmitter.off(eventType, handler);
    };
  }
  
  /**
   * 订阅特定工作任务的事件
   */
  public subscribeToTask(
    eventType: WorkTaskEventType,
    taskId: string,
    handler: (data: { taskId: string, data?: any }) => void
  ): () => void {
    const specificEvent = `${eventType}:${taskId}`;
    this.eventEmitter.on(specificEvent, handler);
    
    // 返回取消订阅的函数
    return () => {
      this.eventEmitter.off(specificEvent, handler);
    };
  }
}
```

## Prompt处理API

```typescript
/**
 * Prompt处理服务
 */
export class PromptProcessingService {
  private variableService: VariableService;
  private npcService: NpcService;
  private aiServiceService: AiServiceService;
  private identifierFormatter: IdentifierFormatterService;
  
  constructor(
    variableService: VariableService,
    npcService: NpcService,
    aiServiceService: AiServiceService
  ) {
    this.variableService = variableService;
    this.npcService = npcService;
    this.aiServiceService = aiServiceService;
    this.identifierFormatter = IdentifierFormatterService.getInstance();
  }
  
  /**
   * 解析包含变量引用的文本
   */
  public async resolveVariables(text: string, taskId?: string): Promise<string> {
    // 最大递归深度，防止无限循环
    const MAX_DEPTH = 5;
    
    const resolveWithDepth = async (text: string, depth = 0): Promise<string> => {
      if (depth >= MAX_DEPTH) {
        console.warn('达到最大递归深度，可能存在循环引用');
        return text;
      }
      
      // 提取所有变量引用
      const references = this.extractVariableReferences(text);
      if (references.length === 0) {
        return text; // 没有变量引用，直接返回原文本
      }
      
      let resolvedText = text;
      
      // 获取所有变量的实际值
      for (const ref of references) {
        // 检查是否自引用（循环引用）
        if (taskId && ref.sourceId === taskId) {
          // 用特殊标记替换无法解析的引用
          resolvedText = resolvedText.replace(
            ref.identifier,
            `[无法解析: ${ref.identifier} - 循环引用]`
          );
          continue;
        }
        
        try {
          // 获取变量值
          const variable = await this.variableService.getVariableByIdentifier(ref.identifier);
          
          if (variable) {
            // 递归解析变量值中可能包含的变量引用
            const nestedValue = await resolveWithDepth(variable.value, depth + 1);
            
            // 替换文本中的变量引用
            resolvedText = resolvedText.replace(ref.identifier, nestedValue);
          } else {
            // 变量不存在，用占位符替换
            resolvedText = resolvedText.replace(
              ref.identifier,
              `[未找到变量: ${ref.identifier}]`
            );
          }
        } catch (error) {
          console.error(`解析变量 ${ref.identifier} 失败:`, error);
          // 用错误信息替换
          resolvedText = resolvedText.replace(
            ref.identifier,
            `[错误: ${error.message}]`
          );
        }
      }
      
      return resolvedText;
    };
    
    return resolveWithDepth(text, 0);
  }
  
  /**
   * 提取文本中的所有变量引用
   */
  public extractVariableReferences(text: string): VariableReference[] {
    const references: VariableReference[] = [];
    // 匹配 @xxx.yyy 格式的变量引用
    const regex = /@([a-zA-Z0-9\u4e00-\u9fa5_]+)\.([a-zA-Z0-9_]+)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const identifier = match[0]; // 完整的标识符
      const sourceName = match[1]; // 来源名称
      const fieldName = match[2];  // 字段名称
      
      references.push({
        identifier,
        sourceId: '', // 需要根据sourceName查询实际ID
        sourceType: '', // 需要确定
        fieldName,
        startIndex: match.index,
        endIndex: match.index + identifier.length
      });
    }
    
    return references;
  }
  
  /**
   * 检查变量引用是否存在循环
   */
  public checkCircularReferences(
    taskId: string,
    input: string,
    output: string
  ): boolean {
    // 获取输入和输出中的所有变量引用
    const inputRefs = this.extractVariableReferences(input);
    const outputRefs = this.extractVariableReferences(output);
    
    // 检查是否有自引用
    const taskIdentifiers = [
      this.identifierFormatter.formatIdentifier('work_task', taskId, 'input'),
      this.identifierFormatter.formatIdentifier('work_task', taskId, 'output')
    ];
    
    // 如果输入中引用了自己的输出，或输出中引用了自己的输入，则存在循环
    return inputRefs.some(ref => taskIdentifiers.includes(ref.identifier)) ||
           outputRefs.some(ref => taskIdentifiers.includes(ref.identifier));
  }
  
  /**
   * 组合完整的Prompt
   */
  public async composeFullPrompt(
    taskInput: string,
    npcId: string,
    promptTemplate: string
  ): Promise<string> {
    // 获取NPC信息
    const npc = await this.npcService.getNpcById(npcId);
    
    if (!npc) {
      throw new Error(`NPC不存在: ${npcId}`);
    }
    
    // 替换模板中的NPC名称
    let template = promptTemplate.replace(/{npcName}/g, npc.name);
    
    // 解析模板中的变量引用
    template = await this.resolveVariables(template);
    
    // 组合最终的Prompt
    return `${taskInput}\n\n${template}`;
  }
}
