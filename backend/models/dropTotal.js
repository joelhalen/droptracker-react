module.exports = (sequelize, DataTypes) => {
  const DropTotal = sequelize.define('DropTotal', {
    itemId: DataTypes.INTEGER,
    totalQuantityAllTime: DataTypes.DECIMAL(32, 0)
  });

  return DropTotal;
};
