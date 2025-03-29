import { useState, useEffect } from 'react';
import { variableService } from '../../../../services/variableService';
import { VariableData, VariableDataImpl } from '../types';

// 从API变量转换为VariableData格式
const convertToVariableData = (apiVar: any): VariableData => {
  // 判断是否为自定义变量
  const isCustomType = apiVar.type === 'custom';
  
  // 对于自定义变量，使用变量名称作为源名称
  let sourceName = apiVar.source?.name;
  if (isCustomType) {
    sourceName = apiVar.name || '自定义变量';
  } else {
    sourceName = sourceName || apiVar.name || '系统变量';
  }
  
  return new VariableDataImpl({
    id: apiVar.id || `id-${Math.random().toString(36).substr(2, 9)}`, // 生成随机ID (如果API未提供)
    field: apiVar.identifier?.split('.')?.pop() || 'value', // 提取字段名
    sourceName: sourceName,
    sourceType: apiVar.type || 'system',
    value: apiVar.value,
    // 添加显示标识符
    displayIdentifier: apiVar.displayIdentifier || `@${sourceName}.${apiVar.identifier?.split('.')?.pop() || 'value'}#${apiVar.id?.substring(0, 4) || '0000'}`
  });
};

// 模拟数据，用于API不可用的情况
const getMockVariables = (): VariableData[] => [
  new VariableDataImpl({
    id: 'a1b2c3d4e5f6',
    field: 'name',
    sourceName: '张三',
    sourceType: 'npc',
    value: '张三',
  }),
  new VariableDataImpl({
    id: 'b2c3d4e5f6a1',
    field: 'description',
    sourceName: '张三',
    sourceType: 'npc',
    value: '主角NPC，性格开朗',
  }),
  new VariableDataImpl({
    id: 'c3d4e5f6a1b2',
    field: 'title',
    sourceName: '森林探险',
    sourceType: 'task',
    value: '森林探险',
  }),
  new VariableDataImpl({
    id: 'd4e5f6a1b2c3',
    field: 'description',
    sourceName: '森林探险',
    sourceType: 'task',
    value: '探索神秘森林深处的古代遗迹',
  }),
  new VariableDataImpl({
    id: 'e5f6a1b2c3d4',
    field: 'objective',
    sourceName: '森林探险',
    sourceType: 'task',
    value: '找到并拍摄三张森林生物的照片',
  }),
  new VariableDataImpl({
    id: 'f6a1b2c3d4e5',
    field: 'weather',
    sourceName: '环境变量',
    sourceType: 'custom',
    value: '晴天',
  }),
  new VariableDataImpl({
    id: '1a2b3c4d5e6f',
    field: 'time',
    sourceName: '环境变量',
    sourceType: 'custom',
    value: '白天',
  }),
  new VariableDataImpl({
    id: '2b3c4d5e6f1a',
    field: 'name',
    sourceName: '神秘森林',
    sourceType: 'workflow',
    value: '神秘森林',
  }),
];

/**
 * 变量数据Hook - 用于获取和管理变量数据
 * 
 * 尝试从API获取变量数据，如果失败则使用模拟数据
 */
export const useVariableData = () => {
  const [variables, setVariables] = useState<VariableData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchVariables = async () => {
      try {
        setLoading(true);
        
        // 尝试从API获取变量
        const response = await variableService.getVariables();
        
        if (response && response.data && Array.isArray(response.data)) {
          // 转换API返回的变量为VariableData格式
          const rawVariables = response.data.map(convertToVariableData);
          
          // 基于标识符去重
          const uniqueIdentifiers = new Set<string>();
          const uniqueVariables = rawVariables.filter(variable => {
            // 如果标识符已存在，跳过这个变量
            if (uniqueIdentifiers.has(variable.identifier)) {
              console.log(`变量编辑器: 发现重复变量: ${variable.identifier}`);
              return false;
            }
            
            // 否则添加到已见过的标识符集合，并保留这个变量
            uniqueIdentifiers.add(variable.identifier);
            return true;
          });
          
          // 如果发现重复，记录日志
          if (uniqueVariables.length < rawVariables.length) {
            console.warn(`变量编辑器: 发现 ${rawVariables.length - uniqueVariables.length} 个重复变量，已自动去重`);
          }
          
          setVariables(uniqueVariables);
        } else {
          console.warn('获取到的变量数据不是有效数组或为空，使用模拟数据');
          // 如果API返回无效，使用模拟数据
          setVariables(getMockVariables());
        }
      } catch (err: any) {
        console.error('获取变量失败:', err);
        setError(err);
        // 发生错误时使用模拟数据
        setVariables(getMockVariables());
      } finally {
        setLoading(false);
      }
    };
    
    fetchVariables();
  }, []);

  return { variables, loading, error };
};

export default useVariableData;
