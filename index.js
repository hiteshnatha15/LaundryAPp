const express = require("express");
const app = express();
const connectDB = require("./configs/db");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const partnerRoutes = require("./routes/partnerRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
require("dotenv").config();

connectDB();
app.use(express.json());
app.use(cors());
app.use(userRoutes);
app.use(partnerRoutes);
app.use(deliveryRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
