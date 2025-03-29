import { VariableType } from './variableService';
import VariableSchemaService from './VariableSchemaService';

/**
 * 变量主题样式服务
 * 提供统一的变量标签颜色样式和配置
 * 以全局通用组件VariableTag为基准，确保全系统变量标签样式一致
 */
export interface VariableTypeColor {
  bgColor: string;    // 背景色
  borderColor: string; // 边框色
  textColor: string;   // 文本色
}

export class VariableThemeService {
  /**
   * 获取变量类型对应的颜色样式
   * @param variableType 变量类型
   * @param error 是否为错误状态
   * @returns 包含背景色、边框色、文本色的颜色配置对象
   */
  static getTypeColor(variableType?: string | VariableType, error: boolean = false): VariableTypeColor {
    // 使用统一的变量架构服务获取主题色
    return VariableSchemaService.getTypeTheme(variableType, error);
  }

  /**
   * 获取主颜色（用于简化的颜色引用）
   * @param variableType 变量类型
   * @returns 主颜色（文本色）
   */
  static getMainColor(variableType?: string | VariableType): string {
    return this.getTypeColor(variableType).textColor;
  }

  /**
   * 获取变量标签的React样式对象
   * @param variableType 变量类型
   * @param error 是否为错误状态
   * @returns 完整的React样式对象
   */
  static getTagStyle(variableType?: string | VariableType, error: boolean = false): React.CSSProperties {
    const colors = this.getTypeColor(variableType, error);
    
    return {
      backgroundColor: colors.bgColor,
      border: `1px solid ${colors.borderColor}`,
      borderRadius: '4px',
      padding: '2px 8px',
      color: colors.textColor,
      marginRight: '4px',
      transition: 'all 0.3s',
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: '12px',
      fontWeight: 500,
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
    };
  }
}

export default VariableThemeService;
