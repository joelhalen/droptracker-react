'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DropTotal extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  DropTotal.init({
    itemId: DataTypes.INTEGER,
    totalQuantityAllTime: DataTypes.DECIMAL
  }, {
    sequelize,
    modelName: 'DropTotal',
  });
  return DropTotal;
};