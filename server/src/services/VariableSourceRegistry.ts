import { Variable } from '../models/Variable';

/**
 * 变量源提供者接口
 * 新模块要成为变量源，需要实现此接口
 */
export interface VariableSourceProvider {
  /**
   * 获取该源的所有变量
   */
  getVariables(): Promise<Variable[]>;
  
  /**
   * 通过UUID获取变量
   * 用于支持系统标识符格式 @gv_UUID_field
   * @param uuid 变量UUID
   * @returns 匹配UUID的变量列表，如果不支持则返回空数组
   */
  getVariablesByUUID?(uuid: string): Promise<Variable[]>;
  
  /**
   * 监听源对象变化并同步变量
   * @param callback 变更回调函数
   */
  subscribeToChanges(callback: (action: 'create' | 'update' | 'delete', variables: Variable[]) => void): void;
  
  /**
   * 获取变量源类型标识
   */
  getSourceType(): string;
}

/**
 * 变量源注册服务
 * 用于管理系统中的所有变量源
 */
export class VariableSourceRegistry {
  private static instance: VariableSourceRegistry;
  private sources: Map<string, VariableSourceProvider> = new Map();
  
  /**
   * 获取单例实例
   */
  public static getInstance(): VariableSourceRegistry {
    if (!VariableSourceRegistry.instance) {
      VariableSourceRegistry.instance = new VariableSourceRegistry();
    }
    return VariableSourceRegistry.instance;
  }
  
  /**
   * 注册变量源
   * @param provider 变量源提供者
   */
  public registerSource(provider: VariableSourceProvider): void {
    const sourceType = provider.getSourceType();
    if (this.sources.has(sourceType)) {
      console.warn(`变量源 ${sourceType} 已存在，将被覆盖`);
    }
    this.sources.set(sourceType, provider);
    console.log(`已注册变量源: ${sourceType}`);
  }
  
  /**
   * 移除变量源
   * @param sourceType 变量源类型标识
   */
  public unregisterSource(sourceType: string): void {
    if (this.sources.has(sourceType)) {
      this.sources.delete(sourceType);
      console.log(`已移除变量源: ${sourceType}`);
    } else {
      console.warn(`变量源 ${sourceType} 不存在，无法移除`);
    }
  }
  
  /**
   * 获取所有注册的变量源
   */
  public getSources(): VariableSourceProvider[] {
    return Array.from(this.sources.values());
  }
  
  /**
   * 获取指定类型的变量源
   * @param sourceType 变量源类型标识
   */
  public getSource(sourceType: string): VariableSourceProvider | undefined {
    return this.sources.get(sourceType);
  }
  
  /**
   * 获取所有变量源的所有变量
   */
  public async getAllVariables(): Promise<Variable[]> {
    const allVariablesPromises = Array.from(this.sources.values()).map(source => 
      source.getVariables()
    );
    
    const variablesArrays = await Promise.all(allVariablesPromises);
    return variablesArrays.flat();
  }
  
  /**
   * 通过UUID从所有变量源获取变量
   * @param uuid 变量UUID
   * @returns 匹配UUID的变量列表
   */
  public async getVariablesByUUID(uuid: string): Promise<Variable[]> {
    const result: Variable[] = [];
    
    // 获取所有变量源
    const sources = Array.from(this.sources.values());
    
    for (const source of sources) {
      try {
        // 如果源支持通过UUID查询，则直接调用
        if (source.getVariablesByUUID) {
          const variables = await source.getVariablesByUUID(uuid);
          if (variables && Array.isArray(variables)) {
            result.push(...variables);
          }
        } else {
          // 对于不支持通过UUID查询的源，查询所有变量并过滤
          const allVariables = await source.getVariables();
          const matchingVariables = allVariables.filter(variable => variable.id === uuid);
          result.push(...matchingVariables);
        }
      } catch (error) {
        console.error(`从变量源获取UUID变量失败: ${source.getSourceType()}`, error);
        // 继续处理其他源
      }
    }
    
    return result;
  }
}
