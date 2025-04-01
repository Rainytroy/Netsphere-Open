import { Editor } from '@tiptap/core';
import { variableNodeEngine } from '../utils/VariableNodeEngine';
import { VariableData } from '../types';
import { useVariableData } from '../hooks/useVariableData';
import VariableThemeService from '../../../../services/VariableThemeService';

/**
 * 变量节点管理器
 * 负责变量节点的创建、同步和修复操作
 * 拆分自VariableEditorX组件中的变量处理逻辑
 */
export class VariableNodeManager {
  private static instance: VariableNodeManager;
  
  // 用于防止无限修复循环的计数器
  private repairCount: number = 0;
  private lastRepairTime: number = 0;
  private readonly MAX_REPAIR_ATTEMPTS: number = 3;
  private readonly REPAIR_COOLDOWN: number = 5000; // ms
  
  private constructor() {
    // 私有构造函数确保单例模式
  }
  
  /**
   * 获取单例实例
   */
  public static getInstance(): VariableNodeManager {
    if (!VariableNodeManager.instance) {
      VariableNodeManager.instance = new VariableNodeManager();
    }
    return VariableNodeManager.instance;
  }
  
  /**
   * 重置修复计数器
   */
  public resetRepairCount(): void {
    this.repairCount = 0;
    this.lastRepairTime = 0;
  }
  
  /**
   * 插入变量到编辑器
   * 专门支持v3.0格式标识符
   */
  public insertVariable(editor: Editor, variable: VariableData): void {
    if (!editor) return;
    
    const timestamp = new Date().toISOString();
    console.log(`[v3.0 插入变量:${timestamp}]`);
    
    // 记录详细的变量信息
    console.log(`[v3.0 变量数据:${timestamp}]`, {
      id: variable.id.substring(0, 8) + '...',
      type: variable.type,
      sourceType: variable.sourceType,
      field: variable.field,
      identifier: variable.identifier,
      displayId: variable.displayIdentifier
    });
    
    try {
      // 检查光标前的字符并删除@符号
      const { selection } = editor.state;
      const cursorPos = selection.from;
      
      // 检查光标前一个字符是否为@符号
      if (cursorPos > 0) {
        const charBeforeCursor = editor.state.doc.textBetween(
          cursorPos - 1,
          cursorPos,
          '\n'
        );
        
        // 如果光标前一个字符是@符号，则直接删除它
        if (charBeforeCursor === '@') {
          console.log(`[v3.0 插入变量:${timestamp}] 发现并删除@符号`);
          
          // 创建并执行事务直接删除@符号
          const tr = editor.state.tr.delete(cursorPos - 1, cursorPos);
          editor.view.dispatch(tr);
        }
      }
      
      // 确保变量有sourceType属性
      const sourceType = variable.sourceType || 'custom';
      
      // 对于v3.0格式，我们需要从variable中获取type
      const varType = variable.type || sourceType;
      
      // 确保displayIdentifier正确设置
      let displayId = variable.displayIdentifier;
      if (!displayId) {
        const shortId = variable.id.substring(0, Math.min(4, variable.id.length));
        displayId = `@${variable.sourceName}.${variable.field}#${shortId}`;
        console.log(`[v3.0 插入变量:${timestamp}] 生成显示标识符:`, displayId);
      }
      
      // 确保系统标识符格式正确
      let systemId = variable.identifier;
      if (!systemId.startsWith('@gv_') || !systemId.endsWith('-=')) {
        systemId = `@gv_${varType}_${variable.id}_${variable.field}-=`;
        console.log(`[v3.0 插入变量:${timestamp}] 修正系统标识符:`, systemId);
      }
      
      // 使用变量节点引擎创建规范化的属性集
      const variableAttrs = variableNodeEngine.createNodeAttributes({
        id: variable.id,
        field: variable.field,
        sourceName: variable.sourceName,
        sourceType: sourceType,
        displayIdentifier: displayId,
        value: variable.value,
        // 使用type支持v3.0格式标识符
        type: varType
      });
      
      // 记录系统标识符，但不直接传递给createNodeAttributes
      console.log(`[v3.0 插入变量:${timestamp}] 系统标识符:`, systemId);
      
      // 验证变量属性
      const validation = variableNodeEngine.validateNodeAttributes(variableAttrs);
      if (!validation.isValid) {
        console.warn(`[VariableNodeManager.insertVariable:${timestamp}] 变量属性验证失败:`, validation.errors);
      }
      
      // 插入变量节点
      console.log(`[VariableNodeManager.insertVariable:${timestamp}] 插入验证后的变量:`, variableAttrs);
      (editor.chain().focus() as any).insertVariable(variableAttrs).run();
      
      // 插入后立即同步变量节点以确保一致性
      setTimeout(() => this.syncVariableNodes(editor), 50);
    } catch (error) {
      console.error(`[VariableNodeManager.insertVariable:${timestamp}] 插入变量时出错:`, error);
      
      // 降级处理：尝试使用原始变量数据
      console.warn(`[VariableNodeManager.insertVariable:${timestamp}] 降级: 使用原始变量数据插入`);
      
      try {
        // 即使在降级情况下也尝试删除@符号
        const { selection } = editor.state;
        const cursorPos = selection.from;
        if (cursorPos > 0) {
          const charBeforeCursor = editor.state.doc.textBetween(cursorPos - 1, cursorPos, '\n');
          if (charBeforeCursor === '@') {
            const tr = editor.state.tr.delete(cursorPos - 1, cursorPos);
            editor.view.dispatch(tr);
            console.log(`[VariableNodeManager.insertVariable:${timestamp}] 降级处理中删除@符号`);
          }
        }
      } catch (e) {
        console.error(`[VariableNodeManager.insertVariable:${timestamp}] 降级处理中删除@符号失败:`, e);
      }
      
      // 构建变量属性，确保包含type
      const varAttributes = {
        id: variable.id,
        field: variable.field,
        sourceName: variable.sourceName,
        sourceType: variable.sourceType || 'custom',
        displayIdentifier: variable.displayIdentifier,
        value: variable.value,
        // 使用统一的type属性
        type: variable.type || variable.sourceType || 'custom'
      };
      
      // 插入变量
      (editor.chain().focus() as any).insertVariable(varAttributes).run();
    }
  }
  
  /**
   * 计算编辑器中的变量节点数量
   */
  public countVariableNodes(editor: Editor): number {
    if (!editor) return 0;
    
    let count = 0;
    editor.state.doc.descendants((node: any) => {
      if (node.type.name === 'variable') {
        count++;
      }
    });
    
    return count;
  }
  
  /**
   * 从编辑器获取变量节点列表
   */
  public getVariableNodesFromEditor(editor: Editor): any[] {
    if (!editor) return [];
    
    const jsonState = editor.getJSON();
    const variableNodes: any[] = [];
    
    // 收集变量节点及其属性
    const collectNodes = (node: any, path: number[] = []): void => {
      if (node.type === 'variable') {
        // 直接使用节点原始属性，避免重复规范化
        variableNodes.push({ attrs: {...node.attrs}, path });
      }
      
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach((child: any, index: number) => {
          collectNodes(child, [...path, index]);
        });
      }
    };
    
    if (jsonState && jsonState.content) {
      jsonState.content.forEach((node: any, index: number) => {
        collectNodes(node, [index]);
      });
    }
    
    return variableNodes;
  }
  
  /**
   * 检测HTML内容中是否存在问题标记
   */
  public detectHtmlProblems(html: string): boolean {
    // 使用正则表达式进行更精确的匹配
    const unknownDisplayIdRegex = /<span[^>]*data-display-identifier="@Unknown\.unknown#xxxx"[^>]*>/;
    const unknownIdRegex = /<span[^>]*data-id="unknown"[^>]*>/;
    const unknownTypeRegex = /<span[^>]*class="[^"]*variable-type-unknown[^"]*"[^>]*>/;
    
    // 跳过修复中的标签
    const needsRepair = (
      unknownDisplayIdRegex.test(html) || 
      (unknownIdRegex.test(html) && !html.includes('data-repair-in-progress="true"')) ||
      unknownTypeRegex.test(html)
    );
    
    return needsRepair;
  }
  
  /**
   * 标签单个修复 - 针对特定的变量标签进行修复
   */
  public repairSingleTag(
    element: HTMLElement, 
    nodeData: any, 
    timestamp: string
  ): boolean {
    // 跳过属性不完整的节点
    if (!nodeData.id || nodeData.id === 'unknown') {
      console.log(`[VariableNodeManager.repairSingleTag:${timestamp}] 跳过ID无效的节点`, nodeData);
      return false;
    }
    
    // 添加修复中标记
    element.setAttribute('data-repair-in-progress', 'true');
    
    try {
      console.log(`[VariableNodeManager.repairSingleTag:${timestamp}] 修复节点属性:`, nodeData);
      
      // 构建v3.0格式的ID: {type}_{entityId}_{fieldname}
      const v3Id = `${nodeData.sourceType}_${nodeData.id}_${nodeData.field}`;
      console.log(`[VariableNodeManager.repairSingleTag:${timestamp}] 使用v3.0格式ID: ${v3Id}`);
      
      // 直接设置DOM属性而不是使用变量节点引擎（避免循环）
      element.setAttribute('data-id', v3Id);
      element.setAttribute('data-field', nodeData.field);
      element.setAttribute('data-source-name', nodeData.sourceName);
      element.setAttribute('data-type', nodeData.sourceType);
      
      // 确保系统标识符一致 - v3.0格式：@gv_type_id_field-=
      const systemId = `@gv_${nodeData.sourceType}_${nodeData.id}_${nodeData.field}-=`;
      element.setAttribute('data-identifier', systemId);
      
      // 处理显示标识符
      if (!nodeData.displayIdentifier) {
        const shortId = nodeData.id.substring(0, 4);
        const displayId = `@${nodeData.sourceName}.${nodeData.field}#${shortId}`;
        element.setAttribute('data-display-identifier', displayId);
        element.textContent = displayId;
      } else {
        element.setAttribute('data-display-identifier', nodeData.displayIdentifier);
        element.textContent = nodeData.displayIdentifier;
      }
      
      // 保存变量值（如果存在）
      if (nodeData.value !== undefined) {
        element.setAttribute('data-value', nodeData.value);
      }
      
      // 设置变量标记
      element.setAttribute('data-variable', '');
      element.setAttribute('contenteditable', 'false');
      
      // 设置样式 - 关键：确保样式正确应用
      const colors = VariableThemeService.getTypeColor(nodeData.sourceType);
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
      
      // 设置类名 - 确保类名正确设置
      element.className = `variable-tag variable-type-${nodeData.sourceType}`;
      
      console.log(`[VariableNodeManager.repairSingleTag:${timestamp}] 修复完成，显示为:`, element.textContent);
      return true;
    } catch (error) {
      console.error(`[VariableNodeManager.repairSingleTag:${timestamp}] 修复标签失败:`, error);
      return false;
    } finally {
      // 移除修复中标记
      element.removeAttribute('data-repair-in-progress');
    }
  }
  
  /**
   * 更新变量节点的显示标识符
   * 此方法在刷新变量数据后调用，用于更新显示文本以匹配最新的变量数据
   */
  public updateVariableDisplayIdentifiers(editor: Editor, variablesData: any[]): void {
    if (!editor) return;
    
    const timestamp = new Date().toISOString();
    console.log(`[VariableNodeManager.updateVariableDisplayIdentifiers:${timestamp}] 开始更新变量显示标识符...`);
    
    // 将变量数据转换为ID-对象映射，便于查找
    const variablesMap = new Map();
    variablesData.forEach(variable => {
      // 变量ID是变量查找的唯一标识
      const id = variable.id?.toString() || '';
      if (id) {
        variablesMap.set(id, variable);
      }
    });
    
    // 从JSON中获取所有变量节点
    const variableNodes = this.getVariableNodesFromEditor(editor);
    
    // 获取HTML内容用于处理
    const html = editor.getHTML();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const tags = tempDiv.querySelectorAll('span[data-variable]');
    
    console.log(`[VariableNodeManager.updateVariableDisplayIdentifiers:${timestamp}] 找到 ${tags.length} 个变量标签，${variableNodes.length} 个变量节点，${variablesMap.size} 个变量数据对象`);
    
    // 检查是否有足够的标签和节点
    if (tags.length === 0 || variableNodes.length === 0) {
      console.log(`[VariableNodeManager.updateVariableDisplayIdentifiers:${timestamp}] 没有变量节点需要更新`);
      return;
    }
    
    // 检查标签数量是否匹配节点数量
    if (tags.length !== variableNodes.length) {
      console.warn(`[VariableNodeManager.updateVariableDisplayIdentifiers:${timestamp}] 变量标签数量(${tags.length})与节点数量(${variableNodes.length})不匹配，可能导致显示问题`);
    }
    
    // 标记是否有变更
    let hasChanges = false;
    
    // 遍历所有变量标签
    Array.from(tags).forEach((tag, index) => {
      if (index < variableNodes.length) {
        const nodeData = variableNodes[index].attrs;
        const element = tag as HTMLElement;
        
        // 获取变量ID和字段
        const variableId = nodeData.id;
        const field = nodeData.field;
        
        if (!variableId || !field) {
          console.warn(`[VariableNodeManager.updateVariableDisplayIdentifiers:${timestamp}] 无效的变量数据`, nodeData);
          return; // 继续下一个
        }
        
        // 查找最新的变量数据
        const latestData = variablesMap.get(variableId);
        if (latestData) {
          // 根据最新数据生成显示标识符
          const shortId = variableId.substring(0, 4);
          const currentSourceName = element.getAttribute('data-source-name') || nodeData.sourceName;
          const latestSourceName = latestData.sourceName || currentSourceName;
          
          // 只在源名称有变化时更新
          if (latestSourceName !== currentSourceName) {
            console.log(`[VariableNodeManager.updateVariableDisplayIdentifiers:${timestamp}] 变量源名称已改变: "${currentSourceName}" -> "${latestSourceName}"`);
            
            // 更新显示标识符
            const newDisplayId = `@${latestSourceName}.${field}#${shortId}`;
            const oldDisplayId = element.getAttribute('data-display-identifier');
            
            console.log(`[VariableNodeManager.updateVariableDisplayIdentifiers:${timestamp}] 更新显示标识符: "${oldDisplayId}" -> "${newDisplayId}"`);
            
            // 更新DOM属性和文本内容
            element.setAttribute('data-display-identifier', newDisplayId);
            element.setAttribute('data-source-name', latestSourceName);
            element.textContent = newDisplayId;
            
            // 标记有变更
            hasChanges = true;
          }
        }
      }
    });
    
    // 如果有变更，更新编辑器内容
    if (hasChanges) {
      try {
        editor.commands.setContent(tempDiv.innerHTML, false);
        console.log(`[VariableNodeManager.updateVariableDisplayIdentifiers:${timestamp}] 变量显示标识符更新完成`);
      } catch (error) {
        console.error(`[VariableNodeManager.updateVariableDisplayIdentifiers:${timestamp}] 更新内容失败:`, error);
      }
    } else {
      console.log(`[VariableNodeManager.updateVariableDisplayIdentifiers:${timestamp}] 所有变量显示标识符均为最新，无需更新`);
    }
  }
  
  /**
   * 同步变量节点 - 确保DOM和JSON数据一致性
   * 这是从VariableEditorX中抽离的核心方法
   */
  public syncVariableNodes(editor: Editor): void {
    if (!editor) return;
    
    const timestamp = new Date().toISOString();
    const now = Date.now();
    
    // 防止短时间内多次修复 - 添加冷却时间和最大尝试次数限制
    const timeSinceLastRepair = now - this.lastRepairTime;
    if (this.repairCount >= this.MAX_REPAIR_ATTEMPTS && timeSinceLastRepair < this.REPAIR_COOLDOWN) {
      console.warn(`[VariableNodeManager.syncVariableNodes:${timestamp}] 达到最大修复尝试次数 (${this.repairCount})，冷却中 (${Math.round(timeSinceLastRepair/1000)}s/${Math.round(this.REPAIR_COOLDOWN/1000)}s)`);
      return;
    }
    
    // 重置修复计数器（如果已过冷却时间）
    if (timeSinceLastRepair > this.REPAIR_COOLDOWN) {
      this.repairCount = 0;
    }
    
    console.log(`[VariableNodeManager.syncVariableNodes:${timestamp}] 开始同步变量节点...`);
    
    // 从JSON中获取所有变量节点
    const variableNodes = this.getVariableNodesFromEditor(editor);
    
    // 打印收集到的变量节点信息
    console.log(`[VariableNodeManager.syncVariableNodes:${timestamp}] 收集到 ${variableNodes.length} 个变量节点`);
    
    // 如果收集到变量节点，进行检查和修复
    if (variableNodes.length > 0) {
      const html = editor.getHTML();
      
      // 创建临时DOM以便检查
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const tags = tempDiv.querySelectorAll('span[data-variable]');
      
      // 计算标签数量是否匹配
      const tagCountMatch = tags.length === variableNodes.length;
      
      // 检查是否有问题标记
      const hasProblems = this.detectHtmlProblems(html);
      
      // 调试输出
      console.log(`[VariableNodeManager.syncVariableNodes:${timestamp}] 检测HTML内容长度: ${html.length}`);
      
      // 如果存在已知问题或标签数量不匹配，进行修复
      if (hasProblems || !tagCountMatch) {
        console.log(`[VariableNodeManager.syncVariableNodes:${timestamp}] 检测到问题，开始修复 (问题标记: ${hasProblems}, 标签数量匹配: ${tagCountMatch})`);
        
        // 更新修复计数器和时间戳
        this.repairCount += 1;
        this.lastRepairTime = now;
        
        // 检查是否达到最大尝试次数
        if (this.repairCount > this.MAX_REPAIR_ATTEMPTS) {
          console.warn(`[VariableNodeManager.syncVariableNodes:${timestamp}] 达到最大修复尝试次数 (${this.repairCount})，进入熔断模式`);
          return;
        }
        
        // 标签数量匹配时尝试单标签修复
        if (tags.length === variableNodes.length) {
          // 直接按照索引映射并修复
          let modified = false;
          
          Array.from(tags).forEach((tag, index) => {
            if (index < variableNodes.length) {
              const nodeData = variableNodes[index].attrs;
              const element = tag as HTMLElement;
              
              // 单标签修复
              const wasModified = this.repairSingleTag(element, nodeData, timestamp);
              if (wasModified) {
                modified = true;
              }
            }
          });
          
          // 如果有修改，更新编辑器内容
          if (modified) {
            try {
              editor.commands.setContent(tempDiv.innerHTML, false);
              console.log(`[VariableNodeManager.syncVariableNodes:${timestamp}] 变量节点修复完成`);
            } catch (error) {
              console.error(`[VariableNodeManager.syncVariableNodes:${timestamp}] 更新内容失败:`, error);
              this.repairCount = this.MAX_REPAIR_ATTEMPTS; // 强制进入熔断状态
            }
          } else {
            console.log(`[VariableNodeManager.syncVariableNodes:${timestamp}] 无需修复，节点已一致`);
            this.repairCount = 0; // 重置计数器
          }
        } else {
          // 标签数量不匹配，进行更彻底的重建
          console.warn(`[VariableNodeManager.syncVariableNodes:${timestamp}] 标签数量不匹配 (DOM: ${tags.length}, JSON: ${variableNodes.length})，尝试重建内容`);
          
          // 收集有效变量数据
          const validVariables = variableNodes
            .map((node: any) => node.attrs)
            .filter((attrs: any) => attrs.id && attrs.id !== 'unknown');
          
          // 完全重建内容 - 只保留文本内容
          try {
            // 获取纯文本
            const text = editor.getText();
            
            // 创建一个新的HTML结构
            const newHtml = `<p>${text}</p>`;
            editor.commands.setContent(newHtml);
            
            // 重置修复计数器
            this.repairCount = 0;
            
            console.log(`[VariableNodeManager.syncVariableNodes:${timestamp}] 内容已完全重建，恢复纯文本状态`);
          } catch (error) {
            console.error(`[VariableNodeManager.syncVariableNodes:${timestamp}] 重建内容失败:`, error);
            this.repairCount = this.MAX_REPAIR_ATTEMPTS; // 强制进入熔断状态
          }
        }
      } else {
        console.log(`[VariableNodeManager.syncVariableNodes:${timestamp}] 变量节点状态良好，无需修复`);
        this.repairCount = 0; // 重置修复计数器
      }
    } else {
      // 没有变量节点时也重置计数器
      this.repairCount = 0;
    }
  }
}

// 导出单例实例
export const variableNodeManager = VariableNodeManager.getInstance();
