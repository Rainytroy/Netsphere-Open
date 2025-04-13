import { variableService } from '../../../services/variableService';
import { parseFullId, extractFullIdFromSystemId } from './VariableUtils';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

/**
 * 变量适配器类
 * 根据变量类型使用不同的服务进行数据获取和操作
 */
export class VariableAdapter {
  /**
   * 通过完整ID获取变量值
   * @param fullId 变量完整ID (如 "workflow_123_name")
   * @returns 变量值
   */
  public static async getVariableValueById(fullId: string): Promise<{ success: boolean; value?: string; error?: string }> {
    try {
      if (!fullId) {
        return { success: false, error: `无效的变量ID: ID不能为空` };
      }
      
      // 直接使用完整ID调用统一API，不再提取entityId
      console.log(`[VariableAdapter] 获取变量: 完整ID=${fullId}`);
      
      // 使用统一的API路径：/api/variables/:id
      const response = await axios.get(`${API_BASE_URL}/variables/${fullId}`);
      
      if (response && response.data) {
        if (typeof response.data === 'object' && 'value' in response.data) {
          console.log(`[VariableAdapter] 获取到变量值: ${response.data.value}`);
          return { 
            success: true, 
            value: String(response.data.value || '') 
          };
        } else if (response.data !== undefined) {
          // 兼容直接返回值的情况
          console.log(`[VariableAdapter] 获取到原始值: ${response.data}`);
          return { 
            success: true, 
            value: String(response.data || '') 
          };
        }
      }
      
      return { success: false, error: '变量值获取失败或格式不正确' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
  
  /**
   * 通过系统标识符获取变量值
   * @param systemId 系统标识符 (如 "@gv_workflow_123_name-=")
   * @returns 变量值
   */
  public static async getVariableValueBySystemId(systemId: string): Promise<{ success: boolean; value?: string; error?: string }> {
    try {
      // 从系统标识符中提取完整ID
      const fullId = extractFullIdFromSystemId(systemId);
      if (!fullId) {
        return { success: false, error: `无法从系统标识符解析完整ID: ${systemId}` };
      }
      
      // 使用完整ID获取变量值
      return await this.getVariableValueById(fullId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
  
  /**
   * 更新变量值
   * @param fullId 变量完整ID
   * @param value 新的变量值
   * @returns 操作结果
   */
  public static async updateVariableValue(fullId: string, value: string): Promise<{ success: boolean; value?: string; error?: string }> {
    try {
      if (!fullId) {
        return { success: false, error: `无效的变量ID: ID不能为空` };
      }
      
      // 直接使用完整ID调用统一API，不再提取entityId
      console.log(`[VariableAdapter] 更新变量: 完整ID=${fullId}, 值=${value}`);
      
      // 使用统一的API路径：/api/variables/:id
      const payload = { value };
      const response = await axios.put(`${API_BASE_URL}/variables/${fullId}`, payload);
      
      // 更新成功后返回结果
      console.log(`[VariableAdapter] 变量更新成功: ${fullId}`);
      return { success: true, value };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
}

export default VariableAdapter;
