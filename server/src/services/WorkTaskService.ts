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
import { VolcesAdapter } from '../adapters/VolcesAdapter';
import { AiServiceAdapter, ChatMessage } from '../adapters/BaseAdapter';
import { VariableService } from './VariableService';
import { VariableServiceAdapter } from './adapters/VariableServiceAdapter';
import { VariableResolver } from './VariableResolver';
import { workTaskVariableService } from './WorkTaskVariableService';

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
  
  // 变量解析组件
  private variableService: VariableService;
  private variableAdapter: VariableServiceAdapter;
  private variableResolver: VariableResolver;

  constructor() {
    this.workTaskRepository = AppDataSource.getRepository(WorkTask);
    this.variableRepository = AppDataSource.getRepository(Variable);
    this.npcRepository = AppDataSource.getRepository(Npc);
    this.aiServiceRepository = AppDataSource.getRepository(AiService);
    this.eventPublisher = VariableEventPublisher.getInstance();
    this.identifierFormatter = IdentifierFormatterService.getInstance();
    
    // 初始化变量解析组件
    this.variableService = new VariableService();
    this.variableAdapter = new VariableServiceAdapter(this.variableService);
    this.variableResolver = new VariableResolver(this.variableAdapter);
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
        if (taskData.npcId) {
          const template = await this.getDefaultPromptTemplate(taskData.npcId);
          taskData.npcPromptTemplate = {
            template,
            isCustomized: false
          };
        } else {
          // 如果没有npcId，使用通用提示词模板
          taskData.npcPromptTemplate = {
            template: "请根据以上输入内容给出回应。",
            isCustomized: true
          };
        }
      }

      // 创建工作任务
      const task = this.workTaskRepository.create(taskData);
      const savedTask = await this.workTaskRepository.save(task);
      
      // 注意：变量创建已移至 WorkTaskVariableSourceProvider
      // 系统启动时自动同步，无需在此处创建变量
      
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

      // 检查是否有npcTemplates字段，如果有，需要特殊处理
      if (taskData.npcTemplates !== undefined) {
        console.log(`检测到npcTemplates字段更新，任务ID: ${id}`);
        
        // 提取npcTemplates字段，并从taskData中移除
        const npcTemplates = taskData.npcTemplates;
        delete taskData.npcTemplates;
        
        // 先更新其他字段
        await this.workTaskRepository.update(id, taskData);
        
        // 单独更新npcTemplates字段，确保它被正确序列化
        if (npcTemplates !== null) {
          console.log(`更新npcTemplates字段，序列化对象...`);
          try {
            // 使用findOne直接获取实体，然后保存，这样TypeORM会正确处理JSON序列化
            const task = await this.workTaskRepository.findOne({ where: { id } });
            if (task) {
              task.npcTemplates = npcTemplates;
              await this.workTaskRepository.save(task);
              console.log(`npcTemplates字段更新成功`);
            }
          } catch (error) {
            console.error(`更新npcTemplates字段失败:`, error);
            throw new Error(`更新npcTemplates字段失败: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }
      } else {
        // 没有npcTemplates字段，直接更新
        await this.workTaskRepository.update(id, taskData);
      }
      
      // 获取更新后的任务
      const updatedTask = await this.getWorkTaskById(id);
      
      // 注意：变量更新已移至 WorkTaskVariableSourceProvider
      // 源提供者会监听变化并自动同步变量
      
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

      // 注意：变量删除逻辑已移至 WorkTaskController，现使用 WorkTaskVariableSourceProvider
      // 直接处理变量删除，以确保所有格式的变量都被正确清理
      
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
      
      // 注意：变量更新已移至 WorkTaskVariableSourceProvider
      // 源提供者会监听变化并自动同步变量
      
      return updatedTask;
    } catch (error) {
      const e = error as Error;
      console.error(`更新工作任务输出失败: ${e.message}`);
      throw e;
    }
  }

  /**
   * 获取默认的NPC提示词模板 (v3.0格式)
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
      
      // 使用v3.0格式系统标识符: @gv_{type}_{entityId}_{field}-=
      console.log(`[v3.0] 生成NPC默认模板, 使用NPC(${npc.name}): ${npcId}`);
      
      return `你是@gv_npc_${npc.id}_name-=，现在你具备的知识背景是：@gv_npc_${npc.id}_knowledge-=，根据你的行动原则：@gv_npc_${npc.id}_act-=，请你给出以上输入的反馈。`;
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
    
    if (!text) {
      console.log(`[变量解析] 文本为空，跳过解析`);
      return text;
    }
    
    try {
      // 使用全局变量解析组件处理变量解析
      const resolvedText = await this.variableResolver.resolveText(text, maxDepth);
      
      // 记录解析结果
      if (resolvedText !== text) {
        console.log(`[变量解析] 文本已成功解析，原文本: "${text}", 解析后: "${resolvedText}"`);
      } else {
        console.log(`[变量解析] 文本未发生变化，可能没有找到有效的变量引用`);
      }
      
      return resolvedText;
    } catch (error) {
      console.error(`[变量解析] 解析变量失败:`, error);
      return text; // 发生错误时返回原始文本
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
      case AiServiceType.VOLCES:
        adapter = new VolcesAdapter();
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
   * 记录模板变量解析详情
   * 辅助函数，用于分析模板变量解析的具体变化
   */
  private logTemplateVariables(original: string, resolved: string): Array<{variable: string, value: string}> {
    const result: Array<{variable: string, value: string}> = [];
    
    // 查找原始模板中的所有变量引用
    const variablePattern = /@gv_[a-zA-Z0-9_-]+_[a-zA-Z0-9\-]+_[a-zA-Z0-9_-]+-=/g;
    const matches = original.match(variablePattern);
    
    if (!matches) return result;
    
    // 对每个变量引用，分析其在解析后文本中的值
    matches.forEach((variable: string) => {
      // 找到变量在原始文本中的位置
      const startIndex = original.indexOf(variable);
      if (startIndex === -1) return;
      
      // 计算这个位置在解析后文本中对应的值
      const beforeVar = original.substring(0, startIndex);
      const afterVar = original.substring(startIndex + variable.length);
      
      // 在解析后文本中找出这个变量被替换成的值
      const beforeInResolved = resolved.substring(0, beforeVar.length);
      const restInResolved = resolved.substring(beforeVar.length);
      
      // 查找afterVar在restInResolved中的位置
      const afterVarInResolvedIndex = restInResolved.indexOf(afterVar);
      
      if (afterVarInResolvedIndex > 0) {
        // 提取变量值
        const value = restInResolved.substring(0, afterVarInResolvedIndex);
        result.push({ variable, value });
      }
    });
    
    return result;
  }

  private async combinePrompt(input: string, npcPromptTemplate: string, debug = true): Promise<string> {
    console.log(`\n===== AI请求准备 =====`);
    
    // 处理用户输入
    console.log(`[用户输入] 原始内容: "${input}"`);
    const resolvedInput = await this.resolveVariables(input, 5, debug);
    
    if (input !== resolvedInput) {
      console.log(`[用户输入] 解析结果: "${resolvedInput}" (包含变量)`);
    } else {
      console.log(`[用户输入] 解析结果: "${resolvedInput}" (无变量)`);
    }
    
    // 处理NPC模板
    console.log(`\n[模板] 原始内容: "${npcPromptTemplate}"`);
    const resolvedTemplate = await this.resolveVariables(npcPromptTemplate, 5, debug);
    
    if (npcPromptTemplate !== resolvedTemplate) {
      // 分析并记录模板中的变量解析
      const templateDiff = this.logTemplateVariables(npcPromptTemplate, resolvedTemplate);
      if (templateDiff.length > 0) {
        console.log(`[模板] 变量解析详情:`);
        templateDiff.forEach(item => {
          console.log(`  • ${item.variable} → "${item.value}"`);
        });
      }
      console.log(`[模板] 解析结果: "${resolvedTemplate}"`);
    } else {
      console.log(`[模板] 解析结果: "${resolvedTemplate}" (无变量)`);
    }
    
    // 组合完整Prompt
    const fullPrompt = `${resolvedInput}\n\n${resolvedTemplate}`;
    
    // 明确显示最终提交给AI的Prompt
    console.log(`\n===== 最终提交给AI的Prompt =====`);
    console.log(fullPrompt);
    console.log(`=====================================\n`);
    
    return fullPrompt;
  }

  /**
   * 测试执行工作任务
   * 不保存结果，仅返回AI输出
   */
  public async testExecuteWorkTask(data: {
    input: string;
    npcId?: string; // 现在是可选的
    aiServiceId: string;
    npcPromptTemplate?: {
      template: string;
      isCustomized: boolean;
    };
    debug?: boolean; // 是否返回调试信息
    returnServerLogs?: boolean; // 是否返回服务器日志
  }): Promise<{ 
    output: string; 
    debug?: { 
      originalInput: string; 
      resolvedInput: string; 
      originalTemplate: string; 
      resolvedTemplate: string; 
      fullPrompt: string 
    };
    serverLogs?: string[]; // 服务器日志
  }> {
    try {
      console.log('\n=================================================');
      console.log('              测试工作任务执行                    ');
      console.log('=================================================');
      
      // 验证参数
      if (!data.input || !data.aiServiceId) {
        throw new Error('缺少必要参数');
      }
      
      // 获取NPC提示词模板
      let promptTemplate: string;
      if (data.npcPromptTemplate?.isCustomized) {
        promptTemplate = data.npcPromptTemplate.template;
      } else if (data.npcId) {
        promptTemplate = await this.getDefaultPromptTemplate(data.npcId);
      } else {
        // 如果没有npcId，使用通用提示词模板
        promptTemplate = "请根据以上输入内容给出回应。";
      }
      
      // 预处理输入文本，确保变量引用格式正确
      const processedInput = this.preprocessVariableReferences(data.input);
      if (processedInput !== data.input) {
        console.log(`[预处理] 输入文本已优化: 
原始: "${data.input}"
处理后: "${processedInput}"`);
      }
      
      // 使用组合Prompt方法，会自动处理变量解析
      const fullPrompt = await this.combinePrompt(processedInput, promptTemplate);
      
      // 获取AI服务适配器
      const adapter = await this.getServiceAdapter(data.aiServiceId);
      
      // 记录AI调用开始
      console.log('\n===== 准备调用AI服务 =====');
      console.log(`服务ID: ${data.aiServiceId}`);
      console.log(`提示词: ${fullPrompt.length}字符`);
      
      let result;
      try {
        // 调用AI服务
        const chatMessage: ChatMessage = {
          role: 'user',
          content: fullPrompt
        };
        
        console.log('发送请求到AI服务...');
        const startTime = Date.now();
        
        result = await adapter.chat([chatMessage]);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // 记录AI调用成功
        console.log('\n===== AI服务响应 =====');
        console.log(`响应时间: ${duration} ms`);
        console.log(`输出长度: ${result.content.length} 字符`);
        console.log(`输出预览: ${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}`);
      } catch (error) {
        // 记录AI调用失败
        console.error('\n===== AI服务调用失败 =====');
        console.error(`错误信息: ${error instanceof Error ? error.message : String(error)}`);
        throw error; // 重新抛出错误，由外层处理
      }
      
      // 解析后的输入和模板 (为了调试信息)
      const resolvedInput = await this.resolveVariables(processedInput);
      const resolvedTemplate = await this.resolveVariables(promptTemplate);
      
      console.log('\n===== 请求处理摘要 =====');
      console.log(`原始输入: "${data.input}"`);
      console.log(`解析输入: "${resolvedInput}"`);
      console.log(`原始模板: "${promptTemplate}"`);
      console.log(`解析模板: "${resolvedTemplate}"`);
      console.log('=================================================\n');
      
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
      console.error(`测试执行工作任务失败: ${e.message}`);
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
        
        // 步骤1: 先更新任务输出和状态到数据库
        console.log(`[WorkTaskService] 保存AI输出到数据库，输出长度: ${output ? output.length : 0}字符`);
        await this.workTaskRepository.update(id, {
          output,
          executionStatus: ExecutionStatus.COMPLETED
        });
        
        // 步骤2: 确保数据库更新已完成
        console.log(`[WorkTaskService] 数据库更新完成，开始更新变量...`);
        
        // 步骤3: 直接更新output变量，跳过复杂的同步逻辑
        try {
          console.log(`[WorkTaskService] 直接更新output变量，值长度: ${output.length}字符`);
          // 直接调用变量服务的方法创建/更新变量，确保使用最新的输出
          await workTaskVariableService.createOrUpdateTaskVariable(
            id,
            task.name,
            'output',
            output // 直接使用最新的输出结果
          );
          console.log(`[WorkTaskService] output变量更新成功`);
        } catch (variableError) {
          console.error(`[WorkTaskService] 更新output变量失败:`, variableError);
          // 不因变量更新失败而中断任务执行
        }
        
        // 获取完整的更新后任务，用于返回
        const updatedTask = await this.getWorkTaskById(id);
        return updatedTask;
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
