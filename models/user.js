'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // define association here
    }
  }
  User.init({
    displayName: DataTypes.STRING,
    email: DataTypes.STRING,
    discordId: DataTypes.STRING,
    wiseOldManIds: DataTypes.JSON,
    rsns: DataTypes.JSON,
    clanId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',  // Ensure this matches your database table name
    timestamps: false
  });
  return User;
};
