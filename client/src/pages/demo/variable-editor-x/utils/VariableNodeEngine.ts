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
  type?: string; // 变量类型，用于v3.0格式标识符
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
    const sourceType = data.sourceType || 'custom';
    const type = data.type || sourceType; // 使用传入的type或sourceType
    
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
      value,
      type // 添加type属性
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
   * 生成v3.0格式系统标识符
   * 格式: @gv_type_id_field-=
   */
  public generateSystemIdentifier(id: string, field: string, type: string = 'custom'): string {
    // 使用v3.0格式
    return `@gv_${type}_${id}_${field}-=`;
  }

  /**
   * 生成显示标识符
   */
  public generateDisplayIdentifier(id: string, field: string, sourceName: string): string {
    const shortId = id && id !== 'unknown' ? id.substring(0, 4) : 'xxxx';
    return `@${sourceName}.${field}#${shortId}`;
  }
  
  /**
   * 从v3.0格式标识符解析变量节点信息
   * 格式: @gv_type_id_field-=
   */
  public parseIdentifier(identifier: string): Partial<VariableNodeAttributes> | null {
    // 匹配v3.0格式
    const match = /^@gv_([a-zA-Z0-9]+)_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)-=$/.exec(identifier);
    if (match) {
      return {
        type: match[1],
        id: match[2],
        field: match[3]
      };
    }
    
    return null;
  }
  
  /**
   * 生成HTML表示
   */
  public generateHtml(attrs: VariableNodeAttributes): string {
    // 使用v3.0格式生成标识符
    const type = attrs.type || attrs.sourceType;
    const systemIdentifier = this.generateSystemIdentifier(attrs.id, attrs.field, type);
    
    // 确保有效的显示标识符
    const displayIdentifier = attrs.displayIdentifier || 
                              this.generateDisplayIdentifier(attrs.id, attrs.field, attrs.sourceName);
    
    // 构建符合v3.0标准的ID
    const v3Id = `${attrs.sourceType}_${attrs.id}_${attrs.field}`;
    console.log('[v3.0] 生成变量HTML, 使用v3.0格式ID:', v3Id);
    
    // 获取主题颜色
    const colors = VariableThemeService.getTypeColor(attrs.sourceType);
    
    // 生成HTML
    return `<span 
      data-variable="" 
      data-id="${v3Id}" 
      data-field="${attrs.field}" 
      data-source-name="${attrs.sourceName}" 
      data-identifier="${systemIdentifier}" 
      data-type="${attrs.sourceType}"
      data-value="${attrs.value || ''}" 
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
    
    try {
      // 直接提取属性
      const rawId = element.getAttribute('data-id');
      const rawField = element.getAttribute('data-field');
      const rawSourceName = element.getAttribute('data-source-name');
      const rawSourceType = element.getAttribute('data-type');
      const rawDisplayId = element.getAttribute('data-display-identifier');
      const rawValue = element.getAttribute('data-value');
      
      console.log('[v3.0] 从DOM提取属性，原始ID:', rawId);
      
      // 处理v3.0格式ID (type_entityId_field)
      let entityId = rawId || 'unknown';
      let field = rawField;
      let sourceType = rawSourceType;
      
      // 检查是否为v3.0格式复合ID
      if (rawId && rawId.includes('_')) {
        const idParts = rawId.split('_');
        if (idParts.length >= 3) {
          // 假设格式为 {type}_{entityId}_{field}
          sourceType = idParts[0];
          // 对于entityId，可能包含下划线，需要重建中间部分
          entityId = idParts.slice(1, -1).join('_');
          field = idParts[idParts.length - 1];
          
          console.log('[v3.0] 解析v3.0格式ID:', {
            sourceType,
            entityId,
            field
          });
        }
      }
      
      // 过滤掉undefined属性，仅保留存在的属性
      const attrs: Record<string, any> = {};
      attrs.id = entityId;
      attrs.field = field || 'unknown';
      attrs.sourceName = rawSourceName || 'Unknown';
      attrs.sourceType = sourceType || 'custom';
      if (rawDisplayId !== null) attrs.displayIdentifier = rawDisplayId;
      if (rawValue !== null) attrs.value = rawValue;
      
      // 提取标识符，尝试获取type
      const identifier = element.getAttribute('data-identifier');
      if (identifier) {
        const parsed = this.parseIdentifier(identifier);
        if (parsed && parsed.type) {
          attrs.type = parsed.type;
        }
      }
      
      // 最后使用createNodeAttributes进行规范化
      return this.createNodeAttributes(attrs);
    } catch (error) {
      console.error('提取DOM属性出错:', error);
      
      // 返回一个基本变量节点
      return this.createNodeAttributes({
        id: 'unknown',
        field: 'unknown',
        sourceName: 'Unknown',
        sourceType: 'custom'
      });
    }
  }
  
  /**
   * 创建变量数据对象
   */
  public createVariableData(attrs: VariableNodeAttributes): VariableData {
    // 如果有type属性，使用它更新sourceType
    const sourceType = attrs.type || attrs.sourceType;
    
    return new VariableDataImpl({
      id: attrs.id,
      field: attrs.field,
      sourceName: attrs.sourceName,
      sourceType: sourceType, // 使用决定的sourceType
      value: attrs.value,
      displayIdentifier: attrs.displayIdentifier
    });
  }
  
  /**
   * 修复DOM元素，确保所有属性和样式正确
   */
  public repairDOMElement(element: HTMLElement, attrs: VariableNodeAttributes): void {
    // 生成v3.0格式标识符
    const type = attrs.type || attrs.sourceType;
    const systemIdentifier = this.generateSystemIdentifier(attrs.id, attrs.field, type);
    
    // 显示标识符
    const displayIdentifier = attrs.displayIdentifier || 
                             this.generateDisplayIdentifier(attrs.id, attrs.field, attrs.sourceName);
    
    // 构建符合v3.0标准的ID
    const v3Id = `${attrs.sourceType}_${attrs.id}_${attrs.field}`;
    console.log('[v3.0] 修复DOM元素, 使用v3.0格式ID:', v3Id);
    
    // 设置属性
    element.setAttribute('data-id', v3Id);
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
    
    // 检查DOM中的id是否使用v3.0格式
    if (domId && domId.includes('_')) {
      // v3.0格式ID: {type}_{entityId}_{field}
      const expectedV3Id = `${attrs.sourceType}_${attrs.id}_${attrs.field}`;
      return (
        domId === expectedV3Id &&
        domField === attrs.field &&
        domSourceName === attrs.sourceName &&
        domSourceType === attrs.sourceType
      );
    }
    
    // 向后兼容：支持旧格式ID（仅使用entityId）
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
