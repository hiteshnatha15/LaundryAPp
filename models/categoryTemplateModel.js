const mongoose = require("mongoose");

// Category Template Schema
const CategoryTemplateSchema = new mongoose.Schema({
  categories: [
    {
      name: { type: String, required: true }, // Category name, e.g., 'personal', 'petitems', 'seasonalitems'
      subcategories: [
        {
          name: { type: String, required: true }, // Subcategory name, e.g., 'clothing', 'bedding'
          items: [
            {
              itemName: { type: String, required: true }, // Item name, e.g., 'shirt', 'trouser'
              methods: [
                {
                  methodName: { type: String, required: true }, // Method name, e.g., 'regular wash', 'dry clean'
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

module.exports = mongoose.model("CategoryTemplate", CategoryTemplateSchema);
