import { Editor } from '@tiptap/core';
import { variableNodeManager } from '../managers/VariableNodeManager';
import { contentFormatManager } from '../managers/ContentFormatManager';
import VariableEventService from '../../../../services/VariableEventService';
import { VariableData, VariableDataImpl } from '../types';

/**
 * 编辑器状态管理器
 * 管理编辑器状态和事件，减轻VariableEditorX组件的状态管理负担
 */
export class StateManager {
  private static instance: StateManager;
  
  // 状态标志
  private _readOnly: boolean = false;
  private _focused: boolean = false;
  private _contentChanged: boolean = false;
  private _syncingNodes: boolean = false;
  
  // 内容状态
  private _htmlContent: string = '';
  private _jsonContent: any = null;
  private _rawTextContent: string = '';
  private _editor: Editor | null = null;
  
  // 变量状态
  private _usedVariables: VariableData[] = [];
  
  // 回调函数
  private _onHtmlChange: ((html: string) => void) | null = null;
  private _onRawTextChange: ((text: string) => void) | null = null;
  private _onJsonChange: ((json: any) => void) | null = null;
  private _onUsedVariablesChange: ((variables: VariableData[]) => void) | null = null;
  
  private constructor() {
    // 私有构造函数
  }
  
  /**
   * 获取单例实例
   */
  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }
  
  /**
   * 初始化编辑器状态
   */
  public initialize(editor: Editor | null, initialHtml: string = '') {
    this._editor = editor;
    this._htmlContent = initialHtml;
    
    // 初次更新内容状态
    if (editor) {
      this._htmlContent = editor.getHTML();
      this._jsonContent = editor.getJSON();
      this._rawTextContent = contentFormatManager.getRawTextFromEditor(editor);
    }
    
    // 注册事件监听
    VariableEventService.subscribe(this.onVariableUpdate);
  }
  
  /**
   * 清理资源
   */
  public dispose() {
    // 解除事件监听
    VariableEventService.unsubscribe(this.onVariableUpdate);
    
    // 重置状态
    this._editor = null;
    this._onHtmlChange = null;
    this._onRawTextChange = null;
    this._onJsonChange = null;
    this._onUsedVariablesChange = null;
  }
  
  /**
   * 注册HTML内容变更监听
   */
  public onHtmlChange(callback: (html: string) => void) {
    this._onHtmlChange = callback;
  }
  
  /**
   * 注册原始文本变更监听
   */
  public onRawTextChange(callback: (text: string) => void) {
    this._onRawTextChange = callback;
  }
  
  /**
   * 注册JSON变更监听
   */
  public onJsonChange(callback: (json: any) => void) {
    this._onJsonChange = callback;
  }
  
  /**
   * 注册使用变量变更监听
   */
  public onUsedVariablesChange(callback: (variables: VariableData[]) => void) {
    this._onUsedVariablesChange = callback;
  }
  
  /**
   * 变量更新事件处理
   */
  private onVariableUpdate = () => {
    // 检查变量更新是否影响当前编辑器内容
    const usedVariables = this.getUsedVariables();
    
    // 由于没有传入具体更新的变量数据，我们需要同步所有变量节点
    
    if (usedVariables.length > 0 && this._editor) {
      // 有变量在使用，同步所有节点
      variableNodeManager.syncVariableNodes(this._editor);
      
      // 更新内容状态
      this.updateContentState();
    }
  };
  
  /**
   * 更新内容状态
   */
  public updateContentState() {
    if (!this._editor) return;
    
    // 记录变更前状态
    const prevHtml = this._htmlContent;
    const prevRawText = this._rawTextContent;
    
    // 获取新内容
    try {
      this._htmlContent = this._editor.getHTML();
      this._jsonContent = this._editor.getJSON();
      this._rawTextContent = contentFormatManager.getRawTextFromEditor(this._editor);
      
      // 更新使用的变量
      this.updateUsedVariables();
      
      // 触发变更事件
      if (prevHtml !== this._htmlContent && this._onHtmlChange) {
        this._onHtmlChange(this._htmlContent);
      }
      
      if (prevRawText !== this._rawTextContent && this._onRawTextChange) {
        this._onRawTextChange(this._rawTextContent);
      }
      
      if (this._onJsonChange) {
        this._onJsonChange(this._jsonContent);
      }
      
      // 标记内容已变更
      this._contentChanged = true;
    } catch (error) {
      console.error('更新编辑器状态失败:', error);
    }
  }
  
  /**
   * 更新使用的变量
   */
  private updateUsedVariables() {
    if (!this._editor || !this._rawTextContent) {
      this._usedVariables = [];
      return;
    }
    
    // 从原始文本中提取系统标识符
    const systemIdRegex = /@gv_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)/g;
    const matches = this._rawTextContent.match(systemIdRegex) || [];
    
    // 使用Set去重
    const uniqueIds = new Set<string>();
    const result: VariableData[] = [];
    
    matches.forEach(match => {
      // 提取ID和字段
      const parts = match.split('_');
      if (parts.length >= 3) {
        const id = parts[1];
        const field = parts[2];
        const key = `${id}_${field}`;
        
        // 如果没处理过这个ID
        if (!uniqueIds.has(key)) {
          uniqueIds.add(key);
          
          // 创建变量数据 - 使用VariableDataImpl实现identifier接口
          result.push(new VariableDataImpl({
            id,
            field,
            sourceName: 'Unknown', // 无法从标识符获取
            sourceType: 'system',  // 无法从标识符获取
            displayIdentifier: `@Unknown.${field}#${id.substring(0, 4)}`
          }));
        }
      }
    });
    
    // 更新使用的变量
    const prevLength = this._usedVariables.length;
    this._usedVariables = result;
    
    // 触发事件
    if (
      prevLength !== result.length ||
      JSON.stringify(this._usedVariables) !== JSON.stringify(result)
    ) {
      if (this._onUsedVariablesChange) {
        this._onUsedVariablesChange(result);
      }
    }
  }
  
  /**
   * 获取使用的变量
   */
  public getUsedVariables(): VariableData[] {
    return [...this._usedVariables];
  }
  
  /**
   * 获取HTML内容
   */
  public getHtmlContent(): string {
    return this._htmlContent;
  }
  
  /**
   * 获取JSON内容
   */
  public getJsonContent(): any {
    return this._jsonContent;
  }
  
  /**
   * 获取原始文本内容
   */
  public getRawTextContent(): string {
    return this._rawTextContent;
  }
  
  /**
   * 设置只读状态
   */
  public setReadOnly(readOnly: boolean) {
    if (this._readOnly !== readOnly) {
      this._readOnly = readOnly;
      
      if (this._editor) {
        this._editor.setEditable(!readOnly);
      }
    }
  }
  
  /**
   * 获取只读状态
   */
  public isReadOnly(): boolean {
    return this._readOnly;
  }
  
  /**
   * 设置焦点状态
   */
  public setFocused(focused: boolean) {
    this._focused = focused;
  }
  
  /**
   * 获取焦点状态
   */
  public isFocused(): boolean {
    return this._focused;
  }
  
  /**
   * 获取编辑器实例
   */
  public getEditor(): Editor | null {
    return this._editor;
  }
}

// 导出单例实例
export const stateManager = StateManager.getInstance();
