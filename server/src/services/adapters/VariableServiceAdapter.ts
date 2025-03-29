import { VariableService, variableService } from "../VariableService";

/**
 * 变量服务适配器
 * 用于对接工作流模块与变量系统，遵循只读原则
 * 支持多种变量标识符格式：
 * - 显示标识符格式: @来源.字段 或 @来源.字段#ID
 * - 系统标识符格式: @gv_UUID_字段
 * 
 * 2025.03.27更新：增强了标识符解析能力，增加了模糊匹配和兼容处理
 */
export class VariableServiceAdapter {
  private variableService: VariableService;
  
  constructor(variableService: VariableService) {
    this.variableService = variableService;
  }
  
  /**
   * 清理变量ID，移除可能的类型前缀和字段后缀
   * @param id 原始ID，可能含有前缀或后缀
   * @returns 清理后的纯UUID
   */
  private cleanVariableId(id: string): string {
    if (!id) return '';
    
    // 移除类型前缀 (如 npc_, task_, workflow_)
    let cleanedId = id;
    const typePrefixes = ['npc_', 'task_', 'workflow_', 'custom_', 'file_', 'system_'];
    typePrefixes.forEach(prefix => {
      if (cleanedId.startsWith(prefix)) {
        cleanedId = cleanedId.substring(prefix.length);
      }
    });
    
    // 如果ID包含下划线且后面跟着字段名，则也需要移除
    const lastUnderscoreIndex = cleanedId.lastIndexOf('_');
    if (lastUnderscoreIndex > 0 && lastUnderscoreIndex < cleanedId.length - 1) {
      const potentialFieldName = cleanedId.substring(lastUnderscoreIndex + 1);
      // 检查是否是常见字段名（如果是则移除）
      const commonFields = ['name', 'input', 'output', 'status', 'description', 'knowledge', 'act', 'actlv', 'value'];
      if (commonFields.includes(potentialFieldName) || 
          commonFields.some(field => potentialFieldName.endsWith(`_${field}`)) ||
          potentialFieldName.startsWith('node_')) {
        cleanedId = cleanedId.substring(0, lastUnderscoreIndex);
      }
    }
    
    return cleanedId;
  }
  
  /**
   * 检查两个ID是否可能匹配（模糊匹配）
   * @param id1 第一个ID
   * @param id2 第二个ID
   * @returns 是否匹配
   */
  private idMightMatch(id1: string, id2: string): boolean {
    if (!id1 || !id2) return false;
    
    // 清理两个ID
    const cleanId1 = this.cleanVariableId(id1);
    const cleanId2 = this.cleanVariableId(id2);
    
    // 完全匹配
    if (cleanId1 === cleanId2) return true;
    
    // 前缀匹配（一个ID是另一个的前缀）
    if (cleanId1.startsWith(cleanId2) || cleanId2.startsWith(cleanId1)) return true;
    
    // 包含匹配（一个ID包含另一个）
    if (cleanId1.includes(cleanId2) || cleanId2.includes(cleanId1)) return true;
    
    // 匹配前4位（短ID兼容）
    if (cleanId1.length >= 4 && cleanId2.length >= 4) {
      if (cleanId1.substring(0, 4) === cleanId2.substring(0, 4)) return true;
    }
    
    return false;
  }
  
  /**
   * 根据源和字段获取变量值，增强版支持模糊匹配
   * @param source 变量源ID或名称
   * @param field 字段名称
   * @returns 变量值，如果找不到则返回undefined
   */
  async getVariableValue(source: string, field: string): Promise<any> {
    try {
      // 获取所有变量
      const variables = await this.variableService.getVariables();
      
      // 寻找匹配的变量
      const formattedIdentifier = `@${source}.${field}`;
      
      // 精确匹配阶段 - 优先使用精确匹配
      for (const variable of variables) {
        // 检查标识符是否匹配 - 支持带ID后缀的格式
        // 提取变量标识符的基本部分（不含ID后缀）
        const variableBaseIdentifier = variable.identifier.split('#')[0];
        
        if (variable.identifier === formattedIdentifier || variableBaseIdentifier === formattedIdentifier) {
          console.log(`[VariableAdapter] 通过精确标识符匹配找到变量: ${variable.identifier}`);
          return variable.value;
        }
        
        // 检查源名称和字段名称是否匹配
        if (variable.source.id === source || variable.source.name === source) {
          if (variable.name === field) {
            console.log(`[VariableAdapter] 通过源名称和字段匹配找到变量: ${variable.source.name}.${variable.name}`);
            return variable.value;
          }
        }
      }
      
      // 模糊匹配阶段 - 尝试查找名称相似的源
      const sourceMatches = variables.filter(variable => {
        if (!variable.source || !variable.source.name) return false;
        
        // 源名称模糊匹配：检查清理后的源名称是否可能匹配
        const sourceName = variable.source.name.toLowerCase();
        const searchSource = source.toLowerCase();
        
        return sourceName.includes(searchSource) || 
               searchSource.includes(sourceName) ||
               // 或者使用ID匹配
               (variable.source.id && (
                 variable.source.id.includes(source) ||
                 source.includes(variable.source.id)
               ));
      });
      
      if (sourceMatches.length > 0) {
        console.log(`[VariableAdapter] 找到${sourceMatches.length}个源名称模糊匹配的变量`);
        
        // 尝试在模糊匹配的变量中找到字段完全匹配的变量
        const exactFieldMatch = sourceMatches.find(v => v.name === field);
        if (exactFieldMatch) {
          console.log(`[VariableAdapter] 在源模糊匹配中找到字段完全匹配的变量: ${exactFieldMatch.source.name}.${exactFieldMatch.name}`);
          return exactFieldMatch.value;
        }
        
        // 如果找不到精确字段匹配，尝试常见的字段别名
        const fieldAliases: Record<string, string[]> = {
          'name': ['title', 'label', 'displayName'],
          'value': ['content', 'text', 'data'],
          'input': ['prompt', 'request', 'query'],
          'output': ['result', 'response', 'answer'],
          'description': ['desc', 'detail', 'summary', 'info'],
        };
        
        // 检查字段别名
        for (const [mainField, aliases] of Object.entries(fieldAliases)) {
          if (mainField === field || aliases.includes(field)) {
            // 如果请求的字段是主字段或别名，尝试查找任何匹配的别名
            const allPossibleFields = [mainField, ...aliases];
            
            for (const possibleField of allPossibleFields) {
              const aliasMatch = sourceMatches.find(v => v.name === possibleField);
              if (aliasMatch) {
                console.log(`[VariableAdapter] 通过字段别名匹配找到变量: ${aliasMatch.source.name}.${aliasMatch.name} 作为 ${field} 的别名`);
                return aliasMatch.value;
              }
            }
          }
        }
        
        // 如果仍然找不到，使用第一个匹配的变量作为最佳猜测
        console.log(`[VariableAdapter] 未找到字段匹配，使用首个源模糊匹配变量: ${sourceMatches[0].source.name}.${sourceMatches[0].name}`);
        return sourceMatches[0].value;
      }
      
      console.log(`[VariableAdapter] 没有找到变量: ${formattedIdentifier}`);
      return undefined;
    } catch (error) {
      console.error(`[VariableAdapter] 获取变量值失败 (${source}.${field}):`, error);
      throw error;
    }
  }
  
  /**
   * 检查变量是否存在
   * @param source 变量源ID或名称
   * @param field 字段名称
   * @returns 变量是否存在
   */
  async variableExists(source: string, field: string): Promise<boolean> {
    try {
      const value = await this.getVariableValue(source, field);
      return value !== undefined;
    } catch (error) {
      console.error(`检查变量是否存在失败 (${source}.${field}):`, error);
      return false;
    }
  }
  
  /**
   * 通过UUID和字段名获取变量值，支持增强的模糊匹配
   * 支持系统标识符格式：@gv_UUID_field
   * @param uuid 变量UUID
   * @param field 字段名称
   * @returns 变量值，如果找不到则返回undefined
   */
  async getVariableValueByUUID(uuid: string, field: string): Promise<any> {
    try {
      // 清理UUID
      const cleanUuid = this.cleanVariableId(uuid);
      
      // 获取所有变量
      const variables = await this.variableService.getVariables();
      
      // 系统标识符格式
      const systemIdentifier = `@gv_${uuid}_${field}`;
      
      // 精确匹配阶段 - 优先尝试精确匹配
      for (const variable of variables) {
        // 检查标识符是否完全匹配
        if (variable.identifier === systemIdentifier) {
          console.log(`[VariableAdapter] 通过精确标识符匹配找到变量: ${variable.identifier}`);
          return variable.value;
        }
        
        // 检查UUID和字段名称是否匹配
        if (variable.id === uuid && variable.name === field) {
          console.log(`[VariableAdapter] 通过精确ID匹配找到变量: ${variable.id}.${variable.name}`);
          return variable.value;
        }
        
        // 检查entityId和字段名称是否匹配
        if (variable.entityId === uuid && variable.name === field) {
          console.log(`[VariableAdapter] 通过精确entityId匹配找到变量: ${variable.entityId}.${variable.name}`);
          return variable.value;
        }
      }
      
      // 模糊匹配阶段 - 如果精确匹配找不到，尝试更灵活的匹配方式
      // 寻找符合条件的变量列表
      const matchedVariables = variables.filter(variable => {
        // ID模糊匹配：检查清理后的ID是否可能匹配
        const variableId = this.cleanVariableId(variable.id);
        const variableEntityId = variable.entityId ? this.cleanVariableId(variable.entityId) : '';
        
        return this.idMightMatch(variableId, cleanUuid) || 
               (variableEntityId && this.idMightMatch(variableEntityId, cleanUuid));
      });
      
      if (matchedVariables.length > 0) {
        console.log(`[VariableAdapter] 找到${matchedVariables.length}个模糊匹配的变量`);
        
        // 尝试在模糊匹配的变量中找到字段完全匹配的变量
        const exactFieldMatch = matchedVariables.find(v => v.name === field);
        if (exactFieldMatch) {
          console.log(`[VariableAdapter] 在模糊匹配中找到字段完全匹配的变量: ${exactFieldMatch.id}.${exactFieldMatch.name}`);
          return exactFieldMatch.value;
        }
        
        // 如果找不到精确字段匹配，尝试常见的字段别名
        const fieldAliases: Record<string, string[]> = {
          'name': ['title', 'label', 'displayName'],
          'value': ['content', 'text', 'data'],
          'input': ['prompt', 'request', 'query'],
          'output': ['result', 'response', 'answer'],
          'description': ['desc', 'detail', 'summary', 'info'],
        };
        
        // 检查字段别名
        for (const [mainField, aliases] of Object.entries(fieldAliases)) {
          if (mainField === field || aliases.includes(field)) {
            // 如果请求的字段是主字段或别名，尝试查找任何匹配的别名
            const allPossibleFields = [mainField, ...aliases];
            
            for (const possibleField of allPossibleFields) {
              const aliasMatch = matchedVariables.find(v => v.name === possibleField);
              if (aliasMatch) {
                console.log(`[VariableAdapter] 通过字段别名匹配找到变量: ${aliasMatch.id}.${aliasMatch.name} 作为 ${field} 的别名`);
                return aliasMatch.value;
              }
            }
          }
        }
        
        // 如果仍然找不到，使用第一个匹配的变量作为最佳猜测
        console.log(`[VariableAdapter] 未找到字段匹配，使用首个模糊匹配变量: ${matchedVariables[0].id}.${matchedVariables[0].name}`);
        return matchedVariables[0].value;
      }
      
      // 时间戳ID处理 - 尝试将数字ID转换为时间戳
      if (/^\d{10,13}$/.test(uuid)) {
        console.log(`[VariableAdapter] 检测到可能是时间戳ID: ${uuid}，尝试时间戳处理`);
        
        // 简单的时间戳处理 - 在实际环境中可能需要更复杂的逻辑
        const timestamp = parseInt(uuid);
        const date = new Date(timestamp * (uuid.length === 10 ? 1000 : 1));
        
        if (!isNaN(date.getTime())) {
          // 如果是有效的时间戳，使用日期作为返回值
          console.log(`[VariableAdapter] 时间戳转换为日期: ${date.toISOString()}`);
          return date.toISOString();
        }
      }
      
      console.log(`[VariableAdapter] 没有找到UUID变量: ${systemIdentifier}`);
      return undefined;
    } catch (error) {
      console.error(`[VariableAdapter] 通过UUID获取变量值失败 (${uuid}.${field}):`, error);
      throw error;
    }
  }
  
  /**
   * 通过短ID和字段名获取变量值，使用增强的模糊匹配
   * 支持显示标识符格式：@source.field#shortId
   * @param shortId 变量短ID（UUID的前几位）
   * @param field 字段名称
   * @returns 变量值，如果找不到则返回undefined
   */
  async getVariableValueByShortId(shortId: string, field: string): Promise<any> {
    try {
      // 获取所有变量
      const variables = await this.variableService.getVariables();
      
      // 精确匹配阶段 - 优先尝试精确匹配
      for (const variable of variables) {
        // 检查变量ID的前几位是否精确匹配短ID
        if (variable.id.startsWith(shortId) && variable.name === field) {
          console.log(`[VariableAdapter] 通过精确短ID匹配找到变量: ${variable.id}.${variable.name}`);
          return variable.value;
        }
        
        // 检查entityId前几位是否匹配
        if (variable.entityId && variable.entityId.startsWith(shortId) && variable.name === field) {
          console.log(`[VariableAdapter] 通过精确短ID匹配entityId找到变量: ${variable.entityId}.${variable.name}`);
          return variable.value;
        }
        
        // 检查标识符是否包含短ID
        if (variable.identifier.includes(`#${shortId}`) && variable.name === field) {
          console.log(`[VariableAdapter] 通过标识符中的短ID匹配找到变量: ${variable.identifier}`);
          return variable.value;
        }
      }
      
      // 模糊匹配阶段 - 如果精确匹配找不到，尝试更灵活的匹配方式
      const matchedVariables = variables.filter(variable => {
        // 清理ID
        const variableId = this.cleanVariableId(variable.id);
        const variableEntityId = variable.entityId ? this.cleanVariableId(variable.entityId) : '';
        
        // 短ID是否包含在ID中的任何位置
        return variableId.includes(shortId) || 
               (variableEntityId && variableEntityId.includes(shortId)) ||
               // 或者ID的前几位包含在短ID中
               (shortId.length >= 4 && (
                 variableId.startsWith(shortId.substring(0, 4)) ||
                 (variableEntityId && variableEntityId.startsWith(shortId.substring(0, 4)))
               ));
      });
      
      if (matchedVariables.length > 0) {
        console.log(`[VariableAdapter] 通过模糊短ID匹配找到${matchedVariables.length}个变量`);
        
        // 尝试在模糊匹配的变量中找到字段完全匹配的变量
        const exactFieldMatch = matchedVariables.find(v => v.name === field);
        if (exactFieldMatch) {
          console.log(`[VariableAdapter] 在短ID模糊匹配中找到字段完全匹配的变量: ${exactFieldMatch.id}.${exactFieldMatch.name}`);
          return exactFieldMatch.value;
        }
        
        // 如果找不到精确字段匹配，尝试常见的字段别名
        const fieldAliases: Record<string, string[]> = {
          'name': ['title', 'label', 'displayName'],
          'value': ['content', 'text', 'data'],
          'input': ['prompt', 'request', 'query'],
          'output': ['result', 'response', 'answer'],
          'description': ['desc', 'detail', 'summary', 'info'],
        };
        
        // 检查字段别名
        for (const [mainField, aliases] of Object.entries(fieldAliases)) {
          if (mainField === field || aliases.includes(field)) {
            // 如果请求的字段是主字段或别名，尝试查找任何匹配的别名
            const allPossibleFields = [mainField, ...aliases];
            
            for (const possibleField of allPossibleFields) {
              const aliasMatch = matchedVariables.find(v => v.name === possibleField);
              if (aliasMatch) {
                console.log(`[VariableAdapter] 通过字段别名匹配找到短ID变量: ${aliasMatch.id}.${aliasMatch.name} 作为 ${field} 的别名`);
                return aliasMatch.value;
              }
            }
          }
        }
        
        // 如果仍然找不到，使用第一个匹配的变量作为最佳猜测
        console.log(`[VariableAdapter] 未找到字段匹配，使用首个短ID模糊匹配变量: ${matchedVariables[0].id}.${matchedVariables[0].name}`);
        return matchedVariables[0].value;
      }
      
      console.log(`[VariableAdapter] 没有找到短ID变量: ${field}#${shortId}`);
      return undefined;
    } catch (error) {
      console.error(`[VariableAdapter] 通过短ID获取变量值失败 (${field}#${shortId}):`, error);
      throw error;
    }
  }
  
  /**
   * 根据前缀获取所有匹配的变量
   * @param prefix 变量前缀，如"workflow"将匹配所有以"@workflow."开头的变量
   * @returns 匹配的变量列表
   */
  async getVariablesByPrefix(prefix: string): Promise<Record<string, any>> {
    try {
      // 获取所有变量
      const variables = await this.variableService.getVariables();
      
      // 过滤匹配前缀的变量
      const result: Record<string, any> = {};
      const prefixPattern = new RegExp(`^@${prefix}\\.`);
      
      for (const variable of variables) {
        if (prefixPattern.test(variable.identifier)) {
          // 去掉前缀和可能存在的ID后缀，只保留字段名
          // 例如 @workflow.name#123 -> name
          let fieldName = variable.identifier.replace(`@${prefix}.`, '');
          if (fieldName.includes('#')) {
            fieldName = fieldName.split('#')[0];
          }
          result[fieldName] = variable.value;
        }
      }
      
      return result;
    } catch (error) {
      console.error(`获取前缀变量失败 (${prefix}):`, error);
      return {};
    }
  }
}
