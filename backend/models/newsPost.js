module.exports = (sequelize, DataTypes) => {
  const NewsPost = sequelize.define('NewsPost', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    postType: DataTypes.STRING,
    pinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    imageUrl: DataTypes.STRING,
    videoUrl: DataTypes.STRING,
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  });

  return NewsPost;
};
