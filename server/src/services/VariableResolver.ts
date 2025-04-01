import { VariableServiceAdapter } from "./adapters/VariableServiceAdapter";

/**
 * 变量解析器
 * 用于解析文本中的变量引用 (格式: @source.field 或 @gv_UUID_field)
 */
export class VariableResolver {
  private variableAdapter: VariableServiceAdapter;
  
  constructor(variableAdapter: VariableServiceAdapter) {
    this.variableAdapter = variableAdapter;
  }
  
  /**
   * 解析文本中的变量引用
   * @param text 包含变量引用的文本
   * @param maxDepth 最大递归深度，防止循环引用
   * @returns 替换变量后的文本
   */
  async resolveText(text: string, maxDepth: number = 5): Promise<string> {
    if (!text || typeof text !== 'string') {
      return text;
    }
    
    if (maxDepth <= 0) {
      throw new Error('变量解析达到最大深度，可能存在循环引用');
    }
    
    // 解析系统标识符格式（新格式）
    let resolvedText = await this.resolveSystemIdentifiers(text);
    
    // 解析显示标识符格式（为了向后兼容）
    resolvedText = await this.resolveDisplayIdentifiers(resolvedText, maxDepth);
    
    return resolvedText;
  }
  
  /**
   * 解析系统标识符格式 
   * 支持v3.0: @gv_{type}_{entityId}_{field}-=
   * 支持v2.x: @gv_UUID_field
   */
  private async resolveSystemIdentifiers(text: string): Promise<string> {
    // 匹配v3.0系统标识符 @gv_{type}_{entityId}_{field}-=
    const v3Pattern = /@gv_([a-zA-Z0-9_-]+)_([a-zA-Z0-9\-]+)_([a-zA-Z0-9_-]+)-=/g;
    
    // 匹配v2.x系统标识符 @gv_UUID_field
    const v2Pattern = /@gv_([a-zA-Z0-9\-]+)_([a-zA-Z0-9_]+)\b/g;
    
    // 查找并替换所有v3.0系统标识符
    let resolvedText = text;
    
    // 处理v3.0格式标识符
    const v3Matches = Array.from(text.matchAll(v3Pattern));
    for (const match of v3Matches) {
      const [fullMatch, type, entityId, field] = match;
      
      try {
        console.log(`[v3.0] 解析v3.0系统标识符: ${fullMatch}, 类型=${type}, 实体ID=${entityId}, 字段=${field}`);
        
        // 根据类型、实体ID和字段获取变量值
        let value;
        
        // 目前支持的类型：npc, workflow, task, custom等
        // 这里我们使用通用的变量解析方法，让适配器根据类型和ID决定如何获取
        value = await this.variableAdapter.getVariableValueByTypeAndId(type, entityId, field);
        
        if (value !== undefined) {
          // 替换系统标识符为实际值
          resolvedText = resolvedText.replace(fullMatch, this.convertValueToString(value));
          console.log(`[v3.0] 成功解析变量: ${fullMatch} => ${this.convertValueToString(value)}`);
        } else {
          console.warn(`[v3.0] 变量值未找到: ${fullMatch}`);
        }
      } catch (error) {
        console.error(`[v3.0] 解析v3.0系统标识符 ${fullMatch} 失败:`, error);
        // 保留原变量引用，不替换
      }
    }
    
    // 处理v2.x格式标识符
    const v2Matches = Array.from(resolvedText.matchAll(v2Pattern));
    for (const match of v2Matches) {
      const [fullMatch, uuid, field] = match;
      
      try {
        // 通过UUID直接获取变量值
        const value = await this.variableAdapter.getVariableValueByUUID(uuid, field);
        
        if (value !== undefined) {
          // 替换系统标识符为实际值
          resolvedText = resolvedText.replace(fullMatch, this.convertValueToString(value));
        }
      } catch (error) {
        console.error(`解析v2.x系统标识符 ${fullMatch} 失败:`, error);
        // 保留原变量引用，不替换
      }
    }
    
    return resolvedText;
  }
  
  /**
   * 解析显示标识符格式 @来源.字段 或 @来源.字段#ID
   * 主要用于向后兼容
   */
  private async resolveDisplayIdentifiers(text: string, maxDepth: number): Promise<string> {
    // 匹配显示标识符
    const displayIdPattern = /@([^.]+)\.([^\s.,;:!?()[\]{}'"#]+)(?:#([a-zA-Z0-9]+))?/g;
    
    // 查找所有显示标识符
    const matches = Array.from(text.matchAll(displayIdPattern));
    if (matches.length === 0) {
      return text; // 没有显示标识符，直接返回原文本
    }
    
    // 替换所有显示标识符
    let resolvedText = text;
    
    for (const match of matches) {
      const [fullMatch, source, field, shortId] = match;
      
      try {
        // 根据情况选择查询方法
        let value;
        if (shortId) {
          // 优先通过短ID查询
          value = await this.variableAdapter.getVariableValueByShortId(shortId, field);
        } else {
          // 通过源名称和字段查询
          value = await this.variableAdapter.getVariableValue(source, field);
        }
        
        if (value !== undefined) {
          // 替换显示标识符为实际值
          resolvedText = resolvedText.replace(fullMatch, this.convertValueToString(value));
        }
      } catch (error) {
        console.error(`解析显示标识符 ${fullMatch} 失败:`, error);
        // 保留原变量引用，不替换
      }
    }
    
    // 递归解析，处理嵌套变量
    // 如果文本中仍包含变量引用，则继续解析
    if (displayIdPattern.test(resolvedText) && maxDepth > 1) {
      return await this.resolveDisplayIdentifiers(resolvedText, maxDepth - 1);
    }
    
    return resolvedText;
  }
  
  /**
   * 将变量值转换为字符串
   * @param value 变量值
   * @returns 字符串表示
   */
  private convertValueToString(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (error) {
        return '[复杂对象]';
      }
    }
    
    return String(value);
  }
  
  /**
   * 解析对象中的所有变量引用
   * @param obj 包含变量引用的对象
   * @param maxDepth 最大递归深度
   * @returns 替换变量后的对象
   */
  async resolveObject(obj: any, maxDepth: number = 5): Promise<any> {
    if (!obj || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return await this.resolveText(obj, maxDepth);
      }
      return obj;
    }
    
    if (maxDepth <= 0) {
      throw new Error('变量解析达到最大深度，可能存在循环引用');
    }
    
    // 数组处理
    if (Array.isArray(obj)) {
      const result = [];
      for (const item of obj) {
        result.push(await this.resolveObject(item, maxDepth - 1));
      }
      return result;
    }
    
    // 对象处理
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        result[key] = await this.resolveText(value, maxDepth - 1);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = await this.resolveObject(value, maxDepth - 1);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  /**
   * 检测文本中是否包含变量引用
   * @param text 待检测文本
   * @returns 是否包含变量引用
   */
  containsVariableReferences(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    // 检查显示标识符格式
    const displayPattern = /@([^.]+)\.([^\s.,;:!?()[\]{}'"#]+)(?:#([a-zA-Z0-9]+))?/;
    
    // 检查v3.0系统标识符格式
    const v3Pattern = /@gv_([a-zA-Z0-9_-]+)_([a-zA-Z0-9\-]+)_([a-zA-Z0-9_-]+)-=/;
    
    // 检查v2.x系统标识符格式
    const v2Pattern = /@gv_([a-zA-Z0-9\-]+)_([a-zA-Z0-9_]+)\b/;
    
    return displayPattern.test(text) || v3Pattern.test(text) || v2Pattern.test(text);
  }
}
