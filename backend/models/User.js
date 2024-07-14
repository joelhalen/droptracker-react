module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    uid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: DataTypes.STRING,
    discordId: {
      type: DataTypes.STRING,
      unique: true
    },
    wiseOldManIds: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    rsns: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    clanId: DataTypes.INTEGER
  });

  User.associate = models => {
    User.belongsTo(models.Clan, { foreignKey: 'clanId' });
    User.hasMany(models.Notification, { foreignKey: 'userId' });
    User.hasMany(models.Log, { foreignKey: 'userId' });
  };

  return User;
};
