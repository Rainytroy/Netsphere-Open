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
   * @param sourceType 源类型
   * @param sourceName 源名称
   * @param field 字段名
   * @param sourceId 源ID (必需)
   * @returns 格式化的标识符
   */
  public formatIdentifier(sourceType: string, sourceName: string, field: string, sourceId: string): string {
    // 确保提供了sourceId
    if (!sourceId) {
      throw new Error('sourceId是必需的参数，不能为空');
    }
    
    // 创建新的全局变量标识符格式 @gv_UUID_field
    // 使用全局变量前缀 gv_ 加上源ID和字段名
    return `@gv_${sourceId}_${field}`;
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
   * 解析标识符获取组成部分
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
    
    // 检查是否是新格式的全局变量标识符 @gv_UUID_field
    const newFormatRegex = /^@gv_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)$/;
    const newFormatMatch = identifier.match(newFormatRegex);
    
    if (newFormatMatch) {
      // 如果是新格式，设置sourceId和field
      result.sourceId = newFormatMatch[1];
      result.field = newFormatMatch[2];
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
