const updateDropTotal = async (rsn, itemId, quantity, value) => {
  try {
    const user = await User.findOne({ where: { rsns: { [Op.contains]: [rsn] } } });

    if (user) {
      const [dropTotal, created] = await DropTotal.findOrCreate({
        where: { userId: user.uid, itemId: itemId },
        defaults: { total_quantity_all_time: quantity * value }
      });

      if (!created) {
        dropTotal.total_quantity_all_time += quantity * value;
        await dropTotal.save();
      }
    }
  } catch (error) {
    console.error('Error updating DropTotal:', error);
  }
};