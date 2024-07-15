'use strict';
const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Clan, { foreignKey: 'clanId', as: 'clan' });
    }
  }
  User.init({
    uid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    displayName: DataTypes.STRING,
    email: DataTypes.STRING,
    discordId: DataTypes.STRING,
    wiseOldManIds: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    rsns: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    clanId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: false
  });
  return User;
};
