module.exports = (sequelize, DataTypes) => {
  const Drop = sequelize.define('Drop', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true
    },
    itemName: DataTypes.STRING,
    itemId: DataTypes.INTEGER,
    rsn: DataTypes.STRING,
    quantity: DataTypes.INTEGER,
    value: DataTypes.INTEGER,
    time: DataTypes.DATE,
    notified: DataTypes.BOOLEAN,
    imageUrl: DataTypes.STRING,
    npcName: DataTypes.STRING,
    ymPartition: DataTypes.INTEGER
  });

  return Drop;
};
