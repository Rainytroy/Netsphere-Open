import { VariableSchemas, FieldMappings, FieldDefinition } from '../config/VariableSchemaConfig';
import { VariableType } from './variableService';

/**
 * 变量架构服务
 * 基于集中配置，提供变量类型和字段的处理功能
 * 替代原有散落在各处的类型判断和字段映射逻辑
 */
export class VariableSchemaService {
  /**
   * 将中文字段名转换为规范化的英文字段名
   * @param field 原始字段名（可能是中文）
   * @param sourceType 变量类型
   * @returns 规范化的英文字段名
   */
  /**
   * 将原始字段名转换为规范化的英文字段名
   * 支持多种模糊匹配和智能推断
   * @param field 原始字段名（可能是中文、英文、非字符串值）
   * @param sourceType 变量类型
   * @returns 规范化的英文字段名
   */
  static normalizeFieldName(field: string, sourceType: string): string {
    // 如果是空值，直接返回
    if (!field) return field;
    
    // 规范化类型名
    const normalizedType = this.normalizeSourceType(sourceType);
    console.log(`[VariableSchemaService] 规范化字段: "${field}" (类型: ${normalizedType})`);
    
    // 如果已经是英文字段，检查是否在字段列表中
    if (this.isEnglishField(field, normalizedType)) {
      return field;
    }
    
    // 获取类型对应的字段映射
    const typeMapping = FieldMappings[normalizedType];
    if (!typeMapping) return field;
    
    // 查找中文字段精确匹配的英文字段
    const exactMappedField = typeMapping[field];
    if (exactMappedField) {
      console.log(`[VariableSchemaService] 精确匹配："${field}" => "${exactMappedField}"`);
      return exactMappedField;
    }
    
    // 如果找不到精确匹配，使用类型特定的模糊匹配逻辑
    const fuzzyMatch = this.getFuzzyFieldMatch(field, normalizedType);
    if (fuzzyMatch) {
      console.log(`[VariableSchemaService] 模糊匹配："${field}" => "${fuzzyMatch}"`);
      return fuzzyMatch;
    }
    
    // 最后，如果都没找到，返回原字段
    return field;
  }
  
  /**
   * 根据类型和字段名进行模糊匹配
   * 处理不同措辞、近义词和中文变体
   */
  private static getFuzzyFieldMatch(field: string, type: string): string | null {
    // 转为字符串并转小写，以便不区分大小写匹配
    const normalizedField = String(field).toLowerCase();
    
    // NPC类型特定的字段模糊匹配
    if (type === 'npc') {
      // 行为/行动原则
      if (normalizedField.includes('行为') || 
          normalizedField.includes('行动') || 
          normalizedField.includes('原则') ||
          normalizedField.includes('策略') ||
          normalizedField.includes('act')) {
        return 'act';
      }
      
      // 活跃度
      if (normalizedField.includes('活跃') || 
          normalizedField.includes('主动') || 
          normalizedField.includes('积极') ||
          normalizedField.includes('actlv')) {
        return 'actlv';
      }
      
      // 知识/背景
      if (normalizedField.includes('知识') || 
          normalizedField.includes('背景') || 
          normalizedField.includes('information') ||
          normalizedField.includes('knowledge')) {
        return 'knowledge';
      }
      
      // 描述
      if (normalizedField.includes('描述') || 
          normalizedField.includes('介绍') || 
          normalizedField.includes('簡介') ||
          normalizedField.includes('desc')) {
        return 'description';
      }
      
      // 名称
      if (normalizedField.includes('名称') || 
          normalizedField.includes('姓名') || 
          normalizedField.includes('名字') ||
          normalizedField.includes('title') ||
          normalizedField === 'name' ||
          normalizedField === '名') {
        return 'name';
      }
    }
    
    // 工作任务(task)特定的字段模糊匹配
    else if (type === 'task') {
      // 输入
      if (normalizedField.includes('输入') || 
          normalizedField.includes('内容') || 
          normalizedField.includes('原始') ||
          normalizedField.includes('in') ||
          normalizedField.includes('source')) {
        return 'input';
      }
      
      // 输出
      if (normalizedField.includes('输出') || 
          normalizedField.includes('结果') || 
          normalizedField.includes('结论') ||
          normalizedField.includes('out') ||
          normalizedField.includes('result')) {
        return 'output';
      }
      
      // 状态
      if (normalizedField.includes('状态') || 
          normalizedField.includes('进度') || 
          normalizedField.includes('阶段') ||
          normalizedField.includes('stat')) {
        return 'status';
      }
    }
    
    // 工作流(workflow)特定的字段模糊匹配
    else if (type === 'workflow') {
      // 名称
      if (normalizedField.includes('名称') || 
          normalizedField.includes('标题') || 
          normalizedField.includes('主题') ||
          normalizedField.includes('title') ||
          normalizedField === 'name' ||
          /^name\d*$/.test(normalizedField) ||  // 处理name1, name2这样的格式
          normalizedField === '名') {
        return 'name';
      }
      
      // 状态
      if (normalizedField.includes('状态') || 
          normalizedField.includes('进度') || 
          normalizedField.includes('阶段') ||
          normalizedField.includes('stat')) {
        return 'status';
      }
      
      // 描述
      if (normalizedField.includes('描述') || 
          normalizedField.includes('介绍') || 
          normalizedField.includes('簡介') ||
          normalizedField.includes('desc')) {
        return 'description';
      }
      
      // 处理数字作为字段名的情况 (可能是节点ID)
      if (/^\d+$/.test(normalizedField)) {
        console.log(`[VariableSchemaService] 检测到数字字段名："${normalizedField}"，工作流默认映射为"name"`);
        return 'name';
      }
    }
    
    // 自定义变量(custom)特定的字段模糊匹配
    else if (type === 'custom') {
      // 几乎所有字段都应该映射为value
      if (normalizedField.includes('值') || 
          normalizedField.includes('内容') || 
          normalizedField.includes('数据') ||
          normalizedField.includes('val') ||
          normalizedField.includes('content') ||
          normalizedField.includes('data')) {
        return 'value';
      }
      
      // 如果自定义变量没有指定字段，默认为value
      return 'value';
    }
    
    // 文件(file)特定的字段模糊匹配
    else if (type === 'file') {
      // 路径
      if (normalizedField.includes('路径') || 
          normalizedField.includes('地址') || 
          normalizedField.includes('位置') ||
          normalizedField.includes('path') ||
          normalizedField.includes('location') ||
          normalizedField.includes('url')) {
        return 'path';
      }
      
      // 内容
      if (normalizedField.includes('内容') || 
          normalizedField.includes('数据') || 
          normalizedField.includes('文本') ||
          normalizedField.includes('content') ||
          normalizedField.includes('data') ||
          normalizedField.includes('text')) {
        return 'content';
      }
    }
    
    // 系统(system)变量一般只有value字段
    else if (type === 'system') {
      return 'value';
    }
    
    // 没有找到匹配
    return null;
  }
  
  /**
   * 判断字段名是否为英文字段
   * @param field 字段名
   * @param sourceType 变量类型
   * @returns 是否为英文字段
   */
  static isEnglishField(field: string, sourceType: string): boolean {
    // 获取变量类型的schema
    const schema = VariableSchemas[sourceType];
    if (!schema) return false;
    
    // 检查字段是否存在于此类型的字段定义中
    return Object.keys(schema.fields).includes(field);
  }
  
  /**
   * 将英文字段名转换为中文显示用字段名
   * @param englishField 英文字段名
   * @param sourceType 变量类型
   * @returns 中文字段名
   */
  static getChineseFieldName(englishField: string, sourceType: string): string {
    // 如果是空值，直接返回
    if (!englishField) return englishField;
    
    // 规范化类型名
    const normalizedType = this.normalizeSourceType(sourceType);
    
    // 获取变量类型的schema
    const schema = VariableSchemas[normalizedType];
    if (!schema) return englishField;
    
    // 查找字段定义
    for (const [key, field] of Object.entries(schema.fields)) {
      if (field.english === englishField) {
        return field.chinese;
      }
    }
    
    return englishField;
  }
  
  /**
   * 规范化变量类型
   * 确保类型名称使用标准类型字符串
   * 处理数字、中文或其他非标准类型名称情况
   * @param sourceType 原始类型
   * @param field 可选字段名，用于辅助判断类型
   * @returns 规范化的类型名称
   */
  static normalizeSourceType(sourceType: string, field?: string): string {
    if (!sourceType) return 'unknown';
    
    // 转小写并去除前后空格
    const type = String(sourceType).toLowerCase().trim();
    
    // 如果已经是标准类型，直接返回
    if (Object.keys(VariableSchemas).includes(type)) {
      return type;
    }
    
    // 处理数字类型的任务ID（例如"2"）
    if (/^\d+$/.test(type)) {
      // 如果字段为input或output，很可能是任务
      if (field && ['input', 'output', 'status'].includes(field)) {
        return 'task';
      }
      return 'task';  // 假设数字ID大部分情况是任务
    }
    
    // 通过关键词匹配类型
    if (type.includes('流') || type.includes('工作流') || type.includes('workflow')) {
      return 'workflow';
    }
    
    if (type.includes('任务') || type.includes('task')) {
      return 'task';
    }
    
    if (type.includes('npc') || type.includes('角色')) {
      return 'npc';
    }
    
    if (type.includes('文件') || type.includes('file')) {
      return 'file';
    }
    
    if (type.includes('自定义') || type.includes('custom')) {
      return 'custom';
    }
    
    if (type.includes('系统') || type.includes('system')) {
      return 'system';
    }
    
    // 根据字段名推断类型
    if (field) {
      if (['input', 'output'].includes(field)) {
        return 'task';
      }
      
      if (['name', 'status'].includes(field) && (type.includes('未命名') || type.includes('工作'))) {
        return 'workflow';
      }
      
      if (['knowledge', 'act', 'actlv'].includes(field)) {
        return 'npc';
      }
      
      if (['value'].includes(field) && !type.includes('file')) {
        return 'custom';
      }
    }
    
    // 默认为自定义类型
    return 'custom';
  }
  
  /**
   * 获取变量类型的主题色
   * @param variableType 变量类型
   * @param error 是否为错误状态
   * @returns 主题色对象
   */
  static getTypeTheme(variableType?: string | VariableType, error: boolean = false) {
    // 错误状态返回统一的错误主题
    if (error) {
      return {
        bgColor: '#FFF1F0',
        borderColor: '#F5222D',
        textColor: '#F5222D'
      };
    }
    
    // 规范化类型
    let typeValue = '';
    if (typeof variableType === 'string') {
      typeValue = variableType;
    } else if (variableType !== undefined && variableType !== null) {
      typeValue = String(variableType);
    }
    
    const normalizedType = this.normalizeSourceType(typeValue);
    
    // 获取类型的主题配置
    const schema = VariableSchemas[normalizedType];
    return schema?.theme || VariableSchemas.system.theme;
  }
  
  /**
   * 获取指定类型变量的显示名称
   * @param sourceType 变量类型
   * @returns 显示名称
   */
  static getTypeDisplayName(sourceType: string): string {
    const normalizedType = this.normalizeSourceType(sourceType);
    const schema = VariableSchemas[normalizedType];
    return schema?.displayName || sourceType;
  }
  
  /**
   * 获取指定类型变量的所有字段定义
   * @param sourceType 变量类型
   * @returns 字段定义对象
   */
  static getTypeFields(sourceType: string): Record<string, FieldDefinition> {
    const normalizedType = this.normalizeSourceType(sourceType);
    const schema = VariableSchemas[normalizedType];
    return schema?.fields || {};
  }
  
  /**
   * 检查指定变量类型是否有此字段
   * @param field 字段名
   * @param sourceType 变量类型
   * @returns 是否存在此字段
   */
  static hasField(field: string, sourceType: string): boolean {
    const normalizedType = this.normalizeSourceType(sourceType);
    const schema = VariableSchemas[normalizedType];
    if (!schema) return false;
    
    // 检查英文字段名
    if (Object.keys(schema.fields).includes(field)) {
      return true;
    }
    
    // 检查中文字段名
    return Object.values(schema.fields).some(fieldDef => fieldDef.chinese === field);
  }
  
  /**
   * 获取字段定义
   * @param field 字段名（英文或中文）
   * @param sourceType 变量类型
   * @returns 字段定义
   */
  static getFieldDefinition(field: string, sourceType: string): FieldDefinition | null {
    const normalizedType = this.normalizeSourceType(sourceType);
    const schema = VariableSchemas[normalizedType];
    if (!schema) return null;
    
    // 先尝试作为英文字段查找
    if (schema.fields[field]) {
      return schema.fields[field];
    }
    
    // 再尝试作为中文字段查找
    for (const fieldDef of Object.values(schema.fields)) {
      if (fieldDef.chinese === field) {
        return fieldDef;
      }
    }
    
    return null;
  }
}

export default VariableSchemaService;
