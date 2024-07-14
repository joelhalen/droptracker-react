'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      // define association here
    }
  }
  Notification.init({
    userId: DataTypes.INTEGER,
    message: DataTypes.TEXT,
    type: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    isGlobal: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',  // Ensure this matches your database table name
    timestamps: false
  });
  return Notification;
};
