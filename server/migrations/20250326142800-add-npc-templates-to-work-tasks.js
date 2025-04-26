'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('work_tasks', 'npc_templates', {
      type: Sequelize.JSONB, // PostgreSQL
      // 对于MySQL使用 Sequelize.JSON
      defaultValue: {},
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('work_tasks', 'npc_templates');
  }
};
