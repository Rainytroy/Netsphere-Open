import VariableSchemaService from './VariableSchemaService';

/**
 * 变量标识符格式化服务
 * 提供统一的标识符生成逻辑，确保全系统格式一致性
 */
export class IdentifierFormatterService {
  /**
   * 生成系统标识符
   * 格式: @gv_{UUID}_{field}
   * @param id 变量ID (UUID)
   * @param field 字段名
   * @returns 系统标识符
   */
  static formatIdentifier(id: string, field: string): string {
    return `@gv_${id}_${field}`;
  }

  /**
   * 生成显示标识符
   * 格式: @{sourceName}.{field}#{shortId}
   * @param sourceName 源对象名称
   * @param field 字段名(用原始英文字段名，如knowledge而非知识背景)
   * @param id UUID
   * @returns 显示标识符
   */
  static formatDisplayIdentifier(sourceName: string, field: string, id: string): string {
    const shortId = id.substring(0, 4);
    return `@${sourceName}.${field}#${shortId}`;
  }

  /**
   * 从系统标识符中解析组成部分
   * @param identifier 系统标识符
   * @returns 解析后的组成部分，解析失败返回null
   */
  static parseIdentifier(identifier: string): { id: string; field: string } | null {
    const identifierWithoutPrefix = identifier.startsWith('@') ? identifier.substring(1) : identifier;
    
    // 尝试匹配标准格式: gv_UUID_field
    const standardMatch = identifierWithoutPrefix.match(/^gv_([^_]+)_([^_]+)$/);
    if (standardMatch) {
      return {
        id: standardMatch[1],
        field: standardMatch[2]
      };
    }
    
    // 尝试匹配非标准格式: gv_type_UUID_field 或 gv_UUID_field_fieldLocalized
    const nonStandardMatch = identifierWithoutPrefix.match(/^gv_(?:(?:npc|task|workflow|custom|file|system)_)?([^_]+)(?:_[^_]+)?_([^_]+)$/);
    if (nonStandardMatch) {
      return {
        id: nonStandardMatch[1],
        field: nonStandardMatch[2]
      };
    }
    
    // 尝试匹配最宽泛的格式：找到第一个gv_后的部分作为id，最后一个_后的部分作为field
    if (identifierWithoutPrefix.startsWith('gv_')) {
      const parts = identifierWithoutPrefix.split('_');
      if (parts.length >= 3) {
        // 去掉gv_前缀
        parts.shift();
        
        // 最后一个部分作为field
        const field = parts.pop() || '';
        
        // 剩余部分作为id，处理可能包含的type前缀
        let id = parts.join('_');
        const typePrefixes = ['npc', 'task', 'workflow', 'custom', 'file', 'system'];
        if (typePrefixes.includes(parts[0])) {
          // 如果第一部分是类型前缀，则移除
          id = parts.slice(1).join('_');
        }
        
        return { id, field };
      }
    }
    
    // 无法解析
    return null;
  }

  /**
   * 从显示标识符中解析组成部分
   * @param displayIdentifier 显示标识符
   * @returns 解析后的组成部分，解析失败返回null
   */
  static parseDisplayIdentifier(displayIdentifier: string): { sourceName: string; field: string; shortId: string } | null {
    if (!displayIdentifier) return null;
    
    const displayWithoutPrefix = displayIdentifier.startsWith('@') ? displayIdentifier.substring(1) : displayIdentifier;
    
    // 匹配标准格式: sourceName.field#shortId
    const match = displayWithoutPrefix.match(/^([^.]+)\.([^#]+)#(.+)$/);
    if (!match) {
      // 尝试其他可能的格式，例如只有shortId的情况
      const simplifiedMatch = displayWithoutPrefix.match(/^([^#]+)#(.+)$/);
      if (simplifiedMatch) {
        return {
          sourceName: 'Unknown', // 无法确定来源名称
          field: simplifiedMatch[1],
          shortId: simplifiedMatch[2]
        };
      }
      return null;
    }
    
    return {
      sourceName: match[1],
      field: match[2],
      shortId: match[3]
    };
  }

  /**
   * 规范化字段名
   * 确保字段名使用标准英文格式
   * @param field 原始字段名
   * @param sourceType 源类型
   * @returns 规范化的字段名
   */
  static normalizeFieldName(field: string, sourceType: string): string {
    // 使用统一的字段映射服务
    return VariableSchemaService.normalizeFieldName(field, sourceType);
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
    // 使用统一的类型映射服务
    return VariableSchemaService.normalizeSourceType(sourceType, field);
  }
}

export default IdentifierFormatterService;
