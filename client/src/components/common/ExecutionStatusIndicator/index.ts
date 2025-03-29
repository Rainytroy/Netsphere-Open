import ExecutionStatusIndicator from './ExecutionStatusIndicator';
import { 
  ExecutionPhase, 
  ExecutionTrackInfo, 
  getPhaseColor, 
  getPhaseDescription, 
  getPhaseShortDescription, 
  getPhaseIcon 
} from './executionTypes';

// 分别导出组件和函数
export { ExecutionStatusIndicator };
export { getPhaseColor, getPhaseDescription, getPhaseShortDescription, getPhaseIcon };

// 直接从executionTypes重新导出ExecutionPhase枚举，这样它既可以作为类型也可以作为值使用
export { ExecutionPhase } from './executionTypes';

// 仅作为类型导出的接口
export type { ExecutionTrackInfo };

export default ExecutionStatusIndicator;
