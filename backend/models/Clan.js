module.exports = (sequelize, DataTypes) => {
  const Clan = sequelize.define('Clan', {
    cid: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    discordServerId: DataTypes.STRING,
    description: DataTypes.TEXT,
    clanType: DataTypes.STRING
  });

  Clan.associate = models => {
    Clan.hasMany(models.User, { foreignKey: 'clanId' });
  };

  return Clan;
};
