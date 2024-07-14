module.exports = (sequelize, DataTypes) => {
  const Log = sequelize.define('Log', {
    logId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    eventType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: DataTypes.TEXT,
    eventId: DataTypes.INTEGER,
    userId: DataTypes.INTEGER,
    additionalData: {
      type: DataTypes.JSON,
      validate: {
        isJSON: true
      }
    }
  });

  Log.associate = models => {
    Log.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return Log;
};
