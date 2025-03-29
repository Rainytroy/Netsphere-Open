const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WorkTask extends Model {
    static associate(models) {
      // 定义与其他模型的关联
      WorkTask.belongsTo(models.Npc, {
        foreignKey: 'npcId',
        as: 'npc'
      });
      
      WorkTask.belongsTo(models.AiService, {
        foreignKey: 'aiServiceId',
        as: 'aiService'
      });
    }
  }
  
  WorkTask.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    npcId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    npcName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    aiServiceId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    aiServiceName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    input: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    output: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING, // 'draft', 'active', 'archived'
      defaultValue: 'draft'
    },
    lastRunAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    executionStatus: {
      type: DataTypes.STRING, // 'idle', 'running', 'completed', 'failed'
      defaultValue: 'idle'
    },
    npcPromptTemplate: {
      type: DataTypes.JSONB,
      defaultValue: {
        template: '',
        isCustomized: false
      }
    },
    // 新增: 保存多个NPC的提示词模板
    npc_templates: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'WorkTask',
    tableName: 'work_tasks',
    timestamps: true,
    underscored: true
  });
  
  return WorkTask;
};
