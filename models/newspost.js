'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class NewsPost extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  NewsPost.init({
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    postType: DataTypes.STRING,
    pinned: DataTypes.BOOLEAN,
    imageUrl: DataTypes.STRING,
    videoUrl: DataTypes.STRING,
    timestamp: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'NewsPost',
  });
  return NewsPost;
};