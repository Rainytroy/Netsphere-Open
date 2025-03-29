/**
 * 变量节点引擎
 * 负责变量节点的创建、验证、转换和一致性保障
 */

import { VariableData, VariableDataImpl } from '../types';
import VariableThemeService from '../../../../services/VariableThemeService';

// 变量节点验证结果
export interface VariableNodeValidationResult {
  isValid: boolean;
  errors: string[];
}

// 变量节点属性
export interface VariableNodeAttributes {
  id: string;
  field: string;
  sourceName: string;
  sourceType: string;
  value?: string;
  displayIdentifier?: string;
}

/**
 * 变量节点引擎 - 单例模式
 * 提供全套变量节点操作和管理功能
 */
export class VariableNodeEngine {
  private static instance: VariableNodeEngine;

  private constructor() {
    // 私有构造函数，确保单例模式
  }

  public static getInstance(): VariableNodeEngine {
    if (!VariableNodeEngine.instance) {
      VariableNodeEngine.instance = new VariableNodeEngine();
    }
    return VariableNodeEngine.instance;
  }

  /**
   * 创建一致性的变量节点属性
   * 确保所有必要属性存在，生成缺失的属性
   */
  public createNodeAttributes(data: Partial<VariableNodeAttributes>): VariableNodeAttributes {
    // 确保基础属性存在
    const id = data.id || 'unknown';
    const field = data.field || 'unknown';
    const sourceName = data.sourceName || 'Unknown';
    const sourceType = data.sourceType || 'system';
    
    // 生成显示标识符（如果不存在）
    let displayIdentifier = data.displayIdentifier;
    if (!displayIdentifier && id !== 'unknown') {
      const shortId = id.substring(0, 4);
      displayIdentifier = `@${sourceName}.${field}#${shortId}`;
    }
    
    // 确保value值被保存
    const value = data.value !== undefined ? data.value : undefined;
    
    // 构建完整的属性集
    const attributes: VariableNodeAttributes = {
      id,
      field,
      sourceName,
      sourceType,
      displayIdentifier,
      value
    };
    
    return attributes;
  }
  
  /**
   * 验证变量节点属性的完整性
   */
  public validateNodeAttributes(attrs: Partial<VariableNodeAttributes>): VariableNodeValidationResult {
    const errors: string[] = [];
    
    // 检查必要属性
    if (!attrs.id || attrs.id === 'unknown') {
      errors.push('缺少有效的ID');
    }
    
    if (!attrs.field || attrs.field === 'unknown') {
      errors.push('缺少有效的字段名');
    }
    
    if (!attrs.sourceName || attrs.sourceName === 'Unknown') {
      errors.push('缺少有效的来源名称');
    }
    
    // 验证结果
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * 生成系统标识符
   */
  public generateSystemIdentifier(id: string, field: string): string {
    return `@gv_${id}_${field}`;
  }

  /**
   * 生成显示标识符
   */
  public generateDisplayIdentifier(id: string, field: string, sourceName: string): string {
    const shortId = id && id !== 'unknown' ? id.substring(0, 4) : 'xxxx';
    return `@${sourceName}.${field}#${shortId}`;
  }
  
  /**
   * 从标识符解析变量节点信息
   */
  public parseIdentifier(identifier: string): Partial<VariableNodeAttributes> | null {
    const match = /^@gv_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)$/.exec(identifier);
    if (!match) return null;
    
    return {
      id: match[1],
      field: match[2]
    };
  }
  
  /**
   * 生成HTML表示
   */
  public generateHtml(attrs: VariableNodeAttributes): string {
    // 确保有效的系统标识符
    const systemIdentifier = this.generateSystemIdentifier(attrs.id, attrs.field);
    
    // 确保有效的显示标识符
    const displayIdentifier = attrs.displayIdentifier || 
                              this.generateDisplayIdentifier(attrs.id, attrs.field, attrs.sourceName);
    
    // 获取主题颜色
    const colors = VariableThemeService.getTypeColor(attrs.sourceType);
    
    // 生成HTML
    return `<span 
      data-variable="" 
      data-id="${attrs.id}" 
      data-field="${attrs.field}" 
      data-source-name="${attrs.sourceName}" 
      data-identifier="${systemIdentifier}" 
      data-type="${attrs.sourceType}" 
      data-display-identifier="${displayIdentifier}"
      class="variable-tag variable-type-${attrs.sourceType}" 
      contenteditable="false"
      style="
        background-color: ${colors.bgColor};
        border: 1px solid ${colors.borderColor};
        border-radius: 4px;
        padding: 2px 8px;
        color: ${colors.textColor};
        cursor: default;
        position: relative;
        display: inline-flex;
        align-items: center;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.5;
        white-space: nowrap;
        margin: 0 4px 0 0;
        transition: all 0.3s;
      "
    >${displayIdentifier}</span>`;
  }
  
  /**
   * 从DOM提取变量属性
   * 处理DOM元素中的data-前缀属性，返回规范化的变量节点属性
   */
  public extractFromDOM(element: HTMLElement): VariableNodeAttributes {
    if (!element) {
      throw new Error('无法从null或undefined元素提取变量属性');
    }
    
    const timestamp = new Date().toISOString();
    console.log(`[VariableNodeEngine.extractFromDOM:${timestamp}] 开始从DOM元素提取属性`);
    
    try {
      // 直接提取属性，保留原始值而不进行规范化或默认值替换
      // 这是一个关键变化：只提取值，不做规范化，避免提前转换
      const rawId = element.getAttribute('data-id');
      const rawField = element.getAttribute('data-field');
      const rawSourceName = element.getAttribute('data-source-name');
      const rawSourceType = element.getAttribute('data-type');
      const rawDisplayId = element.getAttribute('data-display-identifier');
      
      console.log(`[VariableNodeEngine.extractFromDOM:${timestamp}] 提取的原始属性:`, {
        id: rawId,
        field: rawField,
        sourceName: rawSourceName,
        sourceType: rawSourceType,
        displayIdentifier: rawDisplayId
      });
      
      // 过滤掉undefined属性，仅保留存在的属性
      const attrs: Record<string, any> = {};
      if (rawId !== null) attrs.id = rawId;
      if (rawField !== null) attrs.field = rawField;
      if (rawSourceName !== null) attrs.sourceName = rawSourceName;
      if (rawSourceType !== null) attrs.sourceType = rawSourceType;
      if (rawDisplayId !== null) attrs.displayIdentifier = rawDisplayId;
      
      // 验证是否至少有基本属性
      if (!attrs.id && !attrs.field && !attrs.sourceName && !attrs.sourceType) {
        console.warn(`[VariableNodeEngine.extractFromDOM:${timestamp}] 元素缺少必要的变量属性`);
        
        // 尝试从元素内容推断信息
        const content = element.textContent || '';
        const displayIdMatch = content.match(/@([^.]+)\.([^#]+)#([\w]+)/);
        
        if (displayIdMatch) {
          console.log(`[VariableNodeEngine.extractFromDOM:${timestamp}] 从内容提取显示标识符:`, displayIdMatch[0]);
          attrs.sourceName = displayIdMatch[1] || attrs.sourceName;
          attrs.field = displayIdMatch[2] || attrs.field;
          // 不从显示标识符推断ID，因为这是短ID
          attrs.displayIdentifier = displayIdMatch[0];
        }
      }
      
      // 最后使用createNodeAttributes进行规范化
      return this.createNodeAttributes(attrs);
    } catch (error) {
      console.error(`[VariableNodeEngine.extractFromDOM:${timestamp}] 提取属性出错:`, error);
      
      // 返回一个基本变量节点，确保不会中断流程
      return this.createNodeAttributes({
        id: 'unknown',
        field: 'unknown',
        sourceName: 'Unknown',
        sourceType: 'system'
      });
    }
  }
  
  /**
   * 创建变量数据对象
   */
  public createVariableData(attrs: VariableNodeAttributes): VariableData {
    return new VariableDataImpl({
      id: attrs.id,
      field: attrs.field,
      sourceName: attrs.sourceName,
      sourceType: attrs.sourceType,
      value: attrs.value,
      displayIdentifier: attrs.displayIdentifier
    });
  }
  
  /**
   * 修复DOM元素，确保所有属性和样式正确
   */
  public repairDOMElement(element: HTMLElement, attrs: VariableNodeAttributes): void {
    // 系统标识符
    const systemIdentifier = this.generateSystemIdentifier(attrs.id, attrs.field);
    
    // 显示标识符
    const displayIdentifier = attrs.displayIdentifier || 
                             this.generateDisplayIdentifier(attrs.id, attrs.field, attrs.sourceName);
    
    // 设置属性
    element.setAttribute('data-id', attrs.id);
    element.setAttribute('data-field', attrs.field);
    element.setAttribute('data-source-name', attrs.sourceName);
    element.setAttribute('data-type', attrs.sourceType);
    element.setAttribute('data-identifier', systemIdentifier);
    element.setAttribute('data-display-identifier', displayIdentifier);
    element.setAttribute('data-variable', '');
    element.setAttribute('contenteditable', 'false');
    element.className = `variable-tag variable-type-${attrs.sourceType}`;
    
    // 设置内容
    element.textContent = displayIdentifier;
    
    // 设置样式
    const colors = VariableThemeService.getTypeColor(attrs.sourceType);
    element.style.backgroundColor = colors.bgColor;
    element.style.borderColor = colors.borderColor;
    element.style.color = colors.textColor;
    element.style.borderRadius = '4px';
    element.style.padding = '2px 8px';
    element.style.cursor = 'default';
    element.style.position = 'relative';
    element.style.display = 'inline-flex';
    element.style.alignItems = 'center';
    element.style.fontSize = '12px';
    element.style.fontWeight = '500';
    element.style.lineHeight = '1.5';
    element.style.whiteSpace = 'nowrap';
    element.style.margin = '0 4px 0 0';
    element.style.transition = 'all 0.3s';
  }
  
  /**
   * 比较变量节点属性和DOM元素，检查一致性
   */
  public checkConsistency(element: HTMLElement, attrs: VariableNodeAttributes): boolean {
    if (!element || !attrs) return false;
    
    const domId = element.getAttribute('data-id');
    const domField = element.getAttribute('data-field');
    const domSourceName = element.getAttribute('data-source-name');
    const domSourceType = element.getAttribute('data-type');
    
    return (
      domId === attrs.id &&
      domField === attrs.field &&
      domSourceName === attrs.sourceName &&
      domSourceType === attrs.sourceType
    );
  }
}

// 导出单例实例
export const variableNodeEngine = VariableNodeEngine.getInstance();
