/**
 * 变量类型与字段定义配置文件
 * 集中管理所有变量类型的配置，包括字段映射、主题色、显示名称等
 * 作为整个系统的单一配置源，确保一致性
 */

export interface FieldDefinition {
  english: string;     // 英文字段名(用于系统标识符)
  chinese: string;     // 中文字段名
  description?: string; // 字段描述
  isRequired?: boolean; // 是否必填
  defaultValue?: any;   // 默认值
}

export interface VariableTypeTheme {
  bgColor: string;      // 背景色
  borderColor: string;  // 边框色
  textColor: string;    // 文本色
  icon?: string;        // 可选图标名称或路径
}

export interface VariableTypeSchema {
  // 类型标识符（与枚举值保持一致）
  systemKey: string;    // 系统内部使用的键，如'npc', 'task'
  enumKey: string;      // 枚举值，如VariableType.NPC
  
  // 显示信息
  displayName: string;  // 中文显示名称，如'角色/NPC'
  description?: string; // 类型描述
  
  // 主题配置
  theme: VariableTypeTheme;
  
  // 字段定义
  fields: Record<string, FieldDefinition>;
}

// 完整的变量类型配置
export const VariableSchemas: Record<string, VariableTypeSchema> = {
  npc: {
    systemKey: 'npc',
    enumKey: 'NPC',
    displayName: '角色/NPC',
    description: '用于表示游戏中的角色和NPC',
    theme: {
      bgColor: '#E6F7FF',
      borderColor: '#1890FF',
      textColor: '#1890FF',
      icon: 'user'
    },
    fields: {
      name: {
        english: 'name',
        chinese: '名称',
        isRequired: true,
        description: '角色名称'
      },
      description: {
        english: 'description',
        chinese: '描述',
        description: '角色基本描述'
      },
      knowledge: {
        english: 'knowledge',
        chinese: '知识背景',
        description: '角色的知识背景'
      },
      act: {
        english: 'act',
        chinese: '行动原则',
        description: '角色的行动原则与决策逻辑'
      },
      // 添加所有行为原则的可能名称映射
      behaviorPrinciple: { 
        english: 'act',
        chinese: '行为原则',
        description: '角色的行为原则（别名）'
      },
      actlv: {
        english: 'actlv',
        chinese: '活跃度',
        description: '角色在场景中的活跃程度'
      }
    }
  },

  task: {
    systemKey: 'task',
    enumKey: 'TASK',
    displayName: '工作任务',
    description: '表示工作流中的任务节点',
    theme: {
      bgColor: '#E3F9D3',
      borderColor: '#389E0D',
      textColor: '#389E0D',
      icon: 'calendar'
    },
    fields: {
      input: {
        english: 'input',
        chinese: '输入',
        isRequired: true,
        description: '任务的输入内容'
      },
      output: {
        english: 'output',
        chinese: '输出',
        description: '任务的输出结果'
      },
      status: {
        english: 'status',
        chinese: '状态',
        description: '任务的当前状态'
      }
    }
  },
  
  workflow: {
    systemKey: 'workflow',
    enumKey: 'WORKFLOW',
    displayName: '工作流',
    description: '工作流定义',
    theme: {
      bgColor: '#F9F0FF',
      borderColor: '#722ED1',
      textColor: '#722ED1',
      icon: 'cluster'
    },
    fields: {
      name: {
        english: 'name',
        chinese: '名称',
        isRequired: true,
        description: '工作流名称'
      },
      description: {
        english: 'description',
        chinese: '描述',
        description: '工作流描述'
      },
      status: {
        english: 'status',
        chinese: '状态',
        description: '工作流当前状态'
      }
    }
  },
  
  custom: {
    systemKey: 'custom',
    enumKey: 'CUSTOM',
    displayName: '自定义变量',
    description: '用户自定义的全局变量',
    theme: {
      bgColor: '#FFF7E6',
      borderColor: '#FA8C16',
      textColor: '#FA8C16', 
      icon: 'tag'
    },
    fields: {
      value: {
        english: 'value',
        chinese: '值',
        isRequired: true,
        description: '变量值'
      }
    }
  },
  
  file: {
    systemKey: 'file',
    enumKey: 'FILE',
    displayName: '文件',
    description: '文件类型变量',
    theme: {
      bgColor: '#E6FFFB',
      borderColor: '#13C2C2',
      textColor: '#13C2C2',
      icon: 'file'
    },
    fields: {
      path: {
        english: 'path',
        chinese: '路径',
        isRequired: true,
        description: '文件路径'
      },
      content: {
        english: 'content',
        chinese: '内容',
        description: '文件内容'
      }
    }
  },
  
  system: {
    systemKey: 'system',
    enumKey: 'SYSTEM',
    displayName: '系统变量',
    description: '系统内置变量',
    theme: {
      bgColor: '#F5F5F5',
      borderColor: '#595959',
      textColor: '#595959',
      icon: 'setting'
    },
    fields: {
      value: {
        english: 'value',
        chinese: '值',
        isRequired: true,
        description: '系统变量值'
      }
    }
  }
};

// 建立字段映射索引（用于快速查找中英文字段对应）
export const FieldMappings: Record<string, Record<string, string>> = {};

// 初始化字段映射表
Object.entries(VariableSchemas).forEach(([typeKey, schema]) => {
  FieldMappings[typeKey] = {};
  
  // 遍历字段定义
  Object.entries(schema.fields).forEach(([fieldKey, fieldDef]) => {
    // 添加中文 -> 英文的映射
    FieldMappings[typeKey][fieldDef.chinese] = fieldDef.english;
  });
});

// 用于生成VariableType枚举的辅助函数
export function generateVariableTypeEnum() {
  const enumEntries = Object.entries(VariableSchemas).map(
    ([key, schema]) => `${schema.enumKey} = '${schema.systemKey}'`
  );
  return `enum VariableType {\n  ${enumEntries.join(',\n  ')}\n}`;
}

// 导出字段集
export const allFields = Object.values(VariableSchemas).flatMap(schema =>
  Object.values(schema.fields)
).reduce((acc, field) => {
  acc.set(field.english, field);
  return acc;
}, new Map<string, FieldDefinition>());

// 默认导出
export default VariableSchemas;
