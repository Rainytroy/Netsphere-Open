import { CardData, CardType } from './CardSelector';

/**
 * 默认流程卡列表
 * 定义系统内置的流程节点卡片
 */
export const defaultProcessCards: CardData[] = [
  {
    id: 'start',
    type: CardType.PROCESS,
    title: '起点卡',
    description: '工作流的起点，提供用户输入',
    usageCount: 0,
    metadata: {
      required: true,
      maxCount: 1
    }
  },
  {
    id: 'assign',
    type: CardType.PROCESS,
    title: '赋值卡',
    description: '将一个全局变量的值赋给另一个变量',
    usageCount: 0
  },
  {
    id: 'loop',
    type: CardType.PROCESS,
    title: '循环卡',
    description: '根据条件判断工作流方向',
    usageCount: 0
  },
  {
    id: 'display',
    type: CardType.PROCESS,
    title: '展示卡',
    description: '展示指定变量的内容',
    usageCount: 0
  }
];

export default defaultProcessCards;
