'use strict';
const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class Drop extends Model {
    static associate(models) {
      Drop.belongsTo(models.User, { foreignKey: 'rsn', targetKey: 'rsns' });
    }
  }
  Drop.init({
    itemName: {
      type: DataTypes.STRING,
      field: 'item_name'
    },
    itemId: {
      type: DataTypes.INTEGER,
      field: 'item_id'
    },
    rsn: DataTypes.STRING,
    quantity: DataTypes.INTEGER,
    value: DataTypes.INTEGER,
    time: DataTypes.DATE,
    notified: DataTypes.BOOLEAN,
    imageUrl: {
      type: DataTypes.STRING,
      field: 'image_url'
    },
    npcName: {
      type: DataTypes.STRING,
      field: 'npc_name'
    },
    ymPartition: {
      type: DataTypes.INTEGER,
      field: 'ym_partition'
    }
  }, {
    sequelize,
    modelName: 'Drop',
    tableName: 'drops',
    timestamps: false
  });
  return Drop;
};
