'use strict';
const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class ClanSettings extends Model {
    static associate(models) {
      ClanSettings.belongsTo(models.Clan, { foreignKey: 'clanId' });
    }
  }
  ClanSettings.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clans',
        key: 'cid'
      },
      onDelete: 'CASCADE'
    },
    settings: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        loot_leaderboard_message_id: "",
        loot_leaderboard_channel_id: "",
        channel_id_to_post_loot: "",
        only_send_drops_with_images: false,
        minimum_value_to_send_drop: 2500000,
        voice_channel_to_display_monthly_loot: "",
        voice_channel_to_display_wom_group_member_count: "",
        send_notifications_for_new_collection_logs: true,
        send_notifications_for_new_personal_bests: true,
        google_spreadsheet_id: ""
      }
    }
  }, {
    sequelize,
    modelName: 'ClanSettings',
    tableName: 'clanSettings',
    timestamps: false
  });
  return ClanSettings;
};
