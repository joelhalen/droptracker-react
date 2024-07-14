'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Clan extends Model {
    static associate(models) {
      // define association here
    }
  }
  Clan.init({
    displayName: DataTypes.STRING,
    discordServerId: DataTypes.STRING,
    description: DataTypes.TEXT,
    clanType: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Clan',
    tableName: 'clans',  // Ensure this matches your database table name
    timestamps: false
  });
  return Clan;
};
