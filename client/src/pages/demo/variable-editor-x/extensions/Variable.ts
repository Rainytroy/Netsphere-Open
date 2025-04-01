import { Node, mergeAttributes } from '@tiptap/core';
import VariableThemeService from '../../../../services/VariableThemeService';
import { variableNodeEngine } from '../utils/VariableNodeEngine';

/**
 * 变量节点扩展 (重构版)
 * 为TipTap编辑器提供变量标签节点支持
 * 使用VariableNodeEngine确保节点数据一致性和可靠性
 */

export interface VariableOptions {
  HTMLAttributes: Record<string, any>,
}

export const Variable = Node.create<VariableOptions>({
  name: 'variable',
  
  // 节点配置选项
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },
  
  // 节点分组和行为
  group: 'inline',
  inline: true,
  atom: true, // 设置为atom，使其作为整体处理
  
  // 节点属性 - 修复属性的渲染方法
  addAttributes() {
    const timestamp = new Date().toISOString();
    console.log(`[Variable.addAttributes:${timestamp}] 初始化属性配置`);
    
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        // 修复: 始终返回data-id属性，即使为undefined也会被后续代码处理为默认值
        renderHTML: attributes => {
          return { 'data-id': attributes.id || 'unknown' };
        },
      },
      field: {
        default: null,
        parseHTML: element => element.getAttribute('data-field'),
        renderHTML: attributes => {
          return { 'data-field': attributes.field || 'unknown' };
        },
      },
      sourceName: {
        default: null,
        parseHTML: element => element.getAttribute('data-source-name'),
        renderHTML: attributes => {
          return { 'data-source-name': attributes.sourceName || 'Unknown' };
        },
      },
      sourceType: {
        default: 'unknown',
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => {
          return { 'data-type': attributes.sourceType || 'system' };
        },
      },
      displayIdentifier: {
        default: null,
        parseHTML: element => element.getAttribute('data-display-identifier'),
        renderHTML: attributes => {
          // 生成显示标识符
          let displayId = attributes.displayIdentifier;
          if (!displayId && attributes.id && attributes.id !== 'unknown') {
            const shortId = attributes.id.substring(0, 4);
            displayId = `@${attributes.sourceName || 'Unknown'}.${attributes.field || 'unknown'}#${shortId}`;
          } else if (!displayId) {
            displayId = '@Unknown.unknown#xxxx';
          }
          return { 'data-display-identifier': displayId };
        },
      },
      // 添加新属性：value - 存储变量值
      value: {
        default: null,
        parseHTML: element => element.getAttribute('data-value'),
        renderHTML: attributes => {
          if (attributes.value !== undefined) {
            return { 'data-value': attributes.value };
          }
          return {};
        },
      },
    }
  },
  
  // HTML解析规则 - 直接从DOM提取属性，确保正确映射到TipTap节点属性
  parseHTML() {
    return [
      {
        tag: 'span[data-variable]',
        priority: 100, // 增加优先级，确保变量标签比普通span先被处理
        getAttrs: (node) => {
          // 确保node是HTMLElement
          if (!(node instanceof HTMLElement)) {
            console.warn('[Variable.parseHTML] 非HTML元素，无法解析');
            return false; // 返回false而不是空对象，明确拒绝非HTMLElement
          }
          
          const timestamp = new Date().toISOString();
          console.log(`[Variable.parseHTML:${timestamp}] 开始解析变量标签`, node);
          
          try {
            // 直接从元素属性中提取数据，避免中间转换
            const id = node.getAttribute('data-id');
            const field = node.getAttribute('data-field');
            const sourceName = node.getAttribute('data-source-name');
            const sourceType = node.getAttribute('data-type');
            const displayIdentifier = node.getAttribute('data-display-identifier');
            const value = node.getAttribute('data-value');
            
            // 记录从DOM提取的原始属性
            console.log(`[Variable.parseHTML:${timestamp}] 从DOM提取的原始属性:`, {
              id, field, sourceName, sourceType, displayIdentifier, value
            });
            
            // 构建属性对象，保留所有非null值
            const result: Record<string, any> = {};
            if (id) result.id = id;
            if (field) result.field = field;
            if (sourceName) result.sourceName = sourceName;
            if (sourceType) result.sourceType = sourceType;
            if (displayIdentifier) result.displayIdentifier = displayIdentifier;
            if (value) result.value = value;
            
            // 尝试从文本内容提取信息（如果缺少属性）
            if (!result.id || !result.field || !result.sourceName) {
              const content = node.textContent || '';
              const displayIdMatch = content.match(/@([^.]+)\.([^#]+)#([\w]+)/);
              
              if (displayIdMatch) {
                console.log(`[Variable.parseHTML:${timestamp}] 从内容提取显示标识符:`, displayIdMatch[0]);
                if (!result.sourceName) result.sourceName = displayIdMatch[1];
                if (!result.field) result.field = displayIdMatch[2];
                if (!result.displayIdentifier) result.displayIdentifier = displayIdMatch[0];
              }
            }
            
            // 关键：只要有id或field，我们就认为这是有效的变量节点
            // 缺失的属性会在renderHTML时补充默认值
            if ((result.id && result.id !== 'unknown') || (result.field && result.field !== 'unknown')) {
              console.log(`[Variable.parseHTML:${timestamp}] 成功提取变量属性:`, result);
              return result;
            }
            
            console.warn(`[Variable.parseHTML:${timestamp}] 无法提取足够的变量属性`);
            return false; // 返回false表示不处理此节点
          } catch (error) {
            console.error(`[Variable.parseHTML:${timestamp}] 解析DOM属性出错:`, error);
            return false; // 出错时返回false，不处理此节点
          }
        }
      }
    ]
  },
  
  // HTML渲染实现 - 完全重写，不依赖TipTap自动合并
  renderHTML({ HTMLAttributes }) {
    // 记录输入的原始属性
    console.log('[Variable.renderHTML] 输入的原始属性:', JSON.stringify(HTMLAttributes, null, 2));
    
    // 直接使用输入属性，保留原始值
    const originalAttrs = HTMLAttributes || {};
    
    // 直接获取属性，不经过TipTap框架的属性处理
    const id = originalAttrs['data-id'] || originalAttrs.id || 'unknown';
    const field = originalAttrs['data-field'] || originalAttrs.field || 'unknown';
    const sourceName = originalAttrs['data-source-name'] || originalAttrs.sourceName || 'Unknown';
    const sourceType = originalAttrs['data-type'] || originalAttrs.sourceType || 'system';
    const value = originalAttrs['data-value'] || originalAttrs.value;
    
    // 检查ID是否已经是v3.0格式 (type_entityId_field)
    let entityId = id;
    if (id && id.includes('_')) {
      const idParts = id.split('_');
      if (idParts.length >= 3) {
        // 如果ID已经是v3.0格式，只取实体ID部分
        entityId = idParts.slice(1, -1).join('_');
      }
    }
    
    // 生成v3.0格式系统标识符（带结束标记）
    const systemIdentifier = `@gv_${sourceType}_${entityId}_${field}-=`;
    console.log('[v3.0 Variable.renderHTML] 生成标识符:', systemIdentifier);
    
    // 确保显示标识符存在
    let displayIdentifier = originalAttrs['data-display-identifier'] || originalAttrs.displayIdentifier;
    if (!displayIdentifier && id !== 'unknown') {
      // 只有id有效时才生成显示标识符
      const shortId = id.substring(0, 4);
      displayIdentifier = `@${sourceName}.${field}#${shortId}`;
    } else if (!displayIdentifier) {
      // 默认显示标识符
      displayIdentifier = '@Unknown.unknown#xxxx';
    }
    
    // 获取主题颜色
    const colors = VariableThemeService.getTypeColor(sourceType);
    
    // 内联样式字符串
    const styleStr = `
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
    `;
    
    // 构建v3.0格式的复合ID
    const v3Id = `${sourceType}_${entityId}_${field}`;
    console.log('[v3.0 Variable.renderHTML] 复合ID:', v3Id);
    
    // 直接构建最终属性集，完全绕过TipTap的属性处理
    // 使用Record<string, any>类型，允许添加任意字符串索引的属性
    const finalAttributes: Record<string, any> = {
      // 核心属性 - 标记为变量节点
      'data-variable': '',
      
      // 变量属性 - 使用v3.0格式的ID
      'data-id': v3Id,
      'data-field': field,
      'data-source-name': sourceName,
      'data-type': sourceType,
      
      // 标识符 - 系统标识符和显示标识符
      'data-identifier': systemIdentifier, 
      'data-display-identifier': displayIdentifier,
      
      // DOM属性 - 确保不可编辑
      'contenteditable': 'false',
      
      // 样式属性 - 设置样式和类名
      'class': `variable-tag variable-type-${sourceType}`,
      'style': styleStr,
    };
    
    // 可选属性 - 保留值 (不会有类型错误，因为已定义为Record<string, any>)
    if (value !== undefined) {
      finalAttributes['data-value'] = value;
    }
    
    // 获取最终的显示标识符作为文本内容
    const textContent = displayIdentifier;
    
    // 记录最终的渲染信息
    console.log('[Variable.renderHTML] 最终渲染属性:', JSON.stringify(finalAttributes, null, 2));
    console.log('[Variable.renderHTML] 显示文本内容:', textContent);
    
    // 不使用mergeAttributes，直接返回我们的属性
    return ['span', finalAttributes, textContent];
  },
  
  // 添加命令，支持通过命令API插入变量 - 使用VariableNodeEngine确保属性一致
  addCommands() {
    return {
      insertVariable: (attributes: Record<string, any>) => ({ chain }: { chain: any }) => {
        const now = new Date().toISOString();
        console.log(`[Variable.insertVariable:${now}] 准备插入变量`, attributes);
        
        try {
          // 使用变量节点引擎确保属性一致性
          const validatedAttrs = variableNodeEngine.createNodeAttributes(attributes);
          
          // 验证属性
          const validation = variableNodeEngine.validateNodeAttributes(validatedAttrs);
          if (!validation.isValid) {
            console.warn(`[Variable.insertVariable:${now}] 变量属性验证失败:`, validation.errors);
          }
          
          console.log(`[Variable.insertVariable:${now}] 插入属性:`, validatedAttrs);
          
          // 插入节点
          return chain()
            .insertContent({
              type: this.name,
              attrs: validatedAttrs
            })
            .run();
        } catch (error) {
          console.error(`[Variable.insertVariable:${now}] 插入变量失败:`, error);
          
          // 降级处理：尝试使用原始属性
          console.warn(`[Variable.insertVariable:${now}] 降级处理: 使用原始属性插入`);
          return chain()
            .insertContent({
              type: this.name,
              attrs: attributes
            })
            .run();
        }
      },
    } as any;
  },
  
  // 添加键盘快捷键
  addKeyboardShortcuts() {
    return {
      // 删除整个标签（处理Backspace和Delete键）
      Backspace: () => this.editor.commands.command(({ tr, state }) => {
        const { selection } = state;
        const { empty, anchor } = selection;
        
        // 仅处理光标选择（无选中文本）
        if (!empty) {
          return false;
        }
        
        // 获取当前位置的节点
        const node = state.doc.nodeAt(anchor);
        
        // 检查是否已经在变量节点内或前面
        if (node && node.type.name === this.name) {
          // 删除整个变量节点
          tr.delete(anchor - 1, anchor + node.nodeSize - 1);
          return true;
        }
        
        return false;
      }),
      
      Delete: () => this.editor.commands.command(({ tr, state }) => {
        const { selection } = state;
        const { empty, anchor } = selection;
        
        // 仅处理光标选择（无选中文本）
        if (!empty) {
          return false;
        }
        
        // 获取当前位置后面的节点
        const node = state.doc.nodeAt(anchor);
        
        // 检查是否在变量节点前面
        if (node && node.type.name === this.name) {
          // 删除整个变量节点
          tr.delete(anchor, anchor + node.nodeSize);
          return true;
        }
        
        return false;
      }),
    };
  },
});
