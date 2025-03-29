import { useState, useCallback, useRef, useEffect } from 'react';
import { message } from 'antd';
import workTaskService from '../../../services/workTaskService';
import { VariableView } from './useWorkTaskEffect';
import createLogger from '../../../utils/logger';

// 创建日志记录器，增加时序信息
const logger = createLogger('useTestExecution');

// 定义执行阶段枚举，用于跟踪当前执行到哪一步
enum ExecutionPhase {
  IDLE = '空闲',
  PREPARING = '准备数据',
  STATE_TRANSITION = '状态转换',
  API_CALLING = 'API调用中',
  PROCESSING_RESPONSE = '处理响应',
  UPDATING_STATE = '更新状态',
  COMPLETED = '已完成',
  ERROR = '发生错误'
}

// 定义执行追踪信息接口
interface ExecutionTrackInfo {
  startTime: number;
  endTime?: number;
  duration?: number;
  apiCallDuration?: number; // 添加API调用持续时间
  result?: any;
  error?: any;
}

interface UseTestExecutionProps {
  initialTaskId?: string;
  getFormValues: () => any;
}

/**
 * 用于管理工作任务测试执行的自定义Hook
 */
export const useTestExecution = ({
  initialTaskId,
  getFormValues
}: UseTestExecutionProps) => {
  // 状态
  const [executing, setExecuting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string>('');
  const [testError, setTestError] = useState<string | null>(null);
  const [testVariables, setTestVariables] = useState<VariableView[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  
  // 当前执行阶段
  const [executionPhase, setExecutionPhase] = useState<ExecutionPhase>(ExecutionPhase.IDLE);
  
  // 使用ref记录最后一次执行的结果，便于调试和监控
  const lastExecutionRef = useRef<ExecutionTrackInfo>({ startTime: 0 });

  /**
   * 测试执行工作任务 - 使用Promise链确保每一步完成后才进行下一步
   * @returns Promise 可以在组件中链式处理结果
   */
  const testExecute = useCallback((additionalParams?: Record<string, any>) => {
    // 返回Promise，让外部可以链式处理
    return new Promise((resolve, reject) => {
      try {
        // 记录执行开始时间
        lastExecutionRef.current = { startTime: Date.now() };
        
        // 阶段1: 准备数据
        setExecutionPhase(ExecutionPhase.PREPARING);
        logger.info('【阶段1/6】准备数据开始');
        
        // 重置状态
        setExecuting(true);
        setTestError(null);
        setTestResult('');
        setDebugInfo(null);
        setServerLogs([]);
        
        // 获取表单数据
        const formData = getFormValues();
        
        // 添加详细日志，输出表单数据
        logger.info('【阶段1/6】表单数据准备完成', {
          formDataKeys: Object.keys(formData),
          inputLength: formData.input ? formData.input.length : 0,
          hasTemplate: !!formData.npcPromptTemplate
        });
        
        // 合并额外参数，添加debug和returnServerLogs参数
        // 注意：additionalParams优先级更高，所以放在后面以覆盖formData中的同名字段
        const executeParams = { 
          ...formData,
          debug: true,           // 请求调试信息 
          returnServerLogs: true, // 请求服务端日志
          taskId: initialTaskId,  // 添加任务ID以便后端更新变量
          ...additionalParams     // 额外参数优先级最高
        };
        
        // 检查合并后的executeParams中是否包含最新的编辑器内容
        logger.info('【阶段1/6】最终执行参数准备完成', {
          execParamKeys: Object.keys(executeParams),
          additionalParamsKeys: additionalParams ? Object.keys(additionalParams) : [],
          inputFromAdditionalParams: additionalParams && 'input' in additionalParams
        });
        
        // 阶段2: 状态转换
        setExecutionPhase(ExecutionPhase.STATE_TRANSITION);
        logger.info('【阶段2/6】状态转换');
        
        // 阶段3: API调用
        setExecutionPhase(ExecutionPhase.API_CALLING);
        logger.info('【阶段3/6】开始API调用');
        
        // 使用Promise调用API，而不是await
        workTaskService.testExecuteWorkTask(executeParams)
          .then(response => {
            // 记录API调用完成时间
            const apiCallEndTime = Date.now();
            lastExecutionRef.current.apiCallDuration = apiCallEndTime - lastExecutionRef.current.startTime;
            
            logger.info('【阶段3/6】API调用完成', {
              apiCallDuration: lastExecutionRef.current.apiCallDuration + 'ms',
              responseType: typeof response,
              responseIsObject: typeof response === 'object'
            });
            
            // 阶段4: 处理响应
            setExecutionPhase(ExecutionPhase.PROCESSING_RESPONSE);
            logger.info('【阶段4/6】开始处理响应');
            
            // 处理响应
            let outputText: string = '';
            let responseDebugInfo: any = {};
            let responseLogs: string[] = [];
            
            if (typeof response === 'string') {
              // 字符串格式 - 旧格式响应
              outputText = response;
              logger.info('【阶段4/6】处理字符串格式响应', { length: outputText.length });
            } else if (typeof response === 'object') {
              // 对象格式 - 新格式响应
              if ('output' in response) {
                outputText = String(response.output || '');
                logger.info('【阶段4/6】从对象提取output字段', { length: outputText.length });
              } else {
                // 如果没有output字段，尝试将整个响应转为字符串
                outputText = JSON.stringify(response);
                logger.warn('【阶段4/6】响应对象中没有output字段，转换整个响应为字符串');
              }
              
              // 提取调试信息
              responseDebugInfo = response.debug || {};
              
              // 获取服务端日志 - 按行分割
              const serverLogsData = response.serverLogs as string | string[] | undefined;
              if (typeof serverLogsData === 'string' && serverLogsData.trim()) {
                responseLogs = serverLogsData.split('\n').filter(Boolean);
                logger.info('【阶段4/6】解析服务端日志(字符串格式)', { count: responseLogs.length });
              } else if (Array.isArray(serverLogsData)) {
                responseLogs = serverLogsData;
                logger.info('【阶段4/6】解析服务端日志(数组格式)', { count: responseLogs.length });
              } else {
                logger.warn('【阶段4/6】未找到服务端日志或格式不正确');
              }
              
              // 始终将服务端日志添加到调试信息中
              if (responseDebugInfo) {
                responseDebugInfo.serverLogs = responseLogs;
                logger.info('【阶段4/6】将服务端日志添加到调试信息对象中');
              }
            } else {
              outputText = String(response) || '执行成功，但没有返回结果';
              logger.warn('【阶段4/6】未知响应格式', { type: typeof response });
            }
            
            // 阶段5: 更新状态 - 一步一步更新确保同步
            setExecutionPhase(ExecutionPhase.UPDATING_STATE);
            logger.info('【阶段5/6】开始更新状态');
            
            // 按顺序更新状态 - React hooks中setState不接受回调，使用顺序更新
            // 更新测试结果
            setTestResult(outputText);
            logger.info('【阶段5/6】测试结果状态已更新');
            
            // 更新调试信息
            setDebugInfo(responseDebugInfo);
            logger.info('【阶段5/6】调试信息状态已更新');
            
            // 更新服务端日志
            setServerLogs(responseLogs);
            logger.info('【阶段5/6】服务端日志状态已更新');
            
            // 如果有变量解析信息，处理变量
            if (responseDebugInfo && responseDebugInfo.variableResolution && 
                responseDebugInfo.variableResolution.variables && 
                Array.isArray(responseDebugInfo.variableResolution.variables)) {
              const variableViews = responseDebugInfo.variableResolution.variables.map((v: any) => ({
                id: v.id || '',
                name: v.name || '',
                identifier: v.identifier || '',
                displayIdentifier: v.displayIdentifier || v.identifier || '',
                type: v.type || 'UNKNOWN',
                sourceId: v.sourceId || v.id || '',
                sourceName: v.sourceName || '',
                value: v.value || ''
              }));
              
              setTestVariables(variableViews);
              logger.info('【阶段5/6】测试变量状态已更新');
            }
            
            // 最后完成执行状态更新
            setExecuting(false);
            // 阶段6: 完成
            setExecutionPhase(ExecutionPhase.COMPLETED);
            
            // 记录完成时间和总执行时间
            lastExecutionRef.current.endTime = Date.now();
            lastExecutionRef.current.duration = lastExecutionRef.current.endTime - lastExecutionRef.current.startTime;
            lastExecutionRef.current.result = { outputText, responseDebugInfo, responseLogs };
            
            logger.info('【阶段6/6】完成执行', { 
              totalDuration: lastExecutionRef.current.duration + 'ms',
              outputLength: outputText.length 
            });
            
            message.success('测试执行成功');
            
            // 返回成功结果，供外部组件链式处理
            resolve({
              success: true,
              output: outputText,
              debugInfo: responseDebugInfo,
              serverLogs: responseLogs,
              executionPhase: ExecutionPhase.COMPLETED,
              duration: lastExecutionRef.current.duration
            });
          })
          .catch(error => {
            // 错误处理
            setExecutionPhase(ExecutionPhase.ERROR);
            logger.error('【错误】API调用失败:', error);
            
            // 尝试从错误响应中提取详细信息
            let errorMessage = '测试执行失败';
            if (error instanceof Error) {
              errorMessage = error.message;
            }
            
            // 记录错误信息
            lastExecutionRef.current.endTime = Date.now();
            lastExecutionRef.current.duration = lastExecutionRef.current.endTime - lastExecutionRef.current.startTime;
            lastExecutionRef.current.error = error;
            
            setTestError(errorMessage);
            setExecuting(false);
            message.error(errorMessage);
            
            // 返回错误结果，供外部组件链式处理
            reject({
              success: false,
              error: errorMessage,
              executionPhase: ExecutionPhase.ERROR,
              duration: lastExecutionRef.current.duration
            });
          });
          
      } catch (error) {
        // 本地错误处理（如参数准备阶段的错误）
        setExecutionPhase(ExecutionPhase.ERROR);
        logger.error('【错误】本地执行错误:', error);
        
        // 尝试从错误中提取详细信息
        let errorMessage = '测试本地执行失败';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        // 记录错误信息
        lastExecutionRef.current.endTime = Date.now();
        lastExecutionRef.current.duration = lastExecutionRef.current.endTime - lastExecutionRef.current.startTime;
        lastExecutionRef.current.error = error;
        
        setTestError(errorMessage);
        setExecuting(false);
        message.error(errorMessage);
        
        // 返回错误结果，供外部组件链式处理
        reject({
          success: false,
          error: errorMessage,
          executionPhase: ExecutionPhase.ERROR,
          duration: lastExecutionRef.current.duration
        });
      }
    });
  }, [getFormValues]);
  
  // 清除测试结果
  const clearTestResult = useCallback(() => {
    setTestResult('');
    setTestError(null);
    setTestVariables([]);
    setDebugInfo(null);
    setServerLogs([]);
  }, []);
  
  // 检查变量是否在测试中使用
  const isVariableInTest = useCallback((variable: VariableView) => {
    return testVariables.some(v => v.identifier === variable.identifier);
  }, [testVariables]);
  
  return {
    executing,
    testResult,
    testError,
    testVariables,
    testExecute,
    clearTestResult,
    isVariableInTest,
    debugInfo,
    serverLogs,
    executionPhase, // 返回当前执行阶段，便于外部监控
    lastExecution: lastExecutionRef.current // 返回最后一次执行信息，便于外部监控
  };
};
