import { Variable, VariableType } from '../models/Variable';
import { AppDataSource } from '../database';
import { VariableEventPublisher, VariableEventType } from './VariableEventPublisher';

/**
 * 标识符格式化服务
 * 负责生成和解析变量标识符的格式
 */
export class IdentifierFormatterService {
  private static instance: IdentifierFormatterService;
  
  /**
   * 获取单例实例
   */
  public static getInstance(): IdentifierFormatterService {
    if (!IdentifierFormatterService.instance) {
      IdentifierFormatterService.instance = new IdentifierFormatterService();
    }
    return IdentifierFormatterService.instance;
  }
  
  /**
   * 根据源类型、源名称、字段和源ID生成新格式的全局变量标识符
   * 此方法基于formatDatabaseId生成，确保标识符与数据库ID一致
   * @param sourceType 源类型
   * @param sourceName 源名称
   * @param field 字段名
   * @param sourceId 源ID (必需)
   * @returns 格式化的标识符，格式： @gv_{type}_{entityId}_{field}-=
   */
  public formatIdentifier(sourceType: string, sourceName: string, field: string, sourceId: string): string {
    // 确保提供了sourceId
    if (!sourceId) {
      throw new Error('sourceId是必需的参数，不能为空');
    }
    
    // 首先获取标准的数据库ID
    const dbId = this.formatDatabaseId(sourceType, sourceId, field);
    
    // 基于数据库ID构造系统标识符
    const identifier = `@gv_${dbId}-=`;
    
    console.log(`[IdentifierFormatterService] 生成系统标识符: ${identifier} (基于dbId: ${dbId})`);
    return identifier;
  }
  
  /**
   * 从系统标识符中提取数据库ID
   * @param identifier 系统标识符，格式：@gv_{type}_{entityId}_{field}-=
   * @returns 提取的数据库ID
   */
  public extractDatabaseIdFromIdentifier(identifier: string): string {
    // 检查是否是v3.0格式的全局变量标识符
    const v3FormatRegex = /^@gv_(.+)-=$/;
    const v3Match = identifier.match(v3FormatRegex);
    
    if (!v3Match) {
      throw new Error(`无效的系统标识符格式: ${identifier}`);
    }
    
    // 提取并返回数据库ID部分
    return v3Match[1];
  }
  
  /**
   * 根据源类型、源名称、字段和源ID生成用于显示的标识符
   * 此方法生成的标识符只用于UI显示，不作为系统内标识符使用
   * @param sourceType 源类型
   * @param sourceName 源名称
   * @param field 字段名
   * @param sourceId 源ID (必需)
   * @returns 用于显示的格式化标识符
   */
  public formatDisplayIdentifier(sourceType: string, sourceName: string, field: string, sourceId: string): string {
    // 确保没有非法字符
    const sanitizedSourceName = this.sanitizeName(sourceName);
    
    // 确保提供了sourceId
    if (!sourceId) {
      throw new Error('sourceId是必需的参数，不能为空');
    }
    
    // 获取短标识符（4位）:
    // - 对于时间戳（纯数字），取后4位
    // - 对于其他ID，取前4位
    let shortId;
    if (/^\d+$/.test(sourceId)) {
      // 对于数字ID（通常是时间戳），取后4位
      shortId = sourceId.substring(Math.max(0, sourceId.length - 4));
    } else {
      // 对于其他ID，取前4位
      shortId = sourceId.substring(0, 4);
    }
    
    // 创建带ID的标准显示格式标识符
    return `@${sanitizedSourceName}.${field}#${shortId}`;
  }
  
  /**
   * 生成变量的数据库ID - 系统核心方法
   * 变量ID是系统的基础，格式为: type_entityId_fieldname
   * 系统标识符和显示标识符都基于此ID生成
   * @param sourceType 源类型，如'npc', 'task', 'custom'等
   * @param sourceId 源ID，通常是UUID或时间戳
   * @param field 字段名，描述变量的具体属性
   * @returns 格式化的数据库ID
   */
  public formatDatabaseId(sourceType: string, sourceId: string, field: string): string {
    // 验证参数
    if (!sourceType) {
      throw new Error('sourceType是必需的参数，不能为空');
    }
    
    if (!sourceId) {
      throw new Error('sourceId是必需的参数，不能为空');
    }
    
    if (!field) {
      throw new Error('field是必需的参数，不能为空');
    }
    
    // 标准化参数
    const normalizedType = sourceType.toLowerCase().trim();
    let normalizedField = field.trim();
    
    // 检查并清除字段名中可能存在的结束标记
    if (normalizedField.endsWith('-=')) {
      console.warn(`Field "${field}" contains end marker "-=", removing it`);
      normalizedField = normalizedField.substring(0, normalizedField.length - 2);
    }
    
    // 生成并返回数据库ID
    const dbId = `${normalizedType}_${sourceId}_${normalizedField}`;
    
    console.log(`[IdentifierFormatterService] 生成数据库ID: ${dbId}`);
    return dbId;
  }
  
  /**
   * 从数据库ID解析出组成部分
   * @param dbId 数据库ID字符串
   * @returns 解析后的组成部分
   */
  public parseDatabaseId(dbId: string): { 
    sourceType: string, 
    sourceId: string, 
    field: string 
  } {
    // 使用正则表达式解析ID
    const pattern = /^([a-zA-Z0-9]+)_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)$/;
    const match = dbId.match(pattern);
    
    if (!match) {
      throw new Error(`无效的数据库ID格式: ${dbId}`);
    }
    
    return {
      sourceType: match[1],
      sourceId: match[2],
      field: match[3]
    };
  }

  /**
   * 解析标识符获取组成部分
   * 首先尝试使用更高效的提取和解析方法，如果失败则回退到常规解析
   * @param identifier 标识符
   * @returns 解析后的标识符组成部分
   */
  public parseIdentifier(identifier: string): { 
    sourceType: string | null, 
    sourceName: string, 
    field: string,
    sourceId: string | null 
  } {
    // 默认值
    const result = {
      sourceType: null as string | null,
      sourceName: '',
      field: '',
      sourceId: null as string | null
    };
    
    // 检查是否是v3.0格式的全局变量标识符 @gv_{type}_{entityId}_{field}-=
    if (identifier.startsWith('@gv_') && identifier.endsWith('-=')) {
      try {
        // 提取数据库ID
        const dbId = this.extractDatabaseIdFromIdentifier(identifier);
        
        // 解析数据库ID
        const parsedDbId = this.parseDatabaseId(dbId);
        
        // 设置结果
        result.sourceType = parsedDbId.sourceType;
        result.sourceId = parsedDbId.sourceId;
        result.field = parsedDbId.field;
        
        console.log(`[IdentifierFormatterService] 解析v3.0标识符 ${identifier} -> type=${result.sourceType}, entityId=${result.sourceId}, field=${result.field}`);
        
        return result;
      } catch (error) {
        // 如果解析失败，继续尝试其他格式
        console.warn(`[IdentifierFormatterService] 无法以v3.0格式解析标识符 ${identifier}, 尝试其他格式...`);
      }
    }
    
    // 兼容v2.x格式的全局变量标识符 @gv_UUID_field
    const v2FormatRegex = /^@gv_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)$/;
    const v2FormatMatch = identifier.match(v2FormatRegex);
    
    if (v2FormatMatch) {
      // 如果是v2.x格式，设置sourceId和field
      result.sourceId = v2FormatMatch[1];
      result.field = v2FormatMatch[2];
      return result;
    }
    
    // 兼容旧格式的全局变量标识符 @gv_UUID（无字段）
    const oldFormatRegex = /^@gv_([a-zA-Z0-9-]+)$/;
    const oldFormatMatch = identifier.match(oldFormatRegex);
    
    if (oldFormatMatch) {
      // 如果是旧格式，只设置sourceId
      result.sourceId = oldFormatMatch[1];
      return result;
    }
    
    // 如果不是新格式，尝试解析为旧格式
    // @源名称.字段 或 @源名称.字段#源ID
    const legacyRegex = /^@([^.]+)\.([^#]+)(?:#([a-zA-Z0-9-]+))?$/;
    const legacyMatch = identifier.match(legacyRegex);
    
    if (!legacyMatch) {
      throw new Error(`Invalid identifier format: ${identifier}`);
    }
    
    result.sourceName = legacyMatch[1];
    result.field = legacyMatch[2].trim(); // 去除可能的空格
    result.sourceId = legacyMatch[3] || null; // 可能不存在ID部分
    
    return result;
  }
  
  /**
   * 批量更新标识符（当源对象重命名时使用）
   * 注意：在新的全局变量体系下，变量标识符不会随着源对象的重命名而改变
   * 但仍需更新变量的源对象名称，以便在UI上正确显示
   * @param oldSourceName 旧源名称
   * @param newSourceName 新源名称
   * @param sourceType 源类型
   */
  public async updateIdentifiers(oldSourceName: string, newSourceName: string, sourceType: string): Promise<void> {
    try {
      // 获取变量仓库
      const variableRepo = AppDataSource.getRepository(Variable);
      
      // 查找所有使用旧源名称的变量
      const variables = await variableRepo.find({
        where: {
          source: {
            type: sourceType,
            name: oldSourceName
          }
        }
      });
      
      // 尝试使用entityId查找变量
      if (variables.length === 0) {
        console.log(`未找到名称为 ${oldSourceName} 的变量, 尝试使用其他查询方式...`);
      } else {
        console.log(`使用源名称找到 ${variables.length} 个变量`);
      }
      
      // 没有找到需要更新的变量
      if (variables.length === 0) {
        console.log(`No variables found for source ${oldSourceName} of type ${sourceType}`);
        return;
      }
      
      // 更新每个变量的来源名称，但保持标识符不变
      const updatedVariables: Variable[] = [];
      
      for (const variable of variables) {
        // 更新源名称
        variable.source.name = newSourceName;
        
        // 在新版本中，标识符不再随源名称变化而变化
        // 但我们可以更新变量的其他信息（如名称）来反映这种变化
        const nameWithSourceName = variable.name.replace(oldSourceName, newSourceName);
        if (nameWithSourceName !== variable.name) {
          variable.name = nameWithSourceName;
        }
        
        // 更新变量
        await variableRepo.save(variable);
        updatedVariables.push(variable);
      }
      
      // 发布源重命名事件
      const eventPublisher = VariableEventPublisher.getInstance();
      eventPublisher.publish(VariableEventType.SOURCE_RENAMED, {
        oldSourceName,
        newSourceName,
        sourceType,
        variables: updatedVariables
      });
      
      console.log(`Updated ${updatedVariables.length} variables for renamed source ${oldSourceName} -> ${newSourceName}`);
    } catch (error) {
      console.error(`Error updating identifiers for ${oldSourceName} -> ${newSourceName}:`, error);
      throw error;
    }
  }
  
  /**
   * 校验名称，去除不合法字符
   * @param name 原始名称
   * @returns 净化后的名称
   */
  private sanitizeName(name: string): string {
    // 移除不允许在标识符中使用的字符，保留字母、数字、汉字和下划线
    return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_]/g, '_');
  }
}
