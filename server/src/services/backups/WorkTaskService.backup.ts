import { Repository } from 'typeorm';
import { WorkTask, WorkTaskStatus, ExecutionStatus } from '../models/WorkTask';
import { AppDataSource } from '../database';
import { Variable, VariableType } from '../models/Variable';
import { VariableEventPublisher, VariableEventType } from './VariableEventPublisher';
import { IdentifierFormatterService } from './IdentifierFormatterService';
import { Npc } from '../models/Npc';
import { AiService, AiServiceType } from '../models/AiService';
import { DeepseekAdapter } from '../adapters/DeepseekAdapter';
import { AnthropicAdapter } from '../adapters/AnthropicAdapter';
import { AiServiceAdapter, ChatMessage } from '../adapters/BaseAdapter';

/**
 * 变量引用接口
 */
export interface VariableReference {
  identifier: string;    // 完整的标识符，如 @云透.姓名
  startIndex: number;    // 在文本中的起始位置
  endIndex: number;      // 在文本中的结束位置  
}

/**
 * 工作任务服务
 * 负责工作任务的CRUD操作和执行逻辑
 */
export class WorkTaskService {
  private workTaskRepository: Repository<WorkTask>;
  private variableRepository: Repository<Variable>;
  private npcRepository: Repository<Npc>;
  private aiServiceRepository: Repository<AiService>;
  private eventPublisher: VariableEventPublisher;
  private identifierFormatter: IdentifierFormatterService;

  constructor() {
    this.workTaskRepository = AppDataSource.getRepository(WorkTask);
    this.variableRepository = AppDataSource.getRepository(Variable);
    this.npcRepository = AppDataSource.getRepository(Npc);
    this.aiServiceRepository = AppDataSource.getRepository(AiService);
    this.eventPublisher = VariableEventPublisher.getInstance();
    this.identifierFormatter = IdentifierFormatterService.getInstance();
  }

  /**
   * 获取AI服务
   */
  public async getAiServiceById(id: string): Promise<AiService | null> {
    return this.aiServiceRepository.findOne({ where: { id } });
  }

  /**
   * 获取NPC信息
   */
  public async getNpcById(id: string): Promise<Npc | null> {
    return this.npcRepository.findOne({ where: { id } });
  }

  /**
   * 创建或更新变量
   */
  private async createOrUpdateVariable(variableData: {
    name: string;
    identifier: string;
    type: string;
    source: {
      id: string;
      name: string;
      type: string;
    };
    value: string;
  }): Promise<Variable> {
    try {
      // 检查变量是否已存在
      let variable = await this.variableRepository.findOne({
        where: { identifier: variableData.identifier }
      });

      if (variable) {
        // 更新现有变量
        variable.name = variableData.name;
        variable.value = variableData.value;
        variable.source = variableData.source;
        variable = await this.variableRepository.save(variable);
        
        // 发布变量更新事件
        this.eventPublisher.publish(VariableEventType.UPDATED, variable);
      } else {
        // 创建新变量
        const newVariable = this.variableRepository.create({
          ...variableData,
          type: variableData.type as VariableType
        });
        
        variable = await this.variableRepository.save(newVariable);
        
        // 发布变量创建事件
        this.eventPublisher.publish(VariableEventType.CREATED, variable);
      }
      
      return variable;
    } catch (error) {
      const e = error as Error;
      console.error(`创建或更新变量失败: ${e.message}`);
      throw new Error(`创建或更新变量失败: ${e.message}`);
    }
  }

  /**
   * 按标识符删除变量
   */
  private async deleteVariableByIdentifier(identifier: string): Promise<void> {
    try {
      const variable = await this.variableRepository.findOne({
        where: { identifier }
      });
      
      if (variable) {
        // 保存变量副本用于发布事件
        const variableCopy = { ...variable };
        
        // 删除变量
        await this.variableRepository.remove(variable);
        
        // 发布删除事件
        this.eventPublisher.publish(VariableEventType.DELETED, variableCopy);
      }
    } catch (error) {
      const e = error as Error;
      console.error(`删除变量失败: ${e.message}`);
    }
  }

  /**
   * 获取所有工作任务
   */
  public async getAllWorkTasks(): Promise<WorkTask[]> {
    return this.workTaskRepository.find({
      order: {
        updatedAt: 'DESC'
      }
    });
  }

  /**
   * 获取单个工作任务
   */
  public async getWorkTaskById(id: string): Promise<WorkTask | null> {
    try {
      const task = await this.workTaskRepository.findOne({
        where: { id }
      });
      return task || null;
    } catch (error) {
      const e = error as Error;
      console.error(`获取工作任务失败: ${e.message}`);
      return null;
    }
  }

  /**
   * 创建工作任务
   */
  public async createWorkTask(taskData: Partial<WorkTask>): Promise<WorkTask> {
    try {
      // 设置默认的NPC提示词模板
      if (!taskData.npcPromptTemplate || !taskData.npcPromptTemplate.isCustomized) {
        if (!taskData.npcId) {
          throw new Error('创建工作任务失败: NPC ID不能为空');
        }
        
        const template = await this.getDefaultPromptTemplate(taskData.npcId);
        taskData.npcPromptTemplate = {
          template,
          isCustomized: false
        };
      }

      // 创建工作任务
      const task = this.workTaskRepository.create(taskData);
      const savedTask = await this.workTaskRepository.save(task);
      
      // 注册相关的全局变量
      await this.registerTaskVariables(savedTask);
      
      return savedTask;
    } catch (error) {
      const e = error as Error;
      console.error(`创建工作任务失败: ${e.message}`);
      throw e;
    }
  }

  /**
   * 更新工作任务
   */
  public async updateWorkTask(id: string, taskData: Partial<WorkTask>): Promise<WorkTask | null> {
    try {
      // 检查任务是否存在
      const existingTask = await this.getWorkTaskById(id);
      if (!existingTask) {
        return null;
      }

      // 如果更新了NPC，且模板没有自定义，则更新默认模板
      if (
        taskData.npcId && 
        taskData.npcId !== existingTask.npcId && 
        (!existingTask.npcPromptTemplate.isCustomized || !taskData.npcPromptTemplate)
      ) {
        const template = await this.getDefaultPromptTemplate(taskData.npcId);
        taskData.npcPromptTemplate = {
          template,
          isCustomized: false
        };
      }

      // 更新工作任务
      await this.workTaskRepository.update(id, taskData);
      
      // 获取更新后的任务
      const updatedTask = await this.getWorkTaskById(id);
      if (updatedTask) {
        // 更新相关的全局变量
        await this.updateTaskVariables(updatedTask);
      }
      
      return updatedTask;
    } catch (error) {
      const e = error as Error;
      console.error(`更新工作任务失败: ${e.message}`);
      throw e;
    }
  }

  /**
   * 删除工作任务
   */
  public async deleteWorkTask(id: string): Promise<boolean> {
    try {
      // 检查任务是否存在
      const existingTask = await this.getWorkTaskById(id);
      if (!existingTask) {
        return false;
      }

      // 删除相关的全局变量
      await this.deleteTaskVariables(id);
      
      // 删除工作任务
      await this.workTaskRepository.delete(id);
      
      return true;
    } catch (error) {
      const e = error as Error;
      console.error(`删除工作任务失败: ${e.message}`);
      throw e;
    }
  }

  /**
   * 更新工作任务的执行状态
   */
  public async updateWorkTaskExecutionStatus(
    id: string,
    status: ExecutionStatus,
    message: string | null
  ): Promise<WorkTask | null> {
    try {
      // 更新状态和消息
      await this.workTaskRepository.update(id, {
        executionStatus: status,
        executionMessage: message || undefined,
        ...(status === ExecutionStatus.RUNNING ? { lastRunAt: new Date() } : {})
      });
      
      return this.getWorkTaskById(id);
    } catch (error) {
      const e = error as Error;
      console.error(`更新工作任务执行状态失败: ${e.message}`);
      throw e;
    }
  }

  /**
   * 更新工作任务的输出内容和执行状态
   */
  public async updateTaskOutput(
    id: string,
    output: string,
    status: ExecutionStatus
  ): Promise<WorkTask | null> {
    try {
      // 更新输出和状态
      await this.workTaskRepository.update(id, {
        output,
        executionStatus: status
      });
      
      const updatedTask = await this.getWorkTaskById(id);
      if (updatedTask) {
        // 更新相关的全局变量
        await this.updateTaskVariables(updatedTask);
      }
      
      return updatedTask;
    } catch (error) {
      const e = error as Error;
      console.error(`更新工作任务输出失败: ${e.message}`);
      throw e;
    }
  }

  /**
   * 获取默认的NPC提示词模板
   */
  public async getDefaultPromptTemplate(npcId: string): Promise<string> {
    try {
      if (!npcId) {
        throw new Error('NPC ID不能为空');
      }
      
      const npc = await this.getNpcById(npcId);
      
      if (!npc) {
        throw new Error(`NPC不存在: ${npcId}`);
      }
      
      // 使用英文标识符格式，与NpcVariableSourceProvider保持一致
      return `你是@${npc.name}.name，现在你具备的知识背景是：@${npc.name}.knowledge_background，根据你的行动原则：@${npc.name}.action_principles，请你给出以上输入的反馈。`;
    } catch (error) {
      const e = error as Error;
      console.error(`获取默认NPC提示词模板失败: ${e.message}`);
      throw e;
    }
  }

  /**
   * 注册工作任务相关的全局变量
   * 内部方法，不暴露为API
   */
  private async registerTaskVariables(task: WorkTask): Promise<void> {
    try {
      // 注册输入变量
      await this.createOrUpdateVariable({
        name: `${task.name}.input`,
        identifier: `@${task.name}.input`,
        type: 'task',
        source: {
          id: task.id,
          name: task.name,
          type: 'work_task'
        },
        value: task.input
      });
      
      // 注册输出变量
      await this.createOrUpdateVariable({
        name: `${task.name}.output`,
        identifier: `@${task.name}.output`,
        type: 'task',
        source: {
          id: task.id,
          name: task.name,
          type: 'work_task'
        },
        value: task.output || ''
      });
    } catch (error) {
      const e = error as Error;
      console.error(`注册工作任务变量失败: ${e.message}`);
    }
  }

  /**
   * 更新工作任务相关的全局变量
   * 内部方法，不暴露为API
   */
  private async updateTaskVariables(task: WorkTask): Promise<void> {
    try {
      // 更新输入变量
      await this.createOrUpdateVariable({
        name: `${task.name}.input`,
        identifier: `@${task.name}.input`,
        type: 'task',
        source: {
          id: task.id,
          name: task.name,
          type: 'work_task'
        },
        value: task.input
      });
      
      // 更新输出变量
      await this.createOrUpdateVariable({
        name: `${task.name}.output`,
        identifier: `@${task.name}.output`,
        type: 'task',
        source: {
          id: task.id,
          name: task.name,
          type: 'work_task'
        },
        value: task.output || ''
      });
    } catch (error) {
      const e = error as Error;
      console.error(`更新工作任务变量失败: ${e.message}`);
    }
  }

  /**
   * 删除工作任务相关的全局变量
   * 内部方法，不暴露为API
   */
  private async deleteTaskVariables(taskId: string): Promise<void> {
    try {
      // 获取任务信息，用于构建变量标识符
      const task = await this.getWorkTaskById(taskId);
      if (!task) {
        return;
      }
      
      // 删除输入变量
      await this.deleteVariableByIdentifier(`@${task.name}.input`);
      
      // 删除输出变量
      await this.deleteVariableByIdentifier(`@${task.name}.output`);
    } catch (error) {
      const e = error as Error;
      console.error(`删除工作任务变量失败: ${e.message}`);
    }
  }

  /**
   * 在文本中查找变量引用
   * @param text 要查找变量引用的文本
   * @returns 变量引用数组
   */
  private findVariableReferences(text: string): VariableReference[] {
    const references: VariableReference[] = [];
    const regex = /@([a-zA-Z0-9_\u4e00-\u9fa5]+)\.([a-zA-Z0-9_]+)/g;
    
    console.log(`[变量解析] ====== 开始在文本中查找变量引用 ======`);
    console.log(`[变量解析] 原始文本: "${text}"`);
    
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const ref = {
        identifier: match[0], // 完整标识符
        startIndex: match.index,
        endIndex: match.index + match[0].length
      };
      console.log(`[变量解析] 找到变量引用: "${ref.identifier}", 位置: ${ref.startIndex}-${ref.endIndex}`);
      references.push(ref);
    }
    
    // 处理连续变量引用
    for (let i = 0; i < references.length; i++) {
      const ref = references[i];
      const textAfterRef = text.substring(ref.endIndex);
      if (textAfterRef.startsWith('@')) {
        console.log(`[变量解析] 检测到连续变量引用，变量 "${ref.identifier}" 后面紧跟着另一个变量引用`);
      }
    }
    
    console.log(`[变量解析] 共找到 ${references.length} 个变量引用`);
    if (references.length === 0) {
      console.log(`[变量解析] 未找到任何变量引用，请检查文本格式是否正确`);
    }
    return references;
  }

  /**
   * 解析变量引用并替换为实际值
   * @param text 包含变量引用的文本
   * @param maxDepth 最大递归深度，防止循环引用
   * @param debug 是否启用调试模式
   * @returns 替换变量引用后的文本
   */
  private async resolveVariables(text: string, maxDepth = 5, debug = true): Promise<string> {
    console.log(`[变量解析] ====== 开始解析变量, 递归深度: ${maxDepth} ======`);
    console.log(`[变量解析] 当前待解析文本: "${text}"`);
    
    if (maxDepth <= 0) {
      console.warn('[变量解析] 警告：变量解析达到最大递归深度(5)，可能存在循环引用');
      return text;
    }
    
    // 查找所有变量引用
    const references = this.findVariableReferences(text);
    if (references.length === 0) {
      console.log(`[变量解析] 未找到变量引用，返回原文本`);
      return text;
    }
    
    console.log(`[变量解析] 准备替换 ${references.length} 个变量引用`);
    
    // 按照引用在文本中的位置从后往前替换，避免位置偏移问题
    let resolvedText = text;
    for (let i = references.length - 1; i >= 0; i--) {
      const ref = references[i];
      try {
        // 查询变量值 - 使用原始的简单查询方式
        const variable = await this.variableRepository.findOne({
          where: { identifier: ref.identifier }
        });
        
        if (variable) {
          console.log(`[变量解析] 替换变量 "${ref.identifier}" => "${variable.value}"`);
          
          // 替换变量引用为实际值
          resolvedText = 
            resolvedText.substring(0, ref.startIndex) + 
            variable.value + 
            resolvedText.substring(ref.endIndex);
            
          if (debug) {
            console.log(`[变量解析] 替换后文本: "${resolvedText}"`);
          }
        } else {
          console.warn(`[变量解析] 警告: 未找到变量 "${ref.identifier}"，将保留原始引用`);
        }
      } catch (error) {
        console.error(`[变量解析] 错误: 解析变量 "${ref.identifier}" 失败:`, error);
      }
    }
    
    // 继续解析嵌套变量引用
    if (resolvedText !== text) {
      console.log(`[变量解析] 检测到文本已变更，继续解析下一级嵌套变量`);
      return this.resolveVariables(resolvedText, maxDepth - 1, debug);
    } else {
      console.log(`[变量解析] 文本未发生变化，解析完成`);
      return resolvedText;
    }
  }

  /**
   * 获取AI服务适配器
   * @param serviceId AI服务ID
   * @returns 适配器实例
   */
  private async getServiceAdapter(serviceId: string): Promise<AiServiceAdapter> {
    const service = await this.aiServiceRepository.findOne({
      where: { id: serviceId }
    });
    
    if (!service) {
      throw new Error(`AI服务不存在: ${serviceId}`);
    }
    
    let adapter: AiServiceAdapter;
    
    // 根据服务类型选择适配器
    switch (service.type) {
      case AiServiceType.DEEPSEEK:
        adapter = new DeepseekAdapter();
        break;
      case AiServiceType.ANTHROPIC:
        adapter = new AnthropicAdapter();
        break;
      default:
        throw new Error(`不支持的服务类型: ${service.type}`);
    }
    
    // 解密API密钥并初始化适配器
    const serviceWithDecryptedKey = new AiService();
    serviceWithDecryptedKey.id = service.id;
    serviceWithDecryptedKey.name = service.name;
    serviceWithDecryptedKey.type = service.type;
    serviceWithDecryptedKey.apiKey = service.decryptApiKey();
    serviceWithDecryptedKey.baseUrl = service.baseUrl;
    serviceWithDecryptedKey.defaultModel = service.defaultModel;
    serviceWithDecryptedKey.config = service.config;
    
    adapter.initialize(serviceWithDecryptedKey);
    return adapter;
  }

  /**
   * 组合Prompt
   * @param input 输入内容
   * @param npcPromptTemplate NPC提示词模板
   * @param debug 是否启用调试模式
   * @returns 完整的Prompt
   */
  private async combinePrompt(input: string, npcPromptTemplate: string, debug = true): Promise<string> {
    console.log(`[Prompt组合] ====== 开始组合Prompt ======`);
    console.log(`[Prompt组合] 原始输入: "${input}"`);
    console.log(`[Prompt组合] 原始模板: "${npcPromptTemplate}"`);
    
    // 解析输入和提示词模板中的变量引用
    console.log(`[Prompt组合] 开始解析输入中的变量引用...`);
    const resolvedInput = await this.resolveVariables(input, 5, debug);
    
    console.log(`[Prompt组合] 开始解析模板中的变量引用...`);
    const resolvedTemplate = await this.resolveVariables(npcPromptTemplate, 5, debug);
    
    console.log(`[Prompt组合] 解析后输入: "${resolvedInput}"`);
    console.log(`[Prompt组合] 解析后模板: "${resolvedTemplate}"`);
    
    // 组合完整Prompt
    const fullPrompt = `${resolvedInput}\n\n${resolvedTemplate}`;
    console.log(`[Prompt组合] 最终Prompt: "${fullPrompt}"`);
    
    // 记录解析前后的差异
    if (input !== resolvedInput) {
      console.log(`[Prompt组合] 输入变量解析结果: 有变化`);
    } else {
      console.warn(`[Prompt组合] 输入变量解析结果: 无变化，请检查变量引用是否正确`);
    }
    
    if (npcPromptTemplate !== resolvedTemplate) {
      console.log(`[Prompt组合] 模板变量解析结果: 有变化`);
    } else {
      console.warn(`[Prompt组合] 模板变量解析结果: 无变化，请检查变量引用是否正确`);
    }
    
    return fullPrompt;
  }

  /**
   * 测试执行工作任务
   * 不保存结果，仅返回AI输出
   */
  public async testExecuteWorkTask(data: {
    input: string;
    npcId: string;
    aiServiceId: string;
    npcPromptTemplate?: {
      template: string;
      isCustomized: boolean;
    };
    debug?: boolean; // 是否返回调试信息
  }): Promise<{ output: string; debug?: { originalInput: string; resolvedInput: string; originalTemplate: string; resolvedTemplate: string; fullPrompt: string } }> {
    try {
      console.log('===== 测试执行工作任务 =====');
      console.log('测试执行参数:', JSON.stringify(data, null, 2));
      
      // 验证参数
      if (!data.input || !data.npcId || !data.aiServiceId) {
        throw new Error('缺少必要参数');
      }
      
      // 获取NPC提示词模板
      let promptTemplate: string;
      if (data.npcPromptTemplate?.isCustomized) {
        promptTemplate = data.npcPromptTemplate.template;
      } else {
        promptTemplate = await this.getDefaultPromptTemplate(data.npcId);
      }
      
      // 预处理输入文本，确保变量引用格式正确
      const processedInput = this.preprocessVariableReferences(data.input);
      if (processedInput !== data.input) {
        console.log(`输入文本经过预处理，原文本: "${data.input}", 处理后: "${processedInput}"`);
      }
      
      // 使用组合Prompt方法，会自动处理变量解析
      const fullPrompt = await this.combinePrompt(processedInput, promptTemplate);
      
      // 获取AI服务适配器
      const adapter = await this.getServiceAdapter(data.aiServiceId);
      
      // 调用AI服务
      const chatMessage: ChatMessage = {
        role: 'user',
        content: fullPrompt
      };
      
      const result = await adapter.chat([chatMessage]);
      
      // 解析后的输入和模板 (为了调试信息)
      const resolvedInput = await this.resolveVariables(processedInput);
      const resolvedTemplate = await this.resolveVariables(promptTemplate);
      
      // 返回结果，包含可选的调试信息
      if (data.debug) {
        return {
          output: result.content,
          debug: {
            originalInput: data.input,
            resolvedInput,
            originalTemplate: promptTemplate,
            resolvedTemplate,
            fullPrompt
          }
        };
      } else {
        return { output: result.content };
      }
    } catch (error) {
      const e = error as Error;
      console.error(`测试执行工作任务失败: ${e.message}`, e);
      throw new Error(`测试执行失败: ${e.message}`);
    }
  }
  
  /**
   * 预处理变量引用，修复常见格式问题
   * @param text 原始文本
   * @returns 处理后的文本
   */
  private preprocessVariableReferences(text: string): string {
    console.log(`[预处理] 开始预处理变量引用: "${text}"`);
    
    // 处理连续变量引用：在两个变量引用之间添加空格
    // 例如：将 @变量1.属性@变量2.属性 改为 @变量1.属性 @变量2.属性
    let processedText = text.replace(/([@][^@\s]+\.[^@\s]+)([@])/g, '$1 $2');
    
    if (processedText !== text) {
      console.log(`[预处理] 修复了连续变量引用: "${processedText}"`);
    }
    
    return processedText;
  }

  /**
   * 执行工作任务
   * @param id 工作任务ID
   * @returns 更新后的工作任务
   */
  public async executeWorkTask(id: string): Promise<WorkTask | null> {
    try {
      // 获取工作任务
      const task = await this.getWorkTaskById(id);
      if (!task) {
        throw new Error(`工作任务不存在: ${id}`);
      }
      
      // 检查任务状态
      if (task.executionStatus === ExecutionStatus.RUNNING) {
        throw new Error('任务正在执行中');
      }
      
      // 更新任务状态为执行中
      await this.updateWorkTaskExecutionStatus(id, ExecutionStatus.RUNNING, null);
      
      try {
        // 组合Prompt
        const fullPrompt = await this.combinePrompt(
          task.input, 
          task.npcPromptTemplate.template
        );
        
        // 获取AI服务适配器
        const adapter = await this.getServiceAdapter(task.aiServiceId);
        
        // 调用AI服务
        const chatMessage: ChatMessage = {
          role: 'user',
          content: fullPrompt
        };
        
        const result = await adapter.chat([chatMessage]);
        const output = result.content;
        
        // 更新任务输出和状态
        await this.updateTaskOutput(id, output, ExecutionStatus.COMPLETED);
        
        return this.getWorkTaskById(id);
      } catch (error) {
        // 处理执行过程中的错误
        const e = error as Error;
        await this.updateWorkTaskExecutionStatus(id, ExecutionStatus.FAILED, e.message);
        throw e;
      }
    } catch (error) {
      const e = error as Error;
      console.error(`执行工作任务失败: ${e.message}`);
      throw e;
    }
  }
}
