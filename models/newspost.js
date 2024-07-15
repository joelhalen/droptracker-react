'use strict';
const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class NewsPost extends Model {
    static associate(models) {
      // define association here
    }
  }
  NewsPost.init({
    title: DataTypes.STRING,
    content: DataTypes.TEXT,
    postType: {
      type: DataTypes.STRING,
      field: 'post_type'
    },
    pinned: DataTypes.BOOLEAN,
    imageUrl: {
      type: DataTypes.STRING,
      field: 'image_url'
    },
    videoUrl: {
      type: DataTypes.STRING,
      field: 'video_url'
    },
    timestamp: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'NewsPost',
    tableName: 'news_posts', // explicitly set the table name
    timestamps: false // if you don't have createdAt and updatedAt fields
  });
  return NewsPost;
};
