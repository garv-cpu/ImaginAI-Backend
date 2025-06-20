import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
import transactionModel from "../models/transactionModel.js";
import { Cashfree, CFEnvironment } from "cashfree-pg";


// Initialize PGInstance properly
const PGInstance = new Cashfree(
  CFEnvironment.PRODUCTION, // Use CFEnvironment.PRODUCTION for production
  process.env.CASHFREE_CLIENT_ID,
  process.env.CASHFREE_CLIENT_SECRET
);
// Register a new user
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;  // include phone here

    // Check if all required fields are provided
    if (!name || !email || !password || !phone) {
      return res
        .status(400)
        .json({ success: false, message: "Missing Details" });
    }

    // Optional: Validate phone format here if you want (e.g. regex)

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email,
      password: hashedPassword,
      phone,   // Save phone number in DB
    };

    const newUser = new userModel(userData);
    const user = await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    // Include phone if you want it in user response object
    res.json({
      success: true,
      token,
      user: { name: user.name, phone: user.phone, email: user.email },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

      res.json({ success: true, token, user: { name: user.name } });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const userCredits = async (req, res) => {
  try {
    const { userId } = req;

    const user = await userModel.findById(userId);

    res.json({
      success: true,
      credits: user.creditBalance,
      user: { name: user.name },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const initiateCashfreePayment = async (req, res) => {
  try {
    const { userId } = req;
    const { planId } = req.body;

    if (!userId || !planId) {
      return res.json({ success: false, message: "Missing Details" });
    }

    // Fetch user from DB to get phone number
    const user = await userModel.findById(userId);
    if (!user || !user.phone) {
      return res.status(400).json({ success: false, message: "User phone number not found" });
    }

    let credits, plan, amount;
    switch (planId) {
      case "Starter":
        plan = "Starter";
        credits = 5;
        amount = 99;
        break;
      case "Creator":
        plan = "Creator";
        credits = 20;
        amount = 299;
        break;
      case "Bussiness":
        plan = "Bussiness";
        credits = 50;
        amount = 899;
        break;
      default:
        return res.json({ success: false, message: "Invalid Plan" });
    }

    const transaction = await transactionModel.create({
      userId,
      plan,
      credits,
      amount,
      date: Date.now(),
    });

    const orderPayload = {
      order_id: transaction._id.toString(),
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_phone: user.phone,
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL}/payment-success?order_id={order_id}`,
        notify_url: `${process.env.BACKEND_URL}/api/payment/verify`,
      },
    };

    const response = await PGInstance.PGCreateOrder(orderPayload);

    if (response.status === 200) {
      const paymentSessionId = response.data.payment_session_id;
      return res.json({
        success: true,
        paymentSessionId,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to create order",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};




export const verifyCashfreePayment = async (req, res) => {
  try {
    const { order_id } = req.body;

    const response = await PGInstance.PGGetOrderDetails({ order_id });

    if (response.data.order_status === "PAID") {
      const transaction = await transactionModel.findById(order_id);
      const user = await userModel.findById(transaction.userId);

      if (!transaction.payment) {
        user.creditBalance += transaction.credits;
        transaction.payment = true;

        await user.save();
        await transaction.save();
      }

      return res.json({ success: true, message: "Credits Added" });
    } else {
      return res.json({ success: false, message: "Payment Failed" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

